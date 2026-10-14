/**
 * Read-only diagnostics over parsed supplier feeds (HA-2.15).
 *
 * Replays the upsert key of scripts/xml-to-baselinker.ts — EAN first, then SKU, against one
 * index of the whole BaseLinker catalogue, whatever supplier wrote the product — to show where
 * two suppliers would land on one BaseLinker product, and what each sync would then touch.
 *
 * Pure functions: no I/O, no BaseLinker calls. Used by scripts/xml-feed-diagnostics.ts.
 */

export interface SlimProduct {
  supplier: string;
  /** connector_product_id */
  id: string;
  /** connector_sku, trimmed; '' when missing */
  sku: string;
  /** EAN, trimmed; '' when missing */
  ean: string;
  name: string;
  stock: number;
  /** passes the assortment filter, i.e. an import would upsert it */
  admitted: boolean;
}

/** One product of the simulated BaseLinker catalogue. */
export interface CatalogueEntry {
  blId: number;
  ean: string;
  sku: string;
  name: string;
  createdBy: string;
  /** supplier whose import wrote this product last (an upsert replaces the whole product) */
  writer: string;
}

export interface PairExample {
  sku: string;
  name: string;
  ean: string;
  otherSupplier: string;
  otherName: string;
  otherEan: string;
}

export interface ImportSimulation {
  supplier: string;
  admitted: number;
  created: number;
  /** updated a product this supplier wrote itself: a repeat inside the feed */
  updatedOwn: number;
  /** updated another supplier's product, found through the EAN: a product both carry */
  sharedByEan: number;
  /** updated another supplier's product, found through the SKU alone: possibly unrelated */
  mergedBySkuOnly: number;
  examples: PairExample[];
}

export interface SyncSimulation {
  supplier: string;
  inFeed: number;
  matchedOwn: number;
  /** would write stock and price onto another supplier's product, found through the EAN */
  foreignByEan: number;
  /** the same, found through the SKU alone */
  foreignBySkuOnly: number;
  unmatched: number;
  examples: PairExample[];
}

interface Index {
  byEan: Map<string, number>;
  bySku: Map<string, number>;
}

/** Same rule as loadExistingProducts(): the first product seen for an EAN or SKU wins. */
function buildIndex(catalogue: readonly CatalogueEntry[]): Index {
  const byEan = new Map<string, number>();
  const bySku = new Map<string, number>();
  for (const e of catalogue) {
    if (e.ean && !byEan.has(e.ean)) byEan.set(e.ean, e.blId);
    if (e.sku && !bySku.has(e.sku)) bySku.set(e.sku, e.blId);
  }
  return { byEan, bySku };
}

/** Same rule as findExistingId(): EAN first, SKU only when the EAN gives nothing. */
function findExisting(p: SlimProduct, index: Index): { blId: number; via: 'ean' | 'sku' } | null {
  if (p.ean && index.byEan.has(p.ean)) return { blId: index.byEan.get(p.ean)!, via: 'ean' };
  if (p.sku && index.bySku.has(p.sku)) return { blId: index.bySku.get(p.sku)!, via: 'sku' };
  return null;
}

/**
 * Simulates one import run of every supplier in the given order, starting from an empty
 * catalogue. Each run builds its index from the catalogue as the previous runs left it,
 * registers the products it creates, and replaces the products it updates — as the import does.
 */
export function simulateImports(
  order: readonly string[],
  bySupplier: Readonly<Record<string, readonly SlimProduct[]>>,
  maxExamples = 15,
): { runs: ImportSimulation[]; catalogue: CatalogueEntry[] } {
  const catalogue: CatalogueEntry[] = [];
  const runs: ImportSimulation[] = [];

  for (const supplier of order) {
    const index = buildIndex(catalogue);
    const run: ImportSimulation = {
      supplier, admitted: 0, created: 0, updatedOwn: 0, sharedByEan: 0, mergedBySkuOnly: 0, examples: [],
    };

    for (const p of bySupplier[supplier] ?? []) {
      if (!p.admitted) continue;
      run.admitted++;
      const hit = findExisting(p, index);

      if (!hit) {
        const blId = catalogue.length;
        catalogue.push({ blId, ean: p.ean, sku: p.sku, name: p.name, createdBy: supplier, writer: supplier });
        // The import registers a created product so a repeat later in the feed updates it.
        if (p.ean) index.byEan.set(p.ean, blId);
        if (p.sku) index.bySku.set(p.sku, blId);
        run.created++;
        continue;
      }

      const entry = catalogue[hit.blId];
      if (entry.writer === supplier) {
        run.updatedOwn++;
      } else if (hit.via === 'ean') {
        run.sharedByEan++;
      } else {
        run.mergedBySkuOnly++;
        if (run.examples.length < maxExamples) {
          run.examples.push({
            sku: p.sku, name: p.name, ean: p.ean,
            otherSupplier: entry.writer, otherName: entry.name, otherEan: entry.ean,
          });
        }
      }
      // An upsert sends the whole product again: name, SKU and EAN become this supplier's.
      entry.ean = p.ean;
      entry.sku = p.sku;
      entry.name = p.name;
      entry.writer = supplier;
    }
    runs.push(run);
  }
  return { runs, catalogue };
}

/**
 * What one sync of a supplier would touch in the given catalogue. A sync walks every product
 * of the feed, admitted or not, and writes stock and price to whatever it matches.
 */
export function simulateSync(
  supplier: string,
  products: readonly SlimProduct[],
  catalogue: readonly CatalogueEntry[],
  maxExamples = 15,
): SyncSimulation {
  const index = buildIndex(catalogue);
  const run: SyncSimulation = {
    supplier, inFeed: products.length, matchedOwn: 0, foreignByEan: 0, foreignBySkuOnly: 0, unmatched: 0, examples: [],
  };
  for (const p of products) {
    const hit = findExisting(p, index);
    if (!hit) { run.unmatched++; continue; }
    const entry = catalogue[hit.blId];
    if (entry.writer === supplier) { run.matchedOwn++; continue; }
    if (hit.via === 'ean') { run.foreignByEan++; continue; }
    run.foreignBySkuOnly++;
    if (run.examples.length < maxExamples) {
      run.examples.push({
        sku: p.sku, name: p.name, ean: p.ean,
        otherSupplier: entry.writer, otherName: entry.name, otherEan: entry.ean,
      });
    }
  }
  return run;
}

export interface StockComparison {
  inBoth: number;
  equal: number;
  different: number;
  /** stock > 0 in the first feed, 0 in the second */
  positiveOnlyInFirst: number;
  /** stock 0 in the first feed, > 0 in the second */
  positiveOnlyInSecond: number;
  missingInSecond: number;
}

/** Compares stock per product ID between two feeds of one supplier (e.g. Sharg full and light). */
export function compareStock(
  first: ReadonlyArray<{ id: string; stock: number }>,
  second: ReadonlyArray<{ id: string; stock: number }>,
): StockComparison {
  const other = new Map(second.map((x) => [x.id, x.stock]));
  const out: StockComparison = {
    inBoth: 0, equal: 0, different: 0, positiveOnlyInFirst: 0, positiveOnlyInSecond: 0, missingInSecond: 0,
  };
  for (const a of first) {
    const b = other.get(a.id);
    if (b === undefined) { out.missingInSecond++; continue; }
    out.inBoth++;
    if (a.stock === b) out.equal++;
    else out.different++;
    if (a.stock > 0 && b === 0) out.positiveOnlyInFirst++;
    if (a.stock === 0 && b > 0) out.positiveOnlyInSecond++;
  }
  return out;
}

/**
 * Counts EANs by shape. A GTIN has 8, 12, 13 or 14 digits; other lengths usually mean that
 * leading zeros were lost on the way (a numeric parse) or that the field is not an EAN.
 */
export function eanShapes(products: readonly SlimProduct[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of products) {
    let key: string;
    if (!p.ean) key = 'empty';
    else if (!/^\d+$/.test(p.ean)) key = 'not digits';
    else if ([8, 12, 13, 14].includes(p.ean.length)) key = `${p.ean.length} digits`;
    else key = `${p.ean.length} digits (not a GTIN length)`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** Share of SKUs that are bare integers — the shape that collides across suppliers. */
export function numericSkuCount(products: readonly SlimProduct[]): number {
  return products.filter((p) => /^\d+$/.test(p.sku)).length;
}
