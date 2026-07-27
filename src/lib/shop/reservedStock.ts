import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Quantity already committed to paid-but-unfulfilled orders, per product.
 *
 * The BL/supplier stock feed has no idea an order exists until someone on
 * our side manually sources it from the wholesaler — there is no API
 * round-trip that confirms "supplier has deducted this." So a paid order
 * must keep reserving its stock locally, independent of what the next
 * supplier sync reports, until the order is shipped/delivered (fulfilled
 * for real, at which point the supplier's own count has caught up) or
 * cancelled (never fulfilled, released back to the pool).
 *
 * mapBLStatus() only ever produces 'paid' | 'shipped' | 'delivered' | 'cancelled',
 * so "still reserved" is exactly status = 'paid'.
 */
export async function getReservedQuantities(
  supabase: SupabaseClient,
  productIds: number[],
): Promise<Map<number, number>> {
  const reserved = new Map<number, number>()
  if (productIds.length === 0) return reserved

  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, orders!inner(status)')
    .eq('orders.status', 'paid')
    .in('product_id', productIds)

  if (error) throw new Error(`Reserved stock lookup failed: ${error.message}`)

  for (const row of (data ?? []) as unknown as { product_id: number; quantity: number }[]) {
    reserved.set(row.product_id, (reserved.get(row.product_id) ?? 0) + row.quantity)
  }

  return reserved
}
