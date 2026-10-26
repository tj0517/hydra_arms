/**
 * What import and sync send to BaseLinker (extracted from scripts/xml-to-baselinker.ts in
 * HA-2.22 so the payloads can be tested against an in-memory catalogue).
 *
 *   toBLProduct    — addInventoryProduct payload of one product (import)
 *   readMarginRaws — „Marża %” field of matched products, read-only (sync, dry-run)
 *   planSync       — stock + price updates of one sync run
 *   runSyncCore    — the whole sync: index → margins → plan → bulk writes, BL calls injected
 *
 * The margin field is never part of any payload here: `text_fields` is built from the feed
 * (name, description, features) and nothing else (HA-2.22, the field belongs to the client).
 */

import type { NormalizedProduct } from './types';
import { addToMatchIndex, eanForUpsert, emptyMatchIndex, findBLMatch, type BLMatchIndex, type Supplier } from './bl-match-key';
import { chooseMargin, computeSellingPrice, readMarginRaw, type MarginChoice, type MarginTally } from './margin';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface WriteEnv {
  inventoryId: number;
  priceGroup: number;
  priceGroupPurchase: number | null;
  warehouse: string;
  /** the wholesaler's env markup (BASELINKER_MARKUP_*) */
  markupPct: number;
}

// ── Import payload ────────────────────────────────────────────────────────────

export function toBLProduct(
  p: NormalizedProduct,
  env: WriteEnv,
  categoryId: number,
  tags: string[],
  /** `ean`: eanForUpsert with the record's current EAN (import); omitted → the feed's EAN alone */
  identity: { sku: string; features: Record<string, string>; ean?: string },
  margin: MarginChoice,
): { product: Record<string, unknown>; price: number; priceFromFallback: boolean; priceZero: boolean } {
  const { price, fromFallback, priceZero } = computeSellingPrice(p, margin.pct);

  const prices: Record<string, number> = { [env.priceGroup]: price };
  if (env.priceGroupPurchase && p.price_purchase && p.price_purchase > 0) {
    prices[env.priceGroupPurchase] = round2(p.price_purchase);
  }

  const textFields: Record<string, unknown> = { name: p.name };
  if (p.description_html) textFields.description = p.description_html;
  // Merged with the record's existing parameters (recordIdentity) — BL replaces features wholesale
  textFields.features = identity.features;

  // BL expects image entries prefixed "url:" (or "data:" for base64), max 16
  const images = p.images.slice(0, 16).map((img) => `url:${img.url}`);

  const product: Record<string, unknown> = {
    parent_id: 0,
    sku: identity.sku,
    ean: identity.ean ?? eanForUpsert(p.ean),
    tax_rate: p.tax_rate ?? 23,
    weight: p.weight_g ? round2(p.weight_g / 1000) : 0, // BL stores kg
    category_id: categoryId,
    tags: [...new Set(tags)],
    text_fields: textFields,
    prices,
    stock: { [env.warehouse]: p.stock ?? 0 },
    ...(images.length ? { images } : {}),
  };

  return { product, price, priceFromFallback: fromFallback, priceZero };
}

// ── BL reads ──────────────────────────────────────────────────────────────────

export type GetProductsList = (inventoryId: number, page?: number) => Promise<Record<string, { ean: string; sku: string }>>;
export type GetProductsData = (inventoryId: number, ids: string[]) => Promise<Record<string, { text_fields?: unknown; prices?: unknown }>>;

/** EAN → id, prefixed SKU → id over the whole catalogue (pages of 1 000). */
export async function loadExistingProducts(
  getProductsList: GetProductsList,
  inventoryId: number,
  sleep: (ms: number) => Promise<unknown>,
  rateLimitMs: number,
): Promise<BLMatchIndex> {
  const index = emptyMatchIndex();
  for (let page = 1; ; page++) {
    const products = await getProductsList(inventoryId, page);
    const entries = Object.entries(products);
    for (const [id, p] of entries) addToMatchIndex(index, Number(id), p.ean, p.sku);
    if (entries.length < 1000) break;
    await sleep(rateLimitMs);
  }
  return index;
}

/** ids per getInventoryProductsData call when only the margin field is needed (as audit-import.ts) */
export const MARGIN_READ_CHUNK = 250;

export interface MarginRead {
  /** raw field value per returned product (undefined = field not set) */
  raw: Map<number, unknown>;
  /** current selling price per returned product, when the price group is known */
  salePrice: Map<number, number>;
  calls: number;
  ms: number;
}

/** Reads the margin field (and the current selling price) of `ids` — getInventoryProductsData only. */
export async function readMarginRaws(
  ids: readonly number[],
  getProductsData: GetProductsData,
  inventoryId: number,
  fieldKey: string,
  priceGroup: number | null,
  sleep: (ms: number) => Promise<unknown>,
  rateLimitMs: number,
): Promise<MarginRead> {
  const started = Date.now();
  const raw = new Map<number, unknown>();
  const salePrice = new Map<number, number>();
  let calls = 0;
  for (let i = 0; i < ids.length; i += MARGIN_READ_CHUNK) {
    if (i > 0) await sleep(rateLimitMs);
    const chunk = ids.slice(i, i + MARGIN_READ_CHUNK).map(String);
    const data = await getProductsData(inventoryId, chunk);
    calls++;
    for (const [id, d] of Object.entries(data)) {
      raw.set(Number(id), readMarginRaw(d.text_fields, fieldKey));
      const prices = d.prices && typeof d.prices === 'object' ? (d.prices as Record<string, unknown>) : {};
      const sale = priceGroup !== null ? Number(prices[String(priceGroup)]) : NaN;
      if (Number.isFinite(sale)) salePrice.set(Number(id), sale);
    }
  }
  return { raw, salePrice, calls, ms: Date.now() - started };
}

// ── Sync ──────────────────────────────────────────────────────────────────────

/**
 * Margins for one sync: `off` = no field configured (env markup for every product, as before
 * HA-2.22); `failed` = the read failed, so no selling price is written at all (writing env
 * prices would wipe manual margins); otherwise the raw values of the products BL returned.
 */
export type SyncMargins = { kind: 'off' } | { kind: 'failed' } | { kind: 'read'; raw: ReadonlyMap<number, unknown> };

export interface SyncPlan {
  stockUpdates: Record<string, Record<string, number>>;
  priceUpdates: Record<string, Record<string, number>>;
  matched: number;
  unmatched: number;
  priceFallbacks: number;
  priceZeros: number;
  /** matched, but no selling price written: margins failed, or BL returned no data for the product */
  priceSkipped: number;
}

export function planSync(
  products: readonly NormalizedProduct[],
  supplier: Supplier,
  index: BLMatchIndex,
  env: WriteEnv,
  margins: SyncMargins,
  tally: MarginTally,
): SyncPlan {
  const plan: SyncPlan = { stockUpdates: {}, priceUpdates: {}, matched: 0, unmatched: 0, priceFallbacks: 0, priceZeros: 0, priceSkipped: 0 };

  for (const p of products) {
    // Same key as the import: EAN across suppliers, else this supplier's prefixed SKU only
    const id = findBLMatch(index, supplier, p.ean, p.connector_sku)?.id;
    if (id === undefined) { plan.unmatched++; continue; }
    plan.matched++;

    plan.stockUpdates[id] = { [env.warehouse]: p.stock ?? 0 };

    const prices: Record<string, number> = {};
    if (env.priceGroupPurchase && p.price_purchase && p.price_purchase > 0) {
      prices[env.priceGroupPurchase] = round2(p.price_purchase);
    }

    let margin: MarginChoice | null;
    if (margins.kind === 'off') margin = chooseMargin(undefined, env.markupPct);
    else if (margins.kind === 'failed' || !margins.raw.has(id)) margin = null;
    else margin = chooseMargin(margins.raw.get(id), env.markupPct);

    if (margin === null) {
      plan.priceSkipped++;
    } else {
      const { price, fromFallback, priceZero } = computeSellingPrice(p, margin.pct);
      if (fromFallback) plan.priceFallbacks++;
      else tally.note(id, margin);
      if (priceZero) plan.priceZeros++;
      prices[env.priceGroup] = price;
    }
    if (Object.keys(prices).length) plan.priceUpdates[id] = prices;
  }
  return plan;
}

export interface SyncDeps {
  getProductsList: GetProductsList;
  /** read-only getInventoryProductsData (src/lib/baselinker/readonly.ts) */
  getProductsData: GetProductsData;
  updateStock: (inventoryId: number, products: Record<string, Record<string, number>>) => Promise<{ counter: number; warnings: Record<string, unknown> }>;
  updatePrices: (inventoryId: number, products: Record<string, Record<string, number>>) => Promise<{ counter: number; warnings: Record<string, unknown> }>;
  sleep: (ms: number) => Promise<unknown>;
  rateLimitMs: number;
  /** text_fields key of „Marża %”, or null when BASELINKER_EXTRA_FIELD_MARGIN is unset */
  marginKey: string | null;
  log: (line: string) => void;
  warn: (line: string) => void;
  tally: MarginTally;
}

/** One sync run. Returns false when the run must end with a non-zero exit (margin read failed). */
export async function runSyncCore(
  products: readonly NormalizedProduct[],
  supplier: Supplier,
  env: WriteEnv,
  deps: SyncDeps,
): Promise<{ ok: boolean; plan: SyncPlan }> {
  const { log, warn } = deps;
  log('\nLoading existing BL products (match index)…');
  const index = await loadExistingProducts(deps.getProductsList, env.inventoryId, deps.sleep, deps.rateLimitMs);
  log(`  ${index.total} products in BL`);

  let margins: SyncMargins = { kind: 'off' };
  let ok = true;
  if (deps.marginKey === null) {
    warn('[warn] BASELINKER_EXTRA_FIELD_MARGIN not set — manual margins are NOT read, env markup for every product');
  } else {
    const ids = [...new Set(
      products.map((p) => findBLMatch(index, supplier, p.ean, p.connector_sku)?.id).filter((id): id is number => id !== undefined),
    )];
    log(`\nReading the margin field (${deps.marginKey}) of ${ids.length} matched products…`);
    try {
      await deps.sleep(deps.rateLimitMs);
      const read = await readMarginRaws(ids, deps.getProductsData, env.inventoryId, deps.marginKey, null, deps.sleep, deps.rateLimitMs);
      margins = { kind: 'read', raw: read.raw };
      log(`  margin field read: ${read.raw.size}/${ids.length} products, ${read.calls} calls, ${(read.ms / 1000).toFixed(1)} s`);
    } catch (err) {
      margins = { kind: 'failed' };
      ok = false;
      warn(`[error] margin field read failed: ${err instanceof Error ? err.message : err} — stock is synced, selling prices are NOT (env prices would wipe manual margins)`);
    }
  }

  const plan = planSync(products, supplier, index, env, margins, deps.tally);
  log(`\nMatched ${plan.matched} products, ${plan.unmatched} not in BL yet (run 'import' mode to add them)`);
  if (plan.matched === 0) return { ok, plan };

  // BL bulk endpoints take max 1000 products per call
  const ids = Object.keys(plan.stockUpdates);
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = ids.slice(i, i + 1000);

    const stockChunk = Object.fromEntries(chunk.map((id) => [id, plan.stockUpdates[id]]));
    const stockRes = await deps.updateStock(env.inventoryId, stockChunk);
    log(`  stock  ${i + chunk.length}/${ids.length}: ${stockRes.counter} updated` +
      (Object.keys(stockRes.warnings).length ? `, ${Object.keys(stockRes.warnings).length} warnings` : ''));
    await deps.sleep(deps.rateLimitMs);

    const priceChunk = Object.fromEntries(chunk.filter((id) => plan.priceUpdates[id]).map((id) => [id, plan.priceUpdates[id]]));
    if (Object.keys(priceChunk).length === 0) continue;
    const priceRes = await deps.updatePrices(env.inventoryId, priceChunk);
    log(`  prices ${i + chunk.length}/${ids.length}: ${priceRes.counter} updated` +
      (Object.keys(priceRes.warnings).length ? `, ${Object.keys(priceRes.warnings).length} warnings` : ''));
    await deps.sleep(deps.rateLimitMs);
  }

  log(`\n✓ Sync done: ${plan.matched} products refreshed`);
  if (deps.marginKey !== null) log(`  ${deps.tally.summary()}`);
  if (plan.priceSkipped > 0) {
    warn(`⚠ ${plan.priceSkipped} products: selling price NOT written (${margins.kind === 'failed' ? 'margin field read failed' : 'BL returned no data for them'}) — previous price kept`);
  }
  if (plan.priceFallbacks > 0) {
    warn(`⚠ ${plan.priceFallbacks} products had no purchase price in the feed — feed gross price used instead of markup pricing`);
  }
  if (plan.priceZeros > 0) {
    warn(`⚠ ${plan.priceZeros} products synced with price 0 — the feed has no price data for these`);
  }
  return { ok, plan };
}
