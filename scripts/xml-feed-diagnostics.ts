/**
 * Read-only feed diagnostics before the first live import (HA-2.15).
 *
 * Downloads the supplier feeds the same way the import does and prints numbers only.
 * It never calls BaseLinker, needs no production unlock and writes nothing.
 *
 * What it answers:
 *   - does the assortment filter admit the same number of products as the preview;
 *   - where would the import's upsert key (EAN first, then SKU, one index for the whole
 *     catalogue) put products of two suppliers on one BaseLinker product — through a
 *     shared EAN (a product both carry) or through the SKU alone (possibly unrelated goods);
 *   - what each supplier's sync would then touch;
 *   - do EANs look like EANs (lost leading zeros show up as odd lengths);
 *   - does Sharg report the same stock in the full feed as in the light feed;
 *   - when each feed says it was generated.
 *
 * Usage:
 *   npx tsx scripts/xml-feed-diagnostics.ts [--order=kolba,sharg,spechurt] [--examples=15]
 *     [--from-file=<connector>:<path>]… [--light-file=<path>]
 *
 *   --order      order in which the imports would run (default: kolba,sharg,spechurt)
 *   --from-file  read that connector's feed from a local file instead of fetching it
 *   --light-file read the Sharg light feed from a local file; without it the light feed is
 *                fetched when SHARG_TOKEN_LIGHT is set
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import type { NormalizedProduct } from '../xml-integration/types';
import { filterProduct } from '../xml-integration/assortment-filter';
import { ASSORTMENT_RULES } from '../xml-integration/assortment-rules';
import { HydraTreeFromTxt } from '../xml-integration/hydra-tree-txt';
import { resolveCategory, type CategoryMapFile, type HydraTreeLike } from '../xml-integration/resolve-category';
import {
  compareStock,
  eanShapes,
  numericSkuCount,
  simulateImports,
  simulateSync,
  type PairExample,
  type SlimProduct,
} from '../xml-integration/feed-diagnostics';

const CONNECTOR_NAMES = ['kolba', 'sharg', 'spechurt'] as const;
type ConnectorName = (typeof CONNECTOR_NAMES)[number];

const MARKUP_ENV: Record<ConnectorName, string> = {
  kolba: 'BASELINKER_MARKUP_KOLBA',
  sharg: 'BASELINKER_MARKUP_SHARG',
  spechurt: 'BASELINKER_MARKUP_SPECHURT',
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Feed URLs carry credentials in the query string — never let one through in a message. */
function safe(message: string): string {
  return message.replace(/((?:key|token|client)=)[^&\s"'<>]+/gi, '$1<hidden>');
}

function fail(message: string): never {
  console.error(`[error] ${safe(message)}`);
  process.exit(1);
}

function isConnector(name: string): name is ConnectorName {
  return (CONNECTOR_NAMES as readonly string[]).includes(name);
}

/** The feed's own statement of when it was generated (root element attribute), if any. */
function generatedAt(xml: string): string {
  const head = xml.slice(0, 4000);
  const generated = head.match(/\bgenerated="([^"]*)"/)?.[1];
  const expires = head.match(/\bexpires="([^"]*)"/)?.[1];
  if (!generated) return 'not stated in the feed';
  return expires ? `${generated} (expires ${expires})` : generated;
}

async function readFeed(label: string, url: string | undefined, file: string | undefined): Promise<string> {
  if (file) {
    if (!fs.existsSync(file)) fail(`${label}: file not found: ${file}`);
    return fs.readFileSync(file, 'utf8');
  }
  if (!url) fail(`${label}: no feed URL configured`);
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    fail(`${label}: download failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) fail(`${label}: download failed: HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

function printExamples(examples: readonly PairExample[]): void {
  for (const e of examples) {
    console.log(`      SKU ${e.sku}`);
    console.log(`        this : ${e.name.slice(0, 70)}  [EAN ${e.ean || '—'}]`);
    console.log(`        ${e.otherSupplier.padEnd(5)}: ${e.otherName.slice(0, 70)}  [EAN ${e.otherEan || '—'}]`);
  }
}

async function main(): Promise<void> {
  const flags = process.argv.slice(2);
  const unknown = flags.filter((f) => !/^--(order|examples|from-file|light-file)=/.test(f));
  if (unknown.length > 0) fail(`unknown argument: ${unknown.join(' ')}`);

  const orderRaw = flags.find((f) => f.startsWith('--order='))?.slice('--order='.length) ?? CONNECTOR_NAMES.join(',');
  const order = orderRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (order.length === 0 || order.some((s) => !isConnector(s)) || new Set(order).size !== order.length) {
    fail(`--order must list each of ${CONNECTOR_NAMES.join(', ')} at most once`);
  }
  const maxExamples = parseInt(flags.find((f) => f.startsWith('--examples='))?.slice('--examples='.length) ?? '15', 10);
  if (isNaN(maxExamples) || maxExamples < 0) fail('--examples must be a number');

  const fromFile = new Map<string, string>();
  for (const f of flags.filter((x) => x.startsWith('--from-file='))) {
    const raw = f.slice('--from-file='.length);
    const sep = raw.indexOf(':');
    const name = sep >= 0 ? raw.slice(0, sep) : '';
    if (!isConnector(name) || sep === raw.length - 1) fail('--from-file=<connector>:<path>');
    fromFile.set(name, raw.slice(sep + 1));
  }
  const lightFile = flags.find((f) => f.startsWith('--light-file='))?.slice('--light-file='.length);

  const treePath = path.resolve(process.cwd(), 'xml-integration/hydra-category-tree.txt');
  const mapPath = path.resolve(process.cwd(), 'xml-integration/category-map.json');
  if (!fs.existsSync(treePath) || !fs.existsSync(mapPath)) fail('run this from the repo root');
  const tree = new HydraTreeFromTxt(fs.readFileSync(treePath, 'utf8')) as unknown as HydraTreeLike;
  const categoryMap = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as CategoryMapFile;

  // Connector configs build feed URLs from env at module load, so dotenv must run first.
  const { connectors } = await import('../xml-integration/connectors');

  console.log('Feed diagnostics — read-only, no BaseLinker calls');
  console.log(`  import order : ${order.join(' → ')}`);

  const bySupplier: Record<string, SlimProduct[]> = {};
  let shargFullStock: Array<{ id: string; stock: number }> = [];

  for (const name of order as ConnectorName[]) {
    const connector = connectors[name];
    const xml = await readFeed(name, connector.config.xml_url, fromFile.get(name));
    const generated = generatedAt(xml);
    let products: NormalizedProduct[];
    try {
      products = connector.parse(xml);
    } catch (err) {
      fail(`${name}: feed could not be parsed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const markupPct = parseFloat(process.env[MARKUP_ENV[name]] ?? '');
    const unknownNums = new Set<string>();
    const slim: SlimProduct[] = products.map((p) => {
      const r = resolveCategory(p, categoryMap, tree, unknownNums);
      // Same price rule as the preview: purchase price + markup, feed gross price otherwise.
      const price = !isNaN(markupPct)
        ? (p.price_purchase && p.price_purchase > 0 ? round2(p.price_purchase * (1 + markupPct / 100)) : p.price_gross)
        : (p.price_purchase ?? p.price_gross);
      const admitted = filterProduct(p, r.hydraNum, p.stock ?? 0, 0, price, ASSORTMENT_RULES).allowed;
      return {
        supplier: name,
        id: p.connector_product_id,
        sku: (p.connector_sku ?? '').trim(),
        ean: (p.ean ?? '').trim(),
        name: p.name,
        stock: p.stock ?? 0,
        admitted,
      };
    });
    bySupplier[name] = slim;
    if (name === 'sharg') shargFullStock = slim.map((p) => ({ id: p.id, stock: p.stock }));

    const admitted = slim.filter((p) => p.admitted);
    console.log(`\n─── ${name.toUpperCase()} ───`);
    console.log(`  feed generated   : ${generated}`);
    console.log(`  products in feed : ${slim.length}, admitted by the assortment filter: ${admitted.length} (compare with the preview)`);
    console.log(`  SKUs that are bare numbers: ${numericSkuCount(slim)} of ${slim.length} in the feed, ${numericSkuCount(admitted)} of ${admitted.length} admitted`);
    console.log(`  products without SKU: ${slim.filter((p) => !p.sku).length}, without EAN: ${slim.filter((p) => !p.ean).length}`);
    console.log('  EAN shapes (admitted products):');
    for (const [shape, count] of Object.entries(eanShapes(admitted)).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${shape.padEnd(32)}: ${count}`);
    }
  }

  const { runs, catalogue } = simulateImports(order, bySupplier, maxExamples);

  console.log(`\n${'═'.repeat(64)}`);
  console.log('SIMULATED FIRST IMPORTS into an empty catalogue, in the order above');
  console.log('═'.repeat(64));
  for (const run of runs) {
    console.log(`\n  ${run.supplier}: ${run.admitted} admitted → ${run.created} created, ${run.admitted - run.created} updated`);
    console.log(`    repeats inside its own feed                        : ${run.updatedOwn}`);
    console.log(`    same EAN as a product of an earlier supplier       : ${run.sharedByEan}`);
    console.log(`    same SKU only (EAN gave no match) — earlier supplier: ${run.mergedBySkuOnly}`);
    if (run.examples.length > 0) {
      console.log(`    first ${run.examples.length} SKU-only matches — are these the same goods?`);
      printExamples(run.examples);
    }
  }
  console.log(`\n  catalogue after the three imports: ${catalogue.length} products`);

  console.log(`\n${'═'.repeat(64)}`);
  console.log('SIMULATED SYNC of each supplier against that catalogue');
  console.log('═'.repeat(64));
  for (const name of order) {
    const sync = simulateSync(name, bySupplier[name], catalogue, maxExamples);
    console.log(`\n  ${name}: ${sync.inFeed} in feed → ${sync.matchedOwn} own products refreshed, ${sync.unmatched} not in the catalogue`);
    console.log(`    would write stock and price onto another supplier's product`);
    console.log(`      found through the EAN      : ${sync.foreignByEan}`);
    console.log(`      found through the SKU alone: ${sync.foreignBySkuOnly}`);
    if (sync.examples.length > 0) {
      console.log(`    first ${sync.examples.length} SKU-only matches:`);
      printExamples(sync.examples);
    }
  }

  if (order.includes('sharg')) {
    console.log(`\n${'═'.repeat(64)}`);
    console.log('SHARG STOCK: full feed (used by import and sync) against the light feed');
    console.log('═'.repeat(64));
    const lightUrl = (connectors.sharg.config.extra as { light_url?: string } | undefined)?.light_url;
    if (!lightFile && !process.env.SHARG_TOKEN_LIGHT) {
      console.log('  skipped: SHARG_TOKEN_LIGHT is not set and no --light-file was given');
    } else {
      const lightXml = await readFeed('sharg light', lightUrl, lightFile);
      const { parseShargLight } = await import('../xml-integration/connectors/sharg');
      let light: Array<{ id: string; stock: number }>;
      try {
        light = parseShargLight(lightXml).map((u) => ({ id: u.connector_product_id, stock: u.stock }));
      } catch (err) {
        fail(`sharg light: feed could not be parsed: ${err instanceof Error ? err.message : String(err)}`);
      }
      const cmp = compareStock(shargFullStock, light);
      console.log(`  light feed generated: ${generatedAt(lightXml)}, ${light.length} products`);
      console.log(`  products of the full feed (after the connector's own filter): ${shargFullStock.length}`);
      console.log(`    also in the light feed : ${cmp.inBoth} (missing there: ${cmp.missingInSecond})`);
      console.log(`    same stock in both     : ${cmp.equal}`);
      console.log(`    different stock        : ${cmp.different}`);
      console.log(`      in stock per full feed, zero per light feed: ${cmp.positiveOnlyInFirst}`);
      console.log(`      zero per full feed, in stock per light feed: ${cmp.positiveOnlyInSecond}`);
    }
  }
  console.log('');
}

main().catch((err) => {
  console.error('\n[fatal]', safe(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
