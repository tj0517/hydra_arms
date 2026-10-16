/**
 * Compliance — personal pickup enforcement (HA-2.06)
 *
 * A product that needs a licence, registration or is 18+ — and any product in
 * Hydra section 01/02, even without a flag — is sold by personal pickup only.
 * A pickup order needs an explicit `pickup_confirmed: true`, stored on the order.
 *
 * Enforced in the route (checked first, clear error) and again in the
 * checkout_create_order RPC (defence in depth).
 *
 * Requires: local Supabase stack with seed (section-01 root 12001 + product 312001).
 * Run: npm run test:shop -- tests/shop/pickup-compliance.spec.ts
 */
import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import { dismissCookies, hideBanner } from './fixtures'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const serviceHeaders = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

// Seed rows (supabase/seed.sql)
const SECTION_01_PRODUCT = 312001 // standard, no flags, category chain → root "01. BROŃ PALNA"
const CLEAN_PRODUCT = 301001      // standard, no flags, category "Spodnie" (non-NN root)
const PICKUP_ONLY_SEEDED = 302001 // product_type pickup_only (UI walk-through)

// Throw-away rows created by this file and removed in afterAll
const T_LICENSE = 399001     // standard + requires_license
const T_ADULT = 399002       // standard + age_min 18, no licence flag
const T_SECTION_02 = 399003  // standard, no flags, under root "02. AMUNICJA"
const T_ROOT_02 = 399101
const T_CHILD_02 = 399102

const SHIPPING = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phone: '123456789',
  street: 'Testowa 1',
  city: 'Kraków',
  zip: '30-001',
}

test.describe.configure({ mode: 'serial' })

let _ip = 1
/** Unique X-Forwarded-For per call (checkout is rate-limited to 5 req / 60 s per IP). */
function ip() {
  return { 'x-forwarded-for': `10.6.0.${(_ip++ % 250) + 1}` }
}

async function rest(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = init
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...rest,
    headers: { ...serviceHeaders, ...(rest.headers as Record<string, string> | undefined) },
    body: json === undefined ? rest.body : JSON.stringify(json),
  })
}

async function ordersForKey(key: string): Promise<{ id: string; fulfillment_route: string; pickup_confirmed_at: string | null }[]> {
  const res = await rest(`orders?session_id=eq.${key}&select=id,fulfillment_route,pickup_confirmed_at`)
  expect(res.status).toBe(200)
  return res.json()
}

function body(productId: number, route: 'own' | 'sourced' | 'pickup', extra: Record<string, unknown> = {}) {
  return {
    items: [{ product_id: productId, quantity: 1 }],
    terms_accepted: true,
    shipping: SHIPPING,
    idempotency_key: crypto.randomUUID(),
    fulfillment_route: route,
    ...extra,
  }
}

const baseProduct = {
  inventory_id: 35743,
  price: 50,
  tax_rate: 23,
  stock: 5,
  category_id: 1002,
  product_type: 'standard',
  is_active: true,
  source_warehouse: 'own',
  age_min: 0,
  requires_license: false,
  delivery_allowed: true,
  brand: 'Test',
}

/** Remove the throw-away rows (and any order that references them). Idempotent. */
async function cleanup() {
  const ids = `${T_LICENSE},${T_ADULT},${T_SECTION_02}`
  const items: { order_id: string }[] = await (await rest(`order_items?product_id=in.(${ids})&select=order_id`)).json()
  const orderIds = [...new Set(items.map(i => i.order_id))]
  if (orderIds.length) {
    await rest(`order_items?order_id=in.(${orderIds.join(',')})`, { method: 'DELETE' })
    await rest(`orders?id=in.(${orderIds.join(',')})`, { method: 'DELETE' })
  }
  await rest(`shop_products?id=in.(${ids})`, { method: 'DELETE' })
  await rest(`shop_categories?id=eq.${T_CHILD_02}`, { method: 'DELETE' })
  await rest(`shop_categories?id=eq.${T_ROOT_02}`, { method: 'DELETE' })
}

test.beforeAll(async () => {
  await cleanup() // leftovers of an aborted earlier run
  const cats = await rest('shop_categories', {
    method: 'POST',
    json: [
      { id: T_ROOT_02, name: '02. AMUNICJA I ELEMENTY RECHARGINGU', parent_id: null, inventory_id: 35743 },
      { id: T_CHILD_02, name: '2.1 Amunicja Pistoletowa i Rewolwerowa', parent_id: T_ROOT_02, inventory_id: 35743 },
    ],
  })
  expect(cats.status).toBe(201)
  const prods = await rest('shop_products', {
    method: 'POST',
    json: [
      { ...baseProduct, id: T_LICENSE, sku: 'HA206-LIC', ean: '5909990000011', name: 'HA-2.06 test — licence flag', requires_license: true },
      { ...baseProduct, id: T_ADULT, sku: 'HA206-18', ean: '5909990000028', name: 'HA-2.06 test — 18+ flag', age_min: 18 },
      { ...baseProduct, id: T_SECTION_02, sku: 'HA206-02', ean: '5909990000035', name: 'HA-2.06 test — section 02', category_id: T_CHILD_02 },
    ],
  })
  expect(prods.status).toBe(201)
})

test.afterAll(async () => {
  await cleanup()
})

test.describe('courier is refused for restricted products — no order row', () => {
  test('RED: requires_license + product_type standard → 400', async ({ request }) => {
    const b = body(T_LICENSE, 'own')
    const res = await request.post('/api/shop/checkout', { data: b, headers: ip() })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toMatch(/odbioru osobistego/)
    expect(await ordersForKey(b.idempotency_key)).toHaveLength(0)
  })

  test('RED: 18+ without licence flag → 400', async ({ request }) => {
    const b = body(T_ADULT, 'own')
    const res = await request.post('/api/shop/checkout', { data: b, headers: ip() })
    expect(res.status()).toBe(400)
    expect(await ordersForKey(b.idempotency_key)).toHaveLength(0)
  })

  test('RED: section 01 product without any flag → 400', async ({ request }) => {
    const b = body(SECTION_01_PRODUCT, 'own')
    const res = await request.post('/api/shop/checkout', { data: b, headers: ip() })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toMatch(/odbioru osobistego/)
    expect(await ordersForKey(b.idempotency_key)).toHaveLength(0)
  })

  test('RED: section 02 product without any flag → 400', async ({ request }) => {
    const b = body(T_SECTION_02, 'sourced')
    const res = await request.post('/api/shop/checkout', { data: b, headers: ip() })
    expect(res.status()).toBe(400)
    expect(await ordersForKey(b.idempotency_key)).toHaveLength(0)
  })

  test('product without licence, registration or 18+ goes through with courier', async ({ request }) => {
    const b = body(CLEAN_PRODUCT, 'own')
    const res = await request.post('/api/shop/checkout', { data: b, headers: ip() })
    expect(res.status()).toBe(200)
    const [order] = await ordersForKey(b.idempotency_key)
    expect(order.fulfillment_route).toBe('own')
    expect(order.pickup_confirmed_at).toBeNull()
  })
})

test.describe('pickup needs an explicit confirmation, stored on the order', () => {
  test('RED: pickup without confirmation → 400, no order', async ({ request }) => {
    const b = body(SECTION_01_PRODUCT, 'pickup')
    const res = await request.post('/api/shop/checkout', { data: b, headers: ip() })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toMatch(/Potwierdź/)
    expect(await ordersForKey(b.idempotency_key)).toHaveLength(0)
  })

  test('RED: pickup_confirmed false / "true" string / 1 → refused (explicit boolean only)', async ({ request }) => {
    for (const bad of [false, 'true', 1]) {
      const b = body(SECTION_01_PRODUCT, 'pickup', { pickup_confirmed: bad })
      const res = await request.post('/api/shop/checkout', { data: b, headers: ip() })
      expect(res.status(), `pickup_confirmed=${JSON.stringify(bad)}`).toBe(400)
      expect(await ordersForKey(b.idempotency_key)).toHaveLength(0)
    }
  })

  test('pickup with confirmation → order created and confirmation stored', async ({ request }) => {
    const b = body(SECTION_01_PRODUCT, 'pickup', { pickup_confirmed: true })
    const res = await request.post('/api/shop/checkout', { data: b, headers: ip() })
    expect(res.status()).toBe(200)
    const [order] = await ordersForKey(b.idempotency_key)
    expect(order.fulfillment_route).toBe('pickup')
    expect(order.pickup_confirmed_at).not.toBeNull()
  })

  test('courier order never stores a confirmation, even if the client sends one', async ({ request }) => {
    const b = body(CLEAN_PRODUCT, 'own', { pickup_confirmed: true })
    const res = await request.post('/api/shop/checkout', { data: b, headers: ip() })
    expect(res.status()).toBe(200)
    const [order] = await ordersForKey(b.idempotency_key)
    expect(order.pickup_confirmed_at).toBeNull()
  })
})

test.describe('checkout_create_order refuses on its own (service role, no route in front)', () => {
  async function rpc(args: Record<string, unknown>) {
    return rest('rpc/checkout_create_order', {
      method: 'POST',
      json: {
        p_session_id: crypto.randomUUID(),
        p_user_id: null,
        p_shipping: SHIPPING,
        p_items: [{ product_id: T_LICENSE, quantity: 1 }],
        ...args,
      },
    })
  }

  test('RED: courier route for a flagged product → PICKUP_ONLY exception', async () => {
    const sessionId = crypto.randomUUID()
    const res = await rpc({ p_session_id: sessionId, p_fulfillment_route: 'own' })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(JSON.stringify(await res.json())).toContain(`PICKUP_ONLY:${T_LICENSE}`)
    expect(await ordersForKey(sessionId)).toHaveLength(0)
  })

  test('RED: courier route for a section-01 product without flags → PICKUP_ONLY exception', async () => {
    const sessionId = crypto.randomUUID()
    const res = await rpc({
      p_session_id: sessionId,
      p_fulfillment_route: 'sourced',
      p_items: [{ product_id: SECTION_01_PRODUCT, quantity: 1 }],
    })
    expect(JSON.stringify(await res.json())).toContain(`PICKUP_ONLY:${SECTION_01_PRODUCT}`)
    expect(await ordersForKey(sessionId)).toHaveLength(0)
  })

  test('RED: pickup route without confirmation → PICKUP_CONFIRMATION_REQUIRED', async () => {
    const sessionId = crypto.randomUUID()
    const res = await rpc({ p_session_id: sessionId, p_fulfillment_route: 'pickup' })
    expect(JSON.stringify(await res.json())).toContain('PICKUP_CONFIRMATION_REQUIRED')
    expect(await ordersForKey(sessionId)).toHaveLength(0)
  })

  test('pickup route with confirmation → order created with pickup_confirmed_at', async () => {
    const sessionId = crypto.randomUUID()
    const res = await rpc({
      p_session_id: sessionId,
      p_fulfillment_route: 'pickup',
      p_pickup_confirmed: true,
      p_items: [{ product_id: SECTION_01_PRODUCT, quantity: 1 }],
    })
    expect(res.status).toBe(200)
    const [order] = await ordersForKey(sessionId)
    expect(order.pickup_confirmed_at).not.toBeNull()
  })

  test('the old 5-argument signature is gone and the new ones are service_role only', async () => {
    const priv = async (role: string, sig: string) => {
      const res = await rest('rpc/test_fn_privilege', { method: 'POST', json: { role_name: role, func_sig: sig } })
      expect(res.status).toBe(200)
      return (await res.json()) as boolean
    }
    const rpcSig = 'public.checkout_create_order(text,uuid,jsonb,text,jsonb,boolean)'
    for (const role of ['anon', 'authenticated']) {
      expect(await priv(role, rpcSig), `${role} on checkout_create_order`).toBe(false)
      expect(await priv(role, 'public.hydra_section(bigint)'), `${role} on hydra_section`).toBe(false)
    }
    expect(await priv('service_role', rpcSig)).toBe(true)
    // old signature no longer resolves
    const gone = await rest('rpc/test_fn_privilege', {
      method: 'POST',
      json: { role_name: 'service_role', func_sig: 'public.checkout_create_order(text,uuid,jsonb,text,jsonb)' },
    })
    expect(gone.status).toBeGreaterThanOrEqual(400)
  })
})

test.describe('hydra_section()', () => {
  async function section(id: number | null) {
    const res = await rest('rpc/hydra_section', { method: 'POST', json: { p_category_id: id } })
    expect(res.status).toBe(200)
    return (await res.json()) as string | null
  }

  test('resolves the root "NN." prefix; null for non-NN root, unknown and missing category', async () => {
    expect(await section(12002)).toBe('01') // child of "01. BROŃ PALNA"
    expect(await section(12001)).toBe('01') // the root itself
    expect(await section(T_CHILD_02)).toBe('02')
    expect(await section(1002)).toBeNull()  // "Spodnie" under non-NN root
    expect(await section(999999999)).toBeNull()
    expect(await section(null)).toBeNull()
  })
})

test.describe('checkout UI — pickup confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookies(page)
    // Start from an empty cart, but only once per tab: the init script runs on every
    // navigation, and the cart must survive the move from the product page to checkout.
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('ha206-cart-reset')) {
        localStorage.removeItem('hydra-cart')
        sessionStorage.setItem('ha206-cart-reset', '1')
      }
    })
  })

  test('unchecked → error and no request; checked → order placed', async ({ page }) => {
    fs.mkdirSync('.playwright-mcp', { recursive: true })

    await page.goto(`/sklep/${PICKUP_ONLY_SEEDED}`, { waitUntil: 'domcontentloaded' })
    await hideBanner(page)
    await page.waitForTimeout(500)
    const addBtn = page.getByRole('button', { name: /DODAJ DO KOSZYKA/i }).first()
    await expect(addBtn).toBeEnabled({ timeout: 10_000 })
    await addBtn.click()
    await expect(page.getByText(/DODANO DO KOSZYKA/i).first()).toBeVisible({ timeout: 6_000 })

    await page.goto('/sklep/zamowienie', { waitUntil: 'domcontentloaded' })
    await hideBanner(page)
    // Scoped to the form: the footer has an aria-label="Email" link as well.
    const form = page.locator('#checkout-form')
    await form.getByLabel(/Imię/).fill('Test')
    await form.getByLabel(/Nazwisko/).fill('User')
    await form.getByLabel(/Email/).fill('test@example.com')

    const confirmation = page.getByTestId('pickup-confirmation')
    await expect(confirmation).toBeVisible({ timeout: 10_000 })
    await confirmation.scrollIntoViewIfNeeded()

    // HA-2.08: Regulamin/Polityka acceptance is required in every mode — tick it so this
    // test keeps exercising the pickup confirmation only.
    await page.getByTestId('terms-acceptance').getByRole('checkbox').check()

    // unchecked → client-side error, nothing sent
    let checkoutCalls = 0
    page.on('request', r => { if (r.url().includes('/api/shop/checkout')) checkoutCalls++ })
    await page.getByRole('button', { name: /ZŁÓŻ ZAMÓWIENIE/i }).click()
    await expect(page.getByTestId('pickup-confirmation-error')).toBeVisible()
    await page.waitForTimeout(2_000)
    await page.screenshot({ path: '.playwright-mcp/ha-2.06-pickup-unchecked-error.png' })
    expect(checkoutCalls).toBe(0)

    // checked → error clears, order is placed
    await confirmation.getByRole('checkbox').check()
    await expect(page.getByTestId('pickup-confirmation-error')).toHaveCount(0)
    await confirmation.scrollIntoViewIfNeeded()
    await page.waitForTimeout(2_000)
    await page.screenshot({ path: '.playwright-mcp/ha-2.06-pickup-checked.png' })

    await page.getByRole('button', { name: /ZŁÓŻ ZAMÓWIENIE/i }).click()
    await expect(page).not.toHaveURL(/\/sklep\/zamowienie\/?$/, { timeout: 30_000 })
    expect(checkoutCalls).toBe(1)
    await page.waitForTimeout(2_000)
    await page.screenshot({ path: '.playwright-mcp/ha-2.06-pickup-success.png' })
  })
})
