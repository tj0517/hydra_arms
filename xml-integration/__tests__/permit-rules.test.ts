/**
 * Unit tests for xml-integration/permit-rules.ts (HA-2.17) — one product per
 * group A, B, C, D and none, prefix precedence, O-29 / O-30 rows, and the
 * tree-coverage summary printed for the report.
 *
 * Runner: npx tsx --test xml-integration/__tests__/permit-rules.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  PERMIT_RULES,
  GROUP_TAGS,
  permitGroupFor,
  permitRuleFor,
  permitTagsFor,
  type PermitGroup,
} from '../permit-rules';
import { computeImportTags } from '../import-tags';
import { parseHydraTreeNumbers, HydraTreeFromTxt } from '../hydra-tree-txt';

const TXT_PATH = resolve(process.cwd(), 'xml-integration/hydra-category-tree.txt');
const treeTxt = readFileSync(TXT_PATH, 'utf8');
const treeNums = parseHydraTreeNumbers(treeTxt);
const tree = new HydraTreeFromTxt(treeTxt);

// ── one product per group ─────────────────────────────────────────────────────

test('group A: pistol in 1.1.1 (01. Broń palna) → auto + permit', () => {
  assert.equal(permitGroupFor('1.1.1'), 'A');
  assert.deepEqual(computeImportTags({ status: 'auto', hydraNum: '1.1.1' }), ['auto', 'permit']);
});

test('group B: PCP FAC >17 J in 11.1.2 → auto + age_18 (registration, pickup by adult)', () => {
  assert.equal(permitGroupFor('11.1.2'), 'B');
  assert.deepEqual(computeImportTags({ status: 'auto', hydraNum: '11.1.2' }), ['auto', 'age_18']);
});

test('group C: stun gun in 15.3.1 → auto + permit + permit_review (pickup until the client decides)', () => {
  assert.equal(permitGroupFor('15.3.1'), 'C');
  assert.deepEqual(computeImportTags({ status: 'auto', hydraNum: '15.3.1' }), ['auto', 'permit', 'permit_review']);
});

test('group D: pepper spray in 15.1.1 → auto + age_18', () => {
  assert.equal(permitGroupFor('15.1.1'), 'D');
  assert.deepEqual(computeImportTags({ status: 'auto', hydraNum: '15.1.1' }), ['auto', 'age_18']);
});

test('no group: tactical trousers in 12.1.1 → status only', () => {
  assert.equal(permitGroupFor('12.1.1'), null);
  assert.deepEqual(computeImportTags({ status: 'auto', hydraNum: '12.1.1' }), ['auto']);
});

test('unmapped product (hydraNum null, "00. DO PRZYPISANIA") → flag only', () => {
  assert.deepEqual(computeImportTags({ status: 'flag', hydraNum: null }), ['flag']);
  assert.deepEqual(permitTagsFor('00'), []);
});

// ── matching semantics ───────────────────────────────────────────────────────

test('most specific row wins: "1" → A but "1.4" → C (O-29), "1.4" has no children', () => {
  assert.equal(permitGroupFor('1.1'), 'A');
  assert.equal(permitGroupFor('1.4'), 'C');
  assert.equal(permitRuleFor('1.4')?.note?.includes('O-29'), true);
});

test('leading zero is optional: "01" and "1" resolve the same row', () => {
  assert.equal(permitRuleFor('01'), permitRuleFor('1'));
  assert.equal(permitGroupFor('02'), 'A');
});

test('"4" → none but "4.5.2" (tłumiki huku) → C; sibling 4.5.1 stays none', () => {
  assert.equal(permitGroupFor('4.5.1'), null);
  assert.equal(permitGroupFor('4.5.2'), 'C');
  assert.equal(permitGroupFor('4.6.1'), null);
});

test('11: leaves split — 11.1.1 D, 11.1.2 B, 11.3.1 none, bare "11" (parent) D', () => {
  assert.equal(permitGroupFor('11.1.1'), 'D');
  assert.equal(permitGroupFor('11.1.2'), 'B');
  assert.equal(permitGroupFor('11.3.1'), null);
  assert.equal(permitGroupFor('11'), 'D');
});

test('O-30 rows: knives 13.1 / 13.2 and 13.4.3 → D with the O-number; multitools 13.3 → none', () => {
  for (const n of ['13.1.1', '13.2.3', '13.4.3']) {
    assert.equal(permitGroupFor(n), 'D', n);
    assert.equal(permitRuleFor(n)?.note?.includes('O-30'), true, `${n} note cites O-30`);
  }
  assert.equal(permitGroupFor('13.3.2'), null);
});

test('branch 15 keeps the pre-HA-2.17 behaviour (age_18) for every node except 15.3 → C', () => {
  for (const n of treeNums) {
    if (!(n === '15' || n.startsWith('15.'))) continue;
    const expected: PermitGroup = n === '15.3' || n.startsWith('15.3.') ? 'C' : 'D';
    assert.equal(permitGroupFor(n), expected, n);
    assert.equal(tree.isAge18Branch(n), true);
  }
});

test('inert rows (no Hydra branch) exist for O-29 black powder, O-30 ASG, crossbows, barrels — and never match', () => {
  const inert = PERMIT_RULES.filter((r) => r.hydra === null);
  assert.ok(inert.length >= 4);
  assert.ok(inert.some((r) => r.note?.includes('O-29')));
  assert.ok(inert.some((r) => r.note?.includes('O-30') && r.label.includes('ASG')));
  assert.ok(inert.some((r) => r.label.includes('kusze') && r.group === 'A'));
  // a label is not a number — nothing resolves to an inert row
  for (const r of inert) assert.equal(permitRuleFor(r.label), undefined);
});

test('GROUP_TAGS: A/C carry permit, B/D carry age_18, only C carries permit_review', () => {
  assert.deepEqual(GROUP_TAGS.A, ['permit']);
  assert.deepEqual(GROUP_TAGS.B, ['age_18']);
  assert.deepEqual(GROUP_TAGS.C, ['permit', 'permit_review']);
  assert.deepEqual(GROUP_TAGS.D, ['age_18']);
});

// ── table integrity ──────────────────────────────────────────────────────────

test('every active row points at a number that exists in hydra-category-tree.txt', () => {
  const normNum = (n: string) => n.trim().replace(/^0+(?=\d)/, '');
  const missing = PERMIT_RULES.filter((r) => r.hydra !== null && !treeNums.has(normNum(r.hydra)));
  assert.deepEqual(missing.map((r) => r.hydra), []);
});

test('every number in the tree (except "00") is covered by exactly one most-specific row', () => {
  const uncovered = [...treeNums].filter((n) => n !== '0' && permitRuleFor(n) === undefined);
  assert.deepEqual(uncovered, []);
});

test('summary (for the report): subcategories per group across all tree leaves', () => {
  const leaves = [...treeNums].filter((n) => n !== '0' && tree.isLeaf(n));
  const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, none: 0 };
  for (const n of leaves) counts[permitGroupFor(n) ?? 'none']++;
  const inert = PERMIT_RULES.filter((r) => r.hydra === null).length;
  console.log(
    `\n[permit-rules] tree leaves: ${leaves.length} → ` +
      `A=${counts.A} B=${counts.B} C=${counts.C} D=${counts.D} none=${counts.none}; ` +
      `rows: ${PERMIT_RULES.length} (${PERMIT_RULES.length - inert} active, ${inert} inert / no Hydra branch)\n`,
  );
  assert.equal(leaves.length, Object.values(counts).reduce((a, b) => a + b, 0));
  assert.ok(counts.A > 0 && counts.B > 0 && counts.C > 0 && counts.D > 0 && counts.none > 0);
});
