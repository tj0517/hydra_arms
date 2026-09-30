import { NextRequest, NextResponse } from 'next/server'
import { isEmailMockMode } from '@/lib/email/resendClient'
import { getEmailMockCounter, type OrderEmailType } from '@/lib/email/mockCounter'

const VALID_TYPES: OrderEmailType[] = ['order_received', 'payment_received']

// Only available in email mock mode (no RESEND_API_KEY or RESEND_MOCK=true) — 404 otherwise
export async function GET(req: NextRequest) {
  if (!isEmailMockMode()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const orderId = req.nextUrl.searchParams.get('orderId')
  const type = req.nextUrl.searchParams.get('type') as OrderEmailType | null
  if (!orderId || !type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Missing or invalid orderId/type' }, { status: 400 })
  }

  return NextResponse.json({ orderId, type, count: getEmailMockCounter(orderId, type) })
}
