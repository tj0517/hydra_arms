import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { addOrder } from '@/lib/baselinker/client'
import { analyzeCart } from '@/lib/shop/cartAnalysis'
import { ORDER_SESSION_COOKIE, appendOrderSession } from '@/lib/shop/orderSession'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

interface CheckoutItem {
  product_id: number
  quantity: number
}

interface CheckoutBody {
  items: CheckoutItem[]
  shipping: {
    firstName: string
    lastName: string
    email: string
    phone: string
    street: string
    city: string
    zip: string
  }
  idempotency_key?: string
  fulfillment_route?: 'direct_H1' | 'direct_H2' | 'consolidated' | 'pickup'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ZIP_RE = /^\d{2}-\d{3}$/
// Client-generated key = crypto.randomUUID() (+ '-ship'/'-pickup' for split carts).
// It doubles as the guest access token, so reject anything low-entropy.
const IDEMPOTENCY_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-ship|-pickup)?$/i

const MAX_LINE_ITEMS = 30
const MAX_QTY_PER_ITEM = 20

export async function POST(req: NextRequest) {
  const limit = rateLimit(`checkout:${getClientIp(req)}`, 5, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    )
  }

  try {
    const body: CheckoutBody = await req.json()

    if (!body.items?.length) {
      return NextResponse.json({ error: 'Koszyk jest pusty' }, { status: 400 })
    }
    if (body.items.length > MAX_LINE_ITEMS) {
      return NextResponse.json({ error: 'Zbyt wiele pozycji w koszyku' }, { status: 400 })
    }

    const s = body.shipping
    const isPickup = body.fulfillment_route === 'pickup'

    if (!s?.email || !s?.firstName || !s?.lastName) {
      return NextResponse.json({ error: 'Brakuje wymaganych danych kontaktowych' }, { status: 400 })
    }

    if (!isPickup && (!s?.street || !s?.city || !s?.zip)) {
      return NextResponse.json({ error: 'Brakuje wymaganych danych adresowych' }, { status: 400 })
    }

    if (!EMAIL_RE.test(s.email)) {
      return NextResponse.json({ error: 'Nieprawidłowy adres email' }, { status: 400 })
    }

    if (!isPickup && !ZIP_RE.test(s.zip)) {
      return NextResponse.json({ error: 'Nieprawidłowy kod pocztowy (format: 00-000)' }, { status: 400 })
    }

    for (const item of body.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > MAX_QTY_PER_ITEM) {
        return NextResponse.json({ error: 'Nieprawidłowa ilość' }, { status: 400 })
      }
    }

    const supabase = createAdminClient()

    // Get logged-in user if present
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()

    const idempotencyKey =
      body.idempotency_key && IDEMPOTENCY_KEY_RE.test(body.idempotency_key)
        ? body.idempotency_key
        : null
    const sessionId = idempotencyKey ?? crypto.randomUUID()

    const withSessionCookie = (res: NextResponse) => {
      res.cookies.set(
        ORDER_SESSION_COOKIE,
        appendOrderSession(req.cookies.get(ORDER_SESSION_COOKIE)?.value, sessionId),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
        },
      )
      return res
    }

    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id, total')
        .eq('session_id', idempotencyKey)
        .single()

      if (existing) {
        return withSessionCookie(
          NextResponse.json({ order_id: existing.id, status: 'paid', total: existing.total, duplicate: true }),
        )
      }
    }

    const productIds = body.items.map(i => i.product_id)
    const { data: products, error: productsError } = await supabase
      .from('shop_products')
      .select('*')
      .in('id', productIds)
      .eq('is_active', true)

    if (productsError || !products) {
      return NextResponse.json({ error: 'Nie udało się pobrać produktów' }, { status: 500 })
    }

    const productMap = new Map(products.map(p => [p.id, p]))

    for (const item of body.items) {
      const product = productMap.get(item.product_id)
      if (!product) {
        return NextResponse.json({ error: `Produkt ${item.product_id} nie istnieje lub jest nieaktywny` }, { status: 400 })
      }
      // A product must be picked up in person when ANY restriction applies —
      // product_type alone is not authoritative (admin may set only the flags).
      const mustPickup =
        product.product_type !== 'standard' ||
        product.requires_license ||
        !product.delivery_allowed ||
        product.age_min >= 18
      if (mustPickup && !isPickup) {
        return NextResponse.json({ error: `Produkt "${product.name}" jest dostępny wyłącznie do odbioru osobistego` }, { status: 400 })
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Niewystarczający stan magazynowy: ${product.name}` }, { status: 400 })
      }
    }

    // Route is computed server-side; the client only decides pickup vs delivery.
    const fulfillmentRoute = isPickup
      ? 'pickup'
      : analyzeCart(body.items.map(i => ({ product: productMap.get(i.product_id)! }))).route

    // Atomic stock deduction + order + items in one DB transaction (RPC).
    // Any failure (including insufficient stock) rolls everything back.
    const { data: rpcData, error: rpcError } = await supabase.rpc('checkout_create_order', {
      p_session_id: sessionId,
      p_user_id: user?.id ?? null,
      p_shipping: body.shipping as unknown as Record<string, string>,
      p_fulfillment_route: fulfillmentRoute,
      p_items: body.items,
    })

    if (rpcError || !rpcData?.length) {
      // Unique violation on session_id → a concurrent duplicate won the race
      if (rpcError?.code === '23505') {
        const { data: existing } = await supabase
          .from('orders')
          .select('id, total')
          .eq('session_id', sessionId)
          .single()
        if (existing) {
          return withSessionCookie(
            NextResponse.json({ order_id: existing.id, status: 'paid', total: existing.total, duplicate: true }),
          )
        }
      }

      const stockMatch = rpcError?.message?.match(/INSUFFICIENT_STOCK:(\d+)/)
      if (stockMatch) {
        const product = productMap.get(parseInt(stockMatch[1], 10))
        return NextResponse.json(
          { error: `Niewystarczający stan magazynowy: ${product?.name ?? stockMatch[1]}` },
          { status: 409 },
        )
      }

      console.error('[checkout] checkout_create_order failed:', rpcError)
      return NextResponse.json({ error: 'Nie udało się utworzyć zamówienia' }, { status: 500 })
    }

    const { order_id: orderId, order_total: total } = rpcData[0]

    // Push to BaseLinker — non-fatal: checkout succeeds even if BL is unreachable.
    // blockedRetries: 0 → if BL rate-limits, fail fast instead of hanging the
    // customer's request; /api/shop/orders/sync retries orphans later.
    // Skip if no BL status is configured (avoids ERROR_BAD_ORDER_STATUS_ID).
    // BASELINKER_STATUS_PAID is the canonical var from .env.local.example;
    // BASELINKER_ORDER_STATUS_ID kept as an override for backwards compat.
    const blStatusId = parseInt(
      process.env.BASELINKER_ORDER_STATUS_ID ?? process.env.BASELINKER_STATUS_PAID ?? '0',
      10,
    );
    if (blStatusId === 0) {
      console.log('[checkout] Skipping BaseLinker push — BASELINKER_ORDER_STATUS_ID not set');
    } else try {
      const blOrderId = await addOrder({
        order_status_id: blStatusId,
        currency: 'PLN',
        payment_method: 'Przelew',
        payment_method_cod: 0,
        paid: 1,
        user_login: s.email,
        phone: s.phone || '',
        email: s.email,
        delivery_method: isPickup ? 'Odbiór osobisty' : 'Kurier',
        delivery_price: 0,
        delivery_fullname: `${s.firstName} ${s.lastName}`,
        delivery_address: s.street,
        delivery_city: s.city,
        delivery_postcode: s.zip,
        delivery_country_code: 'PL',
        products: body.items.map(item => {
          const product = productMap.get(item.product_id)!
          return {
            storage: 'db' as const,
            storage_id: 0,
            product_id: String(item.product_id),
            variant_id: 0,
            name: product.name,
            sku: product.sku ?? '',
            ean: product.ean ?? '',
            quantity: item.quantity,
            price_brutto: product.price ?? 0,
            tax_rate: product.tax_rate ?? 23,
          }
        }),
      }, { blockedRetries: 0 })

      await supabase
        .from('orders')
        .update({ baselinker_order_id: blOrderId })
        .eq('id', orderId)

      console.log(`[checkout] BL order created: ${blOrderId} → Supabase order: ${orderId}`)
    } catch (err) {
      console.error('[checkout] BaseLinker push failed (non-fatal):', err)
    }

    return withSessionCookie(
      NextResponse.json({
        order_id: orderId,
        session_token: sessionId,
        status: 'paid',
        total,
      }),
    )
  } catch {
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 })
  }
}
