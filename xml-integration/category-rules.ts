/**
 * xml-integration/category-rules.ts
 *
 * CategoryRule matcher used by scripts/xml-to-baselinker.ts (resolveCategory) to
 * resolve a Kolba product to a Hydra tree number, via xml-integration/category-map.json
 * (kolba_rules array). Moved out of the script (HA-2.12) so it can be unit-tested
 * without importing the guarded, side-effect-having script itself.
 *
 * No behaviour change for existing rules — same match semantics as before HA-2.12,
 * plus the new optional `excludeName`.
 *
 * HA-2.27: ShargRule / shargRuleMatches — the same matcher for Sharg
 * (category-map.json sharg_rules), with an optional filter on the supplier
 * category path.
 */

import type { NormalizedProduct } from './types';

export interface CategoryRule {
  match: { attr?: string; value?: string; name?: string };
  cat: string;
  review?: boolean; // force `review` even when cat is a leaf (unsure rule)
  excludeName?: string[]; // reject the match if the name contains any of these substrings
                           // (e.g. distinguish a complete product from an accessory "do X",
                           // or keep ASG/airsoft out of a generic rule like "magazynek")
}

export function ruleMatches(rule: CategoryRule, p: NormalizedProduct): boolean {
  const { attr, value, name } = rule.match;
  if (!attr && !name) return false; // empty rule never matches

  if (attr) {
    const attrValue = p.features[attr];
    if (attrValue === undefined) return false;
    if (value && !attrValue.toLowerCase().includes(value.toLowerCase())) return false;
  }
  const productName = p.name.toLowerCase();
  if (name && !productName.includes(name.toLowerCase())) return false;
  if (rule.excludeName?.some((ex) => productName.includes(ex.toLowerCase()))) return false;
  return true;
}

/**
 * Sharg name rule (HA-2.27): a CategoryRule that can be pinned to supplier
 * category paths, so it only splits the paths the dictionary cannot tell apart.
 */
export interface ShargRule extends CategoryRule {
  paths?: string[]; // exact supplier_category_name values (feed category path) the rule may
                    // fire on — any of them; absent = every Sharg product
}

export function shargRuleMatches(rule: ShargRule, p: NormalizedProduct): boolean {
  if (rule.paths && !rule.paths.includes(p.supplier_category_name ?? '')) return false;
  return ruleMatches(rule, p);
}
