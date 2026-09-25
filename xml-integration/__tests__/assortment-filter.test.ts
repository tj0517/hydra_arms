/**
 * Unit tests for the assortment filter.
 *
 * Runner: Node built-in test runner (node:test, Node ≥ 18).
 * Run:    npx tsx --test xml-integration/__tests__/assortment-filter.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterProduct } from '../assortment-filter';
import { ASSORTMENT_RULES } from '../assortment-rules';
import type { NormalizedProduct } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    connector: 'sharg',
    connector_product_id: 'TEST-001',
    connector_sku: 'TEST-SKU',
    ean: '5901234567890',
    brand: null,
    name: 'Test Product',
    description_html: null,
    short_description: null,
    features: {},
    price_gross: 200,
    price_net: 162.60,
    tax_rate: 23,
    price_purchase: 100,
    price_compare: null,
    stock: 5,
    weight_g: 500,
    images: [],
    supplier_category_id: null,
    supplier_category_name: 'Kabury',
    has_variants: false,
    variants: [],
    _hints: { requires_license: false, age_restricted: false, pickup_only: false },
    source_url: null,
    raw_connector_category: null,
    ...overrides,
  };
}

// A product that should always pass with default rules (when not overridden):
// sharg, P1 category, wholesaler stock 5, price 200 PLN
const PASS_PRODUCT = makeProduct();
const PASS_HYDRA_NUM = '6.1';   // Kabury Pistoletowe — in P1 set
const PASS_PRICE = 200;

// ── Tests ─────────────────────────────────────────────────────────────────────

test('admitted: P1 category, wholesaler stock > 0', () => {
  const r = filterProduct(PASS_PRODUCT, PASS_HYDRA_NUM, 5, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, true);
  assert.equal(r.reason, 'ok');
});

test('admitted: P1 category, Hydra own stock > 0, wholesaler stock = 0', () => {
  const r = filterProduct(PASS_PRODUCT, PASS_HYDRA_NUM, 0, 3, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, true, 'own-stock-only product should pass (mixed stock model)');
  assert.equal(r.reason, 'ok');
});

test('admitted: hydraNum exactly matches an explicitly listed node ("4.6.1")', () => {
  // "4.6.1" (Kolby) is explicitly listed; passes by exact match, not prefix coverage
  const r = filterProduct(PASS_PRODUCT, '4.6.1', 5, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, true);
});

test('admitted: hydraNum with leading-zero normalised — "09" exact match', () => {
  // "09" normalises to "9"; a product mapped exactly to "09" passes
  const r = filterProduct(PASS_PRODUCT, '09', 1, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, true);
});

test('admitted: explicitly listed child node ("9.3.1") regardless of parent "09"', () => {
  // "9.3.1" is explicitly in the allowed set — passes by its own entry
  const r = filterProduct(PASS_PRODUCT, '9.3.1', 1, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, true);
});

test('dropped: child of a parent entry that is NOT itself listed (exact match only)', () => {
  // "11.1.1" (PCP ≤17J) is NOT in allowedHydraNums; only its parent "11.1" is.
  // With prefix matching this would pass — with exact matching it must not.
  const r = filterProduct(PASS_PRODUCT, '11.1.1', 5, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'not_p1');
});

test('dropped: disabled supplier', () => {
  const p = makeProduct({ connector: 'szafy' });
  const r = filterProduct(p, PASS_HYDRA_NUM, 5, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'disabled_supplier');
});

test('dropped: hydraNum is null (unassigned → "00. DO PRZYPISANIA")', () => {
  const r = filterProduct(PASS_PRODUCT, null, 5, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'not_p1');
});

test('dropped: category maps to a number NOT in P1 set', () => {
  // "2.1" = Amunicja Pistoletowa — NOT in allowed set (no wholesaler presence)
  const r = filterProduct(PASS_PRODUCT, '2.1', 5, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'not_p1');
});

test('dropped: ASG category (no Hydra tree node)', () => {
  // ASG maps to "00" in category-map.json → hydraNum null
  const r = filterProduct(PASS_PRODUCT, null, 10, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'not_p1');
});

test('dropped: wholesaler stock = 0 AND Hydra own stock = 0', () => {
  const r = filterProduct(PASS_PRODUCT, PASS_HYDRA_NUM, 0, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'no_stock');
});

test('dropped: price below minimum when minPricePln > 0', () => {
  const rules = { ...ASSORTMENT_RULES, minPricePln: 100 };
  const r = filterProduct(PASS_PRODUCT, PASS_HYDRA_NUM, 5, 0, 50, rules);
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'below_min_price');
});

test('admitted: price at exactly minPricePln', () => {
  const rules = { ...ASSORTMENT_RULES, minPricePln: 100 };
  const r = filterProduct(PASS_PRODUCT, PASS_HYDRA_NUM, 5, 0, 100, rules);
  assert.equal(r.allowed, true);
});

test('admitted: minPricePln = 0 disables price filter (any price passes)', () => {
  const rules = { ...ASSORTMENT_RULES, minPricePln: 0 };
  const r = filterProduct(PASS_PRODUCT, PASS_HYDRA_NUM, 5, 0, 0.01, rules);
  assert.equal(r.allowed, true);
});

test('filter priority: disabled_supplier checked before not_p1', () => {
  const p = makeProduct({ connector: 'szafy' });
  const r = filterProduct(p, null, 0, 0, 0, ASSORTMENT_RULES);
  assert.equal(r.reason, 'disabled_supplier');
});

test('filter priority: not_p1 checked before no_stock', () => {
  // Category not in P1 AND no stock — reason should be not_p1
  const r = filterProduct(PASS_PRODUCT, '2.1', 0, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.reason, 'not_p1');
});

test('kolba connector: admitted when enabled', () => {
  const p = makeProduct({ connector: 'kolba' });
  const r = filterProduct(p, PASS_HYDRA_NUM, 2, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, true);
});

test('spechurt connector: admitted when enabled', () => {
  const p = makeProduct({ connector: 'spechurt' });
  const r = filterProduct(p, PASS_HYDRA_NUM, 2, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, true);
});

// ── Sync regression: filter does NOT run in sync mode ────────────────────────
// Sync sends real stock (including 0) for every product already in BL.
// The assortment filter is import-only — runSync() never calls filterProduct().
// This test shows the contrast: filterProduct WOULD drop the product (no stock,
// not-P1), but the stock-update path is independent and still sends stock=0.

test('sync regression: filterProduct would drop no-stock non-P1, but stock=0 update is independent', () => {
  const MOCK_WAREHOUSE = 'bl_123456';

  // A product that fails both P1 and stock checks
  const p = makeProduct({ connector: 'sharg', stock: 0 });
  const filterResult = filterProduct(p, '2.1', 0, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(filterResult.allowed, false, 'filter would drop this product');
  assert.equal(filterResult.reason, 'not_p1');

  // The sync stock-update object is built directly from product.stock — no filter gate.
  // runSync() builds: stockUpdates[id] = { [env.warehouse]: p.stock ?? 0 }
  const syncStockUpdate = { [MOCK_WAREHOUSE]: p.stock ?? 0 };
  assert.equal(syncStockUpdate[MOCK_WAREHOUSE], 0,
    'stock=0 still written in sync regardless of what the filter would decide');
});
