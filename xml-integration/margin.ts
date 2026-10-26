/**
 * Selling price and the per-product manual margin (HA-2.22).
 *
 * Selling price = purchase price × (1 + margin / 100). The margin is the product's own
 * „Marża %” extra field in the BL catalogue when it holds a valid number, otherwise the
 * wholesaler's env markup (BASELINKER_MARKUP_*). The field belongs to the client: import and
 * sync only read it (through getInventoryProductsData), never write it.
 *
 * Used by scripts/xml-to-baselinker.ts (import, sync, dry-run) and scripts/audit-import.ts.
 */

import type { NormalizedProduct } from './types';

/** Env var holding the BL extra field ID of „Marża %” (bare number, or `extra_field_<id>`). */
export const MARGIN_FIELD_ENV = 'BASELINKER_EXTRA_FIELD_MARGIN';

export const MARGIN_MIN_PCT = 0;
export const MARGIN_MAX_PCT = 200;

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Price ─────────────────────────────────────────────────────────────────────

/**
 * Selling price = purchase price + markup. Feed retail price is ignored. If the feed has no
 * purchase price, fall back to the feed gross price (the margin does not apply — HA-2.05).
 */
export function computeSellingPrice(
  p: Pick<NormalizedProduct, 'price_purchase' | 'price_gross'>,
  markupPct: number,
): { price: number; fromFallback: boolean; priceZero: boolean } {
  if (p.price_purchase && p.price_purchase > 0) {
    const price = round2(p.price_purchase * (1 + markupPct / 100));
    return { price, fromFallback: false, priceZero: price === 0 };
  }
  return { price: p.price_gross, fromFallback: true, priceZero: p.price_gross === 0 };
}

// ── Field ─────────────────────────────────────────────────────────────────────

/**
 * `text_fields` key of the margin field, from the env value: `75` or `extra_field_75` →
 * `extra_field_75`. Unset/empty → null (manual margins off, env markup for every product).
 * Anything else throws — a wrong ID must stop the run, not silently price from env.
 */
export function marginFieldKey(envValue: string | undefined): string | null {
  const v = (envValue ?? '').trim();
  if (v === '') return null;
  const m = /^(?:extra_field_)?(\d+)$/.exec(v);
  if (!m) throw new Error(`${MARGIN_FIELD_ENV}="${v}" is not a BL extra field ID (expected a number, e.g. 75)`);
  return `extra_field_${m[1]}`;
}

/**
 * Raw value of the margin field in a product's `text_fields` (getInventoryProductsData).
 * The plain key wins; otherwise a single language variant (`extra_field_75|pl`) is used.
 * Integration-specific overrides (`…|pl|<source>`) are never read.
 */
export function readMarginRaw(textFields: unknown, key: string): unknown {
  if (!textFields || typeof textFields !== 'object' || Array.isArray(textFields)) return undefined;
  const tf = textFields as Record<string, unknown>;
  if (key in tf) return tf[key];
  const langKeys = Object.keys(tf).filter((k) => new RegExp(`^${key}\\|[a-z]{2}$`).test(k));
  return langKeys.length === 1 ? tf[langKeys[0]] : undefined;
}

export type MarginParse =
  | { kind: 'empty' }
  | { kind: 'ok'; pct: number }
  | { kind: 'invalid'; raw: string };

/**
 * „45”, „45%”, „45,5”, „ 45 % ” → 45 / 45.5. Empty (missing, null, whitespace) → empty.
 * Not a plain decimal number, or outside 0–200 → invalid.
 */
export function parseMarginValue(raw: unknown): MarginParse {
  if (raw === undefined || raw === null) return { kind: 'empty' };
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= MARGIN_MIN_PCT && raw <= MARGIN_MAX_PCT
      ? { kind: 'ok', pct: raw }
      : { kind: 'invalid', raw: String(raw) };
  }
  if (typeof raw !== 'string') return { kind: 'invalid', raw: JSON.stringify(raw) ?? String(raw) };
  const s = raw.trim();
  if (s === '') return { kind: 'empty' };
  const m = /^(\d+(?:[.,]\d+)?)\s*%?$/.exec(s);
  if (!m) return { kind: 'invalid', raw: s };
  const pct = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(pct) || pct < MARGIN_MIN_PCT || pct > MARGIN_MAX_PCT) return { kind: 'invalid', raw: s };
  return { kind: 'ok', pct };
}

export interface MarginChoice {
  pct: number;
  source: 'field' | 'env';
  /** the field's value when it was set but rejected (env used instead) */
  rejected?: string;
}

/** The margin to price with: the product's field when valid, else the wholesaler's env markup. */
export function chooseMargin(raw: unknown, envPct: number): MarginChoice {
  const parsed = parseMarginValue(raw);
  if (parsed.kind === 'ok') return { pct: parsed.pct, source: 'field' };
  if (parsed.kind === 'invalid') return { pct: envPct, source: 'env', rejected: parsed.raw };
  return { pct: envPct, source: 'env' };
}

/**
 * The selling price import and sync write for one BL record: the record's „Marża %” field when
 * valid, else the env markup (scripts/audit-import.ts compares BL against this).
 */
export function expectedSalePrice(
  p: Pick<NormalizedProduct, 'price_purchase' | 'price_gross'>,
  envPct: number,
  fieldRaw: unknown,
): { price: number; fromFallback: boolean; margin: MarginChoice } {
  const margin = chooseMargin(fieldRaw, envPct);
  const { price, fromFallback } = computeSellingPrice(p, margin.pct);
  return { price, fromFallback, margin };
}

/** BL selling price vs the expected one — missing or more than 1 grosz apart. */
export function salePriceDiffers(sale: number | null, expected: number): boolean {
  return sale === null || Math.abs(sale - expected) > 0.01;
}

// ── Log ───────────────────────────────────────────────────────────────────────

const WARN_LINES = 50;

/** Counters and warnings for one run. `warn` lines carry the BL product ID. */
export class MarginTally {
  field = 0;
  env = 0;
  rejected = 0;
  private warned = 0;

  constructor(private readonly warn: (line: string) => void) {}

  note(blId: number | undefined, choice: MarginChoice): void {
    if (choice.source === 'field') { this.field++; return; }
    this.env++;
    if (choice.rejected === undefined) return;
    this.rejected++;
    if (this.warned++ < WARN_LINES) {
      this.warn(`[warn] margin field: BL product ${blId ?? '?'} has "${choice.rejected.slice(0, 40)}" — not a number ${MARGIN_MIN_PCT}–${MARGIN_MAX_PCT}, env markup ${choice.pct}% used`);
    }
  }

  summary(): string {
    const more = this.rejected > WARN_LINES ? ` (first ${WARN_LINES} listed above)` : '';
    return `manual margin: ${this.field} products priced from the field, ${this.rejected} field values rejected${more}, ${this.env} on env markup`;
  }
}
