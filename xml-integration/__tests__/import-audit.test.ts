/**
 * Unit tests for xml-integration/import-audit.ts (HA-2.37) — name normalization, duplicate and
 * variant grouping, record attribution, the run-bl.sh journal parser, output redaction — plus a
 * static check that scripts/audit-import.ts reaches BaseLinker only through readonly.ts.
 *
 * Runner: npx tsx --test xml-integration/__tests__/import-audit.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import {
  decodeEntities,
  duplicateCandidates,
  extractVariantAttrs,
  gapSource,
  nameIssues,
  nameKey,
  nightKey,
  normalizeName,
  parseJournalLine,
  pickRows,
  recordSuppliers,
  redactSecrets,
  runVerdict,
  summarizeRunLog,
  toCsv,
  tokenString,
  variantGroupCandidates,
  type CatalogueItem,
  type VariantItem,
} from '../import-audit';
import { READ_ONLY_METHODS } from '../../src/lib/baselinker/readonly';

// ── name text ────────────────────────────────────────────────────────────────

test('decodeEntities: named, numeric, hex and double-encoded entities; unknown names stay', () => {
  assert.equal(decodeEntities('Kabura &quot;Glock&quot; &oacute;semka'), 'Kabura "Glock" ósemka');
  assert.equal(decodeEntities('&#261;&#x107; &amp;oacute;'), 'ąć ó');
  assert.equal(decodeEntities('&bogus; zostaje'), '&bogus; zostaje');
});

test('tokenString: folds Polish letters, decimal comma, joins number and unit, keeps 3-9x40 and 12/76', () => {
  assert.equal(tokenString('Śrut Łucznik 4,5 mm'), 'srut lucznik 4.5mm');
  assert.equal(tokenString('Luneta 3 - 9 x 40'), 'luneta 3-9x40');
  assert.equal(tokenString('Naboje 12/76, kal. .22 LR'), 'naboje 12/76 kal 22 lr');
  assert.equal(tokenString('Montaż 1" Weaver'), 'montaz 1in weaver');
  assert.equal(tokenString('.22 cal'), '22 cal', 'a calibre in "cal" is not an inch');
});

test('normalizeName: word order, punctuation, case, producer words and stopwords do not matter', () => {
  const a = normalizeName('Condor - Pas taktyczny Rigger Belt - Czarny', 'Condor');
  const b = normalizeName('Pas Rigger Belt taktyczny, czarny', 'Condor');
  assert.equal(a, b);
  assert.equal(a, 'belt czarny pas rigger taktyczny');
  assert.equal(normalizeName('Śrut do wiatrówki 4,5 mm', ''), normalizeName('srut wiatrowki 4.5mm', ''));
});

test('nameKey: a different calibre or producer gives a different key', () => {
  assert.notEqual(nameKey('Śrut JSB Exact 4,5 mm', 'JSB'), nameKey('Śrut JSB Exact 5,5 mm', 'JSB'));
  assert.notEqual(nameKey('Pas Rigger Belt', 'Condor'), nameKey('Pas Rigger Belt', 'Helikon'));
});

test('nameIssues: entities, tags, mojibake, whitespace; a clean name has none', () => {
  assert.deepEqual(nameIssues('Kabura &quot;Glock&quot;'), ['html_entity']);
  assert.ok(nameIssues('Nóż <b>Gerber</b>').includes('html_tag'));
  assert.ok(nameIssues('NÃ³Å¼ Gerber').includes('mojibake'));
  assert.ok(nameIssues('Nóż  Gerber ').includes('whitespace'));
  assert.ok(nameIssues('LATARKA TAKTYCZNA MACTRONIC').includes('all_caps'));
  assert.deepEqual(nameIssues('Nóż Gerber StrongArm czarny'), []);
});

// ── duplicate candidates ─────────────────────────────────────────────────────

const item = (ref: string, supplier: CatalogueItem['supplier'], name: string, brand = 'Condor', ean = ''): CatalogueItem =>
  ({ ref, supplier, brand, name, ean });

test('duplicateCandidates (cross-supplier): same producer + normalized name at two suppliers → one group, EAN missing', () => {
  const groups = duplicateCandidates([
    item('1', 'sharg', 'Pas taktyczny Rigger Belt czarny'),
    item('2', 'spechurt', 'Condor - Pas Rigger Belt - Czarny - taktyczny', 'Condor', '022886426026'),
    item('3', 'kolba', 'Plecak Condor 3-Day Assault'),
  ], { crossSupplier: true });
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].items.map((i) => i.ref).sort(), ['1', '2']);
  assert.deepEqual(groups[0].suppliers, ['sharg', 'spechurt']);
  assert.equal(groups[0].ean, 'ean_missing');
});

test('duplicateCandidates: one record seen twice is not a duplicate; same-supplier groups only in within mode', () => {
  const same = [item('7', 'sharg', 'Pas Rigger Belt czarny'), item('7', 'sharg', 'Pas Rigger Belt czarny')];
  assert.equal(duplicateCandidates(same, { crossSupplier: false }).length, 0);
  const within = [item('1', 'sharg', 'Pas Rigger Belt czarny', 'Condor', '5905247629906'), item('2', 'sharg', 'Pas Rigger Belt czarny', 'Condor', '5905247620859')];
  assert.equal(duplicateCandidates(within, { crossSupplier: true }).length, 0);
  const g = duplicateCandidates(within, { crossSupplier: false });
  assert.equal(g.length, 1);
  assert.equal(g[0].ean, 'ean_differs');
});

test('duplicateCandidates: a short generic name does not group (needs 2 tokens, 3 without a producer)', () => {
  assert.equal(duplicateCandidates([item('1', 'sharg', 'Pas'), item('2', 'kolba', 'Pas')], { crossSupplier: true }).length, 0);
  assert.equal(duplicateCandidates([item('1', 'sharg', 'Pas czarny', ''), item('2', 'kolba', 'Pas czarny', '')], { crossSupplier: true }).length, 0);
});

// ── variants ─────────────────────────────────────────────────────────────────

test('extractVariantAttrs: calibre, magnification, size and dimension are recognised and removed from the base', () => {
  assert.deepEqual(extractVariantAttrs('Śrut Diabolo JSB Exact 4,5 mm 500 szt.', 'JSB'),
    { base: '500szt diabolo exact srut', attrs: [{ kind: 'kaliber', value: '4.5mm' }] });
  assert.deepEqual(extractVariantAttrs('Luneta Hawke Vantage 3-9x40 AO', 'Hawke').attrs, [{ kind: 'powiększenie', value: '3-9x40' }]);
  assert.deepEqual(extractVariantAttrs('Lornetka Delta 10x42', 'Delta').attrs, [{ kind: 'powiększenie', value: '10x42' }]);
  assert.deepEqual(extractVariantAttrs('Amunicja Sellier 9x19 FMJ', 'Sellier').attrs, [{ kind: 'kaliber', value: '9x19' }], '9x19 without optics is a calibre');
  assert.deepEqual(extractVariantAttrs('Spodnie Helikon SFU - Czarne - XL', 'Helikon').attrs, [{ kind: 'rozmiar', value: 'xl' }]);
  assert.deepEqual(extractVariantAttrs('Buty Haix rozmiar 42', 'Haix').attrs, [{ kind: 'rozmiar', value: '42' }]);
  assert.deepEqual(extractVariantAttrs('Montaż 30 mm na szynę', '').attrs, [{ kind: 'średnica/wymiar', value: '30mm' }]);
  assert.deepEqual(extractVariantAttrs('Naboje Fiocchi 12/70 Breneka', 'Fiocchi').attrs, [{ kind: 'kaliber', value: '12/70' }]);
});

const vItem = (ref: string, name: string, extra: Partial<VariantItem> = {}): VariantItem => ({
  ref, supplier: 'kolba', brand: 'JSB', name, ean: '', hydraNum: '11.3', permit: false, pickup: false, ...extra,
});

test('variantGroupCandidates: records differing only in calibre form one group', () => {
  const groups = variantGroupCandidates([
    vItem('1', 'Śrut Diabolo JSB Exact 4,5 mm 500 szt.'),
    vItem('2', 'Śrut Diabolo JSB Exact 5,5 mm 500 szt.'),
    vItem('3', 'Śrut Diabolo JSB Exact 6,35 mm 500 szt.'),
    vItem('4', 'Śrut Diabolo JSB Heavy 4,5 mm 500 szt.'),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].kind, 'kaliber');
  assert.deepEqual(groups[0].values, ['4.5mm', '5.5mm', '6.35mm']);
  assert.deepEqual(groups[0].items.map((i) => i.ref), ['1', '2', '3']);
  assert.equal(groups[0].mixedPermit, false);
});

test('variantGroupCandidates: two differing parameters, or none, is not a variant group', () => {
  assert.equal(variantGroupCandidates([
    vItem('1', 'Luneta X 3-9x40 30 mm', { brand: 'X' }),
    vItem('2', 'Luneta X 4-12x40 25 mm', { brand: 'X' }),
  ]).length, 0, 'magnification and tube diameter both differ');
  assert.equal(variantGroupCandidates([
    vItem('1', 'Śrut Diabolo JSB Exact 4,5 mm'),
    vItem('2', 'Śrut JSB Diabolo Exact 4.5mm'),
  ]).length, 0, 'same calibre — a duplicate candidate, not a variant group');
});

test('variantGroupCandidates: a group mixing the permit flag or pickup-only is flagged', () => {
  const [g] = variantGroupCandidates([
    vItem('1', 'Paralizator Scorpy 200 rozmiar M', { brand: 'ESP', hydraNum: '15.3', permit: true, pickup: true }),
    vItem('2', 'Paralizator Scorpy 200 rozmiar L', { brand: 'ESP', hydraNum: '15', permit: false, pickup: false }),
  ]);
  assert.ok(g);
  assert.equal(g.mixedPermit, true);
  assert.equal(g.mixedPickup, true);
  assert.deepEqual(g.categories, ['15', '15.3']);
});

// ── records ──────────────────────────────────────────────────────────────────

test('recordSuppliers: creator from the SKU prefix, members from the SKU parameters', () => {
  const r = recordSuppliers('SHARG-139', { 'SKU Sharg': '139', 'SKU Spechurt': '1091', 'Źródło opisu': 'Spechurt' });
  assert.equal(r.creator, 'sharg');
  assert.deepEqual(r.members, ['sharg', 'spechurt']);
  assert.deepEqual(r.codes, { sharg: '139', spechurt: '1091' });
  const bare = recordSuppliers('KD-001', {});
  assert.equal(bare.creator, null);
  assert.deepEqual(bare.members, []);
  assert.deepEqual(recordSuppliers('KOLBA-764-006', null).codes, { kolba: '764-006' }, 'code from the SKU when the parameter is missing');
});

// ── journal ──────────────────────────────────────────────────────────────────

test('parseJournalLine: END with result, duration and log; START; non-journal lines → null', () => {
  const e = parseJournalLine('2026-10-15 11:42:21+0200 sharg import pid=1618794 END exit=0 duration=3050s url-credentials=0 result="Import done: 2279 created, 5 updated, 0 errors, skipped: 0" log=/home/hydra-import/logs/sharg-import-20261015-105131.log');
  assert.ok(e);
  assert.equal(e.event, 'END');
  assert.equal(e.supplier, 'sharg');
  assert.equal(e.mode, 'import');
  assert.equal(e.exit, 0);
  assert.equal(e.durationS, 3050);
  assert.equal(e.result, 'Import done: 2279 created, 5 updated, 0 errors, skipped: 0');
  assert.equal(e.log, '/home/hydra-import/logs/sharg-import-20261015-105131.log');
  assert.equal(runVerdict(e), 'ok');
  assert.equal(parseJournalLine('2026-10-15 10:51:31+0200 sharg import pid=1 START catalogue=119068 commit=73a5832 limit=5400s log=x')?.event, 'START');
  assert.equal(parseJournalLine('random text'), null);
});

test('runVerdict: empty feed, product errors, failure, stop', () => {
  const v = (line: string) => runVerdict(parseJournalLine(line)!);
  assert.equal(v('2026-10-23 07:05:01+0200 spechurt import pid=1 END exit=1 duration=1810s url-credentials=0 result="[fatal] empty feed after 3 attempts" log=x'), 'empty_feed');
  assert.equal(v('2026-10-23 07:05:01+0200 spechurt import pid=1 END exit=0 duration=10s url-credentials=0 result="Import done: 1831 created, 122 updated, 2 errors, skipped: 0" log=x'), 'ok_with_errors');
  assert.equal(v('2026-10-23 07:05:01+0200 spechurt sync pid=1 END exit=124 duration=600s stopped-by=limit-600s url-credentials=0 result="none" log=x'), 'stopped');
  assert.equal(v('2026-10-23 07:05:01+0200 kolba sync pid=1 END exit=1 duration=3s url-credentials=0 result="none" log=x'), 'failed');
});

test('nightKey: the 22:20 Kolba, 01:15 Sharg and 06:35 Spechurt runs of one cron cycle share a night', () => {
  assert.equal(nightKey('2026-10-25 22:20:01'), '2026-10-25');
  assert.equal(nightKey('2026-10-26 01:15:01'), '2026-10-25');
  assert.equal(nightKey('2026-10-26 06:35:01'), '2026-10-25');
  assert.equal(nightKey('2026-10-26 22:20:01'), '2026-10-26');
});

test('summarizeRunLog: numbers only — downloads, parsed counts, empty-feed attempts, product errors', () => {
  const s = summarizeRunLog('Received 16.2 MB\nParsed 6160 products\n[warn] empty feed (empty body) — attempt 1/3, retrying in 600 s\n  ⚠ 22372 (Torba): BaseLinker error\n[baselinker] token blocked (rate limit) — retrying x in 60 s\n');
  assert.deepEqual(s, { receivedMb: [16.2], parsed: [6160], emptyFeedWarnings: 1, blockedWaits: 1, productErrors: 1 });
});

// ── output ───────────────────────────────────────────────────────────────────

test('redactSecrets: no credential or feed URL survives', () => {
  const out = redactSecrets('Fetching https://hurt.sharg.pl/edi/export-offer.php?client=1&token=abc failed; key=SECRET token=xyz');
  assert.ok(!/abc|SECRET|xyz|https?:/.test(out), out);
  assert.match(out, /key=<hidden> token=<hidden>/);
});

test('toCsv: quotes, newlines and formula prefixes are neutralised', () => {
  assert.equal(toCsv(['a', 'b'], [['x, y', '=SUM(1)'], ['line\nbreak', 5]]), 'a,b\n"x, y",\'=SUM(1)\nline break,5\n');
});

test('pickRows: at most N rows, round-robin across groups', () => {
  const rows = [...['a1', 'a2', 'a3', 'a4'], ...['b1', 'b2']];
  assert.deepEqual(pickRows(rows, 4, (r) => r[0]), ['a1', 'b1', 'a2', 'b2']);
  assert.equal(pickRows(rows, 50, (r) => r[0]).length, 6);
});

// ── the audit script reaches BaseLinker only through readonly.ts ─────────────

test('scripts/audit-import.ts: no BaseLinker client import, no blCall, only allowlisted read methods', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../scripts/audit-import.ts'), 'utf8');
  assert.ok(!/baselinker\/client/.test(src), 'must not import src/lib/baselinker/client');
  assert.ok(!/\bblCall\b|\bblReadOnlyCall\b/.test(src), 'must not call blCall / blReadOnlyCall directly');
  assert.match(src, /from '\.\.\/src\/lib\/baselinker\/readonly'/);
  // Every BaseLinker-API-shaped name (called or quoted): get/add/update/delete/set + BL object
  const BL_NAME = /\b(?:get|add|update|delete|set)(?:Inventory|Inventories|Order|Orders|Invoice|Journal|External|Courier|Package|Receipt|Series|Connect|Storage|Product|Products|Categor|Warehouse|Manufacturer|PriceGroup)\w*/g;
  const used = new Set([...src.matchAll(BL_NAME)].map((m) => m[0]));
  const allowed = new Set<string>(READ_ONLY_METHODS);
  const outside = [...used].filter((m) => !allowed.has(m));
  assert.deepEqual(outside, [], `BaseLinker methods outside the readonly.ts allowlist: ${outside.join(', ')}`);
  assert.ok(used.size > 0, 'the check found the read methods it should allow');
});

// ── F. Source of a data gap (HA-2.38, option C) ─────────────────────────────────

test('gapSource: weight in the feed, BL 0 — accepted by the filter → import; rejected by the filter → outside_filter', () => {
  type Item = { admitted: boolean; weightG: number | null };
  const noWeight = (i: Item) => !((i.weightG ?? 0) > 0);
  const accepted: Item[] = [{ admitted: true, weightG: 120 }];
  const outside: Item[] = [{ admitted: false, weightG: 120 }];
  assert.equal(gapSource(accepted, noWeight), 'import', 'the import writes this record and should have carried the weight');
  assert.equal(gapSource(outside, noWeight), 'outside_filter', 'the import never touches it — not an importer bug');
  assert.equal(gapSource([{ admitted: false, weightG: 120 }, { admitted: true, weightG: 80 }], noWeight), 'import', 'one accepted item is enough');
  assert.equal(gapSource([{ admitted: true, weightG: null }], noWeight), 'feed');
  assert.equal(gapSource([], noWeight), 'orphan');
  assert.equal(gapSource([{ admitted: false }]), 'outside_filter', 'a check without a feed counterpart');
});
