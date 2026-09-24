import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { registerTransaction, p24PaymentUrl, getP24Mode } from '@/lib/p24'

/**
 * Create a new payment attempt for a pending_payment order.
 * Uses p24_register_attempt RPC which locks the order row (FOR UPDATE)
 * before inserting — prevents two concurrent registrations from both
 * seeing 'pending_payment' and inserting duplicate attempt rows.
 * Returns the URL to redirect the customer to for payment.
 */
export async function registerPayment(
  orderId: string,
  opts: { baseUrl: string; email: string; description?: string },
): Promise<{ paymentUrl: string; p24SessionId: string }> {
  const supabase = createAdminClient()

  const p24SessionId = crypto.randomUUID()
  const urlReturn = `${opts.baseUrl}/sklep/zamowienie/${orderId}`
  const urlStatus = `${opts.baseUrl}/api/shop/payments/p24/notify`

  // Atomically: lock order row FOR UPDATE, check pending_payment, insert attempt
  const { data: amountGrosze, error: rpcErr } = await supabase.rpc('p24_register_attempt', {
    p_order_id: orderId,
    p_session_id: p24SessionId,
    p_currency: 'PLN',
  })

  if (rpcErr) {
    if (rpcErr.message?.includes('ORDER_NOT_FOUND')) throw new Error('Order not found')
    if (rpcErr.message?.includes('ORDER_NOT_PENDING')) {
      const err = new Error('Order is not pending_payment')
      ;(err as NodeJS.ErrnoException).code = 'NOT_PENDING'
      throw err
    }
    throw new Error(`Failed to create payment attempt: ${rpcErr.message}`)
  }

  if (!amountGrosze || amountGrosze <= 0) throw new Error('Order total is zero or negative')

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
