import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { analyzeCart } from '@/lib/shop/cartAnalysis'
import { PICKUP_ONLY_SECTIONS } from '@/lib/shop/permitFlags'
import { ORDER_SESSION_COOKIE, appendOrderSession } from '@/lib/shop/orderSession'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { registerPayment } from '@/lib/shop/registerPayment'
import { sendOrderReceivedEmail } from '@/lib/email/orderEmails'
import { getCheckoutGate } from '@/lib/shop/shopMode'
import { isShippingMethod, normalizeLockerCode } from '@/lib/shop/shipping'
import { getShippingPriceList } from '@/lib/shop/shippingPrices'

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
  /** HA-2.08: customer accepted Regulamin + Polityka prywatności. Required (=== true) in every mode. */
  terms_accepted?: boolean
  /** HA-2.02: delivery method id (allow-list). The cost is computed server-side; any amount sent is ignored. */
  shipping_method?: unknown
  /** HA-2.02: InPost Paczkomat for shipping_method = inpost_locker. Only `id` is validated and authoritative. */
  delivery_point?: unknown
}

const FULFILLMENT_ROUTES = ['own', 'sourced', 'pickup']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ZIP_RE = /^\d{2}-\d{3}$/
// HA-2.02 (tj D3): phone required for every shipped method — InPost sends the pickup code by SMS.
const PHONE_RE = /^\+?[0-9][0-9 -]{7,15}[0-9]$/
// Client-generated key = crypto.randomUUID() (+ '-ship'/'-pickup' for split carts).
// It doubles as the guest access token, so reject anything low-entropy.
const IDEMPOTENCY_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-ship|-pickup)?$/i

const MAX_QTY_PER_ITEM = 20

/** Informational Paczkomat fields from the Geowidget: strings only, trimmed, BL length limit. */
function pointField(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, 100)
  return t || null
}

export async function POST(req: NextRequest) {
  // HA-2.08: fail closed before anything is read or written. Unknown SHOP_MODE, or verification
  // mode with a P24 mode other than mock/sandbox, creates no order and no payment row.
  const gate = getCheckoutGate()
  if (!gate.allowed) {
    console.error(`[checkout] refused by shop-mode gate: ${gate.reason}`)
    return NextResponse.json(
      { error: 'Sklep jest chwilowo niedostępny dla zamówień. Spróbuj ponownie później.' },
      { status: 503 },
    )
  }

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

    // HA-2.02: delivery method from the allow-list, consistent with the route; checked before any DB call.
    if (!isShippingMethod(body.shipping_method)) {
      return NextResponse.json({ error: 'Wybierz sposób dostawy' }, { status: 400 })
    }
    const shippingMethod = body.shipping_method
    if (isPickup !== (shippingMethod === 'pickup')) {
      return NextResponse.json({ error: 'Wybrany sposób dostawy nie pasuje do zamówienia' }, { status: 400 })
    }
    let deliveryPoint: { id: string; name: string | null; address: string | null; postcode: string | null; city: string | null } | null = null
    if (shippingMethod === 'inpost_locker') {
      const raw = (typeof body.delivery_point === 'object' && body.delivery_point !== null
        ? body.delivery_point
        : {}) as Record<string, unknown>
      const code = normalizeLockerCode(raw.id)
      if (!code) {
        return NextResponse.json({ error: 'Wybierz Paczkomat lub wpisz poprawny kod automatu (np. KRA01M)' }, { status: 400 })
      }
      deliveryPoint = {
        id: code,
        name: pointField(raw.name),
        address: pointField(raw.address),
        postcode: pointField(raw.postcode),
        city: pointField(raw.city),
      }
    }
    // Price list from env, read only here. Fail closed: no valid price list → no parcel order.
    let shippingPrice: number | null = null
    let freeThreshold: number | null = null
    if (shippingMethod !== 'pickup') {
      const priceList = getShippingPriceList()
      if (!priceList.ok) {
        console.error(`[checkout] shipping price list invalid: ${priceList.invalid.join(', ')}`)
        return NextResponse.json(
          { error: 'Dostawa jest chwilowo niedostępna. Spróbuj ponownie później lub skontaktuj się ze sklepem.' },
          { status: 503 },
        )
      }
      shippingPrice = priceList.priceList.prices[shippingMethod]
      freeThreshold = priceList.priceList.freeThreshold
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

    if (!isPickup && (typeof s.phone !== 'string' || !PHONE_RE.test(s.phone.trim()))) {
      return NextResponse.json({ error: 'Podaj numer telefonu — przewoźnik wysyła na niego powiadomienia' }, { status: 400 })
    }

    for (const item of body.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > MAX_QTY_PER_ITEM) {
        return NextResponse.json({ error: 'Nieprawidłowa ilość' }, { status: 400 })
      }
    }

    // HA-2.08: acceptance of Regulamin + Polityka prywatności is enforced here, not only by the
    // button. Explicit boolean, not "truthy" — same rule as pickup_confirmed.
    if (body.terms_accepted !== true) {
      return NextResponse.json(
        { error: 'Zaakceptuj regulamin sklepu i politykę prywatności, aby złożyć zamówienie' },
        { status: 400 },
      )
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
      p_shipping_method: shippingMethod,
      p_shipping_price: shippingPrice,
      p_free_threshold: freeThreshold,
      p_delivery_point: deliveryPoint,
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

      if (rpcError?.message?.includes('DELIVERY_POINT_REQUIRED')) {
        return NextResponse.json({ error: 'Wybierz Paczkomat lub wpisz poprawny kod automatu (np. KRA01M)' }, { status: 400 })
      }
      if (
        rpcError?.message?.includes('INVALID_SHIPPING_METHOD') ||
        rpcError?.message?.includes('SHIPPING_METHOD_ROUTE_MISMATCH')
      ) {
        return NextResponse.json({ error: 'Wybrany sposób dostawy nie pasuje do zamówienia' }, { status: 400 })
      }
      if (rpcError?.message?.includes('SHIPPING_PRICE_MISSING')) {
        console.error('[checkout] RPC refused: shipping price missing')
        return NextResponse.json(
          { error: 'Dostawa jest chwilowo niedostępna. Spróbuj ponownie później lub skontaktuj się ze sklepem.' },
          { status: 503 },
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

    const { order_id: orderId, order_total: total, order_shipping_cost: shippingCost } = rpcData[0]

    // HA-2.08: an order created in verification mode is a test order, marked BEFORE any payment is
    // registered. If the mark cannot be written we stop here: no payment row, no e-mail, so the
    // order can never become a paid-but-unmarked row that a later live mode would push to BaseLinker.
    if (gate.shopMode === 'verification') {
      const { error: markError } = await supabase
        .from('orders')
        .update({ is_test: true })
        .eq('id', orderId)
      if (markError) {
        console.error(`[checkout] could not mark order ${orderId} as test order:`, markError)
        return NextResponse.json({ error: 'Nie udało się utworzyć zamówienia' }, { status: 500 })
      }
    }

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
        shipping_cost: shippingCost,
        payment_url: paymentUrl,
      }),
    )
  } catch {
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 })
  }
}
