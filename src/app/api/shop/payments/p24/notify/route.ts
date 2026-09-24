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

  // 2. Verify CRC signature (constant-time); assertCrcKeySet() throws if key empty → 500
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

  // 4. Idempotency for terminal states.
  //    'duplicate_rejected' — already handled, no-op
  //    'verified'           — attempt paid; call markOrderPaid again (idempotent) to recover
  //                           if a previous markOrderPaid failed after verify succeeded
  //    'claiming'           — falls through to the claim function below (§6)
  if (attempt.status === 'duplicate_rejected') {
    return NextResponse.json({ ok: true })
  }
  if (attempt.status === 'verified') {
    // Recovery path: attempt verified but order may still be pending_payment if
    // markOrderPaid failed last time.  Calling again is idempotent.
    try {
      await markOrderPaid(attempt.order_id)
    } catch (paidErr) {
      console.error('[p24/notify] markOrderPaid failed in recovery path:', paidErr)
      return NextResponse.json({ error: 'Failed to mark order paid' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }
  // 'registered' or 'claiming' falls through

  // 5. Check amount and currency against the registered attempt (not orders.total)
  if (body.amount !== attempt.amount_grosz || body.originAmount !== attempt.amount_grosz) {
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 422 })
  }
  if (body.currency !== attempt.currency) {
    return NextResponse.json({ error: 'Currency mismatch' }, { status: 422 })
  }

  // 6. Atomically claim this attempt for P24 verify.
  //    New signature: (p_attempt_id uuid, p_p24_order_id bigint)
  //    The SQL function reads order_id from the attempt, locks order FIRST then
  //    attempt (consistent ordering), and writes all rejections under the lock.
  //    Returns:
  //      'claimed'            — this attempt now owns the verify call
  //      'in_progress'        — same attempt already 'claiming' (concurrent); P24 must retry
  //      'duplicate_rejected' — SQL wrote status+p24_order_id; nothing for us to do
  //      'not_found'          — attempt disappeared (defensive; should not happen)
  const { data: claim, error: claimErr } = await supabase.rpc('p24_claim_for_verify', {
    p_attempt_id: attempt.id,
    p_p24_order_id: body.orderId,
  })

  if (claimErr) {
    console.error('[p24/notify] p24_claim_for_verify failed:', claimErr)
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 })
  }

  if (claim === 'not_found') {
    return NextResponse.json({ error: 'Unknown sessionId' }, { status: 404 })
  }

  if (claim === 'in_progress') {
    // Same attempt is being processed by a concurrent request; return 5xx so P24 retries.
    console.warn(`[p24/notify] in_progress: attempt=${attempt.id}`)
    return NextResponse.json({ error: 'In progress' }, { status: 503 })
  }

  if (claim === 'duplicate_rejected') {
    // SQL function wrote status=duplicate_rejected + p24_order_id under the lock
    console.warn(
      `[p24/notify] duplicate_rejected (SQL): attempt=${attempt.id} p24_orderId=${body.orderId}`,
    )
    return NextResponse.json({ ok: true })
  }

  // 'claimed' — proceed with verification

  // 7. Verify with P24 (mock always returns true).
  //    On any failure, release the claim so P24 can retry cleanly.
  let verified: boolean
  try {
    verified = await verifyTransaction(body.sessionId, body.orderId, body.amount, body.currency)
  } catch (verifyErr) {
    console.error('[p24/notify] verifyTransaction threw:', verifyErr)
    const { error: releaseErr } = await supabase.rpc('p24_release_claim', { p_attempt_id: attempt.id })
    if (releaseErr) console.error('[p24/notify] release failed after verify throw:', releaseErr)
    return NextResponse.json({ error: 'Verification error' }, { status: 502 })
  }

  if (!verified) {
    const { error: releaseErr } = await supabase.rpc('p24_release_claim', { p_attempt_id: attempt.id })
    if (releaseErr) console.error('[p24/notify] release failed after verify false:', releaseErr)
    return NextResponse.json({ error: 'Verification failed' }, { status: 502 })
  }

  // 8. Conditional update: only if the attempt is still 'claiming'.
  //    Zero rows updated is unexpected — return 5xx so P24 retries into the §4 recovery path.
  const { data: updated, error: verifyUpdateErr } = await supabase
    .from('order_payments')
    .update({
      status: 'verified',
      p24_order_id: body.orderId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', attempt.id)
    .eq('status', 'claiming')
    .select('id')

  if (verifyUpdateErr) {
    console.error('[p24/notify] failed to mark attempt verified:', verifyUpdateErr)
    return NextResponse.json({ error: 'Failed to record verification' }, { status: 500 })
  }

  if (!updated?.length) {
    console.error('[p24/notify] attempt no longer claiming after verify:', attempt.id)
    return NextResponse.json({ error: 'Unexpected attempt state' }, { status: 500 })
  }

  // 9. Mark the order as paid.  Failure → 5xx so P24 retries; the retry hits the
  //    'verified' recovery path in §4 which calls markOrderPaid again (idempotent).
  try {
    await markOrderPaid(attempt.order_id)
  } catch (paidErr) {
    console.error('[p24/notify] markOrderPaid failed:', paidErr)
    return NextResponse.json({ error: 'Failed to mark order paid' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
