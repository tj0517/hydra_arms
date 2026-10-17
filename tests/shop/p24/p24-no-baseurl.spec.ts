/**
 * SHOP_BASE_URL fail-closed tests (HA-2.03 Review Round 2, §4)
 *
 * Red proof: before fix, SHOP_BASE_URL='' → attempt row IS created (with broken URLs)
 * Green proof: after fix, SHOP_BASE_URL='' → registerPayment throws → no attempt row;
 *              checkout still returns 200 (order created, fallback payment_url);
 *              mock-pay returns 500 before even looking up the attempt.
 *
 * Requires: local Supabase stack running, separate Next.js server on port 3003
 *           with SHOP_BASE_URL='' (playwright.p24-no-baseurl.config.ts)
 * Run: npm run test:p24:no-baseurl
 */
import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const serviceHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function getPaymentAttempts(orderId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/order_payments?order_id=eq.${orderId}&select=id,status`,
    { headers: serviceHeaders },
  )
  return res.json() as Promise<Array<{ id: string; status: string }>>
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ request }) => {
  for (let i = 0; i < 15; i++) {
    try {
      const res = await request.get('/api/shop/products?in_stock=true')
      if (res.ok()) {
        const body = await res.json()
        const products = body.products as Array<{ product_type: string }>
        if (products?.some(p => p.product_type === 'standard')) return
      }
    } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Stack not ready after 30 s')
})

test.describe('SHOP_BASE_URL unset — fail-closed', () => {
  test('checkout: order created, no attempt row, fallback payment_url when SHOP_BASE_URL empty', async ({ request }) => {
    const productsRes = await request.get('/api/shop/products?in_stock=true')
    const { products } = await productsRes.json()
    const product = (products as Array<{ id: number; product_type: string }>)
      .find(p => p.product_type === 'standard')
    if (!product) throw new Error('No standard product in seed')

    const res = await request.post('/api/shop/checkout', {
      data: {
        items: [{ product_id: product.id, quantity: 1 }],
        terms_accepted: true,
        shipping: {
          firstName: 'Test', lastName: 'Tester',
          email: 'test@example.com', phone: '123456789',
          street: 'Testowa 1', city: 'Kraków', zip: '30-001',
        },
        idempotency_key: crypto.randomUUID(),
        fulfillment_route: 'own',
        shipping_method: 'dhl',
      },
      headers: { 'x-forwarded-for': '10.3.0.1' },
    })

    // Checkout still returns 200 — order created, payment registration fails non-fatally
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.order_id).toBeTruthy()

    // payment_url falls back to the order confirmation page (no mock URL)
    expect(json.payment_url).toBe(`/sklep/zamowienie/${json.order_id}`)

    // No attempt row created — registerPayment threw before calling p24_register_attempt
    const attempts = await getPaymentAttempts(json.order_id)
    expect(attempts.length).toBe(0)
  })

  test('mock-pay: 500 when SHOP_BASE_URL is empty (check before DB lookup)', async ({ request }) => {
    // RED: old code had baseUrl check after DB lookup → fake IDs return 404 (attempt not found)
    // GREEN: baseUrl check moved to top of handler → returns 500 before any DB access
    const res = await request.post('/api/shop/payments/p24/mock-pay', {
      data: { orderId: crypto.randomUUID(), p24SessionId: crypto.randomUUID() },
    })
    expect(res.status()).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('SHOP_BASE_URL not configured')
  })

  // HA-2.19: resolves the 2026-09-30 deferred entry (`SHOP_BASE_URL ?? ''` → relative link).
  // ORDER_LINK_SECRET is set in this config, so "no link" is down to the empty SHOP_BASE_URL alone.
  test('order e-mail: no status link and no relative href when SHOP_BASE_URL is empty', async ({ request }) => {
    const { products } = await (await request.get('/api/shop/products?in_stock=true')).json()
    const product = (products as Array<{ id: number; product_type: string }>).find(p => p.product_type === 'standard')
    if (!product) throw new Error('No standard product in seed')

    const res = await request.post('/api/shop/checkout', {
      data: {
        items: [{ product_id: product.id, quantity: 1 }],
        terms_accepted: true,
        shipping: {
          firstName: 'Test', lastName: 'Tester', email: 'test@example.com', phone: '123456789',
          street: 'Testowa 1', city: 'Kraków', zip: '30-001',
        },
        idempotency_key: crypto.randomUUID(),
        fulfillment_route: 'own',
        shipping_method: 'dhl',
      },
      headers: { 'x-forwarded-for': '10.3.0.2' },
    })
    expect(res.status()).toBe(200)
    const { order_id: orderId } = await res.json()

    const file = join(process.cwd(), 'test-results', 'mock-emails', `${orderId}-order_received.html`)
    expect(existsSync(file)).toBe(true)
    const html = readFileSync(file, 'utf8')
    expect(html).toContain('Czeka na płatność')   // the mail itself was sent
    expect(html).not.toContain('/sklep/status/')
    expect(html).not.toMatch(/href="\//)          // no relative link of any kind
  })
})
