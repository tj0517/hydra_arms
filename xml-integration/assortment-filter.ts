/**
 * Pure assortment filter — no side effects, no I/O.
 *
 * Implements the four admission rules from O-04 (resolved 2026-09-24):
 *   1. Supplier enabled (Sharg / Kolba / Spechurt — "Szafy" excluded per O-17)
 *   2. Category is P1 and present at ≥1 of our wholesalers
 *   3. Stock > 0 at Hydra's own warehouse OR at the wholesaler (mixed model)
 *   4. Price ≥ minPricePln (0 = disabled)
 *
 * Rules live in assortment-rules.ts.  Change rules there; no code changes needed here.
 */

import type { NormalizedProduct } from './types';
import type { AssortmentRules } from './assortment-rules';

export type FilterReason =
  | 'ok'
  | 'disabled_supplier'
  | 'not_p1'
  | 'no_stock'
  | 'below_min_price';

export interface FilterResult {
  allowed: boolean;
  reason: FilterReason;
}

// Strip leading zeros from top-level Hydra tree numbers.
// "04" → "4",  "09" → "9",  "10" → "10",  "3.4.1" → "3.4.1"
function normNum(n: string): string {
  return n.trim().replace(/^0+(?=\d)/, '');
}

/**
 * Return true when productNum is equal to any P1 node or is a descendant of one.
 * e.g. "4.6.1" matches rule "04" (normalised: "4"), "3.4.1" matches rule "3.4.1" exactly.
 */
function isP1(hydraNum: string, allowedNums: readonly string[]): boolean {
  const n = normNum(hydraNum);
  for (const p1 of allowedNums) {
    const p = normNum(p1);
    if (n === p || n.startsWith(p + '.')) return true;
  }
  return false;
}

/**
 * Decide whether a product should be admitted to the BaseLinker import.
 *
 * @param product         NormalizedProduct from the feed connector
 * @param hydraNum        Resolved Hydra tree number from category-map.json, or null (→ 00)
 * @param wholesalerStock Stock reported by the wholesaler feed (product.stock)
 * @param hydraOwnStock   Hydra's own BL warehouse stock; 0 when BASELINKER_WAREHOUSE_HYDRA unset
 * @param price           Selling price in PLN (purchase price + markup); used only when minPricePln > 0
 * @param rules           Assortment rules from assortment-rules.ts
 */
export function filterProduct(
  product: NormalizedProduct,
  hydraNum: string | null,
  wholesalerStock: number,
  hydraOwnStock: number,
  price: number,
  rules: AssortmentRules,
): FilterResult {
  if (!(rules.enabledSuppliers as readonly string[]).includes(product.connector)) {
    return { allowed: false, reason: 'disabled_supplier' };
  }

  if (!hydraNum || !isP1(hydraNum, rules.allowedHydraNums)) {
    return { allowed: false, reason: 'not_p1' };
  }

  if (wholesalerStock <= 0 && hydraOwnStock <= 0) {
    return { allowed: false, reason: 'no_stock' };
  }

  if (rules.minPricePln > 0 && price < rules.minPricePln) {
    return { allowed: false, reason: 'below_min_price' };
  }

  return { allowed: true, reason: 'ok' };
}
