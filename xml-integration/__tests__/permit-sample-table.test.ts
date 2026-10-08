/**
 * Sample-feed table (HA-2.17): runs the REAL resolver (resolve-category.ts,
 * category-map.json, hydra-category-tree.txt) and the real tag functions
 * (import-tags.ts + permit-rules.ts) over xml-integration/samples/*.xml and
 * prints a table of products per permit group. Proves group C defaults to
 * permit + permit_review on real feed rows.
 *
 * Runner: npx tsx --test xml-integration/__tests__/permit-sample-table.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { connectors } from '../connectors';
import { HydraTreeFromTxt } from '../hydra-tree-txt';
import { resolveCategory, type CategoryMapFile } from '../resolve-category';
import { computeImportTags } from '../import-tags';
import { permitGroupFor } from '../permit-rules';
import type { NormalizedProduct } from '../types';

const root = process.cwd();
const tree = new HydraTreeFromTxt(readFileSync(resolve(root, 'xml-integration/hydra-category-tree.txt'), 'utf8'));
const categoryMap = JSON.parse(readFileSync(resolve(root, 'xml-integration/category-map.json'), 'utf8')) as CategoryMapFile;

const SAMPLES: Array<{ connector: 'kolba' | 'sharg' | 'spechurt'; file: string; item: string; close: string }> = [
  { connector: 'kolba', file: 'xml-integration/samples/kolba_sample.xml', item: '</produkt>', close: '</produkty>' },
  { connector: 'sharg', file: 'xml-integration/samples/sharg_full_sample.xml', item: '</product>', close: '</products></offer>' },
  { connector: 'spechurt', file: 'xml-integration/samples/spechurt_sample.xml', item: '</produkt>', close: '</produkty>' },
];

/**
 * kolba_sample.xml / sharg_full_sample.xml are 60 000-byte head cuts of the
 * live feeds (not well-formed): keep everything up to the last complete item
 * and close the root. Complete files (spechurt) are returned unchanged.
 */
function repairTruncatedXml(xml: string, item: string, close: string): string {
  if (xml.trimEnd().endsWith(close.slice(close.lastIndexOf('<')))) return xml;
  const cut = xml.lastIndexOf(item);
  return cut < 0 ? xml : xml.slice(0, cut + item.length) + close;
}

interface Row { connector: string; sku: string; name: string; hydra: string; group: string; tags: string }

const rows: Row[] = [];
const perGroup: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, none: 0 };
let parsedTotal = 0;

for (const s of SAMPLES) {
  const xml = repairTruncatedXml(readFileSync(resolve(root, s.file), 'utf8'), s.item, s.close);
  const products: NormalizedProduct[] = connectors[s.connector].parse(xml);
  parsedTotal += products.length;
  const unknown = new Set<string>();
  for (const p of products) {
    const r = resolveCategory(p, categoryMap, tree, unknown);
    const group = permitGroupFor(r.hydraNum) ?? 'none';
    perGroup[group]++;
    rows.push({
      connector: s.connector,
      sku: p.connector_sku ?? p.connector_product_id,
      name: p.name.slice(0, 44),
      hydra: r.hydraNum ?? '00',
      group,
      tags: computeImportTags(r).join(','),
    });
  }
}

/**
 * ≥ 12 rows: every A/B/C/D row, plus `none` rows for contrast. The samples are
 * 60 KB head cuts (28 + 6 + 3 complete items), so a group can be absent — the
 * table says so instead of inventing rows.
 */
function tableRows(): Row[] {
  const restricted = rows.filter((r) => r.group !== 'none');
  const none = rows.filter((r) => r.group === 'none').slice(0, Math.max(8, 12 - restricted.length));
  return [...restricted, ...none].sort((a, b) => a.group.localeCompare(b.group) || a.hydra.localeCompare(b.hydra, undefined, { numeric: true }));
}

function printTable(list: Row[]): void {
  const w = { c: 8, sku: 16, name: 44, hydra: 7, group: 5 };
  const line = (r: Row) =>
    `${r.connector.padEnd(w.c)} ${r.sku.padEnd(w.sku)} ${r.name.padEnd(w.name)} ${r.hydra.padEnd(w.hydra)} ${r.group.padEnd(w.group)} ${r.tags}`;
  console.log(`\n[permit-sample-table] parsed ${parsedTotal} products from ${SAMPLES.length} samples → ` +
    `A=${perGroup.A} B=${perGroup.B} C=${perGroup.C} D=${perGroup.D} none=${perGroup.none}`);
  console.log(line({ connector: 'feed', sku: 'sku', name: 'product', hydra: 'hydra', group: 'grp', tags: 'tags' }));
  console.log('-'.repeat(110));
  for (const r of list) console.log(line(r));
  const missing = (['A', 'B', 'C', 'D'] as const).filter((g) => perGroup[g] === 0);
  console.log(missing.length ? `\n(groups not present in the samples: ${missing.join(', ')})\n` : '\n(all groups A–D present)\n');
}

test('sample table: ≥ 12 products printed across groups (product, category, tags)', () => {
  const list = tableRows();
  printTable(list);
  assert.ok(parsedTotal > 0, 'samples parsed');
  assert.ok(list.length >= 12, `expected ≥ 12 rows, got ${list.length}`);
});

test('group C products in the samples carry permit + permit_review (pickup until the client decides)', () => {
  const c = rows.filter((r) => r.group === 'C');
  for (const r of c) {
    assert.ok(r.tags.split(',').includes('permit'), `${r.sku} permit`);
    assert.ok(r.tags.split(',').includes('permit_review'), `${r.sku} permit_review`);
  }
  // Honest reporting: say so when the samples don't contain a C product.
  if (c.length === 0) console.log('[permit-sample-table] no group C product in the samples');
});

test('group A products carry permit without permit_review; B/D carry age_18 only; none carries status only', () => {
  for (const r of rows) {
    const tags = r.tags.split(',');
    const status = tags[0];
    assert.ok(['auto', 'review', 'flag'].includes(status), `${r.sku} status first`);
    const rest = tags.slice(1).sort();
    if (r.group === 'A') assert.deepEqual(rest, ['permit'], r.sku);
    if (r.group === 'B' || r.group === 'D') assert.deepEqual(rest, ['age_18'], r.sku);
    if (r.group === 'C') assert.deepEqual(rest, ['permit', 'permit_review'], r.sku);
    if (r.group === 'none') assert.deepEqual(rest, [], r.sku);
  }
});

test('"00. DO PRZYPISANIA" products never get permit tags', () => {
  for (const r of rows.filter((x) => x.hydra === '00')) assert.equal(r.tags, 'flag', r.sku);
});
