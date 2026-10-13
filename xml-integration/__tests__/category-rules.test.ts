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

// ── sharg_rules (HA-2.27): name rules pinned to supplier category paths ──────
// Engine tests on an inline map — independent of the rule data in category-map.json.

import { shargRuleMatches, type ShargRule } from '../category-rules';
import { resolveCategory, type CategoryMapFile } from '../resolve-category';
import { HydraTreeFromTxt } from '../hydra-tree-txt';

const TREE = new HydraTreeFromTxt(
  readFileSync(resolve(process.cwd(), 'xml-integration/hydra-category-tree.txt'), 'utf8'),
);

const SHARG_FIREARMS_PATH = 'Artykuły dla dorosłych > Broń > Broń palna';
const SHARG_OTHER_PATH = 'Hobby/Militaria i strzelectwo/Strzelectwo/Broń Palna/Akcesoria do broni palnej';

function shargProduct(name: string, path: string | null): NormalizedProduct {
  return { ...fakeProduct(name), connector: 'sharg', supplier_category_name: path };
}

const ENGINE_MAP: CategoryMapFile = {
  sharg: { [SHARG_OTHER_PATH]: '04' },
  sharg_rules: [
    { paths: [SHARG_FIREARMS_PATH], match: { name: 'rewolwer testowy' }, cat: '1.4', excludeName: ['bęben'] },
    { paths: [SHARG_FIREARMS_PATH], match: { name: 'testowy' }, cat: '1.2', review: true },
  ],
};

test('sharg_rules (HA-2.27): rule fires on a declared path — leaf → auto', () => {
  const r = resolveCategory(shargProduct('Rewolwer testowy .44', SHARG_FIREARMS_PATH), ENGINE_MAP, TREE, new Set());
  assert.equal(r.hydraNum, '1.4');
  assert.equal(r.status, 'auto');
});

test('sharg_rules (HA-2.27): the same name on another path is not caught by the rule (dictionary decides)', () => {
  const r = resolveCategory(shargProduct('Rewolwer testowy .44', SHARG_OTHER_PATH), ENGINE_MAP, TREE, new Set());
  assert.equal(r.hydraNum, '04', 'falls back to the path dictionary, not 1.4');
});

test('sharg_rules (HA-2.27): the same name on an unmapped path or without a path stays unassigned (flag)', () => {
  for (const path of ['Zupełnie inna ścieżka', null]) {
    const r = resolveCategory(shargProduct('Rewolwer testowy .44', path), ENGINE_MAP, TREE, new Set());
    assert.equal(r.hydraNum, null, `path ${path}`);
    assert.equal(r.status, 'flag', `path ${path}`);
  }
});

test('sharg_rules (HA-2.27): excludeName + first match wins + review as in kolba_rules', () => {
  const r = resolveCategory(shargProduct('Bęben — rewolwer testowy', SHARG_FIREARMS_PATH), ENGINE_MAP, TREE, new Set());
  assert.equal(r.hydraNum, '1.2', 'excluded from rule 1, caught by rule 2');
  assert.equal(r.status, 'review');
});

test('sharg_rules (HA-2.27): a rule without `paths` matches any Sharg path; an empty list matches none', () => {
  const open: ShargRule = { match: { name: 'testowy' }, cat: '04' };
  const closed: ShargRule = { paths: [], match: { name: 'testowy' }, cat: '04' };
  assert.equal(shargRuleMatches(open, shargProduct('Testowy', 'Dowolna ścieżka')), true);
  assert.equal(shargRuleMatches(open, shargProduct('Testowy', null)), true);
  assert.equal(shargRuleMatches(closed, shargProduct('Testowy', SHARG_FIREARMS_PATH)), false);
});

test('sharg_rules (HA-2.27): never applied to Kolba or Spechurt products', () => {
  for (const connector of ['kolba', 'spechurt'] as const) {
    const p = { ...shargProduct('Rewolwer testowy .44', SHARG_FIREARMS_PATH), connector };
    const r = resolveCategory(p, ENGINE_MAP, TREE, new Set());
    assert.equal(r.hydraNum, null, connector);
  }
});

// ── sharg_rules data (HA-2.27): the rules in category-map.json ───────────────
// Names below are real rows of the live Sharg feed (tj's read-only listing,
// 2026-10-13: 273 products on SHARG_FIREARMS_PATH, 5 on SHARG_AMMO_PATH), plus
// synthetic trap names where the feed has no such product today.

const SHARG_AMMO_PATH = 'Artykuły dla dorosłych > Broń > Konserwacja i akcesoria do broni palnej > Amunicja';

const REAL_MAP = JSON.parse(
  readFileSync(resolve(process.cwd(), 'xml-integration/category-map.json'), 'utf8'),
) as CategoryMapFile;

function resolveSharg(name: string, path: string = SHARG_FIREARMS_PATH) {
  return resolveCategory(shargProduct(name, path), REAL_MAP, TREE, new Set());
}

test('sharg_rules data: every rule declares `paths`, and only the two paths removed from the dictionary in HA-2.25', () => {
  const rules = REAL_MAP.sharg_rules ?? [];
  assert.ok(rules.length > 0, 'sharg_rules must not be empty');
  for (const rule of rules) {
    const label = JSON.stringify(rule.match);
    assert.ok(rule.paths && rule.paths.length > 0, `rule ${label} has no paths — it would fire on every Sharg product`);
    for (const path of rule.paths) {
      assert.ok([SHARG_FIREARMS_PATH, SHARG_AMMO_PATH].includes(path), `rule ${label}: unexpected path ${path}`);
      assert.equal(REAL_MAP.sharg?.[path], undefined, `path ${path} is also a dictionary key`);
    }
  }
});

test('sharg_rules data: Pietta black-powder revolver → 1.4 (auto)', () => {
  const r = resolveSharg('Rewolwer Pietta 1858 Remington New Model Army Steel .44 (RGA44)');
  assert.equal(r.hydraNum, '1.4');
  assert.equal(r.status, 'auto');
});

test('sharg_rules data: Pietta / Ekol spare part → 04 (review)', () => {
  for (const name of [
    'Sprężyna główna Pietta 1873 SA Peacemaker (SAA5563)',
    'Śruba kurka Pietta 1858 Remington New Model Army (453)',
    'Kominki rewolwerowe Pietta Colt, Remington 6 szt (AC060)',
    'Zestaw naprawczy Pietta 1858 Remington New Model Army (AC075)',
    'Kurek do rewolweru Ekol Viper kal. 6mm (7101.03H)',
  ]) {
    const r = resolveSharg(name);
    assert.equal(r.hydraNum, '04', name);
    assert.equal(r.status, 'review', name);
  }
});

test('sharg_rules data: firearms — ISSC .22LR pistol → 1.1.3, self-loading rifle → 1.2.1, GSG rifle → 1.2 (review)', () => {
  const pistol = resolveSharg('Pistolet ISSC M22 TGT GEN-2 Black kal. 22LR HV (111002)');
  assert.deepEqual([pistol.hydraNum, pistol.status], ['1.1.3', 'auto']);
  const rifle = resolveSharg("Karabin samopowtarzalny Astra Arms STG 15 20'' kal .223 Rem (G15-A1)");
  assert.deepEqual([rifle.hydraNum, rifle.status], ['1.2.1', 'auto']);
  for (const name of ['Karabin GSG-5 414 kal. 22LR', 'Karabin GSG-522 Carbin L-414 SA kal.22LR HV (GSG03-0123)']) {
    const gsg = resolveSharg(name);
    assert.deepEqual([gsg.hydraNum, gsg.status], ['1.2', 'review'], name);
  }
});

test('sharg_rules data: hunting rifle ammunition → 2.2 by calibre (incl. the feed typo „myśłiwska”), brenneke → 2.3', () => {
  for (const name of [
    'Amunicja myśliwska kulowa Sako kal. 9.3x74R 250 GR op. 20 szt - 477D 9,3X74R',
    'Amunicja myśliwska kulowa PMC kal. 270 Win PSP 130 GR op. 20 szt',
    'Amunicja myśłiwska kulowa Federal kal. 270 Win PSP HS 150 GR op. 20 szt',
  ]) {
    const r = resolveSharg(name, SHARG_AMMO_PATH);
    assert.deepEqual([r.hydraNum, r.status], ['2.2', 'auto'], name);
  }
  const slug = resolveSharg('Amunicja myśliwska kulowa (Breneka) Sauvestre kal. 20/70 22.5 g - 59.1053', SHARG_AMMO_PATH);
  assert.deepEqual([slug.hydraNum, slug.status], ['2.3', 'auto']);
});

test('sharg_rules data: the same names resolve only under their declared path', () => {
  const revolver = 'Rewolwer Pietta 1858 Remington New Model Army Steel .44 (RGA44)';
  assert.equal(resolveSharg(revolver, SHARG_FIREARMS_PATH).hydraNum, '1.4');
  // the ammunition path is declared too, but not for the revolver rule
  assert.equal(resolveSharg(revolver, SHARG_AMMO_PATH).hydraNum, null);
  // a path the dictionary maps keeps its dictionary node
  assert.equal(resolveSharg(revolver, 'Hobby/Militaria i strzelectwo/Noże i akcesoria').hydraNum, '13');
  const ammo = 'Amunicja myśliwska kulowa PMC kal. 270 Win PSP 130 GR op. 20 szt';
  assert.equal(resolveSharg(ammo, SHARG_AMMO_PATH).hydraNum, '2.2');
  assert.equal(resolveSharg(ammo, SHARG_FIREARMS_PATH).hydraNum, null);
});

const FIREARM_NODES = /^1\.[124](\.|$)/; // 1.1.x, 1.2.x, 1.4

test('sharg_rules red proof: 14 real part names with „rewolwer Pietta” mid-name → 04, not 1.4', () => {
  for (const name of [
    'Dźwignia kurka ze sprężyną rewolwer Pietta 1858 Remington Army Shooter (440/TR)',
    'Dźwignia kurka ze sprężyną rewolwer Pietta 1858 Remington New Model Army / Navy, 1862 Spiller & Burr (440)',
    'Klin główny rewolwer Pietta 1851 Colt REB Nord Navy, 1860 Colt Army, 1861 Colt Navy (3456)',
    'Okładziny chwytu rewolwer Pietta 1873 Colt Peacemaker Steel (ASAA5209)',
    'Osłona spustu rewolwer Pietta 1873 Colt Peacemaker (ASAA5210)',
    'Oś bębna rewolwer Pietta 1858 Remington New Model Army / Navy (445)',
    'Pobojczyk rewolwer Pietta 1851 Colt Reb Nord Navy (A668)',
    'Sprężyna główna rewolwer Pietta 1851 Colt Reb Nord Navy, 1860 Colt Army, 1861 Colt Navy (678)',
    'Sprężyna główna rewolwer Pietta 1858 Remington New Model Army / Navy (446)',
    'Sprężyna kurka rewolwer Pietta 1851 Colt Navy (665)',
    'Tłoczek pobojczyka rewolwer Pietta 1860 Colt Army .44 (1571)',
    'Tłoczek pobojczyka rewolwer Pietta 1861 Colt Navy .36 (1572)',
    'Zestaw naprawczy rewolwer Pietta 1851 Colt Reb Nord Navy (AC070)',
    'Zestaw naprawczy rewolwer Pietta 1873 Colt Peacemaker SA (AC090)',
  ]) {
    const r = resolveSharg(name);
    assert.equal(r.hydraNum, '04', name);
    assert.equal(r.status, 'review', name);
  }
});

test('sharg_rules red proof: traps „Bęben do rewolweru Pietta”, „Olej do broni czarnoprochowej”, holster → not 1.1 / 1.2 / 1.4', () => {
  for (const name of [
    'Bęben do rewolweru Pietta 1858 Remington .44',
    'Bęben kapiszonowy rewolwer Pietta 1858 Remington .44',
    'Olej do broni czarnoprochowej 100 ml',
    'Kabura skórzana rewolwer Pietta 1851 Colt Navy',
  ]) {
    const r = resolveSharg(name);
    assert.doesNotMatch(r.hydraNum ?? '', FIREARM_NODES, name);
  }
});

test('sharg_rules red proof: one trap per firearm rule — accessory named after the gun → not 1.1 / 1.2 / 1.4', () => {
  for (const name of [
    'Magazynek karabin samopowtarzalny Astra Arms STG 15 kal .223 Rem',   // rule „karabin samopowtarzalny”
    'Magazynek karabin GSG-5 kal. 22LR 22 naboje',                        // rule „karabin gsg”
    'Kolba karabin GSG-522 składana',                                     // rule „karabin gsg”
    'Magazynek pistolet ISSC M22 kal. 22LR 10 naboi',                     // rule „pistolet issc m22”
    'Pokrowiec pistolet ISSC M22',                                        // rule „pistolet issc m22”
  ]) {
    const r = resolveSharg(name);
    assert.doesNotMatch(r.hydraNum ?? '', FIREARM_NODES, name);
  }
});

test('sharg_rules red proof: one trap per ammunition rule — box, cases, a rifle in that calibre → not 2.2 / 2.3', () => {
  for (const name of [
    'Pudełko na amunicję kal. 270 Win 50 szt',       // rule „270 win”
    'Sztucer myśliwski kal. 270 Win',                // rule „270 win”
    'Łuski Sako kal. 9.3x74R 20 szt',                // rule „9.3x74r”
    'Pudełko na amunicję śrutową i Breneka 12/70',   // rule „breneka”
  ]) {
    const r = resolveSharg(name, SHARG_AMMO_PATH);
    assert.equal(r.hydraNum, null, name);
    assert.equal(r.status, 'flag', name);
  }
});

test('sharg_rules data (node gate, tj 2026-10-13): Hatsan shotguns → 1.3.1 pump / 1.3.2 semi-auto / 1.3.3 over-under (auto)', () => {
  for (const [name, cat] of [
    ["Strzelba powtarzalna Hatsan Escort AimGuard 18'' 12/76", '1.3.1'],
    ['Strzelba powtarzalna Hatsan kal. 12/76 - ESCORT Slug Pump Combo 12GA', '1.3.1'],
    ["Strzelba samopowtarzalna Hatsan Escort PS Guard 20'' kal. 12GA", '1.3.2'],
    ['Strzelba samopowtarzalna Hatsan Escort Supreme 28" 12/76 (magaz 4+1) - Escort Supreme 12GA 04 W', '1.3.2'],
    ['Bok śrutowy Hatsan kal. 12 (OPTIMA SILVER SELECT EXTRACTOR)', '1.3.3'],
  ] as const) {
    const r = resolveSharg(name);
    assert.deepEqual([r.hydraNum, r.status], [cat, 'auto'], name);
  }
});

test('sharg_rules data (node gate): Ekol alarm pistols → 1.5 (review), blank ammunition → 2.5 (review), nipple wrenches → 7.3.1 (review)', () => {
  for (const [name, cat] of [
    ['Pistolet Ekol JACK DUAL COMPACT', '1.5'],
    ['Pistolet Ekol P 29 REV II', '1.5'],
    ['Pistolet Special 99 Rev II', '1.5'],                      // brand not in the name — literal model match
    ['Amunicja hukowa PTG 22 Long K 100szt (199-001)', '2.5'],
    ['Klucz do kominków + kominki Pietta Remington Pocket (AC580)', '7.3.1'],
    ['Klucz do kominków Pietta Remington Pocket kal. .31 (AC570)', '7.3.1'],
    ['Klucz Pietta Mod T #11 do kominków rewolwerowych (AC020)', '7.3.1'],
    ['Pietta Mod T #11 klucz do kominków rewolwerowych + kominki (AC020+060)', '7.3.1'],
  ] as const) {
    const r = resolveSharg(name);
    assert.deepEqual([r.hydraNum, r.status], [cat, 'review'], name);
  }
});

test('sharg_rules red proof (node gate): traps — shotgun / alarm-pistol accessories and the loading kit with „klucz do kominków” in its name', () => {
  for (const name of [
    'Kolba strzelba powtarzalna Hatsan Escort',                 // rule „strzelba powtarzalna”
    'Magazynek strzelba samopowtarzalna Hatsan Escort 12/76',   // rule „strzelba samopowtarzalna”
    'Lufa bok śrutowy Hatsan Optima kal. 12',                   // rule „bok śrutowy”
    'Magazynek pistolet Ekol P 29',                             // rule „pistolet ekol”
    'Magazynek pistolet Special 99',                            // rule „pistolet special 99”
    'Pudełko amunicja hukowa 6 mm',                             // rule „amunicja hukowa”
    // rule „klucz” — real feed row: a loading kit, not a wrench
    'Zestaw Pietta do rewolweru czarnoprochowego .36: prochownica, miarka, kapiszonownik, przybitki filcowe, kule, klucz do kominków (AC1410/36)',
  ]) {
    const r = resolveSharg(name);
    assert.equal(r.hydraNum, null, name);
    assert.equal(r.status, 'flag', name);
  }
});

test('sharg_rules data: products the rules deliberately do not catch stay in „00” (flag) — barrels, cylinders, loading kits, gilzy (tj 2026-10-13)', () => {
  for (const name of [
    // barrels and cylinders — kept out of 04 (no permit tag there) until the client names their permit group
    "Lufa 8'' Pietta 1858 Remington New Model Army Target kal. 44 (A434/STR44)",
    'Lufa oktagonalna .36 Pietta 1851 Colt REB Nord Navy (A345/OT36)',
    'Lufa okrągła .44 Pietta 1860 Colt Army, 1861 Colt Navy (A1568/44)',
    'Bęben kapiszonowy Pietta 1858 Remington New Army / Navy .44 (A432/ST44)',
    'Bęben kapiszonowy Pietta Colt 1851 Navy Yank, 1860 Army, 1861 Navy .44 Grawerowany (A341Y)',
    'Bęben rewolwer alarmowy kal. 6mm (EKOL Arda C-1L Black)',
    // loading kits and cases — neither parts, wrenches nor revolvers
    'Gilzy Pietta do karabinu Smith Carbine .50 4szt (AC460)',
    'Zestaw Pietta do rewolweru czarnoprochowego .44: prochownica, miarka, kapiszonownik, przybitki filcowe, kule, klucz do kominków (AC1410/44)',
  ]) {
    const r = resolveSharg(name);
    assert.equal(r.hydraNum, null, name);
    assert.equal(r.status, 'flag', name);
  }
});

// Review HA-2.27 (tj 2026-10-13): the revolver rule stands before the part rules,
// so every keyword a 04 part rule matches on must also be in its excludeName —
// otherwise „<part> rewolwer Pietta …” lands in 1.4 `auto` instead of 04.
test('sharg_rules guard: every 04 part-rule keyword is excluded by the „rewolwer pietta” rule (1.4)', () => {
  const rules = REAL_MAP.sharg_rules ?? [];
  const revolver = rules.find((r) => r.cat === '1.4' && r.match.name === 'rewolwer pietta');
  assert.ok(revolver, 'the „rewolwer pietta” → 1.4 rule must exist');
  const excluded = (revolver.excludeName ?? []).map((e) => e.toLowerCase());
  const partKeywords = rules.filter((r) => r.cat === '04').map((r) => (r.match.name ?? '').toLowerCase());
  assert.ok(partKeywords.length > 0, 'there must be 04 part rules');
  for (const keyword of partKeywords) {
    assert.ok(keyword.length > 0, 'a 04 part rule without match.name');
    // covered = an excluded word is contained in the keyword, so any name with the keyword is rejected
    assert.ok(excluded.some((e) => keyword.includes(e)), `part keyword „${keyword}” is not in the revolver rule's excludeName`);
    // behaviour: a part named after the gun goes to 04, never to a firearm node
    const r = resolveSharg(`Część ${keyword} rewolwer Pietta 1858 Remington New Model Army (000)`);
    assert.equal(r.hydraNum, '04', `„${keyword} rewolwer Pietta” must resolve to 04`);
    assert.equal(r.status, 'review');
  }
});
