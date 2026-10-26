/**
 * Withdrawn products (HA-2.38): the sync sets stock 0 in the supplier's warehouse on records that
 * carry its code while today's feed does not — behind the 90% feed-size guard. Fake BaseLinker,
 * no network.
 *
 * Runner: npx tsx --test xml-integration/__tests__/sync-zeroing.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { FEED_MIN_RATIO, feedGuard, runSyncCore, type FeedCounts, type FeedCountStore, type SyncDeps, type WriteEnv } from '../bl-write';
import { dropAmbiguousEans, type Supplier } from '../bl-match-key';
import { MarginTally } from '../margin';
import type { NormalizedProduct } from '../types';

const SALE = 1;
const PURCHASE = 2;
const H1 = 'bl_1'; // Kolba
const H2 = 'bl_2'; // Sharg
const env: WriteEnv = { inventoryId: 119068, priceGroup: SALE, priceGroupPurchase: PURCHASE, warehouse: H2, markupPct: 30 };

interface Rec { sku: string; ean: string; tags: string[]; features: Record<string, string>; stock: Record<string, number> }

function feedItem(sku: string, over: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    connector: 'sharg', connector_product_id: sku, connector_sku: sku, ean: null, brand: null, name: `Sharg ${sku}`,
    description_html: null, short_description: null, features: {}, price_gross: 100, price_net: 81.3, tax_rate: 23,
    price_purchase: 50, price_compare: null, stock: 3, weight_g: null, images: [], supplier_category_id: null,
    supplier_category_name: null, has_variants: false, variants: [],
    _hints: { requires_license: false, age_restricted: false, pickup_only: false }, source_url: null, raw_connector_category: null,
    ...over,
  };
}

class FakeBL {
  stockWrites: Array<Record<string, Record<string, number>>> = [];
  constructor(public records: Map<number, Rec>) {}
  deps(store: FeedCountStore | null, lines: string[]): SyncDeps {
    return {
      getProductsList: async (_inv, page = 1) => (page > 1 ? {} : Object.fromEntries([...this.records].map(([id, r]) => [String(id), { ean: r.ean, sku: r.sku, stock: { ...r.stock } }]))),
      getProductsData: async (_inv, ids) => Object.fromEntries(ids.filter((id) => this.records.has(Number(id))).map((id) => {
        const r = this.records.get(Number(id))!;
        return [id, { sku: r.sku, tags: r.tags, text_fields: { name: r.sku, features: r.features }, prices: {} }];
      })),
      updateStock: async (_inv, products) => {
        this.stockWrites.push(products);
        for (const [id, s] of Object.entries(products)) Object.assign(this.records.get(Number(id))!.stock, s);
        return { counter: Object.keys(products).length, warnings: {} };
      },
      updatePrices: async (_inv, products) => ({ counter: Object.keys(products).length, warnings: {} }),
      sleep: async () => undefined,
      rateLimitMs: 0,
      marginKey: null,
      log: (l) => lines.push(l),
      warn: (l) => lines.push(l),
      tally: new MarginTally(() => undefined),
      feedCounts: store,
    };
  }
}

/** Counts of the previous successful run; `matched` defaults to 1 — catalogue()'s feeds match record 10 only. */
function memoryStore(initial: Partial<Record<Supplier, number | FeedCounts>> = {}): FeedCountStore & { data: Partial<Record<Supplier, FeedCounts>> } {
  const data: Partial<Record<Supplier, FeedCounts>> = Object.fromEntries(
    Object.entries(initial).map(([k, v]) => [k, typeof v === 'number' ? { products: v, matched: 1 } : v]),
  );
  return { data, read: (s) => data[s] ?? null, write: (s, c) => { data[s] = { ...c }; } };
}

/**
 * 10 = Sharg's own record, in the feed. 11 = Sharg's own record, code gone from the feed (stock in
 * Sharg's and Kolba's warehouses). 12 = Kolba-created shared record with `SKU Sharg` 77, gone from
 * Sharg's feed, approved. 13 = Kolba's record with stock in Sharg's warehouse but no Sharg code.
 * 14 = Sharg's record already at 0.
 */
function catalogue(): FakeBL {
  return new FakeBL(new Map<number, Rec>([
    [10, { sku: 'SHARG-1', ean: '', tags: ['approved'], features: { 'SKU Sharg': '1' }, stock: { [H2]: 5 } }],
    [11, { sku: 'SHARG-2', ean: '', tags: [], features: { 'SKU Sharg': '2' }, stock: { [H2]: 4, [H1]: 6 } }],
    [12, { sku: 'KOLBA-9', ean: '', tags: ['approved'], features: { 'SKU Kolba': '9', 'SKU Sharg': '77' }, stock: { [H1]: 2, [H2]: 3 } }],
    [13, { sku: 'KOLBA-10', ean: '', tags: [], features: { 'SKU Kolba': '10' }, stock: { [H2]: 1 } }],
    [14, { sku: 'SHARG-4', ean: '', tags: [], features: {}, stock: { [H2]: 0 } }],
  ]));
}

const run = async (bl: FakeBL, products: NormalizedProduct[], store: FeedCountStore | null) => {
  const lines: string[] = [];
  const res = await runSyncCore(products, 'sharg', env, bl.deps(store, lines));
  return { ...res, lines };
};

/** `n` feed products: Sharg 1 plus filler codes that match nothing in BL. */
const feedOf = (n: number) => [feedItem('1'), ...Array.from({ length: n - 1 }, (_, i) => feedItem(`x${i}`))];

test('zeroing: a record with Sharg\'s code missing from the feed → stock 0 in Sharg\'s warehouse only; other warehouses and records untouched', async () => {
  const bl = catalogue();
  const store = memoryStore({ sharg: 10 });
  const { ok, zeroed, lines } = await run(bl, feedOf(10), store);
  assert.equal(ok, true);
  assert.deepEqual(zeroed!.map((r) => [r.id, r.code, r.approved]), [[11, '2', false], [12, '77', true]]);
  assert.deepEqual(bl.stockWrites.at(-1), { 11: { [H2]: 0 }, 12: { [H2]: 0 } }, 'one write, Sharg\'s warehouse key only');
  assert.equal(bl.records.get(11)!.stock[H1], 6, 'Kolba\'s stock on the same record stays');
  assert.equal(bl.records.get(12)!.stock[H1], 2);
  assert.equal(bl.records.get(13)!.stock[H2], 1, 'no Sharg code → not Sharg\'s to zero');
  assert.equal(bl.records.get(10)!.stock[H2], 3, 'in the feed → normal sync stock');
  assert.ok(lines.some((l) => /zeroed: 2 \(approved: 1\)/.test(l)), lines.join('\n'));
  assert.deepEqual(store.data.sharg, { products: 10, matched: 1 }, 'counts stored after a successful run');
});

test('guard RED PROOF: feed at 89% of the previous run → no stock-0 write, [error] feed looks incomplete, not ok (exit ≠ 0)', async () => {
  const bl = catalogue();
  const store = memoryStore({ sharg: 100 });
  const { ok, zeroed, lines } = await run(bl, feedOf(89), store);
  assert.equal(ok, false);
  assert.equal(zeroed, undefined);
  assert.ok(bl.stockWrites.every((w) => !('11' in w) && !('12' in w)), 'records 11 and 12 never written');
  assert.equal(bl.records.get(11)!.stock[H2], 4);
  assert.equal(bl.records.get(12)!.stock[H2], 3);
  assert.ok(lines.some((l) => l.startsWith('[error] feed looks incomplete: 89 products, previous successful run 100')), lines.join('\n'));
  assert.deepEqual(store.data.sharg, { products: 100, matched: 1 }, 'an incomplete run does not become the new baseline');
});

test('guard: feed at exactly 90% → zeroing proceeds', async () => {
  const bl = catalogue();
  const { ok, zeroed } = await run(bl, feedOf(90), memoryStore({ sharg: 100 }));
  assert.equal(ok, true);
  assert.deepEqual(zeroed!.map((r) => r.id), [11, 12]);
  assert.equal(bl.records.get(11)!.stock[H2], 0);
  assert.equal(FEED_MIN_RATIO, 0.9);
  assert.deepEqual(feedGuard(89, 100), { kind: 'incomplete', previous: 100 });
  assert.deepEqual(feedGuard(90, 100), { kind: 'ok', previous: 100 });
});

test('first run (no history) → nothing zeroed, count stored; no store (--limit) → no zeroing at all', async () => {
  const bl = catalogue();
  const store = memoryStore();
  const first = await run(bl, feedOf(10), store);
  assert.equal(first.ok, true);
  assert.equal(first.zeroed, undefined);
  assert.equal(bl.records.get(11)!.stock[H2], 4);
  assert.deepEqual(store.data.sharg, { products: 10, matched: 1 });
  assert.ok(first.lines.some((l) => /no previous feed count for sharg/.test(l)));
  const limited = await run(catalogue(), feedOf(10), null);
  assert.equal(limited.zeroed, undefined);
});

test('a candidate BaseLinker returns no data for is left alone', async () => {
  const bl = catalogue();
  const deps = bl.deps(memoryStore({ sharg: 10 }), []);
  const getData = deps.getProductsData;
  deps.getProductsData = async (inv, ids) => { const d = await getData(inv, ids); delete d['11']; return d; };
  const { zeroed } = await runSyncCore(feedOf(10), 'sharg', env, deps);
  assert.deepEqual(zeroed!.map((r) => r.id), [12]);
});

// ── exit code of the process (the import script's runSync → runSyncProcess) ───

const driver = path.resolve(__dirname, 'fixtures/sync-exit-driver.ts');
const runDriver = (arg: string) => spawnSync(process.execPath, ['--import', 'tsx', driver, arg], { encoding: 'utf8', cwd: path.resolve(__dirname, '../..') });

test('guard RED PROOF, process level: an incomplete feed ends the process with exit 1 and the [error] line on stderr; no stock-0 write', () => {
  const r = runDriver('incomplete');
  assert.equal(r.status, 1, `exit code (stderr: ${r.stderr})`);
  assert.match(r.stderr, /^\[error\] feed looks incomplete: 89 products, previous successful run 100/m);
  assert.doesNotMatch(r.stdout, /"11":\{"bl_2":0\}/, 'the withdrawn record is not zeroed');
  assert.match(r.stdout, /Sync done: 1 products refreshed/, 'the feed\'s own stock and prices still go');
});

test('match valve RED PROOF, process level: matched records below 90% of the previous run → exit 1, [error] on stderr, no stock-0 write', () => {
  const r = runDriver('matches-incomplete');
  assert.equal(r.status, 1, `exit code (stderr: ${r.stderr})`);
  assert.match(r.stderr, /^\[error\] matches look incomplete: 1 matched, previous successful run 2/m);
  assert.doesNotMatch(r.stdout, /"11":\{"bl_2":0\}/, 'the withdrawn record is not zeroed');
  assert.match(r.stdout, /Sync done: 1 products refreshed/, 'the feed\'s own stock and prices still go');
});

test('process level: a complete feed zeroes the withdrawn record and exits 0', () => {
  const r = runDriver('ok');
  assert.equal(r.status, 0, `exit code (stderr: ${r.stderr})`);
  assert.match(r.stdout, /stock write \{"11":\{"bl_2":0\}\}/);
  assert.match(r.stdout, /zeroed: 1 \(approved: 0\)/);
});

test('the import script runs the sync through runSyncProcess (so its exit code is the one tested above)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../scripts/xml-to-baselinker.ts'), 'utf8');
  assert.match(src, /await runSyncProcess\(products, connectorName, env, \{/);
  assert.doesNotMatch(src, /runSyncCore\(/, 'calling runSyncCore directly would bypass the exit code');
});

// ── D-D: the code is in the feed, but its item now matches another record (tj 2026-10-26) ──

const H3 = 'bl_3'; // Spechurt

/**
 * As the preview found it: 711070073 SPECHURT-43894 (no EAN), whose Spechurt item 43894 now matches
 * KOLBA-874-073 through the EAN `0192687280759` = `192687280759`; the S&W pair 42585 / 42586
 * (one GTIN-14 key, own records 717178608 / 717178611).
 */
function movedCatalogue(): FakeBL {
  return new FakeBL(new Map<number, Rec>([
    [710598323, { sku: 'KOLBA-874-073', ean: '192687280759', tags: ['approved'], features: { 'SKU Kolba': '874-073' }, stock: { [H1]: 3, [H3]: 0 } }],
    [711070073, { sku: 'SPECHURT-43894', ean: '', tags: ['approved'], features: { 'SKU Spechurt': '43894' }, stock: { [H3]: 2, [H1]: 4 } }],
    [717178608, { sku: 'SPECHURT-42585', ean: '28634709762', tags: [], features: { 'SKU Spechurt': '42585' }, stock: { [H3]: 1 } }],
    [717178611, { sku: 'SPECHURT-42586', ean: '028634709762', tags: [], features: { 'SKU Spechurt': '42586' }, stock: { [H3]: 1 } }],
  ]));
}

const spechurtFeed = () => [
  feedItem('43894', { connector: 'spechurt', ean: '0192687280759', stock: 5 }),
  feedItem('42585', { connector: 'spechurt', ean: '28634709762' }),
  feedItem('42586', { connector: 'spechurt', ean: '028634709762' }),
];

const runSpechurt = async (bl: FakeBL, products: NormalizedProduct[]) => {
  const lines: string[] = [];
  const res = await runSyncCore(products, 'spechurt', { ...env, warehouse: H3 }, bl.deps(memoryStore({ spechurt: 3 }), lines));
  return { ...res, lines };
};

test('D-D RED PROOF: a record whose code\'s item now matches another record → stock 0 in that warehouse only; the record it moved to and other warehouses untouched', async () => {
  const bl = movedCatalogue();
  const { ok, zeroed, lines } = await runSpechurt(bl, dropAmbiguousEans(spechurtFeed()).products);
  assert.equal(ok, true);
  assert.deepEqual(zeroed!.map((r) => [r.id, r.reason, r.movedTo]), [[711070073, 'matched_elsewhere', 710598323]], 'before D-D the list was empty');
  assert.equal(bl.records.get(711070073)!.stock[H3], 0);
  assert.equal(bl.records.get(711070073)!.stock[H1], 4, 'Kolba\'s stock on the moved record stays');
  assert.equal(bl.records.get(710598323)!.stock[H3], 5, 'the record it moved to gets the item\'s stock from the sync, not 0');
  assert.equal(bl.records.get(710598323)!.stock[H1], 3);
  assert.ok(lines.some((l) => /zeroed: 1 \(approved: 1\)/.test(l)), lines.join('\n'));
});

test('D-D with D-E: 717178611 SPECHURT-42586 keeps its own match and is not zeroed; without D-E it would be', async () => {
  const withRule = await runSpechurt(movedCatalogue(), dropAmbiguousEans(spechurtFeed()).products);
  assert.ok(!withRule.zeroed!.some((r) => r.id === 717178611));
  const raw = await runSpechurt(movedCatalogue(), spechurtFeed());
  assert.deepEqual(raw.zeroed!.map((r) => r.id).sort(), [711070073, 717178611], 'raw feed: 42586 lands on 717178608 and its own record looks moved');
});

test('D-D: a code whose feed item matches no record at all is left alone (not moved, not missing)', async () => {
  const bl = movedCatalogue();
  // Kolba's record carrying Spechurt's code 999 as a parameter; Spechurt's item 999 has no EAN and
  // SPECHURT-999 is nobody's SKU — the item matches nothing, so the record is neither moved nor withdrawn
  bl.records.set(720000001, { sku: 'KOLBA-1', ean: '', tags: [], features: { 'SKU Kolba': '1', 'SKU Spechurt': '999' }, stock: { [H3]: 2 } });
  const { zeroed } = await runSpechurt(bl, dropAmbiguousEans([...spechurtFeed(), feedItem('999', { connector: 'spechurt', ean: null })]).products);
  assert.ok(!zeroed!.some((r) => r.id === 720000001));
  assert.equal(bl.records.get(720000001)!.stock[H3], 2);
});
