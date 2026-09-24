import { createHash } from 'crypto'

// Pure P24 signing formulas — no env access, no server-only.
// CRC key must be passed as an argument from the caller (index.ts reads it from env).
// All signs: SHA-384 hex of JSON.stringify({...fields, crc}) with keys in exact documented order.

export function sha384hex(s: string): string {
  return createHash('sha384').update(s, 'utf8').digest('hex')
}

/** register sign: {"sessionId","merchantId","amount","currency","crc"} */
export function signRegister(sessionId: string, merchantId: number, amount: number, currency: string, crc: string): string {
  return sha384hex(JSON.stringify({ sessionId, merchantId, amount, currency, crc }))
}

/** verify sign: {"sessionId","orderId","amount","currency","crc"} */
export function signVerify(sessionId: string, orderId: number, amount: number, currency: string, crc: string): string {
  return sha384hex(JSON.stringify({ sessionId, orderId, amount, currency, crc }))
}

/**
 * notification sign:
 * {"merchantId","posId","sessionId","amount","originAmount","currency","orderId","methodId","statement","crc"}
 */
export function signNotification(
  merchantId: number, posId: number, sessionId: string,
  amount: number, originAmount: number, currency: string,
  orderId: number, methodId: number, statement: string,
  crc: string,
): string {
  return sha384hex(JSON.stringify({
    merchantId, posId, sessionId, amount, originAmount, currency,
    orderId, methodId, statement, crc,
  }))
}
