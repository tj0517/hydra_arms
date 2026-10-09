/**
 * BaseLinker inventory report (HA-2.14) — READ-ONLY.
 *
 * Counts what is in the BL catalogue today, so tj can decide what to do with
 * products outside P1 that are already in BL before the first filtered import
 * (HA-2.15). Prints aggregates only: no product names, no prices, no tokens.
 *
 * Usage:
 *   BASELINKER_MOCK=true npx tsx scripts/bl-inventory-report.ts   # smoke test (fixtures)
 *   npx tsx scripts/bl-inventory-report.ts                        # live BL — run by tj
 *
 * BL methods called (all via src/lib/baselinker/readonly.ts, which rejects any
 * method outside its allowlist before it can reach the network):
 *   getInventories, getInventoryWarehouses, getInventoryTags,
 *   getInventoryProductsList (paginated), getInventoryProductsData (chunked)
 *
 * NEVER calls add*, update*, delete*, set*, or any order/customer method.
 * Nothing in BaseLinker is changed by this script.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Shell-level BASELINKER_MOCK wins over .env.local (smoke-test use case) —
// same convention as bl-verify-categories.ts.
const mockFlagFromShell = process.env.BASELINKER_MOCK;
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
if (mockFlagFromShell !== undefined) process.env.BASELINKER_MOCK = mockFlagFromShell;

import {
  READ_ONLY_METHODS,
  getInventories,
  getInventoryWarehouses,
  getInventoryTags,
  getInventoryProductsList,
  getInventoryProductsData,
} from '../src/lib/baselinker/readonly';
import { ASSORTMENT_RULES, effectiveAllowedHydraNums } from '../xml-integration/assortment-rules';

const METHODS_CALLED = [
  'getInventories',
  'getInventoryWarehouses',
  'getInventoryTags',
  'getInventoryProductsList',
  'getInventoryProductsData',
] as const;

const CHUNK = 200; // ids per getInventoryProductsData call (BL max 1 000; ~100 req/min limit)
const IMPORT_TAGS = ['auto', 'review', 'flag', 'approved', 'age_18'] as const;

/** Warehouse env mapping: label → env var (all four from .env.local.example). */
const WAREHOUSE_ENV: ReadonlyArray<{ label: string; env: string }> = [
  { label: 'H1 Kolba', env: 'BASELINKER_WAREHOUSE_H1' },
  { label: 'H2 Sharg', env: 'BASELINKER_WAREHOUSE_H2' },
  { label: 'H3 Spechurt', env: 'BASELINKER_WAREHOUSE_H3' },
  { label: 'Hydra (own)', env: 'BASELINKER_WAREHOUSE_HYDRA' },
];

const normNum = (n: string) => n.trim().replace(/^0+(?=\d)/, '');
/** "1.3.2" → "01", "10.1" → "10", "0" → "00" */
const deptOf = (hydraNum: string) => normNum(hydraNum).split('.')[0].padStart(2, '0');

function inc(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function printTable(title: string, rows: Array<[string, number | string]>) {
  console.log(`\n── ${title} ──`);
  const w = Math.max(...rows.map(([k]) => k.length), 10);
  for (const [k, v] of rows) console.log(`  ${k.padEnd(w)}  ${String(v).padStart(7)}`);
}

async function main() {
  const isMock = process.env.BASELINKER_MOCK === 'true';
  const inventoryId = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);

  console.log('\n=== bl-inventory-report (READ-ONLY) ===');
  console.log(`Inventory ID    : ${inventoryId}`);
  console.log(`BASELINKER_MOCK : ${isMock}`);
  console.log(`BL methods      : ${METHODS_CALLED.join(', ')}`);
  console.log(`Client allowlist: ${READ_ONLY_METHODS.join(', ')}`);
  console.log(`Filter nodes    : ${effectiveAllowedHydraNums(ASSORTMENT_RULES).length} P1 Hydra nodes (assortment-rules.ts, default new-subcategory priority ${ASSORTMENT_RULES.newSubcategoryDefaultPriority})`);
  if (isMock) {
    console.log('\n⚠  MOCK run — fixture data, numbers are meaningless. Smoke test only.');
  } else {
    if (!process.env.BASELINKER_TOKEN) {
      console.error('[error] BASELINKER_TOKEN must be set for a live run.');
      process.exit(1);
    }
    console.log('Target          : live BaseLinker (READ-ONLY — no writes)');
  }

  // ── Hydra department map (BL category id → Hydra number) ─────────────────
  const jsonPath = path.resolve(process.cwd(), 'xml-integration/hydra-categories.json');
  const hydraJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Record<string, number>;
  const idToHydra = new Map<number, string>();
  for (const [num, id] of Object.entries(hydraJson)) idToHydra.set(id, num);
  const allowed = new Set(effectiveAllowedHydraNums(ASSORTMENT_RULES).map(normNum));
  console.log(`hydra-categories.json: ${idToHydra.size} category ids`);

  // ── Inventory + warehouses ───────────────────────────────────────────────
  const inventories = await getInventories();
  const inv = inventories.find((i) => i.inventory_id === inventoryId);
  console.log(`\nInventories visible to token: ${inventories.length}; inventory ${inventoryId} ${inv ? 'found' : 'NOT FOUND'}`);
  if (inv) console.log(`  warehouses on inventory: ${inv.warehouses?.join(', ') || '—'}`);

  const warehouses = await getInventoryWarehouses();
  const whName = new Map<string, string>();
  for (const w of warehouses) {
    whName.set(`${w.warehouse_type}_${w.warehouse_id}`, w.name);
  }
  console.log(`Warehouses in BL account: ${warehouses.length}`);
  for (const [key, name] of whName) console.log(`  ${key}  "${name}"`);

  // ── Tags defined in BL ───────────────────────────────────────────────────
  const blTags = await getInventoryTags(inventoryId);
  const blTagNames = new Set(blTags.map((t) => t.name));
  console.log(`\nTags defined in inventory: ${blTags.length}`);
  console.log(`  import tags present: ${IMPORT_TAGS.filter((t) => blTagNames.has(t)).join(', ') || '—'}`);
  console.log(`  import tags MISSING: ${IMPORT_TAGS.filter((t) => !blTagNames.has(t)).join(', ') || '—'}`);

  // ── Product ids (paginated) ──────────────────────────────────────────────
  const allIds: string[] = [];
  for (let page = 1; ; page++) {
    const batch = await getInventoryProductsList(inventoryId, page);
    const ids = Object.keys(batch);
    if (ids.length === 0) break;
    allIds.push(...ids);
    console.log(`  products list page ${page}: ${ids.length}`);
    if (ids.length < 1000) break;
  }
  console.log(`\nTOTAL products in inventory ${inventoryId}: ${allIds.length}`);

  // ── Counters ─────────────────────────────────────────────────────────────
  const perWarehouseAny = new Map<string, number>();   // product has a stock entry for the warehouse
  const perWarehousePos = new Map<string, number>();   // stock > 0 in that warehouse
  const perTag = new Map<string, number>();
  const perDept = new Map<string, number>();
  const perDeptApproved = new Map<string, number>();
  let noImportTag = 0;
  let noTagAtAll = 0;
  let approvedTotal = 0;
  let zeroStockEverywhere = 0;
  let categoryNotInHydraJson = 0;
  let categoryUnset = 0;
  let outsideP1 = 0;
  let outsideP1Approved = 0;
  let outsideP1Dept0102 = 0;
  let outsideP1Dept0102Approved = 0;
  let outsideP1Unknown = 0;
  let outsideP1Unknown_approved = 0;
  let insideP1 = 0;
  let insideP1Approved = 0;
  let fetched = 0;

  for (let i = 0; i < allIds.length; i += CHUNK) {
    const chunk = allIds.slice(i, i + CHUNK);
    const details = await getInventoryProductsData(inventoryId, chunk);
    for (const p of Object.values(details)) {
      fetched++;
      const tags = p.tags ?? [];
      const approved = tags.includes('approved');
      if (approved) approvedTotal++;

      // warehouses
      const stock = p.stock ?? {};
      let total = 0;
      for (const [wh, qty] of Object.entries(stock)) {
        inc(perWarehouseAny, wh);
        if (qty > 0) { inc(perWarehousePos, wh); total += qty; }
      }
      if (total <= 0) zeroStockEverywhere++;

      // tags
      let hasImportTag = false;
      for (const t of IMPORT_TAGS) if (tags.includes(t)) { inc(perTag, t); hasImportTag = true; }
      if (!hasImportTag) noImportTag++;
      if (tags.length === 0) noTagAtAll++;

      // department + P1
      const hydra = p.category_id ? idToHydra.get(p.category_id) : undefined;
      if (!p.category_id) categoryUnset++;
      else if (!hydra) categoryNotInHydraJson++;
      const dept = hydra ? deptOf(hydra) : '(not in hydra-categories.json)';
      inc(perDept, dept);
      if (approved) inc(perDeptApproved, dept);

      const passesP1 = hydra !== undefined && allowed.has(normNum(hydra));
      if (passesP1) {
        insideP1++;
        if (approved) insideP1Approved++;
      } else {
        outsideP1++;
        if (approved) outsideP1Approved++;
        if (dept === '01' || dept === '02') { outsideP1Dept0102++; if (approved) outsideP1Dept0102Approved++; }
        if (!hydra) { outsideP1Unknown++; if (approved) outsideP1Unknown_approved++; }
      }
    }
    process.stdout.write(`  details ${Math.min(i + CHUNK, allIds.length)}/${allIds.length}\r`);
  }
  console.log(`  details fetched: ${fetched}/${allIds.length}${fetched !== allIds.length ? '  ⚠ MISMATCH' : ''}`);

  // ── Output ───────────────────────────────────────────────────────────────
  const whRows: Array<[string, number | string]> = [];
  for (const { label, env } of WAREHOUSE_ENV) {
    const id = process.env[env];
    if (!id) {
      whRows.push([`${label} (${env})`, 'NOT CONFIGURED — env var unset']);
      continue;
    }
    const name = whName.get(id);
    whRows.push([
      `${label} (${id}${name ? ` "${name}"` : ' — id not in BL warehouse list'})`,
      `${perWarehousePos.get(id) ?? 0} with stock>0 / ${perWarehouseAny.get(id) ?? 0} listed`,
    ]);
  }
  printTable('Per warehouse — env mapping (H1/H2/H3/Hydra)', whRows);

  const seenRows: Array<[string, number | string]> = [...perWarehouseAny.keys()].sort().map((wh) => [
    `${wh}${whName.has(wh) ? ` "${whName.get(wh)}"` : ''}`,
    `${perWarehousePos.get(wh) ?? 0} with stock>0 / ${perWarehouseAny.get(wh)} listed`,
  ]);
  printTable('Per warehouse — every warehouse key seen on products', seenRows.length ? seenRows : [['(none)', 0]]);
  console.log(`  products with stock 0 in every warehouse: ${zeroStockEverywhere}`);

  printTable('Per import tag', [
    ...IMPORT_TAGS.map((t): [string, number] => [t, perTag.get(t) ?? 0]),
    ['none of the import tags', noImportTag],
    ['no tags at all', noTagAtAll],
  ]);

  const deptRows: Array<[string, number | string]> = [...perDept.keys()].sort().map((d) => [
    d,
    `${perDept.get(d)} (approved: ${perDeptApproved.get(d) ?? 0})`,
  ]);
  printTable('Per Hydra department (via hydra-categories.json)', deptRows);
  console.log(`  category_id unset/0: ${categoryUnset}; category_id not in hydra-categories.json: ${categoryNotInHydraJson}`);

  printTable('HA-2.04 filter — category criterion only (stock/price not applied)', [
    ['inside P1 (would pass)', insideP1],
    ['  of which approved', insideP1Approved],
    ['outside P1 (would NOT pass)', outsideP1],
    ['  of which in departments 01/02', outsideP1Dept0102],
    ['    of which approved', outsideP1Dept0102Approved],
    ['  of which category unknown to Hydra tree', outsideP1Unknown],
    ['    of which approved', outsideP1Unknown_approved],
  ]);

  console.log(`\nproducts outside P1 with tag \`approved\`: ${outsideP1Approved}`);
  console.log(`products with tag \`approved\` (total): ${approvedTotal}`);
  console.log('\nNothing was written to BaseLinker.\n');
}

main().catch((err) => {
  console.error('\n[fatal]', err instanceof Error ? err.message : err);
  process.exit(1);
});
