/**
 * Sitemap lists every active product (HA-2.36) — no 500 cap.
 *
 * Reference set read with the anon client in pages of 1 000 (PostgREST caps a response
 * at 1 000 rows); the seed has > 1 000 active products (1 100 seed-bulk rows).
 *
 * Run: HYDRA_TEST_PORT=3101 npx playwright test tests/shop/sitemap.spec.ts
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function activeProductIds(): Promise<number[]> {
  const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  const ids: number[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('shop_products')
      .select('id')
      .eq('is_active', true)
      .order('id')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    ids.push(...data.map((r) => r.id as number))
    if (data.length < 1000) return ids
  }
}

test('sitemap.xml has one /sklep/<id> URL per active product', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)
  const xml = await res.text()
  const inSitemap = [...xml.matchAll(/<loc>[^<]*\/sklep\/(\d+)<\/loc>/g)].map((m) => Number(m[1]))

  const active = await activeProductIds()
  expect(active.length).toBeGreaterThan(1000)
  expect(inSitemap.length).toBe(active.length)
  expect(new Set(inSitemap)).toEqual(new Set(active))
})
