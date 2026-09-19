import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ORDER_SESSION_COOKIE, parseOrderSessions } from '@/lib/shop/orderSession'

/**
 * Claims guest orders for the currently logged-in user.
 *
 * Two claim paths:
 * 1. Session tokens from the order_session cookie — exact match to orders
 *    placed in this browser before the account existed.
 * 2. Email match in shipping_address — catches cases where the cookie has
 *    expired or the user logs in from a different browser.
 *
 * Both paths only touch orders where user_id IS NULL (never overwrite another
 * user's orders). Called after login and after email confirmation.
 */
export async function POST(req: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const tokens = parseOrderSessions(req.cookies.get(ORDER_SESSION_COOKIE)?.value)

  let claimed = 0

  if (tokens.length > 0) {
    const { data } = await admin
      .from('orders')
      .update({ user_id: user.id })
      .in('session_id', tokens)
      .is('user_id', null)
      .select('id')
    claimed += data?.length ?? 0
  }

  if (user.email) {
    const { data } = await admin
      .from('orders')
      .update({ user_id: user.id })
      .filter('shipping_address->>email', 'eq', user.email)
      .is('user_id', null)
      .select('id')
    claimed += data?.length ?? 0
  }

  return NextResponse.json({ claimed })
}
