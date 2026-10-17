/**
 * HA-2.08 red proof — SHOP_MODE=verification + P24_MODE=production must refuse checkout.
 * Config: playwright.verification-p24-prod.config.ts · run: npm run test:verification:p24-prod
 *
 * "Refuse" means: 503, no order row, no payment row, stock untouched. All P24 credentials are
 * empty in this server, so nothing with a real key can leave it even if the guard were removed.
 */
import { test, expect } from '@playwright/test'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const serviceHeaders = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }

async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: serviceHeaders })
  return (await res.json()) as T
}

test.describe('verification + P24 production', () => {
  test('RED PROOF: checkout → 503, no order, no payment row, stock unchanged', async ({ request }) => {
    const list = await request.get('/api/shop/products?in_stock=true')
    const product = ((await list.json()).products as Array<{ id: number; stock: number; product_type: string }>)
      .find(p => p.product_type === 'standard')
    if (!product) throw new Error('No in-stock standard product in seed')

    const ordersBefore = (await rest<unknown[]>('orders?select=id')).length
    const paymentsBefore = (await rest<unknown[]>('order_payments?select=id')).length
    const key = crypto.randomUUID()

    const res = await request.post('/api/shop/checkout', {
      data: {
        items: [{ product_id: product.id, quantity: 1 }],
        terms_accepted: true,
        shipping: {
          firstName: 'Test', lastName: 'Weryfikacja', email: 'weryfikacja@example.com', phone: '123456789',
          street: 'Testowa 1', city: 'Kraków', zip: '30-001',
        },
        idempotency_key: key,
        fulfillment_route: 'own',
        shipping_method: 'dhl',
      },
      headers: { 'x-forwarded-for': '10.4.0.1' },
    })

    expect(res.status()).toBe(503)
    expect((await res.json()).error).toMatch(/niedostępny/i)
    expect(await rest<unknown[]>(`orders?session_id=eq.${key}&select=id`)).toHaveLength(0)
    expect((await rest<unknown[]>('orders?select=id')).length).toBe(ordersBefore)
    expect((await rest<unknown[]>('order_payments?select=id')).length).toBe(paymentsBefore)
    const after = await rest<Array<{ stock: number }>>(`shop_products?id=eq.${product.id}&select=stock`)
    expect(after[0].stock).toBe(product.stock)
  })
})
