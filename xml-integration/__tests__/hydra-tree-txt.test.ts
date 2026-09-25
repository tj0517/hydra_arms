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
import { parseHydraTreeNumbers, HydraTreeFromTxt } from '../hydra-tree-txt';

const TXT_PATH = resolve(process.cwd(), 'xml-integration/hydra-category-tree.txt');
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
