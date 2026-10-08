/**
 * Red proof for the bl-mock-counter env guard (HA-2.20).
 * Run with: npm run test:bl-mock-off
 *
 * The webServer in playwright.bl-mock-off.config.ts runs with
 * BASELINKER_MOCK=false.  The dev-only counter endpoint must then be invisible
 * (404) — it exists purely to let the mock BaseLinker tests count order pushes,
 * and must never answer on a deployment talking to the real BaseLinker.
 *
 * The positive side (BASELINKER_MOCK=true → 200) is proven in
 * tests/shop/p24/p24.spec.ts under the default config.
 *
 * Do NOT loosen the status assertions; fix the route guard instead.
 */
import { test, expect } from '@playwright/test'

test.describe('bl-mock-counter — guard when BASELINKER_MOCK is not true', () => {
  test('RED PROOF: GET with orderId → 404', async ({ request }) => {
    const res = await request.get(
      '/api/shop/dev/bl-mock-counter?orderId=00000000-0000-0000-0000-000000000001',
    )
    expect(res.status()).toBe(404)
    expect((await res.json()).error).toBe('Not found')
  })

  test('RED PROOF: the env guard fires before the missing-orderId check', async ({ request }) => {
    // Without the guard this would be 400 ('Missing orderId'); with it, 404.
    const res = await request.get('/api/shop/dev/bl-mock-counter')
    expect(res.status()).toBe(404)
    expect((await res.json()).error).toBe('Not found')
  })
})
