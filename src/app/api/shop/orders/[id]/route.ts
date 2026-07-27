import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ORDER_SESSION_COOKIE, parseOrderSessions, getSiblingSessionId } from '@/lib/shop/orderSession'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const supabase = createAdminClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, total, shipping_address, created_at, session_id, user_id')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Zamówienie nie znalezione' }, { status: 404 })
    }

    // Accept access via auth session (logged-in user) or order_session cookie (guest)
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()

    if (user) {
      if (order.user_id !== user.id) {
        return NextResponse.json({ error: 'Brak dostępu do tego zamówienia' }, { status: 403 })
      }
    } else {
      const tokens = parseOrderSessions(req.cookies.get(ORDER_SESSION_COOKIE)?.value)
      if (!order.session_id || !tokens.includes(order.session_id)) {
        return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
      }
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, unit_price, product_snapshot')
      .eq('order_id', id)

    // A split checkout (mixed cart) creates two orders — surface the other
    // half so the customer isn't only ever shown the shipped leg.
    let related_order: { id: string; fulfillment_route: string | null } | null = null
    const siblingSessionId = order.session_id ? getSiblingSessionId(order.session_id) : null
    if (siblingSessionId) {
      const { data: sibling } = await supabase
        .from('orders')
        .select('id, fulfillment_route, user_id')
        .eq('session_id', siblingSessionId)
        .single()
      // Defense in depth: only surface it if it genuinely belongs to the same
      // party (same user, or both guest orders) — should always hold true
      // since the sibling session id is only derivable from this exact order.
      if (sibling && sibling.user_id === order.user_id) {
        related_order = { id: sibling.id, fulfillment_route: sibling.fulfillment_route }
      }
    }

    const { session_id: _, user_id: __, ...safeOrder } = order
    return NextResponse.json({ ...safeOrder, items: items ?? [], related_order })
  } catch {
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 })
  }
}
