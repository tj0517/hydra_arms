/**
 * Child process for sync-zeroing.test.ts: one sync through runSyncProcess — the function the import
 * script calls — against a fake BaseLinker, logging as the script does (log → stdout, warn → stderr).
 * Argument: `incomplete` (feed at 89% of the previous run) or `ok` (100%). No network.
 */
import { runSyncProcess, type FeedCountStore } from '../../bl-write';
import { MarginTally } from '../../margin';
import type { NormalizedProduct } from '../../types';

const count = process.argv[2] === 'incomplete' ? 89 : 100;
const products = Array.from({ length: count }, (_, i): NormalizedProduct => ({
  connector: 'sharg', connector_product_id: String(i), connector_sku: String(i), ean: null, brand: null, name: `P${i}`,
  description_html: null, short_description: null, features: {}, price_gross: 10, price_net: 8.13, tax_rate: 23,
  price_purchase: 5, price_compare: null, stock: 1, weight_g: null, images: [], supplier_category_id: null,
  supplier_category_name: null, has_variants: false, variants: [],
  _hints: { requires_license: false, age_restricted: false, pickup_only: false }, source_url: null, raw_connector_category: null,
}));
const store: FeedCountStore = { read: () => 100, write: () => undefined };

void runSyncProcess(products, 'sharg', { inventoryId: 1, priceGroup: 1, priceGroupPurchase: 2, warehouse: 'bl_2', markupPct: 30 }, {
  getProductsList: async (_inv, page = 1): Promise<Record<string, { ean: string; sku: string; stock?: Record<string, number> }>> => (page > 1 ? {} : {
    '10': { ean: '', sku: 'SHARG-0', stock: { bl_2: 1 } },
    '11': { ean: '', sku: 'SHARG-gone', stock: { bl_2: 4 } },
  }),
  getProductsData: async (_inv, ids) => Object.fromEntries(ids.map((id) => [id, { sku: id === '11' ? 'SHARG-gone' : 'SHARG-0', tags: [], text_fields: { name: id } }])),
  updateStock: async (_inv, p) => {
    console.log(`stock write ${JSON.stringify(p)}`);
    return { counter: Object.keys(p).length, warnings: {} };
  },
  updatePrices: async (_inv, p) => ({ counter: Object.keys(p).length, warnings: {} }),
  sleep: async () => undefined,
  rateLimitMs: 0,
  marginKey: null,
  log: (l) => console.log(l),
  warn: (l) => console.warn(l),
  tally: new MarginTally(() => undefined),
  feedCounts: store,
});
