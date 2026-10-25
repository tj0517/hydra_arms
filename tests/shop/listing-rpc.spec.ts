/**
 * Listing in Postgres — shop_listing() and shop_tree() (HA-2.34, migration 019)
 *
 * Calls the RPCs directly with a service-role client against the local stack; no UI.
 * Seed rows used here (supabase/seed.sql, HA-2.34 block):
 *   4003 "Lunety i lornetki": 304002, 314001..314003 with features
 *   314001 "Luneta celownicza Łowca …"   diacritics, sku TS-LUN-001
 *   314002/314003 "Dalmierz laserowy 800 m"  identical names
 *   314004 "Ćwiek …" stock 1, reserved by paid order …2034 (no baselinker_order_id)
 *   314005 "Czarny proch …" price NULL, pickup
 *
 * Two tests write (and restore) shared rows — the reservation's baselinker_order_id
 * and one product_type — so the file runs serially.
 *
 * Run: HYDRA_TEST_PORT=3101 npx playwright test tests/shop/listing-rpc.spec.ts
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database, ShopListingResult } from '../../src/lib/supabase/types'
import { mustPickup } from '../../src/lib/shop/cartAnalysis'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const sb = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const LISTING_SIG = 'public.shop_listing(bigint[],text,boolean,numeric,numeric,text,text,jsonb,text,int)'
const TREE_SIG = 'public.shop_tree()'

const OPTICS = 4003
const LUNETA = 314001
const DALMIERZ_A = 314002
const DALMIERZ_B = 314003
const CWIEK = 314004
const PROCH = 314005
const RESERVING_ORDER = '00000000-0000-4000-8000-000000002034'

type ListingArgs = Database['public']['Functions']['shop_listing']['Args']

const NO_FILTERS: ListingArgs = {
  p_category_ids: null, p_q: null, p_in_stock: false, p_min: null, p_max: null,
  p_brand: null, p_delivery: null, p_specs: {}, p_sort: 'name_asc', p_page: 1,
}

async function listing(args: Partial<ListingArgs> = {}): Promise<ShopListingResult> {
  const { data, error } = await sb.rpc('shop_listing', { ...NO_FILTERS, ...args })
  expect(error).toBeNull()
  return data as ShopListingResult
}

/** Every page of a query, in order. */
async function allItems(args: Partial<ListingArgs> = {}) {
  const first = await listing({ ...args, p_page: 1 })
  const pages = Math.ceil(first.total / first.page_size)
  const items = [...first.items]
  for (let p = 2; p <= pages; p++) items.push(...(await listing({ ...args, p_page: p })).items)
  return { total: first.total, items, pages }
}

const ids = (r: { items: { id: number }[] }) => r.items.map(i => i.id)

async function activeCount() {
  const { count, error } = await sb.from('shop_products').select('id', { count: 'exact', head: true }).eq('is_active', true)
  expect(error).toBeNull()
  return count ?? 0
}

test.describe.configure({ mode: 'serial' })

test.describe('shop_listing / shop_tree (migration 019)', () => {
  test('RED PROOF: only service_role may execute both functions (read from privileges, not by calling)', async () => {
    const result: Record<string, boolean> = {}
    for (const [name, sig] of [['shop_listing', LISTING_SIG], ['shop_tree', TREE_SIG]]) {
      for (const role of ['anon', 'authenticated', 'service_role']) {
        const { data, error } = await sb.rpc('test_fn_privilege' as never, { role_name: role, func_sig: sig } as never)
        expect(error).toBeNull()
        result[`${name}:${role}`] = data as unknown as boolean
      }
    }
    console.log('[has_function_privilege]', JSON.stringify(result))
    expect(result).toEqual({
      'shop_listing:anon': false, 'shop_listing:authenticated': false, 'shop_listing:service_role': true,
      'shop_tree:anon': false, 'shop_tree:authenticated': false, 'shop_tree:service_role': true,
    })
  })

  test('availability subtracts reservations; setting baselinker_order_id releases them', async () => {
    const setBlId = async (v: number | null) => {
      const { error } = await sb.from('orders').update({ baselinker_order_id: v }).eq('id', RESERVING_ORDER)
      expect(error).toBeNull()
    }
    await setBlId(null) // precondition, whatever an earlier run left behind
    try {
      const reserved = await listing({ p_q: 'Ćwiek' })
      const row = reserved.items.find(i => i.id === CWIEK)
      console.log('[reserved] stock =', row?.stock)
      expect(row?.stock).toBe(0)
      const reservedInStock = await listing({ p_q: 'Ćwiek', p_in_stock: true })
      console.log('[reserved, p_in_stock] ids =', JSON.stringify(ids(reservedInStock)))
      expect(ids(reservedInStock)).not.toContain(CWIEK)

      await setBlId(992034)
      const released = await listing({ p_q: 'Ćwiek', p_in_stock: true })
      console.log('[released, p_in_stock] stock =', released.items.find(i => i.id === CWIEK)?.stock)
      expect(released.items.find(i => i.id === CWIEK)?.stock).toBe(1)
    } finally {
      await setBlId(null)
    }
  })

  test('search ignores case and Polish diacritics and matches word fragments and sku', async () => {
    for (const q of ['luneta', 'LUNETA', 'celownicz', 'lowca', 'podswietlana', '  luneta  ']) {
      expect(ids(await listing({ p_q: q })), q).toContain(LUNETA)
    }
    expect(ids(await listing({ p_q: 'ts-lun' }))).toEqual([LUNETA])

    const nonsense = await listing({ p_q: 'xyz-nie-ma' })
    console.log('[xyz-nie-ma] total =', nonsense.total)
    expect(nonsense.total).toBe(0)
    expect(nonsense.items).toEqual([])
    // % and _ are literal, not LIKE wildcards: no seed name contains them
    expect((await listing({ p_q: '%' })).total).toBe(0)
    expect((await listing({ p_q: '_' })).total).toBe(0)
  })

  test('pages are disjoint and cover every active product, for every sort', async () => {
    const active = await activeCount()
    expect(active).toBeGreaterThan(24)
    for (const sort of ['name_asc', 'name_desc', 'price_asc', 'price_desc', 'newest'] as const) {
      const { total, items, pages } = await allItems({ p_sort: sort })
      const seen = items.map(i => i.id)
      expect(pages, sort).toBeGreaterThan(1)
      expect(total, sort).toBe(active)
      expect(seen.length, sort).toBe(active)
      expect(new Set(seen).size, sort).toBe(active)
      for (const it of items) expect(it).not.toHaveProperty('description')
    }
    expect((await listing({ p_page: 99 })).items).toEqual([])
  })

  test('identical names keep a stable order (tiebreaker by id)', async () => {
    const a = ids((await allItems({ p_sort: 'name_asc' })))
    const b = ids((await allItems({ p_sort: 'name_asc' })))
    expect(a).toEqual(b)
    const i = a.indexOf(DALMIERZ_A)
    expect(a[i + 1]).toBe(DALMIERZ_B)
    const desc = ids(await allItems({ p_sort: 'name_desc' }))
    expect(desc.indexOf(DALMIERZ_A) + 1).toBe(desc.indexOf(DALMIERZ_B)) // id ASC in both directions
  })

  test('brand counters ignore the brand filter but respect the others (decision B)', async () => {
    const r = await listing({ p_category_ids: [OPTICS], p_brand: 'Delta Optical' })
    console.log('[brands, Delta Optical selected]', JSON.stringify(r.brands), 'total', r.total)
    expect(r.total).toBe(1)
    expect(r.brands).toEqual(expect.arrayContaining([
      { brand: 'Delta Optical', count: 1 },
      { brand: 'Vortex Optics', count: 3 },
    ]))
    // A spec selection narrows the brand counters (B): Delta Optical has no 6x product.
    const withSpec = await listing({ p_category_ids: [OPTICS], p_specs: { 'Powiększenie': ['6x'] } })
    expect(withSpec.brands).toEqual([{ brand: 'Vortex Optics', count: 2 }])
  })

  test('spec counters: none without a category, only keys with ≥ 2 values, own selection ignored', async () => {
    expect((await listing()).specs).toEqual([])

    const r = await listing({ p_category_ids: [OPTICS] })
    console.log('[specs 4003]', JSON.stringify(r.specs))
    expect(r.specs.map(s => s.key).sort()).toEqual(['Powiększenie', 'Średnica obiektywu'])
    expect(r.specs.map(s => s.key)).not.toContain('Wodoodporność') // single value → not filterable

    const selected = await listing({ p_category_ids: [OPTICS], p_specs: { 'Powiększenie': ['6x'] } })
    expect(selected.total).toBe(2)
    const pow = selected.specs.find(s => s.key === 'Powiększenie')
    expect(new Map(pow?.values.map(v => [v.val, v.count]))).toEqual(new Map([['10x', 1], ['3-9x', 1], ['6x', 2]]))

    // OR within a key, AND across keys
    expect((await listing({ p_category_ids: [OPTICS], p_specs: { 'Powiększenie': ['6x', '10x'] } })).total).toBe(3)
    const and = await listing({ p_category_ids: [OPTICS], p_specs: { 'Powiększenie': ['6x', '10x'], 'Średnica obiektywu': ['42 mm'] } })
    expect(ids(and)).toEqual([304002])

    // Spec counters respect the brand filter (B): Vortex Optics has no 3-9x product.
    const vortex = await listing({ p_category_ids: [OPTICS], p_brand: 'Vortex Optics' })
    expect(vortex.specs.find(s => s.key === 'Powiększenie')?.values.map(v => v.val)).not.toContain('3-9x')
  })

  test('delivery filter splits the catalogue by pickup_only', async () => {
    const all = await listing()
    const ship = await allItems({ p_delivery: 'wysylka' })
    const pick = await allItems({ p_delivery: 'odbior' })
    expect(ship.total + pick.total).toBe(all.total)
    for (const p of ship.items) expect(mustPickup(p), String(p.id)).toBe(false)
    for (const p of pick.items) expect(mustPickup(p), String(p.id)).toBe(true)
    expect(pick.items.map(p => p.id)).toContain(PROCH)
  })

  test('pickup_only equals mustPickup() for every seed product; flips with product_type, no sync', async () => {
    const { data, error } = await sb
      .from('shop_products')
      .select('id, product_type, requires_license, delivery_allowed, age_min, pickup_only, source_warehouse')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    for (const p of data!) expect(p.pickup_only, String(p.id)).toBe(mustPickup(p))

    const read = async () =>
      (await sb.from('shop_products').select('pickup_only').eq('id', LUNETA).single()).data?.pickup_only
    expect(await read()).toBe(false)
    try {
      const { error: upd } = await sb.from('shop_products').update({ product_type: 'pickup_only' }).eq('id', LUNETA)
      expect(upd).toBeNull()
      const flipped = await read()
      console.log('[pickup_only after product_type=pickup_only]', flipped)
      expect(flipped).toBe(true)
      expect(ids(await listing({ p_q: 'luneta', p_delivery: 'wysylka' }))).not.toContain(LUNETA)
    } finally {
      await sb.from('shop_products').update({ product_type: 'standard' }).eq('id', LUNETA)
    }
    expect(await read()).toBe(false)
  })

  test('price sort puts products without a price last; name sort is Polish (C < Ć < D)', async () => {
    for (const sort of ['price_asc', 'price_desc'] as const) {
      const prices = (await allItems({ p_sort: sort })).items.map(i => i.price)
      const firstNull = prices.indexOf(null)
      expect(firstNull, sort).toBeGreaterThan(0)
      expect(prices.slice(firstNull).every(p => p === null), sort).toBe(true)
      const priced = prices.slice(0, firstNull) as number[]
      const sorted = [...priced].sort((a, b) => (sort === 'price_asc' ? a - b : b - a))
      expect(priced, sort).toEqual(sorted)
    }

    const names = (await allItems({ p_sort: 'name_asc' })).items.map(i => i.name)
    const at = (prefix: string) => names.findIndex(n => n.startsWith(prefix))
    console.log('[name_asc around Ć]', JSON.stringify(names.slice(at('Czarny') - 1, at('Dalmierz') + 1)))
    expect(at('Czarny')).toBeLessThan(at('Ćwiek'))
    expect(at('Ćwiek')).toBeLessThan(at('Dalmierz'))
    expect(at('Ćwiek')).toBeLessThan(names.length - 1)

    const newest = ids(await allItems({ p_sort: 'newest' }))
    expect(newest).toEqual([...newest].sort((a, b) => b - a))
    // unknown sort falls back to name_asc
    expect(ids(await allItems({ p_sort: 'bogus' as never }))).toEqual(ids(await allItems({ p_sort: 'name_asc' })))
  })

  test('shop_tree returns every category with its direct count and the active price range', async () => {
    const { data, error } = await sb.rpc('shop_tree')
    expect(error).toBeNull()
    const tree = data!

    const { data: cats } = await sb.from('shop_categories').select('id')
    // Paged: the seed has > 1 000 active products (HA-2.35 bulk) and PostgREST caps a response at max_rows = 1000.
    const prods: { category_id: number | null; price: number | null }[] = []
    for (let from = 0; ; from += 1000) {
      const { data: chunk, error: chunkErr } = await sb
        .from('shop_products').select('category_id, price').eq('is_active', true).order('id').range(from, from + 999)
      expect(chunkErr).toBeNull()
      prods.push(...chunk!)
      if (chunk!.length < 1000) break
    }
    expect(tree.categories.map(c => c.id).sort((a, b) => a - b)).toEqual(cats!.map(c => c.id).sort((a, b) => a - b))
    for (const c of tree.categories) {
      expect(c.count, String(c.id)).toBe(prods!.filter(p => p.category_id === c.id).length)
    }
    const priced = prods!.map(p => p.price).filter((p): p is number => p !== null && Number(p) > 0).map(Number)
    console.log('[shop_tree price]', JSON.stringify(tree.price))
    expect(tree.price).toEqual({ min: Math.min(...priced), max: Math.max(...priced) })
  })
})
