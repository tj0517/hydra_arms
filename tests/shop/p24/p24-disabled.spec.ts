/**
 * Fail-closed integration tests — run with npm run test:p24:disabled.
 *
 * The webServer in playwright.p24-disabled.config.ts starts WITHOUT P24_MODE
 * and with P24_CRC_KEY=''. These tests confirm:
 *   - Mock payment surfaces (mock-pay endpoint, mock page) return 404.
 *   - notify endpoint returns 5xx when P24_CRC_KEY is empty.
 *
 * If any test here fails, a gap in the fail-closed guards exists.
 * Do NOT loosen the status assertions; fix the implementation.
 */
import { test, expect } from '@playwright/test'

// ── P24_MODE unset: mock surfaces must return 404 ────────────────────────────

test.describe('mock endpoints unavailable when P24_MODE not set', () => {
  test('mock-pay → 404 from mode guard (not DB lookup) when P24_MODE unset', async ({ request }) => {
    // With fail-open (old behavior): getP24Mode() returns 'mock' for unset → mode check passes →
    //   proceeds to DB lookup → attempt not found → 404 with { error: 'Payment attempt not found' }
    // With fail-closed (fixed): getP24Mode() returns 'disabled' → mode check fires FIRST →
    //   404 with { error: 'Not found' } — no DB touched
    const res = await request.post('/api/shop/payments/p24/mock-pay', {
      data: { orderId: '00000000-0000-0000-0000-000000000001', p24SessionId: '00000000-0000-0000-0000-000000000002' },
    })
    expect(res.status()).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
  })

  test('mock payment page → 404 when P24_MODE unset', async ({ page }) => {
    const response = await page.goto(
      '/sklep/platnosc/mock/00000000-0000-0000-0000-000000000001?sid=00000000-0000-0000-0000-000000000002',
      { waitUntil: 'commit' },
    )
    expect(response?.status()).toBe(404)
  })
})

// ── P24_CRC_KEY empty: notify must reject with 5xx ───────────────────────────

test.describe('notify fails closed when P24_CRC_KEY empty', () => {
  test('notify with empty CRC key → 500 (crcKey throws before touching data)', async ({ request }) => {
    // With P24_CRC_KEY='', verifyNotifySign calls signNotification → assertCrcKeySet() → throws.
    // Next.js catches the unhandled error and returns 500.
    // The order_payments table is not modified (throw happens before any DB write).
    const res = await request.post('/api/shop/payments/p24/notify', {
      data: {
        merchantId: 999999,
        posId: 999999,
        sessionId: '00000000-0000-0000-0000-000000000003',
        amount: 1000,
        originAmount: 1000,
        currency: 'PLN',
        orderId: 123456789,
        methodId: 25,
        statement: 'test',
        sign: 'deadbeef',
      },
    })
    expect(res.status()).toBe(500)
  })
})
