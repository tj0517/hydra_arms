import 'server-only'
import { parsePriceList, type PriceListResult } from '@/lib/shop/shipping'

/**
 * The one place that reads the shipping price list from env (HA-2.02). The
 * checkout route refuses every order while this returns ok: false; the checkout
 * page uses it only to display prices. Never log the values — only `invalid`
 * (variable names).
 */
export function getShippingPriceList(): PriceListResult {
  return parsePriceList(process.env)
}
