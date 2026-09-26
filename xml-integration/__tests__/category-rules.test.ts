/**
 * Unit tests for ruleMatches (xml-integration/category-rules.ts) — the Kolba
 * category-map.json rule matcher used by scripts/xml-to-baselinker.ts.
 *
 * Runner: npx tsx --test xml-integration/__tests__/category-rules.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ruleMatches, type CategoryRule } from '../category-rules';
import type { NormalizedProduct } from '../types';

function fakeProduct(name: string, features: Record<string, string> = {}): NormalizedProduct {
  return {
    connector: 'kolba',
    connector_product_id: '1',
    connector_sku: 'SKU1',
    ean: null,
    brand: null,
    name,
    description_html: null,
    short_description: null,
    features,
    price_gross: 100,
    price_net: 81.3,
    tax_rate: 23,
    price_purchase: 50,
    price_compare: null,
    stock: 1,
    weight_g: null,
    images: [],
    supplier_category_id: null,
    supplier_category_name: null,
    has_variants: false,
    variants: [],
    _hints: { requires_license: false, age_restricted: false, pickup_only: false },
    source_url: 'https://example.test/feed.xml',
    raw_connector_category: null,
  };
}

// ── attr rule (pre-existing behaviour, unchanged) ────────────────────────────

test('ruleMatches: attr rule matches when the attribute is present', () => {
  const rule: CategoryRule = { match: { attr: 'Typ noża' }, cat: '13' };
  assert.equal(ruleMatches(rule, fakeProduct('Nóż X', { 'Typ noża': 'składany' })), true);
});

test('ruleMatches: attr rule does not match when the attribute is absent', () => {
  const rule: CategoryRule = { match: { attr: 'Typ noża' }, cat: '13' };
  assert.equal(ruleMatches(rule, fakeProduct('Latarka Y', {})), false);
});

// ── name substring rule ───────────────────────────────────────────────────────

test('ruleMatches: name rule matches a case-insensitive substring', () => {
  const rule: CategoryRule = { match: { name: 'kolimator' }, cat: '3.2' };
  assert.equal(ruleMatches(rule, fakeProduct('Celownik KOLIMATOROWY Delta Optical')), true);
});

test('ruleMatches: name rule does not match when the substring is absent', () => {
  const rule: CategoryRule = { match: { name: 'kolimator' }, cat: '3.2' };
  assert.equal(ruleMatches(rule, fakeProduct('Luneta celownicza Hawke')), false);
});

// ── excludeName (new in HA-2.12) ──────────────────────────────────────────────

test('ruleMatches: excludeName rejects a match when an excluded word is present', () => {
  const rule: CategoryRule = {
    match: { name: 'magazynek' },
    cat: '5.1',
    excludeName: ['asg', 'airsoft'],
  };
  assert.equal(
    ruleMatches(rule, fakeProduct('Magazynek do ASG Beretta 90two 6 mm')),
    false,
    'a Kolba "magazynek" rule must not catch an ASG/airsoft product — those stay unmapped (00), not misfiled into 5.1',
  );
});

test('ruleMatches: excludeName does not affect a name match with no excluded word', () => {
  const rule: CategoryRule = {
    match: { name: 'magazynek' },
    cat: '5.1',
    excludeName: ['asg', 'airsoft'],
  };
  assert.equal(ruleMatches(rule, fakeProduct('Magazynek Magpul PMAG 25 M118')), true);
});

// Red proof: without the excludeName check, this rule would wrongly match — this
// test fails if someone loosens ruleMatches to ignore excludeName again.
test('ruleMatches: excludeName red proof — exclusion is checked even when attr/name already matched', () => {
  const rule: CategoryRule = {
    match: { name: 'wiatrówka', attr: 'Typ zasilania', value: 'CO2' },
    cat: '11.1.4',
    excludeName: ['magazynek'],
  };
  const accessory = fakeProduct('Magazynek do wiatrówka Iconix Umarex 4,5 mm', { 'Typ zasilania': 'CO2 12 g' });
  assert.equal(
    ruleMatches(rule, accessory),
    false,
    'name and attr both match, but excludeName must still reject it — an airgun magazine is not a complete rifle',
  );
});

test('ruleMatches: excludeName is case-insensitive', () => {
  const rule: CategoryRule = { match: { name: 'tłumik' }, cat: '04', excludeName: ['ASG'] };
  assert.equal(ruleMatches(rule, fakeProduct('Tłumik ASG Elite Force C4 Mock 14 mm')), false);
});
