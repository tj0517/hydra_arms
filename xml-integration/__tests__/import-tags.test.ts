/**
 * Unit tests for xml-integration/import-tags.ts (HA-2.17) — the re-import
 * merge with simulated existing BL tags, incl. the red proof for
 * permit_off / permit_ok suppressing permit_review.
 *
 * Runner: npx tsx --test xml-integration/__tests__/import-tags.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMPORT_OWNED_TAGS, computeImportTags, mergeImportTags } from '../import-tags';

// ── red proof: admin decision survives re-import and closes the review ───────

test('RED PROOF merge: existing [approved, permit_off] + computed [review, permit, permit_review] → keeps permit_off and approved, no permit_review', () => {
  const result = mergeImportTags(['approved', 'permit_off'], ['review', 'permit', 'permit_review']);
  assert.ok(result.includes('permit_off'), 'permit_off preserved');
  assert.ok(result.includes('approved'), 'approved preserved');
  assert.ok(!result.includes('permit_review'), 'permit_review suppressed by permit_off');
  assert.deepEqual(result, ['approved', 'permit_off', 'review', 'permit']);
});

test('RED PROOF merge: the same with permit_ok → keeps permit_ok, no permit_review', () => {
  const result = mergeImportTags(['approved', 'permit_ok'], ['review', 'permit', 'permit_review']);
  assert.ok(result.includes('permit_ok'));
  assert.ok(result.includes('approved'));
  assert.ok(!result.includes('permit_review'));
  assert.deepEqual(result, ['approved', 'permit_ok', 'review', 'permit']);
});

test('control: without a decision tag, permit_review IS added on re-import', () => {
  const result = mergeImportTags(['approved'], ['review', 'permit', 'permit_review']);
  assert.deepEqual(result, ['approved', 'review', 'permit', 'permit_review']);
});

// ── pre-HA-2.17 behaviour of auto / review / flag / approved unchanged ───────

test('status tag is replaced, not accumulated: existing [flag, approved] + computed [auto] → [approved, auto]', () => {
  assert.deepEqual(mergeImportTags(['flag', 'approved'], ['auto']), ['approved', 'auto']);
});

test('import-owned tags are refreshed: stale permit/age_18/permit_review in BL are dropped when no longer computed', () => {
  const result = mergeImportTags(['age_18', 'permit', 'permit_review', 'approved'], ['auto']);
  assert.deepEqual(result, ['approved', 'auto']);
});

test('free admin tags are preserved in order; computed tags appended; duplicates removed', () => {
  const result = mergeImportTags(['bestseller', 'approved', 'review', 'promo'], ['auto', 'permit', 'permit']);
  assert.deepEqual(result, ['bestseller', 'approved', 'promo', 'auto', 'permit']);
});

test('new product (no existing tags) → computed tags as-is', () => {
  assert.deepEqual(mergeImportTags([], ['auto', 'permit', 'permit_review']), ['auto', 'permit', 'permit_review']);
});

test('IMPORT_OWNED_TAGS = auto, review, flag, age_18, permit, permit_review — and NOT approved / permit_off / permit_ok', () => {
  assert.deepEqual([...IMPORT_OWNED_TAGS].sort(), ['age_18', 'auto', 'flag', 'permit', 'permit_review', 'review']);
  for (const t of ['approved', 'permit_off', 'permit_ok']) assert.equal(IMPORT_OWNED_TAGS.has(t), false, t);
});

test('computeImportTags puts the status tag first', () => {
  assert.deepEqual(computeImportTags({ status: 'review', hydraNum: '2.5' }), ['review', 'permit']);
  assert.deepEqual(computeImportTags({ status: 'flag', hydraNum: null }), ['flag']);
});
