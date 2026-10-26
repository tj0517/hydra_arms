/**
 * The import payload (toBLProduct, xml-integration/bl-write.ts) — weight and EAN (HA-2.38).
 *
 * Runner: npx tsx --test xml-integration/__tests__/bl-write-payload.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toBLProduct, weightKg, type WriteEnv } from '../bl-write';
import type { NormalizedProduct } from '../types';

const env: WriteEnv = { inventoryId: 119068, priceGroup: 1, priceGroupPurchase: 2, warehouse: 'bl_1', markupPct: 30 };
const margin = { pct: 30, source: 'env' as const };

function product(over: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    connector: 'sharg', connector_product_id: '1', connector_sku: '139', ean: '5905247629906', brand: null, name: 'Nóż',
    description_html: null, short_description: null, features: {}, price_gross: 100, price_net: 81.3, tax_rate: 23,
    price_purchase: 50, price_compare: null, stock: 1, weight_g: null, images: [], supplier_category_id: null,
    supplier_category_name: null, has_variants: false, variants: [],
    _hints: { requires_license: false, age_restricted: false, pickup_only: false }, source_url: null, raw_connector_category: null,
    ...over,
  };
}

const payload = (p: NormalizedProduct, identity: { ean?: string; weight?: number } = {}) =>
  toBLProduct(p, env, 1, [], { sku: 'SHARG-139', features: {}, ...identity }, margin).product;

test('weight RED PROOF: 3 g is not 0 in the payload (round2(3 / 1000) gave 0)', () => {
  assert.equal(payload(product({ weight_g: 3 })).weight, 0.003);
  assert.equal(payload(product({ weight_g: 4.6 })).weight, 0.005);
  assert.equal(payload(product({ weight_g: 0.3 })).weight, 0.001, 'a positive weight below half a gram is never 0');
  assert.equal(payload(product({ weight_g: 1234 })).weight, 1.234);
});

test('weight: no weight in the feed → the record keeps its weight; 0 only for a new record', () => {
  assert.equal(payload(product({ weight_g: null }), { weight: 0.25 }).weight, 0.25);
  assert.equal(payload(product({ weight_g: 0 }), { weight: 0.25 }).weight, 0.25);
  assert.equal(payload(product({ weight_g: null })).weight, 0);
  assert.equal(payload(product({ weight_g: 120 }), { weight: 0.25 }).weight, 0.12, 'the feed\'s weight wins');
  assert.equal(weightKg(undefined, null), 0);
});

test('ean: payload carries the GTIN-13 write form; an invalid feed EAN keeps the record\'s', () => {
  assert.equal(payload(product({ ean: '192687280759' })).ean, '0192687280759');
  assert.equal(payload(product({ ean: '12345678905' })).ean, '0012345678905', 'Sharg EAN that lost its zero');
  assert.equal(payload(product({ ean: '5905247629907' }), { ean: '5905247629906' }).ean, '5905247629906');
  assert.equal(payload(product({ ean: '5905247629907' })).ean, '');
});
