/**
 * Shared records (HA-2.39): own purchase group per supplier, "shared" = ≥ 2 own groups > 0, the
 * choice rule, the `price-shared` step and the sync / import / zeroing changes around it.
 * Fake BaseLinker, no network.
 *
 * Runner: npx tsx --test xml-integration/__tests__/shared-pricing.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { planSync, pricingTable, runSharedPricing, runSyncCore, toBLProduct, zeroGate, type FeedCounts, type FeedCountStore, type PricingDeps, type SyncDeps, type WriteEnv } from '../bl-write';
import { addToMatchIndex, emptyMatchIndex, type Supplier } from '../bl-match-key';
import { chooseMargin, MarginTally } from '../margin';
import { redactSecrets } from '../import-audit';
import { chooseSupplier, isSharedByPurchase, loadPurchaseGroups, priceSharedRecord, type PricingConfig } from '../shared-pricing';
import type { NormalizedProduct } from '../types';

const SALE = 104511;
const PURCHASE = 104512;
const OWN: Record<Supplier, number> = { kolba: 105001, sharg: 105002, spechurt: 105003 };
const WH: Record<Supplier, string> = { kolba: 'bl_157483', sharg: 'bl_157484', spechurt: 'bl_157485' };
const MARKUP: Record<Supplier, number> = { kolba: 30, sharg: 20, spechurt: 25 };
const MARGIN_KEY = 'extra_field_75';
const env = (s: Supplier, groups: boolean = true): WriteEnv => ({
  inventoryId: 119068, priceGroup: SALE, priceGroupPurchase: PURCHASE, warehouse: WH[s], markupPct: MARKUP[s], purchaseGroups: groups ? OWN : null,
});
const CFG: PricingConfig & { inventoryId: number } = { inventoryId: 119068, groups: OWN, warehouses: WH, saleGroup: SALE, purchaseGroup: PURCHASE, markup: MARKUP };

// ── The choice rule ─────────────────────────────────────────────────────────

test('choice: two suppliers in stock — the cheaper wins', () => {
  assert.deepEqual(chooseSupplier([{ supplier: 'kolba', price: 100, stock: 5 }, { supplier: 'spechurt', price: 80, stock: 2 }]), { supplier: 'spechurt', price: 80, reason: 'in_stock' });
});

test('choice: cheaper out of stock, dearer in stock — the dearer wins', () => {
  assert.deepEqual(chooseSupplier([{ supplier: 'kolba', price: 100, stock: 5 }, { supplier: 'spechurt', price: 80, stock: 0 }]), { supplier: 'kolba', price: 100, reason: 'in_stock' });
});

test('choice: none in stock — the cheapest overall', () => {
  assert.deepEqual(chooseSupplier([{ supplier: 'kolba', price: 100, stock: 0 }, { supplier: 'sharg', price: 90, stock: 0 }, { supplier: 'spechurt', price: 95, stock: 0 }]), { supplier: 'sharg', price: 90, reason: 'none_in_stock' });
});

test('choice: a tie goes by the fixed order Kolba, Sharg, Spechurt', () => {
  assert.equal(chooseSupplier([{ supplier: 'spechurt', price: 50, stock: 1 }, { supplier: 'sharg', price: 50, stock: 3 }])!.supplier, 'sharg');
  assert.equal(chooseSupplier([{ supplier: 'sharg', price: 50, stock: 0 }, { supplier: 'kolba', price: 50, stock: 0 }, { supplier: 'spechurt', price: 50, stock: 0 }])!.supplier, 'kolba');
  assert.equal(chooseSupplier([{ supplier: 'spechurt', price: 50.001, stock: 1 }, { supplier: 'kolba', price: 49.999, stock: 1 }])!.supplier, 'kolba', 'equal to the grosz → tie');
});

test('choice: no candidate with a price > 0 → null (skipped)', () => {
  assert.equal(chooseSupplier([{ supplier: 'kolba', price: 0, stock: 5 }]), null);
  assert.equal(chooseSupplier([]), null);
});

test('margin: the record\'s „Marża %” field wins; empty field → env markup of the CHOSEN supplier', () => {
  const rec = { prices: { [OWN.kolba]: 100, [OWN.sharg]: 90 }, stock: { [WH.kolba]: 0, [WH.sharg]: 4 } };
  const field = priceSharedRecord(rec, CFG, '45')!;
  assert.deepEqual([field.choice.supplier, field.margin.source, field.sale, field.purchase], ['sharg', 'field', 130.5, 90]);
  const envChosen = priceSharedRecord(rec, CFG, undefined)!;
  assert.deepEqual([envChosen.choice.supplier, envChosen.margin, envChosen.sale], ['sharg', { pct: 20, source: 'env' }, 108], 'Sharg env 20%, not Kolba 30%');
  const rejected = priceSharedRecord(rec, CFG, 'abc')!;
  assert.deepEqual([rejected.margin.pct, rejected.margin.rejected, rejected.sale], [20, 'abc', 108]);
});

test('shared = own purchase groups of ≥ 2 suppliers > 0, judged after the caller\'s own write', () => {
  assert.equal(isSharedByPurchase({ [OWN.kolba]: 100 }, OWN), false);
  assert.equal(isSharedByPurchase({ [OWN.kolba]: 100, [OWN.sharg]: 0 }, OWN), false, 'a cleared group (0) does not count');
  assert.equal(isSharedByPurchase({ [OWN.kolba]: 100, [OWN.sharg]: 90 }, OWN), true);
  assert.equal(isSharedByPurchase({ [OWN.kolba]: 100 }, OWN, { supplier: 'sharg', price: 90 }), true, 'the write makes it shared');
  assert.equal(isSharedByPurchase({ [OWN.kolba]: 100 }, OWN, { supplier: 'sharg', price: null }), false, 'no price → nothing written');
  assert.equal(isSharedByPurchase({ [SALE]: 130, [PURCHASE]: 100 }, OWN), false, 'selling / shared purchase groups do not count');
  assert.equal(priceSharedRecord({ prices: { [OWN.kolba]: 100 }, stock: {} }, CFG, undefined), null);
});

test('own purchase group IDs: all three or none; malformed or reused IDs are refused', () => {
  const e = (k?: string, s?: string, sp?: string) => ({ BASELINKER_PRICE_GROUP_PURCHASE_KOLBA: k, BASELINKER_PRICE_GROUP_PURCHASE_SHARG: s, BASELINKER_PRICE_GROUP_PURCHASE_SPECHURT: sp });
  assert.deepEqual(loadPurchaseGroups(e()), { kind: 'unset' });
  assert.deepEqual(loadPurchaseGroups(e('1', '2', '3')), { kind: 'ok', groups: { kolba: 1, sharg: 2, spechurt: 3 } });
  const partial = loadPurchaseGroups(e('1', '', '3'));
  assert.equal(partial.kind, 'invalid');
  assert.match((partial as { message: string }).message, /BASELINKER_PRICE_GROUP_PURCHASE_SHARG not set/);
  assert.equal(loadPurchaseGroups(e('1', 'x2', '3')).kind, 'invalid');
  assert.equal(loadPurchaseGroups(e('1', '1', '3')).kind, 'invalid');
  assert.equal(loadPurchaseGroups(e('1', '2', String(PURCHASE)), [SALE, PURCHASE]).kind, 'invalid', 'must differ from the shared purchase group');
});

// ── Fake BaseLinker ─────────────────────────────────────────────────────────

interface Rec { sku: string; ean: string; features: Record<string, string>; prices: Record<string, number>; stock: Record<string, number>; margin?: string; tags?: string[] }

class FakeBL {
  calls: string[] = [];
  priceWrites: Array<Record<string, Record<string, number>>> = [];
  failData = false;
  constructor(public records: Map<number, Rec>) {}
  private list = async (_inv: number, page = 1) => {
    this.calls.push('getInventoryProductsList');
    return page > 1 ? {} : Object.fromEntries([...this.records].map(([id, r]) => [String(id), { ean: r.ean, sku: r.sku, stock: { ...r.stock }, prices: { ...r.prices } }]));
  };
  private data = async (_inv: number, ids: string[]) => {
    this.calls.push('getInventoryProductsData');
    if (this.failData) throw new Error('BaseLinker error: ERROR_TEST');
    return Object.fromEntries(ids.filter((id) => this.records.has(Number(id))).map((id) => {
      const r = this.records.get(Number(id))!;
      return [id, { sku: r.sku, tags: r.tags ?? [], text_fields: { name: r.sku, features: { ...r.features }, ...(r.margin !== undefined ? { [MARGIN_KEY]: r.margin } : {}) }, prices: { ...r.prices } }];
    }));
  };
  private prices = async (_inv: number, products: Record<string, Record<string, number>>) => {
    this.calls.push('updateInventoryProductsPrices');
    this.priceWrites.push(JSON.parse(JSON.stringify(products)));
    for (const [id, p] of Object.entries(products)) Object.assign(this.records.get(Number(id))!.prices, p);
    return { counter: Object.keys(products).length, warnings: {} };
  };
  syncDeps(lines: string[], feedCounts: FeedCountStore | null = null): SyncDeps {
    return {
      getProductsList: this.list,
      getProductsData: this.data,
      updateStock: async (_inv, products) => {
        this.calls.push('updateInventoryProductsStock');
        for (const [id, s] of Object.entries(products)) Object.assign(this.records.get(Number(id))!.stock, s);
        return { counter: Object.keys(products).length, warnings: {} };
      },
      updatePrices: this.prices,
      sleep: async () => undefined,
      rateLimitMs: 0,
      marginKey: MARGIN_KEY,
      log: (l) => lines.push(l),
      warn: (l) => lines.push(l),
      tally: new MarginTally(() => undefined),
      feedCounts,
    };
  }
  pricingDeps(lines: string[], dryRun = false): PricingDeps {
    return {
      getProductsList: this.list,
      getProductsData: this.data,
      updatePrices: dryRun ? null : this.prices,
      sleep: async () => undefined,
      rateLimitMs: 0,
      marginKey: MARGIN_KEY,
      log: (l) => lines.push(l),
      warn: (l) => lines.push(l),
      tally: new MarginTally((l) => lines.push(l)),
    };
  }
}

const EAN = '5901234123457';

function item(s: Supplier, sku: string, purchase: number | null, stock: number, ean: string | null = EAN): NormalizedProduct {
  return {
    connector: s, connector_product_id: sku, connector_sku: sku, ean, brand: 'Bolle', name: `Produkt ${sku}`,
    description_html: null, short_description: null, features: {}, price_gross: 150, price_net: 121.95, tax_rate: 23,
    price_purchase: purchase, price_compare: null, stock, weight_g: 100, images: [], supplier_category_id: null,
    supplier_category_name: null, has_variants: false, variants: [],
    _hints: { requires_license: false, age_restricted: false, pickup_only: false }, source_url: null, raw_connector_category: null,
  };
}

/**
 * BL 1: KOLBA-100-001, Kolba and Spechurt both members (import parameters). Its selling price is
 * Spechurt's from the time "last sync wins" (85 × 1.3), own groups Kolba 100 / Spechurt 85.
 */
function sharedKolbaSpechurt(): FakeBL {
  return new FakeBL(new Map([[1, {
    sku: 'KOLBA-100-001', ean: EAN, features: { 'SKU Kolba': '100-001', 'SKU Spechurt': '5001' },
    prices: { [SALE]: 110.5, [PURCHASE]: 85, [OWN.kolba]: 100, [OWN.spechurt]: 85 },
    stock: { [WH.kolba]: 5, [WH.spechurt]: 2 },
  }]]));
}

// ── Red proofs ──────────────────────────────────────────────────────────────

test('RED PROOF shared price: Kolba 100 (stock 5) / Spechurt 80 (stock 0) — the Spechurt sync leaves the selling price, pricing gives 100 × 1.3', async () => {
  const bl = sharedKolbaSpechurt();
  const lines: string[] = [];
  const { plan } = await runSyncCore([item('spechurt', '5001', 80, 0)], 'spechurt', env('spechurt'), bl.syncDeps(lines));
  const r = bl.records.get(1)!;
  assert.equal(r.prices[SALE], 110.5, 'before HA-2.39 the Spechurt sync wrote 80 × 1.25 = 100 here (its price, though Spechurt has no stock)');
  assert.equal(r.prices[PURCHASE], 85, 'the shared „Cena zakupu” is left to pricing too');
  assert.equal(r.prices[OWN.spechurt], 80, 'Spechurt\'s own purchase group is written');
  assert.equal(r.prices[OWN.kolba], 100, 'Kolba\'s own group untouched');
  assert.equal(r.stock[WH.spechurt], 0);
  assert.equal(plan.priceLeftToPricing, 1);
  assert.ok(lines.some((l) => l.includes('prices left to pricing (shared): 1')), lines.join('\n'));

  const out: string[] = [];
  const res = await runSharedPricing(CFG, bl.pricingDeps(out));
  assert.equal(res.ok, true);
  assert.deepEqual([r.prices[SALE], r.prices[PURCHASE]], [130, 100], 'Kolba is the only one in stock: 100 × (1 + 30%)');
  assert.deepEqual([res.rows[0].choice, res.changed], [{ supplier: 'kolba', price: 100, reason: 'in_stock' }, 1]);
  assert.ok(out.some((l) => /Pricing done: 1 shared, 1 changed, 0 unchanged, 0 skipped/.test(l)), out.join('\n'));
});

test('RED PROOF payload: on a shared record the sync sends only its own purchase group — no selling, no shared purchase group', async () => {
  const bl = sharedKolbaSpechurt();
  await runSyncCore([item('spechurt', '5001', 80, 0)], 'spechurt', env('spechurt'), bl.syncDeps([]));
  assert.deepEqual(bl.priceWrites, [{ 1: { [OWN.spechurt]: 80 } }]);
});

test('RED PROOF payload (decision 2): on another supplier\'s record reached through the EAN only, the sync writes its own purchase group and no selling price', async () => {
  // SHARG-5652 as HA-2.38 found it: Sharg's record only (no Spechurt parameter), Sharg's own group not written yet
  const bl = new FakeBL(new Map([[710960249, { sku: 'SHARG-5652', ean: EAN, features: { 'SKU Sharg': '5652' }, prices: { [SALE]: 426.4, [PURCHASE]: 328 }, stock: { [WH.sharg]: 5 } }]]));
  const { plan } = await runSyncCore([item('spechurt', '10310', 231.75, 8)], 'spechurt', env('spechurt'), bl.syncDeps([]));
  assert.deepEqual(bl.priceWrites, [{ 710960249: { [OWN.spechurt]: 231.75 } }]);
  const r = bl.records.get(710960249)!;
  assert.deepEqual([r.prices[SALE], r.prices[PURCHASE]], [426.4, 328], 'selling and shared purchase price stay Sharg\'s');
  assert.equal(plan.priceSkippedNotMember, 1);
});

// ── Sync and import on single-supplier records ──────────────────────────────

test('a single-supplier record (only this supplier has an own purchase price) is priced as before, plus the own group', async () => {
  const bl = new FakeBL(new Map([[7, { sku: 'SHARG-7', ean: EAN, features: { 'SKU Sharg': '7' }, prices: { [SALE]: 1, [PURCHASE]: 1, [OWN.sharg]: 1 }, stock: {} }]]));
  await runSyncCore([item('sharg', '7', 50, 3)], 'sharg', env('sharg'), bl.syncDeps([]));
  assert.deepEqual(bl.priceWrites, [{ 7: { [OWN.sharg]: 50, [PURCHASE]: 50, [SALE]: 60 } }]);
});

test('without own purchase groups the sync is exactly as before HA-2.39 (last sync prices a shared record)', async () => {
  const bl = sharedKolbaSpechurt();
  const lines: string[] = [];
  await runSyncCore([item('spechurt', '5001', 80, 0)], 'spechurt', env('spechurt', false), bl.syncDeps(lines));
  assert.deepEqual(bl.priceWrites, [{ 1: { [PURCHASE]: 80, [SALE]: 100 } }]);
  assert.ok(!lines.some((l) => l.includes('left to pricing')), lines.join('\n'));
});

test('planSync: membership unknown → no price at all, not even the own group', () => {
  const p = item('kolba', '100-001', 100, 5);
  const index = emptyMatchIndex();
  addToMatchIndex(index, 1, EAN, 'KOLBA-100-001');
  const plan = planSync([p], 'kolba', index, env('kolba'), { kind: 'off' }, new MarginTally(() => undefined), new Map(), new Map());
  assert.equal(plan.priceSkipped, 1);
  assert.deepEqual(plan.priceUpdates, {});
});

test('import payload: a shared record gets its own purchase group, every current price is carried unchanged', () => {
  const current = { [SALE]: 130, [PURCHASE]: 100, [OWN.kolba]: 100, [OWN.spechurt]: 85 };
  const identity = { sku: 'KOLBA-100-001', features: {} };
  const shared = toBLProduct(item('spechurt', '5001', 80, 0), env('spechurt'), 9, [], identity, chooseMargin(undefined, 25), { supplier: 'spechurt', currentPrices: current });
  assert.equal(shared.shared, true);
  assert.deepEqual(shared.product.prices, { ...current, [OWN.spechurt]: 80 });
  const single = toBLProduct(item('sharg', '7', 50, 3), env('sharg'), 9, [], identity, chooseMargin(undefined, 20), { supplier: 'sharg', currentPrices: {} });
  assert.equal(single.shared, false);
  assert.deepEqual(single.product.prices, { [OWN.sharg]: 50, [SALE]: 60, [PURCHASE]: 50 });
  const off = toBLProduct(item('sharg', '7', 50, 3), env('sharg', false), 9, [], identity, chooseMargin(undefined, 20), { supplier: 'sharg', currentPrices: current });
  assert.deepEqual(off.product.prices, { [SALE]: 60, [PURCHASE]: 50 }, 'groups off: as before HA-2.39');
});

// ── The pricing step ────────────────────────────────────────────────────────

test('pricing calls only getInventoryProductsList, getInventoryProductsData and updateInventoryProductsPrices — never a feed', async () => {
  const fetched: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => { fetched.push(String(url)); throw new Error('no network in tests'); }) as typeof fetch;
  try {
    const bl = sharedKolbaSpechurt();
    bl.records.get(1)!.stock[WH.spechurt] = 0;
    await runSharedPricing(CFG, bl.pricingDeps([]));
    assert.deepEqual(fetched, []);
    assert.deepEqual([...new Set(bl.calls)].sort(), ['getInventoryProductsData', 'getInventoryProductsList', 'updateInventoryProductsPrices']);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('pricing writes only records whose price changes; dry-run writes nothing', async () => {
  const bl = new FakeBL(new Map<number, Rec>([
    [1, { sku: 'KOLBA-1', ean: '1', features: {}, prices: { [SALE]: 130, [PURCHASE]: 100, [OWN.kolba]: 100, [OWN.sharg]: 120 }, stock: { [WH.kolba]: 1 } }],
    [2, { sku: 'KOLBA-2', ean: '2', features: {}, prices: { [SALE]: 999, [PURCHASE]: 99, [OWN.kolba]: 100, [OWN.sharg]: 90 }, stock: { [WH.kolba]: 1, [WH.sharg]: 1 }, margin: '50' }],
    [3, { sku: 'KOLBA-3', ean: '3', features: {}, prices: { [SALE]: 50, [OWN.kolba]: 40 }, stock: { [WH.kolba]: 1 } }],
  ]));
  const dry = await runSharedPricing(CFG, bl.pricingDeps([], true));
  assert.deepEqual([dry.shared, dry.changed, bl.calls.includes('updateInventoryProductsPrices')], [2, 1, false]);
  const live = await runSharedPricing(CFG, bl.pricingDeps([]));
  assert.deepEqual(bl.priceWrites, [{ 2: { [SALE]: 135, [PURCHASE]: 90 } }], 'record 1 unchanged, record 3 not shared');
  assert.equal(live.written, 1);
});

test('pricing: product data read fails → nothing written, run not ok', async () => {
  const bl = sharedKolbaSpechurt();
  bl.failData = true;
  const lines: string[] = [];
  const res = await runSharedPricing(CFG, bl.pricingDeps(lines));
  assert.equal(res.ok, false);
  assert.deepEqual(bl.priceWrites, []);
  assert.ok(lines.some((l) => l.startsWith('[error] product data read failed')), lines.join('\n'));
});

test('dry-run table: ≥ 10 shared records with prices per supplier, stock per warehouse, choice, margin, before/after; no secrets', async () => {
  const records = new Map<number, Rec>();
  for (let i = 1; i <= 12; i++) {
    records.set(700 + i, {
      sku: `SHARG-${i}`, ean: `590000000${String(i).padStart(4, '0')}`, features: {},
      prices: { [SALE]: 100, [PURCHASE]: 70, [OWN.sharg]: 70 + i, [OWN.spechurt]: 75, ...(i % 3 === 0 ? { [OWN.kolba]: 60 } : {}) },
      stock: { [WH.sharg]: i % 2, [WH.spechurt]: 0, [WH.kolba]: 0 },
      ...(i === 4 ? { margin: '40' } : {}),
    });
  }
  const bl = new FakeBL(records);
  const lines: string[] = [];
  const res = await runSharedPricing(CFG, bl.pricingDeps(lines, true));
  const table = pricingTable(res.rows);
  assert.ok(table.length - 1 >= 10, table.join('\n'));
  assert.match(table[0], /zakup Kolba \/ Sharg \/ Spechurt .* stan H1 \/ H2 \/ H3 .* wybrana \(powód\) .* marża \(źródło\) .* sprzedaż przed → po/);
  assert.ok(table.some((l) => /Sharg \(najtańsza ze stanem\)/.test(l)));
  assert.ok(table.some((l) => /Kolba \(brak stanu — najtańsza\)/.test(l)));
  assert.ok(table.some((l) => /40% pole/.test(l)));
  assert.ok(lines.some((l) => /^ {2}chosen: Kolba \d+ \(in stock 0, none in stock \d+\); Sharg/.test(l)), lines.join('\n'));
  assert.ok(lines.some((l) => l === 'Dry-run — nothing written to BaseLinker.'));
  const all = lines.join('\n');
  assert.equal((all.match(/key=|token=|client=/g) ?? []).length, 0);
  assert.equal(redactSecrets(all), all);
});

// ── Zeroing, decision A (tj 2026-10-26) ─────────────────────────────────────

const counts = (previous: number): FeedCountStore => ({ read: () => ({ products: previous, matched: 1 }), write: () => undefined });

test('zeroing A: a record reached through the EAN only, no longer matched → stock 0 and own purchase cleared in this supplier\'s groups only', async () => {
  const bl = new FakeBL(new Map<number, Rec>([
    // SHARG-5652: Spechurt reached it through the EAN before (stock in H3, own group), today's Spechurt feed no longer matches it
    [710960249, { sku: 'SHARG-5652', ean: EAN, features: { 'SKU Sharg': '5652' }, prices: { [SALE]: 426.4, [PURCHASE]: 328, [OWN.sharg]: 328, [OWN.spechurt]: 231.75 }, stock: { [WH.sharg]: 5, [WH.spechurt]: 8 }, tags: ['approved'] }],
    // Spechurt's own record, today's feed has it
    [711000001, { sku: 'SPECHURT-1', ean: '5900000000017', features: { 'SKU Spechurt': '1' }, prices: { [OWN.spechurt]: 10 }, stock: { [WH.spechurt]: 1 } }],
  ]));
  const lines: string[] = [];
  const { zeroed } = await runSyncCore([item('spechurt', '1', 10, 1, '5900000000017')], 'spechurt', env('spechurt'), bl.syncDeps(lines, counts(1)));
  const r = bl.records.get(710960249)!;
  assert.deepEqual([r.stock[WH.spechurt], r.stock[WH.sharg]], [0, 5]);
  assert.deepEqual([r.prices[OWN.spechurt], r.prices[OWN.sharg], r.prices[SALE], r.prices[PURCHASE]], [0, 328, 426.4, 328]);
  assert.deepEqual(zeroed?.map((z) => [z.id, z.reason, z.code]), [[710960249, 'not_matched', '']]);
  assert.ok(lines.some((l) => l === '  zeroed: 1 (approved: 1) — withdrawn by spechurt, stock 0 in bl_157485 only'), lines.join('\n'));
  assert.ok(lines.some((l) => l.startsWith('  own purchase cleared: 1 —')), lines.join('\n'));
  // the record is no longer shared → pricing leaves it, Sharg's own sync prices it again
  assert.equal(isSharedByPurchase(r.prices, OWN), false);
});

test('zeroing A: a member whose code left the feed — stock already 0 there — still gets its own purchase cleared', async () => {
  const bl = new FakeBL(new Map<number, Rec>([
    [1, { sku: 'KOLBA-100-001', ean: EAN, features: { 'SKU Kolba': '100-001', 'SKU Spechurt': '5001' }, prices: { [OWN.kolba]: 100, [OWN.spechurt]: 85 }, stock: { [WH.kolba]: 5, [WH.spechurt]: 0 } }],
    [2, { sku: 'SPECHURT-2', ean: '5900000000024', features: { 'SKU Spechurt': '2' }, prices: {}, stock: { [WH.spechurt]: 1 } }],
  ]));
  await runSyncCore([item('spechurt', '2', 10, 1, '5900000000024')], 'spechurt', env('spechurt'), bl.syncDeps([], counts(1)));
  assert.equal(bl.records.get(1)!.prices[OWN.spechurt], 0);
  assert.equal(bl.records.get(1)!.prices[OWN.kolba], 100);
  assert.ok(!bl.priceWrites.some((w) => '1' in w && SALE in w['1']), 'no selling price touched');
});

test('zeroing without own purchase groups is HA-2.38: a record without this supplier\'s code is left alone', async () => {
  const bl = new FakeBL(new Map<number, Rec>([
    [710960249, { sku: 'SHARG-5652', ean: EAN, features: { 'SKU Sharg': '5652' }, prices: {}, stock: { [WH.sharg]: 5, [WH.spechurt]: 8 } }],
    [711000001, { sku: 'SPECHURT-1', ean: '5900000000017', features: {}, prices: {}, stock: { [WH.spechurt]: 1 } }],
  ]));
  const { zeroed } = await runSyncCore([item('spechurt', '1', 10, 1, '5900000000017')], 'spechurt', env('spechurt', false), bl.syncDeps([], counts(1)));
  assert.equal(bl.records.get(710960249)!.stock[WH.spechurt], 8);
  assert.deepEqual(zeroed, []);
});

// ── Second valve: matched records (review PR #69) ───────────────────────────

/**
 * 100 Spechurt records SPECHURT-m0…m99 (code only, no EAN; stock 1 in H3, own purchase 10) plus BL
 * 900, a Sharg record Spechurt reached through the EAN before (stock 8 in H3, own purchase 20). The
 * previous successful run: 100 products, 100 matched. Today's feed keeps 100 products, but only
 * `matching` of them still match (the rest stand for items whose key broke) — the product valve
 * cannot see that.
 */
function matchCatalogue(): FakeBL {
  const recs = new Map<number, Rec>();
  for (let i = 0; i < 100; i++) recs.set(1000 + i, { sku: `SPECHURT-m${i}`, ean: '', features: { 'SKU Spechurt': `m${i}` }, prices: { [OWN.spechurt]: 10 }, stock: { [WH.spechurt]: 1 } });
  recs.set(900, { sku: 'SHARG-900', ean: '5900000009007', features: { 'SKU Sharg': '900' }, prices: { [SALE]: 50, [PURCHASE]: 30, [OWN.sharg]: 30, [OWN.spechurt]: 20 }, stock: { [WH.sharg]: 2, [WH.spechurt]: 8 } });
  return new FakeBL(recs);
}
const matchFeed = (matching: number) => Array.from({ length: 100 }, (_, i) => (i < matching ? item('spechurt', `m${i}`, 12, 3, null) : item('spechurt', `broken${i}`, 12, 3, null)));
function countsStore(previous: FeedCounts | null): FeedCountStore & { data: FeedCounts | null } {
  const st = { data: previous } as FeedCountStore & { data: FeedCounts | null };
  st.read = () => st.data;
  st.write = (_s, c) => { st.data = { ...c }; };
  return st;
}

test('match valve RED PROOF: 89% of the previous matched records → no stock-0 and no own-purchase clearing, [error] matches look incomplete, not ok (exit ≠ 0); matched records still synced', async () => {
  const bl = matchCatalogue();
  const store = countsStore({ products: 100, matched: 100 });
  const lines: string[] = [];
  const { ok, zeroed } = await runSyncCore(matchFeed(89), 'spechurt', env('spechurt'), bl.syncDeps(lines, store));
  assert.deepEqual([bl.records.get(1095)!.stock[WH.spechurt], bl.records.get(1095)!.prices[OWN.spechurt]], [1, 10], 'unmatched record: stock and own purchase kept');
  assert.deepEqual([bl.records.get(900)!.stock[WH.spechurt], bl.records.get(900)!.prices[OWN.spechurt]], [8, 20], 'EAN-only record: kept');
  assert.equal(ok, false);
  assert.equal(zeroed, undefined);
  assert.ok(lines.some((l) => l.startsWith('[error] matches look incomplete: 89 matched, previous successful run 100 (< 90%)')), lines.join('\n'));
  assert.ok(bl.priceWrites.every((w) => Object.values(w).every((p) => !Object.values(p).includes(0))), 'no price write of 0');
  assert.deepEqual([bl.records.get(1000)!.stock[WH.spechurt], bl.records.get(1000)!.prices[OWN.spechurt]], [3, 12], 'matched records: stock and own purchase written as today');
  assert.deepEqual(store.data, { products: 100, matched: 100 }, 'an incomplete run does not become the new baseline');
});

test('match valve: exactly 90% of the previous matched records → zeroing and clearing proceed, counts stored', async () => {
  const bl = matchCatalogue();
  const store = countsStore({ products: 100, matched: 100 });
  const lines: string[] = [];
  const { ok, zeroed } = await runSyncCore(matchFeed(90), 'spechurt', env('spechurt'), bl.syncDeps(lines, store));
  assert.equal(ok, true);
  assert.equal(zeroed!.length, 11, '1090…1099 and 900');
  assert.deepEqual([bl.records.get(1095)!.stock[WH.spechurt], bl.records.get(1095)!.prices[OWN.spechurt]], [0, 0]);
  assert.deepEqual([bl.records.get(900)!.stock[WH.spechurt], bl.records.get(900)!.prices[OWN.spechurt], bl.records.get(900)!.stock[WH.sharg]], [0, 0, 2]);
  assert.deepEqual(store.data, { products: 100, matched: 90 });
});

test('match valve: a state-file entry from before the valve (no matched count) → store only, nothing zeroed or cleared', async () => {
  const bl = matchCatalogue();
  const store = countsStore({ products: 100, matched: null });
  const lines: string[] = [];
  const { ok, zeroed } = await runSyncCore(matchFeed(90), 'spechurt', env('spechurt'), bl.syncDeps(lines, store));
  assert.equal(ok, true);
  assert.equal(zeroed, undefined);
  assert.equal(bl.records.get(1095)!.stock[WH.spechurt], 1);
  assert.ok(lines.some((l) => l.includes('no previous match count for spechurt, nothing zeroed this run; counts stored (100 products, 90 matched)')), lines.join('\n'));
  assert.deepEqual(store.data, { products: 100, matched: 90 });
});

test('zeroGate: the feed valve first, then the match valve; both at 90%', () => {
  assert.deepEqual(zeroGate(89, 100, { products: 100, matched: 100 }), { kind: 'feed_incomplete', previous: 100 });
  assert.deepEqual(zeroGate(100, 89, { products: 100, matched: 100 }), { kind: 'matches_incomplete', previous: 100 });
  assert.deepEqual(zeroGate(90, 90, { products: 100, matched: 100 }), { kind: 'go' });
  assert.deepEqual(zeroGate(100, 5, { products: 100, matched: null }), { kind: 'first', what: 'matches' });
  assert.deepEqual(zeroGate(100, 5, null), { kind: 'first', what: 'feed' });
});

// ── The import script (read as text — the hook blocks running it) ───────────

test('the import script: own groups from the registry; price-shared reads through the read-only client and writes prices only', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../scripts/xml-to-baselinker.ts'), 'utf8');
  assert.match(src, /toBLProduct\(p, env, r\.categoryId, tags, identity, margin, \{ supplier: connectorName, currentPrices: existing\?\.prices \?\? \{\} \}\)/);
  assert.match(src, /purchaseGroups: loadOwnPurchaseGroups\(priceGroup, priceGroupPurchase\)/);
  const pricing = src.slice(src.indexOf('async function runPriceShared'), src.indexOf('// ── Mode: dry-run'));
  assert.match(pricing, /getProductsList: readonly\.getInventoryProductsList/);
  assert.match(pricing, /getProductsData: readonly\.getInventoryProductsData/);
  assert.match(pricing, /\.updateInventoryProductsPrices;/);
  assert.doesNotMatch(pricing, /fetchAndParse|fetch\(|addInventoryProduct|updateInventoryProductsStock/, 'no feed, no other write');
  assert.match(pricing, /if \(!dryRun\) \{\n\s+assertExternalProd\('BaseLinker'\);/, 'the write path needs the production unlock');
  assert.doesNotMatch(src, /PURCHASE_(KOLBA|SHARG|SPECHURT)\s*=\s*\d/, 'no hard-coded group ID');
});
