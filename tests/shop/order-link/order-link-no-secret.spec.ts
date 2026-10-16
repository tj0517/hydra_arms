/**
 * ORDER_LINK_SECRET unset — fail-closed (HA-2.19, tj decision 2026-10-16)
 *
 * With no secret: order e-mails go out WITHOUT the status link (sending never
 * throws), and the status page/API refuse every token — even one signed with
 * some other key.
 *
 * Requires: local Supabase stack, separate Next.js server on port 3006 with
 *           ORDER_LINK_SECRET='' (playwright.order-link-no-secret.config.ts)
 * Run: npm run test:order-link:no-secret
 */
import { test, expect } from '@playwright/test'
import { createHmac } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ request }) => {
  expect(process.env.ORDER_LINK_SECRET ?? '').toBe('')
  for (let i = 0; i < 15; i++) {
    try {
      const res = await request.get('/api/shop/products?in_stock=true')
      if (res.ok()) {
        const body = await res.json()
        if ((body?.products ?? []).some((p: { product_type: string }) => p.product_type === 'standard')) return
      }
    } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Stack not ready after 30 s')
})

test('no secret: e-mail is sent without a status link; page and API refuse any token', async ({ request, page }) => {
  const { products } = await (await request.get('/api/shop/products?in_stock=true')).json()
  const product = (products as Array<{ id: number; product_type: string }>).find(p => p.product_type === 'standard')
  if (!product) throw new Error('No standard product in seed')

  const res = await request.post('/api/shop/checkout', {
    data: {
      items: [{ product_id: product.id, quantity: 1 }],
      shipping: {
        firstName: 'Test', lastName: 'Tester', email: 'test@example.com', phone: '123456789',
        street: 'Testowa 1', city: 'Kraków', zip: '30-001',
      },
      idempotency_key: crypto.randomUUID(),
      fulfillment_route: 'own',
    },
    headers: { 'x-forwarded-for': '10.6.0.1' },
  })
  expect(res.status()).toBe(200)
  const { order_id: orderId } = await res.json()

  // Mail was sent (checkout did not break) but carries no status link; SHOP_BASE_URL is set.
  const file = join(process.cwd(), 'test-results', 'mock-emails', `${orderId}-order_received.html`)
  expect(existsSync(file)).toBe(true)
  const html = readFileSync(file, 'utf8')
  expect(html).toContain('Czeka na płatność')
  expect(html).not.toContain('/sklep/status/')

  // A token signed with any key is refused: there is no server-side secret to match.
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  const sig = createHmac('sha256', 'some-other-key').update(`order-status:v1:${orderId}:${exp}`).digest('hex')
  const token = `${exp}.${sig}`
  const api = await request.get(`/api/shop/order-status/${orderId}?t=${token}`)
  expect(api.status()).toBe(404)
  expect(await api.json()).toEqual({ error: 'not_found' })

  await page.goto(`/sklep/status/${orderId}?t=${token}`)
  await expect(page.getByTestId('order-status-refused')).toBeVisible()
  await expect(page.getByTestId('order-status-ok')).toHaveCount(0)
})
