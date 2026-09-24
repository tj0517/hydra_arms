/**
 * P24 payment integration tests (HA-2.03)
 *
 * Acceptance criteria and red proofs — all must pass:
 *   - Full mock path: checkout → mock page → mock-pay → paid → BL counter = 1
 *   - Bad signature → 401; order status unchanged
 *   - Amount/currency mismatch → 422
 *   - Idempotent notify: second call on verified attempt → 200 no-op, BL counter stays 1
 *   - Duplicate rejected: second attempt on already-paid order → duplicate_rejected, BL counter stays 1
 *   - Register retry → 409 when order is paid; no new order_payments row
 *   - Forged ?status=success in URL → page shows DB status (pending_payment), not URL param
 *   - Malformed notify body → 400
 *   - anon/authenticated: no SELECT/INSERT on order_payments
 *   - Delete order with payment attempt → FK RESTRICT error
 *   - mock-pay endpoint accessible (P24_MODE=mock guard positive proof)
 *   - bl-mock-counter endpoint accessible (BASELINKER_MOCK=true guard positive proof)
 *
 * Requires: local Supabase stack (npm run db:reset), BASELINKER_MOCK=true,
 *           P24_MODE=mock, P24_CRC_KEY=mock-crc-key-dev
 * Run: npm run test:shop:local
 */
import { test, expect } from '@playwright/test'
import { createHash } from 'crypto'

// ── Constants ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
// CRC key for signing notifications in tests — must match what the server uses
const P24_CRC = process.env.P24_CRC_KEY ?? 'mock-crc-key-dev'

const serviceHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

// ── Sign helpers (mirrors src/lib/p24/index.ts, no server-only import needed) ─

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

// ── DB helpers ───────────────────────────────────────────────────────────────

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

async function getBlMockCounter(request: import('@playwright/test').APIRequestContext, orderId: string) {
  const res = await request.get(`/api/shop/dev/bl-mock-counter?orderId=${orderId}`)
  expect(res.ok()).toBe(true)
  const data = await res.json()
  return data.count as number
}

// ── Checkout helper ──────────────────────────────────────────────────────────

interface ApiProduct { id: number; stock: number; product_type: string; is_active: boolean }

let _ipCounter = 1
function uniqueIpHeaders() {
  return { 'x-forwarded-for': `10.1.0.${(_ipCounter++ % 250) + 1}` }
}

async function getStandardProduct(request: import('@playwright/test').APIRequestContext): Promise<ApiProduct> {
  const res = await request.get('/api/shop/products?in_stock=true')
  const body = await res.json()
  const p = (body.products as ApiProduct[]).find(x => x.product_type === 'standard')
  if (!p) throw new Error('No in-stock standard product found')
  return p
}

async function doCheckout(request: import('@playwright/test').APIRequestContext, product?: ApiProduct) {
  const p = product ?? await getStandardProduct(request)
  const res = await request.post('/api/shop/checkout', {
    data: {
      items: [{ product_id: p.id, quantity: 1 }],
      shipping: {
        firstName: 'Test', lastName: 'Tester',
        email: 'test@example.com', phone: '123456789',
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

// Build a valid signed notification for an attempt
function buildNotification(
  attempt: { p24_session_id: string; amount_grosz: number; currency: string },
  overrides: Partial<{
    amount: number; originAmount: number; currency: string; sign: string
    merchantId: number; posId: number
  }> = {},
) {
  const merchantId = overrides.merchantId ?? 999999
  const posId = overrides.posId ?? 999999
  const amount = overrides.amount ?? attempt.amount_grosz
  const originAmount = overrides.originAmount ?? attempt.amount_grosz
  const currency = overrides.currency ?? attempt.currency
  // Deterministic fake orderId (same formula as mock-pay handler)
  const mockP24OrderId = Math.abs(
    [...attempt.p24_session_id].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0),
  ) % 900000000 + 100000000
  const statement = `mock-${attempt.p24_session_id.slice(0, 8)}`
  const sign = overrides.sign ?? signNotification(
    merchantId, posId, attempt.p24_session_id,
    amount, originAmount, currency,
    mockP24OrderId, 25, statement,
  )
  return { merchantId, posId, sessionId: attempt.p24_session_id, amount, originAmount, currency, orderId: mockP24OrderId, methodId: 25, statement, sign }
}

// ── Serialise entire suite to avoid shared-DB race conditions ────────────────
test.describe.configure({ mode: 'serial' })

// ── Wait for stack readiness ─────────────────────────────────────────────────
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
// 1. Notify body validation
// ════════════════════════════════════════════════════════════════════════════

test.describe('p24/notify — body validation', () => {
  test('empty body → 400', async ({ request }) => {
    const res = await request.post('/api/shop/payments/p24/notify', { data: {} })
    expect(res.status()).toBe(400)
  })

  test('non-integer amount → 400', async ({ request }) => {
    const res = await request.post('/api/shop/payments/p24/notify', {
      data: {
        merchantId: 1, posId: 1, sessionId: 'x', amount: 12.5,
        originAmount: 12.5, currency: 'PLN', orderId: 1, methodId: 1, statement: 'x', sign: 'abc',
      },
    })
    expect(res.status()).toBe(400)
  })

  test('zero amount → 400', async ({ request }) => {
    const res = await request.post('/api/shop/payments/p24/notify', {
      data: {
        merchantId: 1, posId: 1, sessionId: 'x', amount: 0,
        originAmount: 0, currency: 'PLN', orderId: 1, methodId: 1, statement: 'x', sign: 'abc',
      },
    })
    expect(res.status()).toBe(400)
  })

  test('missing sessionId → 400', async ({ request }) => {
    const res = await request.post('/api/shop/payments/p24/notify', {
      data: {
        merchantId: 1, posId: 1, amount: 100,
        originAmount: 100, currency: 'PLN', orderId: 1, methodId: 1, statement: 'x', sign: 'abc',
      },
    })
    expect(res.status()).toBe(400)
  })

  test('missing sign → 400', async ({ request }) => {
    const res = await request.post('/api/shop/payments/p24/notify', {
      data: {
        merchantId: 1, posId: 1, sessionId: 'x', amount: 100,
        originAmount: 100, currency: 'PLN', orderId: 1, methodId: 1, statement: 'x',
      },
    })
    expect(res.status()).toBe(400)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 2. Signature verification
// ════════════════════════════════════════════════════════════════════════════

test.describe('p24/notify — signature check', () => {
  test('wrong sign → 401, order status unchanged', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const attempts = await getPaymentAttempts(orderId)
    expect(attempts.length).toBe(1)
    const attempt = attempts[0]

    const notification = buildNotification(attempt, { sign: 'deadbeef' })
    const res = await request.post('/api/shop/payments/p24/notify', { data: notification })
    expect(res.status()).toBe(401)

    const order = await getOrder(orderId)
    expect(order?.status).toBe('pending_payment')
  })

  test('sign computed with wrong CRC → 401', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const attempts = await getPaymentAttempts(orderId)
    const attempt = attempts[0]

    const wrongCrc = 'wrong-crc-key'
    const notification = buildNotification(attempt, {
      sign: signNotification(
        999999, 999999, attempt.p24_session_id,
        attempt.amount_grosz, attempt.amount_grosz, attempt.currency,
        Math.abs([...attempt.p24_session_id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)) % 900000000 + 100000000,
        25, `mock-${attempt.p24_session_id.slice(0, 8)}`,
        wrongCrc,
      ),
    })
    const res = await request.post('/api/shop/payments/p24/notify', { data: notification })
    expect(res.status()).toBe(401)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 3. Full mock e2e path
// ════════════════════════════════════════════════════════════════════════════

test.describe('P24 mock — full e2e path', () => {
  test('checkout returns mock payment URL pointing to /sklep/platnosc/mock/{orderId}', async ({ request }) => {
    const { order_id: orderId, payment_url } = await doCheckout(request)
    expect(payment_url).toContain(`/sklep/platnosc/mock/${orderId}`)
    expect(payment_url).toContain('?sid=')
  })

  test('mock-pay: order → paid, attempt → verified, BL counter = 1', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const attempts = await getPaymentAttempts(orderId)
    expect(attempts.length).toBe(1)
    const { p24_session_id } = attempts[0]

    const payRes = await request.post('/api/shop/payments/p24/mock-pay', {
      data: { orderId, p24SessionId: p24_session_id },
    })
    expect(payRes.status()).toBe(200)

    // Order is now paid
    const order = await getOrder(orderId)
    expect(order?.status).toBe('paid')

    // Attempt is verified
    const paidAttempts = await getPaymentAttempts(orderId)
    expect(paidAttempts[0].status).toBe('verified')
    expect(paidAttempts[0].p24_order_id).not.toBeNull()

    // BL counter = 1
    const count = await getBlMockCounter(request, orderId)
    expect(count).toBe(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 4. Notify idempotency
// ════════════════════════════════════════════════════════════════════════════

test.describe('p24/notify — idempotency', () => {
  test('second notification for same sessionId → 200 no-op, BL counter stays 1', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const attempts = await getPaymentAttempts(orderId)
    const attempt = attempts[0]

    const notification = buildNotification(attempt)

    // First notify — should pay the order
    const r1 = await request.post('/api/shop/payments/p24/notify', { data: notification })
    expect(r1.status()).toBe(200)
    expect((await getOrder(orderId))?.status).toBe('paid')

    // Second notify — idempotent, must not double-push
    const r2 = await request.post('/api/shop/payments/p24/notify', { data: notification })
    expect(r2.status()).toBe(200)

    const count = await getBlMockCounter(request, orderId)
    expect(count).toBe(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 5. Amount and currency mismatch
// ════════════════════════════════════════════════════════════════════════════

test.describe('p24/notify — amount and currency mismatch', () => {
  test('amount different from registered attempt → 422, order stays pending_payment', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const attempts = await getPaymentAttempts(orderId)
    const attempt = attempts[0]

    const wrongAmount = attempt.amount_grosz + 1
    const notification = buildNotification(attempt, { amount: wrongAmount, originAmount: wrongAmount })
    // Re-sign with the modified amount (otherwise we'd also get 401)
    notification.sign = signNotification(
      notification.merchantId, notification.posId, attempt.p24_session_id,
      wrongAmount, wrongAmount, attempt.currency,
      notification.orderId, 25, notification.statement,
    )

    const res = await request.post('/api/shop/payments/p24/notify', { data: notification })
    expect(res.status()).toBe(422)
    expect((await getOrder(orderId))?.status).toBe('pending_payment')
  })

  test('currency different from registered attempt → 422', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const attempts = await getPaymentAttempts(orderId)
    const attempt = attempts[0]

    const notification = buildNotification(attempt, { currency: 'EUR' })
    // Re-sign with EUR
    notification.sign = signNotification(
      notification.merchantId, notification.posId, attempt.p24_session_id,
      attempt.amount_grosz, attempt.amount_grosz, 'EUR',
      notification.orderId, 25, notification.statement,
    )

    const res = await request.post('/api/shop/payments/p24/notify', { data: notification })
    expect(res.status()).toBe(422)
  })

  test('originAmount differs from amount → 422', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const attempts = await getPaymentAttempts(orderId)
    const attempt = attempts[0]

    const notification = buildNotification(attempt, { originAmount: attempt.amount_grosz + 1 })
    notification.sign = signNotification(
      notification.merchantId, notification.posId, attempt.p24_session_id,
      attempt.amount_grosz, attempt.amount_grosz + 1, attempt.currency,
      notification.orderId, 25, notification.statement,
    )

    const res = await request.post('/api/shop/payments/p24/notify', { data: notification })
    expect(res.status()).toBe(422)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 6. Duplicate attempt — order already paid by a different attempt
// ════════════════════════════════════════════════════════════════════════════

test.describe('p24/notify — duplicate_rejected for already-paid order', () => {
  test('second attempt on paid order → duplicate_rejected, BL counter stays 1', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)

    // Pay via attempt 1
    const attempts1 = await getPaymentAttempts(orderId)
    const a1 = attempts1[0]
    const pay1 = await request.post('/api/shop/payments/p24/mock-pay', {
      data: { orderId, p24SessionId: a1.p24_session_id },
    })
    expect(pay1.status()).toBe(200)
    expect((await getOrder(orderId))?.status).toBe('paid')
    expect(await getBlMockCounter(request, orderId)).toBe(1)

    // Register attempt 2
    const reg = await request.post('/api/shop/payments/p24/register', {
      data: { orderId, email: 'test@example.com' },
    })
    // Order is paid → 409
    expect(reg.status()).toBe(409)

    // Attempt count must not have grown
    const attemptsAfter = await getPaymentAttempts(orderId)
    expect(attemptsAfter.length).toBe(1)

    // BL counter still 1
    expect(await getBlMockCounter(request, orderId)).toBe(1)
  })

  test('notify for attempt 2 on paid order → 200 duplicate_rejected, BL counter stays 1', async ({ request }) => {
    // Set up: create order, pay via attempt 1
    const { order_id: orderId } = await doCheckout(request)
    const a1 = (await getPaymentAttempts(orderId))[0]

    await request.post('/api/shop/payments/p24/mock-pay', {
      data: { orderId, p24SessionId: a1.p24_session_id },
    })
    expect((await getOrder(orderId))?.status).toBe('paid')
    expect(await getBlMockCounter(request, orderId)).toBe(1)

    // Manually insert a second attempt row (bypassing register which would 409)
    // to simulate a notification arriving for a second payment session
    const p24SessionId2 = crypto.randomUUID()
    await fetch(`${SUPABASE_URL}/rest/v1/order_payments`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        order_id: orderId,
        p24_session_id: p24SessionId2,
        amount_grosz: a1.amount_grosz,
        currency: a1.currency,
      }),
    })

    // Build a valid notification for attempt 2
    const a2 = { p24_session_id: p24SessionId2, amount_grosz: a1.amount_grosz, currency: a1.currency }
    const notification = buildNotification(a2)
    const res = await request.post('/api/shop/payments/p24/notify', { data: notification })
    expect(res.status()).toBe(200)

    // Attempt 2 is marked duplicate_rejected
    const attempts = await getPaymentAttempts(orderId)
    const a2row = attempts.find(a => a.p24_session_id === p24SessionId2)
    expect(a2row?.status).toBe('duplicate_rejected')

    // BL counter still 1 — markOrderPaid was NOT called again
    expect(await getBlMockCounter(request, orderId)).toBe(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 7. Register retry → 409 for paid order
// ════════════════════════════════════════════════════════════════════════════

test.describe('p24/register — retry behaviour', () => {
  test('retry on pending_payment order → 200, new attempt row created', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const before = (await getPaymentAttempts(orderId)).length

    const res = await request.post('/api/shop/payments/p24/register', {
      data: { orderId, email: 'test@example.com' },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.payment_url).toContain('/sklep/platnosc/mock/')

    const after = await getPaymentAttempts(orderId)
    expect(after.length).toBe(before + 1)
  })

  test('register on paid order → 409, no new attempt row', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const a1 = (await getPaymentAttempts(orderId))[0]

    // Pay it
    await request.post('/api/shop/payments/p24/mock-pay', {
      data: { orderId, p24SessionId: a1.p24_session_id },
    })
    expect((await getOrder(orderId))?.status).toBe('paid')

    const before = (await getPaymentAttempts(orderId)).length
    const res = await request.post('/api/shop/payments/p24/register', {
      data: { orderId, email: 'test@example.com' },
    })
    expect(res.status()).toBe(409)

    const after = (await getPaymentAttempts(orderId)).length
    expect(after).toBe(before)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 8. Forged ?status=success in return URL
// ════════════════════════════════════════════════════════════════════════════

test.describe('order confirmation — URL params ignored', () => {
  test('?status=success on pending_payment order → page shows DB status', async ({ page, request }) => {
    const { order_id: orderId } = await doCheckout(request)

    // Navigate with forged success param — the page must NOT show a success state
    await page.goto(`/sklep/zamowienie/${orderId}?status=success`, { waitUntil: 'networkidle' })

    // The confirmation page fetches the real order via /api/shop/orders/{id}
    // Order is pending_payment → page must show the pending message
    const pendingText = page.locator('text=Czeka na płatność')
    await expect(pendingText).toBeVisible({ timeout: 10000 })

    // Pay now section visible for pending_payment
    await expect(page.locator('text=ZAPŁAĆ TERAZ')).toBeVisible({ timeout: 5000 })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 9. order_payments — DB permissions
// ════════════════════════════════════════════════════════════════════════════

test.describe('order_payments — DB permissions', () => {
  test('anon cannot SELECT order_payments', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/order_payments?limit=1`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    })
    // PostgREST returns 403 when the role has no SELECT privilege on the table
    expect(res.status).toBe(403)
  })

  test('anon cannot INSERT into order_payments', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/order_payments`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        order_id: crypto.randomUUID(),
        p24_session_id: crypto.randomUUID(),
        amount_grosz: 100,
        currency: 'PLN',
      }),
    })
    expect([403, 401]).toContain(res.status)
  })

  test('anon has no SELECT privilege on order_payments (via test_table_privilege)', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/test_table_privilege`, {
      method: 'POST',
      headers: { ...serviceHeaders, Prefer: '' },
      body: JSON.stringify({ role_name: 'anon', tbl: 'public.order_payments', priv: 'SELECT' }),
    })
    expect(res.status).toBe(200)
    const hasPriv = await res.json() as boolean
    expect(hasPriv).toBe(false)
  })

  test('authenticated has no SELECT privilege on order_payments (via test_table_privilege)', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/test_table_privilege`, {
      method: 'POST',
      headers: { ...serviceHeaders, Prefer: '' },
      body: JSON.stringify({ role_name: 'authenticated', tbl: 'public.order_payments', priv: 'SELECT' }),
    })
    expect(res.status).toBe(200)
    const hasPriv = await res.json() as boolean
    expect(hasPriv).toBe(false)
  })

  test('authenticated has no INSERT privilege on order_payments', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/test_table_privilege`, {
      method: 'POST',
      headers: { ...serviceHeaders, Prefer: '' },
      body: JSON.stringify({ role_name: 'authenticated', tbl: 'public.order_payments', priv: 'INSERT' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json() as boolean).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 10. Referential integrity — deleting order with attempts fails
// ════════════════════════════════════════════════════════════════════════════

test.describe('order_payments — referential integrity', () => {
  test('delete order with payment attempt → FK RESTRICT error (409)', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)

    // Verify there's at least one attempt
    const attempts = await getPaymentAttempts(orderId)
    expect(attempts.length).toBeGreaterThan(0)

    // Try to delete the order via service role
    const deleteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`,
      { method: 'DELETE', headers: { ...serviceHeaders, Prefer: 'return=minimal' } },
    )
    // PostgREST maps FK violation (23503) to 409 Conflict
    expect(deleteRes.status).toBe(409)

    // Order is still there
    const order = await getOrder(orderId)
    expect(order?.id).toBe(orderId)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 11. Mock-mode guards (positive proofs)
//     Negative proofs (404 in non-mock mode) require a server started with
//     P24_MODE≠mock and cannot be validated in this mock-mode test run.
// ════════════════════════════════════════════════════════════════════════════

test.describe('mock-mode guard — positive proofs', () => {
  test('mock-pay endpoint accepts requests when P24_MODE=mock', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    const attempts = await getPaymentAttempts(orderId)
    const { p24_session_id } = attempts[0]

    // A valid call returns 200 (not 404)
    const res = await request.post('/api/shop/payments/p24/mock-pay', {
      data: { orderId, p24SessionId: p24_session_id },
    })
    expect(res.status()).not.toBe(404)
  })

  test('bl-mock-counter endpoint returns count when BASELINKER_MOCK=true', async ({ request }) => {
    const { order_id: orderId } = await doCheckout(request)
    // Before paying, counter = 0
    const res = await request.get(`/api/shop/dev/bl-mock-counter?orderId=${orderId}`)
    expect(res.status()).not.toBe(404)
    expect(res.ok()).toBe(true)
    const data = await res.json()
    expect(data.count).toBe(0)
  })

  test('mock payment page renders when P24_MODE=mock', async ({ page, request }) => {
    const { payment_url } = await doCheckout(request)
    expect(payment_url).toContain('/sklep/platnosc/mock/')

    await page.goto(payment_url, { waitUntil: 'networkidle' })
    await expect(page.locator('text=Środowisko mock')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=ZAPŁAĆ (SYMULACJA)')).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 12. Unknown sessionId
// ════════════════════════════════════════════════════════════════════════════

test.describe('p24/notify — unknown sessionId', () => {
  test('notification for non-existent sessionId → 404', async ({ request }) => {
    const fakeSessionId = crypto.randomUUID()
    const fakeMockP24OrderId = 123456789
    const sign = signNotification(
      999999, 999999, fakeSessionId,
      1000, 1000, 'PLN',
      fakeMockP24OrderId, 25, 'mock-test',
    )
    const res = await request.post('/api/shop/payments/p24/notify', {
      data: {
        merchantId: 999999, posId: 999999, sessionId: fakeSessionId,
        amount: 1000, originAmount: 1000, currency: 'PLN',
        orderId: fakeMockP24OrderId, methodId: 25, statement: 'mock-test', sign,
      },
    })
    expect(res.status()).toBe(404)
  })
})
