/**
 * Pure helpers of the import audit (HA-2.37) — scripts/audit-import.ts does the I/O.
 *
 *   name text   — decodeEntities, foldText, normalizeName, nameKey, nameIssues
 *   duplicates  — duplicateCandidates: products of a catalogue that look like one good
 *                 (same producer + normalized name) but sit in separate records
 *   variants    — extractVariantAttrs, variantGroupCandidates: separate records that differ
 *                 in exactly one parameter (calibre, diameter, magnification, size)
 *   records     — recordSuppliers: which suppliers a BaseLinker record belongs to
 *   import log  — parseJournalLine, nightKey, summarizeRunLog: the run-bl.sh journal and run logs
 *   output      — redactSecrets, toCsv, pickRows
 *
 * Nothing here merges, writes or calls BaseLinker: candidates are lists for a human to judge.
 */

import { SKU_PREFIX, SUPPLIERS, eanKey, supplierSkuParam, type Supplier } from './bl-match-key';

// ── Name text ─────────────────────────────────────────────────────────────────

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '',
  oacute: 'ó', Oacute: 'Ó', eacute: 'é', aacute: 'á', uuml: 'ü', ouml: 'ö', auml: 'ä',
  Uuml: 'Ü', Ouml: 'Ö', Auml: 'Ä', szlig: 'ß',
  ndash: '–', mdash: '—', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', sbquo: '‚',
  laquo: '«', raquo: '»', hellip: '…', middot: '·', bull: '•',
  deg: '°', times: '×', plusmn: '±', micro: 'µ', sup2: '²', sup3: '³',
  frac12: '½', frac14: '¼', frac34: '¾', reg: '®', trade: '™', copy: '©',
};

const ENTITY_RE = /&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi;

/** HTML entities → characters (two passes, so `&amp;oacute;` ends as `ó`). Unknown names stay. */
export function decodeEntities(s: string): string {
  const once = (text: string) =>
    text.replace(ENTITY_RE, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
      }
      return NAMED_ENTITIES[e] ?? m;
    });
  return once(once(s));
}

/**
 * Lower-case comparable text: entities decoded, tags dropped, Polish letters folded to ASCII,
 * decimal comma → dot, inch marks → `in`, `×` → `x`.
 */
export function foldText(s: string): string {
  return decodeEntities(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[łŁ]/g, (c) => (c === 'ł' ? 'l' : 'L'))
    .replace(/[øØ]/g, ' fi ')
    .replace(/×/g, 'x')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1.$2')
    // `1"` / `1 cal` is an inch; `22 cal` is a calibre and stays
    .replace(/(\d+(?:\.\d+)?)\s*("|”|''|cal\b)/g, (m, n: string, mark: string) =>
      (mark === 'cal' && parseFloat(n) >= 10 ? m : `${n}in `));
}

const UNIT_JOIN = /(\d)\s+(mm|cm|m|g|kg|j|ml|l|in|szt|gr|ga|mah|lm)\b/g;

/**
 * Folded text as space-separated tokens of [a-z0-9]; `.`, `-` and `/` survive only between
 * digits (`4.5`, `3-9x40`, `12/76`), a number and its unit are joined (`4.5 mm` → `4.5mm`),
 * `4 x 32` → `4x32`.
 */
export function tokenString(s: string): string {
  return foldText(s)
    .replace(/(\d)\s*x\s*(\d)/g, '$1x$2')
    .replace(/(\d)\s*([-/])\s*(\d)/g, '$1$2$3')
    .replace(/[^a-z0-9./-]+/g, ' ')
    .replace(/(?<!\d)[./-]|[./-](?!\d)/g, ' ')
    .replace(UNIT_JOIN, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS: ReadonlySet<string> = new Set([
  'i', 'z', 'ze', 'w', 'we', 'na', 'do', 'dla', 'oraz', 'od', 'po', 'pod', 'o',
  'the', 'of', 'and', 'with', 'for', 'a',
]);

/** Producer as a comparable string (`'5.11 Tactical'` → `'5.11 tactical'`); '' when missing. */
export function foldBrand(brand: string | null | undefined): string {
  return tokenString(brand ?? '');
}

function brandTokens(brand: string | null | undefined): Set<string> {
  return new Set(foldBrand(brand).split(' ').filter(Boolean));
}

/** Sorted, de-duplicated tokens of a name without stopwords and without the producer's words. */
export function normalizeName(name: string, brand?: string | null): string {
  const skip = brandTokens(brand);
  const tokens = tokenString(name).split(' ').filter((t) => t && !STOPWORDS.has(t) && !skip.has(t));
  return [...new Set(tokens)].sort().join(' ');
}

/** Duplicate key: producer + normalized name. */
export function nameKey(name: string, brand?: string | null): string {
  return `${foldBrand(brand)}|${normalizeName(name, brand)}`;
}

export type NameIssue =
  | 'html_entity'
  | 'html_tag'
  | 'mojibake'
  | 'control_char'
  | 'whitespace'
  | 'all_caps'
  | 'too_short'
  | 'too_long';

/** What is wrong with a product name as it would be shown in the shop. */
export function nameIssues(name: string): NameIssue[] {
  const out: NameIssue[] = [];
  if (/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i.test(name)) out.push('html_entity');
  if (/<\/?[a-z][^>]*>/i.test(name)) out.push('html_tag');
  if (/�|[ÃÄÅ][\u0080-¿‘-›]/.test(name)) out.push('mojibake');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(name)) out.push('control_char');
  if (/\s{2,}|^\s|\s$|[\t\r\n]/.test(name)) out.push('whitespace');
  const letters = name.replace(/[^\p{L}]/gu, '');
  if (letters.length >= 12 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) out.push('all_caps');
  if (name.trim().length < 5) out.push('too_short');
  if (name.length > 200) out.push('too_long');
  return out;
}

// ── Duplicate candidates ─────────────────────────────────────────────────────

export interface CatalogueItem {
  /** the record this item stands for (e.g. BaseLinker product id) */
  ref: string;
  supplier: Supplier | 'other';
  brand: string;
  name: string;
  ean: string;
}

export type EanRelation = 'ean_missing' | 'ean_differs' | 'ean_same';

export interface DuplicateGroup<T extends CatalogueItem> {
  key: string;
  items: T[];
  suppliers: string[];
  ean: EanRelation;
}

/**
 * Records that look like one good: same producer + normalized name, at least two separate
 * records. `crossSupplier: true` keeps groups spanning ≥ 2 suppliers; `false` keeps groups
 * inside one supplier. A key needs ≥ 2 name tokens (3 when the producer is unknown), so short
 * generic names do not group.
 */
export function duplicateCandidates<T extends CatalogueItem>(
  items: readonly T[],
  opts: { crossSupplier: boolean },
): DuplicateGroup<T>[] {
  const byKey = new Map<string, T[]>();
  for (const it of items) {
    const brand = foldBrand(it.brand);
    const norm = normalizeName(it.name, it.brand);
    const tokens = norm ? norm.split(' ').length : 0;
    if (tokens < (brand ? 2 : 3)) continue;
    const key = `${brand}|${norm}`;
    const list = byKey.get(key);
    if (list) list.push(it);
    else byKey.set(key, [it]);
  }
  const out: DuplicateGroup<T>[] = [];
  for (const [key, list] of byKey) {
    if (new Set(list.map((i) => i.ref)).size < 2) continue;
    const suppliers = [...new Set(list.map((i) => i.supplier))].sort();
    if (opts.crossSupplier ? suppliers.length < 2 : suppliers.length !== 1) continue;
    // GTIN-14 key (HA-2.38): `0192687280759` and `192687280759` are the same EAN; invalid = missing
    const eans = list.map((i) => eanKey(i.ean) ?? '');
    const ean: EanRelation = eans.some((e) => !e) ? 'ean_missing' : new Set(eans).size > 1 ? 'ean_differs' : 'ean_same';
    out.push({ key, items: list, suppliers, ean });
  }
  return out.sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key));
}

// ── Variant candidates ───────────────────────────────────────────────────────

export type VariantKind = 'kaliber' | 'średnica/wymiar' | 'powiększenie' | 'rozmiar';

export interface VariantAttr {
  kind: VariantKind;
  value: string;
}

const OPTICS = /lunet|lornet|monokul|celownik|kolimator|noktowiz|termowiz|teleskop|spotting|scope/;
const BALLISTIC = /srut|wiatrow|kulk|diabolo|pellet|kaliber|kal |lufa|pistolet|karabin|rewolwer|naboj|amunic|bb /;
const AIRGUN_CALIBRES = new Set(['4.5', '4.4', '5.5', '5', '5.0', '6.35', '6', '6.0', '5.6', '9', '7.62', '8', '5.56']);
const UPPER_SIZE = /(^|[\s,(/-])(XXS|XS|S|M|L|XL|XXL|XXXL|[2-5]XL)(?=$|[\s,)/-])/g;

/**
 * Splits a name into its "base" (sorted tokens, producer and stopwords removed) and the
 * variant parameters it carries: calibre (`4.5mm` next to śrut/wiatrówka, `9x19`, `12/76`,
 * `22 lr`, `kal 5.5`), diameter or dimension (`30mm`, `1in`, `fi 25`, `40cm`), magnification
 * (`3-9x40`, `10x42` on optics), size (`rozmiar 42`, upper-case `XL`).
 */
export function extractVariantAttrs(name: string, brand?: string | null): { base: string; attrs: VariantAttr[] } {
  const attrs: VariantAttr[] = [];
  // Upper-case letter sizes are recognisable only before folding (lower-case "m"/"l" are units)
  const decoded = decodeEntities(name).replace(UPPER_SIZE, (_m, lead: string, size: string) => {
    attrs.push({ kind: 'rozmiar', value: size.toLowerCase() });
    return `${lead} `;
  });
  let s = ` ${tokenString(decoded)} `;
  const optics = OPTICS.test(s);
  const ballistic = BALLISTIC.test(s);
  const take = (re: RegExp, kind: VariantKind | ((m: RegExpExecArray) => VariantKind), value: (m: RegExpExecArray) => string) => {
    s = s.replace(re, (...args) => {
      const m = args.slice(0, -2) as unknown as RegExpExecArray;
      attrs.push({ kind: typeof kind === 'function' ? kind(m) : kind, value: value(m) });
      return ' ';
    });
  };

  take(/ (?:rozmiar|rozm|size) (\d{2,3}(?:\/\d{2,3})?|xxs|xs|s|m|l|xl|xxl|xxxl|[2-5]xl)(?= )/g, 'rozmiar', (m) => m[1]);
  take(/ (\d{1,2}(?:\.\d+)?-\d{1,2}(?:\.\d+)?x\d{2,3})(?= )/g, 'powiększenie', (m) => m[1]);
  take(/ (\d{1,2}(?:\.\d+)?)x(\d{2,3})(r?)(?= )/g,
    (m) => (optics && Number(m[2]) >= 18 && Number(m[2]) <= 80 && !m[3] ? 'powiększenie' : 'kaliber'),
    (m) => `${m[1]}x${m[2]}${m[3]}`);
  take(/ (10|12|16|20|24|28|32|36|410)\/(\d{2})(?= )/g, 'kaliber', (m) => `${m[1]}/${m[2]}`);
  take(/ (10|12|16|20|24|28|32|36|410)ga(?= )/g, 'kaliber', (m) => `${m[1]}ga`);
  take(/ (?:kal|kaliber|cal) (\d+(?:\.\d+)?)(?:mm)?(?= )/g, 'kaliber', (m) => m[1]);
  take(/ (\d{2,3}(?:-\d{2})?|\d\.\d) (lr|wmr|hmr|win|rem|acp|sw|s w|mag|magnum|spl|special|auto|blk|creedmoor|lapua|lfb|pak|knall|cal)(?= )/g,
    'kaliber', (m) => `${m[1]} ${m[2]}`);
  take(/ (\d+(?:\.\d+)?)mm(?= )/g,
    (m) => (ballistic && AIRGUN_CALIBRES.has(m[1]) ? 'kaliber' : 'średnica/wymiar'), (m) => `${m[1]}mm`);
  take(/ fi (\d+(?:\.\d+)?)(?:mm)?(?= )/g, 'średnica/wymiar', (m) => `fi ${m[1]}`);
  take(/ (\d+(?:\.\d+)?)(cm|in)(?= )/g, 'średnica/wymiar', (m) => `${m[1]}${m[2]}`);

  const skip = brandTokens(brand);
  const base = [...new Set(s.trim().split(/\s+/).filter((t) => t && !STOPWORDS.has(t) && !skip.has(t)))].sort().join(' ');
  return { base, attrs };
}

export interface VariantItem extends CatalogueItem {
  hydraNum: string | null;
  /** effective permit flag (permit ∧ ¬permit_off) */
  permit: boolean;
  /** pickup-only (permit, age_18, or Hydra section 01/02) */
  pickup: boolean;
}

export interface VariantGroup<T extends VariantItem> {
  key: string;
  kind: VariantKind;
  values: string[];
  items: T[];
  categories: string[];
  mixedPermit: boolean;
  mixedPickup: boolean;
}

/**
 * Separate records that could be one product with variants: same producer and base name,
 * values differing in exactly one parameter kind (≥ 2 distinct non-empty values of it), every
 * other parameter equal. A base needs ≥ 2 tokens. Groups are flagged when their members mix
 * the permit flag or pickup-only — those cannot simply become variants of one product.
 */
export function variantGroupCandidates<T extends VariantItem>(items: readonly T[]): VariantGroup<T>[] {
  const byKey = new Map<string, Array<{ it: T; attrs: Map<VariantKind, string> }>>();
  for (const it of items) {
    const { base, attrs } = extractVariantAttrs(it.name, it.brand);
    if (attrs.length === 0 || base.split(' ').filter(Boolean).length < 2) continue;
    const map = new Map<VariantKind, string>();
    for (const a of attrs) map.set(a.kind, map.has(a.kind) ? `${map.get(a.kind)} ${a.value}` : a.value);
    const key = `${foldBrand(it.brand)}|${base}`;
    const list = byKey.get(key);
    if (list) list.push({ it, attrs: map });
    else byKey.set(key, [{ it, attrs: map }]);
  }
  const out: VariantGroup<T>[] = [];
  for (const [key, list] of byKey) {
    if (new Set(list.map((x) => x.it.ref)).size < 2) continue;
    const kinds = new Set<VariantKind>();
    for (const x of list) for (const k of x.attrs.keys()) kinds.add(k);
    const differing = [...kinds].filter((k) => new Set(list.map((x) => x.attrs.get(k) ?? '')).size > 1);
    if (differing.length !== 1) continue;
    const kind = differing[0];
    const values = [...new Set(list.map((x) => x.attrs.get(kind) ?? '').filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (values.length < 2) continue;
    const members = list.map((x) => x.it);
    out.push({
      key,
      kind,
      values,
      items: members,
      categories: [...new Set(members.map((m) => m.hydraNum ?? '00'))].sort(),
      mixedPermit: new Set(members.map((m) => m.permit)).size > 1,
      mixedPickup: new Set(members.map((m) => m.pickup)).size > 1,
    });
  }
  return out.sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key));
}

// ── Which suppliers a BaseLinker record belongs to ───────────────────────────

export interface RecordSuppliers {
  /** supplier whose prefix the `sku` carries (the creator), null for a foreign/bare SKU */
  creator: Supplier | null;
  /** every supplier with a code on the record: the creator plus `SKU <Supplier>` parameters */
  members: Supplier[];
  /** bare supplier code per member (parameter first, else the creator's SKU without prefix) */
  codes: Partial<Record<Supplier, string>>;
}

export function recordSuppliers(sku: string | null | undefined, features: Readonly<Record<string, string>> | null | undefined): RecordSuppliers {
  const s = (sku ?? '').trim();
  const creator = SUPPLIERS.find((sup) => s.startsWith(`${SKU_PREFIX[sup]}-`)) ?? null;
  const codes: Partial<Record<Supplier, string>> = {};
  for (const sup of SUPPLIERS) {
    const v = String(features?.[supplierSkuParam(sup)] ?? '').trim();
    if (v) codes[sup] = v;
  }
  if (creator && !codes[creator]) codes[creator] = s.slice(SKU_PREFIX[creator].length + 1);
  return { creator, members: SUPPLIERS.filter((sup) => codes[sup] !== undefined), codes };
}

// ── Where a data gap in BaseLinker comes from (section F) ────────────────────

/**
 * `feed` — a matched feed product has the same gap; `import` — the feed has the data and at least
 * one matched product passes the assortment filter, so the import writes this record and should
 * have carried it; `outside_filter` — the feed has the data but no matched product passes the
 * filter, so the import never touches the record (the sync writes stock and price only, HA-2.38
 * option C); `orphan` — no product of today's feeds maps onto the record.
 */
export type GapSource = 'feed' | 'import' | 'outside_filter' | 'orphan';

export function gapSource<T extends { admitted: boolean }>(items: readonly T[], feedHasGap?: (i: T) => boolean): GapSource {
  if (items.length === 0) return 'orphan';
  if (feedHasGap && items.some(feedHasGap)) return 'feed';
  return items.some((i) => i.admitted) ? 'import' : 'outside_filter';
}

export const GAP_SOURCE_LABEL: Record<GapSource, string> = {
  feed: 'feed',
  import: 'import — przyjęte',
  outside_filter: 'poza filtrem',
  orphan: 'brak w feedzie',
};

/**
 * A record is shared when ≥ 2 suppliers have it: as recorded members (SKU prefix, `SKU <Hurtownia>`
 * parameters) or because their feeds match it today. A sync writes onto every record its key matches,
 * so parameters alone (written by the import only) miss records another supplier's sync also writes
 * (HA-2.38 price diagnosis).
 */
export function isSharedRecord(members: readonly Supplier[], matchedBy: readonly Supplier[]): boolean {
  return new Set([...members, ...matchedBy]).size > 1;
}

// ── run-bl.sh journal and run logs ───────────────────────────────────────────

export type JournalEvent = 'START' | 'END' | 'SKIP' | 'STOP' | 'ERROR' | 'WARN' | 'CHECK';

export interface JournalEntry {
  /** wall-clock time as written (Polish time), `YYYY-MM-DD HH:MM:SS` */
  at: string;
  supplier: Supplier;
  mode: 'import' | 'sync';
  pid: number;
  event: JournalEvent;
  exit?: number;
  durationS?: number;
  result?: string;
  stoppedBy?: string;
  killedBySignal?: number;
  log?: string;
  standIn?: boolean;
}

const JOURNAL_RE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})[+-]\d{4} (kolba|sharg|spechurt) (import|sync) pid=(\d+) (START|END|SKIP|STOP|ERROR|WARN|CHECK)\b(.*)$/;

/** One line of `run-bl-<YYYY-MM>.log`, or null for anything else. */
export function parseJournalLine(line: string): JournalEntry | null {
  const m = JOURNAL_RE.exec(line.trimEnd());
  if (!m) return null;
  const rest = m[7];
  const e: JournalEntry = {
    at: `${m[1]} ${m[2]}`,
    supplier: m[3] as Supplier,
    mode: m[4] as 'import' | 'sync',
    pid: Number(m[5]),
    event: m[6] as JournalEvent,
  };
  const num = (re: RegExp) => { const x = re.exec(rest); return x ? Number(x[1]) : undefined; };
  e.exit = num(/\bexit=(\d+)/);
  e.durationS = num(/\bduration=(\d+)s/);
  e.killedBySignal = num(/\bkilled-by-signal=(\d+)/);
  e.stoppedBy = /\bstopped-by=(\S+)/.exec(rest)?.[1];
  e.result = /\bresult="([^"]*)"/.exec(rest)?.[1];
  e.log = / log=(\S+)/.exec(rest)?.[1];
  e.standIn = /\bwhat=stand-in\b/.test(rest);
  return e;
}

/**
 * The night a run belongs to: its wall-clock time minus 12 h. Kolba's 22:20 import, Sharg's
 * 01:15 import and Spechurt's 06:35 import of one cron cycle share one key.
 */
export function nightKey(at: string): string {
  const [d, t] = at.split(' ');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, mi, se] = t.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, da, h - 12, mi, se)).toISOString().slice(0, 10);
}

export interface RunLogSummary {
  receivedMb: number[];
  parsed: number[];
  emptyFeedWarnings: number;
  blockedWaits: number;
  productErrors: number;
}

/** Numbers only, from one run log of the import — no line of it is copied. */
export function summarizeRunLog(text: string): RunLogSummary {
  const all = (re: RegExp) => [...text.matchAll(re)].map((m) => Number(m[1]));
  return {
    receivedMb: all(/^Received ([\d.]+) MB/gm),
    parsed: all(/^Parsed (\d+) products/gm),
    emptyFeedWarnings: (text.match(/^\[warn\] empty feed/gm) ?? []).length,
    blockedWaits: (text.match(/token blocked \(rate limit\)/g) ?? []).length,
    productErrors: (text.match(/^ {2}⚠ /gm) ?? []).length,
  };
}

export type RunVerdict = 'ok' | 'ok_with_errors' | 'empty_feed' | 'failed' | 'stopped' | 'no_result';

/** Classifies one END line. */
export function runVerdict(e: JournalEntry): RunVerdict {
  if (e.stoppedBy || e.killedBySignal !== undefined) return 'stopped';
  if (e.result?.startsWith('[fatal] empty feed')) return 'empty_feed';
  if ((e.exit ?? 1) !== 0) return 'failed';
  const r = e.result ?? 'none';
  const errors = /(\d+) errors/.exec(r);
  if (r.startsWith('Import done:')) return errors && Number(errors[1]) > 0 ? 'ok_with_errors' : 'ok';
  if (r.startsWith('Sync done:')) return 'ok';
  if (/^Matched 0 products/.test(r)) return 'ok_with_errors';
  return 'no_result';
}

// ── Output ───────────────────────────────────────────────────────────────────

/** Credentials and URLs never reach the report: `key=…`/`token=…`/`client=…` hidden, URLs reduced to `<url>`. */
export function redactSecrets(text: string): string {
  return text
    .replace(/https?:\/\/[^\s"'<>]+/gi, '<url>')
    .replace(/\b(key|token|client)=[^&\s"'<>]+/gi, '$1=<hidden>');
}

function csvCell(v: unknown): string {
  let s = redactSecrets(v === null || v === undefined ? '' : String(v)).replace(/[\r\n]+/g, ' ');
  if (/^[=+@]/.test(s)) s = `'${s}`;
  return /[",;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

/** At most `max` rows, taken round-robin across groups (e.g. suppliers), so every group shows. */
export function pickRows<T>(rows: readonly T[], max: number, groupOf: (r: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const g = groupOf(r);
    const list = groups.get(g);
    if (list) list.push(r);
    else groups.set(g, [r]);
  }
  const queues = [...groups.values()];
  const out: T[] = [];
  for (let i = 0; out.length < max && queues.some((q) => i < q.length); i++) {
    for (const q of queues) {
      if (i < q.length && out.length < max) out.push(q[i]);
    }
  }
  return out;
}
