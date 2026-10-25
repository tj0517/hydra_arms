import 'server-only'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { SHOP_CACHE_TAG } from './shopCache'
import { resolveBlockProducts, type ProductBlockInput } from './productBlocks'
import {
  isDeliveryMode,
  isSortKey,
  type DeliveryMode,
  type ListingCategory,
  type ListingPageData,
  type ListingParams,
  type SortKey,
} from '@/components/shop/listingFilters'
import type { ShopListingResult, ShopProduct, ShopTreeResult } from '@/lib/supabase/types'

/**
 * /sklep listing computed in Postgres (HA-2.35): shop_listing() returns one page of
 * 24 cards plus the counters, shop_tree() the categories with direct counts and the
 * price range (migrations 019/020).
 *
 * Every RPC call goes through createAdminClient() (both functions are EXECUTE for
 * service_role only). A missing service-role key or an RPC error throws — the page
 * gets the Next error boundary, never an empty shop, and unstable_cache does not
 * store a throw (deferred 2026-09-30: an empty catalogue used to be cached for 5 min).
 *
 * URL contract: cat, q, stock, min, max, sort, marka, dostawa (HA-2.10) + page,
 * spec (HA-2.35, repeatable "Key:value"). Every value is validated here; an unknown
 * one is dropped, never passed to the RPC.
 */

export type SearchParamsRecord = Record<string, string | string[] | undefined>

const REVALIDATE_SECONDS = 300
const MAX_Q_LENGTH = 200
const MAX_SPEC_PARAMS = 30
const MAX_SPEC_PART_LENGTH = 100
const MAX_PAGE = 100_000

function first(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

function all(v: string | string[] | undefined): string[] {
  if (v === undefined) return []
  return Array.isArray(v) ? v : [v]
}

function priceBound(v: string | null): string {
  if (v === null) return ''
  const t = v.trim()
  if (!/^\d+(\.\d*)?$/.test(t)) return ''
  return Number.isFinite(Number(t)) ? t : ''
}

/** "Kaliber:9mm" → ["Kaliber", "9mm"]; the value may itself contain ':'. */
function parseSpec(raw: string): [string, string] | null {
  const i = raw.indexOf(':')
  if (i <= 0) return null
  const key = raw.slice(0, i).trim()
  const val = raw.slice(i + 1).trim()
  if (!key || !val || key.length > MAX_SPEC_PART_LENGTH || val.length > MAX_SPEC_PART_LENGTH) return null
  return [key, val]
}

function normaliseSpecs(pairs: [string, string][]): Record<string, string[]> {
  const map = new Map<string, Set<string>>()
  for (const [k, v] of pairs) {
    if (!map.has(k)) map.set(k, new Set())
    map.get(k)!.add(v)
  }
  const out: Record<string, string[]> = {}
  for (const k of [...map.keys()].sort()) out[k] = [...map.get(k)!].sort()
  return out
}

/**
 * Format-level validation of the URL. Values that need the database to be judged
 * (cat, marka, spec values, page past the end) are settled in loadListing().
 */
export function parseListingParams(sp: SearchParamsRecord): ListingParams {
  const catRaw = first(sp.cat)
  const cat = catRaw && /^\d{1,15}$/.test(catRaw) ? Number(catRaw) : null
  const sort = first(sp.sort)
  const dostawa = first(sp.dostawa)
  const pageRaw = first(sp.page)
  const page = pageRaw && /^\d{1,6}$/.test(pageRaw) ? Math.min(Math.max(Number(pageRaw), 1), MAX_PAGE) : 1
  const marka = first(sp.marka)

  const specPairs = all(sp.spec)
    .slice(0, MAX_SPEC_PARAMS)
    .map(parseSpec)
    .filter((p): p is [string, string] => p !== null)

  return {
    cat,
    q: (first(sp.q) ?? '').trim().slice(0, MAX_Q_LENGTH),
    stock: first(sp.stock) === '1',
    min: priceBound(first(sp.min)),
    max: priceBound(first(sp.max)),
    sort: isSortKey(sort) ? sort : 'name_asc',
    marka: marka && marka.length <= MAX_SPEC_PART_LENGTH ? marka : null,
    dostawa: isDeliveryMode(dostawa) ? dostawa : null,
    specs: normaliseSpecs(specPairs),
    page,
  }
}

// ── RPC calls (cached per normalised argument set) ──────────────────────────

interface ListingRpcArgs {
  p_category_ids: number[] | null
  p_q: string | null
  p_in_stock: boolean
  p_min: number | null
  p_max: number | null
  p_brand: string | null
  p_delivery: DeliveryMode | null
  p_specs: Record<string, string[]>
  p_sort: SortKey
  p_page: number
}

/** Same filter → same key: category ids sorted, specs already normalised, fixed key order. */
function listingCacheKey(a: ListingRpcArgs): string {
  return JSON.stringify([
    a.p_category_ids ? [...a.p_category_ids].sort((x, y) => x - y) : null,
    a.p_q, a.p_in_stock, a.p_min, a.p_max, a.p_brand, a.p_delivery, a.p_specs, a.p_sort, a.p_page,
  ])
}

async function getListing(args: ListingRpcArgs): Promise<ShopListingResult> {
  const key = listingCacheKey(args)
  return unstable_cache(
    async () => {
      const { data, error } = await createAdminClient().rpc('shop_listing', args)
      if (error) throw new Error(`shop_listing failed: ${error.message}`)
      if (!data) throw new Error('shop_listing returned no data')
      return data
    },
    ['shop-listing', key],
    { revalidate: REVALIDATE_SECONDS, tags: [SHOP_CACHE_TAG] },
  )()
}

export const getShopTree = unstable_cache(
  async (): Promise<ShopTreeResult> => {
    const { data, error } = await createAdminClient().rpc('shop_tree')
    if (error) throw new Error(`shop_tree failed: ${error.message}`)
    if (!data) throw new Error('shop_tree returned no data')
    return data
  },
  ['shop-tree'],
  { revalidate: REVALIDATE_SECONDS, tags: [SHOP_CACHE_TAG] },
)

/**
 * Products for one Sanity product picker block on /sklep (HA-2.36), cached per block
 * settings. The query logic lives in productBlocks.ts (pure, tested directly).
 */
export function getBlockProducts(block: ProductBlockInput): Promise<ShopProduct[]> {
  const key = [block.selectionMode ?? 'best_sellers', String(block.limit ?? ''), (block.productIds ?? []).join(',')]
  return unstable_cache(
    async () => {
      const sb = createPublicClient()
      if (!sb) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
      return resolveBlockProducts(sb, block)
    },
    ['shop-block', ...key],
    { revalidate: REVALIDATE_SECONDS, tags: [SHOP_CACHE_TAG] },
  )()
}

// ── Category tree helpers ───────────────────────────────────────────────────

/** The category plus every descendant, from the parent links of shop_tree(). */
export function categoryWithDescendants(categories: ListingCategory[], id: number): number[] {
  const out: number[] = []
  const queue = [id]
  const seen = new Set<number>()
  while (queue.length) {
    const cur = queue.shift()!
    if (seen.has(cur)) continue
    seen.add(cur)
    out.push(cur)
    for (const c of categories) if (c.parent_id === cur) queue.push(c.id)
  }
  return out
}

/** Products per category, descendants included — the counts next to tree nodes. */
function categoryCounts(tree: ShopTreeResult): Record<number, number> {
  const direct = new Map(tree.categories.map(c => [c.id, c.count]))
  const out: Record<number, number> = {}
  for (const c of tree.categories) {
    out[c.id] = categoryWithDescendants(tree.categories, c.id).reduce((n, id) => n + (direct.get(id) ?? 0), 0)
  }
  return out
}

// ── Page loader ─────────────────────────────────────────────────────────────

function rpcArgs(params: ListingParams, categoryIds: number[] | null): ListingRpcArgs {
  return {
    p_category_ids: categoryIds,
    p_q: params.q || null,
    p_in_stock: params.stock,
    p_min: params.min !== '' ? Number(params.min) : null,
    p_max: params.max !== '' ? Number(params.max) : null,
    p_brand: params.marka,
    p_delivery: params.dostawa,
    p_specs: params.specs,
    p_sort: params.sort,
    p_page: params.page,
  }
}

const NO_FILTERS: ListingParams = {
  cat: null, q: '', stock: false, min: '', max: '', sort: 'name_asc',
  marka: null, dostawa: null, specs: {}, page: 1,
}

/**
 * Everything /sklep needs, from validated URL params. Values judged against the
 * database are dropped when unknown (as before HA-2.35): a ?cat= not in the tree,
 * a ?marka= no active product carries, a ?spec= value the category does not offer
 * (and every spec without a category); a ?page= past the end shows the last page.
 */
export async function loadListing(sp: SearchParamsRecord): Promise<ListingPageData> {
  const parsed = parseListingParams(sp)
  const [tree, unfiltered] = await Promise.all([getShopTree(), getListing(rpcArgs(NO_FILTERS, null))])

  const categories: ListingCategory[] = tree.categories.map(({ id, name, parent_id }) => ({ id, name, parent_id }))
  const cat = parsed.cat !== null && categories.some(c => c.id === parsed.cat) ? parsed.cat : null
  const marka = parsed.marka !== null && unfiltered.brands.some(b => b.brand === parsed.marka) ? parsed.marka : null
  let params: ListingParams = { ...parsed, cat, marka, specs: cat === null ? {} : parsed.specs }
  const categoryIds = cat !== null ? categoryWithDescendants(categories, cat) : null

  // Spec counters ignore the spec filter (decision B), so a call without specs
  // yields the offered spec values; a requested value outside them is dropped.
  if (Object.keys(params.specs).length > 0) {
    const offered = (await getListing(rpcArgs({ ...params, specs: {}, page: 1 }, categoryIds))).specs
    const pairs: [string, string][] = []
    for (const [k, vals] of Object.entries(params.specs)) {
      const known = offered.find(s => s.key === k)
      for (const v of vals) if (known?.values.some(x => x.val === v)) pairs.push([k, v])
    }
    params = { ...params, specs: normaliseSpecs(pairs) }
  }

  let listing = await getListing(rpcArgs(params, categoryIds))
  const lastPage = Math.max(1, Math.ceil(listing.total / listing.page_size))
  if (params.page > lastPage) {
    params = { ...params, page: lastPage }
    listing = await getListing(rpcArgs(params, categoryIds))
  }

  const { min, max } = tree.price
  return {
    params,
    listing,
    categories,
    categoryCounts: categoryCounts(tree),
    totalActive: unfiltered.total,
    priceRange:
      min !== null && max !== null
        ? { min: Math.floor(Number(min)), max: Math.ceil(Number(max)) }
        : { min: 0, max: 9999 },
  }
}
