/**
 * Unit tests for src/lib/shop/categoryLabel.ts (HA-2.30) — public category
 * labels derived from BaseLinker names: no Hydra numeric prefix, no
 * parenthesised note, sentence case with acronyms kept.
 *
 * Runner: npx tsx --test xml-integration/__tests__/category-label.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { categoryDisplayName, isWorkingCategory } from '../../src/lib/shop/categoryLabel';
import { parseHydraTree, UNASSIGNED_CATEGORY } from '../hydra-tree-txt';

const txt = readFileSync(resolve(process.cwd(), 'xml-integration/hydra-category-tree.txt'), 'utf8');

/** Every category line of the tree file, in the full form BL stores it (number + name + note). */
function rawTreeNames(): string[] {
  const names: string[] = [];
  for (const rawLine of txt.split(/\r?\n/)) {
    const cleaned = rawLine.replace(/[│├└┬─]/g, ' ').trim();
    if (/^\d{1,2}(?:\.\d+)*\.?\s+\S/.test(cleaned)) names.push(cleaned);
  }
  return names;
}

test('categoryDisplayName: every name from hydra-category-tree.txt has no numeric prefix and no parenthesis', () => {
  const names = rawTreeNames();
  assert.ok(names.length > 100, `expected the full tree, got ${names.length} names`);
  for (const raw of names) {
    const label = categoryDisplayName(raw);
    assert.ok(label.length > 0, `empty label for "${raw}"`);
    assert.doesNotMatch(label, /^\d/, `prefix left in "${label}" (from "${raw}")`);
    assert.doesNotMatch(label, /[()]/, `parenthesis left in "${label}" (from "${raw}")`);
    assert.match(label.charAt(0), /\p{Lu}/u, `label not capitalised: "${label}"`);
  }
});

test('categoryDisplayName: BL names as parseHydraTree builds them (number + name, note stripped) give the same label', () => {
  for (const cat of parseHydraTree(txt)) {
    const fromBl = categoryDisplayName(cat.blName);
    assert.doesNotMatch(fromBl, /^\d/, `prefix left in "${fromBl}"`);
    assert.doesNotMatch(fromBl, /[()]/, `parenthesis left in "${fromBl}"`);
  }
});

test('categoryDisplayName: root "01. BROŃ PALNA (Koncesjonowana – …)" → "Broń palna"', () => {
  assert.equal(
    categoryDisplayName('01. BROŃ PALNA (Koncesjonowana – Odbiór osobisty: Salon Kraków)'),
    'Broń palna',
  );
  assert.equal(categoryDisplayName('01. BROŃ PALNA'), 'Broń palna');
});

test('categoryDisplayName: subcategory "1.1 Broń Krótka" → "Broń krótka"', () => {
  assert.equal(categoryDisplayName('1.1 Broń Krótka'), 'Broń krótka');
  assert.equal(categoryDisplayName('1.5 Broń alarmowa i sygnałowa '), 'Broń alarmowa i sygnałowa');
});

test('categoryDisplayName: sample of deeper subcategories', () => {
  assert.equal(
    categoryDisplayName('1.2.1 Karabiny i Karabinki Samopowtarzalne (Platformy AR-15, AR-10, AK, Samopowtarzalne .22 LR)'),
    'Karabiny i karabinki samopowtarzalne',
  );
  // parenthetical in the middle of the name
  assert.equal(
    categoryDisplayName('1.2.4 Karabinki PCC (Pistol Caliber Carbine) i Pistolety Maszynowe'),
    'Karabinki PCC i pistolety maszynowe',
  );
  // acronyms and units survive sentence case
  assert.equal(
    categoryDisplayName('11.1.1 Karabinki PCP do 17 J (Pre-Charged Pneumatic - wolna sprzedaż)'),
    'Karabinki PCP do 17 J',
  );
  assert.equal(
    categoryDisplayName('4.1 Komponenty Platformy AR-15/AR-10 (Układy gazowe, Łoża M-LOK)'),
    'Komponenty platformy AR-15/AR-10',
  );
  assert.equal(categoryDisplayName('11.2.2 Pistolety i Rewolwery CO2 (Repliki rekreacyjne)'), 'Pistolety i rewolwery CO2');
  // lowercase in the source gets a capital
  assert.equal(categoryDisplayName('3.5 laserowe wskaźniki celu'), 'Laserowe wskaźniki celu');
  // all-caps root with a comma list
  assert.equal(
    categoryDisplayName('11. STRZELECTWO PNEUMATYCZNE, REKREACYJNE I STRZELECTWO DUŻEJ MOCY (FAC)'),
    'Strzelectwo pneumatyczne, rekreacyjne i strzelectwo dużej mocy',
  );
  // stray unbalanced paren (tree has "15.3.1 …)")
  assert.equal(categoryDisplayName('15.3.1 Akcesoria Erotyczne)'), 'Akcesoria erotyczne');
});

test('categoryDisplayName: "00. DO PRZYPISANIA" → "Do przypisania" and isWorkingCategory is true only for it', () => {
  assert.equal(categoryDisplayName(UNASSIGNED_CATEGORY.blName), 'Do przypisania');
  assert.equal(isWorkingCategory(UNASSIGNED_CATEGORY.blName), true);
  assert.equal(isWorkingCategory('00.DO PRZYPISANIA'), true);
  assert.equal(isWorkingCategory('01. BROŃ PALNA'), false);
  assert.equal(isWorkingCategory('10. AKCESORIA STRZELNICZE I LOGISTYKA'), false);
  assert.equal(isWorkingCategory('Odzież taktyczna'), false);
  assert.equal(isWorkingCategory('007 Gadżety'), false);
});

// ── Red proofs ──────────────────────────────────────────────────────────────

test('red proof: a name without a prefix passes through unchanged except for case', () => {
  assert.equal(categoryDisplayName('Odzież taktyczna'), 'Odzież taktyczna');
  assert.equal(categoryDisplayName('Kamizelki taktyczne i nośniki'), 'Kamizelki taktyczne i nośniki');
  assert.equal(categoryDisplayName('Multitool i scyzoryki'), 'Multitool i scyzoryki');
  // only the case changes
  assert.equal(categoryDisplayName('OCHRONA OSOBISTA'), 'Ochrona osobista');
  assert.equal(categoryDisplayName('Kurtki I Bluzy'), 'Kurtki I bluzy');
});

test('red proof: a product name with parentheses passes unchanged — parentheses are cut for tree categories only', () => {
  // seed product 312001 — no Hydra prefix, so nothing is stripped
  const productName = 'Produkt testowy sekcji 01 (bez flag)';
  assert.equal(categoryDisplayName(productName), productName);
  // a product whose name happens to be title-cased: case changes, parentheses stay
  assert.equal(categoryDisplayName('Kabura Glock 17 (OWB, Kydex)'), 'Kabura glock 17 (OWB, kydex)');
  // the digits inside the name are not mistaken for a prefix
  assert.equal(categoryDisplayName('Latarka 1000 lm (IPX8)'), 'Latarka 1000 lm (IPX8)');
});
