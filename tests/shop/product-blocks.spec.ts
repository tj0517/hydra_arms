/**
 * Sanity product picker blocks on /sklep — resolveBlockProducts() (HA-2.36)
 *
 * Calls the pure module directly with a local anon client (the page wrapper only adds
 * unstable_cache); no UI, no Sanity content needed.
 *
 * The seed has one active product with an image (313003) and nothing featured or on sale,
 * so beforeAll gives four seed-bulk rows (names "Żżż seed-bulk 000N", sorted last by name
 * and lowest by id) an image, an old price or the featured flag. stock and is_active are
 * never touched, so listing / sitemap counters stay the same. afterAll restores the
 * original values even when a test fails; the originals are read before any write.
 *
 *   200001, 200002  image + price_compare = price + 10   → on sale
 *   200003          image + price_compare = price - 1    → not on sale (stale old price)
 *   200004          image + is_featured                  → best seller
 *   313001          price_compare > price, no image      → not in any image-filtered mode
 *   314001          no image                             → manual still shows it
 *
 * Run: HYDRA_TEST_PORT=3101 npx playwright test tests/shop/product-blocks.spec.ts
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/supabase/types'
import { resolveBlockProducts } from '../../src/lib/shop/productBlocks'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const anon = createClient<Database>(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', {
  auth: { persistSession: false },
})
const admin = createClient<Database>(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SALE_A = 200001
const SALE_B = 200002
const STALE = 200003
const FEATURED = 200004
const COMPARE_NO_IMAGE = 313001
const POUCH = 313003
const LUNETA = 314001
const TOUCHED = [SALE_A, SALE_B, STALE, FEATURED]
const IMAGE = { '1': '/img/seed/packshot-test.png' }

type Orig = { id: number; images: unknown; price: number | null; price_compare: number | null; is_featured: boolean }
let originals: Orig[] = []

async function setRow(id: number, patch: Partial<Database['public']['Tables']['shop_products']['Update']>) {
  const { error } = await admin.from('shop_products').update(patch).eq('id', id)
  if (error) throw new Error(`update ${id}: ${error.message}`)
}

/** Reference: active products with a non-empty image object, filtered in JS, highest id first. */
async function imagedReference(filter: (p: { stock: number }) => boolean = () => true) {
  const { data, error } = await admin
    .from('shop_products')
    .select('id, images, stock')
    .eq('is_active', true)
    .not('images', 'is', null)
  if (error) throw new Error(error.message)
  return data
    .filter((p) => p.images && Object.keys(p.images as object).length > 0)
    .filter(filter)
    .map((p) => p.id)
    .sort((a, b) => b - a)
}

const ids = (rows: { id: number }[]) => rows.map((p) => p.id)

test.describe.configure({ mode: 'serial' })

test.describe('resolveBlockProducts', () => {
  test.beforeAll(async () => {
    const { data, error } = await admin
      .from('shop_products')
      .select('id, images, price, price_compare, is_featured')
      .in('id', TOUCHED)
    if (error || !data || data.length !== TOUCHED.length) throw new Error(`read originals: ${error?.message ?? data?.length}`)
    originals = data as Orig[]
    const price = (id: number) => Number(originals.find((o) => o.id === id)!.price)

    await setRow(SALE_A, { images: IMAGE, price_compare: price(SALE_A) + 10 })
    await setRow(SALE_B, { images: IMAGE, price_compare: price(SALE_B) + 10 })
    await setRow(STALE, { images: IMAGE, price_compare: price(STALE) - 1 })
    await setRow(FEATURED, { images: IMAGE, is_featured: true })
  })

  test.afterAll(async () => {
    for (const o of originals) {
      await setRow(o.id, {
        images: o.images as Database['public']['Tables']['shop_products']['Update']['images'],
        price_compare: o.price_compare,
        is_featured: o.is_featured,
      })
    }
  })

  test('new_arrivals: highest ids with an image, limit from the block', async () => {
    const got = await resolveBlockProducts(anon, { selectionMode: 'new_arrivals', limit: 3 })
    expect(ids(got)).toEqual((await imagedReference()).slice(0, 3))
    expect(ids(got)).toEqual([POUCH, FEATURED, STALE])
  })

  test('on_sale: only price_compare > price, with an image', async () => {
    const got = await resolveBlockProducts(anon, { selectionMode: 'on_sale', limit: 4 })
    expect(ids(got)).toEqual([SALE_B, SALE_A])
    for (const p of got) expect(Number(p.price_compare)).toBeGreaterThan(Number(p.price))
    expect(ids(got)).not.toContain(STALE)
    expect(ids(got)).not.toContain(COMPARE_NO_IMAGE)
  })

  test('on_sale: limit from the block', async () => {
    const got = await resolveBlockProducts(anon, { selectionMode: 'on_sale', limit: 1 })
    expect(ids(got)).toEqual([SALE_B])
  })

  test('on_sale: nothing on sale → falls back to new arrivals', async () => {
    try {
      await setRow(SALE_A, { price_compare: null })
      await setRow(SALE_B, { price_compare: null })
      const got = await resolveBlockProducts(anon, { selectionMode: 'on_sale', limit: 2 })
      expect(ids(got)).toEqual((await imagedReference()).slice(0, 2))
    } finally {
      const price = (id: number) => Number(originals.find((o) => o.id === id)!.price)
      await setRow(SALE_A, { price_compare: price(SALE_A) + 10 })
      await setRow(SALE_B, { price_compare: price(SALE_B) + 10 })
    }
  })

  test('best_sellers: featured and in stock, with an image', async () => {
    const got = await resolveBlockProducts(anon, { selectionMode: 'best_sellers', limit: 4 })
    expect(ids(got)).toEqual([FEATURED])
    for (const p of got) {
      expect(p.is_featured).toBe(true)
      expect(p.stock).toBeGreaterThan(0)
    }
    // no selectionMode → best_sellers
    expect(ids(await resolveBlockProducts(anon, { limit: 4 }))).toEqual([FEATURED])
  })

  test('best_sellers: nothing featured → in-stock products with an image, limit from the block', async () => {
    try {
      await setRow(FEATURED, { is_featured: false })
      const got = await resolveBlockProducts(anon, { selectionMode: 'best_sellers', limit: 3 })
      expect(ids(got)).toEqual((await imagedReference((p) => p.stock > 0)).slice(0, 3))
    } finally {
      await setRow(FEATURED, { is_featured: true })
    }
  })

  test('manual: keeps the Studio order, ignores limit, no image filter, unknown ids dropped', async () => {
    const productIds = [String(SALE_A), String(POUCH), '999999999', String(LUNETA), String(STALE)]
    const got = await resolveBlockProducts(anon, { selectionMode: 'manual', productIds, limit: 2 })
    expect(ids(got)).toEqual([SALE_A, POUCH, LUNETA, STALE])
    expect(await resolveBlockProducts(anon, { selectionMode: 'manual', productIds: [] })).toEqual([])
  })

  test('returns only public columns', async () => {
    const [p] = await resolveBlockProducts(anon, { selectionMode: 'manual', productIds: [String(LUNETA)] })
    expect(p).toBeTruthy()
    for (const hidden of ['price_purchase', 'notes_internal', 'inventory_id']) expect(p).not.toHaveProperty(hidden)
  })
})
