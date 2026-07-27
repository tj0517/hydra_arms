import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ORDER_SESSION_COOKIE, parseOrderSessions } from '@/lib/shop/orderSession'

/**
 * Guest equivalent of /konto/zamowienia — lists every order the current
 * order_session cookie grants access to (up to 5 tokens, newest checkouts
 * first). Needed because a split checkout produces two orders and a guest
 * has no account page to find the second one.
 */
export async function GET(req: NextRequest) {
  const tokens = parseOrderSessions(req.cookies.get(ORDER_SESSION_COOKIE)?.value)
  if (tokens.length === 0) {
    return NextResponse.json({ orders: [] })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total, shipping_address, fulfillment_route, created_at, session_id')
    .in('session_id', tokens)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const orders = (data ?? []).map(({ session_id: _session_id, ...safe }) => safe)
  return NextResponse.json({ orders })
}
