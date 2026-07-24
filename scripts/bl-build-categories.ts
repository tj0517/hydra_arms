/**
 * Builds the Hydra category tree in BaseLinker.
 *
 * Usage:
 *   npx tsx scripts/bl-build-categories.ts [treeFile] [--dry-run]
 *
 * Source: xml-integration/hydra-category-tree.txt (default) — the numbered
 * 15-branch tree ("01. BROŃ PALNA", "3.4.3 Montaże Dedykowane…"). Indentation
 * characters are decorative; hierarchy is derived from the NUMBER alone
 * (parent of "3.4.3" is "3.4", parent of "1.1" is "01"), which survives the
 * broken box-drawing in the source file. The parenthesised part of each line
 * is a description — BL categories have no description field, so it is
 * stripped from the category name.
 *
 * - Creates missing categories via blCall('addInventoryCategory',
 *   { inventory_id, name, parent_id }) — flat params; returns category_id.
 * - Parents are created before children (tree numbering order).
 * - Adds "00. DO PRZYPISANIA" — fallback bucket for unmapped products.
 * - Idempotent: getInventoryCategories first, existing categories matched by
 *   (parent BL id, name) and reused — safe to re-run.
 * - Writes xml-integration/hydra-categories.json:
 *   { "00": <id>, "01": <id>, "1.1": <id>, "3.4.3": <id>, … }
 *   — consumed by scripts/xml-to-baselinker.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const OUTPUT_PATH = path.resolve(process.cwd(), 'xml-integration/hydra-categories.json');
const DEFAULT_TREE = path.resolve(process.cwd(), 'xml-integration/hydra-category-tree.txt');

// BaseLinker free plan rate limit: ~100 req/min
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RATE_LIMIT_MS = 700;

interface ParsedCategory {
  num: string;         // "01" | "1.1" | "3.4.3" — as written in the tree
  name: string;        // name without the parenthesised description
  blName: string;      // full BL category name incl. number, e.g. "1.1 Broń Krótka"
  parentNum: string | null;
}

// ── Tree parser ───────────────────────────────────────────────────────────────

function parseTree(text: string): ParsedCategory[] {
  const out: ParsedCategory[] = [];
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const treeFile = args.find((a) => !a.startsWith('--')) ?? DEFAULT_TREE;

  if (!fs.existsSync(treeFile)) {
    console.error(`[error] tree file not found: ${treeFile}`);
    process.exit(1);
  }

  const categories = parseTree(fs.readFileSync(treeFile, 'utf8'));

  // Fallback bucket for products the importer cannot map
  categories.unshift({ num: '00', name: 'DO PRZYPISANIA', blName: '00. DO PRZYPISANIA', parentNum: null });

  // Sanity: every child must have a known parent
  const nums = new Set(categories.map((c) => c.num));
  const orphans = categories.filter((c) => c.parentNum && !nums.has(c.parentNum));
  if (orphans.length > 0) {
    console.error('[error] orphaned categories (parent number not found in tree):');
    orphans.forEach((c) => console.error(`  ${c.num} ${c.name} → parent ${c.parentNum}?`));
    process.exit(1);
  }

  const roots = categories.filter((c) => !c.parentNum).length;
  console.log(`\nParsed ${categories.length} categories (${roots} roots incl. "00. DO PRZYPISANIA")`);

  if (dryRun) {
    for (const c of categories) {
      const depth = c.num.split('.').length - 1;
      console.log(`${'  '.repeat(depth)}${c.blName}`);
    }
    console.log('\n(dry run — nothing sent to BaseLinker)');
    return;
  }

  if (!process.env.BASELINKER_TOKEN) {
    console.error('[error] BASELINKER_TOKEN must be set');
    process.exit(1);
  }

  const bl = await import('../src/lib/baselinker/client');
  const inventoryId = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);
  console.log(`Inventory: ${inventoryId}\n`);

  // Idempotency: match existing BL categories by (parent BL id, name)
  const existing = await bl.getCategories(inventoryId);
  const existingByKey = new Map(existing.map((c) => [`${c.parent_id}|${c.name}`, c.category_id]));

  const idByNum = new Map<string, number>();
  let created = 0;
  let reused = 0;

  for (const cat of categories) {
    const parentBlId = cat.parentNum ? idByNum.get(cat.parentNum)! : 0;
    const key = `${parentBlId}|${cat.blName}`;

    const existingId = existingByKey.get(key);
    if (existingId !== undefined) {
      idByNum.set(cat.num, existingId);
      reused++;
      continue;
    }

    await sleep(RATE_LIMIT_MS);
    const res = await bl.blCall('addInventoryCategory', {
      inventory_id: inventoryId,
      name: cat.blName,
      parent_id: parentBlId,
    }) as { category_id: number };

    idByNum.set(cat.num, res.category_id);
    existingByKey.set(key, res.category_id);
    created++;
    console.log(`  + ${cat.blName} → BL ${res.category_id}`);
  }

  const mapping = Object.fromEntries(idByNum);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mapping, null, 2) + '\n');

  console.log(`\n✓ Done: ${created} created, ${reused} already existed`);
  console.log(`  mapping written to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

main().catch((err) => {
  console.error('\n[fatal]', err instanceof Error ? err.message : err);
  process.exit(1);
});
