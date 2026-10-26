/**
 * Per-product manual margin (HA-2.22): the client's „Marża %” extra field in BL.
 *
 *   - parsing and validation of the field value, env fallback with a warning carrying the ID
 *   - red proof: a manual margin survives the sync — runSyncCore (the sync of
 *     scripts/xml-to-baselinker.ts) against an in-memory BaseLinker; without the field
 *     configured (behaviour before HA-2.22) the same run overwrites it with the env price
 *   - red proof: no write of import or sync carries the field
 *   - audit (scripts/audit-import.ts, section A): a record priced from its field is no mismatch
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import type { NormalizedProduct } from '../types';
import {
  MarginTally,
  chooseMargin,
  computeSellingPrice,
  expectedSalePrice,
  marginFieldKey,
  parseMarginValue,
  readMarginRaw,
  salePriceDiffers,
} from '../margin';
import { runSyncCore, toBLProduct, type SyncDeps, type WriteEnv } from '../bl-write';
import type { Supplier } from '../bl-match-key';

const FIELD = 'extra_field_75';
const SALE = 104511;
const PURCHASE = 104512;

function product(over: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    connector: 'kolba',
    connector_product_id: 'K1',
    connector_sku: '100-200',
    ean: '5901234567890',
    brand: null,
    name: 'Latarka taktyczna',
    description_html: '<p>opis</p>',
    short_description: null,
    features: {},
    price_gross: 199,
    price_net: 161.79,
    tax_rate: 23,
    price_purchase: 100,
    price_compare: null,
    stock: 7,
    weight_g: 250,
    images: [],
    supplier_category_id: null,
    supplier_category_name: null,
    has_variants: false,
    variants: [],
    _hints: { requires_license: false, age_restricted: false, pickup_only: false },
    source_url: null,
    raw_connector_category: null,
    ...over,
  };
}

function env(over: Partial<WriteEnv> = {}): WriteEnv {
  return { inventoryId: 119068, priceGroup: SALE, priceGroupPurchase: PURCHASE, warehouse: 'bl_157483', markupPct: 30, ...over };
}

// ── Parsing ───────────────────────────────────────────────────────────────────

test('field value: „45”, „45%”, „45,5” and friends parse to a number', () => {
  assert.deepEqual(parseMarginValue('45'), { kind: 'ok', pct: 45 });
  assert.deepEqual(parseMarginValue('45%'), { kind: 'ok', pct: 45 });
  assert.deepEqual(parseMarginValue('45,5'), { kind: 'ok', pct: 45.5 });
  assert.deepEqual(parseMarginValue(' 45,5 % '), { kind: 'ok', pct: 45.5 });
  assert.deepEqual(parseMarginValue('45.5'), { kind: 'ok', pct: 45.5 });
  assert.deepEqual(parseMarginValue(45), { kind: 'ok', pct: 45 });
  assert.deepEqual(parseMarginValue('0'), { kind: 'ok', pct: 0 });
  assert.deepEqual(parseMarginValue('200'), { kind: 'ok', pct: 200 });
});

test('field value: empty means „not set”', () => {
  for (const v of [undefined, null, '', '   ']) assert.deepEqual(parseMarginValue(v), { kind: 'empty' }, String(v));
});

test('field value: text, negative, above 200 and odd formats are rejected', () => {
  for (const v of ['abc', '-5', '250', '200.01', '45abc', '1e2', '+45', '45%%', '4 5', -5, 250, NaN, Infinity]) {
    assert.equal(parseMarginValue(v).kind, 'invalid', String(v));
  }
});

test('field ID from env: bare number or extra_field_<id>; empty = off; anything else throws', () => {
  assert.equal(marginFieldKey('75'), FIELD);
  assert.equal(marginFieldKey(' extra_field_75 '), FIELD);
  assert.equal(marginFieldKey(undefined), null);
  assert.equal(marginFieldKey(''), null);
  assert.throws(() => marginFieldKey('Marża %'), /not a BL extra field ID/);
  assert.throws(() => marginFieldKey('75a'), /not a BL extra field ID/);
});

test('field read from text_fields: plain key, else a single language variant; integration overrides ignored', () => {
  assert.equal(readMarginRaw({ name: 'x', [FIELD]: '45' }, FIELD), '45');
  assert.equal(readMarginRaw({ name: 'x', [`${FIELD}|pl`]: '40' }, FIELD), '40');
  assert.equal(readMarginRaw({ [FIELD]: '45', [`${FIELD}|pl`]: '40' }, FIELD), '45');
  assert.equal(readMarginRaw({ [`${FIELD}|pl`]: '40', [`${FIELD}|en`]: '41' }, FIELD), undefined);
  assert.equal(readMarginRaw({ [`${FIELD}|pl|5008603`]: '40' }, FIELD), undefined);
  assert.equal(readMarginRaw({ extra_field_7: '45' }, FIELD), undefined);
  assert.equal(readMarginRaw([], FIELD), undefined);
  assert.equal(readMarginRaw(undefined, FIELD), undefined);
});

// ── Price ─────────────────────────────────────────────────────────────────────

test('price: empty field → env markup; field 45 → purchase × 1.45', () => {
  const p = product({ price_purchase: 100 });
  assert.deepEqual(chooseMargin(undefined, 30), { pct: 30, source: 'env' });
  assert.equal(computeSellingPrice(p, chooseMargin(undefined, 30).pct).price, 130);
  assert.equal(computeSellingPrice(p, chooseMargin('', 30).pct).price, 130);
  assert.deepEqual(chooseMargin('45', 30), { pct: 45, source: 'field' });
  assert.equal(computeSellingPrice(p, chooseMargin('45', 30).pct).price, 145);
  assert.equal(computeSellingPrice(product({ price_purchase: 87.35 }), chooseMargin('45,5', 30).pct).price, 127.09);
});

test('price: „abc” / -5 / 250 → env markup + warning with the BL product ID, never price 0', () => {
  const warnings: string[] = [];
  const tally = new MarginTally((l) => warnings.push(l));
  const ids = [9001, 9002, 9003];
  ['abc', '-5', '250'].forEach((raw, k) => {
    const choice = chooseMargin(raw, 30);
    assert.deepEqual(choice, { pct: 30, source: 'env', rejected: raw });
    assert.equal(computeSellingPrice(product(), choice.pct).price, 130);
    tally.note(ids[k], choice);
  });
  tally.note(9004, chooseMargin('45', 30));
  assert.equal(warnings.length, 3);
  ids.forEach((id, k) => assert.match(warnings[k], new RegExp(`BL product ${id} has "${['abc', '-5', '250'][k]}".*env markup 30% used`)));
  assert.match(tally.summary(), /1 products priced from the field, 3 field values rejected, 3 on env markup/);
});

test('price: no purchase price → feed gross price, the field does not apply (HA-2.05 unchanged)', () => {
  const p = product({ price_purchase: null, price_gross: 199 });
  assert.deepEqual(computeSellingPrice(p, chooseMargin('45', 30).pct), { price: 199, fromFallback: true, priceZero: false });
});

// ── In-memory BaseLinker ──────────────────────────────────────────────────────

interface FakeRecord {
  ean: string;
  sku: string;
  text_fields: Record<string, unknown>;
  prices: Record<string, number>;
  stock: Record<string, number>;
}

class FakeBL {
  calls: Array<{ method: string; payload: unknown }> = [];
  failData = false;
  /** ids getInventoryProductsData leaves out (BL hiccup) */
  hidden = new Set<number>();
  constructor(public records: Map<number, FakeRecord>) {}

  deps(marginKey: string | null, warnings: string[] = []): SyncDeps {
    return {
      getProductsList: async (_inv, page = 1) => {
        this.calls.push({ method: 'getInventoryProductsList', payload: { page } });
        if (page > 1) return {};
        return Object.fromEntries([...this.records].map(([id, r]) => [String(id), { ean: r.ean, sku: r.sku }]));
      },
      getProductsData: async (_inv, ids) => {
        this.calls.push({ method: 'getInventoryProductsData', payload: ids });
        if (this.failData) throw new Error('BaseLinker error: ERROR_TEST — read failed');
        return Object.fromEntries(ids.filter((id) => this.records.has(Number(id)) && !this.hidden.has(Number(id)))
          .map((id) => { const r = this.records.get(Number(id))!; return [id, { text_fields: { ...r.text_fields }, prices: { ...r.prices } }]; }));
      },
      updateStock: async (_inv, products) => {
        this.calls.push({ method: 'updateInventoryProductsStock', payload: products });
        for (const [id, s] of Object.entries(products)) Object.assign(this.records.get(Number(id))!.stock, s);
        return { counter: Object.keys(products).length, warnings: {} };
      },
      updatePrices: async (_inv, products) => {
        this.calls.push({ method: 'updateInventoryProductsPrices', payload: products });
        for (const [id, p] of Object.entries(products)) Object.assign(this.records.get(Number(id))!.prices, p);
        return { counter: Object.keys(products).length, warnings: {} };
      },
      sleep: async () => undefined,
      rateLimitMs: 0,
      marginKey,
      log: () => undefined,
      warn: (l) => warnings.push(l),
      tally: new MarginTally((l) => warnings.push(l)),
    };
  }

  writes(): unknown[] {
    return this.calls.filter((c) => !c.method.startsWith('get')).map((c) => c.payload);
  }
}

/** Catalogue: 1 = manual margin 45 (shown at purchase × 1.45 after the client's edit), 2 = no field. */
function catalogue(field1: unknown = '45'): FakeBL {
  return new FakeBL(new Map<number, FakeRecord>([
    [1, { ean: '5901234567890', sku: 'KOLBA-100-200', text_fields: { name: 'Latarka', [FIELD]: field1 }, prices: { [SALE]: 145, [PURCHASE]: 100 }, stock: { bl_157483: 3 } }],
    [2, { ean: '5900000000002', sku: 'KOLBA-100-201', text_fields: { name: 'Nóż' }, prices: { [SALE]: 65, [PURCHASE]: 50 }, stock: { bl_157483: 1 } }],
  ]));
}

const feed = (): NormalizedProduct[] => [
  product({ connector_sku: '100-200', ean: '5901234567890', price_purchase: 100, stock: 7 }),
  product({ connector_product_id: 'K2', connector_sku: '100-201', ean: '5900000000002', price_purchase: 50, stock: 4 }),
];

async function sync(bl: FakeBL, marginKey: string | null, supplier: Supplier = 'kolba', e: WriteEnv = env(), products = feed()) {
  const warnings: string[] = [];
  const res = await runSyncCore(products, supplier, e, bl.deps(marginKey, warnings));
  return { ...res, warnings };
}

// ── Red proof: sync ───────────────────────────────────────────────────────────

test('red proof — before HA-2.22 (field not read) the sync overwrites the manual margin with the env price', async () => {
  const bl = catalogue('45');
  await sync(bl, null);
  assert.equal(bl.records.get(1)!.prices[SALE], 130, 'env-only sync writes purchase × 1.30 over the client\'s 145');
});

test('red proof — with the field read, the manual margin survives the sync; the field-less product stays on env', async () => {
  const bl = catalogue('45');
  const { ok, warnings } = await sync(bl, FIELD);
  assert.equal(ok, true);
  assert.equal(bl.records.get(1)!.prices[SALE], 145);
  assert.equal(bl.records.get(2)!.prices[SALE], 65); // 50 × 1.30
  assert.equal(bl.records.get(1)!.prices[PURCHASE], 100);
  assert.equal(bl.records.get(1)!.stock.bl_157483, 7);
  assert.equal(bl.records.get(1)!.text_fields[FIELD], '45');
  assert.deepEqual(warnings, []);
  // The field is read with getInventoryProductsData only — no other read method, one call
  assert.deepEqual(bl.calls.filter((c) => c.method === 'getInventoryProductsData').map((c) => c.payload), [['1', '2']]);
});

test('sync: a changed purchase price moves the price at the product\'s own margin', async () => {
  const bl = catalogue('45');
  await sync(bl, FIELD, 'kolba', env(), [product({ price_purchase: 120 })]);
  assert.equal(bl.records.get(1)!.prices[SALE], 174);
});

test('sync: invalid field value → env price + warning with the BL product ID, run goes on', async () => {
  for (const raw of ['abc', '-5', '250']) {
    const bl = catalogue(raw);
    const { ok, warnings } = await sync(bl, FIELD);
    assert.equal(ok, true);
    assert.equal(bl.records.get(1)!.prices[SALE], 130, raw);
    assert.equal(bl.records.get(2)!.prices[SALE], 65, raw);
    assert.equal(warnings.length, 1, raw);
    assert.match(warnings[0], new RegExp(`BL product 1 has "${raw}"`));
  }
});

test('sync: shared product (same EAN) — the field wins over every wholesaler\'s env markup', async () => {
  const kolba = catalogue('45');
  await sync(kolba, FIELD, 'kolba', env({ markupPct: 30 }));
  assert.equal(kolba.records.get(1)!.prices[SALE], 145);
  // Sharg has the same EAN with its own SKU and a 25% env markup; same purchase price
  const sharg = catalogue('45');
  const shargFeed = [product({ connector: 'sharg', connector_product_id: 'S9', connector_sku: '139', ean: '5901234567890', price_purchase: 100 })];
  await sync(sharg, FIELD, 'sharg', env({ markupPct: 25, warehouse: 'bl_157484' }), shargFeed);
  assert.equal(sharg.records.get(1)!.prices[SALE], 145);
  // Without a field the shared record follows whoever synced last (O-32, unchanged)
  const plain = catalogue(null);
  await sync(plain, FIELD, 'sharg', env({ markupPct: 25, warehouse: 'bl_157484' }), shargFeed);
  assert.equal(plain.records.get(1)!.prices[SALE], 125);
});

test('sync: margin read fails → stock written, no selling price written at all, run ends non-zero', async () => {
  const bl = catalogue('45');
  bl.failData = true;
  const { ok, warnings } = await sync(bl, FIELD);
  assert.equal(ok, false);
  assert.equal(bl.records.get(1)!.stock.bl_157483, 7);
  assert.equal(bl.records.get(1)!.prices[SALE], 145);
  assert.equal(bl.records.get(2)!.prices[SALE], 65);
  assert.ok(warnings.some((w) => /margin field read failed/.test(w)));
  for (const w of bl.writes()) {
    if (typeof w === 'object' && w && Object.values(w).some((v) => SALE in (v as object))) assert.fail('a selling price was written after a failed margin read');
  }
});

test('sync: product BL did not return data for → its selling price is left alone', async () => {
  const bl = catalogue('45');
  bl.hidden.add(1);
  bl.records.get(1)!.prices[SALE] = 151;
  const { plan } = await sync(bl, FIELD);
  assert.equal(bl.records.get(1)!.prices[SALE], 151);
  assert.equal(bl.records.get(1)!.prices[PURCHASE], 100);
  assert.equal(plan.priceSkipped, 1);
  assert.equal(bl.records.get(2)!.prices[SALE], 65);
});

// ── Red proof: no write carries the field ────────────────────────────────────

test('red proof — no sync write carries the margin field', async () => {
  const bl = catalogue('45');
  await sync(bl, FIELD);
  const writes = bl.writes();
  assert.ok(writes.length >= 2);
  for (const w of writes) assert.doesNotMatch(JSON.stringify(w), /extra_field/);
});

test('red proof — the import payload never carries the margin field, and is priced from it', () => {
  const existingTextFields = { name: 'Latarka', description: '<p>stary</p>', [FIELD]: '45', [`${FIELD}|pl`]: '45', extra_field_80: 'inne' };
  const margin = chooseMargin(readMarginRaw(existingTextFields, FIELD), 30);
  for (const p of [product(), product({ description_html: null }), product({ price_purchase: null })]) {
    const { product: payload, price } = toBLProduct(p, env(), 9755703, ['auto'], { sku: 'KOLBA-100-200', features: { 'SKU Kolba': '100-200' } }, margin);
    const tf = payload.text_fields as Record<string, unknown>;
    assert.deepEqual(Object.keys(tf).filter((k) => !['name', 'description', 'features'].includes(k)), []);
    assert.doesNotMatch(JSON.stringify(payload), /extra_field/);
    if (p.price_purchase) {
      assert.equal(price, 145);
      assert.equal((payload.prices as Record<string, number>)[SALE], 145);
    }
  }
});

test('the import script builds its payload with the shared toBLProduct and reads the field read-only', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../scripts/xml-to-baselinker.ts'), 'utf8');
  assert.doesNotMatch(src, /function toBLProduct\b/, 'local copy of toBLProduct would bypass the payload test');
  assert.doesNotMatch(src, /function computeSellingPrice\b/);
  assert.match(src, /toBLProduct\(p, env, r\.categoryId, tags, identity, margin\)/);
  assert.match(src, /runSyncCore\(/);
  assert.match(src, /getProductsData: readonly\.getInventoryProductsData/);
});

// ── Audit (HA-2.37, section A) ───────────────────────────────────────────────

test('audit: a record with field 45 at purchase × 1.45 is no price mismatch; env-only would flag it', () => {
  const feedItem = { price_purchase: 100, price_gross: 199 };
  const sale = 145;
  const exp = expectedSalePrice(feedItem, 30, '45');
  assert.equal(exp.price, 145);
  assert.equal(exp.margin.source, 'field');
  assert.equal(salePriceDiffers(sale, exp.price), false);
  // pre-HA-2.22 audit: env markup only → reported
  assert.equal(salePriceDiffers(sale, expectedSalePrice(feedItem, 30, undefined).price), true);
  // invalid field → env, so 145 is a mismatch again
  assert.equal(salePriceDiffers(sale, expectedSalePrice(feedItem, 30, 'abc').price), true);
});

test('audit script compares BL against expectedSalePrice with the record\'s field', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../scripts/audit-import.ts'), 'utf8');
  assert.match(src, /expectedSalePrice\(\{ price_purchase: i\.pricePurchase, price_gross: i\.priceGross \}, markup, r\.marginRaw\)/);
  assert.match(src, /const saleDiff = salePriceDiffers\(sale, exp\.price\)/);
  assert.match(src, /marginRaw: cfg\.marginKey !== null \? readMarginRaw\(tf, cfg\.marginKey\) : undefined/);
});
