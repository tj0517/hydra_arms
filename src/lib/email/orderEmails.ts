import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResendClient, isEmailMockMode } from './resendClient'
import { incrementEmailMockCounter, type OrderEmailType } from './mockCounter'
import { getCompanyInfo } from './company'
import { renderOrderReceivedEmail, renderPaymentReceivedEmail, type OrderEmailData } from './templates'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'zamowienia@hydra-arms.com'

type MarkerColumn = 'order_received_email_sent_at' | 'payment_received_email_sent_at'

/**
 * Atomically claims the send marker: a single conditional UPDATE ... WHERE
 * col IS NULL. Only the caller that flips NULL → now() may proceed with the
 * send; every other/concurrent/retried caller sees claimed=false and returns.
 */
async function claimMarker(orderId: string, column: MarkerColumn): Promise<boolean> {
  const supabase = createAdminClient()
  const update =
    column === 'order_received_email_sent_at'
      ? { order_received_email_sent_at: new Date().toISOString() }
      : { payment_received_email_sent_at: new Date().toISOString() }

  const { data, error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .is(column, null)
    .select('id')

  if (error) {
    console.error(`[orderEmails] claim ${column} failed for order ${orderId}:`, error)
    return false
  }
  return (data?.length ?? 0) > 0
}

// A send failure must leave the marker unset so a later retry can try again.
async function releaseMarker(orderId: string, column: MarkerColumn): Promise<void> {
  const supabase = createAdminClient()
  const update =
    column === 'order_received_email_sent_at'
      ? { order_received_email_sent_at: null }
      : { payment_received_email_sent_at: null }

  const { error } = await supabase.from('orders').update(update).eq('id', orderId)
  if (error) console.error(`[orderEmails] release ${column} failed for order ${orderId}:`, error)
}

async function loadOrderEmailData(orderId: string): Promise<OrderEmailData | null> {
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, total, shipping_address, fulfillment_route')
    .eq('id', orderId)
    .single()

  if (!order?.shipping_address) return null

  const { data: items } = await supabase
    .from('order_items')
    .select('quantity, unit_price, product_snapshot')
    .eq('order_id', orderId)

  if (!items?.length) return null

  const addr = order.shipping_address as Record<string, string>
  const company = await getCompanyInfo()

  return {
    orderId: order.id,
    total: order.total ?? 0,
    fulfillmentRoute: order.fulfillment_route,
    firstName: addr.firstName ?? '',
    lastName: addr.lastName ?? '',
    email: addr.email ?? '',
    items: items.map(item => ({
      name: ((item.product_snapshot as Record<string, unknown> | null)?.name as string) ?? 'Produkt',
      quantity: item.quantity,
      unitPrice: item.unit_price,
    })),
    company,
  }
}

async function deliver(opts: {
  to: string
  subject: string
  html: string
  orderId: string
  type: OrderEmailType
}): Promise<void> {
  if (!opts.to) throw new Error('Missing recipient email address')

  if (isEmailMockMode()) {
    incrementEmailMockCounter(opts.orderId, opts.type)
    console.log(
      `[email:mock] type=${opts.type} orderId=${opts.orderId} to=${opts.to} subject="${opts.subject}"\n${opts.html}`,
    )
    return
  }

  const resend = getResendClient()
  const { error } = await resend.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html })
  if (error) throw new Error(`Resend error: ${error.message}`)
  console.log(`[email:sent] type=${opts.type} orderId=${opts.orderId}`)
}

export async function sendOrderReceivedEmail(orderId: string): Promise<void> {
  const column: MarkerColumn = 'order_received_email_sent_at'
  try {
    if (!(await claimMarker(orderId, column))) return

    const data = await loadOrderEmailData(orderId)
    if (!data) {
      await releaseMarker(orderId, column)
      return
    }

    const { subject, html } = renderOrderReceivedEmail(data)
    await deliver({ to: data.email, subject, html, orderId, type: 'order_received' })
  } catch (err) {
    console.error(`[sendOrderReceivedEmail] failed for order ${orderId} (non-fatal):`, err)
    await releaseMarker(orderId, column).catch(() => {})
  }
}

/**
 * Called unconditionally from markOrderPaid() after every RPC call — including
 * the idempotent recovery re-calls where `changed` is already false. The
 * marker (not `changed`) is what makes this idempotent; see HA-2.07 red proof.
 */
export async function sendPaymentReceivedEmail(orderId: string): Promise<void> {
  const column: MarkerColumn = 'payment_received_email_sent_at'
  try {
    if (!(await claimMarker(orderId, column))) return

    const data = await loadOrderEmailData(orderId)
    if (!data) {
      await releaseMarker(orderId, column)
      return
    }

    const { subject, html } = renderPaymentReceivedEmail(data)
    await deliver({ to: data.email, subject, html, orderId, type: 'payment_received' })
  } catch (err) {
    console.error(`[sendPaymentReceivedEmail] failed for order ${orderId} (non-fatal):`, err)
    await releaseMarker(orderId, column).catch(() => {})
  }
}
