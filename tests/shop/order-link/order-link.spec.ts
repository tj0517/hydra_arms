/**
 * Signed guest order-status link (HA-2.19)
 *
 * Red proofs (API, Playwright `request`):
 *   - expired token            → 410, no order data
 *   - forged token (sig/exp)   → 404
 *   - token of order A on B    → 404
 *   - valid token response     → no address / name / e-mail / phone anywhere
 * Green: valid token shows the order; both e-mails carry a link whose token
 * verifies for that very order; the page renders / refuses accordingly.
 *
 * Tokens are signed here with the fake test secret from playwright.config.ts
 * (independent re-implementation of the format, not an import of the module).
 *
 * Requires: local Supabase stack (npm run db:reset), RESEND_MOCK=true.
 * Run: npx playwright test tests/shop/order-link
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import { createHmac } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dismissCookies } from '../fixtures'

const SECRET = process.env.ORDER_LINK_SECRET ?? ''
const DAY = 24 * 60 * 60
const SHOTS = join(process.cwd(), '.playwright-mcp')

// Values that must never appear in anything the token page / API returns.
const PII = {
  firstName: 'Zenobiusz',
  lastName: 'Kowalczykowski',
  email: 'zenobiusz.kowalczykowski@example.com',
  phone: '600700812',
  street: 'Ulica Sekretna 77',
  city: 'Miastowo',
  zip: '31-999',
}

function signToken(orderId: string, exp: number, secret = SECRET): string {
  const sig = createHmac('sha256', secret).update(`order-status:v1:${orderId}:${exp}`).digest('hex')
  return `${exp}.${sig}`
}
const nowSec = () => Math.floor(Date.now() / 1000)
const validToken = (orderId: string) => signToken(orderId, nowSec() + 30 * DAY)

let ipCounter = 1
async function checkout(request: APIRequestContext): Promise<{ orderId: string; total: number }> {
  const productsRes = await request.get('/api/shop/products?in_stock=true')
  const { products } = await productsRes.json()
  const product = (products as Array<{ id: number; product_type: string }>).find(p => p.product_type === 'standard')
  if (!product) throw new Error('No in-stock standard product in seed')

  const res = await request.post('/api/shop/checkout', {
    data: {
      items: [{ product_id: product.id, quantity: 1 }],
      terms_accepted: true,
      shipping: PII,
      idempotency_key: crypto.randomUUID(),
      fulfillment_route: 'own',
    },
    headers: { 'x-forwarded-for': `10.4.0.${(ipCounter++ % 250) + 1}` },
  })
  expect(res.status()).toBe(200)
  const json = await res.json()
  return { orderId: json.order_id, total: json.total }
}

function status(request: APIRequestContext, orderId: string, token?: string) {
  const q = token === undefined ? '' : `?t=${encodeURIComponent(token)}`
  return request.get(`/api/shop/order-status/${orderId}${q}`)
}

function expectNoPii(text: string) {
  for (const value of Object.values(PII)) expect(text).not.toContain(value)
  expect(text.toLowerCase()).not.toContain('shipping_address')
}

function readMockEmail(orderId: string, type: 'order_received' | 'payment_received'): string {
  const file = join(process.cwd(), 'test-results', 'mock-emails', `${orderId}-${type}.html`)
  expect(existsSync(file)).toBe(true)
  return readFileSync(file, 'utf8')
}

function extractStatusLink(html: string): URL | null {
  const m = /href="(https?:\/\/[^"]*\/sklep\/status\/[^"]*)"/.exec(html)
  return m ? new URL(m[1].replace(/&amp;/g, '&')) : null
}

test.describe.configure({ mode: 'serial' })

let orderA: { orderId: string; total: number }
let orderB: { orderId: string; total: number }

test.beforeAll(async ({ request }) => {
  expect(SECRET).not.toBe('')
  for (let i = 0; i < 15; i++) {
    try {
      const res = await request.get('/api/shop/products?in_stock=true')
      if (res.ok()) {
        const body = await res.json()
        if ((body?.products ?? []).some((p: { product_type: string }) => p.product_type === 'standard')) break
      }
    } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 2000))
  }
  orderA = await checkout(request)
  orderB = await checkout(request)
  mkdirSync(SHOTS, { recursive: true })
})

test.describe('status API — red proofs', () => {
  test('expired token → 410 and no order data', async ({ request }) => {
    const res = await status(request, orderA.orderId, signToken(orderA.orderId, nowSec() - 60))
    expect(res.status()).toBe(410)
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({ error: 'expired' })
    expect(text).not.toContain(orderA.orderId)
  })

  test('forged token (signature altered) → 404', async ({ request }) => {
    const good = validToken(orderA.orderId)
    const forged = good.slice(0, -1) + (good.endsWith('0') ? '1' : '0')
    const res = await status(request, orderA.orderId, forged)
    expect(res.status()).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  test('forged token (expiry extended, old signature) → 404', async ({ request }) => {
    const [exp, sig] = signToken(orderA.orderId, nowSec() - 60).split('.')
    const res = await status(request, orderA.orderId, `${Number(exp) + 365 * DAY}.${sig}`)
    expect(res.status()).toBe(404)
  })

  test('token signed for order A used on order B → 404, and B is not disclosed', async ({ request }) => {
    const res = await status(request, orderB.orderId, validToken(orderA.orderId))
    expect(res.status()).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
    // Control: B's own token works, so the refusal above is about the binding, not the order.
    expect((await status(request, orderB.orderId, validToken(orderB.orderId))).status()).toBe(200)
  })

  test('missing / malformed token → 404', async ({ request }) => {
    for (const t of [undefined, '', 'garbage', '1.2', `${nowSec() + DAY}.${'A'.repeat(64)}`, `${nowSec() + DAY}.${'a'.repeat(63)}`]) {
      const res = await status(request, orderA.orderId, t)
      expect(res.status(), `token=${t === undefined ? '(none)' : t.slice(0, 12)}`).toBe(404)
    }
  })

  test('validly signed token for a non-existent order is answered like a forged one', async ({ request }) => {
    const ghost = crypto.randomUUID()
    const res = await status(request, ghost, validToken(ghost))
    expect(res.status()).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  test('valid token response contains no address, name, e-mail or phone', async ({ request }) => {
    const res = await status(request, orderA.orderId, validToken(orderA.orderId))
    expect(res.status()).toBe(200)
    const text = await res.text()
    expectNoPii(text)
    const { order } = JSON.parse(text)
    expect(Object.keys(order).sort()).toEqual(['fulfillment_route', 'id', 'items', 'status', 'total'])
    for (const item of order.items) expect(Object.keys(item).sort()).toEqual(['name', 'quantity', 'unit_price'])
  })
})

test.describe('status API — green', () => {
  test('valid token shows status, items, total and route', async ({ request }) => {
    const res = await status(request, orderA.orderId, validToken(orderA.orderId))
    expect(res.status()).toBe(200)
    const { order } = await res.json()
    expect(order.id).toBe(orderA.orderId)
    expect(order.status).toBe('pending_payment')
    expect(order.total).toBeCloseTo(orderA.total, 2)
    expect(order.fulfillment_route).toBe('own')
    expect(order.items).toHaveLength(1)
    expect(order.items[0].name).toBeTruthy()
  })
})

test.describe('status page', () => {
  test('valid token: status visible, no personal data', async ({ page }) => {
    await dismissCookies(page)   // banner would cover the content in the screenshots
    await page.goto(`/sklep/status/${orderA.orderId}?t=${validToken(orderA.orderId)}`)
    const ok = page.getByTestId('order-status-ok')
    await expect(ok).toBeVisible()
    await expect(page.getByTestId('order-status-label')).toHaveText('Czeka na płatność')
    expect(await page.content()).toContain(orderA.orderId.slice(0, 8).toUpperCase())
    expectNoPii(await page.content())

    await ok.scrollIntoViewIfNeeded()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: join(SHOTS, 'ha-2.19-valid-token.png') })
  })

  test('expired token: expiry message, no order data', async ({ page }) => {
    await dismissCookies(page)   // banner would cover the content in the screenshots
    await page.goto(`/sklep/status/${orderA.orderId}?t=${signToken(orderA.orderId, nowSec() - 60)}`)
    const notice = page.getByTestId('order-status-expired')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('Link wygasł')
    expect(await page.content()).not.toContain(orderA.orderId.slice(0, 8).toUpperCase())
    await expect(page.getByTestId('order-status-ok')).toHaveCount(0)

    await notice.scrollIntoViewIfNeeded()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: join(SHOTS, 'ha-2.19-expired-token.png') })
  })

  test('forged and cross-order tokens: neutral refusal, no order data', async ({ page }) => {
    await dismissCookies(page)   // banner would cover the content in the screenshots
    const good = validToken(orderA.orderId)
    const forged = good.slice(0, -1) + (good.endsWith('0') ? '1' : '0')
    for (const t of [forged, validToken(orderB.orderId)]) {
      await page.goto(`/sklep/status/${orderA.orderId}?t=${t}`)
      await expect(page.getByTestId('order-status-refused')).toBeVisible()
      await expect(page.getByTestId('order-status-ok')).toHaveCount(0)
      expect(await page.content()).not.toContain(orderA.orderId.slice(0, 8).toUpperCase())
    }
    await page.waitForTimeout(2000)
    await page.screenshot({ path: join(SHOTS, 'ha-2.19-forged-token.png') })
  })
})

test.describe('e-mails carry a verifying link', () => {
  test('order_received: absolute link, ~30 days, token verifies for that order only', async ({ request }) => {
    const link = extractStatusLink(readMockEmail(orderA.orderId, 'order_received'))
    expect(link).not.toBeNull()
    expect(link!.origin).toBe(`http://localhost:${process.env.HYDRA_TEST_PORT ?? '3001'}`)
    expect(link!.pathname).toBe(`/sklep/status/${orderA.orderId}`)

    const token = link!.searchParams.get('t')!
    const exp = Number(token.split('.')[0])
    expect(Math.abs(exp - (nowSec() + 30 * DAY))).toBeLessThan(10 * 60)

    const res = await status(request, orderA.orderId, token)
    expect(res.status()).toBe(200)
    expect((await res.json()).order.id).toBe(orderA.orderId)
    // Same token, other order → refused.
    expect((await status(request, orderB.orderId, token)).status()).toBe(404)
  })

  test('payment_received: link present and verifies', async ({ request }) => {
    const attempts = await (await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/order_payments?order_id=eq.${orderB.orderId}&select=p24_session_id`,
      { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}` } },
    )).json() as Array<{ p24_session_id: string }>
    expect(attempts.length).toBeGreaterThan(0)

    const pay = await request.post('/api/shop/payments/p24/mock-pay', {
      data: { orderId: orderB.orderId, p24SessionId: attempts[0].p24_session_id },
    })
    expect(pay.status()).toBe(200)

    const link = extractStatusLink(readMockEmail(orderB.orderId, 'payment_received'))
    expect(link).not.toBeNull()
    const res = await status(request, orderB.orderId, link!.searchParams.get('t')!)
    expect(res.status()).toBe(200)
    expect((await res.json()).order.status).toBe('paid')
  })
})
