/**
 * BaseLinker inventory report (HA-2.14) — READ-ONLY.
 *
 * Counts what is in the BL account today, so tj can decide what to do with
 * products outside P1 that are already in BL before the first filtered import
 * (HA-2.15). Prints aggregates only: no product names, no prices, no tokens.
 *
 * Iterates over EVERY inventory (catalogue) visible to the token (tj decision
 * 2026-10-09: the configured BASELINKER_INVENTORY_ID may not exist on the
 * client's account — then the script says so and still reports all of them).
 * Per-warehouse counts use the warehouse ids actually seen on products,
 * labelled with names from getInventoryWarehouses; the env H1/H2/H3 mapping is
 * NOT used for counts (sandbox-only ids).
 *
 * Usage:
 *   BASELINKER_MOCK=true npx tsx scripts/bl-inventory-report.ts   # smoke test (fixtures)
 *   npx tsx scripts/bl-inventory-report.ts                        # live BL — run by tj
 *
 * BL methods called (all via src/lib/baselinker/readonly.ts, which rejects any
 * method outside its allowlist before it can reach the network):
 *   getInventories, getInventoryWarehouses, getInventoryTags (per inventory),
 *   getInventoryProductsList (paginated, per inventory),
 *   getInventoryProductsData (chunked, per inventory)
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

const normNum = (n: string) => n.trim().replace(/^0+(?=\d)/, '');
/** "1.3.2" → "01", "10.1" → "10", "0" → "00" */
const deptOf = (hydraNum: string) => normNum(hydraNum).split('.')[0].padStart(2, '0');

function inc(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function printTable(title: string, rows: Array<[string, number | string]>) {
  console.log(`\n  ── ${title} ──`);
  const w = Math.max(...rows.map(([k]) => k.length), 10);
  for (const [k, v] of rows) console.log(`    ${k.padEnd(w)}  ${String(v).padStart(7)}`);
}

/** Aggregates for one inventory; summed into the totals line at the end. */
interface Stats {
  products: number;
  fetched: number;
  approved: number;
  insideP1: number;
  insideP1Approved: number;
  outsideP1: number;
  outsideP1Approved: number;
  outsideP1Dept0102: number;
  outsideP1Dept0102Approved: number;
  outsideP1Unknown: number;
  outsideP1UnknownApproved: number;
  noImportTag: number;
  noTagAtAll: number;
  zeroStockEverywhere: number;
  categoryUnset: number;
  categoryNotInHydraJson: number;
  perTag: Map<string, number>;
}

function emptyStats(): Stats {
  return {
    products: 0, fetched: 0, approved: 0,
    insideP1: 0, insideP1Approved: 0,
    outsideP1: 0, outsideP1Approved: 0,
    outsideP1Dept0102: 0, outsideP1Dept0102Approved: 0,
    outsideP1Unknown: 0, outsideP1UnknownApproved: 0,
    noImportTag: 0, noTagAtAll: 0, zeroStockEverywhere: 0,
    categoryUnset: 0, categoryNotInHydraJson: 0,
    perTag: new Map(),
  };
}

async function listAllProductIds(inventoryId: number): Promise<string[]> {
  const allIds: string[] = [];
  for (let page = 1; ; page++) {
    const batch = await getInventoryProductsList(inventoryId, page);
    const ids = Object.keys(batch);
    if (ids.length === 0) break;
    allIds.push(...ids);
    if (ids.length < 1000) break;
  }
  return allIds;
}

async function reportInventory(
  inventoryId: number,
  name: string,
  allIds: string[],
  whName: Map<string, string>,
  idToHydra: Map<number, string>,
  allowed: Set<string>,
): Promise<Stats> {
  const s = emptyStats();
  s.products = allIds.length;

  console.log(`\n${'='.repeat(72)}`);
  console.log(`INVENTORY ${inventoryId} "${name}" — ${allIds.length} products`);
  console.log('='.repeat(72));

  const blTags = await getInventoryTags(inventoryId);
  const blTagNames = new Set(blTags.map((t) => t.name));
  console.log(`  tags defined: ${blTags.length}`);
  console.log(`    import tags present: ${IMPORT_TAGS.filter((t) => blTagNames.has(t)).join(', ') || '—'}`);
  console.log(`    import tags MISSING: ${IMPORT_TAGS.filter((t) => !blTagNames.has(t)).join(', ') || '—'}`);

  const perWarehouseAny = new Map<string, number>(); // product has a stock entry for the warehouse
  const perWarehousePos = new Map<string, number>(); // stock > 0 in that warehouse
  const perDept = new Map<string, number>();
  const perDeptApproved = new Map<string, number>();

  for (let i = 0; i < allIds.length; i += CHUNK) {
    const chunk = allIds.slice(i, i + CHUNK);
    const details = await getInventoryProductsData(inventoryId, chunk);
    for (const p of Object.values(details)) {
      s.fetched++;
      const tags = p.tags ?? [];
      const approved = tags.includes('approved');
      if (approved) s.approved++;

      const stock = p.stock ?? {};
      let total = 0;
      for (const [wh, qty] of Object.entries(stock)) {
        inc(perWarehouseAny, wh);
        if (qty > 0) { inc(perWarehousePos, wh); total += qty; }
      }
      if (total <= 0) s.zeroStockEverywhere++;

      let hasImportTag = false;
      for (const t of IMPORT_TAGS) if (tags.includes(t)) { inc(s.perTag, t); hasImportTag = true; }
      if (!hasImportTag) s.noImportTag++;
      if (tags.length === 0) s.noTagAtAll++;

      const hydra = p.category_id ? idToHydra.get(p.category_id) : undefined;
      if (!p.category_id) s.categoryUnset++;
      else if (!hydra) s.categoryNotInHydraJson++;
      const dept = hydra ? deptOf(hydra) : '(not in hydra-categories.json)';
      inc(perDept, dept);
      if (approved) inc(perDeptApproved, dept);

      const passesP1 = hydra !== undefined && allowed.has(normNum(hydra));
      if (passesP1) {
        s.insideP1++;
        if (approved) s.insideP1Approved++;
      } else {
        s.outsideP1++;
        if (approved) s.outsideP1Approved++;
        if (dept === '01' || dept === '02') { s.outsideP1Dept0102++; if (approved) s.outsideP1Dept0102Approved++; }
        if (!hydra) { s.outsideP1Unknown++; if (approved) s.outsideP1UnknownApproved++; }
      }
    }
  }
  console.log(`  details fetched: ${s.fetched}/${allIds.length}${s.fetched !== allIds.length ? '  ⚠ MISMATCH' : ''}`);

  const seenRows: Array<[string, number | string]> = [...perWarehouseAny.keys()].sort().map((wh) => [
    `${wh}${whName.has(wh) ? ` "${whName.get(wh)}"` : ' (id not in BL warehouse list)'}`,
    `${perWarehousePos.get(wh) ?? 0} with stock>0 / ${perWarehouseAny.get(wh)} listed`,
  ]);
  printTable('Per warehouse (ids seen on products, names from getInventoryWarehouses)', seenRows.length ? seenRows : [['(no stock entries)', 0]]);
  console.log(`    products with stock 0 in every warehouse: ${s.zeroStockEverywhere}`);

  printTable('Per import tag', [
    ...IMPORT_TAGS.map((t): [string, number] => [t, s.perTag.get(t) ?? 0]),
    ['none of the import tags', s.noImportTag],
    ['no tags at all', s.noTagAtAll],
  ]);

  const deptRows: Array<[string, number | string]> = [...perDept.keys()].sort().map((d) => [
    d,
    `${perDept.get(d)} (approved: ${perDeptApproved.get(d) ?? 0})`,
  ]);
  printTable('Per Hydra department (via hydra-categories.json)', deptRows.length ? deptRows : [['(no products)', 0]]);
  console.log(`    category_id unset/0: ${s.categoryUnset}; category_id not in hydra-categories.json: ${s.categoryNotInHydraJson}`);

  printTable('HA-2.04 filter — category criterion only (stock/price not applied)', [
    ['inside P1 (would pass)', s.insideP1],
    ['  of which approved', s.insideP1Approved],
    ['outside P1 (would NOT pass)', s.outsideP1],
    ['  of which in departments 01/02', s.outsideP1Dept0102],
    ['    of which approved', s.outsideP1Dept0102Approved],
    ['  of which category unknown to Hydra tree', s.outsideP1Unknown],
    ['    of which approved', s.outsideP1UnknownApproved],
  ]);

  console.log(`\n  products outside P1 with tag \`approved\` (inventory ${inventoryId}): ${s.outsideP1Approved}`);
  console.log(`  products with tag \`approved\` (inventory ${inventoryId}, total): ${s.approved}`);
  return s;
}

async function main() {
  const isMock = process.env.BASELINKER_MOCK === 'true';
  const configuredId = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);

  console.log('\n=== bl-inventory-report (READ-ONLY) ===');
  console.log(`BASELINKER_INVENTORY_ID (env): ${configuredId}`);
  console.log(`BASELINKER_MOCK : ${isMock}`);
  console.log(`BL methods      : ${METHODS_CALLED.join(', ')}`);
  console.log(`Client allowlist: ${READ_ONLY_METHODS.join(', ')}`);
  console.log(`Filter nodes    : ${effectiveAllowedHydraNums(ASSORTMENT_RULES).length} P1 Hydra nodes (assortment-rules.ts, default new-subcategory priority ${ASSORTMENT_RULES.newSubcategoryDefaultPriority})`);
  console.log(`Warehouse env   : BASELINKER_WAREHOUSE_H1/H2/H3 ${['H1', 'H2', 'H3'].every((h) => process.env[`BASELINKER_WAREHOUSE_${h}`]) ? 'set' : 'partly/unset'} (NOT used for counts — sandbox-only ids); BASELINKER_WAREHOUSE_HYDRA ${process.env.BASELINKER_WAREHOUSE_HYDRA ? 'set' : 'NOT CONFIGURED — env var unset'}`);
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

  // ── Warehouses (account-wide) ────────────────────────────────────────────
  const warehouses = await getInventoryWarehouses();
  const whName = new Map<string, string>();
  for (const w of warehouses) whName.set(`${w.warehouse_type}_${w.warehouse_id}`, w.name);
  console.log(`\nWarehouses in BL account: ${warehouses.length}`);
  for (const [key, name] of whName) console.log(`  ${key}  "${name}"`);

  // ── Inventories visible to the token (id, name, product count) ──────────
  const inventories = await getInventories();
  console.log(`\nInventories visible to token: ${inventories.length}`);
  const idsByInventory = new Map<number, string[]>();
  for (const inv of inventories) {
    const ids = await listAllProductIds(inv.inventory_id);
    idsByInventory.set(inv.inventory_id, ids);
    console.log(`  ${String(inv.inventory_id).padEnd(8)} "${inv.name}"  products: ${ids.length}  warehouses: ${inv.warehouses?.join(', ') || '—'}`);
  }
  const configuredFound = inventories.some((i) => i.inventory_id === configuredId);
  console.log(
    configuredFound
      ? `\nConfigured inventory ${configuredId} IS among them.`
      : `\n⚠  Configured inventory ${configuredId} is NOT among the inventories visible to this token — reporting ALL of them instead (tj 2026-10-09).`,
  );

  // ── Per-inventory breakdown ──────────────────────────────────────────────
  const totals = emptyStats();
  for (const inv of inventories) {
    const s = await reportInventory(
      inv.inventory_id, inv.name, idsByInventory.get(inv.inventory_id) ?? [], whName, idToHydra, allowed,
    );
    for (const k of Object.keys(totals) as Array<keyof Stats>) {
      if (k === 'perTag') { for (const [t, n] of s.perTag) inc(totals.perTag, t, n); }
      else (totals[k] as number) += s[k] as number;
    }
  }

  // ── Totals across all inventories ────────────────────────────────────────
  console.log(`\n${'='.repeat(72)}`);
  console.log(`TOTALS across ${inventories.length} inventories`);
  console.log('='.repeat(72));
  console.log(`  products: ${totals.products} (details fetched: ${totals.fetched})`);
  console.log(`  per import tag: ${IMPORT_TAGS.map((t) => `${t}=${totals.perTag.get(t) ?? 0}`).join(', ')}; none=${totals.noImportTag}; no tags at all=${totals.noTagAtAll}`);
  console.log(`  inside P1: ${totals.insideP1} (approved: ${totals.insideP1Approved}); outside P1: ${totals.outsideP1} (01/02: ${totals.outsideP1Dept0102}, approved: ${totals.outsideP1Dept0102Approved}; category unknown: ${totals.outsideP1Unknown}, approved: ${totals.outsideP1UnknownApproved})`);
  console.log(`\nproducts outside P1 with tag \`approved\` (all inventories): ${totals.outsideP1Approved}`);
  console.log(`products with tag \`approved\` (all inventories): ${totals.approved}`);
  console.log('\nNothing was written to BaseLinker.\n');
}

main().catch((err) => {
  console.error('\n[fatal]', err instanceof Error ? err.message : err);
  process.exit(1);
});
