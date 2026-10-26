/**
 * Unit tests for xml-integration/price-diag.ts (HA-2.38, price diagnosis) — raw feed elements,
 * Sharg sizes, the GTIN-14 key, the price-cause classification and the sync-log summary — plus a
 * static check that scripts/diag-prices.ts reaches BaseLinker only through readonly.ts.
 *
 * Runner: npx tsx --test xml-integration/__tests__/price-diag.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import {
  classifyRecord,
  deltaBucket,
  feedElements,
  gtin14Key,
  sanitizeFragment,
  shargSizes,
  summarizeSyncLog,
  type PriceItem,
  type RecordPrices,
} from '../price-diag';
import { READ_ONLY_METHODS } from '../../src/lib/baselinker/readonly';

const SHARG = `<?xml version="1.0"?><offer generated="x"><products>
<product id="7" vat="23"><description><name>A</name><long_desc>see https://shop.example/x?token=s3cret</long_desc></description>
<images><large><image url="https://img.example/1.jpg"/></large></images>
<sizes>
<size id="1" name="S" weight="3" code_producer="0192687280759" iaiext:code_external="005652"><price gross="328" net="266.67"/><srp gross="499" net="405.69"/><stock id="1" quantity="2"/><stock id="2" quantity="1"/></size>
<size id="2" name="M" weight="4" code_producer="5901234567001" iaiext:code_external="005653"><price gross="231.75" net="188.41"/></size>
</sizes></product>
<product id="8" vat="23"><sizes><size id="uniw" code_producer="1"/></sizes></product>
</products></offer>`;

const KOLBA = `<produkty><produkt><id><![CDATA[22484]]></id><ean><![CDATA[]]></ean><dlugi_opis><![CDATA[long <b>text</b>]]></dlugi_opis><zdjecia><zdjecie pozycja="1"><![CDATA[https://img.example/a.jpg]]></zdjecie></zdjecia><cena_brutto_hurt><![CDATA[996.09]]></cena_brutto_hurt></produkt><produkt><id><![CDATA[22485]]></id></produkt></produkty>`;

// ── raw feed elements ─────────────────────────────────────────────────────────

test('feedElements: picks the requested <product> / <produkt> by id, skips the <products> / <produkty> wrapper', () => {
  const sh = feedElements(SHARG, 'sharg', new Set(['8']));
  assert.deepEqual([...sh.keys()], ['8']);
  assert.ok(sh.get('8')!.startsWith('<product id="8"') && sh.get('8')!.endsWith('</product>'));
  const ko = feedElements(KOLBA, 'kolba', new Set(['22484']));
  assert.deepEqual([...ko.keys()], ['22484']);
  assert.match(ko.get('22484')!, /996\.09/);
  assert.equal(feedElements(SHARG, 'sharg', new Set()).size, 0);
});

test('sanitizeFragment: descriptions and images dropped, no URL or token left, prices kept', () => {
  const sh = sanitizeFragment(feedElements(SHARG, 'sharg', new Set(['7'])).get('7')!, 'sharg');
  assert.ok(!/https?:\/\/|token=|s3cret|img\.example/.test(sh), sh);
  assert.match(sh, /<description>…<\/description>/);
  assert.match(sh, /price gross="328"/);
  const ko = sanitizeFragment(feedElements(KOLBA, 'kolba', new Set(['22484'])).get('22484')!, 'kolba');
  assert.ok(!/https?:\/\/|long/.test(ko), ko);
  assert.match(ko, /cena_brutto_hurt/);
  assert.match(sanitizeFragment('<produkt>x</produkt>'.repeat(50), 'kolba', 40), /\(960 more characters cut\)$/);
});

test('shargSizes: every size in feed order, EAN as written (leading zero kept), price, srp, summed stock', () => {
  const rows = shargSizes(feedElements(SHARG, 'sharg', new Set(['7'])).get('7')!);
  assert.deepEqual(rows.map((r) => [r.pos, r.id, r.codeExternal, r.codeProducer, r.priceGross, r.srpGross, r.stock, r.weight]), [
    [0, '1', '005652', '0192687280759', '328', '499', 3, '3'],
    [1, '2', '005653', '5901234567001', '231.75', '', 0, '4'],
  ]);
});

// ── EAN key ───────────────────────────────────────────────────────────────────

test('gtin14Key: one key for an EAN with and without the leading zero; empty / all-zero / too long → null', () => {
  assert.equal(gtin14Key('192687280759'), gtin14Key('0192687280759'));
  assert.equal(gtin14Key(' 0192687280759 '), '00192687280759');
  assert.equal(gtin14Key('12345670'), '00000012345670');
  assert.equal(gtin14Key(''), null);
  assert.equal(gtin14Key('0000'), null);
  assert.equal(gtin14Key('123456789012345'), null);
});

// ── price causes ──────────────────────────────────────────────────────────────

const item = (pos: number, purchase: number | null, gross = 0, pct = 30): PriceItem => ({
  pos,
  sku: String(pos),
  pricePurchase: purchase,
  priceGross: gross,
  expectedSale: purchase && purchase > 0 ? Math.round(purchase * (1 + pct / 100) * 100) / 100 : gross,
  fromFallback: !(purchase && purchase > 0),
});

const rec = (over: Partial<RecordPrices>): RecordPrices => ({
  shared: false, items: [], blSale: null, blPurchase: null, planSale: null, planPurchase: null, marginPct: 30, purchaseGroup: true, ...over,
});

test('classifyRecord: SHARG 5652 shape — two feed items, BL = what the sync writes (the last item) → explained, not a sync miss', () => {
  const v = classifyRecord(rec({ items: [item(10, 328), item(11, 231.75)], blPurchase: 231.75, blSale: 301.28, planPurchase: 231.75, planSale: 301.28 }));
  assert.equal(v.flagged, true);
  assert.equal(v.cause, 'wiele_pozycji_bl_jak_sync');
  assert.equal(v.flaggedItems, 1); // the audit counts the 328 item only
});

test('classifyRecord: two feed items, BL differs from the sync too → separate cause', () => {
  assert.equal(classifyRecord(rec({ items: [item(1, 328), item(2, 231.75)], blPurchase: 200, blSale: 260, planPurchase: 231.75, planSale: 301.28 })).cause, 'wiele_pozycji_bl_inaczej');
});

test('classifyRecord: single item — stale coherent pair, incoherent pair, sale only, fallback, empty purchase group, shared', () => {
  const stale = classifyRecord(rec({ items: [item(1, 328)], blPurchase: 231.75, blSale: 301.28 }));
  assert.equal(stale.cause, 'zakup_inny_para_spojna');
  assert.ok(Math.abs(stale.purchaseDelta! - (231.75 - 328) / 328) < 1e-9);
  assert.equal(classifyRecord(rec({ items: [item(1, 328)], blPurchase: 231.75, blSale: 999 })).cause, 'zakup_inny_para_niespojna');
  assert.equal(classifyRecord(rec({ items: [item(1, 100)], blPurchase: 100, blSale: 125 })).cause, 'zakup_zgodny_sprzedaz_inna');
  assert.equal(classifyRecord(rec({ items: [item(1, null, 80)], blSale: 90 })).cause, 'fallback_brak_zakupu_w_feedzie');
  assert.equal(classifyRecord(rec({ items: [item(1, 100)], blPurchase: null, blSale: 130 })).cause, 'brak_zakupu_w_BL');
  assert.equal(classifyRecord(rec({ shared: true, items: [item(1, 100)], blPurchase: 90, blSale: 117 })).cause, 'wspolny');
});

test('classifyRecord: BL as the feed says → not flagged; no purchase group → purchase not compared', () => {
  const ok = classifyRecord(rec({ items: [item(1, 328)], blPurchase: 328, blSale: 426.4 }));
  assert.equal(ok.flagged, false);
  assert.equal(ok.cause, null);
  assert.equal(classifyRecord(rec({ purchaseGroup: false, items: [item(1, 328)], blSale: 426.4 })).flagged, false);
});

test('deltaBucket: boundaries', () => {
  assert.deepEqual([0.005, -0.01, 0.03, -0.1, 0.4, -0.2935, 0.6].map(deltaBucket), ['≤1%', '≤1%', '1–5%', '5–15%', '15–50%', '15–50%', '>50%']);
});

// ── sync log ──────────────────────────────────────────────────────────────────

test('summarizeSyncLog: BL counters and warning counts; no warning content today', () => {
  const s = summarizeSyncLog([
    '2026-10-26 01:50:01+0100 run-bl: sharg sync pid=1 start',
    'Fetching feed: https://hurt.example/edi?token=abc…',
    'Matched 3000 products, 10 not in BL yet',
    '  stock  1000/2000: 1000 updated',
    '  prices 1000/2000: 998 updated, 2 warnings',
    '  stock  2000/2000: 1000 updated',
    '  prices 2000/2000: 1000 updated',
    '✓ Sync done: 2000 products refreshed',
  ].join('\n'));
  assert.equal(s.writes.length, 4);
  assert.equal(s.priceWarnings, 2);
  assert.equal(s.priceCounter, 1998);
  assert.equal(s.warningContentLines, 0);
  assert.ok(s.lines.some((l) => l.startsWith('Matched 3000')));
  assert.ok(!s.lines.some((l) => /token|https?:/.test(l)));
  assert.equal(summarizeSyncLog('[warn] BL warning for product 5: invalid price group').warningContentLines, 1);
});

// ── read-only by construction ─────────────────────────────────────────────────

test('scripts/diag-prices.ts: no BaseLinker client import, no blCall, only allowlisted read methods', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../scripts/diag-prices.ts'), 'utf8');
  assert.ok(!/baselinker\/client/.test(src), 'must not import src/lib/baselinker/client');
  assert.ok(!/\bblCall\b|\bblReadOnlyCall\b/.test(src), 'must not call blCall / blReadOnlyCall directly');
  assert.match(src, /from '\.\.\/src\/lib\/baselinker\/readonly'/);
  const BL_NAME = /\b(?:get|add|update|delete|set)(?:Inventory|Inventories|Order|Orders|Invoice|Journal|External|Courier|Package|Receipt|Series|Connect|Storage|Product|Products|Categor|Warehouse|Manufacturer|PriceGroup)\w*/g;
  const used = new Set([...src.matchAll(BL_NAME)].map((m) => m[0]));
  const outside = [...used].filter((m) => !(READ_ONLY_METHODS as readonly string[]).includes(m));
  assert.deepEqual(outside, [], `BaseLinker methods outside the readonly.ts allowlist: ${outside.join(', ')}`);
  assert.ok(used.size > 0);
});
