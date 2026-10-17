/**
 * HA-2.08 — verification mode (SHOP_MODE=verification, P24_MODE=mock).
 * Config: playwright.verification.config.ts · run: npm run test:verification
 *
 *  - banner "TRYB TESTOWY" on every public page
 *  - full path: listing → product → cart → checkout (terms ticked) → mock payment → confirmation,
 *    one viewport screenshot per step in .playwright-mcp/ha-2.08-*.png
 *  - RED PROOF: an order paid in verification mode never reaches BaseLinker
 *    (BL mock counter stays 0, baselinker_order_id stays null, also after the orphan-retry sync)
 */
import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import * as fs from 'fs'
import { dismissCookies, hideBanner } from '../fixtures'

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
const uniqueIp = () => ({ 'x-forwarded-for': `10.3.0.${(ip++ % 250) + 1}` })

async function standardProductId(request: APIRequestContext): Promise<number> {
  const res = await request.get('/api/shop/products?in_stock=true')
  const body = await res.json()
  const p = (body.products as Array<{ id: number; product_type: string }>).find(x => x.product_type === 'standard')
  if (!p) throw new Error('No in-stock standard product in seed')
  return p.id
}

/** goto with retry: a navigation can be aborted by the previous page's own client-side routing. */
async function gotoStable(page: Page, url: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      return
    } catch (err) {
      if (attempt === 3) throw err
      console.log(`[flow] goto ${url} attempt ${attempt} failed: ${(err as Error).message.split('\n')[0]}`)
    }
  }
}

async function shot(page: Page, name: string, scrollTo?: ReturnType<Page['locator']>) {
  fs.mkdirSync('.playwright-mcp', { recursive: true })
  if (scrollTo) await scrollTo.scrollIntoViewIfNeeded()
  await page.waitForTimeout(2_000) // GSAP scroll-triggered animations
  await page.screenshot({ path: `.playwright-mcp/ha-2.08-${name}.png` })
}

test.describe('verification mode — banner', () => {
  for (const path of ['/', '/sklep', '/regulamin', '/polityka-prywatnosci', '/kontakt', '/sklep/zamowienie']) {
    test(`banner visible on ${path}`, async ({ page }) => {
      await dismissCookies(page)
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await hideBanner(page)
      const banner = page.getByTestId('test-mode-banner')
      await expect(banner).toBeVisible()
      await expect(banner).toContainText(/tryb testowy/i)
      await expect(banner).toContainText(/płatności nie są prawdziwe/i)
    })
  }
})

test.describe('verification mode — footer P24 marks slot', () => {
  test('placeholder is visible in the footer (no real asset yet); screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await dismissCookies(page)
    await gotoStable(page, '/')
    await hideBanner(page)
    const slot = page.getByTestId('p24-payment-marks')
    await expect(slot).toHaveCount(1)
    await shot(page, '9-verification-footer', slot)
    await expect(slot).toBeVisible()
    await expect(slot).toContainText(/metody płatności/i)
  })
})

test.describe('verification mode — full path on the P24 mock', () => {
  test('listing → product → cart → checkout → mock payment → confirmation', async ({ page, request }) => {
    // 7 screenshots x 2 s GSAP wait + cold dev-server compiles of each route
    test.setTimeout(300_000)
    const id = await standardProductId(request)
    await page.setViewportSize({ width: 1280, height: 900 })
    await dismissCookies(page)
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('ha208-cart-reset')) {
        localStorage.removeItem('hydra-cart')
        sessionStorage.setItem('ha208-cart-reset', '1')
      }
    })

    // 1 listing
    await page.goto('/sklep', { waitUntil: 'domcontentloaded' })
    await hideBanner(page)
    await page.waitForSelector('a[href^="/sklep/"]', { timeout: 60_000 })
    await expect(page.getByTestId('test-mode-banner')).toBeVisible()
    await shot(page, '1-listing', page.locator('a[href^="/sklep/"]').first())

    // 2 product
    await gotoStable(page, `/sklep/${id}`)
    await hideBanner(page)
    const add = page.getByRole('button', { name: /DODAJ DO KOSZYKA/i }).first()
    await expect(add).toBeEnabled({ timeout: 10_000 })
    await shot(page, '2-product', add)

    // 3 cart (drawer)
    await add.click()
    // The drawer opens by itself after adding; the "DODANO" label flips back within ~2 s, so don't assert on it.
    const toCheckout = page.getByRole('button', { name: /PRZEJDŹ DO KASY/i })
    await expect(toCheckout).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('test-mode-banner')).toBeVisible()
    await shot(page, '3-cart', toCheckout)

    // 4 checkout, terms not yet ticked → button disabled
    await toCheckout.click()
    await page.waitForURL(/\/sklep\/zamowienie\/?$/)
    await hideBanner(page)
    const form = page.locator('#checkout-form')
    await form.getByLabel(/Imię/).fill('Test')
    await form.getByLabel(/Nazwisko/).fill('Weryfikacja')
    await form.getByLabel(/Email/).fill('weryfikacja@example.com')
    await form.getByLabel(/Telefon/).fill('123456789')
    await form.getByLabel(/Ulica/).fill('Testowa 1')
    await form.getByLabel(/Miasto/).fill('Kraków')
    await form.getByLabel(/Kod pocztowy/).fill('30-001')
    const terms = page.getByTestId('terms-acceptance')
    await expect(page.getByTestId('place-order')).toBeDisabled()
    await shot(page, '4-checkout-terms-unticked', terms)

    // 5 checkout, terms ticked → button enabled
    await terms.getByRole('checkbox').check()
    await expect(page.getByTestId('place-order')).toBeEnabled()
    await shot(page, '5-checkout-terms-ticked', terms)

    // 6 mock payment page
    const checkoutResponse = page.waitForResponse(r => r.url().includes('/api/shop/checkout'), { timeout: 30_000 })
    await page.getByTestId('place-order').click()
    const checkoutRes = await checkoutResponse
    expect(checkoutRes.status(), await checkoutRes.text()).toBe(200)
    await page.waitForURL(/\/sklep\/platnosc\/mock\//, { timeout: 30_000 })
    await hideBanner(page)
    const pay = page.getByRole('button', { name: /ZAPŁAĆ \(SYMULACJA\)/ })
    await expect(pay).toBeVisible()
    await expect(page.getByTestId('test-mode-banner')).toBeVisible()
    await shot(page, '6-mock-payment', pay)

    // 7 confirmation
    await pay.click()
    await page.waitForURL(/\/sklep\/zamowienie\/[0-9a-f-]{36}/, { timeout: 30_000 })
    await hideBanner(page)
    await expect(page.getByText('Opłacone')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('test-mode-banner')).toBeVisible()
    await shot(page, '7-confirmation', page.getByText('Opłacone'))
  })
})

test.describe('verification mode — BaseLinker is never called', () => {
  test('RED PROOF: paid order → BL counter 0, no baselinker_order_id, also after orphan-retry sync', async ({ request }) => {
    const key = crypto.randomUUID()
    const checkout = await request.post('/api/shop/checkout', {
      data: {
        items: [{ product_id: await standardProductId(request), quantity: 1 }],
        terms_accepted: true,
        shipping: {
          firstName: 'Test', lastName: 'Weryfikacja', email: 'weryfikacja@example.com', phone: '123456789',
          street: 'Testowa 1', city: 'Kraków', zip: '30-001',
        },
        idempotency_key: key,
        fulfillment_route: 'own',
        shipping_method: 'dhl',
      },
      headers: uniqueIp(),
    })
    expect(checkout.status()).toBe(200)
    const { order_id: orderId, payment_url: paymentUrl } = await checkout.json()
    const sid = new URL(paymentUrl).searchParams.get('sid')
    expect(sid).toBeTruthy()

    const pay = await request.post('/api/shop/payments/p24/mock-pay', { data: { orderId, p24SessionId: sid } })
    expect(pay.ok()).toBe(true)

    const row = async () => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=status,baselinker_order_id,is_test`, { headers: serviceHeaders })
      return ((await r.json()) as Array<{ status: string; baselinker_order_id: number | null; is_test: boolean }>)[0]
    }
    const counter = async () => (await (await request.get(`/api/shop/dev/bl-mock-counter?orderId=${orderId}`)).json()).count as number

    expect((await row()).status).toBe('paid')
    // Marked as a test order by the checkout route (migration 017).
    expect((await row()).is_test).toBe(true)
    expect(await counter()).toBe(0)
    expect((await row()).baselinker_order_id).toBeNull()

    // The orphan retry (paid + no BL id) must not push it either.
    const sync = await request.post('/api/shop/orders/sync', { headers: { 'x-sync-secret': SYNC_SECRET } })
    expect(sync.ok()).toBe(true)
    expect((await row()).baselinker_order_id).toBeNull()
    expect(await counter()).toBe(0)
  })
})
