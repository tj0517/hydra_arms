import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { analyzeCart } from '@/lib/shop/cartAnalysis'
import { PICKUP_ONLY_SECTIONS } from '@/lib/shop/permitFlags'
import { ORDER_SESSION_COOKIE, appendOrderSession } from '@/lib/shop/orderSession'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { registerPayment } from '@/lib/shop/registerPayment'
import { sendOrderReceivedEmail } from '@/lib/email/orderEmails'

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
  fulfillment_route?: 'own' | 'sourced' | 'pickup'
  /** HA-2.06: customer confirms age/permits are checked at pickup. Required (=== true) for pickup. */
  pickup_confirmed?: boolean
}

const FULFILLMENT_ROUTES = ['own', 'sourced', 'pickup']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ZIP_RE = /^\d{2}-\d{3}$/
// Client-generated key = crypto.randomUUID() (+ '-ship'/'-pickup' for split carts).
// It doubles as the guest access token, so reject anything low-entropy.
const IDEMPOTENCY_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-ship|-pickup)?$/i

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
    const s = body.shipping
    const isPickup = body.fulfillment_route === 'pickup'

    if (body.fulfillment_route !== undefined && !FULFILLMENT_ROUTES.includes(body.fulfillment_route)) {
      return NextResponse.json({ error: 'Nieprawidłowy sposób realizacji' }, { status: 400 })
    }
    if (body.pickup_confirmed !== undefined && typeof body.pickup_confirmed !== 'boolean') {
      return NextResponse.json({ error: 'Nieprawidłowe potwierdzenie odbioru' }, { status: 400 })
    }
    // Explicit boolean, not "truthy": a pickup order must carry pickup_confirmed === true.
    if (isPickup && body.pickup_confirmed !== true) {
      return NextResponse.json(
        { error: 'Potwierdź, że wiek i uprawnienia zostaną sprawdzone przy odbiorze osobistym' },
        { status: 400 },
      )
    }

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
        .select('id, status, total')
        .eq('session_id', idempotencyKey)
        .single()

      if (existing) {
        return withSessionCookie(
          NextResponse.json({ order_id: existing.id, status: existing.status, total: existing.total, duplicate: true }),
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

    // Hydra section 01/02 forces pickup even when no flag is set (HA-2.06). The
    // section comes from the single SQL function hydra_section(); the RPC applies
    // the same rule again on its own. Fail closed if the lookup errors.
    const categoryIds = [...new Set(products.map(p => p.category_id).filter((c): c is number => c != null))]
    const sectionEntries = await Promise.all(
      categoryIds.map(async id => {
        const { data, error } = await supabase.rpc('hydra_section', { p_category_id: id })
        return { id, section: data as string | null, error }
      }),
    )
    if (sectionEntries.some(e => e.error)) {
      console.error('[checkout] hydra_section lookup failed:', sectionEntries.find(e => e.error)?.error)
      return NextResponse.json({ error: 'Nie udało się zweryfikować produktów' }, { status: 500 })
    }
    const pickupOnlyCategories = new Set(
      sectionEntries.filter(e => e.section !== null && PICKUP_ONLY_SECTIONS.has(e.section)).map(e => e.id),
    )

    for (const item of body.items) {
      const product = productMap.get(item.product_id)
      if (!product) {
        return NextResponse.json({ error: `Produkt ${item.product_id} nie istnieje lub jest nieaktywny` }, { status: 400 })
      }
      // A product must be picked up in person when ANY restriction applies.
      // age_min >= 18 and requires_license are ALWAYS pickup-only — age and
      // license are verified in person at Hydra Arms. Online age verification
      // (user_profiles.age_verified) is NOT implemented and must NOT be used
      // here to bypass pickup enforcement.
      const mustPickup =
        product.product_type !== 'standard' ||
        product.requires_license ||
        !product.delivery_allowed ||
        product.age_min >= 18 ||
        (product.category_id != null && pickupOnlyCategories.has(product.category_id))
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
      p_pickup_confirmed: isPickup && body.pickup_confirmed === true,
    })

    if (rpcError || !rpcData?.length) {
      // Unique violation on session_id → a concurrent duplicate won the race
      if (rpcError?.code === '23505') {
        const { data: existing } = await supabase
          .from('orders')
          .select('id, status, total')
          .eq('session_id', sessionId)
          .single()
        if (existing) {
          return withSessionCookie(
            NextResponse.json({ order_id: existing.id, status: existing.status, total: existing.total, duplicate: true }),
          )
        }
      }

      // Defence in depth: the route refuses first; these only fire if the RPC sees
      // a state the route did not (e.g. a flag changed between the two reads).
      const pickupMatch = rpcError?.message?.match(/PICKUP_ONLY:(\d+)/)
      if (pickupMatch) {
        const product = productMap.get(parseInt(pickupMatch[1], 10))
        return NextResponse.json(
          { error: `Produkt "${product?.name ?? pickupMatch[1]}" jest dostępny wyłącznie do odbioru osobistego` },
          { status: 400 },
        )
      }
      if (rpcError?.message?.includes('PICKUP_CONFIRMATION_REQUIRED')) {
        return NextResponse.json(
          { error: 'Potwierdź, że wiek i uprawnienia zostaną sprawdzone przy odbiorze osobistym' },
          { status: 400 },
        )
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

    // Register a P24 payment attempt and get the redirect URL
    const shipping = body.shipping
    const baseUrl = process.env.SHOP_BASE_URL

    let paymentUrl = `/sklep/zamowienie/${orderId}`
    try {
      const reg = await registerPayment(orderId, {
        baseUrl,
        email: shipping.email,
      })
      paymentUrl = reg.paymentUrl
    } catch (regErr) {
      // Non-fatal: order is created; client falls back to confirmation page
      console.error('[checkout] payment registration failed:', regErr)
    }

    try {
      await sendOrderReceivedEmail(orderId)
    } catch (emailErr) {
      // Non-fatal: order is created regardless of email delivery
      console.error('[checkout] order received email failed:', emailErr)
    }

    return withSessionCookie(
      NextResponse.json({
        order_id: orderId,
        session_token: sessionId,
        status: 'pending_payment',
        total,
        payment_url: paymentUrl,
      }),
    )
  } catch {
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 })
  }
}
