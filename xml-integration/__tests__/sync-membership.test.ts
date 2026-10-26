/**
 * The sync prices only records its supplier is a member of (HA-2.38, price diagnosis 2026-10-26):
 * a record another supplier's sync reaches through the EAN gets stock in that supplier's warehouse
 * and nothing else. Data from SHARG-5652 (BL 710960249). Fake BaseLinker, no network.
 *
 * Runner: npx tsx --test xml-integration/__tests__/sync-membership.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSyncCore, type SyncDeps, type WriteEnv } from '../bl-write';
import type { Supplier } from '../bl-match-key';
import { isSharedRecord } from '../import-audit';
import { MarginTally } from '../margin';
import type { NormalizedProduct } from '../types';

const SALE = 104511;
const PURCHASE = 104512;
const WH: Record<Supplier, string> = { kolba: 'bl_157483', sharg: 'bl_157484', spechurt: 'bl_157485' };
const env = (s: Supplier): WriteEnv => ({ inventoryId: 119068, priceGroup: SALE, priceGroupPurchase: PURCHASE, warehouse: WH[s], markupPct: 30 });
const EAN = '3660740000141';

interface Rec { sku: string; ean: string; features: Record<string, string>; prices: Record<string, number>; stock: Record<string, number> }

class FakeBL {
  priceWrites: Array<Record<string, Record<string, number>>> = [];
  hidden = new Set<number>();
  failData = false;
  priceWarnings: Record<string, string> = {};
  constructor(public records: Map<number, Rec>) {}
  deps(lines: string[]): SyncDeps {
    return {
      getProductsList: async (_inv, page = 1) => (page > 1 ? {} : Object.fromEntries([...this.records].map(([id, r]) => [String(id), { ean: r.ean, sku: r.sku, stock: { ...r.stock } }]))),
      getProductsData: async (_inv, ids) => {
        if (this.failData) throw new Error('BaseLinker error: ERROR_TEST');
        return Object.fromEntries(ids.filter((id) => this.records.has(Number(id)) && !this.hidden.has(Number(id))).map((id) => {
          const r = this.records.get(Number(id))!;
          return [id, { sku: r.sku, text_fields: { name: r.sku, features: { ...r.features } }, prices: { ...r.prices } }];
        }));
      },
      updateStock: async (_inv, products) => {
        for (const [id, s] of Object.entries(products)) Object.assign(this.records.get(Number(id))!.stock, s);
        return { counter: Object.keys(products).length, warnings: {} };
      },
      updatePrices: async (_inv, products) => {
        this.priceWrites.push(products);
        for (const [id, p] of Object.entries(products)) Object.assign(this.records.get(Number(id))!.prices, p);
        return { counter: Object.keys(products).length, warnings: this.priceWarnings };
      },
      sleep: async () => undefined,
      rateLimitMs: 0,
      marginKey: null,
      log: (l) => lines.push(l),
      warn: (l) => lines.push(l),
      tally: new MarginTally(() => undefined),
    };
  }
}

/** BL 710960249 as the diagnosis found it: Sharg's record (SKU + `SKU Sharg` only), Sharg's price pair. */
function shargRecord(features: Record<string, string> = { 'SKU Sharg': '5652', 'Źródło opisu': 'Sharg' }): FakeBL {
  return new FakeBL(new Map([[710960249, { sku: 'SHARG-5652', ean: EAN, features, prices: { [SALE]: 426.4, [PURCHASE]: 328 }, stock: { [WH.sharg]: 5 } }]]));
}

function item(s: Supplier, sku: string, purchase: number, stock: number): NormalizedProduct {
  return {
    connector: s, connector_product_id: sku, connector_sku: sku, ean: EAN, brand: 'Bolle', name: 'Okulary balistyczne Bolle Tactical Combat Kit',
    description_html: null, short_description: null, features: {}, price_gross: purchase, price_net: purchase / 1.23, tax_rate: 23,
    price_purchase: purchase, price_compare: null, stock, weight_g: 28, images: [], supplier_category_id: null,
    supplier_category_name: null, has_variants: false, variants: [],
    _hints: { requires_license: false, age_restricted: false, pickup_only: false }, source_url: null, raw_connector_category: null,
  };
}

const sync = async (bl: FakeBL, s: Supplier, products: NormalizedProduct[]) => {
  const lines: string[] = [];
  const res = await runSyncCore(products, s, env(s), bl.deps(lines));
  return { ...res, lines };
};

test('RED PROOF overwrite: Spechurt sync reaching SHARG-5652 through the EAN (no Spechurt membership) writes no price — only stock in its warehouse', async () => {
  const bl = shargRecord();
  const { plan, lines } = await sync(bl, 'spechurt', [item('spechurt', '9911', 231.75, 8)]);
  const r = bl.records.get(710960249)!;
  assert.deepEqual([r.prices[PURCHASE], r.prices[SALE]], [328, 426.4], 'before HA-2.38 the Spechurt sync wrote 231.75 / 301.28 here');
  assert.equal(r.stock[WH.spechurt], 8, 'stock in Spechurt\'s own warehouse is still written');
  assert.equal(r.stock[WH.sharg], 5, 'Sharg\'s warehouse untouched');
  assert.equal(plan.priceSkippedNotMember, 1);
  assert.deepEqual(bl.priceWrites, [], 'no price write at all');
  assert.ok(lines.some((l) => l.includes('prices skipped (not a member): 1')), lines.join('\n'));
});

test('the member\'s own sync still prices the record (Sharg on SHARG-5652)', async () => {
  const bl = shargRecord();
  bl.records.get(710960249)!.prices = { [SALE]: 301.28, [PURCHASE]: 231.75 };
  const { plan } = await sync(bl, 'sharg', [item('sharg', '5652', 328, 5)]);
  assert.deepEqual([bl.records.get(710960249)!.prices[PURCHASE], bl.records.get(710960249)!.prices[SALE]], [328, 426.4]);
  assert.equal(plan.priceSkippedNotMember, 0);
});

test('a recorded shared record (`SKU Spechurt` parameter) is priced by Spechurt too — last sync wins until HA-2.39', async () => {
  const bl = shargRecord({ 'SKU Sharg': '5652', 'SKU Spechurt': '9911' });
  await sync(bl, 'spechurt', [item('spechurt', '9911', 231.75, 8)]);
  assert.deepEqual([bl.records.get(710960249)!.prices[PURCHASE], bl.records.get(710960249)!.prices[SALE]], [231.75, 301.28]);
});

test('membership unknown (BL returned no data / the read failed) → no price at all, stock still written', async () => {
  const hidden = shargRecord();
  hidden.hidden.add(710960249);
  const a = await sync(hidden, 'sharg', [item('sharg', '5652', 400, 2)]);
  assert.equal(a.plan.priceSkipped, 1);
  assert.deepEqual(hidden.priceWrites, []);
  assert.equal(hidden.records.get(710960249)!.stock[WH.sharg], 2);
  const failed = shargRecord();
  failed.failData = true;
  const b = await sync(failed, 'sharg', [item('sharg', '5652', 400, 2)]);
  assert.equal(b.ok, false);
  assert.deepEqual(failed.priceWrites, []);
  assert.ok(b.lines.some((l) => l.startsWith('[error] product data read failed')), b.lines.join('\n'));
});

test('BL warning text of the price write is logged, not only its count', async () => {
  const bl = shargRecord();
  bl.priceWarnings = { '710960249': 'Invalid price group 104512' };
  const { lines } = await sync(bl, 'sharg', [item('sharg', '5652', 328, 5)]);
  assert.ok(lines.some((l) => l === '[warn] BL prices warning, product 710960249: Invalid price group 104512'), lines.join('\n'));
  assert.ok(lines.some((l) => /prices 1\/1: 1 updated, 1 warnings/.test(l)));
});

test('isSharedRecord: ≥ 2 suppliers as members or by today\'s feed matches', () => {
  assert.equal(isSharedRecord(['sharg'], ['sharg']), false);
  assert.equal(isSharedRecord(['sharg'], ['sharg', 'spechurt']), true, 'SHARG-5652: Spechurt\'s feed matches it without a parameter');
  assert.equal(isSharedRecord(['kolba'], ['sharg']), true, 'KOLBA-401-000 matched by Sharg only');
  assert.equal(isSharedRecord(['kolba', 'sharg'], []), true, 'recorded by parameters');
  assert.equal(isSharedRecord([], ['sharg']), false, 'a bare-SKU record one feed matches');
});
