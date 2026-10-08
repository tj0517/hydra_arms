/**
 * xml-integration/resolve-category.ts — HA-2.17
 *
 * Supplier product → Hydra category resolution, extracted verbatim from the
 * import script (resolveCategory) so the sample-feed table test can run the
 * real resolver without importing the guarded script. No behaviour change:
 *
 *   kolba    — category-map.json kolba_rules (deep leaves) first, kolba_brands fallback
 *   sharg / spechurt — supplier category name → Hydra number dictionary
 *   dictionary hit on a LEAF        → that category + status `auto`
 *   hit on a PARENT / unsure rule   → that category + status `review`
 *   no match / number not in tree   → "00. DO PRZYPISANIA" + status `flag`
 */

import type { NormalizedProduct } from './types';
import { ruleMatches, type CategoryRule } from './category-rules';

export type StatusTag = 'auto' | 'review' | 'flag';

export interface CategoryMapFile {
  spechurt?: Record<string, string>;
  sharg?: Record<string, string>;
  kolba_brands?: Record<string, string>;
  kolba_rules?: CategoryRule[];
}

/** Structural interface shared by HydraTree (import) and HydraTreeFromTxt (dry-run / tests). */
export interface HydraTreeLike {
  resolve(num: string): number | undefined;
  isLeaf(num: string): boolean;
  readonly unassignedId: number;
}

export interface ResolvedCategory {
  categoryId: number;
  status: StatusTag;
  hydraNum: string | null;
}

export function resolveCategory(
  p: NormalizedProduct,
  map: CategoryMapFile,
  tree: HydraTreeLike,
  unknownNums: Set<string>,
): ResolvedCategory {
  let hydraNum: string | null = null;
  let forcedReview = false;

  if (p.connector === 'kolba') {
    // Rules first (can target deep leaves), brand fallback (usually branch-level)
    const rule = (map.kolba_rules ?? []).find((r) => ruleMatches(r, p));
    if (rule) {
      hydraNum = rule.cat;
      forcedReview = rule.review === true;
    } else if (p.brand && map.kolba_brands?.[p.brand]) {
      hydraNum = map.kolba_brands[p.brand];
    }
  } else {
    const dict = (map[p.connector as 'sharg' | 'spechurt'] ?? {}) as Record<string, string>;
    if (p.supplier_category_name && dict[p.supplier_category_name]) {
      hydraNum = dict[p.supplier_category_name];
    }
  }

  if (!hydraNum) {
    return { categoryId: tree.unassignedId, status: 'flag', hydraNum: null };
  }

  const categoryId = tree.resolve(hydraNum);
  if (categoryId === undefined) {
    // Dictionary points at a number that isn't in the tree — treat as unmapped
    unknownNums.add(hydraNum);
    return { categoryId: tree.unassignedId, status: 'flag', hydraNum: null };
  }

  const status: StatusTag = forcedReview || !tree.isLeaf(hydraNum) ? 'review' : 'auto';
  return { categoryId, status, hydraNum };
}
