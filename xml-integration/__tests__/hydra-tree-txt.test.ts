/**
 * Unit tests for HydraTreeFromTxt — verifies Hydra tree parsing from the txt
 * file without requiring hydra-categories.json.
 *
 * Runner: npx tsx --test xml-integration/__tests__/hydra-tree-txt.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  parseHydraTreeNumbers,
  HydraTreeFromTxt,
  parseHydraTree,
  UNASSIGNED_CATEGORY,
} from '../hydra-tree-txt';

const TXT_PATH = resolve(process.cwd(), 'xml-integration/hydra-category-tree.txt');
const JSON_PATH = resolve(process.cwd(), 'xml-integration/hydra-categories.json');
const txt = readFileSync(TXT_PATH, 'utf8');

test('parseHydraTreeNumbers: extracts a reasonable number of Hydra nodes', () => {
  const nums = parseHydraTreeNumbers(txt);
  assert.ok(nums.size >= 80, `expected ≥80 tree nodes, got ${nums.size}`);
});

test('parseHydraTreeNumbers: known numbers present', () => {
  const nums = parseHydraTreeNumbers(txt);
  for (const n of ['3.1', '3.4.1', '11.1', '11.1.3', '15.1.1']) {
    assert.ok(nums.has(n), `"${n}" should be in the tree`);
  }
});

test('parseHydraTreeNumbers: leading zeros stripped (04 → 4)', () => {
  const nums = parseHydraTreeNumbers(txt);
  assert.ok(nums.has('4'), 'normNum("04") = "4" must be present');
  assert.ok(!nums.has('04'), '"04" should not appear with leading zero');
});

test('HydraTreeFromTxt: resolve returns 0 for valid num, undefined for invalid', () => {
  const tree = new HydraTreeFromTxt(txt);
  assert.equal(tree.resolve('3.1'), 0, 'leaf node resolves to dummy id 0');
  assert.equal(tree.resolve('04'), 0, 'leading-zero "04" resolves (normalised to "4")');
  assert.equal(tree.resolve('99.9'), undefined, 'unknown number returns undefined');
});

test('HydraTreeFromTxt: isLeaf — leaf vs parent', () => {
  const tree = new HydraTreeFromTxt(txt);
  // 3.1 has no children
  assert.equal(tree.isLeaf('3.1'), true, '"3.1" should be a leaf');
  // 3.4 has children 3.4.1 … 3.4.x
  assert.equal(tree.isLeaf('3.4'), false, '"3.4" Systemy Montażowe has children — not a leaf');
  // 11.1 has children 11.1.1 … 11.1.4
  assert.equal(tree.isLeaf('11.1'), false, '"11.1" has children — not a leaf');
  // 11.1.3 has no children
  assert.equal(tree.isLeaf('11.1.3'), true, '"11.1.3" should be a leaf');
});

test('HydraTreeFromTxt: isAge18Branch identifies branch 15 and descendants', () => {
  const tree = new HydraTreeFromTxt(txt);
  assert.equal(tree.isAge18Branch('15'), true, '"15" is the age-18 root');
  assert.equal(tree.isAge18Branch('15.1.1'), true, '"15.1.1" is under the age-18 branch');
  assert.equal(tree.isAge18Branch('14.2'), false, '"14.2" is not the age-18 branch');
});

test('HydraTreeFromTxt: unassignedId returns 0 (dry-run dummy)', () => {
  const tree = new HydraTreeFromTxt(txt);
  assert.equal(tree.unassignedId, 0);
});

// ── parseHydraTree (HA-2.26) — the parser scripts/bl-build-categories.ts sends to BL ──

const normNum = (n: string) => n.trim().replace(/^0+(?=\d)/, '');

test('parseHydraTree: 205 categories, 15 roots "01".."15" in file order', () => {
  const cats = parseHydraTree(txt);
  assert.equal(cats.length, 205);
  const roots = cats.filter((c) => c.parentNum === null);
  assert.deepEqual(
    roots.map((c) => c.num),
    Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0')),
  );
  assert.equal(roots[0].blName, '01. BROŃ PALNA');
  assert.equal(roots[14].blName, '15. ŚRODKI DO OCHRONY OSOBISTEJ');
});

test('parseHydraTree: same number set as parseHydraTreeNumbers (two parsers agree)', () => {
  const fromFull = new Set(parseHydraTree(txt).map((c) => normNum(c.num)));
  assert.deepEqual([...fromFull].sort(), [...parseHydraTreeNumbers(txt)].sort());
});

test('parseHydraTree: keys written to hydra-categories.json = tree numbers + "00"', () => {
  // The build script writes { [num]: BL id } for UNASSIGNED_CATEGORY + parsed tree.
  const willWrite = [UNASSIGNED_CATEGORY, ...parseHydraTree(txt)].map((c) => c.num).sort();
  const inRepo = Object.keys(JSON.parse(readFileSync(JSON_PATH, 'utf8')) as Record<string, unknown>).sort();
  assert.equal(willWrite.length, 206);
  assert.deepEqual(willWrite, inRepo);
});

test('parseHydraTree: parent derived from the number, descriptions stripped', () => {
  const byNum = new Map(parseHydraTree(txt).map((c) => [c.num, c]));
  assert.deepEqual(byNum.get('1.1'), { num: '1.1', name: 'Broń Krótka', blName: '1.1 Broń Krótka', parentNum: '01' });
  assert.deepEqual(byNum.get('1.1.1'), {
    num: '1.1.1', name: 'Pistolety Samopowtarzalne', blName: '1.1.1 Pistolety Samopowtarzalne', parentNum: '1.1',
  });
  assert.equal(byNum.get('3.4.3')?.parentNum, '3.4');
  assert.equal(byNum.get('10.1')?.parentNum, '10', 'two-digit root keeps its form');
  // "1.5" hangs off a broken "└──" in the source — hierarchy must still come from the number
  assert.equal(byNum.get('1.5')?.parentNum, '01');
  assert.equal(byNum.get('1.5')?.blName, '1.5 Broń alarmowa i sygnałowa');
});

test('parseHydraTree: every parent exists and is listed before its child', () => {
  const cats = parseHydraTree(txt);
  const position = new Map(cats.map((c, i) => [c.num, i]));
  for (const [i, c] of cats.entries()) {
    if (c.parentNum === null) continue;
    const parentPos = position.get(c.parentNum);
    assert.ok(parentPos !== undefined, `${c.num}: parent ${c.parentNum} not in tree`);
    assert.ok(parentPos < i, `${c.num}: parent ${c.parentNum} must be created first`);
  }
});

test('parseHydraTree: BL names carry no parentheses and are unique (idempotent re-run key)', () => {
  const cats = parseHydraTree(txt);
  assert.deepEqual(cats.filter((c) => /[()]/.test(c.blName)).map((c) => c.blName), []);
  assert.equal(new Set(cats.map((c) => c.blName)).size, cats.length);
});

test('parseHydraTree: sample — broken box-drawing, stray paren, duplicate, non-category lines', () => {
  const sample = [
    '[PORTAL E-COMMERCE / SYSTEM ERP]',
    ' │',
    ' ├── 01. BROŃ PALNA (Koncesjonowana – Odbiór osobisty)',
    ' │    └── 1.4 Broń Kolekcjonerska (Demobil)',
    ' │    └── 1.5 Broń alarmowa ',
    ' └── 15. ŚRODKI (18+)',
    '      ├── 15.3 Paralizatory',
    '      │    └── 15.3.1 Paralizatory Kontaktowe)',
    '      └── 15.3 Duplikat',
  ].join('\r\n');
  const origWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (msg: string) => { warnings.push(msg); };
  try {
    assert.deepEqual(parseHydraTree(sample), [
      { num: '01', name: 'BROŃ PALNA', blName: '01. BROŃ PALNA', parentNum: null },
      { num: '1.4', name: 'Broń Kolekcjonerska', blName: '1.4 Broń Kolekcjonerska', parentNum: '01' },
      { num: '1.5', name: 'Broń alarmowa', blName: '1.5 Broń alarmowa', parentNum: '01' },
      { num: '15', name: 'ŚRODKI', blName: '15. ŚRODKI', parentNum: null },
      { num: '15.3', name: 'Paralizatory', blName: '15.3 Paralizatory', parentNum: '15' },
      { num: '15.3.1', name: 'Paralizatory Kontaktowe', blName: '15.3.1 Paralizatory Kontaktowe', parentNum: '15.3' },
    ]);
  } finally {
    console.warn = origWarn;
  }
  assert.equal(warnings.length, 1, 'duplicate 15.3 is reported once and skipped');
});
