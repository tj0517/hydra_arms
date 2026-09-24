import 'server-only'
import { timingSafeEqual } from 'crypto'
import { getP24Mode, assertCrcKeySet } from './mode'
export type { P24Mode } from './mode'
export { getP24Mode }
import {
  signRegister as _signRegister,
  signVerify as _signVerify,
  signNotification as _signNotification,
} from './sign'

// ── Sign helpers ────────────────────────────────────────────

/** register sign: {"sessionId","merchantId","amount","currency","crc"} */
export function signRegister(sessionId: string, merchantId: number, amount: number, currency: string): string {
  return _signRegister(sessionId, merchantId, amount, currency, assertCrcKeySet())
}

/** verify sign: {"sessionId","orderId","amount","currency","crc"} */
export function signVerify(sessionId: string, orderId: number, amount: number, currency: string): string {
  return _signVerify(sessionId, orderId, amount, currency, assertCrcKeySet())
}

/**
 * notification sign:
 * {"merchantId","posId","sessionId","amount","originAmount","currency","orderId","methodId","statement","crc"}
 */
export function signNotification(
  merchantId: number, posId: number, sessionId: string,
  amount: number, originAmount: number, currency: string,
  orderId: number, methodId: number, statement: string,
): string {
  return _signNotification(merchantId, posId, sessionId, amount, originAmount, currency, orderId, methodId, statement, assertCrcKeySet())
}

/** Constant-time comparison of two hex sign strings. */
export function signsEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length === 0 || ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

// ── P24 notification body ────────────────────────────────────

export interface P24NotifyBody {
  merchantId: number
  posId: number
  sessionId: string
  amount: number
  originAmount: number
  currency: string
  orderId: number
  methodId: number
  statement: string
  sign: string
}

/** Validate and parse notification body. Returns null if invalid. */
export function parseNotifyBody(raw: unknown): P24NotifyBody | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (
    typeof b.merchantId !== 'number' || !Number.isInteger(b.merchantId) ||
    typeof b.posId !== 'number'       || !Number.isInteger(b.posId) ||
    typeof b.sessionId !== 'string'   || !b.sessionId ||
    typeof b.amount !== 'number'      || !Number.isInteger(b.amount) || b.amount <= 0 ||
    typeof b.originAmount !== 'number'|| !Number.isInteger(b.originAmount) || b.originAmount <= 0 ||
    typeof b.currency !== 'string'    || !b.currency ||
    typeof b.orderId !== 'number'     || !Number.isInteger(b.orderId) ||
    typeof b.methodId !== 'number'    || !Number.isInteger(b.methodId) ||
    typeof b.statement !== 'string'   ||
    typeof b.sign !== 'string'        || !b.sign
  ) return null
  return {
    merchantId: b.merchantId as number,
    posId: b.posId as number,
    sessionId: b.sessionId as string,
    amount: b.amount as number,
    originAmount: b.originAmount as number,
    currency: b.currency as string,
    orderId: b.orderId as number,
    methodId: b.methodId as number,
    statement: b.statement as string,
    sign: b.sign as string,
  }
}

export function verifyNotifySign(body: P24NotifyBody): boolean {
  const expected = signNotification(
    body.merchantId, body.posId, body.sessionId,
    body.amount, body.originAmount, body.currency,
    body.orderId, body.methodId, body.statement,
  )
  return signsEqual(expected, body.sign)
}

// ── P24 API calls ────────────────────────────────────────────

function p24BaseUrl(): string {
  return getP24Mode() === 'production'
    ? 'https://secure.przelewy24.pl/api/v1'
    : 'https://sandbox.przelewy24.pl/api/v1'
}

function p24BasicAuth(): string {
  const posId = process.env.P24_POS_ID ?? ''
  const apiKey = process.env.P24_API_KEY ?? ''
  return 'Basic ' + Buffer.from(`${posId}:${apiKey}`).toString('base64')
}

export interface RegisterParams {
  orderId: string          // our order UUID → used as sessionId
  amountGrosze: number     // integer, in grosz
  currency?: string        // default PLN
  description: string
  email: string
  urlReturn: string        // where P24 sends the user back
  urlStatus: string        // our notify webhook URL
}

/** Register a transaction with P24. Returns the token used for the redirect URL. */
export async function registerTransaction(params: RegisterParams): Promise<string> {
  const mode = getP24Mode()
  if (mode === 'disabled') throw new Error('Payments not configured')
  if (mode === 'mock') {
    // Mock: return a deterministic fake token (order UUID prefix)
    return `mock-${params.orderId.slice(0, 8)}`
  }

  const merchantId = parseInt(process.env.P24_MERCHANT_ID || '0', 10)
  const posId = parseInt(process.env.P24_POS_ID || '0', 10)
  const currency = params.currency ?? 'PLN'

  const body = {
    merchantId,
    posId,
    sessionId: params.orderId,
    amount: params.amountGrosze,
    currency,
    description: params.description,
    email: params.email,
    country: 'PL',
    language: 'pl',
    urlReturn: params.urlReturn,
    urlStatus: params.urlStatus,
    sign: signRegister(params.orderId, merchantId, params.amountGrosze, currency),
  }

  const res = await fetch(`${p24BaseUrl()}/transaction/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': p24BasicAuth(),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`P24 register failed: ${res.status} ${text}`)
  }

  const data = await res.json() as { data?: { token?: string } }
  const token = data?.data?.token
  if (!token) throw new Error('P24 register: missing token in response')
  return token
}

/** Redirect URL for a given P24 token. */
export function p24PaymentUrl(token: string): string {
  const mode = getP24Mode()
  const base = mode === 'production'
    ? 'https://secure.przelewy24.pl'
    : 'https://sandbox.przelewy24.pl'
  return `${base}/trnRequest/${token}`
}

/** Verify a transaction with P24. Returns true on success. */
export async function verifyTransaction(
  sessionId: string, orderId: number, amount: number, currency: string,
): Promise<boolean> {
  const mode = getP24Mode()
  if (mode === 'disabled') throw new Error('Payments not configured')
  if (mode === 'mock') return true

  const merchantId = parseInt(process.env.P24_MERCHANT_ID || '0', 10)
  const posId = parseInt(process.env.P24_POS_ID || '0', 10)

  const body = {
    merchantId,
    posId,
    sessionId,
    amount,
    currency,
    orderId,
    sign: signVerify(sessionId, orderId, amount, currency),
  }

  const res = await fetch(`${p24BaseUrl()}/transaction/verify`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': p24BasicAuth(),
    },
    body: JSON.stringify(body),
  })

  return res.ok
}
