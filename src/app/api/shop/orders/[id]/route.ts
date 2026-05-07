import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const sessionToken = req.cookies.get('order_session')?.value
  if (!sessionToken) {
    return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, total, shipping_address, created_at, session_id')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Zamówienie nie znalezione' }, { status: 404 })
    }

    if (order.session_id !== sessionToken) {
      return NextResponse.json({ error: 'Brak dostępu do tego zamówienia' }, { status: 403 })
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, unit_price, product_snapshot')
      .eq('order_id', id)

    const { session_id: _, ...safeOrder } = order
    return NextResponse.json({ ...safeOrder, items: items ?? [] })
  } catch {
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 })
  }
}
