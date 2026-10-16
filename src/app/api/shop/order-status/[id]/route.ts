import { NextRequest, NextResponse } from 'next/server'
import { getGuestOrderStatus } from '@/lib/shop/guestOrderStatus'

const NO_STORE = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }

/**
 * Guest order status behind a signed, expiring link token (HA-2.19).
 * ?t=<token>. Forged / cross-order / malformed token and unknown order all
 * get the same 404, so the response never reveals whether an order exists.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getGuestOrderStatus(id, req.nextUrl.searchParams.get('t'))

  if (result.kind === 'ok') return NextResponse.json({ order: result.order }, { headers: NO_STORE })
  if (result.kind === 'expired') return NextResponse.json({ error: 'expired' }, { status: 410, headers: NO_STORE })
  return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE })
}
