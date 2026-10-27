/**
 * Price of a record several suppliers carry (HA-2.39).
 *
 * Each supplier writes its purchase price into its own BL price group („Zakup Kolba”, „Zakup Sharg”,
 * „Zakup Spechurt” — BASELINKER_PRICE_GROUP_PURCHASE_<SUPPLIER>), on every record it matches, member
 * or not. A record is shared when ≥ 2 of those groups hold a price > 0 — BaseLinker data only, no
 * feeds (decision tj 2026-10-26). A supplier's sync never sets the selling price or the shared
 * „Cena zakupu” of a shared record; the pricing step (`price-shared`, after the last nightly sync)
 * does, with chooseSupplier below.
 *
 * Used by bl-write.ts (import payload, sync, zeroing, the pricing run), scripts/xml-to-baselinker.ts
 * and scripts/audit-import.ts (section A). Pure functions, no I/O.
 */

import { SUPPLIERS, type Supplier } from './bl-match-key';
import { chooseMargin, computeSellingPrice, type MarginChoice } from './margin';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Env var holding each supplier's own purchase price group ID (inputs registry, HA-2.16). */
export const PURCHASE_GROUP_ENV: Record<Supplier, string> = {
  kolba: 'BASELINKER_PRICE_GROUP_PURCHASE_KOLBA',
  sharg: 'BASELINKER_PRICE_GROUP_PURCHASE_SHARG',
  spechurt: 'BASELINKER_PRICE_GROUP_PURCHASE_SPECHURT',
};

/** The name tj gives each group in the BL panel (scripts/bl-account-ids.ts looks the IDs up by it). */
export const PURCHASE_GROUP_NAME: Record<Supplier, string> = {
  kolba: 'Zakup Kolba',
  sharg: 'Zakup Sharg',
  spechurt: 'Zakup Spechurt',
};

export type PurchaseGroups = Readonly<Record<Supplier, number>>;

export type PurchaseGroupsLoad =
  | { kind: 'ok'; groups: PurchaseGroups }
  /** none of the three set — HA-2.39 off, import and sync work as before */
  | { kind: 'unset' }
  /** some set, some not, a value that is not an ID, or an ID used twice — never guessed */
  | { kind: 'invalid'; message: string };

/**
 * The three own purchase groups from the environment: all three or none. `taken` are the IDs
 * already in use (selling and shared purchase group) — an own group must differ from them.
 */
export function loadPurchaseGroups(env: Readonly<Record<string, string | undefined>>, taken: ReadonlyArray<number | null> = []): PurchaseGroupsLoad {
  const raw = SUPPLIERS.map((s) => [s, (env[PURCHASE_GROUP_ENV[s]] ?? '').trim()] as const);
  const set = raw.filter(([, v]) => v !== '');
  if (set.length === 0) return { kind: 'unset' };
  if (set.length < SUPPLIERS.length) {
    return { kind: 'invalid', message: `${raw.filter(([, v]) => v === '').map(([s]) => PURCHASE_GROUP_ENV[s]).join(', ')} not set — all three own purchase groups or none` };
  }
  const bad = raw.filter(([, v]) => !/^\d{1,9}$/.test(v) || Number(v) === 0);
  if (bad.length) return { kind: 'invalid', message: `${bad.map(([s]) => PURCHASE_GROUP_ENV[s]).join(', ')} must be a BL price group ID (a number)` };
  const groups = Object.fromEntries(raw.map(([s, v]) => [s, Number(v)])) as Record<Supplier, number>;
  const ids = SUPPLIERS.map((s) => groups[s]);
  const clash = ids.filter((id, i) => ids.indexOf(id) !== i || taken.includes(id));
  if (clash.length) return { kind: 'invalid', message: `price group ${clash[0]} is used twice — each supplier needs its own group, different from the selling and the shared purchase group` };
  return { kind: 'ok', groups };
}

/** Own purchase price per supplier, only the ones > 0 (`prices` = BL `prices` of one record). */
export function ownPurchasePrices(prices: unknown, groups: PurchaseGroups): Partial<Record<Supplier, number>> {
  const p = prices && typeof prices === 'object' && !Array.isArray(prices) ? (prices as Record<string, unknown>) : {};
  const out: Partial<Record<Supplier, number>> = {};
  for (const s of SUPPLIERS) {
    const v = Number(p[String(groups[s])]);
    if (Number.isFinite(v) && v > 0) out[s] = v;
  }
  return out;
}

/**
 * THE definition of a shared record (decision tj 2026-10-26): own purchase groups of ≥ 2 suppliers
 * hold a price > 0. `write` = the price the caller is about to put into its own group — the record
 * is judged as it will be after that write (a price ≤ 0 is not written, the group keeps its value).
 */
export function isSharedByPurchase(prices: unknown, groups: PurchaseGroups, write?: { supplier: Supplier; price: number | null }): boolean {
  const own = ownPurchasePrices(prices, groups);
  if (write && write.price !== null && write.price > 0) own[write.supplier] = write.price;
  return Object.keys(own).length >= 2;
}

// ── The choice ────────────────────────────────────────────────────────────────

export interface Candidate {
  supplier: Supplier;
  /** own purchase group */
  price: number;
  /** stock in the supplier's own warehouse (H1/H2/H3) */
  stock: number;
}

/** `in_stock` — cheapest among suppliers with stock; `none_in_stock` — nobody has stock, cheapest overall. */
export type ChoiceReason = 'in_stock' | 'none_in_stock';

export interface Choice {
  supplier: Supplier;
  price: number;
  reason: ChoiceReason;
}

/**
 * Candidates = suppliers with an own purchase price > 0. Those with stock > 0 first; the cheapest
 * wins; none in stock → the cheapest overall; a tie → Kolba, Sharg, Spechurt. No candidate → null.
 */
export function chooseSupplier(candidates: readonly Candidate[]): Choice | null {
  const valid = candidates.filter((c) => c.price > 0);
  if (valid.length === 0) return null;
  const inStock = valid.filter((c) => c.stock > 0);
  const pool = inStock.length > 0 ? inStock : valid;
  const best = [...pool].sort((a, b) => round2(a.price) - round2(b.price) || SUPPLIERS.indexOf(a.supplier) - SUPPLIERS.indexOf(b.supplier))[0];
  return { supplier: best.supplier, price: round2(best.price), reason: inStock.length > 0 ? 'in_stock' : 'none_in_stock' };
}

export interface PricingConfig {
  groups: PurchaseGroups;
  /** each supplier's own warehouse, `bl_<id>` */
  warehouses: Readonly<Record<Supplier, string>>;
  /** BASELINKER_PRICE_GROUP */
  saleGroup: number;
  /** BASELINKER_PRICE_GROUP_PURCHASE — the shared „Cena zakupu” */
  purchaseGroup: number;
  /** BASELINKER_MARKUP_<SUPPLIER> */
  markup: Readonly<Record<Supplier, number>>;
}

export interface SharedPrice {
  own: Partial<Record<Supplier, number>>;
  stock: Partial<Record<Supplier, number>>;
  choice: Choice;
  margin: MarginChoice;
  /** what pricing writes */
  sale: number;
  purchase: number;
}

/**
 * What the pricing step sets on one record: null when it is not shared. Selling price = chosen ×
 * (1 + the record's „Marża %” when valid, else the env markup of the CHOSEN supplier).
 */
export function priceSharedRecord(
  rec: { prices: unknown; stock: Readonly<Record<string, number>> },
  cfg: PricingConfig,
  marginRaw: unknown,
): SharedPrice | null {
  if (!isSharedByPurchase(rec.prices, cfg.groups)) return null;
  const own = ownPurchasePrices(rec.prices, cfg.groups);
  const stock: Partial<Record<Supplier, number>> = {};
  for (const s of SUPPLIERS) stock[s] = Number(rec.stock[cfg.warehouses[s]] ?? 0) || 0;
  const choice = chooseSupplier(SUPPLIERS.filter((s) => own[s] !== undefined).map((s) => ({ supplier: s, price: own[s]!, stock: stock[s]! })))!;
  const margin = chooseMargin(marginRaw, cfg.markup[choice.supplier]);
  const { price } = computeSellingPrice({ price_purchase: choice.price, price_gross: 0 }, margin.pct);
  return { own, stock, choice, margin, sale: price, purchase: choice.price };
}
