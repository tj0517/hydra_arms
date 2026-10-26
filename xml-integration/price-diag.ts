/**
 * Pure helpers of the price diagnosis (HA-2.38) — scripts/diag-prices.ts does the I/O.
 *
 *   feed text   — feedElements, sanitizeFragment, shargSizes: the raw feed element of a product
 *                 (sizes, prices and their order as the supplier sent them), without descriptions,
 *                 images or URLs
 *   EAN         — gtin14Key: comparison key used only to count look-alike EANs here; the import's
 *                 own normalization is a separate step of HA-2.38
 *   price check — itemFlags, classifyRecord, deltaBucket: why a BL record's prices differ from
 *                 what the feed and the sync say
 *   sync log    — summarizeSyncLog: counters of one `<supplier>-sync-*.log`
 *
 * Nothing here calls BaseLinker or writes anything.
 */

import type { Supplier } from './bl-match-key';

const round2 = (n: number) => Math.round(n * 100) / 100;
const same = (a: number | null, b: number | null) => (a === null || b === null ? a === b : Math.abs(a - b) <= 0.01);

// ── EAN ───────────────────────────────────────────────────────────────────────

/** Digits only, left-padded to 14 — `0192687280759` and `192687280759` give one key. null when empty or longer than 14. */
export function gtin14Key(ean: string | null | undefined): string | null {
  const d = String(ean ?? '').replace(/\D/g, '');
  if (!d || d.length > 14 || /^0+$/.test(d)) return null;
  return d.padStart(14, '0');
}

// ── Raw feed elements ─────────────────────────────────────────────────────────

const ELEMENT: Record<Supplier, string> = { sharg: 'product', kolba: 'produkt', spechurt: 'produkt' };

/** Elements whose content never goes into the output: descriptions, images, long texts. */
const DROP: Record<Supplier, readonly string[]> = {
  sharg: ['description', 'images', 'icons', 'parameters', 'card'],
  kolba: ['dlugi_opis', 'krotki_opis', 'opis', 'zdjecia'],
  spechurt: ['dlugi_opis', 'krotki_opis', 'opis', 'zdjecia'],
};

function elementId(supplier: Supplier, el: string): string | null {
  if (supplier === 'sharg') return /^<product\b[^>]*?\sid="([^"]*)"/.exec(el)?.[1] ?? null;
  const m = /<id>\s*(?:<!\[CDATA\[)?\s*([^<\]]*?)\s*(?:\]\]>)?\s*<\/id>/.exec(el);
  return m ? m[1] : null;
}

/**
 * Raw text of the feed elements (`<product>` for Sharg, `<produkt>` for Kolba and Spechurt) whose id
 * is in `ids`, keyed by that id, in feed order. One pass over the document.
 */
export function feedElements(xml: string, supplier: Supplier, ids: ReadonlySet<string>): Map<string, string> {
  const tag = ELEMENT[supplier];
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const out = new Map<string, string>();
  if (ids.size === 0) return out;
  let pos = 0;
  for (;;) {
    let start = xml.indexOf(open, pos);
    // `<products` / `<produkty` are the wrappers, not the element
    while (start >= 0 && !/[\s>]/.test(xml[start + open.length] ?? '')) start = xml.indexOf(open, start + open.length);
    if (start < 0) break;
    const end = xml.indexOf(close, start);
    if (end < 0) break;
    const el = xml.slice(start, end + close.length);
    const id = elementId(supplier, el);
    if (id !== null && ids.has(id) && !out.has(id)) out.set(id, el);
    pos = end + close.length;
  }
  return out;
}

/** URLs and `key=` / `token=` / `client=` values out (same rule as the audit's redactSecrets). */
function redact(text: string): string {
  return text
    .replace(/https?:\/\/[^\s"'<>]+/gi, '<url>')
    .replace(/\b(key|token|client)=[^&\s"'<>]+/gi, '$1=<hidden>');
}

/** A feed element safe to paste: descriptions and images dropped, URLs redacted, blank lines gone, capped. */
export function sanitizeFragment(el: string, supplier: Supplier, maxChars = 8000): string {
  let s = el;
  for (const t of DROP[supplier]) {
    s = s.replace(new RegExp(`<${t}\\b[^>]*/>`, 'g'), `<${t}/>`);
    s = s.replace(new RegExp(`<${t}\\b[^>]*>[\\s\\S]*?</${t}>`, 'g'), `<${t}>…</${t}>`);
  }
  s = redact(s).split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== '').join('\n');
  return s.length > maxChars ? `${s.slice(0, maxChars)}\n… (${s.length - maxChars} more characters cut)` : s;
}

export interface ShargSizeRow {
  /** position in the feed, 0 = the size the connector reads the price from */
  pos: number;
  id: string;
  name: string;
  codeExternal: string;
  /** EAN exactly as written in the feed — leading zeros kept */
  codeProducer: string;
  weight: string;
  priceGross: string;
  priceNet: string;
  srpGross: string;
  stock: number;
}

const attr = (tag: string, name: string) => new RegExp(`\\s(?:\\w+:)?${name}="([^"]*)"`).exec(tag)?.[1] ?? '';

/** The `<size>` entries of one raw Sharg `<product>`, in feed order, attributes as text. */
export function shargSizes(el: string): ShargSizeRow[] {
  const rows: ShargSizeRow[] = [];
  const re = /<size\b([^>]*?)(\/>|>([\s\S]*?)<\/size>)/g;
  for (let m = re.exec(el); m; m = re.exec(el)) {
    const head = ` ${m[1]}`;
    const body = m[3] ?? '';
    const price = /<price\b[^>]*>/.exec(body)?.[0] ?? '';
    const srp = /<srp\b[^>]*>/.exec(body)?.[0] ?? '';
    const stock = [...body.matchAll(/<stock\b[^>]*\squantity="([^"]*)"/g)].reduce((s, x) => s + (Number(x[1]) || 0), 0);
    rows.push({
      pos: rows.length,
      id: attr(head, 'id'),
      name: attr(head, 'name'),
      codeExternal: attr(head, 'code_external'),
      codeProducer: attr(head, 'code_producer'),
      weight: attr(head, 'weight'),
      priceGross: attr(price, 'gross'),
      priceNet: attr(price, 'net'),
      srpGross: attr(srp, 'gross'),
      stock,
    });
  }
  return rows;
}

// ── Price check of one BL record ──────────────────────────────────────────────

export interface PriceItem {
  /** feed position (0-based) */
  pos: number;
  sku: string;
  pricePurchase: number | null;
  priceGross: number;
  /** selling price for this item alone, with the record's margin (as the audit computes it) */
  expectedSale: number;
  fromFallback: boolean;
}

export interface RecordPrices {
  shared: boolean;
  /** feed items of this supplier that findBLMatch maps onto the record, in feed order */
  items: PriceItem[];
  blSale: number | null;
  blPurchase: number | null;
  /** what planSync would write now; null = not written (no purchase price / sale skipped) */
  planSale: number | null;
  planPurchase: number | null;
  marginPct: number;
  /** BASELINKER_PRICE_GROUP_PURCHASE is set */
  purchaseGroup: boolean;
}

export interface ItemFlag {
  saleDiff: boolean;
  purchaseDiff: boolean;
}

/** The audit's per-item comparison (scripts/audit-import.ts, section A). */
export function itemFlags(r: RecordPrices, i: PriceItem): ItemFlag {
  return {
    saleDiff: r.blSale === null || Math.abs(r.blSale - i.expectedSale) > 0.01,
    purchaseDiff: r.purchaseGroup && i.pricePurchase !== null && i.pricePurchase > 0
      && (r.blPurchase === null || Math.abs(r.blPurchase - round2(i.pricePurchase)) > 0.01),
  };
}

export type PriceCause =
  | 'wspolny'
  | 'wiele_pozycji_bl_jak_sync'
  | 'wiele_pozycji_bl_inaczej'
  | 'fallback_brak_zakupu_w_feedzie'
  | 'brak_zakupu_w_BL'
  | 'zakup_inny_para_spojna'
  | 'zakup_inny_para_niespojna'
  | 'zakup_zgodny_sprzedaz_inna'
  | 'inne';

export const CAUSE_LABEL: Record<PriceCause, string> = {
  wspolny: 'rekord wspólny kilku hurtowni (cenę pisze hurtownia, która ostatnia robiła sync)',
  wiele_pozycji_bl_jak_sync: 'kilka pozycji feedu → jeden rekord; BL = to, co sync zapisuje (wygrywa ostatnia pozycja)',
  wiele_pozycji_bl_inaczej: 'kilka pozycji feedu → jeden rekord; BL ≠ to, co sync zapisałby teraz',
  fallback_brak_zakupu_w_feedzie: 'jedna pozycja bez ceny zakupu w feedzie (sprzedaż = cena brutto z feedu)',
  brak_zakupu_w_BL: 'jedna pozycja; grupa cen zakupu w BL pusta',
  zakup_inny_para_spojna: 'jedna pozycja; zakup w BL ≠ feed, sprzedaż w BL = zakup w BL × narzut (stara spójna para — sync jej nie nadpisał albo feed zmienił się po syncu)',
  zakup_inny_para_niespojna: 'jedna pozycja; zakup w BL ≠ feed, sprzedaż w BL nie wynika z zakupu w BL',
  zakup_zgodny_sprzedaz_inna: 'jedna pozycja; zakup zgodny, sprzedaż różna (narzut / pole „Marża %”)',
  inne: 'inne',
};

export interface RecordVerdict {
  /** at least one item differs the way the audit counts it */
  flagged: boolean;
  /** items the audit would count (sale or purchase differs) */
  flaggedItems: number;
  saleItems: number;
  purchaseItems: number;
  cause: PriceCause | null;
  /** (BL purchase − feed purchase) / feed purchase, single-item records only */
  purchaseDelta: number | null;
  /** (BL sale − expected sale) / expected sale, single-item records only */
  saleDelta: number | null;
}

export function classifyRecord(r: RecordPrices): RecordVerdict {
  const flags = r.items.map((i) => itemFlags(r, i));
  const saleItems = flags.filter((f) => f.saleDiff).length;
  const purchaseItems = flags.filter((f) => f.purchaseDiff).length;
  const flaggedItems = flags.filter((f) => f.saleDiff || f.purchaseDiff).length;
  const v: RecordVerdict = { flagged: flaggedItems > 0, flaggedItems, saleItems, purchaseItems, cause: null, purchaseDelta: null, saleDelta: null };
  if (!v.flagged) return v;

  const one = r.items.length === 1 ? r.items[0] : null;
  if (one) {
    if (one.pricePurchase && one.pricePurchase > 0 && r.blPurchase !== null) v.purchaseDelta = (r.blPurchase - round2(one.pricePurchase)) / round2(one.pricePurchase);
    if (r.blSale !== null && one.expectedSale > 0) v.saleDelta = (r.blSale - one.expectedSale) / one.expectedSale;
  }

  if (r.shared) v.cause = 'wspolny';
  else if (r.items.length > 1) {
    const salesMatch = r.planSale === null || same(r.blSale, r.planSale);
    const purchaseMatch = !r.purchaseGroup || r.planPurchase === null || same(r.blPurchase, r.planPurchase);
    v.cause = salesMatch && purchaseMatch ? 'wiele_pozycji_bl_jak_sync' : 'wiele_pozycji_bl_inaczej';
  } else if (one!.fromFallback) v.cause = 'fallback_brak_zakupu_w_feedzie';
  else if (flags[0].purchaseDiff && r.blPurchase === null) v.cause = 'brak_zakupu_w_BL';
  else if (flags[0].purchaseDiff) {
    const fromOldPurchase = r.blSale !== null && same(r.blSale, round2(r.blPurchase! * (1 + r.marginPct / 100)));
    v.cause = fromOldPurchase ? 'zakup_inny_para_spojna' : 'zakup_inny_para_niespojna';
  } else if (flags[0].saleDiff) v.cause = 'zakup_zgodny_sprzedaz_inna';
  else v.cause = 'inne';
  return v;
}

/** `|Δ|` bucket of a relative difference: ≤1%, 1–5%, 5–15%, 15–50%, >50%. */
export function deltaBucket(delta: number): string {
  const a = Math.abs(delta) * 100;
  if (a <= 1) return '≤1%';
  if (a <= 5) return '1–5%';
  if (a <= 15) return '5–15%';
  if (a <= 50) return '15–50%';
  return '>50%';
}

export const DELTA_BUCKETS = ['≤1%', '1–5%', '5–15%', '15–50%', '>50%'] as const;

// ── Sync run log ──────────────────────────────────────────────────────────────

export interface WriteLine {
  kind: 'stock' | 'prices';
  done: number;
  total: number;
  /** BL's `counter` — products it reports as updated */
  counter: number;
  warnings: number;
}

export interface SyncLogSummary {
  writes: WriteLine[];
  /** sum of `warnings` over the price lines */
  priceWarnings: number;
  /** sum of `counter` over the price lines vs products sent (`done` of the last line) */
  priceCounter: number;
  /** lines that look like the content of a BL warning (not just its count) */
  warningContentLines: number;
  /** the run's own summary lines, redacted, at most 40 */
  lines: string[];
}

const WRITE_RE = /^\s+(stock|prices)\s+(\d+)\/(\d+): (\d+) updated(?:, (\d+) warnings)?\s*$/;
const KEEP_RE = /^(?:\S.*\bpid=|Received |Parsed |\[sharg\] Defence|\s+\d+ products in BL|Reading the margin|\s+margin field read|Matched |\s+(?:stock|prices)\s+\d+\/|✓ Sync done|\s+manual margin|⚠|\[warn\]|\[error\]|\[fatal\]|run-bl)/;

export function summarizeSyncLog(text: string): SyncLogSummary {
  const writes: WriteLine[] = [];
  const lines: string[] = [];
  let warningContentLines = 0;
  for (const line of text.split('\n')) {
    const w = WRITE_RE.exec(line);
    if (w) {
      writes.push({ kind: w[1] as 'stock' | 'prices', done: Number(w[2]), total: Number(w[3]), counter: Number(w[4]), warnings: Number(w[5] ?? 0) });
    } else if (/warning/i.test(line)) warningContentLines++;
    if (KEEP_RE.test(line) && lines.length < 40) lines.push(redact(line.trimEnd()));
  }
  const prices = writes.filter((w) => w.kind === 'prices');
  return {
    writes,
    priceWarnings: prices.reduce((s, w) => s + w.warnings, 0),
    priceCounter: prices.reduce((s, w) => s + w.counter, 0),
    warningContentLines,
    lines,
  };
}
