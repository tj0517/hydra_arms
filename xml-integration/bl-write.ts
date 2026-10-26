/**
 * What import and sync send to BaseLinker (extracted from scripts/xml-to-baselinker.ts in
 * HA-2.22 so the payloads can be tested against an in-memory catalogue).
 *
 *   toBLProduct    — addInventoryProduct payload of one product (import)
 *   readMarginRaws — „Marża %” field and supplier membership of matched products, read-only (sync, dry-run)
 *   planSync       — stock + price updates of one sync run; prices only on records the supplier is a member of
 *   runSyncCore    — the whole sync: index → margins → plan → bulk writes → zeroing, BL calls injected
 *   feedGuard / planZeroing — stock 0 for withdrawn products (HA-2.38), also the read-only preview
 *
 * The margin field is never part of any payload here: `text_fields` is built from the feed
 * (name, description, features) and nothing else (HA-2.22, the field belongs to the client).
 */

import type { NormalizedProduct } from './types';
import { addToMatchIndex, eanForUpsert, emptyMatchIndex, findBLMatch, type BLMatchIndex, type Supplier } from './bl-match-key';
import { chooseMargin, computeSellingPrice, readMarginRaw, type MarginChoice, type MarginTally } from './margin';
import { recordSuppliers } from './import-audit';

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

/**
 * BL weight in kg from the feed's grams, to the gram (HA-2.38: round2 zeroed everything < 5 g) and
 * never 0 for a positive weight. No weight in the feed → the record's current weight, so a supplier
 * without weight data does not wipe what another one wrote; 0 only for a new record.
 */
export function weightKg(weightG: number | null | undefined, existingKg?: number | null): number {
  if (weightG && weightG > 0) return Math.max(Math.round(weightG) / 1000, 0.001);
  return existingKg && existingKg > 0 ? existingKg : 0;
}

export function toBLProduct(
  p: NormalizedProduct,
  env: WriteEnv,
  categoryId: number,
  tags: string[],
  /** `ean`: eanForUpsert with the record's current EAN, `weight`: the record's current weight (import) */
  identity: { sku: string; features: Record<string, string>; ean?: string; weight?: number },
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
    weight: weightKg(p.weight_g, identity.weight), // BL stores kg
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

export type GetProductsList = (inventoryId: number, page?: number) => Promise<Record<string, { ean: string; sku: string; stock?: Record<string, number> }>>;
export type GetProductsData = (inventoryId: number, ids: string[]) => Promise<Record<string, { text_fields?: unknown; prices?: unknown; sku?: unknown; tags?: unknown }>>;

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

/** The match index plus each listed product's per-warehouse stock — one read of the list (sync, zero preview). */
export async function loadIndexWithStock(
  getProductsList: GetProductsList,
  inventoryId: number,
  sleep: (ms: number) => Promise<unknown>,
  rateLimitMs: number,
): Promise<{ index: BLMatchIndex; listed: ListedProduct[] }> {
  const listed: ListedProduct[] = [];
  const index = await loadExistingProducts(async (inv, page) => {
    const res = await getProductsList(inv, page);
    for (const [id, p] of Object.entries(res)) listed.push({ id: Number(id), sku: String(p.sku ?? ''), stock: p.stock && typeof p.stock === 'object' ? p.stock : {} });
    return res;
  }, inventoryId, sleep, rateLimitMs);
  return { index, listed };
}

/** ids per getInventoryProductsData call when only the margin field is needed (as audit-import.ts) */
export const MARGIN_READ_CHUNK = 250;

export interface MarginRead {
  /** raw field value per returned product (undefined = field not set); empty when no field key */
  raw: Map<number, unknown>;
  /** current selling price per returned product, when the price group is known */
  salePrice: Map<number, number>;
  /** suppliers each returned product belongs to — SKU prefix + `SKU <Hurtownia>` parameters (HA-2.38) */
  members: Map<number, Supplier[]>;
  calls: number;
  ms: number;
}

/** `text_fields.features` as a plain string map (an empty one may come back as `[]`). */
function featuresOf(textFields: unknown): Record<string, string> {
  const tf = textFields && typeof textFields === 'object' ? (textFields as Record<string, unknown>) : {};
  const f = tf.features;
  if (!f || typeof f !== 'object' || Array.isArray(f)) return {};
  return Object.fromEntries(Object.entries(f as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]));
}

/**
 * Reads the margin field (when `fieldKey` is set), the current selling price and the supplier
 * membership of `ids` — getInventoryProductsData only. `skuOf` supplies the list's SKU when the
 * data leaves it out.
 */
export async function readMarginRaws(
  ids: readonly number[],
  getProductsData: GetProductsData,
  inventoryId: number,
  fieldKey: string | null,
  priceGroup: number | null,
  sleep: (ms: number) => Promise<unknown>,
  rateLimitMs: number,
  skuOf: (id: number) => string | undefined = () => undefined,
): Promise<MarginRead> {
  const started = Date.now();
  const raw = new Map<number, unknown>();
  const salePrice = new Map<number, number>();
  const members = new Map<number, Supplier[]>();
  let calls = 0;
  for (let i = 0; i < ids.length; i += MARGIN_READ_CHUNK) {
    if (i > 0) await sleep(rateLimitMs);
    const chunk = ids.slice(i, i + MARGIN_READ_CHUNK).map(String);
    const data = await getProductsData(inventoryId, chunk);
    calls++;
    for (const [id, d] of Object.entries(data)) {
      if (fieldKey !== null) raw.set(Number(id), readMarginRaw(d.text_fields, fieldKey));
      members.set(Number(id), recordSuppliers(String(d.sku ?? skuOf(Number(id)) ?? ''), featuresOf(d.text_fields)).members);
      const prices = d.prices && typeof d.prices === 'object' ? (d.prices as Record<string, unknown>) : {};
      const sale = priceGroup !== null ? Number(prices[String(priceGroup)]) : NaN;
      if (Number.isFinite(sale)) salePrice.set(Number(id), sale);
    }
  }
  return { raw, salePrice, members, calls, ms: Date.now() - started };
}

// ── Withdrawn products: stock 0 in the supplier's warehouse (HA-2.38) ──────────

/** Below this share of the previous successful run's product count the feed is taken as incomplete. */
export const FEED_MIN_RATIO = 0.9;

export type FeedGuard =
  | { kind: 'first' }
  | { kind: 'ok'; previous: number }
  | { kind: 'incomplete'; previous: number };

/** Products in today's feed vs the previous successful run of this supplier. */
export function feedGuard(current: number, previous: number | null): FeedGuard {
  if (previous === null || previous <= 0) return { kind: 'first' };
  return current < previous * FEED_MIN_RATIO ? { kind: 'incomplete', previous } : { kind: 'ok', previous };
}

/** Product count of the last successful sync per supplier — a JSON file on the import account. */
export interface FeedCountStore {
  read(supplier: Supplier): number | null;
  write(supplier: Supplier, count: number): void;
}

export interface ListedProduct {
  id: number;
  sku: string;
  stock: Record<string, number>;
}

export interface ZeroRow {
  id: number;
  sku: string;
  /** this supplier's bare code on the record (prefix SKU or `SKU <Hurtownia>` parameter) */
  code: string;
  stock: number;
  approved: boolean;
  name: string;
  /** code missing from today's feed, or the code's feed item now matches another record (D-D) */
  reason: 'code_missing' | 'matched_elsewhere';
  /** matched_elsewhere: the record that feed item matches now */
  movedTo?: number;
}

/**
 * Records to set to stock 0 in `env.warehouse`: they carry this supplier's code, no feed product
 * matches them, and either the code is not in today's feed (the audit's „osierocone”, HA-2.37) or
 * the feed item with that code now matches a different record — moved there by the EAN key (D-D,
 * tj 2026-10-26). Only records with stock > 0 there are candidates; their data is read to confirm
 * the code — a record BaseLinker returns no data for is left alone. Merging such records is a
 * separate decision; this only stops the stock of this warehouse showing on two records.
 */
export async function planZeroing(
  products: readonly NormalizedProduct[],
  supplier: Supplier,
  env: WriteEnv,
  index: BLMatchIndex,
  listed: readonly ListedProduct[],
  getProductsData: GetProductsData,
  sleep: (ms: number) => Promise<unknown>,
  rateLimitMs: number,
): Promise<{ rows: ZeroRow[]; candidates: number; calls: number }> {
  const matched = new Set<number>();
  const feedSkus = new Set<string>();
  /** feed SKU → records its items match today */
  const matchedBySku = new Map<string, number[]>();
  for (const p of products) {
    const sku = (p.connector_sku ?? '').trim();
    const id = findBLMatch(index, supplier, p.ean, p.connector_sku)?.id;
    if (sku) feedSkus.add(sku);
    if (id === undefined) continue;
    matched.add(id);
    if (sku) matchedBySku.set(sku, [...(matchedBySku.get(sku) ?? []), id]);
  }
  const candidates = listed.filter((l) => (l.stock[env.warehouse] ?? 0) > 0 && !matched.has(l.id));
  const rows: ZeroRow[] = [];
  let calls = 0;
  for (let i = 0; i < candidates.length; i += MARGIN_READ_CHUNK) {
    if (calls > 0) await sleep(rateLimitMs);
    const chunk = candidates.slice(i, i + MARGIN_READ_CHUNK);
    const data = await getProductsData(env.inventoryId, chunk.map((c) => String(c.id)));
    calls++;
    for (const c of chunk) {
      const d = data[String(c.id)];
      if (!d) continue;
      const tf = d.text_fields && typeof d.text_fields === 'object' ? (d.text_fields as Record<string, unknown>) : {};
      const f = tf.features && typeof tf.features === 'object' && !Array.isArray(tf.features) ? (tf.features as Record<string, unknown>) : {};
      const sku = String(d.sku ?? c.sku);
      const sup = recordSuppliers(sku, Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v ?? '')])));
      const code = sup.codes[supplier];
      if (code === undefined) continue;
      let reason: ZeroRow['reason'];
      let movedTo: number | undefined;
      if (!feedSkus.has(code)) reason = 'code_missing';
      else {
        // c is unmatched, so any record the code's items match is a different one
        const elsewhere = matchedBySku.get(code) ?? [];
        if (elsewhere.length === 0) continue; // the item matches nothing — not moved, left alone
        reason = 'matched_elsewhere';
        movedTo = elsewhere[0];
      }
      rows.push({
        id: c.id, sku, code, stock: c.stock[env.warehouse] ?? 0,
        approved: Array.isArray(d.tags) && (d.tags as unknown[]).map(String).includes('approved'),
        name: String(tf.name ?? ''),
        reason, ...(movedTo !== undefined ? { movedTo } : {}),
      });
    }
  }
  return { rows, candidates: candidates.length, calls };
}

// ── Sync ──────────────────────────────────────────────────────────────────────

/** BL warning texts of the bulk writes, per product — the first 50 per run are logged, then a count. */
export class BLWarningLog {
  private shown = 0;
  private more = 0;
  static readonly MAX = 50;
  constructor(private readonly warn: (line: string) => void) {}

  log(kind: string, warnings: Readonly<Record<string, unknown>>): void {
    for (const [id, w] of Object.entries(warnings)) {
      if (this.shown >= BLWarningLog.MAX) { this.more++; continue; }
      this.shown++;
      const text = typeof w === 'string' ? w : JSON.stringify(w);
      this.warn(`[warn] BL ${kind} warning, product ${id}: ${String(text).replace(/\s+/g, ' ').slice(0, 200)}`);
    }
  }

  get hidden(): number { return this.more; }
}

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
  /** matched, but no price written: the product data read failed, or BL returned no data for the record */
  priceSkipped: number;
  /** matched through the EAN, but this supplier is not a member of the record — stock only (HA-2.38) */
  priceSkippedNotMember: number;
}

/**
 * `membership`: suppliers per record from readMarginRaws; null when that read failed. Prices go only
 * to records this supplier is a member of (HA-2.38): another supplier's record found through the EAN
 * gets stock in this supplier's warehouse and nothing else — otherwise the sync that runs last sets
 * the price of every record its EANs touch. A record without data (unknown membership) gets no price.
 * Shared records (several members) keep "last sync wins" until HA-2.39.
 */
export function planSync(
  products: readonly NormalizedProduct[],
  supplier: Supplier,
  index: BLMatchIndex,
  env: WriteEnv,
  margins: SyncMargins,
  tally: MarginTally,
  membership: ReadonlyMap<number, readonly Supplier[]> | null,
): SyncPlan {
  const plan: SyncPlan = { stockUpdates: {}, priceUpdates: {}, matched: 0, unmatched: 0, priceFallbacks: 0, priceZeros: 0, priceSkipped: 0, priceSkippedNotMember: 0 };

  for (const p of products) {
    // Same key as the import: EAN across suppliers, else this supplier's prefixed SKU only
    const id = findBLMatch(index, supplier, p.ean, p.connector_sku)?.id;
    if (id === undefined) { plan.unmatched++; continue; }
    plan.matched++;

    plan.stockUpdates[id] = { [env.warehouse]: p.stock ?? 0 };

    const members = membership?.get(id);
    if (members === undefined) { plan.priceSkipped++; continue; }
    if (!members.includes(supplier)) { plan.priceSkippedNotMember++; continue; }

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
      continue; // no selling price → no purchase price either: the pair stays consistent
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
  /** HA-2.38: previous feed counts; null/omitted = no zeroing (e.g. --limit, a partial feed) */
  feedCounts?: FeedCountStore | null;
}

/**
 * One sync run. Returns false when the run must end with a non-zero exit (margin read failed, or the
 * feed looks incomplete and nothing was zeroed).
 */
export async function runSyncCore(
  products: readonly NormalizedProduct[],
  supplier: Supplier,
  env: WriteEnv,
  deps: SyncDeps,
): Promise<{ ok: boolean; plan: SyncPlan; zeroed?: ZeroRow[] }> {
  const { log, warn } = deps;
  log('\nLoading existing BL products (match index)…');
  // The list also carries per-warehouse stock — the zeroing candidates come from it, no extra read
  const { index, listed } = await loadIndexWithStock(deps.getProductsList, env.inventoryId, deps.sleep, deps.rateLimitMs);
  log(`  ${index.total} products in BL`);

  let margins: SyncMargins = { kind: 'off' };
  let membership: Map<number, Supplier[]> | null = null;
  let ok = true;
  if (deps.marginKey === null) {
    warn('[warn] BASELINKER_EXTRA_FIELD_MARGIN not set — manual margins are NOT read, env markup for every product');
  }
  // One read of the matched records: the margin field (when configured) and which suppliers each
  // record belongs to — prices go only to records of this supplier (HA-2.38)
  const ids = [...new Set(
    products.map((p) => findBLMatch(index, supplier, p.ean, p.connector_sku)?.id).filter((id): id is number => id !== undefined),
  )];
  log(`\nReading ${deps.marginKey !== null ? `the margin field (${deps.marginKey}) and ` : ''}supplier membership of ${ids.length} matched products…`);
  try {
    await deps.sleep(deps.rateLimitMs);
    const read = await readMarginRaws(ids, deps.getProductsData, env.inventoryId, deps.marginKey, null, deps.sleep, deps.rateLimitMs, (id) => index.skuById.get(id));
    membership = read.members;
    if (deps.marginKey !== null) {
      margins = { kind: 'read', raw: read.raw };
      log(`  margin field read: ${read.raw.size}/${ids.length} products, ${read.calls} calls, ${(read.ms / 1000).toFixed(1)} s`);
    } else {
      log(`  product data read: ${read.members.size}/${ids.length} products, ${read.calls} calls, ${(read.ms / 1000).toFixed(1)} s`);
    }
  } catch (err) {
    margins = { kind: 'failed' };
    ok = false;
    warn(`[error] ${deps.marginKey !== null ? 'margin field' : 'product data'} read failed: ${err instanceof Error ? err.message : err} — stock is synced, prices are NOT (env prices would wipe manual margins; membership unknown)`);
  }

  const plan = planSync(products, supplier, index, env, margins, deps.tally, membership);
  log(`\nMatched ${plan.matched} products, ${plan.unmatched} not in BL yet (run 'import' mode to add them)`);
  if (plan.matched === 0) return { ok, plan };

  // BL bulk endpoints take max 1000 products per call
  const blWarnings = new BLWarningLog(warn);
  const writeIds = Object.keys(plan.stockUpdates);
  for (let i = 0; i < writeIds.length; i += 1000) {
    const chunk = writeIds.slice(i, i + 1000);

    const stockChunk = Object.fromEntries(chunk.map((id) => [id, plan.stockUpdates[id]]));
    const stockRes = await deps.updateStock(env.inventoryId, stockChunk);
    log(`  stock  ${i + chunk.length}/${writeIds.length}: ${stockRes.counter} updated` +
      (Object.keys(stockRes.warnings).length ? `, ${Object.keys(stockRes.warnings).length} warnings` : ''));
    blWarnings.log('stock', stockRes.warnings);
    await deps.sleep(deps.rateLimitMs);

    const priceChunk = Object.fromEntries(chunk.filter((id) => plan.priceUpdates[id]).map((id) => [id, plan.priceUpdates[id]]));
    if (Object.keys(priceChunk).length === 0) continue;
    const priceRes = await deps.updatePrices(env.inventoryId, priceChunk);
    log(`  prices ${i + chunk.length}/${writeIds.length}: ${priceRes.counter} updated` +
      (Object.keys(priceRes.warnings).length ? `, ${Object.keys(priceRes.warnings).length} warnings` : ''));
    blWarnings.log('prices', priceRes.warnings);
    await deps.sleep(deps.rateLimitMs);
  }

  // Withdrawn products (HA-2.38): stock 0 in this supplier's warehouse, behind the feed-size guard
  let zeroed: ZeroRow[] | undefined;
  let zeroLine: string | null = null;
  if (deps.feedCounts) {
    const guard = feedGuard(products.length, deps.feedCounts.read(supplier));
    if (guard.kind === 'incomplete') {
      ok = false;
      warn(`[error] feed looks incomplete: ${products.length} products, previous successful run ${guard.previous} (< ${FEED_MIN_RATIO * 100}%) — no stock zeroed, count not stored`);
    } else if (guard.kind === 'first') {
      zeroLine = `zeroed: 0 (approved: 0) — no previous feed count for ${supplier}, nothing zeroed this run; count ${products.length} stored`;
      deps.feedCounts.write(supplier, products.length);
    } else {
      const z = await planZeroing(products, supplier, env, index, listed, deps.getProductsData, deps.sleep, deps.rateLimitMs);
      for (let i = 0; i < z.rows.length; i += 1000) {
        await deps.sleep(deps.rateLimitMs);
        const chunk = z.rows.slice(i, i + 1000);
        const res = await deps.updateStock(env.inventoryId, Object.fromEntries(chunk.map((r) => [String(r.id), { [env.warehouse]: 0 }])));
        log(`  zero   ${i + chunk.length}/${z.rows.length}: ${res.counter} updated` + (Object.keys(res.warnings).length ? `, ${Object.keys(res.warnings).length} warnings` : ''));
        blWarnings.log('zero', res.warnings);
      }
      zeroed = z.rows;
      zeroLine = `zeroed: ${z.rows.length} (approved: ${z.rows.filter((r) => r.approved).length}) — withdrawn by ${supplier}, stock 0 in ${env.warehouse} only`;
      deps.feedCounts.write(supplier, products.length);
    }
  }

  log(`\n✓ Sync done: ${plan.matched} products refreshed`);
  if (zeroLine) log(`  ${zeroLine}`);
  log(`  prices skipped (not a member): ${plan.priceSkippedNotMember} — records of another supplier found through the EAN, stock only`);
  if (deps.marginKey !== null) log(`  ${deps.tally.summary()}`);
  if (plan.priceSkipped > 0) {
    warn(`⚠ ${plan.priceSkipped} products: prices NOT written (${margins.kind === 'failed' ? 'product data read failed' : 'BL returned no data for them'}) — previous prices kept`);
  }
  if (blWarnings.hidden > 0) warn(`⚠ ${blWarnings.hidden} more BL warnings not listed (first ${BLWarningLog.MAX} above)`);
  if (plan.priceFallbacks > 0) {
    warn(`⚠ ${plan.priceFallbacks} products had no purchase price in the feed — feed gross price used instead of markup pricing`);
  }
  if (plan.priceZeros > 0) {
    warn(`⚠ ${plan.priceZeros} products synced with price 0 — the feed has no price data for these`);
  }
  return { ok, plan, zeroed };
}

/**
 * The sync as the import script runs it: runSyncCore, then the process exit code — 1 when the run
 * is not ok (margin read failed, feed looks incomplete). Kept here so a test can run it in a child
 * process and see the real exit code.
 */
export async function runSyncProcess(
  products: readonly NormalizedProduct[],
  supplier: Supplier,
  env: WriteEnv,
  deps: SyncDeps,
): Promise<{ ok: boolean; plan: SyncPlan; zeroed?: ZeroRow[] }> {
  const res = await runSyncCore(products, supplier, env, deps);
  if (!res.ok) process.exitCode = 1;
  return res;
}
