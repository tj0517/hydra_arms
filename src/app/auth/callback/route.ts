import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ORDER_SESSION_COOKIE, parseOrderSessions } from '@/lib/shop/orderSession'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/konto'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Claim any guest orders placed before this account existed
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdminClient()
        const tokens = parseOrderSessions(cookieStore.get(ORDER_SESSION_COOKIE)?.value)

        if (tokens.length > 0) {
          await admin.from('orders').update({ user_id: user.id })
            .in('session_id', tokens).is('user_id', null)
        }
        if (user.email) {
          await admin.from('orders').update({ user_id: user.id })
            .filter('shipping_address->>email', 'eq', user.email).is('user_id', null)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/konto/login?error=auth`)
}
