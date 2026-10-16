import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Signed, expiring guest order-status link (HA-2.19).
 *
 * token = `<expUnixSeconds>.<hex HMAC-SHA256(ORDER_LINK_SECRET, "order-status:v1:<orderId>:<exp>")>`
 * The order id is NOT part of the token: it comes from the URL and is bound
 * into the signature, so a token minted for order A never verifies for order B.
 *
 * Fails closed: without ORDER_LINK_SECRET no token is minted and every token
 * is refused. Never throws, never logs the secret or a token.
 */

export const ORDER_LINK_TTL_SECONDS = 30 * 24 * 60 * 60 // tj decision 2026-10-16: 30 days

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const TOKEN_RE = /^(\d{1,12})\.([0-9a-f]{64})$/

export type OrderLinkVerdict = 'ok' | 'expired' | 'invalid'

function getSecret(): string | null {
  const secret = process.env.ORDER_LINK_SECRET
  return secret ? secret : null
}

function sign(secret: string, orderId: string, exp: number): Buffer {
  return createHmac('sha256', secret).update(`order-status:v1:${orderId}:${exp}`).digest()
}

export function createOrderLinkToken(orderId: string, nowMs: number = Date.now()): string | null {
  const secret = getSecret()
  const id = orderId.toLowerCase()
  if (!secret || !UUID_RE.test(id)) return null
  const exp = Math.floor(nowMs / 1000) + ORDER_LINK_TTL_SECONDS
  return `${exp}.${sign(secret, id, exp).toString('hex')}`
}

/**
 * Shape and signature are checked before expiry, so a forged token is always
 * 'invalid' — only a genuinely signed token can ever be reported as 'expired'.
 */
export function verifyOrderLinkToken(
  orderId: string,
  token: string | null | undefined,
  nowMs: number = Date.now(),
): OrderLinkVerdict {
  const secret = getSecret()
  const id = orderId.toLowerCase()
  if (!secret || !UUID_RE.test(id) || typeof token !== 'string') return 'invalid'

  const match = TOKEN_RE.exec(token)
  if (!match) return 'invalid'

  const exp = Number(match[1])
  const given = Buffer.from(match[2], 'hex')
  const expected = sign(secret, id, exp)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return 'invalid'

  return exp * 1000 > nowMs ? 'ok' : 'expired'
}

/**
 * Absolute status URL for the order e-mails, or null when it can't be built
 * safely: no ORDER_LINK_SECRET, or SHOP_BASE_URL empty / not absolute http(s)
 * (never a relative link).
 */
export function buildOrderStatusUrl(orderId: string, nowMs: number = Date.now()): string | null {
  const base = (process.env.SHOP_BASE_URL ?? '').trim().replace(/\/+$/, '')
  if (!/^https?:\/\/[^/]/.test(base)) return null
  const token = createOrderLinkToken(orderId, nowMs)
  if (!token) return null
  return `${base}/sklep/status/${orderId.toLowerCase()}?t=${token}`
}
