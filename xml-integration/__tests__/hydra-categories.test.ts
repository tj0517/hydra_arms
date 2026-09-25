/**
 * Unit tests for xml-integration/hydra-categories.json.
 *
 * Verifies: every number from hydra-category-tree.txt has an integer ID;
 * "00" exists; no JSON key outside the tree except "00"; IDs are unique.
 *
 * Runner: npx tsx --test xml-integration/__tests__/hydra-categories.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseHydraTreeNumbers } from '../hydra-tree-txt';

const JSON_PATH = resolve(process.cwd(), 'xml-integration/hydra-categories.json');
const TXT_PATH = resolve(process.cwd(), 'xml-integration/hydra-category-tree.txt');

const normNum = (n: string) => n.trim().replace(/^0+(?=\d)/, '');

const raw = JSON.parse(readFileSync(JSON_PATH, 'utf8')) as Record<string, unknown>;
const txt = readFileSync(TXT_PATH, 'utf8');
const treeNums = parseHydraTreeNumbers(txt); // already normalized

// Normalize all JSON keys (mirrors HydraTree behaviour)
const mapping = new Map<string, number>(
  Object.entries(raw).map(([k, v]) => [normNum(k), v as number])
);

test('hydra-categories.json: every number in hydra-category-tree.txt has an integer ID', () => {
  const missing: string[] = [];
  for (const num of treeNums) {
    if (!mapping.has(num)) missing.push(num);
  }
  assert.deepEqual(
    missing,
    [],
    `Numbers in tree but missing from JSON: ${missing.join(', ')}`
  );
});

test('hydra-categories.json: "00" (DO PRZYPISANIA) key exists', () => {
  // "00" normalises to "0" via normNum
  assert.ok(mapping.has('0'), '"00" key must be present (normalises to "0")');
  assert.equal(typeof mapping.get('0'), 'number', '"00" value must be a number');
  assert.ok((mapping.get('0') as number) > 0, '"00" ID must be a positive integer');
});

test('hydra-categories.json: all values are positive integers', () => {
  const bad: string[] = [];
  for (const [k, v] of mapping) {
    if (!Number.isInteger(v) || v <= 0) bad.push(`${k}=${JSON.stringify(v)}`);
  }
  assert.deepEqual(bad, [], `Non-positive-integer values: ${bad.join(', ')}`);
});

test('hydra-categories.json: no key outside the tree (except "00")', () => {
  const extra: string[] = [];
  for (const [k] of mapping) {
    if (k === '0') continue; // "00" → "0" is the only allowed extra
    if (!treeNums.has(k)) extra.push(k);
  }
  assert.deepEqual(
    extra,
    [],
    `JSON keys not in tree: ${extra.join(', ')}`
  );
});

test('hydra-categories.json: IDs are unique', () => {
  const seen = new Map<number, string>();
  const dupes: string[] = [];
  for (const [k, v] of mapping) {
    if (seen.has(v)) dupes.push(`${k} and ${seen.get(v)} both map to ID ${v}`);
    else seen.set(v, k);
  }
  assert.deepEqual(dupes, [], `Duplicate IDs: ${dupes.join('; ')}`);
});
