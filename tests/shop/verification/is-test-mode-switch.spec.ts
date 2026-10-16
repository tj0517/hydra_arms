/**
 * HA-2.08 red proof — a test order (orders.is_test = true) is never pushed to BaseLinker,
 * even when the server is NOT in verification mode (the "SHOP_MODE switched later" case).
 *
 * Default config: SHOP_MODE unset (= dev, which allows BL pushes), BASELINKER_MOCK=true.
 * The order is created through the real checkout route, then flagged is_test = true directly in
 * the LOCAL database (what a verification-mode checkout would have done), paid, and the orphan
 * retry is run. A control order without the flag proves the harness does show a push.
 */
import { test, expect, type APIRequestContext } from '@playwright/test'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const SYNC_SECRET = process.env.SYNC_SECRET ?? 'local-sync-secret-dev'
const serviceHeaders = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }

test.describe.configure({ mode: 'serial' })

// A paid test order without a BL id counts as a local stock reservation (see getReservedCount in
// checkout.spec.ts). Cancel what this file created so it cannot starve later specs in the same DB.
test.afterAll(async () => {
  await fetch(`${SUPABASE_URL}/rest/v1/orders?is_test=eq.true&status=eq.paid`, {
    method: 'PATCH',
    headers: { ...serviceHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  })
})

let ip = 1
const uniqueIp = () => ({ 'x-forwarded-for': `10.6.0.${(ip++ % 250) + 1}` })

async function standardProductId(request: APIRequestContext): Promise<number> {
  const body = await (await request.get('/api/shop/products?in_stock=true')).json()
  const p = (body.products as Array<{ id: number; product_type: string }>).find(x => x.product_type === 'standard')
  if (!p) throw new Error('No in-stock standard product in seed')
  return p.id
}

async function placeOrder(request: APIRequestContext) {
  const res = await request.post('/api/shop/checkout', {
    data: {
      items: [{ product_id: await standardProductId(request), quantity: 1 }],
      terms_accepted: true,
      shipping: {
        firstName: 'Test', lastName: 'Przełączenie', email: 'przelaczenie@example.com', phone: '123456789',
        street: 'Testowa 1', city: 'Kraków', zip: '30-001',
      },
      idempotency_key: crypto.randomUUID(),
      fulfillment_route: 'own',
    },
    headers: uniqueIp(),
  })
  expect(res.status()).toBe(200)
  const { order_id: orderId, payment_url: paymentUrl } = await res.json()
  return { orderId: orderId as string, sid: new URL(paymentUrl).searchParams.get('sid') as string }
}

async function row(orderId: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=status,baselinker_order_id,is_test`, { headers: serviceHeaders })
  return ((await r.json()) as Array<{ status: string; baselinker_order_id: number | null; is_test: boolean }>)[0]
}

async function setIsTest(orderId: string, value: boolean) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
    method: 'PATCH',
    headers: { ...serviceHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_test: value }),
  })
  expect(r.ok).toBe(true)
}

const counter = async (request: APIRequestContext, orderId: string) =>
  (await (await request.get(`/api/shop/dev/bl-mock-counter?orderId=${orderId}`)).json()).count as number

test.describe('is_test survives a SHOP_MODE switch', () => {
  test('a normal order created outside verification mode has is_test = false (default)', async ({ request }) => {
    const { orderId } = await placeOrder(request)
    expect((await row(orderId)).is_test).toBe(false)
  })

  test('control: paid order WITHOUT is_test is pushed to BaseLinker (counter 1, BL id set)', async ({ request }) => {
    const { orderId, sid } = await placeOrder(request)
    const pay = await request.post('/api/shop/payments/p24/mock-pay', { data: { orderId, p24SessionId: sid } })
    expect(pay.ok()).toBe(true)
    expect(await counter(request, orderId)).toBe(1)
    expect((await row(orderId)).baselinker_order_id).not.toBeNull()
  })

  test('RED PROOF: paid is_test order → BL counter 0, no BL id, also after the orphan-retry sync', async ({ request }) => {
    const { orderId, sid } = await placeOrder(request)
    await setIsTest(orderId, true)

    const pay = await request.post('/api/shop/payments/p24/mock-pay', { data: { orderId, p24SessionId: sid } })
    expect(pay.ok()).toBe(true)
    expect((await row(orderId)).status).toBe('paid')
    expect(await counter(request, orderId)).toBe(0)
    expect((await row(orderId)).baselinker_order_id).toBeNull()

    const sync = await request.post('/api/shop/orders/sync', { headers: { 'x-sync-secret': SYNC_SECRET } })
    expect(sync.ok()).toBe(true)
    expect((await row(orderId)).baselinker_order_id).toBeNull()
    expect(await counter(request, orderId)).toBe(0)
  })
})
