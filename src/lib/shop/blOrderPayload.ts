import type { BLAddOrderParams } from '@/lib/baselinker/client'
import { isShippingMethod, SHIPPING_METHOD_LABELS } from '@/lib/shop/shipping'

/**
 * The one BaseLinker addOrder payload for a Supabase order (HA-2.02) — used by
 * markOrderPaid and by the orphan retry in /api/shop/orders/sync, which used to
 * build it twice (and both sent delivery_price: 0).
 *
 * Delivery comes from the order row: method label, the cost stored by
 * checkout_create_order and, for InPost Paczkomat, the delivery point. The
 * fulfillment route (own stock vs supplier) goes to admin_comments, because
 * delivery_method is limited to 30 characters.
 */

// One literal (not concatenated) so supabase-js can infer the row type from it.
export const BL_ORDER_COLUMNS =
  'id, shipping_address, fulfillment_route, shipping_method, shipping_cost, delivery_point_id, delivery_point_name, delivery_point_address, delivery_point_postcode, delivery_point_city' as const

export interface BlOrderRow {
  shipping_address: unknown
  fulfillment_route: string | null
  shipping_method: string | null
  shipping_cost: number | null
  delivery_point_id: string | null
  delivery_point_name: string | null
  delivery_point_address: string | null
  delivery_point_postcode: string | null
  delivery_point_city: string | null
}

export interface BlOrderItemRow {
  quantity: number
  unit_price: number
  product_snapshot: unknown
}

function routeComment(route: string | null): string {
  switch (route) {
    case 'pickup':
      return 'Odbiór osobisty w Hydra Arms'
    case 'own':
      return 'Realizacja: magazyn własny'
    case 'sourced':
      return 'Realizacja: zamówienie u dostawcy'
    default:
      return ''
  }
}

function deliveryMethodLabel(order: BlOrderRow): string {
  if (isShippingMethod(order.shipping_method)) return SHIPPING_METHOD_LABELS[order.shipping_method]
  // Orders created before migration 018 carry no method.
  return order.fulfillment_route === 'pickup' ? 'Odbiór osobisty' : 'Kurier'
}

export function buildBlOrderParams(
  order: BlOrderRow,
  items: BlOrderItemRow[],
  orderStatusId: number,
): BLAddOrderParams {
  const addr = (order.shipping_address ?? {}) as Record<string, string>
  const isLocker = order.shipping_method === 'inpost_locker' && !!order.delivery_point_id

  return {
    order_status_id: orderStatusId,
    currency: 'PLN',
    payment_method: 'Przelew',
    payment_method_cod: 0,
    paid: 1,
    user_login: addr.email ?? '',
    phone: addr.phone ?? '',
    email: addr.email ?? '',
    admin_comments: routeComment(order.fulfillment_route),
    delivery_method: deliveryMethodLabel(order),
    delivery_price: Number(order.shipping_cost ?? 0),
    delivery_fullname: `${addr.firstName ?? ''} ${addr.lastName ?? ''}`.trim(),
    delivery_address: addr.street ?? '',
    delivery_city: addr.city ?? '',
    delivery_postcode: addr.zip ?? '',
    delivery_country_code: 'PL',
    ...(isLocker
      ? {
          delivery_point_id: order.delivery_point_id ?? '',
          delivery_point_name: order.delivery_point_name ?? `Paczkomat ${order.delivery_point_id}`,
          delivery_point_address: order.delivery_point_address ?? '',
          delivery_point_postcode: order.delivery_point_postcode ?? '',
          delivery_point_city: order.delivery_point_city ?? '',
        }
      : {}),
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
  }
}
