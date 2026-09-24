/**
 * In-process BL addOrder call counter per Supabase order_id.
 * Only used when BASELINKER_MOCK=true; the real BL client path is not touched.
 * Module-level state — survives within a single Next.js dev server process.
 */
const counters = new Map<string, number>()

export function incrementBlMockCounter(orderId: string): void {
  counters.set(orderId, (counters.get(orderId) ?? 0) + 1)
}

export function getBlMockCounter(orderId: string): number {
  return counters.get(orderId) ?? 0
}

export function resetBlMockCounter(orderId: string): void {
  counters.delete(orderId)
}
