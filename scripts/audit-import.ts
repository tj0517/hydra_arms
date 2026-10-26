/**
 * Import audit (HA-2.37) — READ-ONLY.
 *
 * Compares what the XML → BaseLinker import is meant to do (xml-integration/README.md,
 * bl-match-key.ts, import-tags.ts, permit-rules.ts, resolve-category.ts, assortment-filter.ts,
 * scripts/xml-to-baselinker.ts) with today's supplier feeds and the BaseLinker catalogue, and
 * writes a report with numbers and examples: raport.md + one CSV per problem (≤ 50 rows each).
 * Nothing is fixed, merged or written anywhere except the --out directory.
 *
 * Usage:
 *   npx tsx scripts/audit-import.ts --out <dir> [--from-file=<connector>:<path>]…
 *     [--logs=<dir>] [--cron-stderr=<file>] [--nights=7] [--suppliers=kolba,sharg,spechurt]
 *
 *   --out          directory for raport.md and the CSV files (created, mode 700)
 *   --from-file    read that connector's feed from a local file instead of fetching it (repeatable)
 *   --logs         run-bl.sh log directory for section G (default: ~/logs when it exists)
 *   --cron-stderr  cron's stderr file (default: ~/cron-stderr.log when it exists)
 *   --nights       how many cron nights section G covers (default 7)
 *   --suppliers    which suppliers to audit (default: all three)
 *
 *   Smoke test without network or BaseLinker:
 *   BASELINKER_MOCK=true npx tsx scripts/audit-import.ts --out <dir> \
 *     --from-file=kolba:<file> --from-file=sharg:<file> --from-file=spechurt:<file> --logs=<dir>
 *
 * Read-only by construction:
 *   - BaseLinker only through src/lib/baselinker/readonly.ts, whose closed allowlist throws for
 *     any other method before anything reaches the network. Methods used here: getInventories,
 *     getInventoryWarehouses, getInventoryPriceGroups, getInventoryCategories,
 *     getInventoryProductsList, getInventoryProductsData.
 *   - feeds are parsed by the import's connectors (xml-integration/connectors), categories
 *     resolved by resolve-category.ts, admission by assortment-filter.ts, tags by import-tags.ts,
 *     the key by bl-match-key.ts — the functions the import itself calls.
 *   - no token, key or feed URL is printed or written: messages and cells pass redactSecrets()
 *     and the written files are scanned for `key=` / `token=` / `client=` / URLs at the end.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Shell-level BASELINKER_MOCK wins over .env.local (smoke test) — as in bl-inventory-report.ts.
const mockFlagFromShell = process.env.BASELINKER_MOCK;
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true, quiet: true });
if (mockFlagFromShell !== undefined) process.env.BASELINKER_MOCK = mockFlagFromShell;

import type { NormalizedProduct } from '../xml-integration/types';
import { filterProduct, type FilterReason } from '../xml-integration/assortment-filter';
import { ASSORTMENT_RULES } from '../xml-integration/assortment-rules';
import { resolveCategory, type CategoryMapFile, type HydraTreeLike, type StatusTag } from '../xml-integration/resolve-category';
import {
  IMPORT_OWNED_TAGS,
  TAG_AGE_18,
  TAG_PERMIT,
  TAG_PERMIT_OFF,
  TAG_PERMIT_OK,
  TAG_PERMIT_REVIEW,
  computeImportTags,
  mergeImportTags,
} from '../xml-integration/import-tags';
import { classifyFeed } from '../xml-integration/feed-guard';
import {
  SUPPLIERS,
  SUPPLIER_LABEL,
  addToMatchIndex,
  emptyMatchIndex,
  findBLMatch,
  type BLMatchIndex,
  type Supplier,
} from '../xml-integration/bl-match-key';
import {
  duplicateCandidates,
  nameIssues,
  nightKey,
  parseJournalLine,
  pickRows,
  recordSuppliers,
  redactSecrets,
  runVerdict,
  summarizeRunLog,
  toCsv,
  variantGroupCandidates,
  type CatalogueItem,
  type JournalEntry,
  type NameIssue,
  type RecordSuppliers,
  type RunVerdict,
  type VariantItem,
} from '../xml-integration/import-audit';
import {
  getInventories,
  getInventoryCategories,
  getInventoryPriceGroups,
  getInventoryProductsData,
  getInventoryProductsList,
  getInventoryWarehouses,
  type ReadOnlyMethod,
} from '../src/lib/baselinker/readonly';

const USAGE = `Usage:
  npx tsx scripts/audit-import.ts --out <dir> [--from-file=<connector>:<path>]…
    [--logs=<dir>] [--cron-stderr=<file>] [--nights=7] [--suppliers=kolba,sharg,spechurt]
Read-only: BaseLinker reads through src/lib/baselinker/readonly.ts only; writes only into --out.`;

const MAX_CSV_ROWS = 50;
const RATE_LIMIT_MS = 700; // BL ~100 req/min — same pacing as the import
const DATA_CHUNK = 250; // ids per getInventoryProductsData call

const WAREHOUSE_ENV: Record<Supplier, string> = {
  kolba: 'BASELINKER_WAREHOUSE_H1',
  sharg: 'BASELINKER_WAREHOUSE_H2',
  spechurt: 'BASELINKER_WAREHOUSE_H3',
};
const MARKUP_ENV: Record<Supplier, string> = {
  kolba: 'BASELINKER_MARKUP_KOLBA',
  sharg: 'BASELINKER_MARKUP_SHARG',
  spechurt: 'BASELINKER_MARKUP_SPECHURT',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const round2 = (n: number) => Math.round(n * 100) / 100;
const normNum = (n: string) => n.trim().replace(/^0+(?=\d)/, '');
const pct = (part: number, whole: number) => (whole > 0 ? `${((100 * part) / whole).toFixed(1)}%` : '—');
const fmt = (n: number) => n.toLocaleString('pl-PL');

function fail(message: string): never {
  console.error(`[error] ${redactSecrets(message)}`);
  process.exit(1);
}

function log(message: string): void {
  console.log(redactSecrets(message));
}

// ── Configuration ────────────────────────────────────────────────────────────

interface Config {
  mock: boolean;
  inventoryId: number;
  warehouse: Record<Supplier, string | null>;
  priceGroup: number | null;
  priceGroupPurchase: number | null;
  markup: Record<Supplier, number | null>;
  /** BASELINKER_WAREHOUSE_HYDRA — own stock for the assortment filter, as in the import */
  hydraWarehouse: string | null;
}

function intEnv(name: string): number | null {
  const n = parseInt(process.env[name] ?? '', 10);
  return isNaN(n) ? null : n;
}

function loadConfig(): Config {
  const mock = process.env.BASELINKER_MOCK === 'true';
  const inventoryId = intEnv('BASELINKER_INVENTORY_ID') ?? (mock ? 35743 : null);
  if (inventoryId === null) {
    // The import falls back to 35743 (the client's live "Kobold Defense" catalogue); the audit
    // refuses to guess which catalogue it reads.
    fail('BASELINKER_INVENTORY_ID must be set (the import catalogue, 119068 on the server)');
  }
  const warehouse = {} as Record<Supplier, string | null>;
  const markup = {} as Record<Supplier, number | null>;
  for (const s of SUPPLIERS) {
    warehouse[s] = process.env[WAREHOUSE_ENV[s]]?.trim() || null;
    const m = parseFloat(process.env[MARKUP_ENV[s]] ?? '');
    markup[s] = isNaN(m) ? null : m;
  }
  return {
    mock,
    inventoryId,
    warehouse,
    priceGroup: intEnv('BASELINKER_PRICE_GROUP'),
    priceGroupPurchase: intEnv('BASELINKER_PRICE_GROUP_PURCHASE'),
    markup,
    hydraWarehouse: process.env.BASELINKER_WAREHOUSE_HYDRA?.trim() || null,
  };
}

interface Args {
  out: string;
  fromFile: Map<Supplier, string>;
  logs: string | null;
  cronStderr: string | null;
  nights: number;
  suppliers: Supplier[];
}

const isSupplier = (s: string): s is Supplier => (SUPPLIERS as readonly string[]).includes(s);

function parseArgs(argv: string[]): Args {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    process.exit(0);
  }
  let out: string | null = null;
  const fromFile = new Map<Supplier, string>();
  let logs: string | null = null;
  let cronStderr: string | null = null;
  let nights = 7;
  let suppliers: Supplier[] = [...SUPPLIERS];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = (name: string) => (a === `--${name}` ? argv[++i] : a.slice(`--${name}=`.length));
    if (a === '--out' || a.startsWith('--out=')) out = value('out');
    else if (a.startsWith('--from-file=')) {
      const raw = a.slice('--from-file='.length);
      const sep = raw.indexOf(':');
      const name = sep >= 0 ? raw.slice(0, sep) : '';
      if (!isSupplier(name) || sep === raw.length - 1) fail('--from-file=<kolba|sharg|spechurt>:<path>');
      fromFile.set(name, raw.slice(sep + 1));
    } else if (a === '--logs' || a.startsWith('--logs=')) logs = value('logs');
    else if (a === '--cron-stderr' || a.startsWith('--cron-stderr=')) cronStderr = value('cron-stderr');
    else if (a.startsWith('--nights=')) nights = parseInt(a.slice('--nights='.length), 10);
    else if (a.startsWith('--suppliers=')) {
      const list = a.slice('--suppliers='.length).split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length === 0 || !list.every(isSupplier)) fail('--suppliers=kolba,sharg,spechurt');
      suppliers = list as Supplier[];
    } else fail(`unknown argument: ${a}\n${USAGE}`);
  }
  if (!out) fail(`--out <dir> is required\n${USAGE}`);
  if (!Number.isInteger(nights) || nights < 1) fail('--nights must be a positive whole number');
  const home = os.homedir();
  if (logs === null && fs.existsSync(path.join(home, 'logs'))) logs = path.join(home, 'logs');
  if (cronStderr === null && fs.existsSync(path.join(home, 'cron-stderr.log'))) cronStderr = path.join(home, 'cron-stderr.log');
  return { out: path.resolve(out), fromFile, logs, cronStderr, nights, suppliers };
}

// ── BaseLinker (read-only) ───────────────────────────────────────────────────

const blCalls: Partial<Record<ReadOnlyMethod, number>> = {};

/** Every BL read goes through here: counted, paced. The method name is only a label — the
 *  wrapper passed in is one of the typed readonly.ts functions, nothing else. */
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
  categoryId: number;
  tags: string[];
  features: Record<string, string>;
  stock: Record<string, number>;
  prices: Record<string, number>;
  taxRate: number | null;
  weight: number;
  images: number;
  hasDescription: boolean;
  variants: number;
  sup: RecordSuppliers;
}

interface BLState {
  inventoryName: string;
  inventoryFound: boolean;
  warehouseNames: Map<string, string>;
  priceGroupNames: Map<number, string>;
  categories: Map<number, { name: string; parentId: number }>;
  listed: number;
  listedWithParent: number;
  noData: number;
  records: Map<number, BLRec>;
  index: BLMatchIndex;
}

function numMap(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    const n = Number(x);
    if (!isNaN(n)) out[k] = n;
  }
  return out;
}

function strMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = String(x ?? '');
  return out;
}

async function loadBL(cfg: Config): Promise<BLState> {
  log(`\nBaseLinker (read-only${cfg.mock ? ', MOCK' : ''}) — catalogue ${cfg.inventoryId}`);
  const inventories = await blRead('getInventories', () => getInventories());
  const inv = inventories.find((i) => Number(i.inventory_id) === cfg.inventoryId);
  const warehouses = await blRead('getInventoryWarehouses', () => getInventoryWarehouses());
  const priceGroups = await blRead('getInventoryPriceGroups', () => getInventoryPriceGroups());
  const cats = await blRead('getInventoryCategories', () => getInventoryCategories(cfg.inventoryId));

  const index = emptyMatchIndex();
  const ids: number[] = [];
  let listedWithParent = 0;
  for (let page = 1; ; page++) {
    const products = await blRead('getInventoryProductsList', () => getInventoryProductsList(cfg.inventoryId, page));
    const entries = Object.entries(products);
    // Same order and same index function as the import's loadExistingProducts
    for (const [id, p] of entries) {
      addToMatchIndex(index, Number(id), p.ean, p.sku);
      ids.push(Number(id));
      if (Number(p.parent_id ?? 0) > 0) listedWithParent++;
    }
    log(`  products list page ${page}: ${entries.length}`);
    if (entries.length < 1000) break;
  }

  const records = new Map<number, BLRec>();
  for (let i = 0; i < ids.length; i += DATA_CHUNK) {
    const chunk = ids.slice(i, i + DATA_CHUNK).map(String);
    const data = await blRead('getInventoryProductsData', () => getInventoryProductsData(cfg.inventoryId, chunk));
    for (const [id, raw] of Object.entries(data)) {
      const d = raw as unknown as Record<string, unknown> & { text_fields?: Record<string, unknown> };
      const tf = d.text_fields ?? {};
      const features = strMap(tf.features);
      const images = d.images;
      const imageCount = Array.isArray(images)
        ? images.filter(Boolean).length
        : images && typeof images === 'object' ? Object.values(images).filter(Boolean).length : 0;
      const variants = d.variants;
      const variantCount = Array.isArray(variants)
        ? variants.length
        : variants && typeof variants === 'object' ? Object.keys(variants).length : 0;
      const tax = d.tax_rate === null || d.tax_rate === undefined || d.tax_rate === '' ? NaN : Number(d.tax_rate);
      const sku = String(d.sku ?? '');
      records.set(Number(id), {
        id: Number(id),
        sku,
        ean: String(d.ean ?? '').trim(),
        name: String(tf.name ?? ''),
        parentId: Number(d.parent_id ?? 0),
        categoryId: Number(d.category_id ?? 0),
        tags: Array.isArray(d.tags) ? (d.tags as unknown[]).map(String) : [],
        features,
        stock: numMap(d.stock),
        prices: numMap(d.prices),
        taxRate: isNaN(tax) ? null : tax,
        weight: Number(d.weight ?? 0) || 0,
        images: imageCount,
        hasDescription: String(tf.description ?? '').replace(/<[^>]*>/g, '').trim().length > 0,
        variants: variantCount,
        sup: recordSuppliers(sku, features),
      });
    }
    log(`  product data ${Math.min(i + DATA_CHUNK, ids.length)}/${ids.length}`);
  }

  return {
    inventoryName: inv?.name ?? '',
    inventoryFound: inv !== undefined,
    warehouseNames: new Map(warehouses.map((w) => [`${w.warehouse_type}_${w.warehouse_id}`, w.name])),
    priceGroupNames: new Map(priceGroups.map((g) => [Number(g.price_group_id), g.name])),
    categories: new Map(cats.map((c) => [Number(c.category_id), { name: c.name, parentId: Number(c.parent_id) }])),
    listed: ids.length,
    listedWithParent,
    noData: ids.filter((id) => !records.has(id)).length,
    records,
    index,
  };
}

// ── Hydra tree (BL category ids) — the import's HydraTree over hydra-categories.json ─────

class HydraTreeJson implements HydraTreeLike {
  private byNum = new Map<string, number>();
  readonly numById = new Map<number, string>();

  constructor(raw: Record<string, number>) {
    for (const [num, id] of Object.entries(raw)) {
      this.byNum.set(normNum(num), id);
      this.numById.set(id, normNum(num));
    }
  }

  resolve(num: string): number | undefined {
    return this.byNum.get(normNum(num));
  }

  isLeaf(num: string): boolean {
    const prefix = `${normNum(num)}.`;
    for (const key of this.byNum.keys()) if (key.startsWith(prefix)) return false;
    return true;
  }

  get unassignedId(): number {
    const id = this.resolve('00');
    if (id === undefined) fail('"00" missing from xml-integration/hydra-categories.json');
    return id;
  }
}

// ── Feeds ────────────────────────────────────────────────────────────────────

interface FeedItem {
  supplier: Supplier;
  id: string;
  sku: string;
  ean: string;
  name: string;
  brand: string;
  stock: number;
  pricePurchase: number | null;
  priceGross: number;
  /** selling price as the import computes it; null when the markup env is missing */
  expectedPrice: number | null;
  priceFromFallback: boolean;
  taxRate: number;
  weightG: number | null;
  images: number;
  hasDescription: boolean;
  supplierCategory: string;
  hydraNum: string | null;
  status: StatusTag;
  computedTags: string[];
  admitted: boolean;
  reason: FilterReason;
  hasVariants: boolean;
  variantCount: number;
  variantEans: string[];
  variantNames: string[];
  blId?: number;
  via?: 'ean' | 'sku';
}

interface FeedResult {
  supplier: Supplier;
  ok: boolean;
  error?: string;
  source: 'file' | 'network';
  sizeMb: number;
  generated: string;
  /** Sharg: products before the connector's own defence filter */
  beforeConnectorFilter: number | null;
  items: FeedItem[];
  unknownNums: string[];
}

function generatedAt(xml: string): string {
  const head = xml.slice(0, 4000);
  const generated = head.match(/\bgenerated="([^"]*)"/)?.[1];
  return generated ?? 'brak w feedzie';
}

async function readFeedXml(supplier: Supplier, url: string, file: string | undefined): Promise<string> {
  if (file) {
    if (!fs.existsSync(file)) throw new Error(`file not found: ${file}`);
    return fs.readFileSync(file, 'utf8');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

function sellingPrice(p: NormalizedProduct, markupPct: number): { price: number; fromFallback: boolean } {
  // Same rule as computeSellingPrice in the import script
  if (p.price_purchase && p.price_purchase > 0) return { price: round2(p.price_purchase * (1 + markupPct / 100)), fromFallback: false };
  return { price: p.price_gross, fromFallback: true };
}

async function loadFeed(
  supplier: Supplier,
  file: string | undefined,
  cfg: Config,
  bl: BLState,
  categoryMap: CategoryMapFile,
  tree: HydraTreeJson,
): Promise<FeedResult> {
  // Connector configs build feed URLs from env at module load, so dotenv must run first
  const { connectors } = await import('../xml-integration/connectors');
  const connector = connectors[supplier];
  const result: FeedResult = {
    supplier, ok: false, source: file ? 'file' : 'network', sizeMb: 0, generated: '', beforeConnectorFilter: null, items: [], unknownNums: [],
  };
  log(`\n─── ${supplier.toUpperCase()} — feed ${file ? 'from file' : 'download'} ───`);
  let xml: string;
  try {
    xml = await readFeedXml(supplier, connector.config.xml_url, file);
  } catch (err) {
    result.error = redactSecrets(err instanceof Error ? err.message : String(err));
    log(`  [warn] ${result.error}`);
    return result;
  }
  result.sizeMb = round2(xml.length / 1024 / 1024);
  result.generated = generatedAt(xml);

  // The Sharg connector reports its own defence filter on console.log — keep the numbers
  let products: NormalizedProduct[];
  const origLog = console.log;
  console.log = (...a: unknown[]) => {
    const m = /Defence filter: (\d+)\/(\d+)/.exec(a.map(String).join(' '));
    if (m) result.beforeConnectorFilter = Number(m[2]);
    else origLog(...a.map((x) => (typeof x === 'string' ? redactSecrets(x) : x)));
  };
  try {
    products = connector.parse(xml);
  } catch (err) {
    result.error = `parse failed: ${redactSecrets(err instanceof Error ? err.message : String(err))}`;
    log(`  [warn] ${result.error}`);
    return result;
  } finally {
    console.log = origLog;
  }
  const cls = classifyFeed(xml, products.length);
  xml = '';
  if (cls !== 'ok') {
    result.error = `empty feed (${cls}${result.beforeConnectorFilter !== null ? `, ${result.beforeConnectorFilter} products before the connector's defence filter` : ''})`;
    log(`  [warn] ${result.error}`);
    return result;
  }
  log(`  ${result.sizeMb} MB, ${products.length} products${result.beforeConnectorFilter !== null ? ` (of ${result.beforeConnectorFilter} before the connector's defence filter)` : ''}`);

  const unknownNums = new Set<string>();
  const markup = cfg.markup[supplier];
  for (const p of products) {
    const r = resolveCategory(p, categoryMap, tree, unknownNums);
    const match = findBLMatch(bl.index, supplier, p.ean, p.connector_sku);
    const ownStock = match && cfg.hydraWarehouse ? (bl.records.get(match.id)?.stock[cfg.hydraWarehouse] ?? 0) : 0;
    const sp = markup !== null ? sellingPrice(p, markup) : null;
    // Filter price as in the dry-run: purchase + markup, purchase/gross when the markup is unknown
    const filterPrice = sp ? sp.price : (p.price_purchase ?? p.price_gross);
    const fr = filterProduct(p, r.hydraNum, p.stock ?? 0, ownStock, filterPrice, ASSORTMENT_RULES);
    const variantEans = p.variants.map((v) => (v.ean ?? '').trim()).filter(Boolean);
    result.items.push({
      supplier,
      id: p.connector_product_id,
      sku: (p.connector_sku ?? '').trim(),
      ean: (p.ean ?? '').trim(),
      name: p.name,
      brand: p.brand ?? '',
      stock: p.stock ?? 0,
      pricePurchase: p.price_purchase,
      priceGross: p.price_gross,
      expectedPrice: sp ? sp.price : null,
      priceFromFallback: sp ? sp.fromFallback : !(p.price_purchase && p.price_purchase > 0),
      taxRate: p.tax_rate,
      weightG: p.weight_g,
      images: p.images.length,
      hasDescription: (p.description_html ?? '').replace(/<[^>]*>|&lt;[^&]*&gt;/g, '').trim().length > 0,
      supplierCategory: p.supplier_category_name ?? '',
      hydraNum: r.hydraNum,
      status: r.status,
      computedTags: computeImportTags(r),
      admitted: fr.allowed,
      reason: fr.reason,
      hasVariants: p.has_variants,
      variantCount: p.variants.length,
      variantEans,
      variantNames: p.variants.slice(0, 6).map((v) => v.variant_name),
      blId: match?.id,
      via: match?.via,
    });
  }
  result.ok = true;
  result.unknownNums = [...unknownNums].sort();
  log(`  admitted by the assortment filter: ${result.items.filter((i) => i.admitted).length}, matched in BL: ${result.items.filter((i) => i.blId !== undefined).length}`);
  return result;
}

// ── Report scaffolding ───────────────────────────────────────────────────────

type Verdict = 'OK' | 'błąd importera' | 'problem feedu' | 'decyzja klienta' | 'brak danych';

interface CsvFile {
  file: string;
  headers: string[];
  rows: unknown[][];
  /** total rows before the 50-row cut */
  total: number;
}

interface Section {
  md: string[];
  csv: CsvFile[];
}

function table(headers: string[], rows: Array<Array<string | number>>): string[] {
  const cell = (v: string | number) => redactSecrets(String(v)).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  return [
    `| ${headers.map(cell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map((v) => (typeof v === 'number' ? fmt(v) : cell(v))).join(' | ')} |`),
  ];
}

function csvOf<T>(file: string, headers: string[], all: readonly T[], row: (x: T) => unknown[], groupOf: (x: T) => string): CsvFile {
  return { file, headers, rows: pickRows(all, MAX_CSV_ROWS, groupOf).map(row), total: all.length };
}

function csvRef(c: CsvFile): string {
  return `\`${c.file}\` (${Math.min(c.total, MAX_CSV_ROWS)} z ${fmt(c.total)})`;
}

function csvNote(c: CsvFile): string {
  return c.total === 0 ? '' : ` — przykłady: ${csvRef(c)}`;
}

type Owner = Supplier | 'other';
const ownerOf = (r: BLRec): Owner => r.sup.creator ?? 'other';
const OWNER_LABEL = (o: Owner) => (o === 'other' ? 'inne (SKU bez prefiksu)' : SUPPLIER_LABEL[o]);
const OWNERS: Owner[] = [...SUPPLIERS, 'other'];

function hasTag(r: BLRec, t: string): boolean {
  return r.tags.includes(t);
}

function effectivePermit(tags: readonly string[]): boolean {
  return tags.includes(TAG_PERMIT) && !tags.includes(TAG_PERMIT_OFF);
}

function sectionOf(hydraNum: string | null): string {
  return hydraNum ? normNum(hydraNum).split('.')[0] : '0';
}

function pickupOf(tags: readonly string[], hydraNum: string | null): boolean {
  const sec = sectionOf(hydraNum);
  // age_min = 18 for permit or age_18 (permit_off keeps 18+, HA-2.17); sections 01/02 always pickup
  return tags.includes(TAG_PERMIT) || tags.includes(TAG_AGE_18) || sec === '1' || sec === '2';
}

// ── Audit context ────────────────────────────────────────────────────────────

interface Ctx {
  cfg: Config;
  args: Args;
  bl: BLState;
  tree: HydraTreeJson;
  feeds: Map<Supplier, FeedResult>;
  /** BL id → feed items of each supplier that the key maps onto it */
  byRecord: Map<number, Partial<Record<Supplier, FeedItem[]>>>;
  facts: Record<string, number | string>;
}

function okFeeds(ctx: Ctx): FeedResult[] {
  return ctx.args.suppliers.map((s) => ctx.feeds.get(s)!).filter((f) => f.ok);
}

function itemsFor(ctx: Ctx, id: number): FeedItem[] {
  const by = ctx.byRecord.get(id);
  return by ? SUPPLIERS.flatMap((s) => by[s] ?? []) : [];
}

function brandFor(ctx: Ctx, r: BLRec): string {
  const items = itemsFor(ctx, r.id);
  const own = r.sup.creator ? items.find((i) => i.supplier === r.sup.creator) : undefined;
  return (own ?? items[0])?.brand || r.features['Marka'] || r.features['Producent'] || '';
}

function hydraOfRecord(ctx: Ctx, r: BLRec): string | null {
  return ctx.tree.numById.get(r.categoryId) ?? null;
}

// ── A. Coverage, stock and price ─────────────────────────────────────────────

function sectionA(ctx: Ctx): Section {
  const { cfg, bl } = ctx;
  const md: string[] = ['## A. Pokrycie: feed → filtr → BaseLinker', ''];
  const sups = okFeeds(ctx).map((f) => f.supplier);
  const rows: Array<Array<string | number>> = [];
  const missingAll: FeedItem[] = [];
  const orphanAll: Array<{ s: Supplier; r: BLRec; stock: number }> = [];
  const outOfFilterAll: FeedItem[] = [];
  const stockDiffAll: Array<{ i: FeedItem; r: BLRec; bl: number }> = [];
  const priceDiffAll: Array<{ i: FeedItem; r: BLRec; sale: number | null; purchase: number | null; shared: boolean; kind: string }> = [];
  const stockRows: Array<Array<string | number>> = [];
  const priceRows: Array<Array<string | number>> = [];
  let missingTotal = 0, admittedTotal = 0, orphanTotal = 0, orphanStale = 0, orphanStaleApproved = 0, ownPriceDiff = 0, sharedPriceDiff = 0;

  for (const s of sups) {
    const feed = ctx.feeds.get(s)!;
    const items = feed.items;
    const admitted = items.filter((i) => i.admitted);
    const inBl = admitted.filter((i) => i.blId !== undefined);
    const missing = admitted.filter((i) => i.blId === undefined);
    const outOfFilter = items.filter((i) => !i.admitted && i.blId !== undefined);
    const matchedIds = new Set(items.map((i) => i.blId).filter((x): x is number => x !== undefined));
    const skus = new Set(items.map((i) => i.sku));
    const wh = cfg.warehouse[s];
    const members = [...bl.records.values()].filter((r) => r.sup.members.includes(s));
    const orphans = members.filter((r) => !matchedIds.has(r.id) && !skus.has(r.sup.codes[s] ?? ''));
    const stale = orphans.filter((r) => wh !== null && (r.stock[wh] ?? 0) > 0);
    missingAll.push(...missing);
    outOfFilterAll.push(...outOfFilter);
    orphanAll.push(...orphans.map((r) => ({ s, r, stock: wh ? (r.stock[wh] ?? 0) : 0 })));
    missingTotal += missing.length;
    admittedTotal += admitted.length;
    orphanTotal += orphans.length;
    orphanStale += stale.length;
    orphanStaleApproved += stale.filter((r) => hasTag(r, 'approved')).length;
    const reasons = Object.entries(
      outOfFilter.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.reason]: (acc[i.reason] ?? 0) + 1 }), {}),
    ).map(([k, v]) => `${k} ${v}`).join(', ') || '—';
    const missingShare = admitted.length ? missing.length / admitted.length : 0;
    const verdict: Verdict = missing.length === 0 ? 'OK' : missingShare <= 0.02 ? 'OK' : 'błąd importera';
    rows.push([
      SUPPLIER_LABEL[s],
      feed.beforeConnectorFilter !== null ? `${fmt(feed.beforeConnectorFilter)} → ${fmt(items.length)}` : fmt(items.length),
      admitted.length,
      `${fmt(inBl.length)} (EAN ${fmt(inBl.filter((i) => i.via === 'ean').length)}, SKU ${fmt(inBl.filter((i) => i.via === 'sku').length)})`,
      `${fmt(missing.length)} (${pct(missing.length, admitted.length)})`,
      members.length,
      `${fmt(orphans.length)} (stan > 0: ${fmt(stale.length)})`,
      `${fmt(outOfFilter.length)} (${reasons})`,
      verdict === 'OK' && missing.length > 0 ? 'OK (≤ 2% — nadrobi najbliższy import)' : verdict,
    ]);

    // Stock: every matched feed product (sync writes the whole feed, no filter)
    const matched = items.filter((i) => i.blId !== undefined);
    if (wh === null) {
      stockRows.push([SUPPLIER_LABEL[s], matched.length, '—', '—', '—', '—', `brak danych (${WAREHOUSE_ENV[s]} nieustawione)`]);
    } else {
      let eq = 0, blPos = 0, blZero = 0, other = 0;
      for (const i of matched) {
        const r = bl.records.get(i.blId!);
        if (!r) continue;
        const v = r.stock[wh] ?? 0;
        if (v === i.stock) { eq++; continue; }
        stockDiffAll.push({ i, r, bl: v });
        if (v > 0 && i.stock <= 0) blPos++;
        else if (v <= 0 && i.stock > 0) blZero++;
        else other++;
      }
      const diff = blPos + blZero + other;
      stockRows.push([
        SUPPLIER_LABEL[s], matched.length, eq, `${fmt(diff)} (${pct(diff, matched.length)})`, blPos, blZero,
        diff === 0 ? 'OK' : s === 'spechurt' ? 'do wyjaśnienia (stan Spechurta zmienia się raz na dobę)' : 'OK, jeśli feed zmienił się od nocnego synca',
      ]);
    }

    // Price: selling price group vs purchase × (1 + markup); purchase group vs feed purchase
    const markup = cfg.markup[s];
    if (cfg.priceGroup === null || markup === null) {
      priceRows.push([SUPPLIER_LABEL[s], matched.length, '—', '—', '—', '—', `brak danych (${cfg.priceGroup === null ? 'BASELINKER_PRICE_GROUP' : MARKUP_ENV[s]} nieustawione)`]);
    } else {
      let own = 0, ownDiff = 0, shared = 0, sharedDiff = 0, purchaseDiff = 0, fallback = 0;
      for (const i of matched) {
        const r = bl.records.get(i.blId!);
        if (!r) continue;
        const isShared = r.sup.members.length > 1;
        const sale = r.prices[String(cfg.priceGroup)] ?? null;
        const purchase = cfg.priceGroupPurchase !== null ? (r.prices[String(cfg.priceGroupPurchase)] ?? null) : null;
        if (i.priceFromFallback) fallback++;
        const saleDiff = sale === null || Math.abs(sale - (i.expectedPrice ?? 0)) > 0.01;
        const purDiff = cfg.priceGroupPurchase !== null && i.pricePurchase !== null && i.pricePurchase > 0
          && (purchase === null || Math.abs(purchase - round2(i.pricePurchase)) > 0.01);
        if (isShared) { shared++; if (saleDiff) sharedDiff++; } else { own++; if (saleDiff) ownDiff++; }
        if (purDiff) purchaseDiff++;
        if (saleDiff || purDiff) {
          priceDiffAll.push({ i, r, sale, purchase, shared: isShared, kind: [saleDiff ? 'sprzedaż' : '', purDiff ? 'zakup' : ''].filter(Boolean).join('+') });
        }
      }
      ownPriceDiff += ownDiff;
      sharedPriceDiff += sharedDiff;
      priceRows.push([
        `${SUPPLIER_LABEL[s]} (narzut ${markup}%)`, `${fmt(own)} / ${fmt(shared)}`, `${fmt(ownDiff)} (${pct(ownDiff, own)})`, `${fmt(sharedDiff)} (${pct(sharedDiff, shared)})`, purchaseDiff, fallback,
        ownDiff + purchaseDiff === 0 ? (sharedDiff > 0 ? 'OK; wspólne → decyzja klienta (O-32)' : 'OK') : 'OK, jeśli cena w feedzie zmieniła się od nocnego synca — inaczej błąd importera',
      ]);
    }
  }

  md.push(...table(
    ['Hurtownia', 'Feed (przed → po filtrze konektora)', 'Przyjęte przez filtr', 'Przyjęte i obecne w BL', 'Przyjęte, brak w BL', 'Rekordy BL z kodem hurtowni', 'Osierocone w BL (kodu nie ma w feedzie)', 'W BL, dziś poza filtrem', 'Werdykt'],
    rows,
  ), '');
  md.push('Przyjęte, a nieobecne w BL mogą wynikać ze zmiany stanu w feedzie po nocnym imporcie (filtr wymaga stanu > 0) — następny import je doda. ' +
    'Osierocone to rekordy z kodem hurtowni (prefiks SKU albo parametr `SKU …`), którego nie ma w dzisiejszym feedzie: import ich nie rusza, a sync nie zeruje ich stanu (O6).', '');

  const cMissing = csvOf('A_przyjete_brak_w_BL.csv', ['hurtownia', 'sku_feed', 'ean', 'nazwa', 'hydra', 'stan_feed', 'cena_sprzedazy_wg_importu'],
    missingAll, (i) => [i.supplier, i.sku, i.ean, i.name, i.hydraNum ?? '', i.stock, i.expectedPrice ?? ''], (i) => i.supplier);
  const cOrphan = csvOf('A_osierocone_w_BL.csv', ['hurtownia', 'bl_id', 'bl_sku', 'kod_hurtowni', 'nazwa', 'stan_w_magazynie_hurtowni', 'approved', 'tagi'],
    [...orphanAll].sort((a, b) => b.stock - a.stock),
    (o) => [o.s, o.r.id, o.r.sku, o.r.sup.codes[o.s] ?? '', o.r.name, o.stock, hasTag(o.r, 'approved') ? 'tak' : 'nie', o.r.tags.join(' ')], (o) => o.s);
  const cOut = csvOf('A_w_BL_poza_filtrem.csv', ['hurtownia', 'bl_id', 'sku_feed', 'nazwa', 'powod', 'hydra', 'stan_feed'],
    outOfFilterAll, (i) => [i.supplier, i.blId, i.sku, i.name, i.reason, i.hydraNum ?? '', i.stock], (i) => `${i.supplier}/${i.reason}`);
  md.push(`- przyjęte, brak w BL: **${fmt(missingTotal)}** z ${fmt(admittedTotal)}${csvNote(cMissing)}`);
  md.push(`- osierocone w BL: **${fmt(orphanTotal)}**, z nich ze stanem > 0 w magazynie hurtowni: **${fmt(orphanStale)}** (w tym z tagiem \`approved\`, czyli widoczne w sklepie: ${fmt(orphanStaleApproved)})${csvNote(cOrphan)} — ` +
    (orphanStale > 0 ? 'werdykt: **błąd importera** (stan towaru, którego hurtownia już nie oferuje, zostaje w BL; deferred 2026-10-13)' : 'werdykt: OK; co robić z wycofanymi rekordami — **decyzja klienta**'));
  md.push(`- w BL, ale dziś poza filtrem (import ich nie aktualizuje, sync — tak)${csvNote(cOut)}`, '');

  md.push('### Stan: BL (magazyn hurtowni) vs feed', '');
  md.push(...table(['Hurtownia', 'Dopasowane produkty feedu', 'Stan zgodny', 'Stan różny', 'BL > 0, feed 0 (ryzyko sprzedaży bez towaru)', 'BL 0, feed > 0', 'Werdykt'], stockRows), '');
  const cStock = csvOf('A_stan_rozbiezny.csv', ['hurtownia', 'bl_id', 'sku_feed', 'nazwa', 'stan_feed', 'stan_BL'],
    [...stockDiffAll].sort((a, b) => Math.abs(b.bl - b.i.stock) - Math.abs(a.bl - a.i.stock)),
    (d) => [d.i.supplier, d.r.id, d.i.sku, d.i.name, d.i.stock, d.bl], (d) => d.i.supplier);
  if (cStock.total) md.push(`Przykłady: ${csvRef(cStock)}. Sync biegnie raz na noc (O9), a audyt czyta feed teraz — część różnic to zwykły ruch stanów w ciągu dnia; liczy się kolumna „BL > 0, feed 0”.`, '');

  md.push('### Cena: BL vs cena zakupu z feedu × (1 + narzut)', '');
  md.push(...table(['Hurtownia', 'Rekordy własne / wspólne', 'Cena sprzedaży różna — własne', 'Cena sprzedaży różna — wspólne', 'Cena zakupu różna', 'Bez ceny zakupu (fallback na cenę brutto z feedu)', 'Werdykt'], priceRows), '');
  const cPrice = csvOf('A_cena_rozbiezna.csv', ['hurtownia', 'bl_id', 'sku_feed', 'nazwa', 'co', 'rekord_wspolny', 'cena_zakupu_feed', 'cena_sprzedazy_wg_importu', 'cena_sprzedazy_BL', 'cena_zakupu_BL', 'fallback'],
    [...priceDiffAll].sort((a, b) => Number(a.shared) - Number(b.shared)),
    (d) => [d.i.supplier, d.r.id, d.i.sku, d.i.name, d.kind, d.shared ? 'tak' : 'nie', d.i.pricePurchase ?? '', d.i.expectedPrice ?? '', d.sale ?? '', d.purchase ?? '', d.i.priceFromFallback ? 'tak' : 'nie'],
    (d) => `${d.i.supplier}/${d.shared}`);
  if (cPrice.total) md.push(`Przykłady: ${csvRef(cPrice)}. Rekord wspólny dostaje cenę hurtowni, która ostatnia robiła sync — rozjazd na nim jest oczekiwany, dopóki nie zapadnie O-32.`, '');

  ctx.facts.admitted = admittedTotal;
  ctx.facts.missing = missingTotal;
  ctx.facts.orphans = orphanTotal;
  ctx.facts.orphanStale = orphanStale;
  ctx.facts.orphanStaleApproved = orphanStaleApproved;
  ctx.facts.ownPriceDiff = ownPriceDiff;
  ctx.facts.sharedPriceDiff = sharedPriceDiff;
  ctx.facts.stockBlPosFeedZero = stockDiffAll.filter((d) => d.bl > 0 && d.i.stock <= 0).length;
  return { md, csv: [cMissing, cOrphan, cOut, cStock, cPrice] };
}

// ── B. Categories ────────────────────────────────────────────────────────────

function sectionB(ctx: Ctx): Section {
  const { bl, tree } = ctx;
  const md: string[] = ['## B. Kategorie', ''];
  const unassigned = tree.unassignedId;
  const rows: Array<Array<string | number>> = [];
  let in00 = 0, noCat = 0;
  for (const o of OWNERS) {
    const recs = [...bl.records.values()].filter((r) => ownerOf(r) === o);
    if (recs.length === 0) continue;
    const c00 = recs.filter((r) => r.categoryId === unassigned).length;
    const cNone = recs.filter((r) => !r.categoryId || !bl.categories.has(r.categoryId)).length;
    const cOutside = recs.filter((r) => r.categoryId && bl.categories.has(r.categoryId) && !tree.numById.has(r.categoryId)).length;
    const tag = (t: string) => recs.filter((r) => hasTag(r, t)).length;
    const noStatus = recs.filter((r) => !['auto', 'review', 'flag'].some((t) => hasTag(r, t))).length;
    in00 += c00;
    noCat += cNone;
    rows.push([OWNER_LABEL(o), recs.length, c00, cNone, cOutside, tag('auto'), tag('review'), tag('flag'), noStatus,
      c00 + cNone === 0 ? 'OK' : 'błąd importera (import nie powinien zapisywać produktów w 00 — flag nie przechodzi filtra)']);
  }
  md.push(...table(['Twórca rekordu', 'Rekordy', 'W „00. DO PRZYPISANIA”', 'Bez kategorii / kategoria nieistniejąca', 'Kategoria spoza drzewa Hydry', 'auto', 'review', 'flag', 'bez tagu statusu', 'Werdykt'], rows), '');

  // Category drift: the import rewrites the category on every run, so a different category on an
  // admitted, matched record means either an admin edit since the last import or a mapping change
  const drift: Array<{ r: BLRec; i: FeedItem; expected: number }> = [];
  for (const r of bl.records.values()) {
    const items = itemsFor(ctx, r.id).filter((i) => i.admitted && i.hydraNum);
    if (items.length === 0) continue;
    const expected = items.map((i) => tree.resolve(i.hydraNum!)).filter((x): x is number => x !== undefined);
    if (expected.length && !expected.includes(r.categoryId)) drift.push({ r, i: items[0], expected: expected[0] });
  }
  const cDrift = csvOf('B_kategoria_inna_niz_mapa.csv', ['bl_id', 'hurtownia', 'sku_feed', 'nazwa', 'kategoria_BL', 'kategoria_wg_mapy'],
    drift, (d) => [d.r.id, d.i.supplier, d.i.sku, d.r.name, `${tree.numById.get(d.r.categoryId) ?? '?'} ${bl.categories.get(d.r.categoryId)?.name ?? d.r.categoryId}`, `${d.i.hydraNum} ${bl.categories.get(d.expected)?.name ?? d.expected}`],
    (d) => d.i.supplier);
  md.push(`- rekordy przyjęte dziś przez filtr, których kategoria w BL różni się od tej z mapy: **${fmt(drift.length)}**${csvNote(cDrift)}. ` +
    'Import nadpisuje kategorię przy każdym przebiegu (O3), więc ręczna zmiana kategorii w BL przetrwa tylko do następnej nocy — poprawki trzeba robić w `category-map.json`.', '');

  // Feed side: status distribution and unmapped supplier paths
  const sRows: Array<Array<string | number>> = [];
  const unmapped = new Map<string, { s: Supplier; path: string; n: number; inStock: number }>();
  const unknown = new Set<string>();
  for (const f of okFeeds(ctx)) {
    const st = (t: StatusTag) => f.items.filter((i) => i.status === t).length;
    const flagged = f.items.filter((i) => i.status === 'flag');
    sRows.push([SUPPLIER_LABEL[f.supplier], f.items.length, st('auto'), st('review'), `${fmt(st('flag'))} (${pct(st('flag'), f.items.length)})`, flagged.filter((i) => i.stock > 0).length]);
    for (const i of flagged) {
      const p = f.supplier === 'kolba' ? `(feed bez kategorii) marka: ${i.brand || '—'}` : i.supplierCategory || '(pusta ścieżka)';
      const key = `${f.supplier}|${p}`;
      const e = unmapped.get(key) ?? { s: f.supplier, path: p, n: 0, inStock: 0 };
      e.n++;
      if (i.stock > 0) e.inStock++;
      unmapped.set(key, e);
    }
    for (const n of f.unknownNums) unknown.add(n);
  }
  md.push('### Feed: rozstrzygnięcie kategorii (cały feed, przed filtrem)', '');
  md.push(...table(['Hurtownia', 'Produkty', 'auto (liść)', 'review (rodzic / reguła niepewna)', 'flag (brak mapowania → 00)', 'flag ze stanem > 0'], sRows), '');
  const top = [...unmapped.values()].sort((a, b) => b.inStock - a.inStock || b.n - a.n);
  md.push('### Top 30 ścieżek hurtowni bez mapowania (sortowane po liczbie produktów ze stanem)', '');
  md.push(...table(['#', 'Hurtownia', 'Ścieżka kategorii hurtowni', 'Produkty', 'Ze stanem > 0'],
    top.slice(0, 30).map((e, k) => [k + 1, SUPPLIER_LABEL[e.s], e.path, e.n, e.inStock])), '');
  md.push('Kolba nie ma kategorii w feedzie — dla niej wiersz to marka produktu bez reguły. Produkt z flagą nie przechodzi filtra (00 nie jest P1), więc każda z tych ścieżek to towar, którego sklep dziś nie dostaje: włączyć do mapy — **decyzja klienta** (czy to asortyment), mapowanie — nasza praca.');
  if (unknown.size) md.push('', `Numery z \`category-map.json\`, których nie ma w drzewie BL (→ 00): ${[...unknown].join(', ')} — **błąd importera** (mapa niezgodna z drzewem).`);
  md.push('');
  const cUnmapped = csvOf('B_sciezki_bez_mapowania.csv', ['hurtownia', 'sciezka', 'produkty', 'ze_stanem'], top, (e) => [e.s, e.path, e.n, e.inStock], () => 'all');

  ctx.facts.in00 = in00;
  ctx.facts.noCategory = noCat;
  ctx.facts.categoryDrift = drift.length;
  ctx.facts.unmappedInStock = top.reduce((a, e) => a + e.inStock, 0);
  ctx.facts.unmappedTop = top[0] ? `${SUPPLIER_LABEL[top[0].s]}: „${top[0].path}” (${top[0].inStock} ze stanem)` : '—';
  return { md, csv: [cDrift, cUnmapped] };
}

// ── C. Permit / age tags ─────────────────────────────────────────────────────

function sectionC(ctx: Ctx): Section {
  const { bl } = ctx;
  const md: string[] = ['## C. Pozwolenia i wiek (tagi w BL)', ''];
  const rows: Array<Array<string | number>> = [];
  const openReview: BLRec[] = [];
  let permitTotal = 0, openTotal = 0, openApproved = 0, age18 = 0, approvedTotal = 0;
  for (const o of OWNERS) {
    const recs = [...bl.records.values()].filter((r) => ownerOf(r) === o);
    if (recs.length === 0) continue;
    const t = (tag: string) => recs.filter((r) => hasTag(r, tag)).length;
    const open = recs.filter((r) => hasTag(r, TAG_PERMIT_REVIEW) && !hasTag(r, TAG_PERMIT_OFF) && !hasTag(r, TAG_PERMIT_OK));
    openReview.push(...open);
    permitTotal += t(TAG_PERMIT);
    openTotal += open.length;
    openApproved += open.filter((r) => hasTag(r, 'approved')).length;
    age18 += t(TAG_AGE_18);
    approvedTotal += t('approved');
    rows.push([OWNER_LABEL(o), recs.length, t(TAG_PERMIT), recs.filter((r) => effectivePermit(r.tags)).length, t(TAG_PERMIT_REVIEW), open.length, t(TAG_AGE_18), t(TAG_PERMIT_OFF), t(TAG_PERMIT_OK), t('approved'),
      open.length ? 'decyzja klienta' : 'OK']);
  }
  md.push(...table(['Twórca rekordu', 'Rekordy', 'permit', 'permit bez permit_off (wymaga pozwolenia)', 'permit_review', 'permit_review nierozstrzygnięte', 'age_18', 'permit_off', 'permit_ok', 'approved', 'Werdykt'], rows), '');

  // Import-owned tags on records of one supplier vs what the import would compute today
  const tagDiff: Array<{ r: BLRec; i: FeedItem; expected: string[] }> = [];
  for (const r of bl.records.values()) {
    if (r.sup.members.length > 1) continue; // shared: tags of whichever supplier imported last
    const i = itemsFor(ctx, r.id).find((x) => x.admitted);
    if (!i) continue;
    const expected = mergeImportTags(r.tags, i.computedTags).filter((t) => IMPORT_OWNED_TAGS.has(t)).sort();
    const actual = r.tags.filter((t) => IMPORT_OWNED_TAGS.has(t)).sort();
    if (expected.join(' ') !== actual.join(' ')) tagDiff.push({ r, i, expected });
  }
  const cOpen = csvOf('C_permit_review_nierozstrzygniete.csv', ['bl_id', 'sku', 'nazwa', 'hydra', 'approved', 'tagi'],
    openReview, (r) => [r.id, r.sku, r.name, hydraOfRecord(ctx, r) ?? '', hasTag(r, 'approved') ? 'tak' : 'nie', r.tags.join(' ')], (r) => hydraOfRecord(ctx, r) ?? '');
  const cDiff = csvOf('C_tagi_inne_niz_import.csv', ['bl_id', 'hurtownia', 'nazwa', 'hydra', 'tagi_BL', 'tagi_wg_importu'],
    tagDiff, (d) => [d.r.id, d.i.supplier, d.r.name, d.i.hydraNum ?? '', d.r.tags.join(' '), d.expected.join(' ')], (d) => d.i.supplier);
  md.push(`- \`permit_review\` bez decyzji (\`permit_off\` / \`permit_ok\`): **${fmt(openTotal)}**, z nich już z \`approved\`: ${fmt(openApproved)}${csvNote(cOpen)} — każdy z nich idzie odbiorem osobistym do decyzji klienta (grupa C, O-27).`);
  md.push(`- rekordy jednej hurtowni, których tagi importu różnią się od tego, co import policzyłby dziś: **${fmt(tagDiff.length)}**${csvNote(cDiff)} — ` +
    (tagDiff.length ? 'albo zmiana `permit-rules.ts`/mapy po ostatnim imporcie, albo **błąd importera**' : 'OK'), '');

  ctx.facts.permit = permitTotal;
  ctx.facts.permitReviewOpen = openTotal;
  ctx.facts.permitReviewOpenApproved = openApproved;
  ctx.facts.age18 = age18;
  ctx.facts.approved = approvedTotal;
  ctx.facts.tagDiff = tagDiff.length;
  return { md, csv: [cOpen, cDiff] };
}

// ── D. EAN, duplicates, shared records ───────────────────────────────────────

function eanShape(ean: string): string {
  if (!ean) return 'pusty';
  if (!/^\d+$/.test(ean)) return 'nie same cyfry';
  return [8, 12, 13, 14].includes(ean.length) ? 'GTIN' : `${ean.length} cyfr (nie GTIN)`;
}

function sectionD(ctx: Ctx): Section {
  const { bl } = ctx;
  const md: string[] = ['## D. EAN, duplikaty i scalanie', ''];
  const rows: Array<Array<string | number>> = [];
  const feedDupes: Array<{ s: Supplier; kind: string; value: string; i: FeedItem }> = [];
  let noEanAdmitted = 0, admittedAll = 0;
  const noEanPct: string[] = [];
  for (const f of okFeeds(ctx)) {
    const adm = f.items.filter((i) => i.admitted);
    const shapes = f.items.reduce<Record<string, number>>((acc, i) => { const k = eanShape(i.ean); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
    const odd = Object.entries(shapes).filter(([k]) => k !== 'GTIN' && k !== 'pusty').map(([k, v]) => `${k}: ${v}`).join(', ') || '—';
    const group = (key: (i: FeedItem) => string) => {
      const m = new Map<string, FeedItem[]>();
      for (const i of f.items) { const k = key(i); if (!k) continue; m.set(k, [...(m.get(k) ?? []), i]); }
      return [...m.entries()].filter(([, v]) => v.length > 1);
    };
    const eanD = group((i) => i.ean);
    const skuD = group((i) => i.sku);
    for (const [v, list] of eanD) for (const i of list) feedDupes.push({ s: f.supplier, kind: 'EAN', value: v, i });
    for (const [v, list] of skuD) for (const i of list) feedDupes.push({ s: f.supplier, kind: 'SKU', value: v, i });
    const noEan = f.items.filter((i) => !i.ean).length;
    const noEanAdm = adm.filter((i) => !i.ean).length;
    noEanAdmitted += noEanAdm;
    admittedAll += adm.length;
    noEanPct.push(`${SUPPLIER_LABEL[f.supplier]} ${pct(noEanAdm, adm.length)}`);
    rows.push([SUPPLIER_LABEL[f.supplier], `${fmt(noEan)} (${pct(noEan, f.items.length)})`, `${fmt(noEanAdm)} (${pct(noEanAdm, adm.length)})`, odd,
      `${fmt(eanD.length)} EAN / ${fmt(eanD.reduce((a, [, v]) => a + v.length, 0))} produktów`, `${fmt(skuD.length)} SKU`, f.items.filter((i) => !i.sku).length,
      noEan || eanD.length || skuD.length ? 'problem feedu' : 'OK']);
  }
  md.push('### Feed', '');
  md.push(...table(['Hurtownia', 'Bez EAN (cały feed)', 'Bez EAN (przyjęte)', 'EAN o złym kształcie', 'Ten sam EAN w feedzie ≥ 2×', 'Ten sam SKU ≥ 2×', 'Bez SKU', 'Werdykt'], rows), '');
  md.push('Bez EAN produkt łączy się tylko po SKU tej samej hurtowni (O1) — ten sam towar u dwóch hurtowni daje wtedy dwa rekordy. EAN 11-cyfrowe u Sharga to zgubione zero wiodące (parser, deferred 2026-10-13) — **błąd importera**, nie feedu.', '');
  const cFeedD = csvOf('D_duplikaty_w_feedzie.csv', ['hurtownia', 'rodzaj', 'wartosc', 'sku_feed', 'ean', 'nazwa', 'stan'],
    feedDupes, (d) => [d.s, d.kind, d.value, d.i.sku, d.i.ean, d.i.name, d.i.stock], (d) => `${d.s}/${d.kind}`);
  if (cFeedD.total) md.push(`Przykłady: ${csvRef(cFeedD)}. Dwa produkty jednego feedu z tym samym EAN trafiają do jednego rekordu BL — wygrywa ostatni.`, '');

  // BL: EAN / SKU duplicates and shared records
  const groupBy = (key: (r: BLRec) => string) => {
    const m = new Map<string, BLRec[]>();
    for (const r of bl.records.values()) { const k = key(r); if (!k) continue; m.set(k, [...(m.get(k) ?? []), r]); }
    return [...m.entries()].filter(([, v]) => v.length > 1);
  };
  const eanDup = groupBy((r) => r.ean);
  const skuDup = groupBy((r) => r.sku.trim());
  const combos = new Map<string, number>();
  for (const r of bl.records.values()) {
    if (r.sup.members.length < 2) continue;
    const k = r.sup.members.map((s) => SUPPLIER_LABEL[s]).join(' + ');
    combos.set(k, (combos.get(k) ?? 0) + 1);
  }
  const shared = [...combos.values()].reduce((a, b) => a + b, 0);
  md.push('### BaseLinker', '');
  md.push(...table(['Co', 'Liczba', 'Oczekiwane', 'Werdykt'], [
    ['EAN użyty przez ≥ 2 rekordy', `${fmt(eanDup.length)} EAN / ${fmt(eanDup.reduce((a, [, v]) => a + v.length, 0))} rekordów`, '0', eanDup.length ? 'błąd importera' : 'OK'],
    ['SKU użyte przez ≥ 2 rekordy', `${fmt(skuDup.length)} SKU`, '0', skuDup.length ? 'błąd importera' : 'OK'],
    ['Rekordy wspólne (≥ 2 hurtownie)', `${fmt(shared)}${combos.size ? ` (${[...combos.entries()].map(([k, v]) => `${k}: ${fmt(v)}`).join('; ')})` : ''}`, 'tylko przez wspólny EAN', 'OK'],
  ]), '');
  const cEanDup = csvOf('D_duplikaty_EAN_w_BL.csv', ['ean', 'bl_id', 'sku', 'nazwa'],
    eanDup.flatMap(([e, list]) => list.map((r) => ({ e, r }))), (x) => [x.e, x.r.id, x.r.sku, x.r.name], () => 'all');
  if (cEanDup.total) md.push(`Duplikaty EAN: ${csvRef(cEanDup)}.`, '');

  // Candidates without a joining EAN: same producer + normalized name, separate records
  const catalogue: Array<CatalogueItem & { r: BLRec }> = [...bl.records.values()].map((r) => ({
    ref: String(r.id), supplier: ownerOf(r), brand: brandFor(ctx, r), name: r.name, ean: r.ean, r,
  }));
  const cross = duplicateCandidates(catalogue, { crossSupplier: true }).filter((g) => g.ean !== 'ean_same');
  const within = duplicateCandidates(catalogue, { crossSupplier: false }).filter((g) => g.ean !== 'ean_same');
  const flat = (groups: typeof cross) => groups.flatMap((g, n) => g.items.map((it) => ({ n: n + 1, g, it })));
  const groupRow = (x: { n: number; g: (typeof cross)[number]; it: (typeof catalogue)[number] }) =>
    [x.n, x.g.ean === 'ean_missing' ? 'brak EAN u części' : 'różne EAN', x.it.r.id, x.it.supplier, x.it.r.sku, x.it.r.ean, x.it.brand, x.it.r.name];
  const headers = ['grupa', 'ean', 'bl_id', 'hurtownia', 'sku', 'ean_BL', 'producent', 'nazwa'];
  const cCross = { ...csvOf('D_kandydaci_duplikatow_miedzy_hurtowniami.csv', headers, flat(cross).slice(0, MAX_CSV_ROWS), groupRow, () => 'all'), total: flat(cross).length };
  const cWithin = { ...csvOf('D_kandydaci_duplikatow_w_hurtowni.csv', headers, flat(within).slice(0, MAX_CSV_ROWS), groupRow, () => 'all'), total: flat(within).length };
  md.push('### Kandydaci na duplikaty bez łączącego EAN (producent + znormalizowana nazwa) — tylko do oceny, nic nie scalono', '');
  md.push(...table(['Zakres', 'Grupy', 'Rekordy', 'z tego: brak EAN u części / różne EAN', 'Werdykt'], [
    ['między hurtowniami', cross.length, cross.reduce((a, g) => a + g.items.length, 0), `${cross.filter((g) => g.ean === 'ean_missing').length} / ${cross.filter((g) => g.ean === 'ean_differs').length}`, cross.length ? 'decyzja klienta' : 'OK'],
    ['w obrębie jednej hurtowni', within.length, within.reduce((a, g) => a + g.items.length, 0), `${within.filter((g) => g.ean === 'ean_missing').length} / ${within.filter((g) => g.ean === 'ean_differs').length}`, within.length ? 'problem feedu / decyzja klienta' : 'OK'],
  ]), '');
  md.push(`Klucz: producent + nazwa po normalizacji (encje, polskie litery, interpunkcja, kolejność słów, słowa producenta usunięte; \`xml-integration/import-audit.ts\`). Różne EAN w grupie to częściej warianty (kolor, wersja) niż duplikaty — patrz sekcja E.${[cCross, cWithin].filter((c) => c.total).map((c) => ` Przykłady: ${csvRef(c)}.`).join('')}`, '');

  ctx.facts.noEanPct = noEanPct.join(', ');
  ctx.facts.noEanAdmitted = noEanAdmitted;
  ctx.facts.admittedAll = admittedAll;
  ctx.facts.blEanDup = eanDup.length;
  ctx.facts.shared = shared;
  ctx.facts.dupCrossGroups = cross.length;
  ctx.facts.dupWithinGroups = within.length;
  return { md, csv: [cFeedD, cEanDup, cCross, cWithin] };
}

// ── E. Variants ──────────────────────────────────────────────────────────────

function sectionE(ctx: Ctx): Section {
  const { bl, cfg } = ctx;
  const md: string[] = ['## E. Warianty', ''];
  const withVariants = [...bl.records.values()].filter((r) => r.variants > 0).length;
  md.push(`- BL: rekordy z \`parent_id\` > 0 na liście produktów: **${fmt(bl.listedWithParent)}**, rekordy z wariantami w danych produktu: **${fmt(withVariants)}** — ` +
    (bl.listedWithParent + withVariants === 0 ? 'w katalogu nie ma ani jednego wariantu BL; import zapisuje każdy produkt feedu jako pojedynczy rekord (`parent_id: 0`, O5).' : 'w katalogu są warianty BL — import ich nie tworzy, więc to dane spoza importu.'), '');

  const rows: Array<Array<string | number>> = [];
  const flattened: Array<{ i: FeedItem; r: BLRec }> = [];
  for (const f of okFeeds(ctx)) {
    const v = f.items.filter((i) => i.hasVariants);
    const vAdm = v.filter((i) => i.admitted);
    const vBl = v.filter((i) => i.blId !== undefined);
    if (f.supplier === 'kolba') {
      rows.push([SUPPLIER_LABEL[f.supplier], `${fmt(v.length)} (ilosc_wariantow > 0)`, vAdm.length, vBl.length, '— (feed podaje tylko liczbę)', '—', '—', '—', 'problem feedu (brak listy wariantów)']);
      continue;
    }
    const wh = cfg.warehouse[f.supplier];
    let single = 0, eanFirst = 0, otherEans = 0, otherEansInBl = 0, stockSum = 0;
    for (const i of vBl) {
      const r = bl.records.get(i.blId!);
      if (!r) continue;
      if (r.parentId === 0 && r.variants === 0) { single++; flattened.push({ i, r }); }
      if (r.ean && r.ean === i.ean) eanFirst++;
      const others = [...new Set(i.variantEans.filter((e) => e !== i.ean))];
      otherEans += others.length;
      otherEansInBl += others.filter((e) => bl.index.byEan.has(e)).length;
      if (wh && (r.stock[wh] ?? 0) === i.stock) stockSum++;
    }
    rows.push([
      SUPPLIER_LABEL[f.supplier], v.length, vAdm.length, vBl.length, `${fmt(single)} z ${fmt(vBl.length)}`, `${fmt(eanFirst)}`, `${fmt(otherEans)} (z nich osobne rekordy w BL: ${fmt(otherEansInBl)})`,
      wh ? `${fmt(stockSum)} z ${fmt(vBl.length)}` : '—', single ? 'decyzja klienta (warianty BL czy osobne produkty)' : 'OK',
    ]);
  }
  md.push(...table(['Hurtownia', 'Produkty wariantowe w feedzie', 'Przyjęte', 'W BL', 'W BL jako jeden rekord bez wariantów (spłaszczone)', 'EAN rekordu = EAN pierwszego rozmiaru/produktu', 'EAN pozostałych rozmiarów', 'Stan w BL = suma rozmiarów', 'Werdykt'], rows), '');
  md.push('Spłaszczenie znaczy: klient widzi jeden produkt ze stanem zsumowanym po rozmiarach, bez wyboru rozmiaru i bez EAN pozostałych rozmiarów. EAN innego rozmiaru, który inna hurtownia ma jako osobny produkt, nie złączy się z tym rekordem.', '');
  const cFlat = csvOf('E_warianty_splaszczone.csv', ['hurtownia', 'bl_id', 'sku_feed', 'nazwa', 'liczba_wariantow', 'warianty', 'stan_feed_suma', 'stan_BL'],
    flattened, (x) => [x.i.supplier, x.r.id, x.i.sku, x.i.name, x.i.variantCount, x.i.variantNames.join(' / '), x.i.stock, cfg.warehouse[x.i.supplier] ? (x.r.stock[cfg.warehouse[x.i.supplier]!] ?? 0) : ''],
    (x) => x.i.supplier);
  if (cFlat.total) md.push(`Przykłady: ${csvRef(cFlat)}.`, '');

  // Candidates for variant groups among separate records
  const items: Array<VariantItem & { r: BLRec }> = [...bl.records.values()].map((r) => {
    const hydra = hydraOfRecord(ctx, r);
    return {
      ref: String(r.id), supplier: ownerOf(r), brand: brandFor(ctx, r), name: r.name, ean: r.ean, r,
      hydraNum: hydra, permit: effectivePermit(r.tags), pickup: pickupOf(r.tags, hydra),
    };
  });
  const groups = variantGroupCandidates(items);
  const bySection = new Map<string, { groups: number; records: number; mixed: number }>();
  const byKind = new Map<string, number>();
  for (const g of groups) {
    const sec = [...new Set(g.categories.map(sectionOf))].join('+');
    const e = bySection.get(sec) ?? { groups: 0, records: 0, mixed: 0 };
    e.groups++;
    e.records += g.items.length;
    if (g.mixedPermit || g.mixedPickup) e.mixed++;
    bySection.set(sec, e);
    byKind.set(g.kind, (byKind.get(g.kind) ?? 0) + 1);
  }
  const mixed = groups.filter((g) => g.mixedPermit || g.mixedPickup);
  md.push('### Kandydaci na grupy wariantów z osobnych rekordów (ten sam producent + nazwa bazowa, różnica w jednym parametrze)', '');
  md.push(`Grup: **${fmt(groups.length)}** (rekordów: ${fmt(groups.reduce((a, g) => a + g.items.length, 0))}); po parametrze: ${[...byKind.entries()].map(([k, v]) => `${k} ${fmt(v)}`).join(', ') || '—'}; ` +
    `grupy mieszające status pozwolenia albo odbioru osobistego: **${fmt(mixed.length)}** — tych nie da się po prostu złączyć w jeden produkt.`, '');
  md.push(...table(['Dział Hydry', 'Grupy', 'Rekordy', 'Z mieszanym pozwoleniem / odbiorem'],
    [...bySection.entries()].sort((a, b) => b[1].groups - a[1].groups).map(([k, v]) => [k === '0' ? '00' : k.padStart(2, '0'), v.groups, v.records, v.mixed])), '');
  const ordered = [...mixed, ...groups.filter((g) => !(g.mixedPermit || g.mixedPickup))];
  const flatG = ordered.flatMap((g, n) => g.items.map((it) => ({ n: n + 1, g, it })));
  const cGroups = {
    ...csvOf('E_kandydaci_grup_wariantow.csv', ['grupa', 'parametr', 'wartosci', 'mieszane_pozwolenie', 'mieszany_odbior', 'bl_id', 'hurtownia', 'sku', 'nazwa', 'hydra', 'permit', 'odbior_osobisty'],
      flatG.slice(0, MAX_CSV_ROWS),
      (x) => [x.n, x.g.kind, x.g.values.join(' / '), x.g.mixedPermit ? 'tak' : 'nie', x.g.mixedPickup ? 'tak' : 'nie', x.it.r.id, x.it.supplier, x.it.r.sku, x.it.r.name, x.it.hydraNum ?? '', x.it.permit ? 'tak' : 'nie', x.it.pickup ? 'tak' : 'nie'],
      () => 'all'),
    total: flatG.length,
  };
  if (cGroups.total) md.push(`Przykłady (najpierw grupy mieszane): ${csvRef(cGroups)}.`, '');

  ctx.facts.blVariants = bl.listedWithParent + withVariants;
  ctx.facts.flattened = flattened.length;
  ctx.facts.variantGroups = groups.length;
  ctx.facts.variantGroupsMixed = mixed.length;
  ctx.facts.kolbaVariants = ctx.feeds.get('kolba')?.ok ? ctx.feeds.get('kolba')!.items.filter((i) => i.hasVariants).length : '—';
  return { md, csv: [cFlat, cGroups] };
}

// ── F. Data quality ──────────────────────────────────────────────────────────

function sectionF(ctx: Ctx): Section {
  const { bl, cfg } = ctx;
  const md: string[] = ['## F. Jakość danych', ''];
  type Check = { key: string; label: string; test: (r: BLRec) => string | null; feedTest?: (i: FeedItem) => boolean };
  const pg = cfg.priceGroup !== null ? String(cfg.priceGroup) : null;
  const ppg = cfg.priceGroupPurchase !== null ? String(cfg.priceGroupPurchase) : null;
  const checks: Check[] = [
    { key: 'brak_zdjec', label: 'brak zdjęć', test: (r) => (r.images === 0 ? '0 zdjęć' : null), feedTest: (i) => i.images === 0 },
    { key: 'brak_opisu', label: 'brak opisu', test: (r) => (r.hasDescription ? null : 'pusty opis'), feedTest: (i) => !i.hasDescription },
    { key: 'cena_sprzedazy_0', label: 'cena sprzedaży 0 / brak', test: (r) => (pg && !((r.prices[pg] ?? 0) > 0) ? `cena ${r.prices[pg] ?? 'brak'}` : null), feedTest: (i) => !(i.priceGross > 0) && !((i.pricePurchase ?? 0) > 0) },
    { key: 'brak_ceny_zakupu', label: 'cena zakupu 0 / brak', test: (r) => (ppg && !((r.prices[ppg] ?? 0) > 0) ? `zakup ${r.prices[ppg] ?? 'brak'}` : null), feedTest: (i) => !((i.pricePurchase ?? 0) > 0) },
    { key: 'cena_ponizej_zakupu', label: 'cena sprzedaży < cena zakupu', test: (r) => (pg && ppg && (r.prices[pg] ?? 0) > 0 && (r.prices[ppg] ?? 0) > 0 && r.prices[pg] < r.prices[ppg] ? `${r.prices[pg]} < ${r.prices[ppg]}` : null) },
    { key: 'stan_ujemny', label: 'stan ujemny', test: (r) => { const neg = Object.entries(r.stock).filter(([, v]) => v < 0); return neg.length ? neg.map(([k, v]) => `${k}=${v}`).join(' ') : null; }, feedTest: (i) => i.stock < 0 },
    { key: 'brak_vat', label: 'brak VAT', test: (r) => (r.taxRate === null ? 'brak' : null) },
    { key: 'vat_inny_niz_23', label: 'VAT ≠ 23%', test: (r) => (r.taxRate !== null && r.taxRate !== 23 ? `${r.taxRate}%` : null), feedTest: (i) => i.taxRate !== 23 },
    { key: 'brak_wagi', label: 'brak wagi (0)', test: (r) => (r.weight > 0 ? null : '0 kg'), feedTest: (i) => !((i.weightG ?? 0) > 0) },
    { key: 'nazwa', label: 'nazwa z encjami HTML / śmieciami', test: (r) => { const x = nameIssues(r.name).filter((k) => k !== 'all_caps'); return x.length ? x.join(' ') : null; }, feedTest: (i) => nameIssues(i.name).some((k) => k !== 'all_caps') },
  ];
  const owners = OWNERS.filter((o) => [...bl.records.values()].some((r) => ownerOf(r) === o));
  const hits = new Map<string, Array<{ r: BLRec; detail: string; source: 'feed' | 'import' | 'orphan' }>>();
  for (const c of checks) hits.set(c.key, []);
  for (const r of bl.records.values()) {
    const items = itemsFor(ctx, r.id);
    for (const c of checks) {
      const d = c.test(r);
      if (d === null) continue;
      // Where the gap comes from: the matched feed product has it too (feed), it does not (import),
      // or the record has no product in today's feeds (orphan, section A)
      const source = items.length === 0 ? 'orphan' : c.feedTest && items.some(c.feedTest) ? 'feed' : 'import';
      hits.get(c.key)!.push({ r, detail: d, source });
    }
  }
  const rows: Array<Array<string | number>> = [];
  const csv: CsvFile[] = [];
  for (const c of checks) {
    const list = hits.get(c.key)!;
    const per = owners.map((o) => { const all = [...bl.records.values()].filter((r) => ownerOf(r) === o).length; const n = list.filter((x) => ownerOf(x.r) === o).length; return `${fmt(n)} (${pct(n, all)})`; });
    const src = (k: 'feed' | 'import' | 'orphan') => list.filter((x) => x.source === k).length;
    let verdict: string = list.length === 0 ? 'OK' : src('import') > 0 ? 'błąd importera' : src('feed') > 0 ? 'problem feedu' : 'tylko rekordy osierocone (A)';
    if (src('import') > 0 && src('feed') > 0) verdict = 'błąd importera + problem feedu';
    if (list.length && c.key === 'nazwa' && src('import') === 0) verdict = 'problem feedu (dekodowanie encji możliwe po naszej stronie)';
    if ((c.key === 'cena_sprzedazy_0' && !pg) || (c.key === 'brak_ceny_zakupu' && !ppg)) verdict = 'brak danych (grupa cen nieustawiona)';
    rows.push([c.label, ...per, c.feedTest ? `${fmt(src('feed'))} / ${fmt(src('import'))} / ${fmt(src('orphan'))}` : `— / ${fmt(src('import'))} / ${fmt(src('orphan'))}`, verdict]);
    const f = csvOf(`F_${c.key}.csv`, ['bl_id', 'tworca', 'sku', 'nazwa', 'szczegol', 'zrodlo'], list, (x) => [x.r.id, ownerOf(x.r), x.r.sku, x.r.name, x.detail, x.source], (x) => `${ownerOf(x.r)}/${x.source}`);
    if (f.total) csv.push(f);
    ctx.facts[`F_${c.key}`] = list.length;
  }
  md.push(...table(['Problem', ...owners.map((o) => `BL: ${OWNER_LABEL(o)}`), 'Źródło: feed / import / brak w feedzie', 'Werdykt'], rows), '');
  const issueCounts = new Map<NameIssue, number>();
  for (const r of bl.records.values()) for (const k of nameIssues(r.name)) issueCounts.set(k, (issueCounts.get(k) ?? 0) + 1);
  md.push(`Nazwy w BL — rodzaje problemów: ${[...issueCounts.entries()].map(([k, v]) => `${k} ${fmt(v)}`).join(', ') || 'brak'} (all_caps tylko informacyjnie, poza werdyktem). ` +
    '„Źródło” liczy rekordy z problemem: feed — dopasowany produkt dzisiejszego feedu ma ten sam brak; import — feed ma dane, a w BL ich nie ma (albo problem nie ma odpowiednika w feedzie, np. VAT, cena < zakup); brak w feedzie — rekord osierocony. Kolba nie ma w feedzie VAT — konektor zawsze wpisuje 23% (O8).', '');
  for (const c of csv) md.push(`- ${c.file}: ${fmt(c.total)} rekordów (w pliku ${Math.min(c.total, MAX_CSV_ROWS)})`);
  md.push('');
  return { md, csv };
}

// ── G. Import health from the server logs ────────────────────────────────────

const VERDICT_LABEL: Record<RunVerdict, string> = {
  ok: 'OK', ok_with_errors: 'OK z błędami produktów', empty_feed: 'PUSTY FEED', failed: 'BŁĄD', stopped: 'PRZERWANY', no_result: 'bez podsumowania',
};

function sectionG(ctx: Ctx): Section {
  const { args } = ctx;
  const md: string[] = ['## G. Zdrowie importu (logi serwera)', ''];
  if (!args.logs || !fs.existsSync(args.logs)) {
    md.push(`Brak katalogu logów (${args.logs ? 'nie istnieje' : 'nie podano --logs, a ~/logs nie istnieje'}) — sekcja pominięta. Na serwerze audyt uruchomiony jako \`hydra-import\` czyta \`~/logs\` sam.`, '');
    ctx.facts.nightsOk = '—';
    return { md, csv: [] };
  }
  const files = fs.readdirSync(args.logs).filter((f) => /^run-bl-\d{4}-\d{2}\.log$/.test(f)).sort();
  const entries: JournalEntry[] = [];
  for (const f of files) {
    for (const line of fs.readFileSync(path.join(args.logs, f), 'utf8').split('\n')) {
      const e = parseJournalLine(line);
      if (e && !e.standIn) entries.push(e);
    }
  }
  const runs = entries.filter((e) => e.event === 'END');
  const nights = [...new Set(entries.filter((e) => e.event === 'START' || e.event === 'END').map((e) => nightKey(e.at)))].sort().slice(-args.nights);
  if (nights.length === 0) {
    md.push(`W \`${path.basename(args.logs)}\` nie ma wpisów dziennika (\`run-bl-RRRR-MM.log\`) — sekcja pusta.`, '');
    ctx.facts.nightsOk = '—';
    return { md, csv: [] };
  }
  const SLOTS: Array<[Supplier, 'import' | 'sync']> = SUPPLIERS.flatMap((s) => [[s, 'import'], [s, 'sync']] as Array<[Supplier, 'import' | 'sync']>);
  const detail: Array<Array<string | number>> = [];
  const grid: Array<Array<string | number>> = [];
  let okRuns = 0, expected = 0, emptyFeeds = 0, emptyAttempts = 0, failed = 0, missing = 0;
  const csvRows: unknown[][] = [];
  for (const n of nights) {
    const row: Array<string | number> = [n];
    for (const [s, mode] of SLOTS) {
      expected++;
      const ends = runs.filter((e) => nightKey(e.at) === n && e.supplier === s && e.mode === mode);
      const skips = entries.filter((e) => e.event === 'SKIP' && nightKey(e.at) === n && e.supplier === s && e.mode === mode).length;
      const errs = entries.filter((e) => e.event === 'ERROR' && nightKey(e.at) === n && e.supplier === s && e.mode === mode).length;
      if (ends.length === 0) {
        row.push(skips ? `SKIP ×${skips}` : errs ? `ERROR ×${errs}` : 'brak przebiegu');
        if (errs) failed++;
        else missing++;
        continue;
      }
      const cells: string[] = [];
      for (const e of ends) {
        const v = runVerdict(e);
        let sum = summarizeRunLog('');
        if (e.log && fs.existsSync(e.log) && path.dirname(path.resolve(e.log)) === path.resolve(args.logs)) {
          sum = summarizeRunLog(fs.readFileSync(e.log, 'utf8'));
        }
        if (v === 'ok') okRuns++;
        if (v === 'empty_feed') emptyFeeds++;
        if (v === 'failed' || v === 'stopped' || v === 'no_result') failed++;
        emptyAttempts += sum.emptyFeedWarnings;
        cells.push(`${VERDICT_LABEL[v]} ${e.durationS ?? '?'}s${sum.emptyFeedWarnings ? `, pustych prób ${sum.emptyFeedWarnings}` : ''}`);
        csvRows.push([n, s, mode, e.at, e.exit ?? '', e.durationS ?? '', VERDICT_LABEL[v], e.result ?? '', e.stoppedBy ?? (e.killedBySignal !== undefined ? `signal ${e.killedBySignal}` : ''),
          sum.receivedMb.join(' '), sum.parsed.join(' '), sum.emptyFeedWarnings, sum.productErrors, sum.blockedWaits]);
        if (v !== 'ok') detail.push([n, `${SUPPLIER_LABEL[s]} ${mode}`, e.at, VERDICT_LABEL[v], e.result ?? 'none']);
      }
      if (skips) cells.push(`SKIP ×${skips}`);
      row.push(cells.join('; '));
    }
    grid.push(row);
  }
  md.push(`Noce (klucz = data startu minus 12 h; Kolba 22:20, Sharg 01:15 i Spechurt 06:35 jednej nocy mają ten sam klucz): ${nights[0]} … ${nights[nights.length - 1]}.`, '');
  md.push(...table(['Noc', ...SLOTS.map(([s, m]) => `${SUPPLIER_LABEL[s]} ${m}`)], grid), '');
  md.push(`Przebiegi OK: **${fmt(okRuns)} z ${fmt(expected)}** oczekiwanych; puste feedy (\`[fatal] empty feed\`): ${fmt(emptyFeeds)}; próby pobrania z pustą odpowiedzią (\`[warn] empty feed\`, także te, po których kolejna próba się udała): ${fmt(emptyAttempts)}; błędy / przerwane / bez podsumowania / ERROR: ${fmt(failed)}; brak przebiegu (bez SKIP i ERROR): ${fmt(missing)}.`, '');
  if (detail.length) {
    md.push('Przebiegi nie-OK:', '');
    md.push(...table(['Noc', 'Przebieg', 'Koniec', 'Wynik', 'result='], detail), '');
  }
  if (args.cronStderr && fs.existsSync(args.cronStderr)) {
    const lines = fs.readFileSync(args.cronStderr, 'utf8').split('\n').filter(Boolean);
    md.push(`\`cron-stderr.log\`: ${fmt(lines.length)} linii (w tym „run ended with exit”: ${fmt(lines.filter((l) => /run ended with exit/.test(l)).length)}) — plik nie ma dat, liczba obejmuje całą jego historię.`, '');
  }
  const cRuns: CsvFile = {
    file: 'G_przebiegi.csv',
    headers: ['noc', 'hurtownia', 'tryb', 'koniec', 'exit', 'czas_s', 'wynik', 'result', 'zatrzymanie', 'pobrano_MB', 'sparsowano', 'proby_z_pustym_feedem', 'bledy_produktow', 'oczekiwania_na_limit_BL'],
    rows: csvRows.slice(-MAX_CSV_ROWS),
    total: csvRows.length,
  };
  ctx.facts.nightsOk = `${okRuns}/${expected}`;
  ctx.facts.emptyFeeds = emptyFeeds;
  ctx.facts.runFailures = failed;
  ctx.facts.runMissing = missing;
  ctx.facts.emptyAttempts = emptyAttempts;
  ctx.facts.nights = nights.length;
  return { md, csv: [cRuns] };
}

// ── Expectations (KROK 0) and the 10-point summary ───────────────────────────

const EXPECTATIONS = [
  '## 0. Jak import POWINIEN działać (z kodu i dokumentacji)',
  '',
  'Źródła: `xml-integration/README.md`, `SCHEMAS.md`, `PROBLEMY-feedow-xml.md`, `bl-match-key.ts`, `import-tags.ts`, `permit-rules.ts`, `resolve-category.ts`, `assortment-filter.ts`, `scripts/xml-to-baselinker.ts`, `docs/ops/serwer-importu.md`, zadania HA-2.12, 2.15, 2.17, 2.27, 2.28, 2.33. Sekcje A–G odwołują się do numerów O1–O9.',
  '',
  '- **O1 Klucz dopasowania (HA-2.28).** Najpierw EAN — rekord BL z tym EAN, niezależnie od hurtowni; bez trafienia po EAN — pole `sku` BL = `<HURTOWNIA>-<sku z feedu>` (`KOLBA-…`, `SHARG-…`, `SPECHURT-…`), tylko tej samej hurtowni. Rekord wspólny (jeden EAN, kilka hurtowni) zachowuje SKU hurtowni, która go utworzyła, i ma parametry `SKU Kolba` / `SKU Sharg` / `SKU Spechurt` oraz `Źródło opisu`; parametry są scalane, nie zastępowane. Ten sam klucz w imporcie i syncu. EAN w BL nie powinien się powtarzać.',
  '- **O2 Filtr asortymentu (tylko import).** Hurtownia włączona; numer Hydry dokładnie na liście P1 (`allowedHydraNums` + nowe podkategorie P1); stan > 0 w hurtowni albo w magazynie Hydry (`BASELINKER_WAREHOUSE_HYDRA` — na serwerze nieustawione, czyli 0); cena ≥ `minPricePln` (dziś 0 = wyłączone). Sharg ma jeszcze filtr obronny konektora (`SHARG_DEFENCE_PATTERNS`). Sync filtra nie ma — odświeża każdy dopasowany produkt feedu.',
  '- **O3 Kategorie.** `category-map.json` → numer Hydry → kategoria BL z `hydra-categories.json`. Liść → tag `auto`; rodzic albo reguła niepewna → `review`; brak → „00. DO PRZYPISANIA” + `flag`. 00 nie jest P1, więc produkt z `flag` nie przechodzi filtra — import nie powinien zapisywać nic w 00. Kolba nie ma kategorii w feedzie (reguły `kolba_rules` po nazwie/atrybucie, potem marka); Sharg: reguły nazwowe przypięte do ścieżek (HA-2.27), potem słownik ścieżek; Spechurt: słownik ścieżek. Import nadpisuje kategorię przy każdym przebiegu.',
  '- **O4 Tagi (HA-2.17).** Tagi importu `auto`/`review`/`flag`/`permit`/`permit_review`/`age_18` są odświeżane; tagi admina `approved`, `permit_off`, `permit_ok` i inne zostają; `permit_off`/`permit_ok` gaszą `permit_review`. Grupy z `permit-rules.ts`: A → `permit`, B/D → `age_18`, C → `permit` + `permit_review`. Bez `approved` produkt nie trafia do sklepu.',
  '- **O5 Warianty.** Import nie tworzy wariantów BL: każdy produkt feedu = jeden rekord (`parent_id: 0`). Sharg: EAN pierwszego rozmiaru, stan = suma rozmiarów; Spechurt: EAN produktu, stan = `stan_magazynowy`; Kolba: feed podaje tylko liczbę wariantów.',
  '- **O6 Stany per magazyn.** Kolba → H1 (`BASELINKER_WAREHOUSE_H1`), Sharg → H2, Spechurt → H3. Import i sync wpisują stan z feedu do magazynu swojej hurtowni. Produkt, który zniknął z feedu, zostaje w BL z ostatnim stanem — nikt go nie zeruje (deferred 2026-10-13).',
  '- **O7 Ceny i narzut.** Cena sprzedaży = cena zakupu z feedu × (1 + `BASELINKER_MARKUP_<HURTOWNIA>`/100), wstępnie 30% (O-07) → grupa `BASELINKER_PRICE_GROUP`; cena zakupu → `BASELINKER_PRICE_GROUP_PURCHASE`, gdy > 0. Bez ceny zakupu — cena brutto z feedu (fallback). Cena detaliczna z feedu nie jest używana. Rekord wspólny: cena hurtowni, która ostatnia robiła sync (O-32). „Cena domyślna” katalogu i pole „Producent” nie są wypełniane (deferred 2026-10-14).',
  '- **O8 Treść.** Nazwa, opis HTML, parametry (Kolba: atrybuty; Sharg: feed parametrów — dziś scalany dla 0 produktów, deferred 2026-10-15; Spechurt: brak), do 16 zdjęć, VAT (Kolba zawsze 23 — feed nie ma VAT; Sharg i Spechurt z feedu), waga w kg.',
  '- **O9 Harmonogram i zdrowie.** Cron (UTC): Kolba import 20:20 / sync 22:55, Sharg 23:15 / 00:50, Spechurt 04:35 / 06:50, przez `run-bl.sh` pod jedną blokadą `flock`. Pusty feed = błąd: 3 próby co 600 s, potem `[fatal] empty feed`, `END exit=1` (HA-2.33). `exit=0` nie wystarcza — liczy się `result=` w dzienniku.',
  '',
];

function summary(ctx: Ctx): string[] {
  const f = ctx.facts;
  const n = (k: string) => (typeof f[k] === 'number' ? fmt(f[k] as number) : String(f[k] ?? '—'));
  const num = (k: string) => (typeof f[k] === 'number' ? (f[k] as number) : 0);
  const missingShare = num('admitted') ? num('missing') / num('admitted') : 0;
  return [
    '## Podsumowanie dla rozmowy z klientem (10 punktów)',
    '',
    `1. **Pokrycie** — z ${n('admitted')} produktów przyjętych dziś przez filtr w BL brakuje ${n('missing')} (${pct(num('missing'), num('admitted'))}). → ${missingShare <= 0.02 ? '_działa_' : '_błąd po naszej stronie — do wyjaśnienia_'} (A)`,
    `2. **Produkty wycofane przez hurtownie** — ${n('orphans')} rekordów w BL nie ma już w feedzie; ${n('orphanStale')} z nich ma w BL stan > 0 (w tym ${n('orphanStaleApproved')} z \`approved\`, czyli w sklepie). → ${num('orphanStale') ? '_błąd po naszej stronie (sync nie zeruje stanu)_' : '_działa_'}; co robić z wycofanymi — _decyzja klienta_ (A)`,
    `3. **Ceny i stany** — cena sprzedaży niezgodna z „zakup × narzut” na ${n('ownPriceDiff')} rekordach jednej hurtowni i ${n('sharedPriceDiff')} wspólnych; ${n('stockBlPosFeedZero')} produktów ma w BL stan > 0 przy zerze w feedzie. → ${num('ownPriceDiff') ? '_do sprawdzenia, czy to zmiana feedu od nocy, czy błąd_' : '_działa_'}; cena rekordu wspólnego — _decyzja klienta (O-32)_ (A)`,
    `4. **Kategorie** — w „00. DO PRZYPISANIA” ${n('in00')}, bez kategorii ${n('noCategory')}; produktów ze stanem bez mapowania w feedach: ${n('unmappedInStock')} (największa ścieżka: ${n('unmappedTop')}). → które ścieżki to asortyment — _decyzja klienta_, mapa — nasza praca (B)`,
    `5. **Pozwolenia i 18+** — \`permit\` ${n('permit')}, \`age_18\` ${n('age18')}, \`permit_review\` bez decyzji ${n('permitReviewOpen')} (z \`approved\`: ${n('permitReviewOpenApproved')}). → _decyzja klienta_ per produkt (\`permit_off\` / \`permit_ok\`) (C)`,
    `6. **EAN** — bez EAN wśród przyjętych: ${n('noEanPct')}; duplikaty EAN w BL: ${n('blEanDup')}; rekordów wspólnych dwóch+ hurtowni: ${n('shared')}. → brak EAN — _problem feedu_${num('blEanDup') ? '; duplikaty EAN — _błąd po naszej stronie_' : '; klucz działa'} (D)`,
    `7. **Duplikaty bez EAN** — kandydaci (producent + nazwa) między hurtowniami: ${n('dupCrossGroups')} grup, w obrębie jednej hurtowni: ${n('dupWithinGroups')}. → lista do przejrzenia — _decyzja klienta_, nic nie scalono (D)`,
    `8. **Warianty** — wariantów BL w katalogu: ${n('blVariants')}; produkty wariantowe Sharga/Spechurta spłaszczone do jednego rekordu: ${n('flattened')}; Kolba z \`ilosc_wariantow\` > 0: ${n('kolbaVariants')}; kandydaci na grupy z osobnych rekordów: ${n('variantGroups')} (mieszające pozwolenie/odbiór: ${n('variantGroupsMixed')}). → warianty BL czy osobne produkty — _decyzja klienta_ (E)`,
    `9. **Jakość danych** — bez zdjęć ${n('F_brak_zdjec')}, bez opisu ${n('F_brak_opisu')}, cena sprzedaży 0 ${n('F_cena_sprzedazy_0')}, cena < zakup ${n('F_cena_ponizej_zakupu')}, stan ujemny ${n('F_stan_ujemny')}, bez wagi ${n('F_brak_wagi')}, nazwy z encjami/śmieciami ${n('F_nazwa')}. → braki z feedu — _problem feedu_; co z feedu da się poprawić u nas — sekcja F (F)`,
    f.nightsOk === '—' ? '10. **Zdrowie importu** — logi serwera niedostępne w tym uruchomieniu (G)' : `10. **Zdrowie importu** — ostatnie ${n('nights')} nocy: przebiegi OK ${n('nightsOk')}, puste feedy ${n('emptyFeeds')} (pustych prób pobrania ${n('emptyAttempts')}), błędy/przerwane ${n('runFailures')}, brak przebiegu ${n('runMissing')}. → ${num('runFailures') + num('emptyFeeds') + num('runMissing') === 0 && f.nightsOk !== '—' ? '_działa_' : '_sprawdzić sekcję G_'} (G)`,
    '',
    'Werdykty w punktach i tabelach są liczone automatycznie z progów opisanych w sekcjach; przed rozmową warto przejrzeć CSV z przykładami.',
    '',
  ];
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadConfig();
  const started = new Date();
  log(`Import audit (HA-2.37) — read-only${cfg.mock ? ' [BASELINKER_MOCK=true]' : ''}`);
  log(`  out: ${args.out}`);

  const root = process.cwd();
  const treeFile = path.join(root, 'xml-integration/hydra-categories.json');
  const mapFile = path.join(root, 'xml-integration/category-map.json');
  if (!fs.existsSync(treeFile) || !fs.existsSync(mapFile)) fail('run from the repo root (xml-integration/hydra-categories.json, category-map.json)');
  const tree = new HydraTreeJson(JSON.parse(fs.readFileSync(treeFile, 'utf8')) as Record<string, number>);
  const categoryMap = JSON.parse(fs.readFileSync(mapFile, 'utf8')) as CategoryMapFile;

  const bl = await loadBL(cfg);
  log(`  ${bl.records.size} products with data (${bl.noData} listed without data)`);

  const feeds = new Map<Supplier, FeedResult>();
  for (const s of args.suppliers) feeds.set(s, await loadFeed(s, args.fromFile.get(s), cfg, bl, categoryMap, tree));

  const byRecord = new Map<number, Partial<Record<Supplier, FeedItem[]>>>();
  for (const f of feeds.values()) {
    for (const i of f.items) {
      if (i.blId === undefined) continue;
      const by = byRecord.get(i.blId) ?? {};
      (by[i.supplier] ??= []).push(i);
      byRecord.set(i.blId, by);
    }
  }

  const ctx: Ctx = { cfg, args, bl, tree, feeds, byRecord, facts: {} };
  const sections = [sectionA(ctx), sectionB(ctx), sectionC(ctx), sectionD(ctx), sectionE(ctx), sectionF(ctx), sectionG(ctx)];

  let commit = 'unknown';
  try { commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* not a git checkout */ }
  const whLabel = (s: Supplier) => (cfg.warehouse[s] ? `${cfg.warehouse[s]}${bl.warehouseNames.get(cfg.warehouse[s]!) ? ` „${bl.warehouseNames.get(cfg.warehouse[s]!)}”` : ''}` : 'nieustawiony');
  const pgLabel = (id: number | null) => (id === null ? 'nieustawiona' : `${id}${bl.priceGroupNames.get(id) ? ` „${bl.priceGroupNames.get(id)}”` : ''}`);
  const header = [
    `# Audyt importu XML → BaseLinker (HA-2.37)${cfg.mock ? ' — MOCK (dane testowe)' : ''}`,
    '',
    `- wykonano: ${started.toISOString()} (UTC), commit \`${commit}\`, tylko odczyt`,
    `- katalog BL: ${cfg.inventoryId}${bl.inventoryFound ? ` „${bl.inventoryName}”` : ' — **nie ma go na liście katalogów konta**'}; produktów na liście: ${fmt(bl.listed)}, z danymi: ${fmt(bl.records.size)}`,
    `- magazyny: Kolba ${whLabel('kolba')}, Sharg ${whLabel('sharg')}, Spechurt ${whLabel('spechurt')}; grupy cen: sprzedaż ${pgLabel(cfg.priceGroup)}, zakup ${pgLabel(cfg.priceGroupPurchase)}; narzut: ${SUPPLIERS.map((s) => `${SUPPLIER_LABEL[s]} ${cfg.markup[s] ?? '—'}%`).join(', ')}`,
    `- feedy: ${args.suppliers.map((s) => { const f = feeds.get(s)!; return f.ok ? `${SUPPLIER_LABEL[s]} ${f.sizeMb} MB (${f.source === 'file' ? 'plik' : 'pobrany'}, wygenerowany ${f.generated})` : `${SUPPLIER_LABEL[s]} **niedostępny: ${f.error}**`; }).join('; ')}`,
    `- wywołania BL (wyłącznie readonly.ts): ${Object.entries(blCalls).map(([m, c]) => `${m} ×${c}`).join(', ')}`,
    '',
  ];
  const md = [...header, ...summary(ctx), ...EXPECTATIONS, ...sections.flatMap((s) => s.md)];

  fs.mkdirSync(args.out, { recursive: true, mode: 0o700 });
  const written: string[] = [];
  const write = (name: string, content: string) => {
    const file = path.join(args.out, name);
    fs.writeFileSync(file, redactSecrets(content), { mode: 0o600 });
    written.push(file);
  };
  write('raport.md', md.map(redactSecrets).join('\n') + '\n');
  for (const c of sections.flatMap((s) => s.csv)) {
    if (c.rows.length === 0) continue;
    write(c.file, toCsv(c.headers, c.rows));
  }

  // Last line of defence: nothing that looks like a credential or URL may be in the output
  let leaks = 0;
  for (const f of written) leaks += (fs.readFileSync(f, 'utf8').match(/\b(key|token|client)=(?!<hidden>)|https?:\/\//gi) ?? []).length;
  log(`\nWritten ${written.length} files to ${args.out} (raport.md + ${written.length - 1} CSV)`);
  log(`BL methods called: ${Object.entries(blCalls).map(([m, c]) => `${m} ×${c}`).join(', ')}`);
  log(`credential/URL patterns in output: ${leaks}`);
  if (leaks > 0) fail('output contains credential-like text — delete the directory and report this');
}

main().catch((err) => {
  console.error('\n[fatal]', redactSecrets(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
