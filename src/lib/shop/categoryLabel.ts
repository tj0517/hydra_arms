/**
 * Public display names for shop categories (HA-2.30).
 *
 * BaseLinker category names carry the Hydra tree numbering and a parenthesised
 * description ("01. BROŃ PALNA (Koncesjonowana – Odbiór osobisty: Salon Kraków)",
 * "1.2.1 Karabiny i Karabinki Samopowtarzalne (Platformy AR-15, …)"). Those are
 * internal: the prefix drives hydra_section() and the import rules, the
 * parenthetical is a note for the people maintaining the tree. Neither belongs
 * on a public label. Decision tj 2026-10-19 (D2 A): labels are derived from the
 * BL name in code — no migration, no extra column.
 *
 * The prefix and the parenthetical are stripped ONLY when the name carries a
 * Hydra numeric prefix — that is what marks it as a BL tree category. A name
 * without the prefix (seed categories, or any string that is not a tree
 * category) passes through unchanged except for letter case, so a product name
 * such as "Produkt testowy (bez flag)" would never be cut even if it reached
 * this function by mistake.
 */

/** "01." / "1.1" / "1.2.1" at the start of the name, with its trailing space. */
const HYDRA_PREFIX = /^\s*\d{1,2}(?:\.\d+)*\.?\s+/;

/** "00." root — the importer's "DO PRZYPISANIA" bucket, never shown in the tree (D1 A). */
const WORKING_ROOT = /^\s*00(?:\.|\s|$)/;

function hasHydraPrefix(name: string): boolean {
  return HYDRA_PREFIX.test(name);
}

function stripParenthetical(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, ' ') // balanced "(…)" anywhere in the name
    .replace(/[()]/g, ' ')         // stray unbalanced parens (tree has "15.3.1 …)")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sentence case that keeps acronyms.
 * - a name written entirely in capitals ("BROŃ PALNA") → "Broń palna";
 * - a title-cased name keeps words that are all capitals ("PCC", "AR-15", "CO2",
 *   "17 J") and lowercases the Title-Cased ones ("Broń Krótka" → "Broń krótka").
 */
function sentenceCase(name: string): string {
  const letters = name.replace(/[^\p{L}]/gu, '');
  if (letters.length === 0) return name;

  const allCaps = letters === letters.toLocaleUpperCase('pl');
  const words = name.split(' ').map(word => {
    const wordLetters = word.replace(/[^\p{L}]/gu, '');
    if (wordLetters.length === 0) return word;
    if (allCaps) return word.toLocaleLowerCase('pl');
    const isAcronym = wordLetters === wordLetters.toLocaleUpperCase('pl');
    return isAcronym ? word : word.toLocaleLowerCase('pl');
  });

  const joined = words.join(' ');
  const first = joined.search(/\p{L}/u);
  if (first < 0) return joined;
  return joined.slice(0, first) + joined.charAt(first).toLocaleUpperCase('pl') + joined.slice(first + 1);
}

/**
 * Public label for a shop category name.
 * "01. BROŃ PALNA (Koncesjonowana – …)" → "Broń palna"
 * "1.1 Broń Krótka"                     → "Broń krótka"
 * "Odzież taktyczna"                    → "Odzież taktyczna" (no prefix: case only)
 */
export function categoryDisplayName(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim();
  if (!hasHydraPrefix(trimmed)) return sentenceCase(trimmed);
  const withoutPrefix = trimmed.replace(HYDRA_PREFIX, '');
  const withoutNote = stripParenthetical(withoutPrefix);
  return sentenceCase(withoutNote || withoutPrefix);
}

/** True for the "00. DO PRZYPISANIA" root — a working bucket, hidden from the public tree. */
export function isWorkingCategory(name: string): boolean {
  return WORKING_ROOT.test(name);
}
