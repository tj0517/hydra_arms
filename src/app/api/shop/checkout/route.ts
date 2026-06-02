import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { addOrder } from '@/lib/baselinker/client'

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

export async function POST(req: NextRequest) {
  try {
    const body: CheckoutBody = await req.json()

    if (!body.items?.length) {
      return NextResponse.json({ error: 'Koszyk jest pusty' }, { status: 400 })
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
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ error: 'Nieprawidłowa ilość' }, { status: 400 })
      }
    }

    const supabase = createAdminClient()

    // Get logged-in user if present
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()

    if (body.idempotency_key) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('session_id', body.idempotency_key)
        .single()

      if (existing) {
        return NextResponse.json({ order_id: existing.id, status: 'paid', duplicate: true })
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
      if (product.product_type !== 'standard' && !isPickup) {
        return NextResponse.json({ error: `Produkt "${product.name}" jest dostępny wyłącznie do odbioru osobistego` }, { status: 400 })
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Niewystarczający stan magazynowy: ${product.name}` }, { status: 400 })
      }
    }

    const total = body.items.reduce((sum, item) => {
      const product = productMap.get(item.product_id)!
      return sum + (product.price ?? 0) * item.quantity
    }, 0)

    const sessionId = body.idempotency_key || crypto.randomUUID()

    // Atomic stock deduction — uses `stock = stock - N WHERE stock >= N`
    // If any product fails the WHERE clause, the update affects 0 rows → rollback
    for (const item of body.items) {
      const { data: updated } = await supabase
        .from('shop_products')
        .update({ stock: productMap.get(item.product_id)!.stock - item.quantity })
        .eq('id', item.product_id)
        .gte('stock', item.quantity)
        .select('id')

      if (!updated?.length) {
        // Rollback any stock deductions already done
        for (const prev of body.items) {
          if (prev.product_id === item.product_id) break
          const original = productMap.get(prev.product_id)!
          await supabase
            .from('shop_products')
            .update({ stock: original.stock })
            .eq('id', prev.product_id)
        }
        const product = productMap.get(item.product_id)!
        return NextResponse.json({ error: `Niewystarczający stan magazynowy: ${product.name}` }, { status: 409 })
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        session_id: sessionId,
        user_id: user?.id ?? null,
        status: 'paid',
        shipping_address: body.shipping,
        total: Math.round(total * 100) / 100,
        fulfillment_route: body.fulfillment_route ?? 'consolidated',
      })
      .select('id')
      .single()

    if (orderError || !order) {
      // Rollback stock
      for (const item of body.items) {
        const original = productMap.get(item.product_id)!
        await supabase
          .from('shop_products')
          .update({ stock: original.stock })
          .eq('id', item.product_id)
      }
      return NextResponse.json({ error: 'Nie udało się utworzyć zamówienia' }, { status: 500 })
    }

    const orderItems = body.items.map(item => {
      const product = productMap.get(item.product_id)!
      return {
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price ?? 0,
        product_snapshot: {
          name: product.name,
          sku: product.sku,
          images: product.images,
        },
      }
    })

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id)
      for (const item of body.items) {
        const original = productMap.get(item.product_id)!
        await supabase
          .from('shop_products')
          .update({ stock: original.stock })
          .eq('id', item.product_id)
      }
      return NextResponse.json({ error: 'Nie udało się zapisać pozycji zamówienia' }, { status: 500 })
    }

    // Push to BaseLinker — non-fatal: checkout succeeds even if BL is unreachable
    try {
      const blOrderId = await addOrder({
        order_status_id: parseInt(process.env.BASELINKER_ORDER_STATUS_ID ?? '0', 10),
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
      })

      await supabase
        .from('orders')
        .update({ baselinker_order_id: blOrderId })
        .eq('id', order.id)

      console.log(`[checkout] BL order created: ${blOrderId} → Supabase order: ${order.id}`)
    } catch (err) {
      console.error('[checkout] BaseLinker push failed (non-fatal):', err)
    }

    const res = NextResponse.json({
      order_id: order.id,
      session_token: sessionId,
      status: 'paid',
      total: Math.round(total * 100) / 100,
    })

    res.cookies.set('order_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return res
  } catch {
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 })
  }
}
