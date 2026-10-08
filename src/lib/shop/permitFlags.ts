/**
 * src/lib/shop/permitFlags.ts — HA-2.17
 *
 * BaseLinker tags + Hydra section → the three compliance columns on
 * shop_products that force in-person pickup (see cartAnalysis.ts):
 *
 *   requires_license = permit ∧ ¬permit_off
 *   age_min          = 18 when age_18 or permit, else 0
 *   delivery_allowed = false for Hydra sections 01 (broń palna) and 02
 *                      (amunicja) regardless of tags — tj 2026-10-08 —
 *                      true for every other section and for products outside
 *                      the Hydra tree
 *
 * Tags come from the XML import (permit / age_18 / permit_review, see
 * xml-integration/import-tags.ts) and from the admin in BL (permit_off /
 * permit_ok). `permit_ok` and `permit_review` do not change the mapping — a
 * product under review stays pickup-only until the client decides.
 *
 * The section is read from the product's category chain in the synced
 * categories (root name prefix "01." / "02."), never from hard-coded BL ids.
 */

export interface PermitFlags {
  requires_license: boolean;
  age_min: number;
  delivery_allowed: boolean;
}

/** Hydra sections that are always pickup-only (two-digit root prefix). */
export const PICKUP_ONLY_SECTIONS: ReadonlySet<string> = new Set(['01', '02']);

export const ADULT_AGE = 18;

export function computePermitFlags(tags: readonly string[], section: string | null): PermitFlags {
  const has = (t: string) => tags.includes(t);
  const permit = has('permit');
  return {
    requires_license: permit && !has('permit_off'),
    age_min: permit || has('age_18') ? ADULT_AGE : 0,
    delivery_allowed: section === null || !PICKUP_ONLY_SECTIONS.has(section),
  };
}

export interface CategoryNode {
  category_id: number;
  name: string;
  parent_id: number;
}

const HYDRA_ROOT_RE = /^(\d{2})\./;

/**
 * Two-digit Hydra section ("01", "12") of a category: walk parent_id up to the
 * root and read its "NN." prefix. null when the category is unknown, the chain
 * is broken, or the root is not a Hydra root (marketplace paths).
 */
export function resolveHydraSection(
  categoryId: number | null | undefined,
  byId: ReadonlyMap<number, CategoryNode>,
): string | null {
  if (!categoryId) return null;
  const seen = new Set<number>();
  let node = byId.get(categoryId);
  while (node) {
    if (seen.has(node.category_id)) return null; // cycle guard
    seen.add(node.category_id);
    if (node.parent_id === 0) {
      const m = HYDRA_ROOT_RE.exec(node.name);
      return m ? m[1] : null;
    }
    node = byId.get(node.parent_id);
  }
  return null;
}

export function indexCategories<T extends CategoryNode>(categories: readonly T[]): Map<number, T> {
  return new Map(categories.map((c) => [c.category_id, c]));
}
