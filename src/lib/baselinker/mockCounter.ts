/**
 * In-process BL addOrder call counter per Supabase order_id.
 * Only used when BASELINKER_MOCK=true; the real BL client path is not touched.
 * Module-level state — survives within a single Next.js dev server process.
 */
const counters = new Map<string, number>()

/** HA-2.02: delivery part of the last addOrder payload per order — no buyer data is kept. */
export interface BlMockDelivery {
  delivery_method: string
  delivery_price: number
  admin_comments?: string
  delivery_point_id?: string
  delivery_point_name?: string
  delivery_point_address?: string
  delivery_point_postcode?: string
  delivery_point_city?: string
}
const deliveries = new Map<string, BlMockDelivery>()

export function recordBlMockDelivery(orderId: string, d: BlMockDelivery): void {
  deliveries.set(orderId, {
    delivery_method: d.delivery_method,
    delivery_price: d.delivery_price,
    admin_comments: d.admin_comments,
    delivery_point_id: d.delivery_point_id,
    delivery_point_name: d.delivery_point_name,
    delivery_point_address: d.delivery_point_address,
    delivery_point_postcode: d.delivery_point_postcode,
    delivery_point_city: d.delivery_point_city,
  })
}

export function getBlMockDelivery(orderId: string): BlMockDelivery | null {
  return deliveries.get(orderId) ?? null
}

export function incrementBlMockCounter(orderId: string): void {
  counters.set(orderId, (counters.get(orderId) ?? 0) + 1)
}

export function getBlMockCounter(orderId: string): number {
  return counters.get(orderId) ?? 0
}

export function resetBlMockCounter(orderId: string): void {
  counters.delete(orderId)
  deliveries.delete(orderId)
}
