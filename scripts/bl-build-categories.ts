/**
 * Builds the Hydra category tree and the import tags in BaseLinker.
 *
 * Usage (every run writes to the live account — prodGuard requires the flag):
 *   HA_ALLOW_PROD=1 npx tsx scripts/bl-build-categories.ts [treeFile] [--dry-run]
 *
 * Target catalogue: BASELINKER_INVENTORY_ID from .env.local — required, no
 * default (HA-2.26). The script refuses to write when the catalogue is not on
 * the account, when it already holds a category whose name is not a Hydra tree
 * name (see xml-integration/bl-catalogue-setup.ts), or on BASELINKER_MOCK=true.
 *
 * Source: xml-integration/hydra-category-tree.txt (default) — the numbered
 * 15-branch tree ("01. BROŃ PALNA", "3.4.3 Montaże Dedykowane…"), parsed by
 * parseHydraTree in xml-integration/hydra-tree-txt.ts.
 *
 * - Creates missing categories via blCall('addInventoryCategory',
 *   { inventory_id, name, parent_id }) — flat params; returns category_id.
 * - Parents are created before children (tree numbering order).
 * - Adds "00. DO PRZYPISANIA" — fallback bucket for unmapped products.
 * - Idempotent: getInventoryCategories first, existing categories matched by
 *   (parent BL id, name) and reused — safe to re-run, also after a run that
 *   stopped half-way (the mapping file is written only after the last category).
 * - Writes xml-integration/hydra-categories.json:
 *   { "00": <id>, "01": <id>, "1.1": <id>, "3.4.3": <id>, … }
 *   — consumed by scripts/xml-to-baselinker.ts.
 * - Creates the missing import tags (IMPORT_TAGS_TO_CREATE — 7 tags) via
 *   blCall('addInventoryTag', { name }). Tags are ACCOUNT-WIDE in BL (no
 *   inventory_id): they show up for every catalogue on the account. Tags
 *   already there by name (getInventoryTags) are skipped — no duplicates.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { assertExternalProd } from './lib/prodGuard';
import { parseHydraTree, UNASSIGNED_CATEGORY } from '../xml-integration/hydra-tree-txt';
import {
  ensureCategoryTree,
  foreignCategories,
  missingImportTags,
  IMPORT_TAGS_TO_CREATE,
} from '../xml-integration/bl-catalogue-setup';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
assertExternalProd('BaseLinker');

const OUTPUT_PATH = path.resolve(process.cwd(), 'xml-integration/hydra-categories.json');
const DEFAULT_TREE = path.resolve(process.cwd(), 'xml-integration/hydra-category-tree.txt');

// BaseLinker free plan rate limit: ~100 req/min
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RATE_LIMIT_MS = 700;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const treeFile = args.find((a) => !a.startsWith('--')) ?? DEFAULT_TREE;

  if (!fs.existsSync(treeFile)) {
    console.error(`[error] tree file not found: ${treeFile}`);
    process.exit(1);
  }

  const categories = parseHydraTree(fs.readFileSync(treeFile, 'utf8'));

  // Fallback bucket for products the importer cannot map
  categories.unshift(UNASSIGNED_CATEGORY);

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
    console.log(`\nImport tags to ensure: ${IMPORT_TAGS_TO_CREATE.join(', ')}`);
    console.log('\n(dry run — nothing sent to BaseLinker)');
    return;
  }

  if (process.env.BASELINKER_MOCK === 'true') {
    console.error('[error] BASELINKER_MOCK=true — the mock cannot create categories; the mapping file would be overwritten with nothing');
    process.exit(1);
  }
  if (!process.env.BASELINKER_TOKEN) {
    console.error('[error] BASELINKER_TOKEN must be set');
    process.exit(1);
  }

  // No default: a fallback id would create 206 categories in whatever catalogue it names.
  const inventoryRaw = (process.env.BASELINKER_INVENTORY_ID ?? '').trim();
  if (!/^\d+$/.test(inventoryRaw)) {
    console.error('[error] BASELINKER_INVENTORY_ID must be set to the numeric id of the target BL catalogue');
    process.exit(1);
  }
  const inventoryId = parseInt(inventoryRaw, 10);

  const bl = await import('../src/lib/baselinker/client');

  const inventories = await bl.getInventories();
  const inventory = inventories.find((i) => i.inventory_id === inventoryId);
  if (!inventory) {
    console.error(`[error] inventory ${inventoryId} NOT FOUND on this account. Visible inventories:`);
    for (const i of inventories) console.error(`  ${i.inventory_id}  "${i.name}"`);
    process.exit(1);
  }
  console.log(`Inventory: ${inventoryId} "${inventory.name}"`);

  const existing = await bl.getCategories(inventoryId);
  console.log(`Existing categories in the catalogue: ${existing.length}\n`);

  const foreign = foreignCategories(existing, categories);
  if (foreign.length > 0) {
    console.error(
      `[error] catalogue ${inventoryId} already holds ${foreign.length} categories that are not in the Hydra tree — ` +
        'refusing to write (wrong catalogue?). First ones:',
    );
    for (const c of foreign.slice(0, 10)) console.error(`  ${c.category_id}  "${c.name}"`);
    process.exit(1);
  }

  // Writes only what is missing; categories from an earlier (even interrupted) run are reused
  const { idByNum, created, reused } = await ensureCategoryTree(categories, existing, async (cat, parentBlId) => {
    await sleep(RATE_LIMIT_MS);
    const res = await bl.blCall('addInventoryCategory', {
      inventory_id: inventoryId,
      name: cat.blName,
      parent_id: parentBlId,
    }) as { category_id: number };
    console.log(`  + ${cat.blName} → BL ${res.category_id}`);
    return res.category_id;
  });

  const mapping = Object.fromEntries(idByNum);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mapping, null, 2) + '\n');

  console.log(`\n✓ Categories: ${created} created, ${reused} already existed`);
  console.log(`  mapping written to ${path.relative(process.cwd(), OUTPUT_PATH)}`);

  // Import tags — account-wide in BL, so no inventory_id (see header)
  await sleep(RATE_LIMIT_MS);
  const tagsData = await bl.blCall('getInventoryTags') as { tags?: Array<{ tag_id: number; name: string }> };
  const tagsToCreate = missingImportTags((tagsData.tags ?? []).map((t) => t.name));
  console.log('');
  for (const name of tagsToCreate) {
    await sleep(RATE_LIMIT_MS);
    const res = await bl.blCall('addInventoryTag', { name }) as { tag_id: number };
    console.log(`  + tag ${name} → BL ${res.tag_id}`);
  }
  console.log(
    `✓ Tags: ${tagsToCreate.length} created, ${IMPORT_TAGS_TO_CREATE.length - tagsToCreate.length} already existed`,
  );
}

main().catch((err) => {
  console.error('\n[fatal]', err instanceof Error ? err.message : err);
  process.exit(1);
});
