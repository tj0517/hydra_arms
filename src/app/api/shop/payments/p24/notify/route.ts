import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseNotifyBody, verifyNotifySign, verifyTransaction } from '@/lib/p24'
import { markOrderPaid } from '@/lib/shop/markOrderPaid'

export async function POST(req: NextRequest) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 1. Validate body schema
  const body = parseNotifyBody(raw)
  if (!body) {
    return NextResponse.json({ error: 'Invalid notification body' }, { status: 400 })
  }

  // 2. Verify CRC signature (constant-time)
  if (!verifyNotifySign(body)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 3. Find the payment attempt by sessionId
  const { data: attempt, error: attemptErr } = await supabase
    .from('order_payments')
    .select('id, order_id, amount_grosz, currency, status')
    .eq('p24_session_id', body.sessionId)
    .single()

  if (attemptErr || !attempt) {
    return NextResponse.json({ error: 'Unknown sessionId' }, { status: 404 })
  }

  // 4. Idempotency: already verified — return 200 without re-processing
  if (attempt.status === 'verified') {
    return NextResponse.json({ ok: true })
  }

  // 5. Check amount and currency against the registered attempt (not orders.total —
  //    HA-2.02 will add delivery costs and could change the order total after registration)
  if (body.amount !== attempt.amount_grosz || body.originAmount !== attempt.amount_grosz) {
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 422 })
  }
  if (body.currency !== attempt.currency) {
    return NextResponse.json({ error: 'Currency mismatch' }, { status: 422 })
  }

  // 6. Check order status — only call P24 verify for pending_payment orders
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('status')
    .eq('id', attempt.order_id)
    .single()

  if (orderErr || !order) {
    console.error('[p24/notify] failed to fetch order:', orderErr)
    return NextResponse.json({ error: 'Order not found' }, { status: 500 })
  }

  if (order.status !== 'pending_payment') {
    // Order is already paid, cancelled, shipped, etc. — mark attempt as duplicate, do NOT call verify
    console.warn(
      `[p24/notify] duplicate_rejected: order=${attempt.order_id} status=${order.status} attempt=${attempt.id} p24_orderId=${body.orderId}`,
    )
    const { error: dupErr } = await supabase
      .from('order_payments')
      .update({ status: 'duplicate_rejected', p24_order_id: body.orderId })
      .eq('id', attempt.id)
    if (dupErr) {
      console.error('[p24/notify] failed to mark duplicate_rejected:', dupErr)
      return NextResponse.json({ error: 'Failed to record duplicate' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // 7. Verify with P24 (mock always returns true)
  const verified = await verifyTransaction(body.sessionId, body.orderId, body.amount, body.currency)
  if (!verified) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 502 })
  }

  // 8. Mark attempt as verified, then mark order as paid
  const { error: verifyUpdateErr } = await supabase
    .from('order_payments')
    .update({
      status: 'verified',
      p24_order_id: body.orderId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', attempt.id)

  if (verifyUpdateErr) {
    console.error('[p24/notify] failed to mark attempt verified:', verifyUpdateErr)
    return NextResponse.json({ error: 'Failed to record verification' }, { status: 500 })
  }

  await markOrderPaid(attempt.order_id)

  return NextResponse.json({ ok: true })
}
