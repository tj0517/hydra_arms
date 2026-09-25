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

test('admitted: hydraNum is a descendant of an allowed parent node', () => {
  // "4.6.1" (Kolby) is a child of "04" (Części zamienne); both are in the allowed set
  // but even if we only had "04", "4.6.1" would pass via prefix match
  const r = filterProduct(PASS_PRODUCT, '4.6.1', 5, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, true);
});

test('admitted: hydraNum with leading-zero parent ("09") matches child "9.3.1"', () => {
  // "9.3.1" is explicitly in the allowed set AND covered by parent "09"
  const r = filterProduct(PASS_PRODUCT, '9.3.1', 1, 0, PASS_PRICE, ASSORTMENT_RULES);
  assert.equal(r.allowed, true);
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
