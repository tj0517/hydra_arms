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

// ── Kolba black-powder rules in category-map.json (HA-2.25) ──────────────────
// Runs the REAL kolba_rules list with the script's first-match-wins semantics
// (resolve-category.ts: `kolba_rules.find(ruleMatches)`), so these tests also
// pin rule ORDER: consumables (2.6) before guns (1.4), accessories before both.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const KOLBA_RULES = (JSON.parse(
  readFileSync(resolve(process.cwd(), 'xml-integration/category-map.json'), 'utf8'),
) as { kolba_rules: CategoryRule[] }).kolba_rules;

function firstKolbaMatch(name: string): CategoryRule | undefined {
  return KOLBA_RULES.find((r) => ruleMatches(r, fakeProduct(name)));
}

test('kolba_rules (HA-2.25): black-powder revolver → 1.4', () => {
  const hit = firstKolbaMatch('Rewolwer czarnoprochowy Pietta 1858 Remington New Army kal. .44');
  assert.equal(hit?.cat, '1.4');
  assert.notEqual(hit?.review, true, 'an explicit "rewolwer czarnoprochow" hit is a leaf-grade match, not review');
});

test('kolba_rules (HA-2.25): other black-powder gun (word order / type not listed) → 1.4 with review', () => {
  const hit = firstKolbaMatch('Pietta 1851 Navy Yank .36 czarnoprochowy');
  assert.equal(hit?.cat, '1.4');
  assert.equal(hit?.review, true, 'the generic "czarnoprochow" fallback must force review');
});

test('kolba_rules (HA-2.25): percussion caps (kapiszony) → 2.6', () => {
  assert.equal(firstKolbaMatch('Kapiszony RWS 1075 Plus 250 szt.')?.cat, '2.6');
});

test('kolba_rules (HA-2.25): black powder → 2.6', () => {
  assert.equal(firstKolbaMatch('Proch czarny Vesuvit LC 500 g')?.cat, '2.6');
});

// Red proof (review 2026-10-08): the only Kolba names containing "spłonk" are reloading
// TOOLS (primer-pocket reamer, press with priming kits), not primers. A "spłonk" → 2.6 rule
// tagged all three as permit (group A). The rule is removed; re-add it and this fails.
test('kolba_rules (HA-2.25) red proof: reloading tools with "spłonk" in the name → neither 1.4 nor 2.6', () => {
  for (const name of [
    'Narzędzie Lyman do frezowania gniazda na spłonkę Large',
    'Narzędzie Lyman do frezowania gniazda na spłonkę Small',
    'Prasa RCBS Rock Chucker Supreme IV z zestawami do spłonkowania',
  ]) {
    const hit = firstKolbaMatch(name);
    assert.ok(hit?.cat !== '1.4' && hit?.cat !== '2.6', `${name} → got ${hit?.cat ?? 'no match (00)'}`);
  }
});

// Red proof: the trap name contains "czarnoprochow" (generic 1.4 rule) but is an
// accessory — excludeName ("czarnoprochowej" / "do broni" / "olej") must reject it.
// Remove the excludeName of the generic "czarnoprochow" rule and this test fails.
test('kolba_rules (HA-2.25) red proof: trap "Olej do broni czarnoprochowej" → neither 1.4 nor 2.6', () => {
  const hit = firstKolbaMatch('Olej do broni czarnoprochowej Ballistol 50 ml');
  assert.ok(hit?.cat !== '1.4' && hit?.cat !== '2.6',
    `accessory must not be filed as a firearm/consumable — got ${hit?.cat ?? 'no match (00)'}`);
});

test('kolba_rules (HA-2.25): consumable accessories stay out of 2.6 (kapiszonownik, prochownica)', () => {
  for (const name of ['Kapiszonownik do rewolweru czarnoprochowego', 'Prochownica mosiężna na czarny proch']) {
    const hit = firstKolbaMatch(name);
    assert.ok(hit?.cat !== '1.4' && hit?.cat !== '2.6', `${name} → got ${hit?.cat ?? 'no match (00)'}`);
  }
});

test('kolba_rules (HA-2.25): order — earlier accessory rules win for holsters/stocks, air-gun rules not shadowed', () => {
  assert.equal(firstKolbaMatch('Kabura skórzana do rewolweru czarnoprochowego Pietta')?.cat, '6.1');
  assert.equal(firstKolbaMatch('Kolba do rewolweru czarnoprochowego Pietta 1858')?.cat, '4.6.1');
  assert.equal(firstKolbaMatch('Rewolwer wiatrówka Colt SAA CO2 4,5 mm')?.cat, '11.2');
});
