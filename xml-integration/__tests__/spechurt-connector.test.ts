/**
 * Unit tests for xml-integration/connectors/spechurt.ts against a small
 * real-feed fragment (xml-integration/samples/spechurt_sample.xml, prices
 * and stock anonymized — see HA-2.11).
 *
 * Runner: npx tsx --test xml-integration/__tests__/spechurt-connector.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { spechurtConnector } from '../connectors/spechurt';

const SAMPLE_PATH = resolve(process.cwd(), 'xml-integration/samples/spechurt_sample.xml');
const xml = readFileSync(SAMPLE_PATH, 'utf8');
const products = spechurtConnector.parse(xml);

test('spechurt: parses every <produkt> in the sample', () => {
  const rawCount = (xml.match(/<produkt[ >]/g) ?? []).length;
  assert.equal(products.length, rawCount);
  assert.equal(products.length, 3);
});

test('spechurt: EAN with leading zeros is kept as a string', () => {
  const cap = products.find((p) => p.connector_product_id === '16433')!;
  assert.equal(cap.ean, '022886254490');
  assert.equal(typeof cap.ean, 'string');
});

test('spechurt: missing EAN maps to null (not empty string)', () => {
  const bag = products.find((p) => p.connector_product_id === '17613')!;
  assert.equal(bag.ean, null);
});

test('spechurt: variants carry per-variant stock, and it sums to stan_magazynowy', () => {
  const cap = products.find((p) => p.connector_product_id === '16433')!;
  assert.equal(cap.has_variants, true);
  assert.equal(cap.variants.length, 2);
  assert.equal(cap.variants[0].stock, 3);
  assert.equal(cap.variants[1].stock, 7);
  const variantStockSum = cap.variants.reduce((sum, v) => sum + v.stock, 0);
  assert.equal(variantStockSum, cap.stock);
  assert.equal(cap.stock, 10);
});

test('spechurt: weight is converted from kg to grams', () => {
  const cap = products.find((p) => p.connector_product_id === '16433')!;
  assert.equal(cap.weight_g, 110); // waga=0.11 kg → 110 g
});

test('spechurt: VAT fraction is converted to a percentage', () => {
  const cap = products.find((p) => p.connector_product_id === '16433')!;
  assert.equal(cap.tax_rate, 23); // vat=0.23 → 23
});

test('spechurt: description HTML entities are decoded (real feed has no CDATA)', () => {
  const cap = products.find((p) => p.connector_product_id === '16433')!;
  assert.ok(cap.description_html);
  assert.ok(cap.description_html!.includes('<br>'), 'expected decoded <br>, not &lt;br&gt;');
  assert.ok(!cap.description_html!.includes('&lt;'), 'HTML entities should be decoded, not left escaped');
});

test('spechurt: purchase and gross prices are read as-is (both brutto)', () => {
  const rack = products.find((p) => p.connector_product_id === '1094')!;
  assert.equal(rack.price_purchase, 9.9);
  assert.equal(rack.price_gross, 14);
});
