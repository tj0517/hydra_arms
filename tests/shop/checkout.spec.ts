/**
 * Checkout + payment status tests (HA-2.01)
 *
 * Requires: local Supabase stack, BASELINKER_MOCK=true, BASELINKER_STATUS_PAID=12345
 * Run: npm run test:shop:local
 */
import { test, expect } from '@playwright/test'

interface ApiProduct {
  id: number
  stock: number
  product_type: string
  is_active: boolean
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const SYNC_SECRET = process.env.SYNC_SECRET ?? 'local-sync-secret-dev'

const serviceHeaders = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

// Run all tests in this file sequentially to avoid shared-DB race conditions
// (parallel tests that patch stock or mark orders paid can interfere with each other).
test.describe.configure({ mode: 'serial' })

let _ipCounter = 1

/** Unique X-Forwarded-For per call to avoid the 5 req/60 s rate limit bucket. */
function uniqueIpHeaders() {
  return { 'x-forwarded-for': `10.0.0.${(_ipCounter++ % 250) + 1}` }
}

/** Wait up to 30 s for PostgREST schema cache to stabilise after db:reset.
 *  Also ensures at least one standard in-stock product exists in the seed. */
test.beforeAll(async ({ request }) => {
  for (let i = 0; i < 15; i++) {
    try {
      const res = await request.get('/api/shop/products?in_stock=true')
      if (res.ok()) {
        const body = await res.json()
        const products: ApiProduct[] = Array.isArray(body?.products) ? body.products : []
        const hasStandard = products.some(p => p.product_type === 'standard')
        if (hasStandard) return
      }
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Products API did not become ready within 30 s — PostgREST may still be rebuilding schema cache or seed is missing standard products')
})

/** Minimal valid checkout body using the first in-stock standard product.
 *  Retries up to 6 times (12 s) to tolerate transient PostgREST reloads. */
async function getCheckoutBody(request: import('@playwright/test').APIRequestContext) {
  let body: { products?: ApiProduct[] } = {}
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await request.get('/api/shop/products?in_stock=true')
    body = await res.json()
    if (Array.isArray(body?.products)) break
    if (attempt < 5) await new Promise(r => setTimeout(r, 2000))
  }
  const products = body?.products
  if (!Array.isArray(products)) throw new Error(`/api/shop/products unexpected response: ${JSON.stringify(body)}`)
  const p = products.find(pr => pr.product_type === 'standard')
  if (!p) throw new Error('No in-stock standard product in seed — cannot run checkout tests')
  return {
    product: p,
    body: {
      items: [{ product_id: p.id, quantity: 1 }],
      shipping: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '123456789',
        street: 'Testowa 1',
        city: 'Kraków',
        zip: '30-001',
      },
      idempotency_key: crypto.randomUUID(),
      fulfillment_route: 'own',
    },
  }
}

test.describe('checkout — pending_payment status', () => {
  test('checkout creates pending_payment order with stock unchanged and zero BL calls', async ({ request }) => {
    const { product, body } = await getCheckoutBody(request)

    // Stock before
    const before = product.stock

    const res = await request.post('/api/shop/checkout', { data: body, headers: uniqueIpHeaders() })
    expect(res.status()).toBe(200)
    const json = await res.json()

    expect(json.status).toBe('pending_payment')
    expect(json.order_id).toBeTruthy()

    // Stock after — must be unchanged (no decrement at checkout)
    const afterRes = await request.get(`/api/shop/products?in_stock=true`)
    const afterBody: { products?: ApiProduct[] } = await afterRes.json()
    const afterProduct = (afterBody.products ?? []).find(p => p.id === product.id)
    const stockAfter = afterProduct?.stock ?? before
    expect(stockAfter).toBe(before)

    // Verify order in DB: status = pending_payment, baselinker_order_id IS NULL
    const orderRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${json.order_id}&select=status,baselinker_order_id`,
      { headers: serviceHeaders },
    )
    const [order] = await orderRes.json()
    expect(order.status).toBe('pending_payment')
    expect(order.baselinker_order_id).toBeNull()
  })

  test('idempotent re-checkout returns existing order status', async ({ request }) => {
    const { body } = await getCheckoutBody(request)

    const r1 = await request.post('/api/shop/checkout', { data: body, headers: uniqueIpHeaders() })
    const j1 = await r1.json()
    expect(j1.status).toBe('pending_payment')

    const r2 = await request.post('/api/shop/checkout', { data: body, headers: uniqueIpHeaders() })
    const j2 = await r2.json()
    expect(j2.duplicate).toBe(true)
    expect(j2.status).toBe('pending_payment')
    expect(j2.order_id).toBe(j1.order_id)
  })

  test('out-of-stock product is rejected', async ({ request }) => {
    const res = await request.get('/api/shop/products')
    const productsBody: { products?: ApiProduct[] } = await res.json()
    const products = productsBody?.products
    expect(Array.isArray(products)).toBe(true)
    expect(products!.length).toBeGreaterThan(0)
    const p = products![0]

    // Temporarily set stock to 0 via service role
    await fetch(
      `${SUPABASE_URL}/rest/v1/shop_products?id=eq.${p.id}`,
      { method: 'PATCH', headers: serviceHeaders, body: JSON.stringify({ stock: 0 }) },
    )

    try {
      const body = {
        items: [{ product_id: p.id, quantity: 1 }],
        shipping: {
          firstName: 'Test', lastName: 'User', email: 'test@example.com',
          phone: '123456789', street: 'Testowa 1', city: 'Kraków', zip: '30-001',
        },
        idempotency_key: crypto.randomUUID(),
        fulfillment_route: 'own',
      }

      const checkoutRes = await request.post('/api/shop/checkout', { data: body, headers: uniqueIpHeaders() })
      expect([400, 409]).toContain(checkoutRes.status())
    } finally {
      // Always restore stock, even if the assertion failed
      await fetch(
        `${SUPABASE_URL}/rest/v1/shop_products?id=eq.${p.id}`,
        { method: 'PATCH', headers: serviceHeaders, body: JSON.stringify({ stock: p.stock }) },
      )
    }
  })
})

test.describe('mark_order_paid — permissions', () => {
  // On ARM/Docker local stack, calling a revoked SECURITY DEFINER function via
  // SET ROLE crashes the PG backend (signal 11).  PostgREST then can't reconnect
  // and returns 503 — which fails the [401,403,404] assertion.  That local failure
  // is expected and documented; CI (x86 Linux) returns the correct 404 PGRST202
  // (function hidden from schema cache because EXECUTE was revoked).

  test('anon key cannot call mark_order_paid (permission denied)', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_order_paid`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_order_id: '00000000-0000-0000-0000-000000000000' }),
    })
    // 404 PGRST202 = function not in schema cache for this role (REVOKE removes it)
    // 403 42501   = explicit permission denied (also valid on some PostgREST versions)
    // 401         = JWT rejected before even reaching the function
    expect([401, 403, 404]).toContain(res.status)
    const json = await res.json() as { code?: string }
    expect(['42501', 'PGRST202']).toContain(json.code)
  })

  test('authenticated user cannot call mark_order_paid (permission denied)', async () => {
    // Create an ephemeral user to obtain a role=authenticated JWT.
    const email = `perm-test-${Date.now()}@example.com`
    const password = 'PermTest1234!'
    const adminHeaders = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    }
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ email, password, email_confirm: true }),
    })
    const created = await createRes.json() as { id?: string }
    const userId = created?.id

    try {
      const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const { access_token } = await signInRes.json() as { access_token?: string }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_order_paid`, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_order_id: '00000000-0000-0000-0000-000000000000' }),
      })
      expect([401, 403, 404]).toContain(res.status)
      const json = await res.json() as { code?: string }
      expect(['42501', 'PGRST202']).toContain(json.code)
    } finally {
      if (userId) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: adminHeaders,
        })
      }
    }
  })
})

test.describe('mark_order_paid — idempotency and BL push', () => {
  test('paid order reserves stock; after BL push reservation is released; sync does not double-push', async ({ request }) => {
    const { product, body } = await getCheckoutBody(request)

    // Baseline reservation for this product (other tests may have left paid+no_bl orders)
    const reservedBefore = await getReservedCount(product.id)

    // 1. Checkout → pending_payment
    const checkoutRes = await request.post('/api/shop/checkout', { data: body, headers: uniqueIpHeaders() })
    const { order_id: orderId } = await checkoutRes.json()

    // 2. pending_payment does NOT count in reservation
    const reservedAfterCheckout = await getReservedCount(product.id)
    expect(reservedAfterCheckout).toBe(reservedBefore)

    // 3. mark_order_paid via service role RPC
    const markRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_order_paid`, {
      method: 'POST',
      headers: { ...serviceHeaders, 'Prefer': '' },
      body: JSON.stringify({ p_order_id: orderId }),
    })
    expect(markRes.status).toBe(200)
    const changed = await markRes.json()
    expect(changed).toBe(true)

    // 4. Second call is idempotent — returns false
    const markRes2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_order_paid`, {
      method: 'POST',
      headers: { ...serviceHeaders, 'Prefer': '' },
      body: JSON.stringify({ p_order_id: orderId }),
    })
    const changed2 = await markRes2.json()
    expect(changed2).toBe(false)

    // 5. Paid order with bl_id IS NULL IS counted in reservation (+1 unit)
    const reservedAfterPaid = await getReservedCount(product.id)
    expect(reservedAfterPaid).toBe(reservedBefore + 1)

    // 6. Phase A (orders/sync) pushes paid-not-in-BL order to BL mock → bl_id set
    const syncRes = await request.post('/api/shop/orders/sync', {
      headers: { 'x-sync-secret': SYNC_SECRET },
    })
    expect(syncRes.status()).toBe(200)
    const syncJson = await syncRes.json()
    expect(syncJson.phase_a?.ok).toBeGreaterThanOrEqual(1)

    // Verify bl_id is now set
    const orderRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=status,baselinker_order_id`,
      { headers: serviceHeaders },
    )
    const [order] = await orderRes.json()
    expect(order.status).toBe('paid')
    expect(order.baselinker_order_id).not.toBeNull()
    const blId = order.baselinker_order_id

    // 7. BL now owns the reservation — bl_id is set → no longer locally reserved
    const reservedAfterBL = await getReservedCount(product.id)
    expect(reservedAfterBL).toBe(reservedBefore)

    // 8. Phase A again → bl_id unchanged (not pushed twice)
    await request.post('/api/shop/orders/sync', {
      headers: { 'x-sync-secret': SYNC_SECRET },
    })
    const orderRes2 = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=baselinker_order_id`,
      { headers: serviceHeaders },
    )
    const [order2] = await orderRes2.json()
    expect(order2.baselinker_order_id).toBe(blId)
  })

  test('orders/sync Phase A does not push pending_payment orders to BL', async ({ request }) => {
    const { body } = await getCheckoutBody(request)

    const checkoutRes = await request.post('/api/shop/checkout', { data: body, headers: uniqueIpHeaders() })
    const { order_id: orderId } = await checkoutRes.json()

    // Verify pending_payment
    const orderBefore = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=status,baselinker_order_id`,
      { headers: serviceHeaders },
    )
    const [ob] = await orderBefore.json()
    expect(ob.status).toBe('pending_payment')

    // Run sync
    await request.post('/api/shop/orders/sync', { headers: { 'x-sync-secret': SYNC_SECRET } })

    // bl_id still NULL — Phase A skipped this order
    const orderAfter = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=status,baselinker_order_id`,
      { headers: serviceHeaders },
    )
    const [oa] = await orderAfter.json()
    expect(oa.status).toBe('pending_payment')
    expect(oa.baselinker_order_id).toBeNull()
  })

  test('paid-not-pushed order blocks checkout for last unit', async ({ request }) => {
    const { product, body } = await getCheckoutBody(request)

    // Set stock to 3 so we can buy all of it (MAX_QTY_PER_ITEM=20; raw stock may be >20).
    const testStock = 3
    await fetch(`${SUPABASE_URL}/rest/v1/shop_products?id=eq.${product.id}`, {
      method: 'PATCH',
      headers: serviceHeaders,
      body: JSON.stringify({ stock: testStock }),
    })

    const allStockBody = {
      ...body,
      items: [{ product_id: product.id, quantity: testStock }],
      idempotency_key: crypto.randomUUID(),
    }

    let orderId: string | undefined
    try {
      // Buy all available units → pending_payment
      const r1 = await request.post('/api/shop/checkout', { data: allStockBody, headers: uniqueIpHeaders() })
      expect(r1.status()).toBe(200)
      orderId = (await r1.json()).order_id

      // Mark paid — no BL push yet (bl_id stays NULL).  All 3 units are reserved.
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_order_paid`, {
        method: 'POST',
        headers: { ...serviceHeaders, 'Prefer': '' },
        body: JSON.stringify({ p_order_id: orderId }),
      })

      // 0 units available → checkout for 1 more must be rejected
      const r2 = await request.post('/api/shop/checkout', {
        data: { ...body, idempotency_key: crypto.randomUUID() },
        headers: uniqueIpHeaders(),
      })
      expect([400, 409]).toContain(r2.status())
    } finally {
      // Cancel so the paid+no_bl order no longer reserves stock for subsequent runs.
      if (orderId) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
          method: 'PATCH',
          headers: serviceHeaders,
          body: JSON.stringify({ status: 'cancelled' }),
        })
      }
      // Restore original stock.
      await fetch(`${SUPABASE_URL}/rest/v1/shop_products?id=eq.${product.id}`, {
        method: 'PATCH',
        headers: serviceHeaders,
        body: JSON.stringify({ stock: product.stock }),
      })
    }
  })
})

/** Returns the total quantity reserved for a product by paid orders not yet in BaseLinker.
 *  Only paid+bl_id=null orders count as local reservations; once BL owns the order it
 *  is removed from the local count. */
async function getReservedCount(productId: number): Promise<number> {
  const ordersRes = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?select=id&status=eq.paid&baselinker_order_id=is.null`,
    { headers: serviceHeaders },
  )
  const paidOrders: { id: string }[] = await ordersRes.json()
  if (!Array.isArray(paidOrders) || paidOrders.length === 0) return 0
  const idList = paidOrders.map(o => o.id).join(',')
  const itemsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/order_items?select=quantity&product_id=eq.${productId}&order_id=in.(${idList})`,
    { headers: serviceHeaders },
  )
  const items: { quantity: number }[] = await itemsRes.json()
  return Array.isArray(items) ? items.reduce((s, i) => s + i.quantity, 0) : 0
}
