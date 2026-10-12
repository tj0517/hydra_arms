/**
 * Hydra category tree — numbers-only variant built from hydra-category-tree.txt.
 *
 * Used in dry-run mode so that hydra-categories.json (Hydra num → BL category ID,
 * built by scripts/bl-build-categories.ts, a prod write) is NOT required.
 * Provides the same structural interface as HydraTree in xml-to-baselinker.ts,
 * but ID-returning methods yield a dummy 0 — unused in dry-run.
 */

// Mirrors normNum in scripts/xml-to-baselinker.ts
const normNum = (n: string) => n.trim().replace(/^0+(?=\d)/, '');

const AGE_18_BRANCH = '15';

/**
 * Extract normalised Hydra numbers from hydra-category-tree.txt.
 * Matches lines like:
 *   " ├── 01. BROŃ PALNA …"    → "1"
 *   " │    ├── 3.4.1 Montaże"  → "3.4.1"
 *   " │         └── 11.1.3 …"  → "11.1.3"
 */
export function parseHydraTreeNumbers(txt: string): Set<string> {
  const nums = new Set<string>();
  for (const line of txt.split('\n')) {
    const m = line.match(/[├└]── (\d{1,2}(?:\.\d+)*)[\s.]/);
    if (m) nums.add(normNum(m[1]));
  }
  return nums;
}

export interface ParsedHydraCategory {
  num: string;         // "01" | "1.1" | "3.4.3" — as written in the tree
  name: string;        // name without the parenthesised description
  blName: string;      // full BL category name incl. number, e.g. "1.1 Broń Krótka"
  parentNum: string | null;
}

/**
 * Full parse of hydra-category-tree.txt for scripts/bl-build-categories.ts
 * (HA-2.26: moved out of the guarded script so it can be unit-tested).
 *
 * Indentation characters are decorative; hierarchy is derived from the NUMBER
 * alone (parent of "3.4.3" is "3.4", parent of "1.1" is "01"), which survives
 * the broken box-drawing in the source file. The parenthesised part of each
 * line is a description — BL categories have no description field, so it is
 * stripped from the category name. Output keeps file order, so parents come
 * before their children.
 */
export function parseHydraTree(text: string): ParsedHydraCategory[] {
  const out: ParsedHydraCategory[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    // Strip box-drawing characters — they are unreliable in the source
    const cleaned = rawLine.replace(/[│├└┬─]/g, ' ').trim();
    const m = cleaned.match(/^(\d{1,2}(?:\.\d+)*)\.?\s+(.+)$/);
    if (!m) continue;

    const num = m[1];
    // Drop parenthesised descriptions + stray unbalanced parens (e.g. "15.3.1 …)")
    const name = m[2]
      .replace(/\s*\([^)]*\)/g, ' ')
      .replace(/[()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!name) continue;
    if (seen.has(num)) {
      console.warn(`  ⚠ duplicate number ${num} — keeping the first occurrence`);
      continue;
    }
    seen.add(num);

    const segments = num.split('.');
    const isRoot = segments.length === 1;
    // Roots are "01".."15"; children drop the leading zero ("1.1"), so the
    // parent of "1.1" is "1" → normalize back to the root form "01"
    const parentNum = isRoot
      ? null
      : segments.slice(0, -1).join('.').padStart(segments.length === 2 ? 2 : 0, '0');

    out.push({
      num,
      name,
      blName: isRoot ? `${num}. ${name}` : `${num} ${name}`,
      parentNum,
    });
  }

  return out;
}

/** Fallback bucket for products the importer cannot map — not in the txt file. */
export const UNASSIGNED_CATEGORY: ParsedHydraCategory = {
  num: '00',
  name: 'DO PRZYPISANIA',
  blName: '00. DO PRZYPISANIA',
  parentNum: null,
};

/**
 * Lightweight Hydra tree from hydra-category-tree.txt.
 * Structurally compatible (duck-type) with HydraTree in xml-to-baselinker.ts.
 */
export class HydraTreeFromTxt {
  private nums: Set<string>;

  constructor(txt: string) {
    this.nums = parseHydraTreeNumbers(txt);
  }

  /** Number of distinct nodes parsed — useful for a quick sanity check. */
  get size(): number { return this.nums.size; }

  /** Returns 0 (dummy) for a valid number; undefined for one not in the tree. */
  resolve(num: string): number | undefined {
    return this.nums.has(normNum(num)) ? 0 : undefined;
  }

  /** True when num has no children in the tree. */
  isLeaf(num: string): boolean {
    const prefix = `${normNum(num)}.`;
    for (const key of this.nums) {
      if (key.startsWith(prefix)) return false;
    }
    return true;
  }

  isAge18Branch(num: string): boolean {
    const n = normNum(num);
    return n === AGE_18_BRANCH || n.startsWith(`${AGE_18_BRANCH}.`);
  }

  /** Returns 0 — BL category ID not needed in dry-run. */
  get unassignedId(): number { return 0; }
}
