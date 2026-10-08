/**
 * Unit tests for src/lib/shop/permitFlags.ts (HA-2.17) — the sync mapping
 * BL tags + Hydra section → { requires_license, age_min, delivery_allowed },
 * incl. the red proofs for permit_off and the 01/02 section rule.
 *
 * Runner: npx tsx --test xml-integration/__tests__/permit-flags.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePermitFlags,
  resolveHydraSection,
  indexCategories,
  type CategoryNode,
} from '../../src/lib/shop/permitFlags';

// ── red proofs ───────────────────────────────────────────────────────────────

test('RED PROOF mapping: [permit, permit_off] → requires_license=false', () => {
  assert.equal(computePermitFlags(['permit', 'permit_off'], '12').requires_license, false);
});

test('RED PROOF mapping: the same product without permit_off → requires_license=true', () => {
  assert.equal(computePermitFlags(['permit'], '12').requires_license, true);
});

test('RED PROOF section: "01." + [permit_off] → delivery_allowed=false regardless of tags', () => {
  const f = computePermitFlags(['permit', 'permit_off'], '01');
  assert.equal(f.delivery_allowed, false);
  assert.equal(f.requires_license, false);
});

test('RED PROOF section: "12." + [] → delivery_allowed=true', () => {
  assert.deepEqual(computePermitFlags([], '12'), { requires_license: false, age_min: 0, delivery_allowed: true });
});

// ── full table ───────────────────────────────────────────────────────────────

test('permit → requires_license=true, age_min=18', () => {
  assert.deepEqual(computePermitFlags(['auto', 'permit', 'approved'], '15'), {
    requires_license: true, age_min: 18, delivery_allowed: true,
  });
});

test('age_18 only → requires_license=false, age_min=18', () => {
  assert.deepEqual(computePermitFlags(['age_18'], '15'), { requires_license: false, age_min: 18, delivery_allowed: true });
});

test('permit + permit_off → age_min stays 18 (spec: age_min=18 when age_18 or permit; permit_off only removes the licence)', () => {
  assert.equal(computePermitFlags(['permit', 'permit_off'], '15').age_min, 18);
});

test('permit + permit_off + age_18 → age_min stays 18', () => {
  assert.equal(computePermitFlags(['permit', 'permit_off', 'age_18'], '15').age_min, 18);
});

test('permit_review and permit_ok do not change the mapping', () => {
  const base = computePermitFlags(['permit'], '04');
  assert.deepEqual(computePermitFlags(['permit', 'permit_review'], '04'), base);
  assert.deepEqual(computePermitFlags(['permit', 'permit_ok'], '04'), base);
});

test('section 02 → delivery_allowed=false; section null (outside the Hydra tree) → true', () => {
  assert.equal(computePermitFlags(['permit'], '02').delivery_allowed, false);
  assert.equal(computePermitFlags(['permit'], null).delivery_allowed, true);
});

test('no tags, no section → all defaults (false / 0 / true)', () => {
  assert.deepEqual(computePermitFlags([], null), { requires_license: false, age_min: 0, delivery_allowed: true });
});

// ── section resolution from the category chain ──────────────────────────────

const cats: CategoryNode[] = [
  { category_id: 10, name: '01. BROŃ PALNA (Koncesjonowana – Odbiór osobisty: Salon Kraków)', parent_id: 0 },
  { category_id: 11, name: '1.1 Broń Krótka', parent_id: 10 },
  { category_id: 12, name: '1.1.1 Pistolety Samopowtarzalne', parent_id: 11 },
  { category_id: 20, name: '02. AMUNICJA I ELEMENTY RECHARGINGU', parent_id: 0 },
  { category_id: 21, name: '2.1 Amunicja Pistoletowa', parent_id: 20 },
  { category_id: 120, name: '12. ODZIEŻ, OBUWIE I SYSTEMY NOŚNE', parent_id: 0 },
  { category_id: 121, name: '12.1.1 Spodnie Taktyczne', parent_id: 120 },
  { category_id: 900, name: 'Hobby/Militaria i strzelectwo', parent_id: 0 },
  { category_id: 901, name: 'Noże', parent_id: 900 },
  { category_id: 950, name: 'orphan', parent_id: 999 },
];
const byId = indexCategories(cats);

test('resolveHydraSection walks the chain to the "NN." root', () => {
  assert.equal(resolveHydraSection(12, byId), '01');
  assert.equal(resolveHydraSection(11, byId), '01');
  assert.equal(resolveHydraSection(10, byId), '01');
  assert.equal(resolveHydraSection(21, byId), '02');
  assert.equal(resolveHydraSection(121, byId), '12');
});

test('resolveHydraSection → null for non-Hydra roots, unknown ids, broken chains, no category', () => {
  assert.equal(resolveHydraSection(901, byId), null);
  assert.equal(resolveHydraSection(424242, byId), null);
  assert.equal(resolveHydraSection(950, byId), null);
  assert.equal(resolveHydraSection(null, byId), null);
  assert.equal(resolveHydraSection(0, byId), null);
});

test('resolveHydraSection survives a cycle', () => {
  const cyc = indexCategories<CategoryNode>([
    { category_id: 1, name: 'a', parent_id: 2 },
    { category_id: 2, name: 'b', parent_id: 1 },
  ]);
  assert.equal(resolveHydraSection(1, cyc), null);
});

test('end to end: "01." product tagged permit_off → requires_license=false but still no courier', () => {
  const section = resolveHydraSection(12, byId);
  assert.deepEqual(computePermitFlags(['auto', 'permit', 'permit_off', 'approved'], section), {
    requires_license: false, age_min: 18, delivery_allowed: false,
  });
});
