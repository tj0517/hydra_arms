/**
 * In-process order-email send counter, keyed by (orderId, emailType).
 * Only incremented when isEmailMockMode() is true; the real Resend send path
 * never touches this. Mirrors src/lib/baselinker/mockCounter.ts.
 * Module-level state — survives within a single Next.js dev server process.
 */
export type OrderEmailType = 'order_received' | 'payment_received'

const counters = new Map<string, number>()

function key(orderId: string, type: OrderEmailType): string {
  return `${orderId}:${type}`
}

export function incrementEmailMockCounter(orderId: string, type: OrderEmailType): void {
  const k = key(orderId, type)
  counters.set(k, (counters.get(k) ?? 0) + 1)
}

export function getEmailMockCounter(orderId: string, type: OrderEmailType): number {
  return counters.get(key(orderId, type)) ?? 0
}

export function resetEmailMockCounter(orderId: string, type: OrderEmailType): void {
  counters.delete(key(orderId, type))
}
