import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getP24Mode, signNotification } from '@/lib/p24'

// Only available when P24_MODE=mock
export async function POST(req: NextRequest) {
  if (getP24Mode() !== 'mock') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: { orderId?: string; p24SessionId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { orderId, p24SessionId } = body
  if (!orderId || !p24SessionId) {
    return NextResponse.json({ error: 'Missing orderId or p24SessionId' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch the payment attempt to get amount and currency
  const { data: attempt, error: attemptErr } = await supabase
    .from('order_payments')
    .select('amount_grosz, currency')
    .eq('p24_session_id', p24SessionId)
    .eq('order_id', orderId)
    .single()

  if (attemptErr || !attempt) {
    return NextResponse.json({ error: 'Payment attempt not found' }, { status: 404 })
  }

  const merchantId = parseInt(process.env.P24_MERCHANT_ID || '999999', 10)
  const posId = parseInt(process.env.P24_POS_ID || '999999', 10)
  // Fake but stable P24 orderId for the mock — use a hash-derived number
  const mockP24OrderId = Math.abs(
    [...p24SessionId].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0),
  ) % 900000000 + 100000000

  const notification = {
    merchantId,
    posId,
    sessionId: p24SessionId,
    amount: attempt.amount_grosz,
    originAmount: attempt.amount_grosz,
    currency: attempt.currency,
    orderId: mockP24OrderId,
    methodId: 25,
    statement: `mock-${p24SessionId.slice(0, 8)}`,
    sign: '',
  }
  notification.sign = signNotification(
    merchantId, posId, p24SessionId,
    attempt.amount_grosz, attempt.amount_grosz, attempt.currency,
    mockP24OrderId, 25, notification.statement,
  )

  // Send the signed notification to the real notify endpoint
  const baseUrl = process.env.SHOP_BASE_URL ?? ''
  const notifyUrl = `${baseUrl}/api/shop/payments/p24/notify`

  const notifyRes = await fetch(notifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notification),
  })

  if (!notifyRes.ok) {
    const text = await notifyRes.text().catch(() => '')
    return NextResponse.json({ error: `Notify failed: ${notifyRes.status} ${text}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
