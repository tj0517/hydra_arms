/**
 * src/lib/shop/shipping.ts — HA-2.02
 *
 * Delivery methods, price-list parsing and the delivery-cost rule. Pure — no
 * env access — so the checkout page can show the same rule the server applies.
 * The env is read in exactly one place: src/lib/shop/shippingPrices.ts.
 *
 * The amount charged is never taken from the client: the checkout route reads
 * the price list from env and checkout_create_order (migration 018) computes
 * the cost from the goods subtotal it sums itself.
 */

export const SHIPPING_METHODS = ['dhl', 'dpd', 'inpost_courier', 'inpost_locker', 'pickup'] as const
export type ShippingMethod = (typeof SHIPPING_METHODS)[number]

/** Methods that ship a parcel (everything except personal pickup). */
export const PARCEL_METHODS = ['dhl', 'dpd', 'inpost_courier', 'inpost_locker'] as const
export type ParcelMethod = (typeof PARCEL_METHODS)[number]

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  dhl: 'Kurier DHL',
  dpd: 'Kurier DPD',
  inpost_courier: 'Kurier InPost',
  inpost_locker: 'InPost Paczkomat',
  pickup: 'Odbiór osobisty',
}

/** Env variable per parcel method (config/inputs.ts). */
export const SHIPPING_PRICE_ENV: Record<ParcelMethod, string> = {
  dhl: 'SHIPPING_PRICE_DHL',
  dpd: 'SHIPPING_PRICE_DPD',
  inpost_courier: 'SHIPPING_PRICE_INPOST',
  inpost_locker: 'SHIPPING_PRICE_INPOST_LOCKER',
}
export const FREE_SHIPPING_THRESHOLD_ENV = 'FREE_SHIPPING_THRESHOLD'

export interface ShippingPriceList {
  prices: Record<ParcelMethod, number>
  /** Goods subtotal (PLN gross) from which parcel delivery costs 0. */
  freeThreshold: number
}

export type PriceListResult =
  | { ok: true; priceList: ShippingPriceList }
  /** `invalid` holds variable names only — never values. */
  | { ok: false; invalid: string[] }

export function isShippingMethod(v: unknown): v is ShippingMethod {
  return typeof v === 'string' && (SHIPPING_METHODS as readonly string[]).includes(v)
}

export function isParcelMethod(v: unknown): v is ParcelMethod {
  return typeof v === 'string' && (PARCEL_METHODS as readonly string[]).includes(v)
}

// PLN with a dot and at most 2 decimals, e.g. "19.99", "500", "500.00".
const AMOUNT_RE = /^\d{1,6}(\.\d{1,2})?$/

/** Strictly parses a positive PLN amount; anything else → null (fail closed). */
export function parseAmount(raw: string | undefined): number | null {
  if (raw === undefined) return null
  const s = raw.trim()
  if (!AMOUNT_RE.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Builds the price list from an env-like map. Every missing/invalid variable is reported. */
export function parsePriceList(env: Record<string, string | undefined>): PriceListResult {
  const invalid: string[] = []
  const prices = {} as Record<ParcelMethod, number>
  for (const method of PARCEL_METHODS) {
    const name = SHIPPING_PRICE_ENV[method]
    const value = parseAmount(env[name])
    if (value === null) invalid.push(name)
    else prices[method] = value
  }
  const freeThreshold = parseAmount(env[FREE_SHIPPING_THRESHOLD_ENV])
  if (freeThreshold === null) invalid.push(FREE_SHIPPING_THRESHOLD_ENV)
  if (invalid.length || freeThreshold === null) return { ok: false, invalid }
  return { ok: true, priceList: { prices, freeThreshold } }
}

/**
 * Display-side mirror of the rule in checkout_create_order: pickup = 0; a parcel
 * method costs its price below the threshold and 0 at/above it.
 */
export function shippingCost(method: ShippingMethod, goodsSubtotal: number, priceList: ShippingPriceList): number {
  if (method === 'pickup') return 0
  return goodsSubtotal >= priceList.freeThreshold ? 0 : priceList.prices[method]
}

/**
 * Paczkomat code as InPost names its machines: city prefix (3 letters), number,
 * optional letter suffix — e.g. KRA01M, KRA011, WAW100M. Normalised to upper
 * case before the check. Same pattern as the CHECK constraint in migration 018.
 */
export const LOCKER_CODE_RE = /^[A-Z]{3}[0-9]{2,4}[A-Z]{0,3}$/

export function normalizeLockerCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase()
  return LOCKER_CODE_RE.test(code) ? code : null
}
