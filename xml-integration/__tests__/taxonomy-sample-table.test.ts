/**
 * Before/after table for HA-2.18: runs the REAL resolver (resolve-category.ts,
 * category-map.json, hydra-category-tree.txt) and the REAL filter over
 * xml-integration/samples/*.xml and prints, per connector, how many products
 * the import filter accepts / rejects (with the reason) under:
 *
 *   before — the static P1 list only (= main before HA-2.18; identical to the
 *            default NEW_SUBCATEGORY_DEFAULT_PRIORITY=P2)
 *   P2     — new subcategories at the default priority (today's behaviour)
 *   P1     — every new subcategory treated as P1 (what the client's O-22 answer
 *            could open up at most)
 *
 * Known limit: kolba_sample.xml / sharg_full_sample.xml are 60 KB head cuts
 * (accessories only) — the delta is small and the table says so.
 *
 * Runner: npx tsx --test xml-integration/__tests__/taxonomy-sample-table.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { connectors } from '../connectors';
import { HydraTreeFromTxt } from '../hydra-tree-txt';
import { resolveCategory, type CategoryMapFile } from '../resolve-category';
import { filterProduct, type FilterReason } from '../assortment-filter';
import { ASSORTMENT_RULES, effectiveAllowedHydraNums, type AssortmentRules } from '../assortment-rules';
import type { NormalizedProduct } from '../types';

const root = process.cwd();
const tree = new HydraTreeFromTxt(readFileSync(resolve(root, 'xml-integration/hydra-category-tree.txt'), 'utf8'));
const categoryMap = JSON.parse(readFileSync(resolve(root, 'xml-integration/category-map.json'), 'utf8')) as CategoryMapFile;

const SAMPLES: Array<{ connector: 'kolba' | 'sharg' | 'spechurt'; file: string; item: string; close: string }> = [
  { connector: 'kolba', file: 'xml-integration/samples/kolba_sample.xml', item: '</produkt>', close: '</produkty>' },
  { connector: 'sharg', file: 'xml-integration/samples/sharg_full_sample.xml', item: '</product>', close: '</products></offer>' },
  { connector: 'spechurt', file: 'xml-integration/samples/spechurt_sample.xml', item: '</produkt>', close: '</produkty>' },
];

/** Same helper as permit-sample-table.test.ts: close the 60 KB head cuts after the last complete item. */
function repairTruncatedXml(xml: string, item: string, close: string): string {
  if (xml.trimEnd().endsWith(close.slice(close.lastIndexOf('<')))) return xml;
  const cut = xml.lastIndexOf(item);
  return cut < 0 ? xml : xml.slice(0, cut + item.length) + close;
}

/** `before` = the filter as it was before HA-2.18: static list, no new-subcategory rows at all. */
const RULE_SETS: Record<'before' | 'P2' | 'P1', AssortmentRules> = {
  before: { ...ASSORTMENT_RULES, newSubcategories: [], newSubcategoryDefaultPriority: 'P2' },
  P2: { ...ASSORTMENT_RULES, newSubcategoryDefaultPriority: 'P2' },
  P1: { ...ASSORTMENT_RULES, newSubcategoryDefaultPriority: 'P1' },
};
type SetName = keyof typeof RULE_SETS;
const SET_NAMES = Object.keys(RULE_SETS) as SetName[];

interface Row { connector: string; sku: string; name: string; hydra: string; verdict: Record<SetName, FilterReason> }

const rows: Row[] = [];
/** items physically in the (repaired) sample vs. products the connector handed over (Sharg drops non-defence items itself). */
const parsed: Record<string, { items: number; products: number }> = {};
for (const s of SAMPLES) {
  const xml = repairTruncatedXml(readFileSync(resolve(root, s.file), 'utf8'), s.item, s.close);
  const products: NormalizedProduct[] = connectors[s.connector].parse(xml);
  parsed[s.connector] = { items: xml.split(s.item).length - 1, products: products.length };
  for (const p of products) {
    const r = resolveCategory(p, categoryMap, tree, new Set());
    const verdict = {} as Record<SetName, FilterReason>;
    for (const name of SET_NAMES) {
      // price 0 with minPricePln 0 = price filter disabled, as in the real rules
      verdict[name] = filterProduct(p, r.hydraNum, p.stock ?? 0, 0, 0, RULE_SETS[name]).reason;
    }
    rows.push({ connector: s.connector, sku: p.connector_sku ?? p.connector_product_id, name: p.name.slice(0, 40), hydra: r.hydraNum ?? '00', verdict });
  }
}

function summary(connector: string, set: SetName): { accepted: number; rejected: number; reasons: string } {
  const mine = rows.filter((r) => r.connector === connector);
  const accepted = mine.filter((r) => r.verdict[set] === 'ok').length;
  const counts: Partial<Record<FilterReason, number>> = {};
  for (const r of mine) if (r.verdict[set] !== 'ok') counts[r.verdict[set]] = (counts[r.verdict[set]] ?? 0) + 1;
  const reasons = Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ') || '—';
  return { accepted, rejected: mine.length - accepted, reasons };
}

test('taxonomy sample table (HA-2.18): accepted / rejected / reason per connector — before vs P2 (default) vs P1', () => {
  assert.ok(rows.length > 0, 'samples parsed');
  const extraP1 = effectiveAllowedHydraNums(RULE_SETS.P1).filter((n) => !ASSORTMENT_RULES.allowedHydraNums.includes(n));
  console.log(`\n[taxonomy-sample-table] ${rows.length} products from ${SAMPLES.length} samples; ` +
    `nodes P1 would add: ${[...new Set(extraP1)].join(' ')}`);
  console.log('connector  set     accepted  rejected  reasons                      (items in sample → products from connector)');
  console.log('-'.repeat(100));
  for (const s of SAMPLES) {
    const p = parsed[s.connector];
    console.log(`${s.connector.padEnd(10)} ${''.padEnd(7)} ${''.padEnd(8)}  ${''.padEnd(8)}  ${''.padEnd(28)} ${p.items} → ${p.products}` +
      (p.products === 0 ? '  (connector kept nothing — nothing reaches the assortment filter)' : ''));
    for (const set of SET_NAMES) {
      const x = summary(s.connector, set);
      console.log(`${s.connector.padEnd(10)} ${set.padEnd(7)} ${String(x.accepted).padStart(8)}  ${String(x.rejected).padStart(8)}  ${x.reasons.padEnd(28)}`);
    }
  }
  const flipped = rows.filter((r) => SET_NAMES.some((a) => r.verdict[a] !== r.verdict.before));
  console.log(`\nproducts whose verdict differs between the sets: ${flipped.length}`);
  for (const r of flipped) {
    console.log(`  ${r.connector.padEnd(9)} ${r.sku.padEnd(14)} ${r.name.padEnd(40)} ${r.hydra.padEnd(6)} ` +
      SET_NAMES.map((n) => `${n}=${r.verdict[n]}`).join(' '));
  }
  if (flipped.length === 0) console.log('  (none — the 60 KB head-cut samples hold accessories only; no product sits on a new-subcategory node)');
  console.log('');
});

test('taxonomy sample table (HA-2.18): default P2 is identical to the pre-HA-2.18 filter on every sample product', () => {
  for (const r of rows) assert.equal(r.verdict.P2, r.verdict.before, `${r.connector} ${r.sku}`);
});

test('taxonomy sample table (HA-2.18): P1 can only widen the result (never rejects something `before` accepted)', () => {
  for (const r of rows) {
    if (r.verdict.before === 'ok') assert.equal(r.verdict.P1, 'ok', `${r.connector} ${r.sku}`);
  }
});
