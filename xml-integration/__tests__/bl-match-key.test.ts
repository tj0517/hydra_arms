/**
 * The upsert key of import and sync (HA-2.28): EAN across suppliers, SKU only within one
 * supplier (`<SUPPLIER>-<feed sku>`), a shared record keeps its creator's SKU and carries every
 * supplier's code as a merged parameter.
 *
 * importRun() below composes exactly the functions runImport() calls per product —
 * findBLMatch → planUpsert → recordIdentity → addToMatchIndex — against an in-memory catalogue.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  SOURCE_PARAM,
  addToMatchIndex,
  blSku,
  eanForUpsert,
  eanKey,
  invalidEans,
  normalizeEan,
  emptyMatchIndex,
  findBLMatch,
  mergeFeatures,
  planUpsert,
  recordIdentity,
  supplierSkuParam,
  type Supplier,
} from '../bl-match-key';
import { simulateImports, type SlimProduct } from '../feed-diagnostics';
import { connectors } from '../connectors';
import { HydraTreeFromTxt } from '../hydra-tree-txt';
import { resolveCategory, type CategoryMapFile } from '../resolve-category';
import { filterProduct } from '../assortment-filter';
import { ASSORTMENT_RULES } from '../assortment-rules';
import type { NormalizedProduct } from '../types';

interface FeedItem { sku: string; ean: string; name: string; features?: Record<string, string> }
interface BLRecord { id: number; sku: string; ean: string; name: string; features: Record<string, string> }

/**
 * One import run of `supplier` against the catalogue, as runImport() does it. `withoutData`:
 * records BaseLinker does not return from getInventoryProductsData in this run.
 */
function importRun(
  catalogue: BLRecord[],
  supplier: Supplier,
  feed: readonly FeedItem[],
  withoutData: ReadonlySet<number> = new Set(),
): { created: number; updated: number; skipped: number } {
  const index = emptyMatchIndex();
  for (const r of catalogue) addToMatchIndex(index, r.id, r.ean, r.sku);
  const existingById = new Map(catalogue.filter((r) => !withoutData.has(r.id)).map((r) => [r.id, r]));
  let created = 0, updated = 0, skipped = 0;
  for (const p of feed) {
    const plan = planUpsert(findBLMatch(index, supplier, p.ean, p.sku)?.id, existingById);
    if (plan.kind === 'skip') { skipped++; continue; }
    const existing = plan.kind === 'update' ? plan.existing : undefined;
    const identity = recordIdentity(supplier, p.sku, p.features ?? {}, existing);
    if (existing) {
      // addInventoryProduct with product_id: features replaced wholesale by what we send
      Object.assign(existing, { sku: identity.sku, ean: p.ean, name: p.name, features: identity.features });
      updated++;
    } else {
      const id = 1000 + catalogue.length;
      const record = { id, sku: identity.sku, ean: p.ean, name: p.name, features: identity.features };
      catalogue.push(record);
      addToMatchIndex(index, id, p.ean, identity.sku);
      existingById.set(id, record);
      created++;
    }
  }
  return { created, updated, skipped };
}

// ── sku-prefix ────────────────────────────────────────────────────────────────

test('sku-prefix: BaseLinker SKU is <SUPPLIER>-<feed sku> for every supplier', () => {
  assert.equal(blSku('sharg', '139'), 'SHARG-139');
  assert.equal(blSku('spechurt', '1091'), 'SPECHURT-1091');
  assert.equal(blSku('kolba', '10630001'), 'KOLBA-10630001');
  assert.equal(blSku('kolba', ' 434-570 '), 'KOLBA-434-570', 'trimmed');
  assert.equal(blSku('sharg', ''), '', 'no feed SKU → no SKU, never "SHARG-"');
  assert.equal(blSku('sharg', null), '');
  assert.deepEqual(
    (['kolba', 'sharg', 'spechurt'] as const).map(supplierSkuParam),
    ['SKU Kolba', 'SKU Sharg', 'SKU Spechurt'],
  );
});

// ── bl-match-key ──────────────────────────────────────────────────────────────

test('bl-match-key: two suppliers, same numeric SKU, no EAN → two records, never one', () => {
  const catalogue: BLRecord[] = [];
  importRun(catalogue, 'sharg', [{ sku: '139', ean: '', name: 'Kamizelka Sharg' }]);
  const second = importRun(catalogue, 'spechurt', [{ sku: '139', ean: '', name: 'Ponczo Spechurt' }]);
  assert.equal(catalogue.length, 2, 'Spechurt 139 must not land on Sharg 139');
  assert.deepEqual(second, { created: 1, updated: 0, skipped: 0 });
  assert.deepEqual(catalogue.map((r) => [r.sku, r.name]), [
    ['SHARG-139', 'Kamizelka Sharg'],
    ['SPECHURT-139', 'Ponczo Spechurt'],
  ]);
});

test('bl-match-key: same supplier, same SKU, no EAN, two runs → one record (update, not duplicate)', () => {
  const catalogue: BLRecord[] = [];
  assert.deepEqual(importRun(catalogue, 'sharg', [{ sku: '139', ean: '', name: 'Kamizelka' }]), { created: 1, updated: 0, skipped: 0 });
  assert.deepEqual(importRun(catalogue, 'sharg', [{ sku: '139', ean: '', name: 'Kamizelka (nowa nazwa)' }]), { created: 0, updated: 1, skipped: 0 });
  assert.equal(catalogue.length, 1);
  assert.deepEqual([catalogue[0].sku, catalogue[0].name], ['SHARG-139', 'Kamizelka (nowa nazwa)']);
});

test('bl-match-key: same EAN at two suppliers → one record, whichever SKUs they use', () => {
  const catalogue: BLRecord[] = [];
  importRun(catalogue, 'kolba', [{ sku: '053-057ZB1', ean: '5905247629906', name: 'Latarka (Kolba)' }]);
  const second = importRun(catalogue, 'sharg', [{ sku: '139', ean: '5905247629906', name: 'Latarka (Sharg)' }]);
  assert.deepEqual(second, { created: 0, updated: 1, skipped: 0 });
  assert.equal(catalogue.length, 1);
});

test('bl-match-key: a matched product whose BL data is missing is skipped — no update, no duplicate, nothing overwritten', () => {
  const catalogue: BLRecord[] = [];
  importRun(catalogue, 'kolba', [{ sku: '053-057ZB1', ean: '5905247629906', name: 'Latarka (Kolba)', features: { 'Moc': '300 lm' } }]);
  const before = structuredClone(catalogue);
  const run = importRun(
    catalogue, 'sharg',
    [{ sku: '139', ean: '5905247629906', name: 'Latarka (Sharg)' }, { sku: '140', ean: '', name: 'Nowy Sharg' }],
    new Set([catalogue[0].id]),
  );
  assert.deepEqual(run, { created: 1, updated: 0, skipped: 1 });
  assert.deepEqual(catalogue[0], before[0], 'the Kolba record is untouched');
  assert.equal(catalogue.length, 2, 'the skipped product is not created as a duplicate');
  assert.deepEqual(planUpsert(undefined, new Map()), { kind: 'create' });
  assert.deepEqual(planUpsert(7, new Map()), { kind: 'skip', id: 7 });
  assert.deepEqual(planUpsert(7, new Map([[7, 'data']])), { kind: 'update', id: 7, existing: 'data' });
});

test('bl-match-key: EAN is tried first, then only this supplier\'s prefixed SKU', () => {
  const index = emptyMatchIndex();
  addToMatchIndex(index, 1, '5905247629906', 'KOLBA-053-057ZB1');
  addToMatchIndex(index, 2, '', 'SHARG-139');
  assert.deepEqual(findBLMatch(index, 'sharg', '5905247629906', '139'), { id: 1, via: 'ean' });
  assert.deepEqual(findBLMatch(index, 'sharg', '', '139'), { id: 2, via: 'sku' });
  assert.deepEqual(findBLMatch(index, 'sharg', '4000000000006', '139'), { id: 2, via: 'sku' }, 'own SKU after an EAN miss');
  assert.equal(findBLMatch(index, 'spechurt', '', '139'), undefined);
  assert.equal(findBLMatch(index, 'kolba', '', '139'), undefined);
});

test('bl-match-key: sync on an index with prefixed SKUs — a bare or foreign-prefixed SKU never matches', () => {
  // The shape getProductsList returns: { [id]: { ean, sku } } — loadExistingProducts feeds it to addToMatchIndex
  const blList: Record<string, { ean: string; sku: string }> = {
    '11': { ean: '', sku: '139' },            // bare SKU (e.g. a product added by hand)
    '12': { ean: '', sku: 'SPECHURT-139' },
    '13': { ean: '', sku: 'SHARG-139' },
    '14': { ean: '5905247629906', sku: 'KOLBA-053-057ZB1' },
  };
  const index = emptyMatchIndex();
  for (const [id, p] of Object.entries(blList)) addToMatchIndex(index, Number(id), p.ean, p.sku);
  assert.equal(index.total, 4);
  // runSync: findBLMatch(index, connectorName, p.ean, p.connector_sku)?.id
  const syncIds = (supplier: Supplier, feed: FeedItem[]) => feed.map((p) => findBLMatch(index, supplier, p.ean, p.sku)?.id);
  assert.deepEqual(syncIds('sharg', [{ sku: '139', ean: '', name: '' }, { sku: '139', ean: '5905247629906', name: '' }]), [13, 14]);
  assert.deepEqual(syncIds('spechurt', [{ sku: '139', ean: '', name: '' }, { sku: '140', ean: '', name: '' }]), [12, undefined]);
  assert.deepEqual(syncIds('kolba', [{ sku: '139', ean: '', name: '' }]), [undefined], 'bare "139" is nobody\'s key');
});

// ── ean-normalize (HA-2.38) ───────────────────────────────────────────────────

test('ean-normalize: `192687280759` (Kolba) and `0192687280759` (Spechurt) are one key; written as GTIN-13', () => {
  assert.equal(eanKey('192687280759'), '00192687280759');
  assert.equal(eanKey('0192687280759'), eanKey('192687280759'));
  assert.equal(eanKey(' 00192687280759 '), eanKey('192687280759'), 'GTIN-14 with zeros, whitespace');
  assert.deepEqual(normalizeEan('192687280759'), { kind: 'ok', key: '00192687280759', write: '0192687280759' });
  assert.deepEqual(normalizeEan('0192687280759'), { kind: 'ok', key: '00192687280759', write: '0192687280759' });
  assert.deepEqual(normalizeEan('5905247629906'), { kind: 'ok', key: '05905247629906', write: '5905247629906' });
});

test('ean-normalize: Sharg 11-digit EAN (lost zeros) → 13-digit write; EAN-8 unchanged; GTIN-14 with a non-zero first digit stays 14', () => {
  assert.equal(normalizeEan('12345678905').kind, 'ok', '012345678905 that lost its zero is still a valid key');
  assert.equal(eanKey('12345678905'), eanKey('012345678905'));
  assert.deepEqual(normalizeEan('12345678905'), { kind: 'ok', key: '00012345678905', write: '0012345678905' });
  assert.deepEqual(normalizeEan('96385074'), { kind: 'ok', key: '00000096385074', write: '96385074' });
  assert.deepEqual(normalizeEan('15905247629903'), { kind: 'ok', key: '15905247629903', write: '15905247629903' });
});

test('ean-normalize: wrong check digit, wrong length, letters, all zeros → no EAN (null key)', () => {
  assert.deepEqual(normalizeEan('5905247629907'), { kind: 'invalid', raw: '5905247629907', reason: 'check digit' });
  assert.deepEqual(normalizeEan('1234567'), { kind: 'invalid', raw: '1234567', reason: 'length' });
  assert.deepEqual(normalizeEan('123456789012345'), { kind: 'invalid', raw: '123456789012345', reason: 'length' });
  assert.deepEqual(normalizeEan('59052476X9906'), { kind: 'invalid', raw: '59052476X9906', reason: 'not digits' });
  assert.equal(normalizeEan('00000000').kind, 'invalid');
  assert.deepEqual(normalizeEan(''), { kind: 'empty' });
  assert.deepEqual(normalizeEan(null), { kind: 'empty' });
  assert.equal(eanKey('5905247629907'), null);
  const index = emptyMatchIndex();
  addToMatchIndex(index, 1, '5905247629907', 'KOLBA-1');
  assert.equal(index.byEan.size, 0, 'an invalid EAN is not indexed');
  assert.deepEqual(findBLMatch(index, 'sharg', '5905247629907', '9'), undefined, 'and never matches across suppliers');
  assert.deepEqual(invalidEans([{ ean: '5905247629907' }, { ean: '5905247629906' }, { ean: null }]).map((x) => x.check.reason), ['check digit']);
});

test('ean-normalize: the upsert writes the feed EAN in GTIN-13 form; without a valid feed EAN the record keeps its own', () => {
  assert.equal(eanForUpsert('192687280759'), '0192687280759');
  assert.equal(eanForUpsert('192687280759', '5905247629906'), '0192687280759', 'a valid feed EAN wins');
  assert.equal(eanForUpsert('5905247629907', '0192687280759'), '0192687280759', 'invalid feed EAN does not blank the record\'s');
  assert.equal(eanForUpsert('', '192687280759'), '0192687280759', 'kept, in write form');
  assert.equal(eanForUpsert(null, 'ABC'), 'ABC', 'an invalid EAN already in BL is left as it is');
  assert.equal(eanForUpsert('5905247629907'), '', 'new record, invalid feed EAN → no EAN');
});

test('ean-normalize RED PROOF: Kolba `192687280759` + Spechurt `0192687280759`, the same good → one record', () => {
  // Without normalizeEan in addToMatchIndex / findBLMatch the second run creates a second record
  const catalogue: BLRecord[] = [];
  importRun(catalogue, 'kolba', [{ sku: '100-200', ean: '192687280759', name: 'Latarka (Kolba)' }]);
  const second = importRun(catalogue, 'spechurt', [{ sku: '1091', ean: '0192687280759', name: 'Latarka (Spechurt)' }]);
  assert.deepEqual(second, { created: 0, updated: 1, skipped: 0 });
  assert.equal(catalogue.length, 1);
  // …and a Sharg 11-digit EAN of the same good (a zero lost before HA-2.38) joins it too
  assert.deepEqual(importRun(catalogue, 'sharg', [{ sku: '139', ean: '192687280759', name: 'Latarka (Sharg)' }]), { created: 0, updated: 1, skipped: 0 });
  assert.equal(catalogue.length, 1);
});

// ── param-merge ───────────────────────────────────────────────────────────────

test('param-merge: same EAN at two suppliers → the record keeps both suppliers\' SKUs and parameters, „Źródło opisu” of the second, SKU of the creator', () => {
  const catalogue: BLRecord[] = [];
  importRun(catalogue, 'kolba', [{
    sku: '053-057ZB1', ean: '5905247629906', name: 'Latarka (Kolba)', features: { 'Moc': '300 lm', 'Kolor': 'czarny' },
  }]);
  importRun(catalogue, 'sharg', [{
    sku: '139', ean: '5905247629906', name: 'Latarka (Sharg)', features: { 'Kolor': 'czarny mat', 'Zasilanie': 'AA' },
  }]);
  assert.equal(catalogue.length, 1);
  const r = catalogue[0];
  assert.equal(r.sku, 'KOLBA-053-057ZB1', 'D1: the SKU of a shared record stays the creating supplier\'s');
  assert.equal(r.name, 'Latarka (Sharg)');
  assert.deepEqual(r.features, {
    'Moc': '300 lm',
    'Kolor': 'czarny mat',
    'Zasilanie': 'AA',
    'SKU Kolba': '053-057ZB1',
    'SKU Sharg': '139',
    [SOURCE_PARAM]: 'Sharg',
  });

  // …and back: Kolba's next run keeps Sharg's code, takes over „Źródło opisu”, SKU unchanged
  importRun(catalogue, 'kolba', [{ sku: '053-057ZB1', ean: '5905247629906', name: 'Latarka (Kolba)', features: { 'Moc': '300 lm' } }]);
  assert.deepEqual([r.sku, r.features['SKU Sharg'], r.features['SKU Kolba'], r.features[SOURCE_PARAM]], ['KOLBA-053-057ZB1', '139', '053-057ZB1', 'Kolba']);
});

test('param-merge: second-supplier import of an EAN-matched product leaves sku as created (D1)', () => {
  const existing = { sku: 'SHARG-139', features: { 'SKU Sharg': '139', [SOURCE_PARAM]: 'Sharg' } };
  assert.equal(recordIdentity('spechurt', '1091', {}, existing).sku, 'SHARG-139');
  assert.equal(recordIdentity('sharg', '139', {}, existing).sku, 'SHARG-139', 'own record: own SKU');
  assert.equal(recordIdentity('sharg', '140', {}, existing).sku, 'SHARG-140', 'own record whose feed SKU changed follows the feed');
  assert.equal(recordIdentity('sharg', '139', {}, { sku: '', features: {} }).sku, 'SHARG-139', 'record without SKU gets ours');
  assert.equal(recordIdentity('sharg', '139', {}, { sku: '139' }).sku, '139', 'a bare/hand-made SKU is not ours — left alone');
  assert.equal(recordIdentity('spechurt', '1091', {}).sku, 'SPECHURT-1091', 'new record: own SKU');
});

test('param-merge: parameters hold the bare supplier code; own values win, others are kept', () => {
  assert.deepEqual(
    mergeFeatures('sharg', '139', { 'Kolor': 'oliwkowy' }, { 'Kolor': 'czarny', 'SKU Spechurt': '1091', [SOURCE_PARAM]: 'Spechurt' }),
    { 'Kolor': 'oliwkowy', 'SKU Spechurt': '1091', 'SKU Sharg': '139', [SOURCE_PARAM]: 'Sharg' },
  );
  assert.deepEqual(mergeFeatures('spechurt', '', {}, null), { [SOURCE_PARAM]: 'Spechurt' }, 'no feed SKU → no SKU parameter');
});

// ── samples: the key changes matching only, never what is admitted ────────────

const root = process.cwd();
const tree = new HydraTreeFromTxt(readFileSync(resolve(root, 'xml-integration/hydra-category-tree.txt'), 'utf8'));
const categoryMap = JSON.parse(readFileSync(resolve(root, 'xml-integration/category-map.json'), 'utf8')) as CategoryMapFile;

// Same truncation repair as permit-sample-table.test.ts (the samples are cut at 60 KB)
const SAMPLES: Array<{ connector: Supplier; file: string; item: string; close: string }> = [
  { connector: 'kolba', file: 'xml-integration/samples/kolba_sample.xml', item: '</produkt>', close: '</produkty>' },
  { connector: 'sharg', file: 'xml-integration/samples/sharg_full_sample.xml', item: '</product>', close: '</products></offer>' },
  { connector: 'spechurt', file: 'xml-integration/samples/spechurt_sample.xml', item: '</produkt>', close: '</produkty>' },
];
function repairTruncatedXml(xml: string, item: string, close: string): string {
  if (xml.trimEnd().endsWith(close.slice(close.lastIndexOf('<')))) return xml;
  const cut = xml.lastIndexOf(item);
  return cut < 0 ? xml : xml.slice(0, cut + item.length) + close;
}

test('bl-match-key: on the samples every admitted product becomes its own record; admitted counts as on main', () => {
  const bySupplier: Partial<Record<Supplier, SlimProduct[]>> = {};
  const admittedBySupplier: Record<string, number> = {};
  for (const s of SAMPLES) {
    const products: NormalizedProduct[] = connectors[s.connector].parse(
      repairTruncatedXml(readFileSync(resolve(root, s.file), 'utf8'), s.item, s.close),
    );
    bySupplier[s.connector] = products.map((p) => {
      const r = resolveCategory(p, categoryMap, tree, new Set());
      // dry-run / diagnostics rule without markup env: purchase price, else feed gross price
      const admitted = filterProduct(p, r.hydraNum, p.stock ?? 0, 0, p.price_purchase ?? p.price_gross, ASSORTMENT_RULES).allowed;
      return { supplier: s.connector, id: p.connector_product_id, sku: (p.connector_sku ?? '').trim(), ean: (p.ean ?? '').trim(), name: p.name, stock: p.stock ?? 0, admitted };
    });
    admittedBySupplier[s.connector] = bySupplier[s.connector]!.filter((p) => p.admitted).length;
    for (const p of bySupplier[s.connector]!) {
      if (p.sku) assert.match(blSku(s.connector, p.sku), /^(KOLBA|SHARG|SPECHURT)-\S+$/);
    }
  }
  // Baseline: scripts/xml-feed-diagnostics.ts on the same repaired samples before HA-2.28 (2026-10-14)
  assert.deepEqual(admittedBySupplier, { kolba: 0, sharg: 0, spechurt: 1 });
  const { runs } = simulateImports(['kolba', 'sharg', 'spechurt'], bySupplier);
  for (const run of runs) {
    assert.equal(run.admitted, admittedBySupplier[run.supplier]);
    assert.equal(run.created, run.admitted, `${run.supplier}: one record per admitted product`);
    assert.equal(run.mergedBySkuOnly, 0);
  }
});
