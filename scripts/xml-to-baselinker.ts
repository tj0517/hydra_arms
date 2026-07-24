/**
 * XML feed → BaseLinker import (BL is the source of truth for products).
 *
 * Flow: feed XML → xml-integration/connectors (NormalizedProduct[]) → BaseLinker API.
 * Products land in the BL catalogue (BASELINKER_INVENTORY_ID); the existing
 * scripts/baselinker-sync.ts then replicates BL → Supabase for the frontend.
 * NOTE: this script never writes to Supabase — do NOT use xml-integration/engine.ts
 * for this path.
 *
 * Usage:
 *   npx tsx scripts/xml-to-baselinker.ts <kolba|sharg|spechurt> [import|sync]
 *
 *   import  (default) — full upsert: creates missing products, updates existing
 *                       (addInventoryProduct, 1 call/product — run rarely, e.g. weekly cron)
 *   sync              — stock + price refresh only for products already in BL
 *                       (updateInventoryProductsStock/Prices, batched — run often)
 *
 * Key behaviours:
 *   - Upsert key: EAN first, fallback SKU — no duplicates across runs
 *   - Stock goes to a per-supplier warehouse: kolba → BASELINKER_WAREHOUSE_H1,
 *     sharg → _H2, spechurt → _H3
 *   - Selling price = price_purchase * (1 + markup%), markup from env per supplier
 *     (BASELINKER_MARKUP_KOLBA / _SHARG / _SPECHURT); purchase price is written
 *     to the BASELINKER_PRICE_GROUP_PURCHASE price group
 *   - Sharg: the connector itself filters to defence categories (SHARG_DEFENCE_PATTERNS)
 *   - Rate limit: BL free plan ~100 req/min — 700 ms sleep between calls;
 *     on ERROR_BLOCKED_TOKEN blCall waits out the block and retries
 *
 * Categories & review tags (no auto-created supplier categories):
 *   - The BL category tree is built once by scripts/bl-build-categories.ts
 *     → xml-integration/hydra-categories.json ({ "3.4.3": <bl_category_id> })
 *   - Supplier category / brand / attribute → Hydra number via
 *     xml-integration/category-map.json (admin-maintained dictionary)
 *   - Dictionary hit on a LEAF        → that category  + tag `auto`
 *   - Hit on a PARENT / unsure rule   → that category  + tag `review`
 *   - No match                        → "00. DO PRZYPISANIA" + tag `flag`
 *   - Branch 15 (gaz/pałki/paralizatory) additionally gets tag `age_18`
 *   - Products are NOT auto-published: the frontend (baselinker-sync → Supabase)
 *     only shows products tagged `approved` — admin flips auto/review/flag →
 *     approved in BL (bulk, filtering by tag/warehouse/category). Re-imports
 *     preserve `approved` and any other admin tags.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import type { NormalizedProduct } from '../xml-integration/types';

const CONNECTOR_NAMES = ['kolba', 'sharg', 'spechurt'] as const;
type ConnectorName = (typeof CONNECTOR_NAMES)[number];

// Per-supplier warehouse + markup — each wholesaler gets its own BL warehouse
const WAREHOUSE_ENV: Record<ConnectorName, string> = {
  kolba: 'BASELINKER_WAREHOUSE_H1',
  sharg: 'BASELINKER_WAREHOUSE_H2',
  spechurt: 'BASELINKER_WAREHOUSE_H3',
};
const MARKUP_ENV: Record<ConnectorName, string> = {
  kolba: 'BASELINKER_MARKUP_KOLBA',
  sharg: 'BASELINKER_MARKUP_SHARG',
  spechurt: 'BASELINKER_MARKUP_SPECHURT',
};

// BaseLinker free plan rate limit: ~100 req/min → keep under ~85 req/min.
// blCall additionally catches ERROR_BLOCKED_TOKEN and waits out the block.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RATE_LIMIT_MS = 700;

const round2 = (n: number) => Math.round(n * 100) / 100;

interface Env {
  inventoryId: number;
  priceGroup: number;
  priceGroupPurchase: number | null;
  warehouse: string;
  markupPct: number;
}

function loadEnv(connectorName: ConnectorName): Env {
  const inventoryId = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);
  const priceGroup = parseInt(process.env.BASELINKER_PRICE_GROUP ?? '23934', 10);

  const purchaseRaw = process.env.BASELINKER_PRICE_GROUP_PURCHASE;
  const priceGroupPurchase = purchaseRaw ? parseInt(purchaseRaw, 10) : null;
  if (!priceGroupPurchase) {
    console.warn('[warn] BASELINKER_PRICE_GROUP_PURCHASE not set — purchase prices will NOT be written to BL');
  }

  const warehouse = process.env[WAREHOUSE_ENV[connectorName]];
  if (!warehouse) {
    console.error(`[error] ${WAREHOUSE_ENV[connectorName]} must be set — each supplier writes stock to its own BL warehouse`);
    process.exit(1);
  }
  // Must be a regular BL warehouse ("bl_<id>") — BL rejects stock writes to
  // external/connect warehouses (e.g. "blconnect_…", "shop_…")
  if (!/^bl_\d+$/.test(warehouse)) {
    console.error(`[error] ${WAREHOUSE_ENV[connectorName]}="${warehouse}" is not a regular BL warehouse (expected format: bl_<id>)`);
    console.error('        External/connect warehouses reject stock updates. Use Produkty → Ustawienia → Magazyny.');
    process.exit(1);
  }

  const markupRaw = process.env[MARKUP_ENV[connectorName]];
  const markupPct = markupRaw ? parseFloat(markupRaw) : NaN;
  if (isNaN(markupPct)) {
    console.error(`[error] ${MARKUP_ENV[connectorName]} must be set (percent, e.g. 25 = purchase price + 25%)`);
    console.error('        Selling price is computed from the purchase price — never taken from the feed.');
    process.exit(1);
  }

  return { inventoryId, priceGroup, priceGroupPurchase, warehouse, markupPct };
}

// ── Pricing ───────────────────────────────────────────────────────────────────
// Selling price = purchase price + markup. Feed retail price is ignored.
// If the feed has no purchase price, fall back to feed gross price and warn.

function computeSellingPrice(p: NormalizedProduct, markupPct: number): { price: number; fromFallback: boolean } {
  if (p.price_purchase && p.price_purchase > 0) {
    return { price: round2(p.price_purchase * (1 + markupPct / 100)), fromFallback: false };
  }
  return { price: p.price_gross, fromFallback: true };
}

// ── Existing BL products: EAN → id, SKU → id (upsert key, no duplicates) ──────

interface BLIndex {
  byEan: Map<string, number>;
  bySku: Map<string, number>;
  total: number;
}

async function loadExistingProducts(
  getProductsList: (inventoryId: number, page?: number) => Promise<Record<string, { ean: string; sku: string }>>,
  inventoryId: number,
): Promise<BLIndex> {
  const byEan = new Map<string, number>();
  const bySku = new Map<string, number>();
  let total = 0;

  for (let page = 1; ; page++) {
    const products = await getProductsList(inventoryId, page);
    const entries = Object.entries(products);
    for (const [id, p] of entries) {
      const numId = Number(id);
      const ean = String(p.ean ?? '').trim();
      const sku = String(p.sku ?? '').trim();
      if (ean && !byEan.has(ean)) byEan.set(ean, numId);
      if (sku && !bySku.has(sku)) bySku.set(sku, numId);
      total++;
    }
    if (entries.length < 1000) break;
    await sleep(RATE_LIMIT_MS);
  }

  return { byEan, bySku, total };
}

function findExistingId(p: NormalizedProduct, index: BLIndex): number | undefined {
  const ean = (p.ean ?? '').trim();
  if (ean && index.byEan.has(ean)) return index.byEan.get(ean);
  const sku = (p.connector_sku ?? '').trim();
  if (sku && index.bySku.has(sku)) return index.bySku.get(sku);
  return undefined;
}

// ── Categories: dictionary lookup → Hydra tree number → BL category_id ───────
// No supplier categories are ever auto-created in BL. Mapping is admin-owned:
//   xml-integration/hydra-categories.json — built by scripts/bl-build-categories.ts
//   xml-integration/category-map.json     — supplier category/brand/rule → Hydra number

const HYDRA_CATEGORIES_PATH = path.resolve(process.cwd(), 'xml-integration/hydra-categories.json');
const CATEGORY_MAP_PATH = path.resolve(process.cwd(), 'xml-integration/category-map.json');

const UNASSIGNED_NUM = '00'; // "00. DO PRZYPISANIA"
const AGE_18_BRANCH = '15';  // gaz / pałki / paralizatory → tag age_18

// Import-status tags owned by this script; everything else (incl. `approved`)
// belongs to the admin and is preserved on re-import.
type StatusTag = 'auto' | 'review' | 'flag';
const IMPORT_OWNED_TAGS = new Set<string>(['auto', 'review', 'flag', 'age_18']);

interface CategoryRule {
  match: { attr?: string; value?: string; name?: string };
  cat: string;
  review?: boolean; // force `review` even when cat is a leaf (unsure rule)
}

interface CategoryMapFile {
  spechurt?: Record<string, string>;
  sharg?: Record<string, string>;
  kolba_brands?: Record<string, string>;
  kolba_rules?: CategoryRule[];
}

// Tree numbers appear with and without leading zero ("03" vs children "3.1")
const normNum = (n: string) => n.trim().replace(/^0+(?=\d)/, '');

class HydraTree {
  private byNum = new Map<string, number>();

  constructor(raw: Record<string, number>) {
    for (const [num, id] of Object.entries(raw)) this.byNum.set(normNum(num), id);
  }

  resolve(num: string): number | undefined {
    return this.byNum.get(normNum(num));
  }

  isLeaf(num: string): boolean {
    const prefix = `${normNum(num)}.`;
    for (const key of this.byNum.keys()) {
      if (key.startsWith(prefix)) return false;
    }
    return true;
  }

  isAge18Branch(num: string): boolean {
    const n = normNum(num);
    return n === AGE_18_BRANCH || n.startsWith(`${AGE_18_BRANCH}.`);
  }

  get unassignedId(): number {
    const id = this.resolve(UNASSIGNED_NUM);
    if (id === undefined) {
      throw new Error('Category "00. DO PRZYPISANIA" missing from hydra-categories.json — re-run scripts/bl-build-categories.ts');
    }
    return id;
  }
}

function loadJson<T>(file: string, hint: string): T {
  if (!fs.existsSync(file)) {
    console.error(`[error] ${path.relative(process.cwd(), file)} not found — ${hint}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function ruleMatches(rule: CategoryRule, p: NormalizedProduct): boolean {
  const { attr, value, name } = rule.match;
  if (!attr && !name) return false; // empty rule never matches

  if (attr) {
    const attrValue = p.features[attr];
    if (attrValue === undefined) return false;
    if (value && !attrValue.toLowerCase().includes(value.toLowerCase())) return false;
  }
  if (name && !p.name.toLowerCase().includes(name.toLowerCase())) return false;
  return true;
}

interface ResolvedCategory {
  categoryId: number;
  status: StatusTag;
  hydraNum: string | null;
}

function resolveCategory(
  p: NormalizedProduct,
  map: CategoryMapFile,
  tree: HydraTree,
  unknownNums: Set<string>,
): ResolvedCategory {
  let hydraNum: string | null = null;
  let forcedReview = false;

  if (p.connector === 'kolba') {
    // Rules first (can target deep leaves), brand fallback (usually branch-level)
    const rule = (map.kolba_rules ?? []).find((r) => ruleMatches(r, p));
    if (rule) {
      hydraNum = rule.cat;
      forcedReview = rule.review === true;
    } else if (p.brand && map.kolba_brands?.[p.brand]) {
      hydraNum = map.kolba_brands[p.brand];
    }
  } else {
    const dict = (map[p.connector as 'sharg' | 'spechurt'] ?? {}) as Record<string, string>;
    if (p.supplier_category_name && dict[p.supplier_category_name]) {
      hydraNum = dict[p.supplier_category_name];
    }
  }

  if (!hydraNum) {
    return { categoryId: tree.unassignedId, status: 'flag', hydraNum: null };
  }

  const categoryId = tree.resolve(hydraNum);
  if (categoryId === undefined) {
    // Dictionary points at a number that isn't in the tree — treat as unmapped
    unknownNums.add(hydraNum);
    return { categoryId: tree.unassignedId, status: 'flag', hydraNum: null };
  }

  const status: StatusTag = forcedReview || !tree.isLeaf(hydraNum) ? 'review' : 'auto';
  return { categoryId, status, hydraNum };
}

function computeTags(resolved: ResolvedCategory, tree: HydraTree): string[] {
  const tags: string[] = [resolved.status];
  if (resolved.hydraNum && tree.isAge18Branch(resolved.hydraNum)) tags.push('age_18');
  return tags;
}

// ── Payload: NormalizedProduct → BL addInventoryProduct product object ────────

function toBLProduct(
  p: NormalizedProduct,
  env: Env,
  categoryId: number,
  tags: string[],
): { product: Record<string, unknown>; priceFromFallback: boolean } {
  const { price, fromFallback } = computeSellingPrice(p, env.markupPct);

  const prices: Record<string, number> = { [env.priceGroup]: price };
  if (env.priceGroupPurchase && p.price_purchase && p.price_purchase > 0) {
    prices[env.priceGroupPurchase] = round2(p.price_purchase);
  }

  const textFields: Record<string, unknown> = { name: p.name };
  if (p.description_html) textFields.description = p.description_html;
  if (Object.keys(p.features).length > 0) textFields.features = p.features;

  // BL expects image entries prefixed "url:" (or "data:" for base64), max 16
  const images = p.images.slice(0, 16).map((img) => `url:${img.url}`);

  const product: Record<string, unknown> = {
    parent_id: 0,
    sku: p.connector_sku ?? '',
    ean: p.ean ?? '',
    tax_rate: p.tax_rate ?? 23,
    weight: p.weight_g ? round2(p.weight_g / 1000) : 0, // BL stores kg
    category_id: categoryId,
    tags: [...new Set(tags)],
    text_fields: textFields,
    prices,
    stock: { [env.warehouse]: p.stock ?? 0 },
    ...(images.length ? { images } : {}),
  };

  return { product, priceFromFallback: fromFallback };
}

// ── Fetch + parse feed via connector ──────────────────────────────────────────

async function fetchAndParse(connectorName: ConnectorName): Promise<NormalizedProduct[]> {
  // Dynamic import: connector configs build feed URLs from env at module load,
  // so dotenv must run first
  const { connectors } = await import('../xml-integration/connectors');
  const connector = connectors[connectorName];

  const url = connector.config.xml_url;
  console.log(`\nFetching feed: ${url.slice(0, 80)}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Feed fetch failed: HTTP ${res.status} ${res.statusText}`);
  const xml = await res.text();
  console.log(`Received ${(xml.length / 1024 / 1024).toFixed(1)} MB`);

  const products = connector.parse(xml);
  console.log(`Parsed ${products.length} products`);
  return products;
}

// ── Mode: import — full upsert via addInventoryProduct ────────────────────────

async function runImport(connectorName: ConnectorName, env: Env): Promise<void> {
  const bl = await import('../src/lib/baselinker/client');

  const tree = new HydraTree(loadJson<Record<string, number>>(
    HYDRA_CATEGORIES_PATH,
    'run `npx tsx scripts/bl-build-categories.ts` first to build the Hydra tree in BL',
  ));
  // Also fails fast if "00. DO PRZYPISANIA" is missing from the tree
  console.log(`Hydra tree loaded, fallback "00. DO PRZYPISANIA" → BL ${tree.unassignedId}`);
  const categoryMap = loadJson<CategoryMapFile>(
    CATEGORY_MAP_PATH,
    'create the supplier→Hydra category dictionary (see xml-integration/category-map.json)',
  );

  const products = await fetchAndParse(connectorName);
  if (products.length === 0) { console.log('Nothing to import.'); return; }

  console.log('\nLoading existing BL products (dedup index)…');
  const index = await loadExistingProducts(bl.getProductsList, env.inventoryId);
  console.log(`  ${index.total} products in BL (${index.byEan.size} with EAN)`);

  // Resolve categories + status tags from the dictionary (no BL categories created here)
  const unknownNums = new Set<string>();
  const resolved = new Map<NormalizedProduct, ResolvedCategory>();
  const statusCounts: Record<StatusTag, number> = { auto: 0, review: 0, flag: 0 };
  for (const p of products) {
    const r = resolveCategory(p, categoryMap, tree, unknownNums);
    resolved.set(p, r);
    statusCounts[r.status]++;
  }
  console.log(`\nCategory resolution: ${statusCounts.auto} auto (leaf), ${statusCounts.review} review (parent/unsure), ${statusCounts.flag} flag (→ 00. DO PRZYPISANIA)`);
  if (unknownNums.size > 0) {
    console.warn(`  ⚠ category-map.json points at numbers missing from hydra-categories.json: ${[...unknownNums].join(', ')}`);
  }

  // Fetch current tags of products we are about to update, so re-imports
  // preserve `approved` and other admin tags (only auto/review/flag/age_18 are ours)
  const matchedIds = [...new Set(
    products.map((p) => findExistingId(p, index)).filter((id): id is number => id !== undefined),
  )];
  const existingTags = new Map<number, string[]>();
  if (matchedIds.length > 0) {
    console.log(`\nFetching tags of ${matchedIds.length} existing products (to preserve admin tags)…`);
    for (let i = 0; i < matchedIds.length; i += 100) {
      const chunk = matchedIds.slice(i, i + 100).map(String);
      const details = await bl.getProductsData(env.inventoryId, chunk);
      for (const [id, d] of Object.entries(details)) {
        existingTags.set(Number(id), (d as { tags?: string[] }).tags ?? []);
      }
      await sleep(RATE_LIMIT_MS);
    }
  }

  let created = 0, updated = 0, errors = 0, priceFallbacks = 0;

  console.log(`\nUpserting ${products.length} products (~${Math.ceil(products.length * RATE_LIMIT_MS / 60000)} min)…`);
  for (const p of products) {
    const r = resolved.get(p)!;
    const existingId = findExistingId(p, index);

    let tags = computeTags(r, tree);
    if (existingId !== undefined) {
      const adminTags = (existingTags.get(existingId) ?? []).filter((t) => !IMPORT_OWNED_TAGS.has(t));
      tags = [...adminTags, ...tags];
    }

    const { product, priceFromFallback } = toBLProduct(p, env, r.categoryId, tags);
    if (priceFromFallback) priceFallbacks++;

    try {
      const productId = await bl.addInventoryProduct(env.inventoryId, product, existingId);
      if (existingId) {
        updated++;
      } else {
        created++;
        // Register the new product so intra-feed duplicates update instead of re-creating
        if (p.ean) index.byEan.set(p.ean.trim(), productId);
        if (p.connector_sku) index.bySku.set(p.connector_sku.trim(), productId);
      }
      process.stdout.write(existingId ? '.' : '+');
    } catch (err) {
      errors++;
      console.warn(`\n  ⚠ ${p.connector_sku} (${p.name.slice(0, 50)}): ${err instanceof Error ? err.message : err}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n\n✓ Import done: ${created} created, ${updated} updated, ${errors} errors`);
  console.log(`  tags: ${statusCounts.auto} auto / ${statusCounts.review} review / ${statusCounts.flag} flag`);
  if (priceFallbacks > 0) {
    console.warn(`⚠ ${priceFallbacks} products had no purchase price in the feed — feed gross price used instead of markup pricing`);
  }
  console.log('\nNothing is auto-published. Next steps:');
  console.log('  1. In BL, review products by tag (flag → assign category, review → confirm) and bulk-tag them `approved`');
  console.log('  2. npx tsx scripts/baselinker-sync.ts — replicates BL → Supabase; only `approved` products go live\n');
}

// ── Mode: sync — bulk stock + price refresh for products already in BL ────────

async function runSync(connectorName: ConnectorName, env: Env): Promise<void> {
  const bl = await import('../src/lib/baselinker/client');
  const products = await fetchAndParse(connectorName);
  if (products.length === 0) { console.log('Nothing to sync.'); return; }

  console.log('\nLoading existing BL products (match index)…');
  const index = await loadExistingProducts(bl.getProductsList, env.inventoryId);
  console.log(`  ${index.total} products in BL`);

  const stockUpdates: Record<string, Record<string, number>> = {};
  const priceUpdates: Record<string, Record<string, number>> = {};
  let matched = 0, unmatched = 0, priceFallbacks = 0;

  for (const p of products) {
    const id = findExistingId(p, index);
    if (!id) { unmatched++; continue; }
    matched++;

    stockUpdates[id] = { [env.warehouse]: p.stock ?? 0 };

    const { price, fromFallback } = computeSellingPrice(p, env.markupPct);
    if (fromFallback) priceFallbacks++;
    priceUpdates[id] = { [env.priceGroup]: price };
    if (env.priceGroupPurchase && p.price_purchase && p.price_purchase > 0) {
      priceUpdates[id][env.priceGroupPurchase] = round2(p.price_purchase);
    }
  }

  console.log(`\nMatched ${matched} products, ${unmatched} not in BL yet (run 'import' mode to add them)`);
  if (matched === 0) return;

  // BL bulk endpoints take max 1000 products per call
  const ids = Object.keys(stockUpdates);
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = ids.slice(i, i + 1000);

    const stockChunk = Object.fromEntries(chunk.map((id) => [id, stockUpdates[id]]));
    const stockRes = await bl.updateInventoryProductsStock(env.inventoryId, stockChunk);
    console.log(`  stock  ${i + chunk.length}/${ids.length}: ${stockRes.counter} updated` +
      (Object.keys(stockRes.warnings).length ? `, ${Object.keys(stockRes.warnings).length} warnings` : ''));
    await sleep(RATE_LIMIT_MS);

    const priceChunk = Object.fromEntries(chunk.map((id) => [id, priceUpdates[id]]));
    const priceRes = await bl.updateInventoryProductsPrices(env.inventoryId, priceChunk);
    console.log(`  prices ${i + chunk.length}/${ids.length}: ${priceRes.counter} updated` +
      (Object.keys(priceRes.warnings).length ? `, ${Object.keys(priceRes.warnings).length} warnings` : ''));
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n✓ Sync done: ${matched} products refreshed`);
  if (priceFallbacks > 0) {
    console.warn(`⚠ ${priceFallbacks} products had no purchase price in the feed — feed gross price used instead of markup pricing`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const connectorName = process.argv[2] as ConnectorName | undefined;
  const mode = process.argv[3] ?? 'import';

  if (!connectorName || !CONNECTOR_NAMES.includes(connectorName) || !['import', 'sync'].includes(mode)) {
    console.error('Usage: npx tsx scripts/xml-to-baselinker.ts <kolba|sharg|spechurt> [import|sync]');
    console.error('  import (default) — full upsert into BL catalogue (slow, run rarely)');
    console.error('  sync             — stock + price refresh only (batched, run often)');
    process.exit(1);
  }

  if (!process.env.BASELINKER_TOKEN) {
    console.error('[error] BASELINKER_TOKEN must be set');
    process.exit(1);
  }

  const env = loadEnv(connectorName);

  console.log(`\nXML → BaseLinker (${mode})`);
  console.log(`  connector : ${connectorName}`);
  console.log(`  inventory : ${env.inventoryId}`);
  console.log(`  warehouse : ${env.warehouse} (${WAREHOUSE_ENV[connectorName]})`);
  console.log(`  price grp : ${env.priceGroup} (sale) / ${env.priceGroupPurchase ?? '—'} (purchase)`);
  console.log(`  markup    : +${env.markupPct}% on purchase price`);

  if (mode === 'import') await runImport(connectorName, env);
  else await runSync(connectorName, env);
}

main().catch((err) => {
  console.error('\n[fatal]', err instanceof Error ? err.message : err);
  process.exit(1);
});
