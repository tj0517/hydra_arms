/**
 * Studio product picker endpoint — GET /api/shop/products-list (HA-2.36)
 *
 * ?q= (min 2 chars, name or sku, max 50) and ?ids= (positive integers, max 100, order kept);
 * anything else is 400. q is spliced into a PostgREST or() filter, so the filter-injection
 * case must neither 500 nor return extra rows.
 *
 * Seed rows used here (supabase/seed.sql):
 *   314001 "Luneta celownicza Łowca …"  sku TS-LUN-001
 *   313003 "Ładownica uniwersalna MOLLE Olive (ze zdjęciem)"
 *   200001.. "Żżż seed-bulk NNNN"  (1 100 rows → q=seed-bulk hits the 50 cap)
 *
 * Run: HYDRA_TEST_PORT=3101 npx playwright test tests/shop/products-list.spec.ts
 */
import { test, expect } from '@playwright/test'

const URL = '/api/shop/products-list'
const LUNETA = 314001
const POUCH = 313003
const BULK_1 = 200001

type Item = { id: number; name: string; category: string; price: number | null; inStock: boolean }

test.describe('GET /api/shop/products-list', () => {
  test('?q= finds a product by a name fragment, case-insensitive, with the agreed shape', async ({ request }) => {
    const res = await request.get(`${URL}?q=CELOWNICZA`)
    expect(res.status()).toBe(200)
    expect(res.headers()['cache-control']).toContain('s-maxage=60')
    const body: Item[] = await res.json()
    const hit = body.find((p) => p.id === LUNETA)
    expect(hit, 'Luneta celownicza found by fragment').toBeTruthy()
    expect(Object.keys(hit!).sort()).toEqual(['category', 'id', 'inStock', 'name', 'price'])
    expect(hit!.category).not.toBe('')
    for (const p of body) expect(p.name.toLowerCase()).toContain('celownicza')
  })

  test('?q= also matches the sku', async ({ request }) => {
    const body: Item[] = await (await request.get(`${URL}?q=ts-lun-001`)).json()
    expect(body.map((p) => p.id)).toEqual([LUNETA])
  })

  test('?q= returns at most 50 items', async ({ request }) => {
    const res = await request.get(`${URL}?q=seed-bulk`)
    expect(res.status()).toBe(200)
    const body: Item[] = await res.json()
    expect(body.length).toBe(50)
  })

  test('?ids= returns those products in the given order, unknown ids dropped', async ({ request }) => {
    const res = await request.get(`${URL}?ids=${BULK_1},${LUNETA},999999999,${POUCH}`)
    expect(res.status()).toBe(200)
    const body: Item[] = await res.json()
    expect(body.map((p) => p.id)).toEqual([BULK_1, LUNETA, POUCH])
  })

  test('?ids= accepts 100 ids and refuses 101', async ({ request }) => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => 200001 + i).join(',')
    const ok = await request.get(`${URL}?ids=${ids(100)}`)
    expect(ok.status()).toBe(200)
    expect((await ok.json()).length).toBe(100)
    expect((await request.get(`${URL}?ids=${ids(101)}`)).status()).toBe(400)
  })

  for (const qs of ['', '?q=', '?q=a', '?q=%25%25', '?q=(*', '?ids=', '?ids=abc', '?ids=0', '?ids=-1', '?ids=1,,2', '?ids=1.5', '?ids=1,abc']) {
    test(`400 for "${qs || '(no params)'}"`, async ({ request }) => {
      expect((await request.get(`${URL}${qs}`)).status()).toBe(400)
    })
  }

  test('filter injection in q: never 500, never extra rows', async ({ request }) => {
    // Unescaped, this would add `id.gt.0` as a third or() branch and return 50 arbitrary rows.
    const injected = encodeURIComponent('zzqqnomatch%,id.gt.0,name.ilike.%zzqq')
    const res = await request.get(`${URL}?q=${injected}`)
    expect([200, 400]).toContain(res.status())
    if (res.status() === 200) expect(await res.json()).toEqual([])

    for (const raw of ['a,b)', 'or(id.gt.0)', 'x\\', 'seed-bulk)', '"seed']) {
      const r = await request.get(`${URL}?q=${encodeURIComponent(raw)}`)
      expect([200, 400], `q=${raw}`).toContain(r.status())
      if (r.status() === 200) {
        const body: Item[] = await r.json()
        expect(body.length, `q=${raw}`).toBeLessThanOrEqual(50)
      }
    }
  })
})
