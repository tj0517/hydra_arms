/**
 * HA-2.08 — default config (SHOP_MODE unset, P24 mock):
 *  - checkout refuses an order that did not accept Regulamin + Polityka prywatności (server-side)
 *  - the test-mode banner is absent
 *  - the P24 marks slot is in the footer
 *  - the checkout UI carries the checkbox with both links and keeps the button disabled without it
 */
import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import { dismissCookies, hideBanner } from '../fixtures'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const serviceHeaders = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }

let ip = 1
const uniqueIp = () => ({ 'x-forwarded-for': `10.2.0.${(ip++ % 250) + 1}` })

async function standardProductId(request: import('@playwright/test').APIRequestContext): Promise<number> {
  const res = await request.get('/api/shop/products?in_stock=true')
  const body = await res.json()
  const p = (body.products as Array<{ id: number; product_type: string }>).find(x => x.product_type === 'standard')
  if (!p) throw new Error('No in-stock standard product in seed')
  return p.id
}

async function ordersWithSession(key: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?session_id=eq.${key}&select=id`, { headers: serviceHeaders })
  return ((await res.json()) as unknown[]).length
}

function body(productId: number, key: string, extra: Record<string, unknown> = {}) {
  return {
    items: [{ product_id: productId, quantity: 1 }],
    shipping: {
      firstName: 'Test', lastName: 'Tester', email: 'test@example.com', phone: '123456789',
      street: 'Testowa 1', city: 'Kraków', zip: '30-001',
    },
    idempotency_key: key,
    fulfillment_route: 'own',
    shipping_method: 'dhl',
    ...extra,
  }
}

test.describe('checkout — terms acceptance is enforced by the server', () => {
  test('RED PROOF: no flag → 400 and no order row', async ({ request }) => {
    const key = crypto.randomUUID()
    const res = await request.post('/api/shop/checkout', { data: body(await standardProductId(request), key), headers: uniqueIp() })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toMatch(/regulamin/i)
    expect(await ordersWithSession(key)).toBe(0)
  })

  for (const bad of [false, 'true', 1, null]) {
    test(`flag ${JSON.stringify(bad)} (not boolean true) → 400 and no order row`, async ({ request }) => {
      const key = crypto.randomUUID()
      const res = await request.post('/api/shop/checkout', {
        data: body(await standardProductId(request), key, { terms_accepted: bad }),
        headers: uniqueIp(),
      })
      expect(res.status()).toBe(400)
      expect(await ordersWithSession(key)).toBe(0)
    })
  }

  test('flag true → order created', async ({ request }) => {
    const key = crypto.randomUUID()
    const res = await request.post('/api/shop/checkout', {
      data: body(await standardProductId(request), key, { terms_accepted: true }),
      headers: uniqueIp(),
    })
    expect(res.status()).toBe(200)
    expect(await ordersWithSession(key)).toBe(1)
  })
})

test.describe('SHOP_MODE unset', () => {
  test('banner is absent', async ({ page }) => {
    await dismissCookies(page)
    await page.goto('/sklep', { waitUntil: 'domcontentloaded' })
    await hideBanner(page)
    await expect(page.getByTestId('test-mode-banner')).toHaveCount(0)
    expect(await page.content()).not.toMatch(/Tryb testowy/i)
  })

  test('footer has the P24 marks slot on every public page', async ({ page }) => {
    await dismissCookies(page)
    for (const path of ['/', '/sklep', '/regulamin', '/kontakt']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('p24-payment-marks')).toHaveCount(1)
    }
  })
})

test.describe('checkout UI — terms checkbox', () => {
  test('links to regulamin and polityka-prywatnosci; button disabled until ticked', async ({ page, request }) => {
    const id = await standardProductId(request)
    await dismissCookies(page)
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('ha208-cart-reset')) {
        localStorage.removeItem('hydra-cart')
        sessionStorage.setItem('ha208-cart-reset', '1')
      }
    })
    await page.goto(`/sklep/${id}`, { waitUntil: 'domcontentloaded' })
    await hideBanner(page)
    const add = page.getByRole('button', { name: /DODAJ DO KOSZYKA/i }).first()
    await expect(add).toBeEnabled({ timeout: 10_000 })
    await add.click()
    await expect(page.getByText(/DODANO DO KOSZYKA/i).first()).toBeVisible({ timeout: 6_000 })
    await page.goto('/sklep/zamowienie', { waitUntil: 'domcontentloaded' })
    await hideBanner(page)

    const terms = page.getByTestId('terms-acceptance')
    await expect(terms.getByRole('link', { name: /Regulamin/ })).toHaveAttribute('href', '/regulamin')
    await expect(terms.getByRole('link', { name: /Polityk/ })).toHaveAttribute('href', '/polityka-prywatnosci')
    await expect(page.getByTestId('place-order')).toBeDisabled()
    await terms.getByRole('checkbox').check()
    await expect(page.getByTestId('place-order')).toBeEnabled()
  })
})

test.describe('/kontakt — phone number (Regulamin § 1.2 points here)', () => {
  test('shows the same number as the footer, as a tel: link', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await dismissCookies(page)
    await page.goto('/kontakt', { waitUntil: 'domcontentloaded' })
    await hideBanner(page)

    const phone = page.getByTestId('kontakt-phone')
    await expect(phone).toBeVisible()
    const text = (await phone.textContent())?.replace(/^\s*Tel:\s*/, '').trim() ?? ''
    expect(text).toMatch(/^\+?[\d ]{9,}$/)
    await expect(phone).toHaveAttribute('href', `tel:${text.replace(/\s/g, '')}`)

    // Same value as the footer link on the same page.
    const footerPhone = page.locator('footer a[href^="tel:"]')
    await expect(footerPhone).toHaveText(`Tel: ${text}`)

    fs.mkdirSync('.playwright-mcp', { recursive: true })
    await phone.scrollIntoViewIfNeeded()
    await page.waitForTimeout(2_000) // GSAP scroll-triggered animations
    await page.screenshot({ path: '.playwright-mcp/ha-2.08-8-kontakt-phone.png' })
  })
})
