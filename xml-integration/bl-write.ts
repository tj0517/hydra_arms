/**
 * What import and sync send to BaseLinker (extracted from scripts/xml-to-baselinker.ts in
 * HA-2.22 so the payloads can be tested against an in-memory catalogue).
 *
 *   toBLProduct    — addInventoryProduct payload of one product (import)
 *   readMarginRaws — „Marża %” field and supplier membership of matched products, read-only (sync, dry-run)
 *   planSync       — stock + price updates of one sync run; prices only on records the supplier is a member of
 *   runSyncCore    — the whole sync: index → margins → plan → bulk writes → zeroing, BL calls injected
 *   feedGuard / zeroGate / planZeroing — stock 0 for withdrawn products (HA-2.38), also the read-only
 *                    preview; zeroGate: feed-size AND match-count valves (HA-2.39 follow-up);
 *                    with own purchase groups (HA-2.39) also the supplier's own purchase price
 *   runSharedPricing — the `price-shared` step: selling + shared purchase price of shared records
 *
 * Own purchase groups (HA-2.39, xml-integration/shared-pricing.ts): with `env.purchaseGroups` set,
 * every matched record gets the supplier's purchase price in its own group, and a shared record
 * (≥ 2 own groups > 0) gets nothing else from a single supplier — its selling price and shared
 * „Cena zakupu” belong to runSharedPricing. Without it everything works as before HA-2.39.
 *
 * The margin field is never part of any payload here: `text_fields` is built from the feed
 * (name, description, features) and nothing else (HA-2.22, the field belongs to the client).
 */

import type { NormalizedProduct } from './types';
import { SUPPLIERS, SUPPLIER_LABEL, addToMatchIndex, eanForUpsert, emptyMatchIndex, findBLMatch, type BLMatchIndex, type Supplier } from './bl-match-key';
import { chooseMargin, computeSellingPrice, readMarginRaw, type MarginChoice, type MarginTally } from './margin';
import { recordSuppliers, redactSecrets } from './import-audit';
import { isSharedByPurchase, ownPurchasePrices, priceSharedRecord, type ChoiceReason, type PricingConfig, type PurchaseGroups, type SharedPrice } from './shared-pricing';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface WriteEnv {
  inventoryId: number;
  priceGroup: number;
  priceGroupPurchase: number | null;
  warehouse: string;
  /** the wholesaler's env markup (BASELINKER_MARKUP_*) */
  markupPct: number;
  /** HA-2.39: every supplier's own purchase group; null/omitted = off (behaviour before HA-2.39) */
  purchaseGroups?: PurchaseGroups | null;
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
  /**
   * HA-2.39, with `env.purchaseGroups`: the supplier and the record's current prices ({} for a new
   * record). The payload carries the current prices too — addInventoryProduct gets the whole price
   * list, so nothing another supplier or the pricing step wrote can be lost.
   */
  own: { supplier: Supplier; currentPrices: Readonly<Record<string, number>> } | null = null,
): { product: Record<string, unknown>; price: number; priceFromFallback: boolean; priceZero: boolean; shared: boolean } {
  const { price, fromFallback, priceZero } = computeSellingPrice(p, margin.pct);
  const purchase = p.price_purchase && p.price_purchase > 0 ? round2(p.price_purchase) : null;

  let prices: Record<string, number>;
  let shared = false;
  if (env.purchaseGroups && own) {
    prices = { ...own.currentPrices };
    if (purchase !== null) prices[env.purchaseGroups[own.supplier]] = purchase;
    // A shared record: own purchase group only — selling and shared purchase price are the pricing step's
    shared = isSharedByPurchase(own.currentPrices, env.purchaseGroups, { supplier: own.supplier, price: purchase });
    if (!shared) {
      prices[env.priceGroup] = price;
      if (env.priceGroupPurchase && purchase !== null) prices[env.priceGroupPurchase] = purchase;
    }
  } else {
    prices = { [env.priceGroup]: price };
    if (env.priceGroupPurchase && purchase !== null) prices[env.priceGroupPurchase] = purchase;
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

  return { product, price, priceFromFallback: fromFallback, priceZero, shared };
}

// ── BL reads ──────────────────────────────────────────────────────────────────

export type GetProductsList = (inventoryId: number, page?: number) => Promise<Record<string, { ean: string; sku: string; stock?: Record<string, number>; prices?: Record<string, number> }>>;
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

/** A BL map (stock, prices) as numbers; anything else → {} (an empty one may come back as `[]`). */
export function numMap(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    const n = Number(x);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

/** The match index plus each listed product's per-warehouse stock and prices — one read of the list (sync, zero preview). */
export async function loadIndexWithStock(
  getProductsList: GetProductsList,
  inventoryId: number,
  sleep: (ms: number) => Promise<unknown>,
  rateLimitMs: number,
): Promise<{ index: BLMatchIndex; listed: ListedProduct[] }> {
  const listed: ListedProduct[] = [];
  const index = await loadExistingProducts(async (inv, page) => {
    const res = await getProductsList(inv, page);
    for (const [id, p] of Object.entries(res)) listed.push({ id: Number(id), sku: String(p.sku ?? ''), stock: numMap(p.stock), prices: numMap(p.prices) });
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
  /** every price group of each returned product (HA-2.39: own purchase groups → shared or not) */
  prices: Map<number, Record<string, number>>;
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
  const pricesById = new Map<number, Record<string, number>>();
  let calls = 0;
  for (let i = 0; i < ids.length; i += MARGIN_READ_CHUNK) {
    if (i > 0) await sleep(rateLimitMs);
    const chunk = ids.slice(i, i + MARGIN_READ_CHUNK).map(String);
    const data = await getProductsData(inventoryId, chunk);
    calls++;
    for (const [id, d] of Object.entries(data)) {
      if (fieldKey !== null) raw.set(Number(id), readMarginRaw(d.text_fields, fieldKey));
      members.set(Number(id), recordSuppliers(String(d.sku ?? skuOf(Number(id)) ?? ''), featuresOf(d.text_fields)).members);
      const prices = numMap(d.prices);
      pricesById.set(Number(id), prices);
      const sale = priceGroup !== null ? Number(prices[String(priceGroup)]) : NaN;
      if (Number.isFinite(sale)) salePrice.set(Number(id), sale);
    }
  }
  return { raw, salePrice, members, prices: pricesById, calls, ms: Date.now() - started };
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

/** Counts of the last successful sync of one supplier. `matched` is null in entries written before it existed. */
export interface FeedCounts {
  /** products in the feed */
  products: number;
  /** distinct BL records the feed matched */
  matched: number | null;
}

/** Counts of the last successful sync per supplier — a JSON file on the import account. */
export interface FeedCountStore {
  read(supplier: Supplier): FeedCounts | null;
  write(supplier: Supplier, counts: { products: number; matched: number }): void;
}

export type ZeroGate =
  /** feed products < 90% of the previous run (HA-2.38) */
  | { kind: 'feed_incomplete'; previous: number }
  /** matched BL records < 90% of the previous run — e.g. reformatted EANs keep the product count, but stop matching */
  | { kind: 'matches_incomplete'; previous: number }
  /** no previous products, or (HA-2.39 follow-up) a previous entry without the match count: store only */
  | { kind: 'first'; what: 'feed' | 'matches' }
  | { kind: 'go' };

/**
 * Whether this sync may zero stock and clear own purchase prices. Two valves, both against the last
 * successful run: the feed's product count and the number of BL records the feed matched. Either
 * below 90% → nothing zeroed or cleared, the run ends with exit ≠ 0, the counts are not stored.
 */
export function zeroGate(products: number, matched: number, previous: FeedCounts | null): ZeroGate {
  const feed = feedGuard(products, previous?.products ?? null);
  if (feed.kind === 'incomplete') return { kind: 'feed_incomplete', previous: feed.previous };
  if (feed.kind === 'first') return { kind: 'first', what: 'feed' };
  const m = feedGuard(matched, previous?.matched ?? null);
  if (m.kind === 'incomplete') return { kind: 'matches_incomplete', previous: m.previous };
  if (m.kind === 'first') return { kind: 'first', what: 'matches' };
  return { kind: 'go' };
}

/** Distinct BL records today's feed matches — the sync key; its count is the match valve's number. */
export function matchedIds(products: readonly NormalizedProduct[], supplier: Supplier, index: BLMatchIndex): number[] {
  return [...new Set(products.map((p) => findBLMatch(index, supplier, p.ean, p.connector_sku)?.id).filter((id): id is number => id !== undefined))];
}

/** The `[error]` line of a valve that stopped the zeroing (sync log, run-bl.sh END line), else null. */
export function zeroGateError(gate: ZeroGate, products: number, matched: number): string | null {
  const pct = `< ${FEED_MIN_RATIO * 100}%`;
  if (gate.kind === 'feed_incomplete') return `[error] feed looks incomplete: ${products} products, previous successful run ${gate.previous} (${pct}) — no stock zeroed, no own purchase cleared, counts not stored`;
  if (gate.kind === 'matches_incomplete') return `[error] matches look incomplete: ${matched} matched, previous successful run ${gate.previous} (${pct}) — no stock zeroed, no own purchase cleared, counts not stored`;
  return null;
}

export interface ListedProduct {
  id: number;
  sku: string;
  stock: Record<string, number>;
  /** from the list; {} when the list leaves them out */
  prices?: Record<string, number>;
}

export interface ZeroRow {
  id: number;
  sku: string;
  /** this supplier's bare code on the record (prefix SKU or `SKU <Hurtownia>` parameter); '' without one */
  code: string;
  /** stock in this supplier's warehouse — set to 0 when > 0 */
  stock: number;
  /** HA-2.39: this supplier's own purchase price on the record — cleared (0) when > 0, else 0 */
  ownPurchase: number;
  approved: boolean;
  name: string;
  /**
   * code missing from today's feed; the code's feed item now matches another record (D-D); or
   * (HA-2.39, own purchase groups on) no item of today's feed matches the record any more — no code
   * on it (reached through the EAN only before), or the code's item matches nothing
   */
  reason: 'code_missing' | 'matched_elsewhere' | 'not_matched';
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
 *
 * With own purchase groups (HA-2.39, decision A tj 2026-10-26) the rule is broader: every record
 * today's feed does not match that has stock > 0 in this warehouse or a price > 0 in this supplier's
 * own purchase group — code or no code — gets both cleared, so the pricing step never picks a
 * supplier that no longer carries the product.
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
  const groups = env.purchaseGroups ?? null;
  const ownOf = (prices: unknown) => (groups ? ownPurchasePrices(prices, groups)[supplier] ?? 0 : 0);
  const candidates = listed.filter((l) => !matched.has(l.id) && ((l.stock[env.warehouse] ?? 0) > 0 || ownOf(l.prices) > 0));
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
      let reason: ZeroRow['reason'];
      let movedTo: number | undefined;
      if (code === undefined) {
        if (!groups) continue; // HA-2.38: only records with this supplier's code
        reason = 'not_matched';
      } else if (!feedSkus.has(code)) reason = 'code_missing';
      else {
        // c is unmatched, so any record the code's items match is a different one
        const elsewhere = matchedBySku.get(code) ?? [];
        if (elsewhere.length === 0) {
          if (!groups) continue; // HA-2.38: the item matches nothing — not moved, left alone
          reason = 'not_matched';
        } else {
          reason = 'matched_elsewhere';
          movedTo = elsewhere[0];
        }
      }
      // The data's prices are the current ones; the list's only when the data leaves them out
      const ownPurchase = d.prices && typeof d.prices === 'object' ? ownOf(d.prices) : ownOf(c.prices);
      rows.push({
        id: c.id, sku, code: code ?? '', stock: c.stock[env.warehouse] ?? 0, ownPurchase,
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
  /** matched through the EAN, but this supplier is not a member of the record — stock only (HA-2.38), plus the own purchase group (HA-2.39) */
  priceSkippedNotMember: number;
  /** HA-2.39: shared record (≥ 2 own purchase groups) — own purchase group only, the rest is the pricing step's */
  priceLeftToPricing: number;
}

/**
 * `membership`: suppliers per record from readMarginRaws; null when that read failed. Prices go only
 * to records this supplier is a member of (HA-2.38): another supplier's record found through the EAN
 * gets stock in this supplier's warehouse and nothing else — otherwise the sync that runs last sets
 * the price of every record its EANs touch. A record without data (unknown membership) gets no price.
 *
 * With `env.purchaseGroups` (HA-2.39) every matched record with known membership also gets the
 * purchase price in this supplier's own group — member or not (decision tj 2026-10-26) — and a
 * shared record (`currentPrices`: ≥ 2 own groups > 0 after this write) gets nothing else: its
 * selling and shared purchase price are set by the pricing step. Without it, shared records keep
 * "last sync wins" as before HA-2.39.
 */
export function planSync(
  products: readonly NormalizedProduct[],
  supplier: Supplier,
  index: BLMatchIndex,
  env: WriteEnv,
  margins: SyncMargins,
  tally: MarginTally,
  membership: ReadonlyMap<number, readonly Supplier[]> | null,
  /** HA-2.39: every price group of each record, from the same read as `membership` */
  currentPrices: ReadonlyMap<number, Readonly<Record<string, number>>> | null = null,
): SyncPlan {
  const plan: SyncPlan = { stockUpdates: {}, priceUpdates: {}, matched: 0, unmatched: 0, priceFallbacks: 0, priceZeros: 0, priceSkipped: 0, priceSkippedNotMember: 0, priceLeftToPricing: 0 };
  const groups = env.purchaseGroups ?? null;

  for (const p of products) {
    // Same key as the import: EAN across suppliers, else this supplier's prefixed SKU only
    const id = findBLMatch(index, supplier, p.ean, p.connector_sku)?.id;
    if (id === undefined) { plan.unmatched++; continue; }
    plan.matched++;

    plan.stockUpdates[id] = { [env.warehouse]: p.stock ?? 0 };

    const members = membership?.get(id);
    if (members === undefined) { plan.priceSkipped++; continue; }

    const purchase = p.price_purchase && p.price_purchase > 0 ? round2(p.price_purchase) : null;
    const prices: Record<string, number> = {};
    if (groups && purchase !== null) prices[groups[supplier]] = purchase;
    const ownOnly = (counter: 'priceSkippedNotMember' | 'priceLeftToPricing') => {
      plan[counter]++;
      if (Object.keys(prices).length) plan.priceUpdates[id] = prices;
    };
    if (!members.includes(supplier)) { ownOnly('priceSkippedNotMember'); continue; }
    if (groups && isSharedByPurchase(currentPrices?.get(id) ?? {}, groups, { supplier, price: purchase })) { ownOnly('priceLeftToPricing'); continue; }

    if (env.priceGroupPurchase && purchase !== null) prices[env.priceGroupPurchase] = purchase;

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
  let currentPrices: Map<number, Record<string, number>> | null = null;
  let ok = true;
  if (deps.marginKey === null) {
    warn('[warn] BASELINKER_EXTRA_FIELD_MARGIN not set — manual margins are NOT read, env markup for every product');
  }
  // One read of the matched records: the margin field (when configured) and which suppliers each
  // record belongs to — prices go only to records of this supplier (HA-2.38)
  const ids = matchedIds(products, supplier, index);
  log(`\nReading ${deps.marginKey !== null ? `the margin field (${deps.marginKey}) and ` : ''}supplier membership of ${ids.length} matched products…`);
  try {
    await deps.sleep(deps.rateLimitMs);
    const read = await readMarginRaws(ids, deps.getProductsData, env.inventoryId, deps.marginKey, null, deps.sleep, deps.rateLimitMs, (id) => index.skuById.get(id));
    membership = read.members;
    currentPrices = read.prices;
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

  const plan = planSync(products, supplier, index, env, margins, deps.tally, membership, currentPrices);
  log(`\nMatched ${plan.matched} products, ${plan.unmatched} not in BL yet (run 'import' mode to add them)`);
  // Zeroing valves (HA-2.38 feed size, HA-2.39 match count) — decided before any write
  const gate = deps.feedCounts ? zeroGate(products.length, ids.length, deps.feedCounts.read(supplier)) : null;
  const gateError = gate ? zeroGateError(gate, products.length, ids.length) : null;
  if (plan.matched === 0) {
    if (gateError) { ok = false; warn(gateError); }
    return { ok, plan };
  }

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
  let clearLine: string | null = null;
  const counts = { products: products.length, matched: ids.length };
  if (deps.feedCounts && gate) {
    if (gateError) {
      ok = false;
      warn(gateError);
    } else if (gate.kind === 'first') {
      zeroLine = gate.what === 'feed'
        ? `zeroed: 0 (approved: 0) — no previous feed count for ${supplier}, nothing zeroed this run; counts stored (${counts.products} products, ${counts.matched} matched)`
        : `zeroed: 0 (approved: 0) — no previous match count for ${supplier}, nothing zeroed this run; counts stored (${counts.products} products, ${counts.matched} matched)`;
      deps.feedCounts.write(supplier, counts);
    } else {
      const z = await planZeroing(products, supplier, env, index, listed, deps.getProductsData, deps.sleep, deps.rateLimitMs);
      const stockRows = z.rows.filter((r) => r.stock > 0);
      for (let i = 0; i < stockRows.length; i += 1000) {
        await deps.sleep(deps.rateLimitMs);
        const chunk = stockRows.slice(i, i + 1000);
        const res = await deps.updateStock(env.inventoryId, Object.fromEntries(chunk.map((r) => [String(r.id), { [env.warehouse]: 0 }])));
        log(`  zero   ${i + chunk.length}/${stockRows.length}: ${res.counter} updated` + (Object.keys(res.warnings).length ? `, ${Object.keys(res.warnings).length} warnings` : ''));
        blWarnings.log('zero', res.warnings);
      }
      // HA-2.39: the own purchase price goes too, so the pricing step no longer counts this supplier
      const ownGroup = env.purchaseGroups?.[supplier];
      const priceRows = ownGroup ? z.rows.filter((r) => r.ownPurchase > 0) : [];
      for (let i = 0; i < priceRows.length; i += 1000) {
        await deps.sleep(deps.rateLimitMs);
        const chunk = priceRows.slice(i, i + 1000);
        const res = await deps.updatePrices(env.inventoryId, Object.fromEntries(chunk.map((r) => [String(r.id), { [String(ownGroup)]: 0 }])));
        log(`  clear  ${i + chunk.length}/${priceRows.length}: ${res.counter} updated` + (Object.keys(res.warnings).length ? `, ${Object.keys(res.warnings).length} warnings` : ''));
        blWarnings.log('clear', res.warnings);
      }
      zeroed = z.rows;
      zeroLine = `zeroed: ${stockRows.length} (approved: ${stockRows.filter((r) => r.approved).length}) — withdrawn by ${supplier}, stock 0 in ${env.warehouse} only`;
      if (ownGroup) clearLine = `own purchase cleared: ${priceRows.length} — ${supplier}'s purchase group ${ownGroup} set to 0 on records its feed no longer matches`;
      deps.feedCounts.write(supplier, counts);
    }
  }

  log(`\n✓ Sync done: ${plan.matched} products refreshed`);
  if (zeroLine) log(`  ${zeroLine}`);
  if (clearLine) log(`  ${clearLine}`);
  log(`  prices skipped (not a member): ${plan.priceSkippedNotMember} — records of another supplier found through the EAN, stock${env.purchaseGroups ? ' and own purchase group' : ''} only`);
  if (env.purchaseGroups) log(`  prices left to pricing (shared): ${plan.priceLeftToPricing} — ≥ 2 own purchase groups, own purchase group only (selling price: price-shared)`);
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

// ── Pricing of shared records (HA-2.39) ──────────────────────────────────────

export interface PricingRow extends SharedPrice {
  id: number;
  sku: string;
  ean: string;
  saleBefore: number | null;
  purchaseBefore: number | null;
  changed: boolean;
}

export interface PricingDeps {
  /** read-only getInventoryProductsList — prices and per-warehouse stock of the whole catalogue */
  getProductsList: GetProductsList;
  /** read-only getInventoryProductsData — current prices and the margin field of shared records */
  getProductsData: GetProductsData;
  /** updateInventoryProductsPrices; null = dry-run, nothing is written */
  updatePrices: SyncDeps['updatePrices'] | null;
  sleep: (ms: number) => Promise<unknown>;
  rateLimitMs: number;
  /** text_fields key of „Marża %”, or null (env markup of the chosen supplier for every record) */
  marginKey: string | null;
  log: (line: string) => void;
  warn: (line: string) => void;
  tally: MarginTally;
}

export interface PricingResult {
  /** false: the product data read failed — nothing was written */
  ok: boolean;
  rows: PricingRow[];
  listed: number;
  /** shared by the list (≥ 2 own purchase groups > 0) */
  shared: number;
  changed: number;
  /** BL returned no data for the record, or its current prices no longer make it shared */
  skipped: number;
  written: number;
}

const differs = (before: number | null, after: number) => before === null || Math.abs(before - after) >= 0.005;

/**
 * The `price-shared` step, after the last nightly sync. BaseLinker data only — the list (prices,
 * stock) and the product data of shared records (current prices, „Marża %”); never a feed. Writes
 * the selling price and the shared „Cena zakupu” of every shared record whose price changes, in
 * batches of updateInventoryProductsPrices. Calls no other BL method.
 */
export async function runSharedPricing(cfg: PricingConfig & { inventoryId: number }, deps: PricingDeps): Promise<PricingResult> {
  const { log, warn } = deps;
  log('\nLoading BL products (prices and stock)…');
  const listed: Array<{ id: number; sku: string; ean: string; stock: Record<string, number>; prices: Record<string, number> }> = [];
  for (let page = 1; ; page++) {
    if (page > 1) await deps.sleep(deps.rateLimitMs);
    const res = await deps.getProductsList(cfg.inventoryId, page);
    const entries = Object.entries(res);
    for (const [id, p] of entries) listed.push({ id: Number(id), sku: String(p.sku ?? ''), ean: String(p.ean ?? ''), stock: numMap(p.stock), prices: numMap(p.prices) });
    if (entries.length < 1000) break;
  }
  const candidates = listed.filter((l) => isSharedByPurchase(l.prices, cfg.groups));
  log(`  ${listed.length} products in BL, ${candidates.length} shared (≥ 2 own purchase groups > 0)`);
  const result: PricingResult = { ok: true, rows: [], listed: listed.length, shared: candidates.length, changed: 0, skipped: 0, written: 0 };
  if (candidates.length === 0) {
    log(`\n${deps.updatePrices ? '✓ Pricing done' : 'Pricing dry-run'}: 0 shared, 0 changed, 0 unchanged, 0 skipped`);
    return result;
  }

  log(`\nReading current prices${deps.marginKey !== null ? ` and the margin field (${deps.marginKey})` : ''} of ${candidates.length} shared products…`);
  let read: MarginRead;
  try {
    await deps.sleep(deps.rateLimitMs);
    read = await readMarginRaws(candidates.map((c) => c.id), deps.getProductsData, cfg.inventoryId, deps.marginKey, cfg.saleGroup, deps.sleep, deps.rateLimitMs);
    log(`  product data read: ${read.prices.size}/${candidates.length} products, ${read.calls} calls, ${(read.ms / 1000).toFixed(1)} s`);
  } catch (err) {
    warn(`[error] product data read failed: ${err instanceof Error ? err.message : err} — nothing written (the margin field and current prices are unknown)`);
    return { ...result, ok: false };
  }
  if (deps.marginKey === null) warn('[warn] BASELINKER_EXTRA_FIELD_MARGIN not set — manual margins are NOT read, env markup of the chosen supplier for every product');

  const updates: Record<string, Record<string, number>> = {};
  for (const c of candidates) {
    const prices = read.prices.get(c.id);
    const priced = prices ? priceSharedRecord({ prices, stock: c.stock }, cfg, read.raw.get(c.id)) : null;
    if (!prices || !priced) { result.skipped++; continue; }
    const saleBefore = Number.isFinite(prices[String(cfg.saleGroup)]) ? prices[String(cfg.saleGroup)] : null;
    const purchaseBefore = Number.isFinite(prices[String(cfg.purchaseGroup)]) ? prices[String(cfg.purchaseGroup)] : null;
    const changed = differs(saleBefore, priced.sale) || differs(purchaseBefore, priced.purchase);
    deps.tally.note(c.id, priced.margin);
    result.rows.push({ id: c.id, sku: c.sku, ean: c.ean, saleBefore, purchaseBefore, changed, ...priced });
    if (changed) {
      result.changed++;
      updates[String(c.id)] = { [String(cfg.saleGroup)]: priced.sale, [String(cfg.purchaseGroup)]: priced.purchase };
    }
  }

  const blWarnings = new BLWarningLog(warn);
  const ids = Object.keys(updates);
  if (deps.updatePrices) {
    for (let i = 0; i < ids.length; i += 1000) {
      await deps.sleep(deps.rateLimitMs);
      const chunk = ids.slice(i, i + 1000);
      const res = await deps.updatePrices(cfg.inventoryId, Object.fromEntries(chunk.map((id) => [id, updates[id]])));
      result.written += res.counter;
      log(`  prices ${i + chunk.length}/${ids.length}: ${res.counter} updated` + (Object.keys(res.warnings).length ? `, ${Object.keys(res.warnings).length} warnings` : ''));
      blWarnings.log('prices', res.warnings);
    }
  }

  for (const line of pricingTable(result.rows)) log(line);
  const unchanged = result.rows.length - result.changed;
  log(`\n${deps.updatePrices ? '✓ Pricing done' : 'Pricing dry-run'}: ${result.shared} shared, ${result.changed} changed, ${unchanged} unchanged, ${result.skipped} skipped`);
  for (const line of pricingSummary(result.rows)) log(`  ${line}`);
  if (deps.marginKey !== null) log(`  ${deps.tally.summary()}`);
  if (result.skipped > 0) warn(`⚠ ${result.skipped} shared products skipped — BL returned no data for them, or their current prices no longer make them shared; previous prices kept`);
  if (blWarnings.hidden > 0) warn(`⚠ ${blWarnings.hidden} more BL warnings not listed (first ${BLWarningLog.MAX} above)`);
  if (!deps.updatePrices) log('Dry-run — nothing written to BaseLinker.');
  return result;
}

const REASON_LABEL: Record<ChoiceReason, string> = { in_stock: 'najtańsza ze stanem', none_in_stock: 'brak stanu — najtańsza' };

/** Distribution of chosen suppliers and reasons. */
export function pricingSummary(rows: readonly PricingRow[]): string[] {
  const by = (s: Supplier, r?: ChoiceReason) => rows.filter((x) => x.choice.supplier === s && (r === undefined || x.choice.reason === r)).length;
  return [
    `chosen: ${SUPPLIERS.map((s) => `${SUPPLIER_LABEL[s]} ${by(s)} (in stock ${by(s, 'in_stock')}, none in stock ${by(s, 'none_in_stock')})`).join('; ')}`,
    `changed by chosen supplier: ${SUPPLIERS.map((s) => `${SUPPLIER_LABEL[s]} ${rows.filter((x) => x.changed && x.choice.supplier === s).length}`).join(', ')}`,
  ];
}

const money = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toFixed(2));

/**
 * The dry-run table: changed records first, then the rest, at most `max` rows (≥ 10 whenever there
 * are 10). Numbers, SKU and EAN only — no names, no URLs; every line also goes through redactSecrets.
 */
export function pricingTable(rows: readonly PricingRow[], max = 25): string[] {
  if (rows.length === 0) return [];
  const shown = [...rows].sort((a, b) => Number(b.changed) - Number(a.changed) || a.id - b.id).slice(0, max);
  const triple = (f: (s: Supplier) => string) => SUPPLIERS.map(f).join(' / ');
  const out = [
    `\n  ${'BL id'.padEnd(10)} ${'sku'.padEnd(18)} ${'EAN'.padEnd(14)} ${'zakup Kolba / Sharg / Spechurt'.padEnd(31)} ${'stan H1 / H2 / H3'.padEnd(18)} ${'wybrana (powód)'.padEnd(34)} ${'marża (źródło)'.padEnd(16)} ${'sprzedaż przed → po'.padEnd(21)} zakup wsp. przed → po`,
  ];
  for (const r of shown) {
    const margin = `${r.margin.pct}% ${r.margin.source === 'field' ? 'pole' : r.margin.rejected !== undefined ? 'env (pole odrz.)' : 'env'}`;
    out.push(`  ${String(r.id).padEnd(10)} ${r.sku.slice(0, 18).padEnd(18)} ${r.ean.slice(0, 14).padEnd(14)} ${triple((s) => money(r.own[s])).padEnd(31)} ${triple((s) => String(r.stock[s] ?? 0)).padEnd(18)} ${`${SUPPLIER_LABEL[r.choice.supplier]} (${REASON_LABEL[r.choice.reason]})`.padEnd(34)} ${margin.padEnd(16)} ${`${money(r.saleBefore)} → ${money(r.sale)}`.padEnd(21)} ${money(r.purchaseBefore)} → ${money(r.purchase)}${r.changed ? '' : '  (bez zmian)'}`);
  }
  if (rows.length > shown.length) out.push(`  … ${rows.length - shown.length} more (all rows: --out=<dir>)`);
  return out.map(redactSecrets);
}

/** Every priced shared record, for `price-shared --dry-run --out=<dir>` (cells pass redactSecrets in toCsv). */
export function pricingCsvRows(rows: readonly PricingRow[]): { headers: string[]; rows: Array<Array<string | number>> } {
  return {
    headers: ['bl_id', 'sku', 'ean', ...SUPPLIERS.map((s) => `zakup_${s}`), ...SUPPLIERS.map((s) => `stan_${s}`), 'wybrana', 'powod', 'marza_pct', 'marza_zrodlo', 'sprzedaz_przed', 'sprzedaz_po', 'zakup_wspolny_przed', 'zakup_wspolny_po', 'zmiana'],
    rows: rows.map((r) => [
      r.id, r.sku, r.ean, ...SUPPLIERS.map((s) => r.own[s] ?? ''), ...SUPPLIERS.map((s) => r.stock[s] ?? 0), r.choice.supplier, r.choice.reason,
      r.margin.pct, r.margin.source === 'field' ? 'pole' : r.margin.rejected !== undefined ? 'env (pole odrzucone)' : 'env',
      r.saleBefore ?? '', r.sale, r.purchaseBefore ?? '', r.purchase, r.changed ? 'tak' : 'nie',
    ]),
  };
}
