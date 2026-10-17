/**
 * Red proof: a missing/invalid shipping price list refuses checkout before any
 * order row exists (HA-2.02). Run with: npm run test:shipping-env
 *
 * The webServer in playwright.shipping-env.config.ts runs with SHIPPING_PRICE_DHL
 * empty and FREE_SHIPPING_THRESHOLD='abc'. The threshold applies to every parcel
 * method, so all of them are refused — not only DHL. Pickup has no price and is
 * unaffected.
 *
 * Do NOT loosen the assertions; fix src/lib/shop/shippingPrices.ts / the route instead.
 */
import { test, expect } from '@playwright/test'
import { dismissCookies, hideBanner } from '../fixtures'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const serviceHeaders = { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }

const OWN_199 = 301004
const PICKUP_ONLY_899 = 302001
const SHIPPING = {
  firstName: 'Test', lastName: 'Cennik', email: 'cennik@example.com', phone: '600700800',
  street: 'Testowa 1', city: 'Kraków', zip: '30-001',
}

let _ip = 1
const ip = () => ({ 'x-forwarded-for': `10.23.0.${(_ip++ % 250) + 1}` })

async function orderCount(key: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?session_id=eq.${key}&select=id`, { headers: serviceHeaders })
  expect(res.status).toBe(200)
  return (await res.json()).length
}

test.describe('broken price list → no parcel order', () => {
  for (const method of ['dhl', 'dpd', 'inpost_courier', 'inpost_locker']) {
    test(`RED PROOF: ${method} → 503, no order row`, async ({ request }) => {
      const key = crypto.randomUUID()
      const res = await request.post('/api/shop/checkout', {
        data: {
          items: [{ product_id: OWN_199, quantity: 1 }],
          terms_accepted: true,
          shipping: SHIPPING,
          idempotency_key: key,
          fulfillment_route: 'own',
          shipping_method: method,
          ...(method === 'inpost_locker' ? { delivery_point: { id: 'KRA01M' } } : {}),
        },
        headers: ip(),
      })
      const json = await res.json()
      console.log(`[${method}]`, res.status(), JSON.stringify(json))
      expect(res.status()).toBe(503)
      expect(json.error).toContain('Dostawa jest chwilowo niedostępna')
      expect(await orderCount(key)).toBe(0)
    })
  }

  test('pickup needs no price list → still accepted', async ({ request }) => {
    const key = crypto.randomUUID()
    const res = await request.post('/api/shop/checkout', {
      data: {
        items: [{ product_id: PICKUP_ONLY_899, quantity: 1 }],
        terms_accepted: true,
        shipping: SHIPPING,
        idempotency_key: key,
        fulfillment_route: 'pickup',
        pickup_confirmed: true,
        shipping_method: 'pickup',
      },
      headers: ip(),
    })
    expect(res.status()).toBe(200)
    expect(await orderCount(key)).toBe(1)
  })

  test('checkout page shows delivery as unavailable', async ({ page, request }) => {
    const res = await request.get('/api/shop/products?page=1')
    const { products } = await res.json()
    const product = products.find((p: { id: number }) => p.id === OWN_199)
    await dismissCookies(page)
    await page.addInitScript(cart => { localStorage.setItem('hydra-cart', JSON.stringify(cart)) }, [{ product, quantity: 1 }])
    await page.goto('/sklep/zamowienie')
    await page.getByTestId('place-order').waitFor()
    await hideBanner(page)
    await expect(page.getByTestId('shipping-unavailable')).toBeVisible()
    await expect(page.getByTestId('shipping-method-dhl')).toHaveCount(0)
  })
})
