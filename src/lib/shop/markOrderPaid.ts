import 'server-only'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { addOrder } from '@/lib/baselinker/client'
import { SHOP_CACHE_TAG } from '@/lib/shop/fetchProducts'

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
  if (!changed) return { changed: false }

  // Status just changed to paid — reserved stock window opened, bust cache.
  revalidateTag(SHOP_CACHE_TAG, 'max')

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
    .select('id, shipping_address, fulfillment_route')
    .eq('id', orderId)
    .single()

  if (!order) return { changed: true }

  const { data: items } = await supabase
    .from('order_items')
    .select('quantity, unit_price, product_snapshot')
    .eq('order_id', orderId)

  if (!items?.length) return { changed: true }

  const addr = order.shipping_address as Record<string, string> | null
  if (!addr) return { changed: true }

  const isPickup = order.fulfillment_route === 'pickup'

  try {
    const blOrderId = await addOrder(
      {
        order_status_id: blStatusId,
        currency: 'PLN',
        payment_method: 'Przelew',
        payment_method_cod: 0,
        paid: 1,
        user_login: addr.email ?? '',
        phone: addr.phone ?? '',
        email: addr.email ?? '',
        delivery_method: isPickup
          ? 'Odbiór osobisty'
          : order.fulfillment_route === 'own'
          ? 'Kurier — magazyn własny'
          : 'Kurier — zamówienie u dostawcy',
        delivery_price: 0,
        delivery_fullname: `${addr.firstName ?? ''} ${addr.lastName ?? ''}`.trim(),
        delivery_address: addr.street ?? '',
        delivery_city: addr.city ?? '',
        delivery_postcode: addr.zip ?? '',
        delivery_country_code: 'PL',
        products: items.map(item => {
          const snap = (item.product_snapshot ?? {}) as Record<string, unknown>
          return {
            storage: 'db' as const,
            storage_id: 0,
            product_id: String(snap.id ?? '0'),
            variant_id: 0,
            name: (snap.name as string) ?? 'Produkt',
            sku: (snap.sku as string) ?? '',
            ean: (snap.ean as string) ?? '',
            quantity: item.quantity,
            price_brutto: item.unit_price,
            tax_rate: (snap.tax_rate as number) ?? 23,
          }
        }),
      },
      { blockedRetries: 0 },
    )

    await supabase
      .from('orders')
      .update({ baselinker_order_id: blOrderId })
      .eq('id', orderId)

    // BL now owns the reservation — bust cache so displayed stock is restored.
    revalidateTag(SHOP_CACHE_TAG, 'max')

    console.log(`[markOrderPaid] BL order created: ${blOrderId} → order: ${orderId}`)
    return { changed: true, blOrderId }
  } catch (err) {
    console.error('[markOrderPaid] BL push failed (non-fatal):', err)
    return { changed: true }
  }
}
