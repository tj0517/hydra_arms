/**
 * Read-only verification script: compares xml-integration/hydra-categories.json
 * with the live BaseLinker inventory (categories + tags).
 *
 * Usage:
 *   BASELINKER_MOCK=true npx tsx scripts/bl-verify-categories.ts          # smoke test
 *   npx tsx scripts/bl-verify-categories.ts                               # live BL
 *   npx tsx scripts/bl-verify-categories.ts /path/to/other.json           # test a copy
 *
 * Exit code:
 *   0 — no mismatches found (and NOT on mock)
 *   1 — any mismatch, or running on mock (mock categories do not match the Hydra tree)
 *
 * BL methods called (read-only):
 *   getInventoryCategories(inventory_id) — via getCategories()
 *   getInventoryTags(inventory_id)       — via blCall()
 *
 * NEVER calls add*, update*, delete*, or set* methods.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { parseHydraTreeNumbers } from '../xml-integration/hydra-tree-txt';

// Capture BASELINKER_MOCK before dotenv so a shell-level flag isn't overwritten by .env.local
const mockFlagFromShell = process.env.BASELINKER_MOCK;
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
// Restore: shell-level BASELINKER_MOCK takes precedence over .env.local (smoke-test use case)
if (mockFlagFromShell !== undefined) process.env.BASELINKER_MOCK = mockFlagFromShell;
// Read-only: assertExternalProd is NOT used — it requires HA_ALLOW_PROD=1 which is reserved
// for write operations. This script prints a READ-ONLY banner instead.

const normNum = (n: string) => n.trim().replace(/^0+(?=\d)/, '');

interface BLTag { tag_id: number; name: string }

/**
 * Build a map of normalised number → expected BL category name.
 * Uses the same logic as parseTree in bl-build-categories.ts.
 * The "00" entry is added manually (it is prepended by that script, not in the txt).
 */
function buildExpectedNames(txt: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const rawLine of txt.split(/\r?\n/)) {
    const cleaned = rawLine.replace(/[│├└┬─]/g, ' ').trim();
    const m = cleaned.match(/^(\d{1,2}(?:\.\d+)*)\.?\s+(.+)$/);
    if (!m) continue;
    const num = m[1];
    const name = m[2]
      .replace(/\s*\([^)]*\)/g, ' ')
      .replace(/[()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!name) continue;
    const isRoot = num.split('.').length === 1;
    const blName = isRoot ? `${num}. ${name}` : `${num} ${name}`;
    result.set(normNum(num), blName);
  }
  result.set('0', '00. DO PRZYPISANIA'); // added by bl-build-categories.ts, not in txt
  return result;
}

async function main() {
  const isMock = process.env.BASELINKER_MOCK === 'true';
  const inventoryId = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);

  console.log('\n=== bl-verify-categories (READ-ONLY) ===');
  console.log(`Inventory ID : ${inventoryId}`);
  console.log(`BASELINKER_MOCK: ${isMock}`);

  if (isMock) {
    console.warn('\n⚠  Running on MOCK — mock categories do not match the Hydra tree.');
    console.warn('   Mismatches below are EXPECTED. Treat this as a smoke test only.\n');
  } else {
    if (!process.env.BASELINKER_TOKEN) {
      console.error('[error] BASELINKER_TOKEN must be set for a live run.');
      process.exit(1);
    }
    console.log('Target: live BaseLinker (READ-ONLY — no writes)\n');
  }

  const DEFAULT_JSON = path.resolve(process.cwd(), 'xml-integration/hydra-categories.json');
  const TXT_PATH = path.resolve(process.cwd(), 'xml-integration/hydra-category-tree.txt');
  const jsonPath = process.argv[2] ?? DEFAULT_JSON;

  if (!fs.existsSync(jsonPath)) {
    console.error(`[error] JSON file not found: ${jsonPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(TXT_PATH)) {
    console.error(`[error] Tree file not found: ${TXT_PATH}`);
    process.exit(1);
  }

  // ── Load JSON ──────────────────────────────────────────────────────────────────

  const rawJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Record<string, unknown>;
  const numToId = new Map<string, number>(
    Object.entries(rawJson).map(([k, v]) => [normNum(k), v as number])
  );
  const idToNum = new Map<number, string>();
  for (const [k, v] of numToId) idToNum.set(v, k);

  console.log(`JSON: ${numToId.size} entries (${path.relative(process.cwd(), jsonPath)})`);

  // ── Load tree numbers and expected names ───────────────────────────────────────

  const treeTxt = fs.readFileSync(TXT_PATH, 'utf8');
  const treeNums = parseHydraTreeNumbers(treeTxt);
  const expectedNames = buildExpectedNames(treeTxt);
  console.log(`Tree: ${treeNums.size} numbers from ${path.relative(process.cwd(), TXT_PATH)}\n`);

  // ── Fetch BL categories ────────────────────────────────────────────────────────

  const { blCall, getCategories } = await import('../src/lib/baselinker/client');

  console.log('Fetching getInventoryCategories…');
  const blCats = await getCategories(inventoryId);
  console.log(`BL returned ${blCats.length} categories\n`);

  const blById = new Map(blCats.map((c) => [c.category_id, c]));

  // ── Category checks ────────────────────────────────────────────────────────────

  let mismatches = 0;
  let informational = 0;

  const report = (label: string, lines: string[], isInfo = false) => {
    if (lines.length === 0) { console.log(`${label}: OK ✓`); return; }
    console.log(`\n--- ${label} (${lines.length}) ---`);
    lines.forEach((l) => console.log(`  ${l}`));
    if (isInfo) informational += lines.length;
    else mismatches += lines.length;
  };

  // 1. IDs in JSON but category not found in BL
  const idsNotInBL: string[] = [];
  for (const [num, id] of numToId) {
    if (!blById.has(id)) {
      idsNotInBL.push(`num=${num} id=${id} — not found in BL`);
    }
  }
  report('IDs in JSON but missing from BL', idsNotInBL);

  // 2. Numbers in tree (and "00") but no ID in JSON
  const numsWithoutId: string[] = [];
  for (const num of treeNums) {
    if (!numToId.has(num)) numsWithoutId.push(num);
  }
  if (!numToId.has('0')) numsWithoutId.push('0 (from "00")');
  report('Numbers in tree but no ID in JSON', numsWithoutId);

  // 3. Name mismatches: expected blName (from tree) vs BL category name
  const nameMismatches: string[] = [];
  for (const [num, id] of numToId) {
    const cat = blById.get(id);
    if (!cat) continue; // already counted in check 1
    const expected = expectedNames.get(num);
    if (expected !== undefined && cat.name !== expected) {
      nameMismatches.push(`num=${num} id=${id}: BL="${cat.name}" ≠ expected="${expected}"`);
    }
  }
  report('Name mismatches (BL name ≠ expected from tree)', nameMismatches);

  // 4. Parent-ID consistency
  const parentMismatches: string[] = [];
  for (const [num, id] of numToId) {
    const cat = blById.get(id);
    if (!cat) continue;
    const segments = num.split('.');
    if (segments.length <= 1) continue; // root — parent_id is 0, not checked
    const rawParent = segments.slice(0, -1).join('.');
    const parentNorm = normNum(rawParent.padStart(segments.length === 2 ? 2 : 0, '0'));
    const expectedParentId = numToId.get(parentNorm);
    if (expectedParentId !== undefined && cat.parent_id !== expectedParentId) {
      parentMismatches.push(
        `num=${num} id=${id} — parent_id in BL=${cat.parent_id} ≠ expected=${expectedParentId} (${rawParent})`
      );
    }
  }
  report('Parent-ID mismatches (BL parent ≠ expected from tree structure)', parentMismatches);

  // 5. BL categories not referenced in JSON — informational, not a mismatch
  const blIdsNotInJson: string[] = [];
  for (const cat of blCats) {
    if (!idToNum.has(cat.category_id)) {
      blIdsNotInJson.push(`id=${cat.category_id} name="${cat.name}" parent=${cat.parent_id}`);
    }
  }
  report('BL categories not referenced in JSON (informational)', blIdsNotInJson, true);

  // ── Tags check ─────────────────────────────────────────────────────────────────

  const REQUIRED_TAGS = ['auto', 'review', 'flag', 'age_18', 'approved'];

  console.log('\nFetching getInventoryTags…');
  let blTags: BLTag[] = [];
  try {
    const tagsData = await blCall('getInventoryTags', { inventory_id: inventoryId }) as { tags?: BLTag[] };
    blTags = tagsData.tags ?? [];
  } catch (err) {
    console.error(`[error] getInventoryTags failed: ${err instanceof Error ? err.message : err}`);
    mismatches++;
  }

  const blTagNames = new Set(blTags.map((t) => t.name));
  const tagsPresent = REQUIRED_TAGS.filter((t) => blTagNames.has(t));
  const tagsMissing = REQUIRED_TAGS.filter((t) => !blTagNames.has(t));

  console.log(`\nTags in BL inventory: ${blTags.length} total`);
  console.log(`Required tags present (${tagsPresent.length}): ${tagsPresent.join(', ') || '—'}`);
  if (tagsMissing.length > 0) {
    console.log(`Required tags MISSING (${tagsMissing.length}): ${tagsMissing.join(', ')}`);
    mismatches += tagsMissing.length;
  } else {
    console.log('All required tags present ✓');
  }

  // ── Summary ────────────────────────────────────────────────────────────────────

  console.log('\n========================================');
  if (isMock) {
    console.log('RESULT: mock run — mismatches expected (mock ≠ Hydra tree), exit 1');
    process.exit(1);
  }

  const infoNote = informational > 0 ? ` (${informational} BL categories not in JSON — informational)` : '';
  if (mismatches === 0) {
    console.log(`RESULT: 0 mismatches ✓${infoNote}`);
    process.exit(0);
  } else {
    console.log(`RESULT: ${mismatches} mismatch(es)${infoNote} — see above`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n[fatal]', err instanceof Error ? err.message : err);
  process.exit(1);
});
