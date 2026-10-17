/**
 * Delivery methods and costs in checkout (HA-2.02)
 *
 * The customer sends a method id (and, for InPost Paczkomat, a locker code) —
 * never an amount. The route reads the price list from env
 * (tests/shop/shippingEnv.ts: DHL 19.99, DPD 17.99, InPost 14.99, Paczkomat 14.99,
 * free from 500.00) and checkout_create_order (migration 018) computes the cost
 * from the goods it sums itself. orders.total = goods + delivery, so the P24
 * amount, e-mails, status pages and the BaseLinker order include delivery.
 *
 * Order rows are left in the local DB (like checkout.spec.ts) so they can be
 * inspected with:
 *   select id, fulfillment_route, shipping_method, shipping_cost, total, delivery_point_id
 *     from orders where shipping_method is not null order by created_at desc;
 *
 * The BaseLinker payload tests need BASELINKER_STATUS_PAID on the runner (CI: 12345),
 * otherwise markOrderPaid / orders sync skip the push by design.
 *
 * Run: HYDRA_TEST_PORT=3101 npx playwright test tests/shop/shipping.spec.ts
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import { dismissCookies, hideBanner } from './fixtures'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const SYNC_SECRET = process.env.SYNC_SECRET ?? 'local-sync-secret-dev'

const serviceHeaders = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

// Seed products (supabase/seed.sql) — prices fixed by the seed.
const OWN_199 = 301004       // Bluza, 199.00, standard, own
const OWN_129 = 309002       // Opaska CAT, 129.00, standard, own
const OWN_549 = 301003       // Kurtka, 549.00, standard, own (above threshold)
const SOURCED_499 = 306002   // Multitool, 499.00, standard, sharg (just below threshold)
const PICKUP_ONLY_899 = 302001 // Kamizelka, 899.00, product_type pickup_only

const SHIPPING = {
  firstName: 'Test',
  lastName: 'Dostawa',
  email: 'dostawa@example.com',
  phone: '600700800',
  street: 'Testowa 1',
  city: 'Kraków',
  zip: '30-001',
}

let _ip = 1
/** Unique X-Forwarded-For per call (checkout is rate-limited to 5 req / 60 s per IP). */
function ip() {
  return { 'x-forwarded-for': `10.22.0.${(_ip++ % 250) + 1}` }
}

interface OrderRow {
  id: string
  fulfillment_route: string
  shipping_method: string | null
  shipping_cost: number | null
  total: number
  delivery_point_id: string | null
  delivery_point_name: string | null
  delivery_point_city: string | null
}

async function ordersForKey(key: string): Promise<OrderRow[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?session_id=eq.${key}&select=id,fulfillment_route,shipping_method,shipping_cost,total,delivery_point_id,delivery_point_name,delivery_point_city`,
    { headers: serviceHeaders },
  )
  expect(res.status).toBe(200)
  return (await res.json()).map((r: OrderRow) => ({ ...r, total: Number(r.total), shipping_cost: r.shipping_cost === null ? null : Number(r.shipping_cost) }))
}

function body(items: [number, number][], route: 'own' | 'sourced' | 'pickup', extra: Record<string, unknown> = {}) {
  return {
    items: items.map(([product_id, quantity]) => ({ product_id, quantity })),
    terms_accepted: true,
    shipping: SHIPPING,
    idempotency_key: crypto.randomUUID(),
    fulfillment_route: route,
    ...(route === 'pickup' ? { pickup_confirmed: true, shipping_method: 'pickup' } : {}),
    ...extra,
  }
}

async function checkout(request: APIRequestContext, b: Record<string, unknown>) {
  return request.post('/api/shop/checkout', { data: b, headers: ip() })
}

// ════════════════════════════════════════════════════════════════════════════
// 1. order total = goods + delivery per price list
// ════════════════════════════════════════════════════════════════════════════

test.describe('order total = goods + delivery (local DB)', () => {
  test('below threshold, courier DHL → 199.00 + 19.99', async ({ request }) => {
    const b = body([[OWN_199, 1]], 'own', { shipping_method: 'dhl' })
    const res = await checkout(request, b)
    expect(res.status()).toBe(200)
    expect((await res.json()).shipping_cost).toBeCloseTo(19.99, 2)
    const [o] = await ordersForKey(b.idempotency_key)
    console.log('[below threshold]', JSON.stringify(o))
    expect(o).toMatchObject({ fulfillment_route: 'own', shipping_method: 'dhl', shipping_cost: 19.99, total: 218.99 })
  })

  test('just below threshold (499.00), courier InPost → 499.00 + 14.99', async ({ request }) => {
    const b = body([[SOURCED_499, 1]], 'sourced', { shipping_method: 'inpost_courier' })
    expect((await checkout(request, b)).status()).toBe(200)
    const [o] = await ordersForKey(b.idempotency_key)
    console.log('[just below threshold]', JSON.stringify(o))
    expect(o).toMatchObject({ fulfillment_route: 'sourced', shipping_method: 'inpost_courier', shipping_cost: 14.99, total: 513.99 })
  })

  test('above threshold (549.00), courier DPD → delivery 0', async ({ request }) => {
    const b = body([[OWN_549, 1]], 'own', { shipping_method: 'dpd' })
    expect((await checkout(request, b)).status()).toBe(200)
    const [o] = await ordersForKey(b.idempotency_key)
    console.log('[above threshold]', JSON.stringify(o))
    expect(o).toMatchObject({ shipping_method: 'dpd', shipping_cost: 0, total: 549 })
  })

  test('pickup-only cart → method pickup, delivery 0', async ({ request }) => {
    const b = body([[PICKUP_ONLY_899, 1]], 'pickup')
    expect((await checkout(request, b)).status()).toBe(200)
    const [o] = await ordersForKey(b.idempotency_key)
    console.log('[pickup]', JSON.stringify(o))
    expect(o).toMatchObject({ fulfillment_route: 'pickup', shipping_method: 'pickup', shipping_cost: 0, total: 899 })
  })

  test('InPost Paczkomat → 129.00 + 14.99, locker code stored (normalised to upper case)', async ({ request }) => {
    const b = body([[OWN_129, 1]], 'own', {
      shipping_method: 'inpost_locker',
      delivery_point: { id: ' kra01m ', name: 'Paczkomat KRA01M', address: 'Testowa 5', postcode: '30-002', city: 'Kraków' },
    })
    const res = await checkout(request, b)
    expect(res.status()).toBe(200)
    const [o] = await ordersForKey(b.idempotency_key)
    console.log('[paczkomat]', JSON.stringify(o))
    expect(o).toMatchObject({
      shipping_method: 'inpost_locker', shipping_cost: 14.99, total: 143.99,
      delivery_point_id: 'KRA01M', delivery_point_name: 'Paczkomat KRA01M', delivery_point_city: 'Kraków',
    })
  })

  test('split checkout: delivery only on the ship leg; threshold counts only shipped goods (tj D1)', async ({ request }) => {
    // Whole cart 199 + 899 = 1098 ≥ 500, but only the 199.00 ship leg counts → DPD 17.99 is charged.
    const base = crypto.randomUUID()
    const ship = body([[OWN_199, 1]], 'own', { shipping_method: 'dpd', idempotency_key: `${base}-ship` })
    const pickup = body([[PICKUP_ONLY_899, 1]], 'pickup', { idempotency_key: `${base}-pickup` })
    expect((await checkout(request, ship)).status()).toBe(200)
    expect((await checkout(request, pickup)).status()).toBe(200)
    const [s] = await ordersForKey(`${base}-ship`)
    const [p] = await ordersForKey(`${base}-pickup`)
    console.log('[split ship leg]', JSON.stringify(s))
    console.log('[split pickup leg]', JSON.stringify(p))
    expect(s).toMatchObject({ fulfillment_route: 'own', shipping_method: 'dpd', shipping_cost: 17.99, total: 216.99 })
    expect(p).toMatchObject({ fulfillment_route: 'pickup', shipping_method: 'pickup', shipping_cost: 0, total: 899 })
  })

  test('RPC boundary: goods exactly at the threshold → delivery 0 (≥, not >)', async () => {
    const sessionId = crypto.randomUUID()
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/checkout_create_order`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        p_session_id: sessionId, p_user_id: null, p_shipping: SHIPPING, p_fulfillment_route: 'own',
        p_items: [{ product_id: OWN_199, quantity: 1 }],
        p_shipping_method: 'dhl', p_shipping_price: 19.99, p_free_threshold: 199,
      }),
    })
    expect(res.status).toBe(200)
    const [o] = await ordersForKey(sessionId)
    expect(o).toMatchObject({ shipping_cost: 0, total: 199 })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 2. the client never sets the price
// ════════════════════════════════════════════════════════════════════════════

test.describe('client-sent delivery amounts are ignored', () => {
  test('RED PROOF: shipping_cost / shipping_price / delivery_price / total in the body change nothing', async ({ request }) => {
    const b = body([[OWN_199, 1]], 'own', {
      shipping_method: 'dhl',
      shipping_cost: 0, shipping_price: 0, delivery_price: 0, free_shipping_threshold: 1, total: 1,
    })
    const res = await checkout(request, b)
    expect(res.status()).toBe(200)
    const json = await res.json()
    const [o] = await ordersForKey(b.idempotency_key)
    console.log('[client amount ignored]', JSON.stringify(o))
    expect(json.shipping_cost).toBeCloseTo(19.99, 2)
    expect(o.shipping_cost).toBe(19.99)
    expect(o.total).toBe(218.99)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 3. refusals before any order row
// ════════════════════════════════════════════════════════════════════════════

test.describe('refused methods — 400, no order row', () => {
  test('RED PROOF: inpost_locker without a locker code → 400', async ({ request }) => {
    const b = body([[OWN_129, 1]], 'own', { shipping_method: 'inpost_locker' })
    const res = await checkout(request, b)
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toContain('Paczkomat')
    expect(await ordersForKey(b.idempotency_key)).toHaveLength(0)
  })

  test('RED PROOF: inpost_locker with an invalid code (PaczkoPunkt / garbage) → 400', async ({ request }) => {
    for (const id of ['POP-KRA123', 'KR1', "KRA01M'; --", '']) {
      const b = body([[OWN_129, 1]], 'own', { shipping_method: 'inpost_locker', delivery_point: { id } })
      const res = await checkout(request, b)
      expect(res.status(), id).toBe(400)
      expect(await ordersForKey(b.idempotency_key)).toHaveLength(0)
    }
  })

  test('RED PROOF: courier method on a pickup-only cart → refused', async ({ request }) => {
    // Courier route + DHL: refused by the pickup rule.
    const viaCourier = body([[PICKUP_ONLY_899, 1]], 'own', { shipping_method: 'dhl' })
    const r1 = await checkout(request, viaCourier)
    expect(r1.status()).toBe(400)
    expect(await ordersForKey(viaCourier.idempotency_key)).toHaveLength(0)
    // Pickup route + DHL: refused by the method/route check.
    const mismatch = body([[PICKUP_ONLY_899, 1]], 'pickup', { shipping_method: 'dhl' })
    const r2 = await checkout(request, mismatch)
    expect(r2.status()).toBe(400)
    expect((await r2.json()).error).toContain('sposób dostawy')
    expect(await ordersForKey(mismatch.idempotency_key)).toHaveLength(0)
  })

  test('unknown or missing method → 400', async ({ request }) => {
    for (const extra of [{ shipping_method: 'ups' }, { shipping_method: 1 }, {}]) {
      const b = body([[OWN_199, 1]], 'own', extra)
      const res = await checkout(request, b)
      expect(res.status(), JSON.stringify(extra)).toBe(400)
      expect(await ordersForKey(b.idempotency_key)).toHaveLength(0)
    }
  })

  test('shipped method without a phone number → 400 (tj D3)', async ({ request }) => {
    const b = { ...body([[OWN_199, 1]], 'own', { shipping_method: 'dpd' }), shipping: { ...SHIPPING, phone: '' } }
    const res = await checkout(request, b)
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toContain('telefonu')
    expect(await ordersForKey(b.idempotency_key)).toHaveLength(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 4. checkout_create_order is service_role only — it takes the price as an argument
// ════════════════════════════════════════════════════════════════════════════

test.describe('checkout_create_order lockdown (migration 018)', () => {
  const NEW_SIG = 'public.checkout_create_order(text,uuid,jsonb,text,jsonb,boolean,text,numeric,numeric,jsonb)'

  test('RED PROOF: anon/authenticated cannot execute the new signature; the 6-argument one is gone', async () => {
    const priv = async (role: string, sig: string) => fetch(`${SUPABASE_URL}/rest/v1/rpc/test_fn_privilege`, {
      method: 'POST', headers: serviceHeaders, body: JSON.stringify({ role_name: role, func_sig: sig }),
    })
    const result: Record<string, unknown> = {}
    for (const role of ['anon', 'authenticated', 'service_role']) {
      const res = await priv(role, NEW_SIG)
      expect(res.status).toBe(200)
      result[role] = await res.json()
    }
    console.log('[has_function_privilege new signature]', JSON.stringify(result))
    expect(result).toEqual({ anon: false, authenticated: false, service_role: true })

    const old = await priv('service_role', 'public.checkout_create_order(text,uuid,jsonb,text,jsonb,boolean)')
    console.log('[old 6-arg signature]', old.status, JSON.stringify(await old.json()))
    expect(old.status).toBeGreaterThanOrEqual(400)
  })

  // No direct call with the anon key here: the local image (supabase/postgres 17.6.1.111) segfaults
  // the backend on ANY permission-denied function call as anon (also hydra_section, mark_order_paid),
  // which takes the DB down for the following tests. Recorded in docs/deferred-tasks.md (HA-2.02).
})

// ════════════════════════════════════════════════════════════════════════════
// 5. P24 amount and BaseLinker payload include delivery
// ════════════════════════════════════════════════════════════════════════════

test.describe('P24 amount = order total incl. delivery', () => {
  test('mock payment page and payment attempt show goods + delivery', async ({ request, page }) => {
    const b = body([[OWN_199, 1]], 'own', { shipping_method: 'dhl' })
    const res = await checkout(request, b)
    expect(res.status()).toBe(200)
    const { order_id: orderId, payment_url: paymentUrl, total } = await res.json()
    expect(Number(total)).toBeCloseTo(218.99, 2)

    const att = await fetch(`${SUPABASE_URL}/rest/v1/order_payments?order_id=eq.${orderId}&select=amount_grosz`, { headers: serviceHeaders })
    const [attempt] = await att.json()
    console.log('[p24 attempt]', JSON.stringify(attempt))
    expect(attempt.amount_grosz).toBe(21899)

    await dismissCookies(page)
    await page.goto(paymentUrl)
    const amount = page.getByTestId('mock-payment-amount')
    await expect(amount).toBeVisible()
    await expect(amount).toHaveText(/218,99\s*PLN/)
  })
})

test.describe('BaseLinker mock receives delivery', () => {
  test.skip(!process.env.BASELINKER_STATUS_PAID, 'needs BASELINKER_STATUS_PAID on the runner (CI sets 12345)')

  async function blDelivery(request: APIRequestContext, orderId: string) {
    const res = await request.get(`/api/shop/dev/bl-mock-counter?orderId=${orderId}`)
    expect(res.status()).toBe(200)
    return (await res.json()) as { count: number; delivery: Record<string, unknown> | null }
  }

  test('markOrderPaid push: Paczkomat → delivery_method, delivery_price and delivery point', async ({ request }) => {
    const b = body([[OWN_129, 1]], 'own', {
      shipping_method: 'inpost_locker',
      delivery_point: { id: 'WAW100M', name: 'Paczkomat WAW100M', address: 'Marszałkowska 1', postcode: '00-001', city: 'Warszawa' },
    })
    const res = await checkout(request, b)
    expect(res.status()).toBe(200)
    const { order_id: orderId } = await res.json()
    const att = await fetch(`${SUPABASE_URL}/rest/v1/order_payments?order_id=eq.${orderId}&select=p24_session_id`, { headers: serviceHeaders })
    const [{ p24_session_id }] = await att.json()
    const pay = await request.post('/api/shop/payments/p24/mock-pay', { data: { orderId, p24SessionId: p24_session_id } })
    expect(pay.status()).toBe(200)

    const bl = await blDelivery(request, orderId)
    console.log('[BL mock payload — markOrderPaid]', JSON.stringify(bl))
    expect(bl.count).toBe(1)
    expect(bl.delivery).toEqual({
      delivery_method: 'InPost Paczkomat',
      delivery_price: 14.99,
      admin_comments: 'Realizacja: magazyn własny',
      delivery_point_id: 'WAW100M',
      delivery_point_name: 'Paczkomat WAW100M',
      delivery_point_address: 'Marszałkowska 1',
      delivery_point_postcode: '00-001',
      delivery_point_city: 'Warszawa',
    })
  })

  test('orphan retry (orders/sync Phase A): courier → delivery_method + delivery_price, no point fields', async ({ request }) => {
    const b = body([[SOURCED_499, 1]], 'sourced', { shipping_method: 'dpd' })
    const res = await checkout(request, b)
    expect(res.status()).toBe(200)
    const { order_id: orderId } = await res.json()
    // Paid without the BL push (direct RPC) → an orphan for Phase A.
    const mark = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_order_paid`, {
      method: 'POST', headers: { ...serviceHeaders, 'Prefer': '' }, body: JSON.stringify({ p_order_id: orderId }),
    })
    expect(mark.status).toBe(200)
    const sync = await request.post('/api/shop/orders/sync', { headers: { 'x-sync-secret': SYNC_SECRET } })
    expect(sync.status()).toBe(200)

    const bl = await blDelivery(request, orderId)
    console.log('[BL mock payload — orphan retry]', JSON.stringify(bl))
    expect(bl.delivery).toEqual({
      delivery_method: 'Kurier DPD',
      delivery_price: 17.99,
      admin_comments: 'Realizacja: zamówienie u dostawcy',
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 6. UI — methods, cost, threshold hint, total (screenshots)
// ════════════════════════════════════════════════════════════════════════════

async function openCheckoutWith(page: import('@playwright/test').Page, request: APIRequestContext, ids: [number, number][]) {
  // Full public product rows (product_type, flags, source) — the cart needs them for analyzeCart.
  const products: { id: number }[] = []
  for (let page = 1; page <= 5; page++) {
    const res = await request.get(`/api/shop/products?page=${page}`)
    const json = await res.json()
    if (!Array.isArray(json?.products) || json.products.length === 0) break
    products.push(...json.products)
  }
  const items = ids.map(([id, quantity]) => {
    const product = products.find(p => p.id === id)
    if (!product) throw new Error(`product ${id} not in /api/shop/products`)
    return { product, quantity }
  })
  await dismissCookies(page)
  await page.addInitScript(cart => { localStorage.setItem('hydra-cart', JSON.stringify(cart)) }, items)
  await page.goto('/sklep/zamowienie')
  await page.getByTestId('place-order').waitFor()
  await hideBanner(page)
}

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.waitForTimeout(2000) // GSAP / Lenis settle
  await page.getByTestId('summary-total').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `.playwright-mcp/ha-2.02-${name}.png`, fullPage: true })
}

test.describe('checkout UI — delivery', () => {
  test('courier below threshold: methods, cost, hint and total', async ({ page, request }) => {
    await openCheckoutWith(page, request, [[OWN_199, 1]])
    const methods = page.getByTestId('shipping-methods')
    await expect(methods).toBeVisible()
    for (const m of ['dhl', 'dpd', 'inpost_courier', 'inpost_locker']) {
      await expect(page.getByTestId(`shipping-method-${m}`)).toBeVisible()
    }
    await expect(page.getByTestId('free-shipping-hint')).toContainText('brakuje 301,00 PLN')
    await page.getByTestId('shipping-method-dhl').click()
    await expect(page.getByTestId('summary-delivery')).toContainText('19,99 PLN')
    await expect(page.getByTestId('summary-total')).toHaveText(/218,99\s*PLN/)
    await shot(page, '1-courier-below-threshold')
  })

  test('above threshold: every method free, total = goods', async ({ page, request }) => {
    await openCheckoutWith(page, request, [[OWN_549, 1]])
    await expect(page.getByTestId('free-shipping-hint')).toContainText('Darmowa dostawa')
    await page.getByTestId('shipping-method-dpd').click()
    await expect(page.getByTestId('summary-delivery')).toContainText('GRATIS')
    await expect(page.getByTestId('summary-total')).toHaveText(/549,00\s*PLN/)
    await shot(page, '2-free-above-threshold')
  })

  test('Paczkomat selected: manual code field (no Geowidget token in tests), cost and total', async ({ page, request }) => {
    const inpostRequests: string[] = []
    page.on('request', r => { if (r.url().includes('inpost')) inpostRequests.push(r.url()) })
    await openCheckoutWith(page, request, [[OWN_129, 1]])
    await page.getByTestId('shipping-method-inpost_locker').click()
    await expect(page.getByTestId('locker-picker')).toBeVisible()
    await expect(page.getByTestId('locker-map')).toHaveCount(0)
    await page.locator('input[name="locker_code"]').fill('kra01m')
    await expect(page.locator('input[name="locker_code"]')).toHaveValue('KRA01M')
    await expect(page.getByTestId('summary-delivery')).toContainText('14,99 PLN')
    await expect(page.getByTestId('summary-total')).toHaveText(/143,99\s*PLN/)
    await page.getByTestId('locker-picker').scrollIntoViewIfNeeded()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '.playwright-mcp/ha-2.02-3-paczkomat-selected.png', fullPage: true })
    expect(inpostRequests, 'no InPost request without a token').toEqual([])
  })

  test('pickup-only cart: no courier methods, delivery 0', async ({ page, request }) => {
    await openCheckoutWith(page, request, [[PICKUP_ONLY_899, 1]])
    await expect(page.getByTestId('shipping-methods')).toHaveCount(0)
    await expect(page.getByTestId('summary-delivery')).toContainText('odbiór osobisty · 0,00 PLN')
    await expect(page.getByTestId('summary-total')).toHaveText(/899,00\s*PLN/)
    await shot(page, '4-pickup-only')
  })

  test('submit without a method → inline error, no request', async ({ page, request }) => {
    let calls = 0
    page.on('request', r => { if (r.url().includes('/api/shop/checkout')) calls++ })
    await openCheckoutWith(page, request, [[OWN_199, 1]])
    // Scoped to the form: the footer has an aria-label="Email" link as well.
    const form = page.locator('#checkout-form')
    await form.getByLabel(/Imię/).fill('Test')
    await form.getByLabel(/Nazwisko/).fill('Dostawa')
    await form.getByLabel(/Email/).fill('dostawa@example.com')
    await form.getByLabel(/Telefon/).fill('600700800')
    await form.getByLabel(/Ulica i numer/).fill('Testowa 1')
    await form.getByLabel(/Miasto/).fill('Kraków')
    await form.getByLabel(/Kod pocztowy/).fill('30-001')
    await page.getByTestId('terms-acceptance').locator('input').check()
    await page.getByTestId('place-order').click()
    await expect(page.getByTestId('shipping-method-error')).toBeVisible()
    expect(calls).toBe(0)
  })
})
