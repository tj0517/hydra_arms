/**
 * Order confirmation / payment confirmation email tests (HA-2.07)
 *
 * Acceptance criteria and red proofs — all must pass:
 *   - Checkout sends exactly one "order received" email (counter = 1)
 *   - mark_order_paid sends exactly one "payment received" email (counter = 1)
 *   - Repeated P24 notify on an already-paid order does not send a second
 *     "payment received" email (counter stays 1) — the actual idempotency gate
 *     is the DB marker, not the `changed` flag: see the marker-bypass note below
 *   - A forced send failure (missing recipient email) does not change order
 *     status, does not change the notify response, and leaves the marker unset
 *   - The email-mock-counter dev endpoint is only reachable in mock mode
 *
 * Requires: local Supabase stack (npm run db:reset), RESEND_MOCK=true,
 *           BASELINKER_MOCK=true, P24_MODE=mock, P24_CRC_KEY=mock-crc-key-dev
 * Run: npm run test:shop:local
 */
import { test, expect } from '@playwright/test'
import { createHash } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const P24_CRC = process.env.P24_CRC_KEY ?? 'mock-crc-key-dev'

const serviceHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

function sha384(s: string) {
  return createHash('sha384').update(s, 'utf8').digest('hex')
}

function signNotification(
  merchantId: number, posId: number, sessionId: string,
  amount: number, originAmount: number, currency: string,
  orderId: number, methodId: number, statement: string,
  crc = P24_CRC,
) {
  return sha384(JSON.stringify({
    merchantId, posId, sessionId, amount, originAmount, currency,
    orderId, methodId, statement, crc,
  }))
}

async function getOrder(orderId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=id,status,total`,
    { headers: serviceHeaders },
  )
  const rows = await res.json()
  return rows[0] as { id: string; status: string; total: number } | undefined
}

async function getPaymentAttempts(orderId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/order_payments?order_id=eq.${orderId}&select=id,p24_session_id,amount_grosz,currency,status,p24_order_id&order=created_at.asc`,
    { headers: serviceHeaders },
  )
  return res.json() as Promise<Array<{
    id: string
    p24_session_id: string
    amount_grosz: number
    currency: string
    status: string
    p24_order_id: number | null
  }>>
}

async function getEmailMockCounter(
  request: import('@playwright/test').APIRequestContext,
  orderId: string,
  type: 'order_received' | 'payment_received',
) {
  const res = await request.get(`/api/shop/dev/email-mock-counter?orderId=${orderId}&type=${type}`)
  expect(res.ok()).toBe(true)
  const data = await res.json()
  return data.count as number
}

interface ApiProduct { id: number; stock: number; product_type: string; is_active: boolean }

let _ipCounter = 1
function uniqueIpHeaders() {
  return { 'x-forwarded-for': `10.2.0.${(_ipCounter++ % 250) + 1}` }
}

async function getStandardProduct(request: import('@playwright/test').APIRequestContext): Promise<ApiProduct> {
  const res = await request.get('/api/shop/products?in_stock=true')
  const body = await res.json()
  const p = (body.products as ApiProduct[]).find(x => x.product_type === 'standard')
  if (!p) throw new Error('No in-stock standard product found')
  return p
}

async function doCheckout(
  request: import('@playwright/test').APIRequestContext,
  overrides: Partial<{ email: string }> = {},
) {
  const p = await getStandardProduct(request)
  const res = await request.post('/api/shop/checkout', {
    data: {
      items: [{ product_id: p.id, quantity: 1 }],
      shipping: {
        firstName: 'Test', lastName: 'Tester',
        email: overrides.email ?? 'test@example.com', phone: '123456789',
        street: 'Testowa 1', city: 'Kraków', zip: '30-001',
      },
      idempotency_key: crypto.randomUUID(),
      fulfillment_route: 'own',
    },
    headers: uniqueIpHeaders(),
  })
  expect(res.status()).toBe(200)
  const json = await res.json()
  expect(json.order_id).toBeTruthy()
  return json as { order_id: string; payment_url: string; status: string; total: number }
}

function buildNotification(
  attempt: { p24_session_id: string; amount_grosz: number; currency: string },
) {
  const merchantId = 999999
  const posId = 999999
  const amount = attempt.amount_grosz
  const originAmount = attempt.amount_grosz
  const currency = attempt.currency
  const mockP24OrderId = Math.abs(
    [...attempt.p24_session_id].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0),
  ) % 900000000 + 100000000
  const statement = `mock-${attempt.p24_session_id.slice(0, 8)}`
  const sign = signNotification(
    merchantId, posId, attempt.p24_session_id,
    amount, originAmount, currency,
    mockP24OrderId, 25, statement,
  )
  return { merchantId, posId, sessionId: attempt.p24_session_id, amount, originAmount, currency, orderId: mockP24OrderId, methodId: 25, statement, sign }
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ request }) => {
  for (let i = 0; i < 15; i++) {
    try {
      const res = await request.get('/api/shop/products?in_stock=true')
      if (res.ok()) {
        const body = await res.json()
        const products: ApiProduct[] = Array.isArray(body?.products) ? body.products : []
        if (products.some(p => p.product_type === 'standard')) return
      }
    } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Stack not ready after 30 s')
})

// ════════════════════════════════════════════════════════════════════════════
// 1. Checkout sends exactly one "order received" email
// ════════════════════════════════════════════════════════════════════════════

test.describe('checkout — order received email', () => {
  test('checkout sends exactly one order_received email', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const count = await getEmailMockCounter(request, orderId, 'order_received')
    expect(count).toBe(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 2. mark_order_paid sends exactly one "payment received" email
// ════════════════════════════════════════════════════════════════════════════

test.describe('P24 mock-pay — payment received email', () => {
  test('mock-pay sends exactly one payment_received email', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const attempts = await getPaymentAttempts(orderId)
    const { p24_session_id } = attempts[0]

    const payRes = await request.post('/api/shop/payments/p24/mock-pay', {
      data: { orderId, p24SessionId: p24_session_id },
    })
    expect(payRes.status()).toBe(200)
    expect((await getOrder(orderId))?.status).toBe('paid')

    const count = await getEmailMockCounter(request, orderId, 'payment_received')
    expect(count).toBe(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 3. RED PROOF — repeated notify must not double-send the payment email
//    sendPaymentReceivedEmail() is called unconditionally on every
//    markOrderPaid() resolution (including the idempotent 'verified' recovery
//    path where `changed` is already false) — the DB marker is the only thing
//    that prevents a second send here.
// ════════════════════════════════════════════════════════════════════════════

test.describe('p24/notify — idempotent payment email', () => {
  test('repeated notify for an already-paid order → payment_received counter stays 1', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const attempts = await getPaymentAttempts(orderId)
    const attempt = attempts[0]
    const notification = buildNotification(attempt)

    // First notify — pays the order, sends the email
    const r1 = await request.post('/api/shop/payments/p24/notify', { data: notification })
    expect(r1.status()).toBe(200)
    expect((await getOrder(orderId))?.status).toBe('paid')
    expect(await getEmailMockCounter(request, orderId, 'payment_received')).toBe(1)

    // Second and third notify — recovery path, markOrderPaid() called again
    // (changed=false) but sendPaymentReceivedEmail() is still invoked; only the
    // marker prevents a second send.
    const r2 = await request.post('/api/shop/payments/p24/notify', { data: notification })
    expect(r2.status()).toBe(200)
    const r3 = await request.post('/api/shop/payments/p24/notify', { data: notification })
    expect(r3.status()).toBe(200)

    expect(await getEmailMockCounter(request, orderId, 'payment_received')).toBe(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 3b. Payment email only for paid orders — the marker claim itself requires
//     status='paid', independent of markOrderPaid's own RPC semantics.
// ════════════════════════════════════════════════════════════════════════════

test.describe('payment email — status=paid guard', () => {
  test('order still pending_payment → send is a no-op, counter 0, marker stays null', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    expect((await getOrder(orderId))?.status).toBe('pending_payment')

    const res = await request.post('/api/shop/dev/trigger-payment-email', { data: { orderId } })
    expect(res.status()).toBe(200)

    expect(await getEmailMockCounter(request, orderId, 'payment_received')).toBe(0)
    const row = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=payment_received_email_sent_at`,
      { headers: serviceHeaders },
    ).then(r => r.json())
    expect(row[0].payment_received_email_sent_at).toBeNull()
  })

  test('cancelled order → send is a no-op, counter 0, marker stays null', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: { ...serviceHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    expect((await getOrder(orderId))?.status).toBe('cancelled')

    const res = await request.post('/api/shop/dev/trigger-payment-email', { data: { orderId } })
    expect(res.status()).toBe(200)

    expect(await getEmailMockCounter(request, orderId, 'payment_received')).toBe(0)
    const row = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=payment_received_email_sent_at`,
      { headers: serviceHeaders },
    ).then(r => r.json())
    expect(row[0].payment_received_email_sent_at).toBeNull()
  })

  test('paid order → send succeeds, counter 1', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const attempts = await getPaymentAttempts(orderId)
    await request.post('/api/shop/payments/p24/mock-pay', {
      data: { orderId, p24SessionId: attempts[0].p24_session_id },
    })
    expect((await getOrder(orderId))?.status).toBe('paid')
    expect(await getEmailMockCounter(request, orderId, 'payment_received')).toBe(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 4. Forced send failure — missing recipient email must not break the order
// ════════════════════════════════════════════════════════════════════════════

test.describe('payment email — forced send failure', () => {
  test('missing recipient email → order still paid, notify response unchanged, marker stays null', async ({ request }) => {
    const p = await getStandardProduct(request)

    // Insert a pending_payment order directly, with a shipping_address that
    // has NO email — deliver() throws 'Missing recipient email address'.
    const createRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        status: 'pending_payment',
        total: 10,
        shipping_address: { firstName: 'No', lastName: 'Email' }, // no `email` key
        fulfillment_route: 'own',
      }),
    })
    const [order] = await createRes.json()
    const orderId = order.id as string

    await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        order_id: orderId,
        product_id: p.id,
        quantity: 1,
        unit_price: 10,
        product_snapshot: { id: p.id, name: 'Forced error test product' },
      }),
    })

    const sessionId = crypto.randomUUID()
    await fetch(`${SUPABASE_URL}/rest/v1/order_payments`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        order_id: orderId,
        p24_session_id: sessionId,
        amount_grosz: 1000,
        currency: 'PLN',
      }),
    })

    const notification = buildNotification({ p24_session_id: sessionId, amount_grosz: 1000, currency: 'PLN' })
    const res = await request.post('/api/shop/payments/p24/notify', { data: notification })

    // Notify response is unaffected by the email failure
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)

    // Order still transitioned to paid — email failure did not roll back payment state
    expect((await getOrder(orderId))?.status).toBe('paid')

    // Marker was released after the failed send — still null, so a legitimate
    // retry could send successfully once the address is fixed
    const orderRow = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=payment_received_email_sent_at`,
      { headers: serviceHeaders },
    ).then(r => r.json())
    expect(orderRow[0].payment_received_email_sent_at).toBeNull()

    // No successful send was counted
    expect(await getEmailMockCounter(request, orderId, 'payment_received')).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 5. Mock-mode guard — positive proof
// ════════════════════════════════════════════════════════════════════════════

test.describe('email-mock-counter — mock-mode guard', () => {
  test('endpoint accessible when RESEND_MOCK=true', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const res = await request.get(`/api/shop/dev/email-mock-counter?orderId=${orderId}&type=order_received`)
    expect(res.status()).not.toBe(404)
    expect(res.ok()).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 6. Mock email HTML — written to test-results/mock-emails/, not logged
// ════════════════════════════════════════════════════════════════════════════

test.describe('mock email HTML file', () => {
  test('order_received HTML is written to disk with correct order data', async ({ request }) => {
    const { order_id: orderId, total } = await doCheckout(request)

    const fs = await import('fs')
    const path = await import('path')
    const filePath = path.join(process.cwd(), 'test-results', 'mock-emails', `${orderId}-order_received.html`)
    expect(fs.existsSync(filePath)).toBe(true)

    const html = fs.readFileSync(filePath, 'utf8')
    expect(html).toContain(orderId.slice(0, 8).toUpperCase())
    expect(html).toContain('Czeka na płatność')
    expect(html).toContain(`${total.toFixed(2).replace('.', ',')} PLN`)
  })
})
