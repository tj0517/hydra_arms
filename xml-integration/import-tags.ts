/**
 * xml-integration/import-tags.ts — HA-2.17
 *
 * Pure tag logic for the XML → BaseLinker import (extracted from the import
 * script so it can be unit-tested without importing the guarded script):
 *
 *   computeImportTags(resolved)         — status tag + permit tags from permit-rules.ts
 *   mergeImportTags(existing, computed) — re-import: keep admin tags, refresh ours
 *
 * Tag ownership:
 *   import-owned (refreshed on every import, never kept from BL):
 *     auto | review | flag      — category resolution status (unchanged since HA-2.12)
 *     age_18                    — group B / D (was: whole branch 15; now permit-rules.ts)
 *     permit, permit_review     — group A / C
 *   admin-owned (never written by the import, always preserved on re-import):
 *     approved                  — publish gate (baselinker-sync → is_active)
 *     permit_off                — client removes the permit flag for this product
 *     permit_ok                 — client confirms the permit is required
 *     anything else             — free admin tags
 *
 * `permit_off` and `permit_ok` each close the review: on re-import the computed
 * `permit_review` is dropped when either is present. The `permit` tag itself is
 * left in place — the sync mapping (src/lib/shop/permitFlags.ts) applies
 * `requires_license = permit ∧ ¬permit_off`, so the client's decision wins
 * without the import having to know it.
 */

import { permitTagsFor } from './permit-rules';
import type { ResolvedCategory } from './resolve-category';

export type StatusTag = 'auto' | 'review' | 'flag';

export const TAG_PERMIT = 'permit';
export const TAG_PERMIT_REVIEW = 'permit_review';
export const TAG_AGE_18 = 'age_18';
export const TAG_PERMIT_OFF = 'permit_off';
export const TAG_PERMIT_OK = 'permit_ok';

/** Tags owned by the import — stripped from existing BL tags before merge. */
export const IMPORT_OWNED_TAGS: ReadonlySet<string> = new Set([
  'auto', 'review', 'flag', TAG_AGE_18, TAG_PERMIT, TAG_PERMIT_REVIEW,
]);

/** Admin tags that close a permit review. */
export const PERMIT_DECISION_TAGS: ReadonlySet<string> = new Set([TAG_PERMIT_OFF, TAG_PERMIT_OK]);

/** Status tag + permit tags for a resolved category. Order: status first. */
export function computeImportTags(resolved: Pick<ResolvedCategory, 'status' | 'hydraNum'>): string[] {
  return [resolved.status, ...permitTagsFor(resolved.hydraNum)];
}

/**
 * Merge for re-import. Admin tags (not import-owned) are kept in their
 * original order, computed tags are appended, duplicates removed.
 * When the admin has decided (`permit_off` / `permit_ok`), `permit_review`
 * is not re-added.
 */
export function mergeImportTags(existingTags: readonly string[], computedTags: readonly string[]): string[] {
  const adminTags = existingTags.filter((t) => !IMPORT_OWNED_TAGS.has(t));
  const decided = adminTags.some((t) => PERMIT_DECISION_TAGS.has(t));
  const computed = decided ? computedTags.filter((t) => t !== TAG_PERMIT_REVIEW) : [...computedTags];
  return [...new Set([...adminTags, ...computed])];
}
