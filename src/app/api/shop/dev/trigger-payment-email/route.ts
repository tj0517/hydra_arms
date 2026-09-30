import { NextRequest, NextResponse } from 'next/server'
import { isEmailMockMode } from '@/lib/email/resendClient'
import { sendPaymentReceivedEmail } from '@/lib/email/orderEmails'

/**
 * Test-only: invokes sendPaymentReceivedEmail() directly for an arbitrary
 * order, independent of the P24 notify flow — needed to prove the
 * status='paid' guard on the marker claim without relying on markOrderPaid's
 * own RPC semantics. Only available in email mock mode — 404 otherwise.
 */
export async function POST(req: NextRequest) {
  if (!isEmailMockMode()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string }
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  }

  await sendPaymentReceivedEmail(orderId)
  return NextResponse.json({ ok: true })
}
