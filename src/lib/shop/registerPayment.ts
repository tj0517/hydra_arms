import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { registerTransaction, p24PaymentUrl, getP24Mode } from '@/lib/p24'

/**
 * Create a new payment attempt for a pending_payment order.
 * Atomically checks order status and inserts order_payments row.
 * Returns the URL to redirect the customer to for payment.
 */
export async function registerPayment(
  orderId: string,
  opts: { baseUrl: string; email: string; description?: string },
): Promise<{ paymentUrl: string; p24SessionId: string }> {
  const supabase = createAdminClient()

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, status, total')
    .eq('id', orderId)
    .single()

  if (orderErr || !order) throw new Error('Order not found')
  if (order.status !== 'pending_payment') {
    const err = new Error('Order is not pending_payment')
    ;(err as NodeJS.ErrnoException).code = 'NOT_PENDING'
    throw err
  }

  const amountGrosze = Math.round((order.total ?? 0) * 100)
  if (amountGrosze <= 0) throw new Error('Order total is zero or negative')

  const p24SessionId = crypto.randomUUID()
  const urlReturn = `${opts.baseUrl}/sklep/zamowienie/${orderId}`
  const urlStatus = `${opts.baseUrl}/api/shop/payments/p24/notify`

  // Insert attempt row before calling P24 so we own the session_id
  const { error: insertErr } = await supabase
    .from('order_payments')
    .insert({
      order_id: orderId,
      p24_session_id: p24SessionId,
      amount_grosz: amountGrosze,
      currency: 'PLN',
    })

  if (insertErr) throw new Error(`Failed to create payment attempt: ${insertErr.message}`)

  const token = await registerTransaction({
    orderId: p24SessionId,
    amountGrosze,
    description: opts.description ?? `Zamówienie ${orderId.slice(0, 8).toUpperCase()}`,
    email: opts.email,
    urlReturn,
    urlStatus,
  })

  const mode = getP24Mode()
  const paymentUrl = mode === 'mock'
    ? `${opts.baseUrl}/sklep/platnosc/mock/${orderId}?sid=${p24SessionId}`
    : p24PaymentUrl(token)

  return { paymentUrl, p24SessionId }
}
