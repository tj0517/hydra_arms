/**
 * Price diagnosis (HA-2.38, step 1) — READ-ONLY.
 *
 * Why does a BaseLinker record carry a purchase / selling price other than the supplier's feed?
 * For the products asked for (BL ids or feed SKUs) it writes, side by side:
 *   - the raw feed element (every size with its price, in feed order) — no description, images or URL;
 *   - what the connector makes of it (NormalizedProduct);
 *   - what the sync's key does with it: the index is built exactly as runSync builds it
 *     (bl-write.ts loadExistingProducts over getInventoryProductsList), findBLMatch, and planSync —
 *     the function that decides what the sync writes — run over the whole feed;
 *   - the BL record (prices in both groups, EAN, SKU, SKU parameters, stock, margin field);
 *   - how often the EAN occurs in the feed and in the BL index, as written and as a GTIN-14 key.
 * For the whole supplier: every matched record compared the way the audit compares it (HA-2.37,
 * section A), each mismatch put under one cause, with sign and size of the difference.
 * From the run logs: the latest `<supplier>-sync-*.log` — BL's counters and warning counts.
 *
 * Usage:
 *   npx tsx scripts/diag-prices.ts --supplier <kolba|sharg|spechurt> --out <dir>
 *     [--bl-ids 1,2,3] [--skus 5652,139] [--from-file <path>] [--logs <dir>]
 *     [--other-feeds=kolba,spechurt] [--other-from-file=<supplier>:<path>]…
 *
 *   --bl-ids    BL product ids to trace (comma-separated)
 *   --skus      feed SKUs (connector_sku, with or without the `SHARG-` prefix) to trace
 *   --out       directory for diag-<supplier>.md, diag-<supplier>.json, rozjazdy-<supplier>.csv
 *   --from-file read the feed from a local file instead of fetching it
 *   --logs      run-bl.sh log directory (default: ~/logs when it exists)
 *   --other-feeds  the other suppliers whose feeds are matched too (default: both others; empty =
 *               none): a record matched by ≥ 2 suppliers' feeds counts as shared (HA-2.38)
 *   --other-from-file  read one of those feeds from a local file (repeatable)
 *
 *   Smoke test without network or BaseLinker:
 *   BASELINKER_MOCK=true BASELINKER_INVENTORY_ID=35743 BASELINKER_PRICE_GROUP=23934 BASELINKER_MARKUP_SHARG=30 \
 *     npx tsx scripts/diag-prices.ts --supplier sharg --from-file xml-integration/samples/sharg_full_sample.xml --skus 139 --out <dir>
 *
 * Read-only by construction: BaseLinker only through src/lib/baselinker/readonly.ts (closed
 * allowlist; methods used: getInventoryProductsList, getInventoryProductsData). planSync is a pure
 * function — its result is printed, never sent. Output passes redactSecrets and is scanned for
 * `key=` / `token=` / `client=` / URLs at the end, as in scripts/audit-import.ts.
 */

import { createHash } from 'crypto';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Shell-level BASELINKER_MOCK wins over .env.local (smoke test) — as in audit-import.ts.
const mockFlagFromShell = process.env.BASELINKER_MOCK;
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true, quiet: true });
if (mockFlagFromShell !== undefined) process.env.BASELINKER_MOCK = mockFlagFromShell;

import type { NormalizedProduct } from '../xml-integration/types';
import { classifyFeed } from '../xml-integration/feed-guard';
import { MARGIN_FIELD_ENV, MarginTally, chooseMargin, computeSellingPrice, marginFieldKey, readMarginRaw } from '../xml-integration/margin';
import { SKU_PREFIX, SUPPLIERS, SUPPLIER_LABEL, findBLMatch, type BLMatch, type Supplier } from '../xml-integration/bl-match-key';
import { loadExistingProducts, planSync, type SyncMargins, type WriteEnv } from '../xml-integration/bl-write';
import { isSharedRecord, recordSuppliers, redactSecrets, toCsv, type RecordSuppliers } from '../xml-integration/import-audit';
import {
  CAUSE_LABEL,
  DELTA_BUCKETS,
  classifyRecord,
  deltaBucket,
  feedElements,
  gtin14Key,
  sanitizeFragment,
  shargSizes,
  summarizeSyncLog,
  type PriceCause,
  type PriceItem,
  type RecordPrices,
  type RecordVerdict,
} from '../xml-integration/price-diag';
import { getInventoryProductsData, getInventoryProductsList, type ReadOnlyMethod } from '../src/lib/baselinker/readonly';

const USAGE = `Usage:
  npx tsx scripts/diag-prices.ts --supplier <kolba|sharg|spechurt> --out <dir>
    [--bl-ids 1,2,3] [--skus 5652,139] [--from-file <path>] [--logs <dir>]
    [--other-feeds=kolba,spechurt] [--other-from-file=<supplier>:<path>]…
Read-only: BaseLinker reads through src/lib/baselinker/readonly.ts only; writes only into --out.`;

const RATE_LIMIT_MS = 700;
const DATA_CHUNK = 250;
const WAREHOUSE_ENV: Record<Supplier, string> = { kolba: 'BASELINKER_WAREHOUSE_H1', sharg: 'BASELINKER_WAREHOUSE_H2', spechurt: 'BASELINKER_WAREHOUSE_H3' };
const MARKUP_ENV: Record<Supplier, string> = { kolba: 'BASELINKER_MARKUP_KOLBA', sharg: 'BASELINKER_MARKUP_SHARG', spechurt: 'BASELINKER_MARKUP_SPECHURT' };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toFixed(2));
const pctStr = (d: number | null) => (d === null ? '—' : `${d > 0 ? '+' : ''}${(d * 100).toFixed(1)}%`);

function fail(message: string): never {
  console.error(`[error] ${redactSecrets(message)}`);
  process.exit(1);
}
function log(message: string): void {
  console.log(redactSecrets(message));
}

// ── Arguments and configuration ───────────────────────────────────────────────

interface Args {
  supplier: Supplier;
  out: string;
  blIds: number[];
  skus: string[];
  fromFile: string | null;
  logs: string | null;
  otherFeeds: Supplier[];
  otherFromFile: Map<Supplier, string>;
}

const isSupplier = (s: string): s is Supplier => (SUPPLIERS as readonly string[]).includes(s);
const list = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);

function parseArgs(argv: string[]): Args {
  if (argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(0); }
  let supplier: string | null = null, out: string | null = null, fromFile: string | null = null, logs: string | null = null;
  const blIds: number[] = [];
  const skus: string[] = [];
  let otherFeeds: string[] | null = null;
  const otherFromFile = new Map<Supplier, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eq = a.indexOf('=');
    const name = eq > 0 ? a.slice(0, eq) : a;
    const value = () => (eq > 0 ? a.slice(eq + 1) : argv[++i] ?? '');
    if (name === '--supplier') supplier = value();
    else if (name === '--out') out = value();
    else if (name === '--from-file') fromFile = value();
    else if (name === '--logs') logs = value();
    else if (name === '--bl-ids') {
      for (const x of list(value())) {
        if (!/^\d+$/.test(x)) fail(`--bl-ids: "${x}" is not a BL product id`);
        blIds.push(Number(x));
      }
    } else if (name === '--skus') skus.push(...list(value()));
    else if (name === '--other-feeds') {
      otherFeeds = list(eq > 0 ? a.slice(eq + 1) : '');
      if (!otherFeeds.every(isSupplier)) fail('--other-feeds=kolba,sharg,spechurt (or empty for none)');
    } else if (name === '--other-from-file') {
      const raw = value();
      const sep = raw.indexOf(':');
      const sup = raw.slice(0, Math.max(sep, 0));
      if (!isSupplier(sup) || !fs.existsSync(raw.slice(sep + 1))) fail('--other-from-file=<kolba|sharg|spechurt>:<existing path>');
      otherFromFile.set(sup, raw.slice(sep + 1));
    } else fail(`unknown argument: ${a}\n${USAGE}`);
  }
  if (!supplier || !isSupplier(supplier)) fail(`--supplier <kolba|sharg|spechurt> is required\n${USAGE}`);
  if (!out) fail(`--out <dir> is required\n${USAGE}`);
  if (fromFile !== null && !fs.existsSync(fromFile)) fail(`--from-file: file not found: ${fromFile}`);
  if (logs === null && fs.existsSync(path.join(os.homedir(), 'logs'))) logs = path.join(os.homedir(), 'logs');
  // A prefixed SKU (`SHARG-5652`) means the same feed SKU as `5652`
  const prefix = `${SKU_PREFIX[supplier]}-`;
  const others = ((otherFeeds ?? SUPPLIERS) as Supplier[]).filter((x) => x !== supplier);
  return { supplier, out: path.resolve(out), blIds: [...new Set(blIds)], skus: [...new Set(skus.map((s) => (s.startsWith(prefix) ? s.slice(prefix.length) : s)))], fromFile, logs, otherFeeds: [...new Set(others)], otherFromFile };
}

interface Config {
  mock: boolean;
  env: WriteEnv;
  marginKey: string | null;
  allWarehouses: string[];
}

function loadConfig(s: Supplier): Config {
  const mock = process.env.BASELINKER_MOCK === 'true';
  const int = (name: string) => { const n = parseInt(process.env[name] ?? '', 10); return isNaN(n) ? null : n; };
  const inventoryId = int('BASELINKER_INVENTORY_ID');
  if (inventoryId === null) fail('BASELINKER_INVENTORY_ID must be set (the import catalogue, 119068 on the server)');
  const priceGroup = int('BASELINKER_PRICE_GROUP');
  if (priceGroup === null) fail('BASELINKER_PRICE_GROUP must be set — the sync cannot be replayed without it');
  const markupPct = parseFloat(process.env[MARKUP_ENV[s]] ?? '');
  if (isNaN(markupPct)) fail(`${MARKUP_ENV[s]} must be set — the sync cannot be replayed without it`);
  let marginKey: string | null = null;
  try { marginKey = marginFieldKey(process.env[MARGIN_FIELD_ENV]); } catch (err) { fail(err instanceof Error ? err.message : String(err)); }
  return {
    mock,
    env: {
      inventoryId,
      priceGroup,
      priceGroupPurchase: int('BASELINKER_PRICE_GROUP_PURCHASE'),
      warehouse: process.env[WAREHOUSE_ENV[s]]?.trim() || `(${WAREHOUSE_ENV[s]} unset)`,
      markupPct,
    },
    marginKey,
    allWarehouses: SUPPLIERS.map((x) => process.env[WAREHOUSE_ENV[x]]?.trim() ?? '').filter(Boolean),
  };
}

// ── BaseLinker (read-only) ────────────────────────────────────────────────────

const blCalls: Partial<Record<ReadOnlyMethod, number>> = {};

async function blRead<T>(method: ReadOnlyMethod, call: () => Promise<T>): Promise<T> {
  blCalls[method] = (blCalls[method] ?? 0) + 1;
  const result = await call();
  await sleep(RATE_LIMIT_MS);
  return result;
}

interface BLRec {
  id: number;
  sku: string;
  ean: string;
  name: string;
  parentId: number;
  tags: string[];
  prices: Record<string, number>;
  stock: Record<string, number>;
  weight: number;
  skuParams: Record<string, string>;
  marginRaw: unknown;
  sup: RecordSuppliers;
}

function numMap(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) { const n = Number(x); if (!isNaN(n)) out[k] = n; }
  return out;
}

function toRec(id: number, raw: unknown, marginKey: string | null): BLRec {
  const d = raw as Record<string, unknown> & { text_fields?: Record<string, unknown> };
  const tf = d.text_fields ?? {};
  const f = tf.features && typeof tf.features === 'object' && !Array.isArray(tf.features) ? (tf.features as Record<string, unknown>) : {};
  const features = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v ?? '')]));
  const sku = String(d.sku ?? '');
  return {
    id,
    sku,
    ean: String(d.ean ?? '').trim(),
    name: String(tf.name ?? ''),
    parentId: Number(d.parent_id ?? 0),
    tags: Array.isArray(d.tags) ? (d.tags as unknown[]).map(String) : [],
    prices: numMap(d.prices),
    stock: numMap(d.stock),
    weight: Number(d.weight ?? 0) || 0,
    skuParams: Object.fromEntries(Object.entries(features).filter(([k]) => k.startsWith('SKU ') || k === 'Źródło opisu')),
    marginRaw: marginKey !== null ? readMarginRaw(tf, marginKey) : undefined,
    sup: recordSuppliers(sku, features),
  };
}

// ── Feed ──────────────────────────────────────────────────────────────────────

interface FeedMeta {
  source: 'file' | 'network';
  fetchedAt: string;
  sizeMb: number;
  sha256: string;
  generated: string;
  lastModified: string;
  etag: string;
  serverDate: string;
  beforeConnectorFilter: number | null;
  products: number;
}

async function readFeed(s: Supplier, file: string | null): Promise<{ xml: string; meta: Omit<FeedMeta, 'products' | 'beforeConnectorFilter'> }> {
  const fetchedAt = new Date().toISOString();
  let xml: string;
  let headers: Headers | null = null;
  if (file) {
    xml = fs.readFileSync(file, 'utf8');
  } else {
    // Connector configs build feed URLs from env at module load, so dotenv must run first
    const { connectors } = await import('../xml-integration/connectors');
    const res = await fetch(connectors[s].config.xml_url);
    if (!res.ok) fail(`feed download failed: HTTP ${res.status} ${res.statusText}`);
    headers = res.headers;
    xml = await res.text();
  }
  const head = xml.slice(0, 4000);
  return {
    xml,
    meta: {
      source: file ? 'file' : 'network',
      fetchedAt,
      sizeMb: round2(xml.length / 1024 / 1024),
      sha256: createHash('sha256').update(xml).digest('hex').slice(0, 16),
      generated: /\bgenerated="([^"]*)"/.exec(head)?.[1] ?? 'brak w feedzie',
      lastModified: headers?.get('last-modified') ?? '—',
      etag: headers?.get('etag') ?? '—',
      serverDate: headers?.get('date') ?? '—',
    },
  };
}

async function parseFeed(s: Supplier, xml: string): Promise<{ products: NormalizedProduct[]; beforeConnectorFilter: number | null }> {
  const { connectors } = await import('../xml-integration/connectors');
  let beforeConnectorFilter: number | null = null;
  const origLog = console.log;
  console.log = (...a: unknown[]) => {
    const m = /Defence filter: (\d+)\/(\d+)/.exec(a.map(String).join(' '));
    if (m) beforeConnectorFilter = Number(m[2]);
    else origLog(...a.map((x) => (typeof x === 'string' ? redactSecrets(x) : x)));
  };
  try {
    return { products: connectors[s].parse(xml), beforeConnectorFilter };
  } finally {
    console.log = origLog;
  }
}

/** The connector's view of a product — everything that matters for price and key, no texts or URLs. */
function connectorView(p: NormalizedProduct) {
  return {
    connector_product_id: p.connector_product_id,
    connector_sku: p.connector_sku,
    ean: p.ean,
    name: p.name,
    brand: p.brand,
    price_purchase: p.price_purchase,
    price_gross: p.price_gross,
    price_net: p.price_net,
    tax_rate: p.tax_rate,
    stock: p.stock,
    weight_g: p.weight_g,
    has_variants: p.has_variants,
    variants: p.variants.map((v) => ({ id: v.variant_id, name: v.variant_name, ean: v.ean, stock: v.stock, price_gross: v.price_gross })),
  };
}

// ── Sync log ──────────────────────────────────────────────────────────────────

function latestSyncLog(dir: string | null, s: Supplier): { file: string; text: string } | null {
  if (!dir || !fs.existsSync(dir)) return null;
  const re = new RegExp(`^${s}-sync-\\d{8}-\\d{6}\\.log$`);
  const files = fs.readdirSync(dir).filter((f) => re.test(f)).sort();
  if (files.length === 0) return null;
  const file = path.join(dir, files[files.length - 1]);
  return { file, text: fs.readFileSync(file, 'utf8') };
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Traced {
  pos: number;
  p: NormalizedProduct;
  match: BLMatch | undefined;
  /** why this feed item is listed: matched onto the record, carries its supplier code, or its EAN */
  why: string[];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const s = args.supplier;
  const cfg = loadConfig(s);
  const { env } = cfg;
  const started = new Date();
  log(`Price diagnosis (HA-2.38) — ${SUPPLIER_LABEL[s]}, read-only${cfg.mock ? ' [BASELINKER_MOCK=true]' : ''}`);
  if (args.blIds.length + args.skus.length === 0) log('  no --bl-ids / --skus: supplier-wide summary only');

  // 1. Index — the same function and the same read the sync uses (runSyncCore)
  const listed: Array<{ id: number; ean: string; sku: string }> = [];
  const index = await loadExistingProducts(
    async (inv, page) => {
      const products = await blRead('getInventoryProductsList', () => getInventoryProductsList(inv, page));
      for (const [id, p] of Object.entries(products)) listed.push({ id: Number(id), ean: String(p.ean ?? '').trim(), sku: String(p.sku ?? '') });
      return products;
    },
    env.inventoryId, sleep, RATE_LIMIT_MS,
  );
  log(`  BL index: ${index.total} products, ${index.byEan.size} EAN keys`);

  // 2. Feed
  const { xml: rawXml, meta: m0 } = await readFeed(s, args.fromFile);
  let xml = rawXml;
  const parsed = await parseFeed(s, xml);
  const products = parsed.products;
  if (classifyFeed(xml, products.length) !== 'ok') fail(`empty feed (${products.length} products) — nothing to diagnose`);
  const meta: FeedMeta = { ...m0, products: products.length, beforeConnectorFilter: parsed.beforeConnectorFilter };
  log(`  feed: ${meta.sizeMb} MB, ${products.length} products, generated ${meta.generated}, last-modified ${meta.lastModified}`);

  // 3. Key of every feed item, as planSync computes it
  const matches = products.map((p) => findBLMatch(index, s, p.ean, p.connector_sku));
  const itemsById = new Map<number, number[]>();
  matches.forEach((mt, i) => { if (mt) itemsById.set(mt.id, [...(itemsById.get(mt.id) ?? []), i]); });

  // Records to trace: --bl-ids plus the records the --skus items land on
  const traceIds = new Set<number>(args.blIds);
  const skuNotFound: string[] = [];
  const skuUnmatched: number[] = [];
  for (const sku of args.skus) {
    const hits = products.map((p, i) => ({ p, i })).filter(({ p }) => (p.connector_sku ?? '').trim() === sku);
    if (hits.length === 0) skuNotFound.push(sku);
    for (const { i } of hits) { if (matches[i]) traceIds.add(matches[i]!.id); else skuUnmatched.push(i); }
  }

  // 4. BL data: every matched record (supplier-wide summary) + the traced ones
  const dataIds = [...new Set([...itemsById.keys(), ...traceIds])];
  const recs = new Map<number, BLRec>();
  for (let i = 0; i < dataIds.length; i += DATA_CHUNK) {
    const chunk = dataIds.slice(i, i + DATA_CHUNK).map(String);
    const data = await blRead('getInventoryProductsData', () => getInventoryProductsData(env.inventoryId, chunk));
    for (const [id, raw] of Object.entries(data)) recs.set(Number(id), toRec(Number(id), raw, cfg.marginKey));
    log(`  product data ${Math.min(i + DATA_CHUNK, dataIds.length)}/${dataIds.length}`);
  }

  // 5. What the sync would write now — planSync itself, never sent
  const margins: SyncMargins = cfg.marginKey === null
    ? { kind: 'off' }
    : { kind: 'read', raw: new Map([...recs.values()].map((r) => [r.id, r.marginRaw])) };
  // Membership as the sync reads it (HA-2.38): prices only on records of this supplier
  const plan = planSync(products, s, index, env, margins, new MarginTally(() => {}), new Map([...recs.values()].map((r) => [r.id, r.sup.members])));

  // 6. EAN occurrences (as written and as a GTIN-14 key) in the feed and in the BL list
  const count = <K>(keys: Array<K | null>) => { const c = new Map<K, number>(); for (const k of keys) if (k !== null) c.set(k, (c.get(k) ?? 0) + 1); return c; };
  const feedEanRaw = count(products.map((p) => (p.ean ?? '').trim() || null));
  const feedEanKey = count(products.map((p) => gtin14Key(p.ean)));
  const blByKey = new Map<string, number[]>();
  const blByRaw = new Map<string, number[]>();
  for (const l of listed) {
    if (l.ean) blByRaw.set(l.ean, [...(blByRaw.get(l.ean) ?? []), l.id]);
    const k = gtin14Key(l.ean);
    if (k) blByKey.set(k, [...(blByKey.get(k) ?? []), l.id]);
  }
  const eanStats = (ean: string | null) => {
    const e = (ean ?? '').trim();
    const k = gtin14Key(e);
    return {
      ean: e || null,
      gtin14: k,
      feed_same_ean: e ? feedEanRaw.get(e) ?? 0 : 0,
      feed_same_gtin14: k ? feedEanKey.get(k) ?? 0 : 0,
      bl_same_ean: e ? (blByRaw.get(e) ?? []) : [],
      bl_same_gtin14: k ? (blByKey.get(k) ?? []) : [],
      index_byEan_points_to: e ? index.byEan.get(e) ?? null : null,
    };
  };

  // 7. Traced records
  const salePg = String(env.priceGroup);
  const purPg = env.priceGroupPurchase !== null ? String(env.priceGroupPurchase) : null;
  const pricesOf = (r: BLRec, i: number[]): RecordPrices => {
    const choice = chooseMargin(cfg.marginKey === null ? undefined : r.marginRaw, env.markupPct);
    const planned = plan.priceUpdates[r.id] ?? {};
    return {
      shared: isSharedRecord(r.sup.members, [...(matchedBy.get(r.id) ?? [])]),
      items: i.map((pos): PriceItem => {
        const p = products[pos];
        const sp = computeSellingPrice(p, choice.pct);
        return { pos, sku: p.connector_sku ?? '', pricePurchase: p.price_purchase, priceGross: p.price_gross, expectedSale: sp.price, fromFallback: sp.fromFallback };
      }),
      blSale: r.prices[salePg] ?? null,
      blPurchase: purPg !== null ? (r.prices[purPg] ?? null) : null,
      planSale: planned[salePg] ?? null,
      planPurchase: purPg !== null ? (planned[purPg] ?? null) : null,
      marginPct: choice.pct,
      purchaseGroup: purPg !== null,
    };
  };

  const traced: Array<{ id: number; rec: BLRec | null; items: Traced[] }> = [];
  for (const id of traceIds) {
    const rec = recs.get(id) ?? null;
    const code = rec?.sup.codes[s];
    const key = rec ? gtin14Key(rec.ean) : null;
    const items: Traced[] = [];
    products.forEach((p, pos) => {
      const why: string[] = [];
      if (matches[pos]?.id === id) why.push(`findBLMatch → ten rekord (${matches[pos]!.via})`);
      if (code && (p.connector_sku ?? '').trim() === code) why.push(`SKU = kod ${SUPPLIER_LABEL[s]} rekordu`);
      if (key && (gtin14Key(p.ean) === key || p.variants.some((v) => gtin14Key(v.ean) === key))) why.push('EAN (GTIN-14) = EAN rekordu');
      if (why.length) items.push({ pos, p, match: matches[pos], why });
    });
    traced.push({ id, rec, items });
  }

  // Raw elements of every traced feed item — then the document can go
  const wantedIds = new Set([...traced.flatMap((t) => t.items.map((x) => x.p.connector_product_id)), ...skuUnmatched.map((i) => products[i].connector_product_id)]);
  const raw = feedElements(xml, s, wantedIds);
  xml = '';

  // Other suppliers' feeds: which records they match today — a record matched by ≥ 2 suppliers is
  // shared even without their parameters (their sync writes it too, HA-2.38)
  const matchedBy = new Map<number, Set<Supplier>>();
  for (const id of itemsById.keys()) matchedBy.set(id, new Set([s]));
  const otherFeedNotes: string[] = [];
  for (const o of args.otherFeeds) {
    try {
      const { xml: oxml } = await readFeed(o, args.otherFromFile.get(o) ?? null);
      const op = (await parseFeed(o, oxml)).products;
      let hits = 0;
      for (const p of op) {
        const id = findBLMatch(index, o, p.ean, p.connector_sku)?.id;
        if (id === undefined) continue;
        if (!matchedBy.has(id)) matchedBy.set(id, new Set());
        matchedBy.get(id)!.add(o);
        if (itemsById.has(id)) hits++;
      }
      otherFeedNotes.push(`${SUPPLIER_LABEL[o]} ${op.length} produktów, trafia ${hits} rekordów tej hurtowni`);
      log(`  other feed ${o}: ${op.length} products, ${hits} of this supplier's matched records`);
    } catch (err) {
      otherFeedNotes.push(`${SUPPLIER_LABEL[o]} niedostępny (${err instanceof Error ? err.message : String(err)}) — wspólne liczone bez niego`);
      log(`  [warn] other feed ${o} unavailable — shared records counted without it`);
    }
  }

  // 8. Supplier-wide: every matched record, compared as the audit compares it
  type Row = { r: BLRec; prices: RecordPrices; v: RecordVerdict };
  const rows: Row[] = [];
  let noData = 0;
  for (const [id, pos] of itemsById) {
    const r = recs.get(id);
    if (!r) { noData++; continue; }
    const prices = pricesOf(r, pos);
    rows.push({ r, prices, v: classifyRecord(prices) });
  }
  const flagged = rows.filter((x) => x.v.flagged);
  const multi = rows.filter((x) => x.prices.items.length > 1);

  // ── Report ─────────────────────────────────────────────────────────────────
  let commit = 'unknown';
  try { commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* not a git checkout */ }
  const md: string[] = [
    `# Diagnoza cen — ${SUPPLIER_LABEL[s]} (HA-2.38)${cfg.mock ? ' — MOCK' : ''}`,
    '',
    `- wykonano: ${started.toISOString()} (UTC), commit \`${commit}\`, tylko odczyt`,
    `- katalog ${env.inventoryId}; grupy cen: sprzedaż ${env.priceGroup}, zakup ${env.priceGroupPurchase ?? '— (nieustawiona)'}; narzut env ${env.markupPct}%; pole „Marża %”: ${cfg.marginKey ?? 'nieskonfigurowane'}; magazyn ${env.warehouse}`,
    `- feed: ${meta.source === 'file' ? 'plik' : 'pobrany'} ${meta.fetchedAt}, ${meta.sizeMb} MB, sha256 ${meta.sha256}…, generated=${meta.generated}, Last-Modified: ${meta.lastModified}, ETag: ${meta.etag}, Date: ${meta.serverDate}`,
    `- produkty w feedzie: ${products.length}${meta.beforeConnectorFilter !== null ? ` (przed filtrem konektora: ${meta.beforeConnectorFilter})` : ''}; dopasowane do BL: ${matches.filter(Boolean).length} → ${itemsById.size} rekordów; bez danych z BL: ${noData}`,
    `- planSync (to, co sync zapisałby teraz): matched ${plan.matched}, unmatched ${plan.unmatched}, priceSkipped ${plan.priceSkipped}, prices skipped (not a member) ${plan.priceSkippedNotMember}, fallback ${plan.priceFallbacks}, cena 0: ${plan.priceZeros}`,
    `- „wspólny” = członkowie (SKU, parametry) ∪ hurtownie, których feed trafia rekord, ≥ 2; inne feedy: ${otherFeedNotes.join('; ') || 'nie czytano (--other-feeds=)'}`,
    `- wywołania BL (wyłącznie readonly.ts): ${Object.entries(blCalls).map(([k, c]) => `${k} ×${c}`).join(', ')}`,
    '',
  ];

  // Summary table: cause → count, own vs shared
  md.push('## 1. Rozjazdy cen — przyczyna → liczba (wszystkie dopasowane rekordy tej hurtowni)', '');
  md.push(`Porównanie jak w audycie HA-2.37 (sekcja A): każda pozycja feedu osobno; rekord liczony raz. Pozycje (jak liczy audyt): sprzedaż różna ${rows.reduce((a, x) => a + (x.prices.shared ? 0 : x.v.saleItems), 0)} na rekordach własnych / ${rows.reduce((a, x) => a + (x.prices.shared ? x.v.saleItems : 0), 0)} na wspólnych; zakup różny ${rows.reduce((a, x) => a + x.v.purchaseItems, 0)}.`, '');
  const causes = Object.keys(CAUSE_LABEL) as PriceCause[];
  md.push('| przyczyna | rekordy własne | rekordy wspólne | przykłady (BL id) |', '| --- | --- | --- | --- |');
  for (const c of causes) {
    const own = flagged.filter((x) => x.v.cause === c && !x.prices.shared);
    const sh = flagged.filter((x) => x.v.cause === c && x.prices.shared);
    if (own.length + sh.length === 0) continue;
    md.push(`| ${CAUSE_LABEL[c]} | ${own.length} | ${sh.length} | ${[...own, ...sh].slice(0, 5).map((x) => x.r.id).join(', ')} |`);
  }
  md.push(`| **razem** | **${flagged.filter((x) => !x.prices.shared).length}** | **${flagged.filter((x) => x.prices.shared).length}** | |`, '');

  // Multi-item records
  md.push('## 2. Kilka pozycji feedu → jeden rekord', '');
  md.push(`- rekordów, w które trafia > 1 pozycja feedu: **${multi.length}** (pozycji: ${multi.reduce((a, x) => a + x.prices.items.length, 0)}); przez EAN: ${multi.filter((x) => x.prices.items.some((i) => matches[i.pos]?.via === 'ean')).length}, przez SKU: ${multi.filter((x) => x.prices.items.some((i) => matches[i.pos]?.via === 'sku')).length}`);
  md.push(`- z nich z rozjazdem: ${multi.filter((x) => x.v.flagged).length}; z różnymi cenami zakupu między pozycjami: ${multi.filter((x) => new Set(x.prices.items.map((i) => i.pricePurchase)).size > 1).length}`);
  md.push(`- pozycje feedu z EAN występującym w feedzie > 1 raz: ${products.filter((p) => (feedEanRaw.get((p.ean ?? '').trim()) ?? 0) > 1).length}; jako GTIN-14: ${products.filter((p) => { const k = gtin14Key(p.ean); return k !== null && (feedEanKey.get(k) ?? 0) > 1; }).length}`);
  md.push(`- rekordy BL z EAN występującym w BL > 1 raz: ${[...blByRaw.values()].filter((v) => v.length > 1).reduce((a, v) => a + v.length, 0)}; jako GTIN-14: ${[...blByKey.values()].filter((v) => v.length > 1).reduce((a, v) => a + v.length, 0)}`, '');

  // Size and sign of single-item differences
  const single = flagged.filter((x) => x.prices.items.length === 1);
  const dist = (pick: (x: Row) => number | null, label: string) => {
    const vals = single.map(pick).filter((d): d is number => d !== null && Math.abs(d) > 1e-9);
    md.push(`**${label}** (rekordy z jedną pozycją, ${vals.length}): BL niżej ${vals.filter((d) => d < 0).length}, BL wyżej ${vals.filter((d) => d > 0).length}`, '');
    md.push(`| ${DELTA_BUCKETS.join(' | ')} |`, `| ${DELTA_BUCKETS.map(() => '---').join(' | ')} |`, `| ${DELTA_BUCKETS.map((b) => vals.filter((d) => deltaBucket(d) === b).length).join(' | ')} |`, '');
  };
  md.push('## 3. Wielkość i znak różnic (rekordy z jedną pozycją feedu)', '');
  dist((x) => (x.v.purchaseItems > 0 ? x.v.purchaseDelta : null), 'Cena zakupu: BL względem feedu');
  dist((x) => (x.v.saleItems > 0 ? x.v.saleDelta : null), 'Cena sprzedaży: BL względem oczekiwanej');
  md.push(`Fallback (brak ceny zakupu w feedzie) wśród rozjazdów: ${flagged.filter((x) => x.prices.items.some((i) => i.fromFallback)).length}; pole „Marża %” ustawione na rekordach z rozjazdem: ${flagged.filter((x) => chooseMargin(x.r.marginRaw, env.markupPct).source === 'field').length}.`, '');

  // Sync log
  md.push('## 4. Ostatni log syncu', '');
  const sl = latestSyncLog(args.logs, s);
  let logSummary: ReturnType<typeof summarizeSyncLog> | null = null;
  if (!sl) md.push(`Brak pliku \`${s}-sync-*.log\` w ${args.logs ?? '(nie podano --logs)'}.`, '');
  else {
    logSummary = summarizeSyncLog(sl.text);
    const pw = logSummary.writes.filter((w) => w.kind === 'prices');
    const sent = pw.length ? pw[pw.length - 1].done : 0;
    md.push(`- plik: \`${path.basename(sl.file)}\``);
    md.push(`- zapis cen: ${pw.length} paczek, wysłano ${sent} rekordów (stan), BL zgłosił \`counter\` = ${logSummary.priceCounter}, warnings = ${logSummary.priceWarnings}`);
    md.push(`- treść ostrzeżeń BL w logu: ${logSummary.warningContentLines > 0 ? `${logSummary.warningContentLines} linii ze słowem „warning” poza licznikami` : 'brak — sync loguje tylko ich liczbę (bl-write.ts, runSyncCore)'}`, '');
    md.push('```', ...logSummary.lines, '```', '');
  }

  // Traced records
  md.push('## 5. Prześledzone rekordy', '');
  if (skuNotFound.length) md.push(`- SKU spoza dzisiejszego feedu: ${skuNotFound.join(', ')}`);
  if (skuUnmatched.length) md.push(`- SKU w feedzie, ale bez dopasowania w BL (sync ich nie zapisuje): ${skuUnmatched.map((i) => products[i].connector_sku).join(', ')} — surowe elementy na końcu`);
  md.push('');
  const json: unknown[] = [];
  for (const t of traced) {
    const r = t.rec;
    md.push(`### BL ${t.id}${r ? ` — ${r.sku} — ${r.name.slice(0, 80)}` : ' — brak danych w BL (inne ID albo inny katalog)'}`, '');
    if (!r) { json.push({ bl_id: t.id, bl: null }); continue; }
    const rp = pricesOf(r, itemsById.get(t.id) ?? []);
    const v = classifyRecord(rp);
    const planned = plan.priceUpdates[t.id] ?? {};
    const es = eanStats(r.ean);
    md.push(`- rekord: SKU \`${r.sku}\`, EAN \`${r.ean || '—'}\`, parent ${r.parentId}, waga ${r.weight}, tagi: ${r.tags.join(' ') || '—'}; członkowie: ${r.sup.members.join(', ') || '—'}; trafiany przez feedy: ${[...(matchedBy.get(t.id) ?? [])].join(', ') || '—'}${rp.shared ? ' (**wspólny**)' : ''}; ${SUPPLIER_LABEL[s]} ${r.sup.members.includes(s) ? 'jest' : '**nie jest**'} członkiem; parametry: ${Object.entries(r.skuParams).map(([k, x]) => `${k}=${x}`).join(', ') || '—'}`);
    md.push(`- ceny BL: sprzedaż ${money(rp.blSale)}, zakup ${money(rp.blPurchase)}; wszystkie grupy: ${JSON.stringify(r.prices)}; pole „Marża %”: ${r.marginRaw === undefined ? '—' : JSON.stringify(r.marginRaw)} → narzut ${rp.marginPct}%`);
    md.push(`- stan BL: ${JSON.stringify(r.stock)}`);
    md.push(`- EAN rekordu w BL: rekordów z tym EAN ${es.bl_same_ean.length} (${es.bl_same_ean.slice(0, 8).join(', ') || '—'}), z tym GTIN-14 ${es.bl_same_gtin14.length} (${es.bl_same_gtin14.slice(0, 8).join(', ') || '—'}); indeks byEan → ${es.index_byEan_points_to ?? '—'}; w feedzie: ${es.feed_same_ean}× / GTIN-14 ${es.feed_same_gtin14}×`);
    md.push(`- sync teraz (planSync): zakup ${money(rp.planPurchase)}, sprzedaż ${money(rp.planSale)}, stan ${JSON.stringify(plan.stockUpdates[t.id] ?? null)} → zakup ${rp.planPurchase === null || rp.blPurchase === null ? '?' : Math.abs(rp.planPurchase - rp.blPurchase) <= 0.01 ? 'jak w BL' : 'INNY niż w BL'}, sprzedaż ${rp.planSale === null || rp.blSale === null ? '?' : Math.abs(rp.planSale - rp.blSale) <= 0.01 ? 'jak w BL' : 'INNA niż w BL'}`);
    md.push(`- werdykt: ${v.flagged ? CAUSE_LABEL[v.cause!] : 'bez rozjazdu (jak liczy audyt)'}`, '');
    md.push('| poz. w feedzie | id feedu | SKU | EAN | dopasowanie → BL | zakup | brutto | stan | waga g | EAN w feedzie ×(raw/GTIN-14) | dlaczego na liście |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    const mine = itemsById.get(t.id) ?? [];
    for (const x of t.items) {
      const e = eanStats(x.p.ean);
      const last = mine.length > 1 && mine[mine.length - 1] === x.pos ? ' (ostatnia → jej cenę pisze sync)' : '';
      md.push(`| ${x.pos} | ${x.p.connector_product_id} | ${x.p.connector_sku} | ${x.p.ean ?? '—'} | ${x.match ? `${x.match.id} (${x.match.via})${last}` : 'brak'} | ${money(x.p.price_purchase)} | ${money(x.p.price_gross)} | ${x.p.stock} | ${x.p.weight_g ?? '—'} | ${e.feed_same_ean}/${e.feed_same_gtin14} | ${x.why.join('; ')} |`);
    }
    md.push('');
    for (const x of t.items) {
      const el = raw.get(x.p.connector_product_id);
      if (!el) { md.push(`Pozycja ${x.p.connector_product_id}: surowego elementu nie znaleziono w dokumencie.`, ''); continue; }
      if (s === 'sharg') {
        md.push(`Rozmiary pozycji ${x.p.connector_product_id} w kolejności feedu (konektor czyta cenę zakupu z poz. 0):`, '');
        md.push('| poz. | id | nazwa | code_external | code_producer (jak w XML) | waga | price gross | price net | srp gross | stan |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
        for (const z of shargSizes(el)) md.push(`| ${z.pos} | ${z.id} | ${z.name} | ${z.codeExternal} | ${z.codeProducer} | ${z.weight} | ${z.priceGross} | ${z.priceNet} | ${z.srpGross} | ${z.stock} |`);
        md.push('');
      }
      md.push(`Surowy element (${x.p.connector_product_id}, bez opisów, zdjęć i adresów):`, '', '```xml', sanitizeFragment(el, s), '```', '');
    }
    json.push({
      bl_id: t.id,
      bl: { sku: r.sku, ean: r.ean, name: r.name, parent_id: r.parentId, tags: r.tags, prices: r.prices, stock: r.stock, weight: r.weight, sku_params: r.skuParams, margin_raw: r.marginRaw ?? null, suppliers: r.sup },
      ean: es,
      sync_now: { prices: planned, stock: plan.stockUpdates[t.id] ?? null },
      verdict: v,
      feed_items: t.items.map((x) => ({ pos: x.pos, why: x.why, match: x.match ?? null, connector: connectorView(x.p), ean: eanStats(x.p.ean), raw: raw.has(x.p.connector_product_id) ? sanitizeFragment(raw.get(x.p.connector_product_id)!, s) : null, sizes: s === 'sharg' && raw.has(x.p.connector_product_id) ? shargSizes(raw.get(x.p.connector_product_id)!) : undefined })),
    });
  }

  for (const pos of skuUnmatched) {
    const p = products[pos];
    const e = eanStats(p.ean);
    md.push(`### Pozycja feedu ${p.connector_product_id} (SKU ${p.connector_sku}) — bez rekordu w BL`, '');
    md.push(`- poz. w feedzie ${pos}, EAN \`${p.ean ?? '—'}\` (w feedzie ${e.feed_same_ean}× / GTIN-14 ${e.feed_same_gtin14}×; rekordy BL z tym GTIN-14: ${e.bl_same_gtin14.join(', ') || '—'}), zakup ${money(p.price_purchase)}, brutto ${money(p.price_gross)}, stan ${p.stock}`, '');
    const el = raw.get(p.connector_product_id);
    if (el) md.push('```xml', sanitizeFragment(el, s), '```', '');
    json.push({ bl_id: null, feed_item: { pos, connector: connectorView(p), ean: e, raw: el ? sanitizeFragment(el, s) : null } });
  }

  // ── Files ──────────────────────────────────────────────────────────────────
  fs.mkdirSync(args.out, { recursive: true, mode: 0o700 });
  const written: string[] = [];
  const write = (name: string, content: string) => {
    const file = path.join(args.out, name);
    fs.writeFileSync(file, redactSecrets(content), { mode: 0o600 });
    written.push(file);
  };
  write(`diag-${s}.md`, md.join('\n') + '\n');
  write(`diag-${s}.json`, JSON.stringify({ supplier: s, feed: meta, plan: { matched: plan.matched, unmatched: plan.unmatched, priceSkipped: plan.priceSkipped }, sync_log: logSummary, traced: json }, null, 2) + '\n');
  write(`rozjazdy-${s}.csv`, toCsv(
    ['bl_id', 'bl_sku', 'wspolny', 'pozycji_feedu', 'przyczyna', 'sku_feed', 'zakup_feed', 'zakup_BL', 'zakup_sync_teraz', 'sprzedaz_oczekiwana', 'sprzedaz_BL', 'sprzedaz_sync_teraz', 'narzut', 'roznica_zakupu', 'roznica_sprzedazy', 'fallback'],
    flagged.map((x) => [
      x.r.id, x.r.sku, x.prices.shared ? 'tak' : 'nie', x.prices.items.length, x.v.cause,
      x.prices.items.map((i) => i.sku).join(' '), x.prices.items.map((i) => money(i.pricePurchase)).join(' '),
      money(x.prices.blPurchase), money(x.prices.planPurchase), x.prices.items.map((i) => money(i.expectedSale)).join(' '),
      money(x.prices.blSale), money(x.prices.planSale), x.prices.marginPct, pctStr(x.v.purchaseDelta), pctStr(x.v.saleDelta),
      x.prices.items.some((i) => i.fromFallback) ? 'tak' : 'nie',
    ]),
  ));

  let leaks = 0;
  for (const f of written) leaks += (fs.readFileSync(f, 'utf8').match(/\b(key|token|client)=(?!<hidden>)|https?:\/\//gi) ?? []).length;
  log(`\nrecords with a price mismatch: ${flagged.filter((x) => !x.prices.shared).length} own, ${flagged.filter((x) => x.prices.shared).length} shared; traced: ${traced.length}`);
  log(`Written ${written.length} files to ${args.out}`);
  log(`BL methods called: ${Object.entries(blCalls).map(([k, c]) => `${k} ×${c}`).join(', ')}`);
  log(`credential/URL patterns in output: ${leaks}`);
  if (leaks > 0) fail('output contains credential-like text — delete the directory and report this');
}

main().catch((err) => {
  console.error('\n[fatal]', redactSecrets(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
