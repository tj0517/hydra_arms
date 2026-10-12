/**
 * Pure logic of scripts/bl-build-categories.ts (HA-2.26) — kept outside the
 * guarded script so it can be unit-tested. Nothing here talks to BaseLinker:
 * the script reads the catalogue, passes it in, and injects the one write.
 *
 * How a category counts as Hydra's: by NAME. Every tree category is created
 * with its number in the name ("01. BROŃ PALNA", "1.1 Broń Krótka",
 * "00. DO PRZYPISANIA"), so a catalogue category is ours exactly when its name
 * equals one of those 206 names. Anything else is foreign and blocks the run.
 * Reuse is stricter than recognition: a category is reused only when both its
 * name and its parent's BL id match the tree position.
 */

import type { ParsedHydraCategory } from './hydra-tree-txt';

export interface ExistingCategory {
  category_id: number;
  name: string;
  parent_id: number;
}

/**
 * Tags the build script creates on the BL account: the five from HA-2.26 plus
 * the two permit tags the import writes (import-tags.ts). `permit_off` and
 * `permit_ok` are admin tags and are deliberately not created here.
 */
export const IMPORT_TAGS_TO_CREATE = [
  'auto', 'review', 'flag', 'approved', 'age_18', 'permit', 'permit_review',
] as const;

/** Tags to create = wanted tags not yet on the account (exact, case-sensitive name match). */
export function missingImportTags(existingNames: readonly string[]): string[] {
  const have = new Set(existingNames);
  return IMPORT_TAGS_TO_CREATE.filter((t) => !have.has(t));
}

/**
 * Categories already in the target catalogue whose name is not a Hydra tree
 * name. Non-empty → not the (empty, partly built or fully built) Hydra
 * catalogue, and the build script refuses to write.
 */
export function foreignCategories<T extends { name: string }>(
  existing: readonly T[],
  tree: readonly ParsedHydraCategory[],
): T[] {
  const treeNames = new Set(tree.map((c) => c.blName));
  return existing.filter((c) => !treeNames.has(c.name));
}

export interface CategoryTreeResult {
  /** Hydra number as written in the tree ("00", "01", "1.1") → BL category id. */
  idByNum: Map<string, number>;
  created: number;
  reused: number;
}

/**
 * Walk the tree in order (parents first) and make sure every category exists:
 * reuse the one already in the catalogue under the same parent with the same
 * name, otherwise call `create`. Safe to re-run after an interrupted run — the
 * categories created so far are found again and only the rest is created.
 */
export async function ensureCategoryTree(
  tree: readonly ParsedHydraCategory[],
  existing: readonly ExistingCategory[],
  create: (category: ParsedHydraCategory, parentBlId: number) => Promise<number>,
): Promise<CategoryTreeResult> {
  const existingByKey = new Map(existing.map((c) => [`${c.parent_id}|${c.name}`, c.category_id]));
  const idByNum = new Map<string, number>();
  let created = 0;
  let reused = 0;

  for (const cat of tree) {
    let parentBlId = 0;
    if (cat.parentNum !== null) {
      const parentId = idByNum.get(cat.parentNum);
      if (parentId === undefined) {
        throw new Error(`category ${cat.num}: parent ${cat.parentNum} has no BL id (tree out of order?)`);
      }
      parentBlId = parentId;
    }
    const key = `${parentBlId}|${cat.blName}`;

    const existingId = existingByKey.get(key);
    if (existingId !== undefined) {
      idByNum.set(cat.num, existingId);
      reused++;
      continue;
    }

    const newId = await create(cat, parentBlId);
    if (!Number.isInteger(newId) || newId <= 0) {
      throw new Error(`no category_id returned for "${cat.blName}"`);
    }
    idByNum.set(cat.num, newId);
    existingByKey.set(key, newId);
    created++;
  }

  return { idByNum, created, reused };
}
