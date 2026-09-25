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
