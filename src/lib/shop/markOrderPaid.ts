import 'server-only'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { addOrder } from '@/lib/baselinker/client'
import { incrementBlMockCounter, recordBlMockDelivery } from '@/lib/baselinker/mockCounter'
import { BL_ORDER_COLUMNS, buildBlOrderParams } from '@/lib/shop/blOrderPayload'
import { SHOP_CACHE_TAG } from '@/lib/shop/shopCache'
import { sendPaymentReceivedEmail } from '@/lib/email/orderEmails'
import { canPushToBaseLinker } from '@/lib/shop/shopMode'

/**
 * Atomically transitions an order from pending_payment → paid, then pushes
 * it to BaseLinker. This is the single entry point for payment confirmation;
 * HA-2.03 (P24 webhook) will call it.
 *
 * Idempotent: if the order is already paid the RPC returns false and no BL
 * push is attempted, so calling it twice produces exactly one BL order.
 */
export async function markOrderPaid(
  orderId: string,
): Promise<{ changed: boolean; blOrderId?: number }> {
  const supabase = createAdminClient()

  const { data: changed, error: rpcError } = await supabase.rpc('mark_order_paid', {
    p_order_id: orderId,
  })

  if (rpcError) throw new Error(`mark_order_paid RPC failed: ${rpcError.message}`)

  // Called on every resolution, including idempotent recovery re-calls where
  // `changed` is already false — the send marker (not `changed`) is what
  // makes this idempotent; see HA-2.07 red proof.
  try {
    await sendPaymentReceivedEmail(orderId)
  } catch (emailErr) {
    console.error('[markOrderPaid] payment received email failed (non-fatal):', emailErr)
  }

  if (!changed) return { changed: false }

  // Status just changed to paid — reserved stock window opened, bust cache.
  revalidateTag(SHOP_CACHE_TAG, 'max')

  // HA-2.08: test orders (created in verification mode) never reach BaseLinker. The column is the
  // source of truth, whatever SHOP_MODE is now; the mode check is a second, independent guard.
  const { data: flag } = await supabase
    .from('orders')
    .select('is_test')
    .eq('id', orderId)
    .single()
  // No row / read error → unknown → fail closed.
  if (!flag || flag.is_test) {
    console.log('[markOrderPaid] Skipping BL push — test order (orders.is_test)')
    return { changed: true }
  }
  if (!canPushToBaseLinker()) {
    console.log('[markOrderPaid] Skipping BL push — SHOP_MODE does not allow it (verification or unknown)')
    return { changed: true }
  }

  const blStatusId = parseInt(
    process.env.BASELINKER_ORDER_STATUS_ID ?? process.env.BASELINKER_STATUS_PAID ?? '0',
    10,
  )
  if (blStatusId === 0) {
    console.log('[markOrderPaid] Skipping BL push — BASELINKER_STATUS_PAID not set')
    return { changed: true }
  }

  const { data: order } = await supabase
    .from('orders')
    .select(BL_ORDER_COLUMNS)
    .eq('id', orderId)
    .single()

  if (!order) return { changed: true }

  const { data: items } = await supabase
    .from('order_items')
    .select('quantity, unit_price, product_snapshot')
    .eq('order_id', orderId)

  if (!items?.length) return { changed: true }

  if (!order.shipping_address) return { changed: true }

  try {
    const params = buildBlOrderParams(order, items, blStatusId)
    const blOrderId = await addOrder(params, { blockedRetries: 0 })

    await supabase
      .from('orders')
      .update({ baselinker_order_id: blOrderId })
      .eq('id', orderId)

    // BL now owns the reservation — bust cache so displayed stock is restored.
    revalidateTag(SHOP_CACHE_TAG, 'max')

    if (process.env.BASELINKER_MOCK === 'true') {
      incrementBlMockCounter(orderId)
      recordBlMockDelivery(orderId, params)
    }
    console.log(`[markOrderPaid] BL order created: ${blOrderId} → order: ${orderId}`)
    return { changed: true, blOrderId }
  } catch (err) {
    console.error('[markOrderPaid] BL push failed (non-fatal):', err)
    return { changed: true }
  }
}
