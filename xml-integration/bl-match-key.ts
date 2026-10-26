/**
 * The one upsert key for the XML → BaseLinker import, sync and feed diagnostics (HA-2.28).
 *
 *   1. EAN → the BaseLinker product with that EAN, whichever supplier wrote it (one record per good);
 *   2. no EAN match → the SKU, but only the SKU of the SAME supplier: the `sku` field in BaseLinker
 *      is `<SUPPLIER>-<feed sku>` (e.g. `SHARG-139`, `SPECHURT-1091`, `KOLBA-10630001`) and the
 *      lookup compares that full string, so a bare `139` or a `SPECHURT-139` never matches `SHARG-139`.
 *
 * Sharg's and Spechurt's SKUs are bare row numbers of their catalogues and overlap — without the
 * prefix the SKU fallback joined unrelated goods of two suppliers into one record.
 *
 * A shared record (one EAN, several suppliers) keeps the `sku` of the supplier that created it
 * (tj 2026-10-14, D1) and carries every supplier's bare code as a product parameter
 * (`SKU Kolba` / `SKU Sharg` / `SKU Spechurt`, D2) plus `Źródło opisu` — the supplier that last
 * wrote name and description. Parameters are merged with the record's existing ones, never replaced.
 *
 * EAN (HA-2.38, tj 2026-10-26): one good = one key whatever the leading zeros — `normalizeEan` is
 * the only place an EAN is read. Key = GTIN-14 (digits, left-padded with zeros); written to
 * BaseLinker as GTIN-13 when it fits in 13 digits (EAN-8 unchanged); a wrong check digit or a
 * length outside 8–14 makes the EAN count as missing.
 *
 * Pure functions: no I/O, no BaseLinker calls.
 */

export const SUPPLIERS = ['kolba', 'sharg', 'spechurt'] as const;
export type Supplier = (typeof SUPPLIERS)[number];

/** Prefix of the BaseLinker `sku` field. */
export const SKU_PREFIX: Record<Supplier, string> = {
  kolba: 'KOLBA',
  sharg: 'SHARG',
  spechurt: 'SPECHURT',
};

/** Supplier name as shown in the product parameters. */
export const SUPPLIER_LABEL: Record<Supplier, string> = {
  kolba: 'Kolba',
  sharg: 'Sharg',
  spechurt: 'Spechurt',
};

/** Parameter naming the supplier whose name/description the record currently shows. */
export const SOURCE_PARAM = 'Źródło opisu';

/** Parameter holding a supplier's bare code, e.g. `SKU Sharg`. */
export function supplierSkuParam(supplier: Supplier): string {
  return `SKU ${SUPPLIER_LABEL[supplier]}`;
}

/** The `sku` written to BaseLinker: `<SUPPLIER>-<feed sku>`; '' when the feed has no SKU. */
export function blSku(supplier: Supplier, feedSku: string | null | undefined): string {
  const sku = (feedSku ?? '').trim();
  return sku ? `${SKU_PREFIX[supplier]}-${sku}` : '';
}

/** True when a BaseLinker `sku` was written by this supplier's import. */
export function isOwnSku(supplier: Supplier, sku: string | null | undefined): boolean {
  return (sku ?? '').trim().startsWith(`${SKU_PREFIX[supplier]}-`);
}

// ── EAN ───────────────────────────────────────────────────────────────────────

export type EanCheck =
  | { kind: 'ok'; /** GTIN-14, the comparison key */ key: string; /** what is written to BaseLinker */ write: string }
  | { kind: 'empty' }
  | { kind: 'invalid'; raw: string; reason: 'not digits' | 'length' | 'check digit' };

/** GS1 check digit over a 14-digit string: weights 3,1,3,… from the right, the last digit excluded. */
function checkDigitOk(gtin14: string): boolean {
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(gtin14[i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10 === Number(gtin14[13]);
}

/**
 * THE EAN rule. Whitespace is dropped; anything else that is not a digit makes the EAN invalid.
 * Left zeros do not change the check digit, so `192687280759` (a UPC that lost nothing),
 * `0192687280759` and `00192687280759` are one key.
 */
export function normalizeEan(raw: string | number | null | undefined): EanCheck {
  const s = String(raw ?? '').replace(/\s+/g, '');
  if (!s) return { kind: 'empty' };
  if (!/^\d+$/.test(s)) return { kind: 'invalid', raw: s, reason: 'not digits' };
  if (s.length < 8 || s.length > 14 || /^0+$/.test(s)) return { kind: 'invalid', raw: s, reason: 'length' };
  const key = s.padStart(14, '0');
  if (!checkDigitOk(key)) return { kind: 'invalid', raw: s, reason: 'check digit' };
  const write = s.length === 8 ? s : key.startsWith('0') ? key.slice(1) : key;
  return { kind: 'ok', key, write };
}

/** Comparison key, or null when the EAN is missing or invalid. */
export function eanKey(raw: string | number | null | undefined): string | null {
  const c = normalizeEan(raw);
  return c.kind === 'ok' ? c.key : null;
}

/**
 * `ean` an upsert sends: the feed's EAN in write form; with no valid EAN in the feed, the record's
 * current EAN (write form when valid, else exactly as it is) — an invalid or missing feed EAN never
 * blanks an EAN another supplier put on a shared record. '' only for a new record without one.
 */
export function eanForUpsert(feedEan: string | null | undefined, existingEan?: string | null): string {
  const f = normalizeEan(feedEan);
  if (f.kind === 'ok') return f.write;
  const e = normalizeEan(existingEan);
  if (e.kind === 'ok') return e.write;
  return String(existingEan ?? '').trim();
}

/** Products whose EAN is set but invalid — counted and listed once per run in the log. */
export function invalidEans<T extends { ean: string | null }>(products: readonly T[]): Array<{ product: T; check: Extract<EanCheck, { kind: 'invalid' }> }> {
  const out: Array<{ product: T; check: Extract<EanCheck, { kind: 'invalid' }> }> = [];
  for (const product of products) {
    const check = normalizeEan(product.ean);
    if (check.kind === 'invalid') out.push({ product, check });
  }
  return out;
}

// ── Index of the BaseLinker catalogue ─────────────────────────────────────────

export interface BLMatchIndex {
  /** keyed by `eanKey` (GTIN-14) */
  byEan: Map<string, number>;
  /** keyed by the full BaseLinker `sku`, prefix included */
  bySku: Map<string, number>;
  /** current BaseLinker `sku` of every indexed product */
  skuById: Map<number, string>;
  total: number;
}

export function emptyMatchIndex(): BLMatchIndex {
  return { byEan: new Map(), bySku: new Map(), skuById: new Map(), total: 0 };
}

/**
 * Adds one BaseLinker product. The first product seen for an EAN key or SKU wins. The SKU is stored
 * exactly as BaseLinker holds it — a bare or foreign-prefixed SKU can only ever match itself.
 */
export function addToMatchIndex(
  index: BLMatchIndex,
  id: number,
  ean: string | null | undefined,
  sku: string | null | undefined,
): void {
  const e = eanKey(ean);
  const s = String(sku ?? '').trim();
  if (e && !index.byEan.has(e)) index.byEan.set(e, id);
  if (s && !index.bySku.has(s)) index.bySku.set(s, id);
  if (!index.skuById.has(id)) index.total++;
  index.skuById.set(id, s);
}

export interface BLMatch {
  id: number;
  via: 'ean' | 'sku';
}

/**
 * THE key: EAN (GTIN-14 key) across suppliers first; otherwise `<SUPPLIER>-<feed sku>` of this
 * supplier only. `feedSku` is the connector's bare SKU (`connector_sku`).
 */
export function findBLMatch(
  index: BLMatchIndex,
  supplier: Supplier,
  ean: string | null | undefined,
  feedSku: string | null | undefined,
): BLMatch | undefined {
  const e = eanKey(ean);
  if (e && index.byEan.has(e)) return { id: index.byEan.get(e)!, via: 'ean' };
  const s = blSku(supplier, feedSku);
  if (s && index.bySku.has(s)) return { id: index.bySku.get(s)!, via: 'sku' };
  return undefined;
}

// ── Create, update or skip ────────────────────────────────────────────────────

export type UpsertPlan<T> =
  | { kind: 'create' }
  | { kind: 'update'; id: number; existing: T }
  /** matched, but BaseLinker did not return the record's data — writing would overwrite its SKU, parameters and admin tags */
  | { kind: 'skip'; id: number };

/**
 * What the import does with one product, given its match and the data fetched for matched
 * records (getInventoryProductsData). A matched record without data is skipped and counted as
 * an error, never written blind (tj 2026-10-14).
 */
export function planUpsert<T>(matchId: number | undefined, existingById: ReadonlyMap<number, T>): UpsertPlan<T> {
  if (matchId === undefined) return { kind: 'create' };
  const existing = existingById.get(matchId);
  return existing === undefined ? { kind: 'skip', id: matchId } : { kind: 'update', id: matchId, existing };
}

// ── What an upsert writes for the record's identity ──────────────────────────

/**
 * `sku` to send when updating an existing record. This supplier's own record (or one with no
 * SKU yet) gets this supplier's current SKU; a record another supplier created — matched through
 * the EAN — keeps its SKU unchanged (D1).
 */
export function skuForUpdate(supplier: Supplier, feedSku: string | null | undefined, existingSku: string | null | undefined): string {
  const existing = (existingSku ?? '').trim();
  if (!existing || isOwnSku(supplier, existing)) return blSku(supplier, feedSku);
  return existing;
}

/**
 * Product parameters (`text_fields.features`) to send: the record's existing parameters, this
 * supplier's parameters on top, this supplier's bare code and `Źródło opisu`. BaseLinker replaces
 * `features` wholesale, so whatever is not sent is lost — hence the merge.
 */
export function mergeFeatures(
  supplier: Supplier,
  feedSku: string | null | undefined,
  own: Readonly<Record<string, string>>,
  existing?: Readonly<Record<string, string>> | null,
): Record<string, string> {
  const out: Record<string, string> = { ...(existing ?? {}), ...own };
  const sku = (feedSku ?? '').trim();
  if (sku) out[supplierSkuParam(supplier)] = sku;
  out[SOURCE_PARAM] = SUPPLIER_LABEL[supplier];
  return out;
}

/**
 * `sku` and parameters of one upsert. `existing` is the BaseLinker record being updated
 * (its current `sku` and `features`); omit it when creating a new record.
 */
export function recordIdentity(
  supplier: Supplier,
  feedSku: string | null | undefined,
  ownFeatures: Readonly<Record<string, string>>,
  existing?: { sku: string | null | undefined; features?: Readonly<Record<string, string>> | null },
): { sku: string; features: Record<string, string> } {
  return {
    sku: existing ? skuForUpdate(supplier, feedSku, existing.sku) : blSku(supplier, feedSku),
    features: mergeFeatures(supplier, feedSku, ownFeatures, existing?.features),
  };
}
