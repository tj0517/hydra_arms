import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ids: unknown = body.ids

    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      return NextResponse.json({ error: 'Invalid ids' }, { status: 400 })
    }

    const numericIds = ids.filter((id): id is number => Number.isInteger(id))
    if (numericIds.length === 0) {
      return NextResponse.json({ products: [] })
    }

    const sb = createPublicClient()
    if (!sb) return NextResponse.json({ products: [] })

    const { data, error } = await sb
      .from('shop_products')
      .select('id, name, price, stock, is_active')
      .in('id', numericIds)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ products: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
