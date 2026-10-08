/**
 * API-level red proof for the P24 notify IP allowlist (HA-2.20).
 * Run with: npm run test:p24:notify-ip
 *
 * The webServer in playwright.p24-notify-ip.config.ts runs in mock mode WITH
 * P24_NOTIFY_ALLOWED_IPS set, so the filter is active.  Proofs:
 *   - notify from an IP outside the list → 403, order AND its order_payments row
 *     byte-for-byte unchanged (read before and after)
 *   - notify with no client-IP header at all → 403
 *   - notify from an IP inside the list (and inside the /24) → processed, order paid
 *
 * The rejection must come from the IP filter alone: the bodies below are
 * correctly signed, so a 403 cannot be explained by the CRC check.
 *
 * Do NOT loosen the status assertions; fix src/lib/p24/notifyIp.ts instead.
 */
import { test, expect } from '@playwright/test'
import { createHash } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const P24_CRC = process.env.P24_CRC_KEY ?? 'mock-crc-key-dev'

// Must match ALLOWLIST in playwright.p24-notify-ip.config.ts.
// RFC 5737 documentation addresses — never the real P24 ranges.
const ALLOWED_IP = '203.0.113.7'        // exact entry
const ALLOWED_IP_IN_CIDR = '198.51.100.42' // inside 198.51.100.0/24
const FOREIGN_IP = '192.0.2.66'         // not on the list

const serviceHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

// ── helpers (mirror tests/shop/p24/p24.spec.ts) ──────────────────────────────

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

type Attempt = {
  id: string
  p24_session_id: string
  amount_grosz: number
  currency: string
  status: string
  p24_order_id: number | null
  verified_at: string | null
  claimed_at: string | null
}

async function getOrder(orderId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=id,status,total,updated_at`,
    { headers: serviceHeaders },
  )
  const rows = await res.json()
  return rows[0] as { id: string; status: string; total: number; updated_at: string }
}

async function getAttempts(orderId: string): Promise<Attempt[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/order_payments?order_id=eq.${orderId}` +
      `&select=id,p24_session_id,amount_grosz,currency,status,p24_order_id,verified_at,claimed_at&order=created_at.asc`,
    { headers: serviceHeaders },
  )
  return res.json()
}

let _ipCounter = 1
function uniqueIpHeaders() {
  return { 'x-forwarded-for': `10.3.0.${(_ipCounter++ % 250) + 1}` }
}

type ApiProduct = { id: number; product_type: string }

async function doCheckout(request: import('@playwright/test').APIRequestContext) {
  const listRes = await request.get('/api/shop/products?in_stock=true')
  const body = await listRes.json()
  const p = (body.products as ApiProduct[]).find(x => x.product_type === 'standard')
  if (!p) throw new Error('No in-stock standard product found')

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
  return json as { order_id: string; status: string }
}

/** A correctly signed notification for `attempt` — same formula as mock-pay. */
function buildNotification(attempt: Attempt) {
  const merchantId = 999999
  const posId = 999999
  const mockP24OrderId = Math.abs(
    [...attempt.p24_session_id].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0),
  ) % 900000000 + 100000000
  const statement = `mock-${attempt.p24_session_id.slice(0, 8)}`
  return {
    merchantId, posId,
    sessionId: attempt.p24_session_id,
    amount: attempt.amount_grosz,
    originAmount: attempt.amount_grosz,
    currency: attempt.currency,
    orderId: mockP24OrderId,
    methodId: 25,
    statement,
    sign: signNotification(
      merchantId, posId, attempt.p24_session_id,
      attempt.amount_grosz, attempt.amount_grosz, attempt.currency,
      mockP24OrderId, 25, statement,
    ),
  }
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ request }) => {
  // Wait for the stack/server to be ready
  for (let i = 0; i < 15; i++) {
    const res = await request.get('/api/shop/products?in_stock=true').catch(() => null)
    if (res?.ok()) return
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('Shop API not ready — is the local Supabase stack running (npm run db:reset)?')
})

// ── RED PROOF: foreign IP ────────────────────────────────────────────────────

test.describe('p24/notify — IP allowlist active', () => {
  test('RED PROOF: foreign IP → 403 and order + order_payments unchanged', async ({ request }) => {
    const { order_id } = await doCheckout(request)

    const orderBefore = await getOrder(order_id)
    const attemptsBefore = await getAttempts(order_id)
    expect(attemptsBefore).toHaveLength(1)
    expect(orderBefore.status).toBe('pending_payment')
    expect(attemptsBefore[0].status).toBe('registered')

    const notification = buildNotification(attemptsBefore[0])

    const res = await request.post('/api/shop/payments/p24/notify', {
      data: notification,
      headers: { 'x-forwarded-for': FOREIGN_IP },
    })

    // 403 from the IP filter — the body is correctly signed, so this cannot be
    // the CRC check firing.
    expect(res.status()).toBe(403)
    expect((await res.json()).error).toBe('Forbidden')

    const orderAfter = await getOrder(order_id)
    const attemptsAfter = await getAttempts(order_id)

    // Nothing touched: identical rows, including updated_at / claimed_at.
    expect(orderAfter).toEqual(orderBefore)
    expect(attemptsAfter).toEqual(attemptsBefore)
    expect(orderAfter.status).toBe('pending_payment')
    expect(attemptsAfter[0].status).toBe('registered')
    expect(attemptsAfter[0].p24_order_id).toBeNull()
    expect(attemptsAfter[0].verified_at).toBeNull()
    expect(attemptsAfter[0].claimed_at).toBeNull()
  })

  test('RED PROOF: no spoofed IP header → 403 and order unchanged', async ({ request }) => {
    const { order_id } = await doCheckout(request)
    const orderBefore = await getOrder(order_id)
    const attemptsBefore = await getAttempts(order_id)

    const res = await request.post('/api/shop/payments/p24/notify', {
      data: buildNotification(attemptsBefore[0]),
      // No x-forwarded-for of our own: the dev server fills in the real peer
      // address (::1 for loopback), which is not on the list → rejected.
    })

    expect(res.status()).toBe(403)
    expect(await getOrder(order_id)).toEqual(orderBefore)
    expect(await getAttempts(order_id)).toEqual(attemptsBefore)
  })

  test('RED PROOF: IP just outside the /24 → 403', async ({ request }) => {
    const { order_id } = await doCheckout(request)
    const attemptsBefore = await getAttempts(order_id)

    const res = await request.post('/api/shop/payments/p24/notify', {
      data: buildNotification(attemptsBefore[0]),
      headers: { 'x-forwarded-for': '198.51.101.42' }, // 198.51.100.0/24 is listed, .101 is not
    })

    expect(res.status()).toBe(403)
    expect((await getOrder(order_id)).status).toBe('pending_payment')
  })

  // ── POSITIVE PROOF: listed IP is processed ─────────────────────────────────

  test('listed IP (exact entry) + valid signature → 200 and order paid', async ({ request }) => {
    const { order_id } = await doCheckout(request)
    const attempts = await getAttempts(order_id)
    expect((await getOrder(order_id)).status).toBe('pending_payment')

    const res = await request.post('/api/shop/payments/p24/notify', {
      data: buildNotification(attempts[0]),
      headers: { 'x-forwarded-for': ALLOWED_IP },
    })

    expect(res.status()).toBe(200)
    expect((await res.json()).ok).toBe(true)

    expect((await getOrder(order_id)).status).toBe('paid')
    const after = await getAttempts(order_id)
    expect(after[0].status).toBe('verified')
    expect(after[0].verified_at).not.toBeNull()
  })

  test('listed IP inside the /24 range → 200 and order paid', async ({ request }) => {
    const { order_id } = await doCheckout(request)
    const attempts = await getAttempts(order_id)

    const res = await request.post('/api/shop/payments/p24/notify', {
      data: buildNotification(attempts[0]),
      headers: { 'x-forwarded-for': ALLOWED_IP_IN_CIDR },
    })

    expect(res.status()).toBe(200)
    expect((await getOrder(order_id)).status).toBe('paid')
  })

  test('IP filter runs BEFORE the signature check: foreign IP + garbage body → 403, not 400/401', async ({ request }) => {
    const res = await request.post('/api/shop/payments/p24/notify', {
      data: { not: 'a notification' },
      headers: { 'x-forwarded-for': FOREIGN_IP },
    })
    expect(res.status()).toBe(403)
  })
})
