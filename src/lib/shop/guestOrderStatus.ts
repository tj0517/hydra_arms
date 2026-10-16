import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOrderLinkToken } from './orderLink'

/**
 * What the token-gated guest status page may show (tj decision 2026-10-16):
 * status, items, total, delivery route. No shipping address, no name, e-mail
 * or phone — those columns are never selected.
 */
export interface GuestOrderStatus {
  id: string
  status: string
  total: number
  fulfillment_route: string | null
  items: { name: string; quantity: number; unit_price: number }[]
}

export type GuestOrderResult =
  | { kind: 'ok'; order: GuestOrderStatus }
  | { kind: 'expired' }
  | { kind: 'not_found' }

export async function getGuestOrderStatus(
  orderId: string,
  token: string | null | undefined,
): Promise<GuestOrderResult> {
  // Shape + signature + expiry are decided before any DB lookup.
  const verdict = verifyOrderLinkToken(orderId, token)
  if (verdict === 'expired') return { kind: 'expired' }
  if (verdict !== 'ok') return { kind: 'not_found' }

  try {
    const supabase = createAdminClient()
    const id = orderId.toLowerCase()

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, total, fulfillment_route')
      .eq('id', id)
      .maybeSingle()
    // Valid signature but no such order: same neutral answer as a bad token.
    if (!order) return { kind: 'not_found' }

    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, unit_price, product_snapshot')
      .eq('order_id', id)

    return {
      kind: 'ok',
      order: {
        id: order.id,
        status: order.status,
        total: order.total ?? 0,
        fulfillment_route: order.fulfillment_route,
        // product_snapshot is reduced to the product name — nothing else leaves the server.
        items: (items ?? []).map(item => ({
          name: ((item.product_snapshot as Record<string, unknown> | null)?.name as string | undefined) ?? 'Produkt',
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      },
    }
  } catch (err) {
    console.error(`[guestOrderStatus] lookup failed for order ${orderId}:`, err instanceof Error ? err.message : 'unknown')
    return { kind: 'not_found' }
  }
}
