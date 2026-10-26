/**
 * EAN normalization report (HA-2.38) — READ-ONLY. The dry-run tj sees before the first server run
 * with normalizeEan (xml-integration/bl-match-key.ts). Writes ean-raport.md + CSV into --out:
 *
 *   A. pairs to merge — BL records that share one GTIN-14 key: how many, which record stays first
 *      in the index (it keeps receiving EAN matches), which ones only differ by leading zeros.
 *      Nothing is merged — that is tj's decision.
 *   B. EAN the next import would write — per supplier, matched records whose BL `ean` differs from
 *      eanForUpsert(feed EAN, BL EAN): zero added, EAN changed, EAN filled, invalid feed EAN.
 *      Upper bound: the import writes only products admitted by the assortment filter.
 *   D. intra-feed collisions — items of ONE supplier sharing a GTIN-14 key (they land on one record;
 *      the last one in feed order writes price and stock). Also: BL EANs failing the check digit.
 *   C. matches — every feed product, key before HA-2.38 (EAN text as is; Sharg's EAN without its
 *      leading zeros, as the old parser read it) vs now: unchanged, new hit (and whether another
 *      supplier created that record), lost, moved to another record.
 *
 * Usage:
 *   npx tsx scripts/ean-report.ts --out <dir> [--suppliers=kolba,sharg,spechurt] [--from-file=<connector>:<path>]…
 *
 *   Smoke test without network or BaseLinker:
 *   BASELINKER_MOCK=true BASELINKER_INVENTORY_ID=35743 npx tsx scripts/ean-report.ts --out <dir> \
 *     --suppliers=sharg --from-file=sharg:<file>
 *
 * Read-only by construction: BaseLinker only through src/lib/baselinker/readonly.ts
 * (getInventoryProductsList). Output passes redactSecrets and is scanned for credentials at the end.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const mockFlagFromShell = process.env.BASELINKER_MOCK;
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true, quiet: true });
if (mockFlagFromShell !== undefined) process.env.BASELINKER_MOCK = mockFlagFromShell;

import {
  SKU_PREFIX,
  SUPPLIERS,
  SUPPLIER_LABEL,
  addToMatchIndex,
  blSku,
  eanForUpsert,
  eanKey,
  emptyMatchIndex,
  findBLMatch,
  normalizeEan,
  type Supplier,
} from '../xml-integration/bl-match-key';
import { classifyFeed } from '../xml-integration/feed-guard';
import { pickRows, redactSecrets, toCsv } from '../xml-integration/import-audit';
import { getInventoryProductsList } from '../src/lib/baselinker/readonly';

const RATE_LIMIT_MS = 700;
const MAX_CSV_ROWS = 500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (n: number) => n.toLocaleString('pl-PL');

function fail(message: string): never {
  console.error(`[error] ${redactSecrets(message)}`);
  process.exit(1);
}
const log = (m: string) => console.log(redactSecrets(m));
const isSupplier = (s: string): s is Supplier => (SUPPLIERS as readonly string[]).includes(s);

interface Listed { id: number; ean: string; sku: string; name: string; pos: number }
interface Slim { id: string; sku: string; ean: string; oldEan: string; name: string; purchase: number | null }

/** The key as it was before HA-2.38 (bl-match-key.ts at HA-2.28): EAN text as is, first wins. */
function oldIndex(listed: readonly Listed[]) {
  const byEan = new Map<string, number>();
  const bySku = new Map<string, number>();
  for (const l of listed) {
    const e = l.ean.trim();
    const s = l.sku.trim();
    if (e && !byEan.has(e)) byEan.set(e, l.id);
    if (s && !bySku.has(s)) bySku.set(s, l.id);
  }
  return (supplier: Supplier, ean: string, sku: string): number | undefined => {
    const e = ean.trim();
    if (e && byEan.has(e)) return byEan.get(e);
    const s = blSku(supplier, sku);
    return s ? bySku.get(s) : undefined;
  };
}

const creatorOf = (sku: string): Supplier | null => SUPPLIERS.find((s) => sku.startsWith(`${SKU_PREFIX[s]}-`)) ?? null;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let out: string | null = null;
  let suppliers: Supplier[] = [...SUPPLIERS];
  const fromFile = new Map<Supplier, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out = argv[++i] ?? null;
    else if (a.startsWith('--out=')) out = a.slice(6);
    else if (a.startsWith('--suppliers=')) {
      const list = a.slice(12).split(',').map((s) => s.trim()).filter(Boolean);
      if (!list.length || !list.every(isSupplier)) fail('--suppliers=kolba,sharg,spechurt');
      suppliers = list as Supplier[];
    } else if (a.startsWith('--from-file=')) {
      const raw = a.slice(12);
      const sep = raw.indexOf(':');
      const name = raw.slice(0, Math.max(sep, 0));
      if (!isSupplier(name) || !fs.existsSync(raw.slice(sep + 1))) fail('--from-file=<kolba|sharg|spechurt>:<existing path>');
      fromFile.set(name, raw.slice(sep + 1));
    } else fail(`unknown argument: ${a}`);
  }
  if (!out) fail('--out <dir> is required');
  const inventoryId = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '', 10);
  if (isNaN(inventoryId)) fail('BASELINKER_INVENTORY_ID must be set (the import catalogue, 119068 on the server)');
  log(`EAN normalization report (HA-2.38) — read-only${process.env.BASELINKER_MOCK === 'true' ? ' [BASELINKER_MOCK=true]' : ''}`);

  // BL list, in the order loadExistingProducts reads it (the index is first-wins)
  const listed: Listed[] = [];
  let listCalls = 0;
  for (let page = 1; ; page++) {
    const products = await getInventoryProductsList(inventoryId, page);
    listCalls++;
    const entries = Object.entries(products);
    for (const [id, p] of entries) listed.push({ id: Number(id), ean: String(p.ean ?? '').trim(), sku: String(p.sku ?? ''), name: String(p.name ?? ''), pos: listed.length });
    await sleep(RATE_LIMIT_MS);
    if (entries.length < 1000) break;
  }
  log(`  BL: ${listed.length} products`);
  const byId = new Map(listed.map((l) => [l.id, l]));
  const index = emptyMatchIndex();
  for (const l of listed) addToMatchIndex(index, l.id, l.ean, l.sku);
  const oldFind = oldIndex(listed);

  const md: string[] = [`# Normalizacja EAN — raport przed pierwszym przebiegiem (HA-2.38)`, '', `- wykonano: ${new Date().toISOString()} (UTC), katalog ${inventoryId}, produktów w BL: ${fmt(listed.length)}, tylko odczyt (getInventoryProductsList ×${listCalls})`, ''];
  const csv: Array<{ file: string; headers: string[]; rows: unknown[][] }> = [];

  // ── A. Pairs to merge ──
  const groups = new Map<string, Listed[]>();
  const blShapes: Record<string, number> = {};
  for (const l of listed) {
    const c = normalizeEan(l.ean);
    const shape = c.kind === 'ok' ? (c.write === l.ean ? 'poprawny, zapis bez zmian' : 'poprawny, inny zapis (zera)') : c.kind === 'empty' ? 'pusty' : `niepoprawny (${c.reason})`;
    blShapes[shape] = (blShapes[shape] ?? 0) + 1;
    if (c.kind === 'ok') groups.set(c.key, [...(groups.get(c.key) ?? []), l]);
  }
  const multi = [...groups.entries()].filter(([, v]) => v.length > 1);
  const zerosOnly = multi.filter(([, v]) => new Set(v.map((l) => l.ean)).size > 1);
  md.push('## A. Rekordy BL z tym samym kluczem GTIN-14 (kandydaci do scalenia — nic nie scalono)', '');
  md.push(`- grup: **${fmt(multi.length)}**, rekordów w nich: **${fmt(multi.reduce((a, [, v]) => a + v.length, 0))}**`);
  md.push(`- z nich różniące się tylko zerami wiodącymi (dotąd osobne klucze — nowe przez HA-2.38): **${fmt(zerosOnly.length)}** grup; ten sam tekst EAN (już dziś zdublowane): ${fmt(multi.length - zerosOnly.length)}`);
  md.push(`- w każdej grupie pierwszy rekord w kolejności listy BL zostaje w indeksie i dostaje dopasowania po EAN; pozostałe dostają tylko dopasowania po SKU swojej hurtowni`);
  md.push(`- EAN w BL: ${Object.entries(blShapes).map(([k, v]) => `${k} ${fmt(v)}`).join(', ')}`, '');
  // D1 (tj 2026-10-26): records whose current EAN fails the check digit — not indexed by EAN any more
  const badCheck = listed.filter((l) => { const c = normalizeEan(l.ean); return c.kind === 'invalid' && c.reason === 'check digit'; });
  md.push(`### EAN w BL ze złą cyfrą kontrolną: **${fmt(badCheck.length)}**`, '');
  md.push('Od HA-2.38 taki EAN nie łączy hurtowni (rekord dostaje dopasowania tylko po SKU), a import go nie nadpisze, dopóki feed nie ma poprawnego EAN.', '');
  if (badCheck.length) {
    md.push('| bl_id | hurtownia (prefiks SKU) | sku | ean |', '| --- | --- | --- | --- |');
    for (const l of badCheck.slice(0, 10)) md.push(`| ${l.id} | ${creatorOf(l.sku) ? SUPPLIER_LABEL[creatorOf(l.sku)!] : 'inne'} | ${l.sku} | ${l.ean} |`);
    md.push('');
  }
  csv.push({
    file: 'A_ten_sam_GTIN14_w_BL.csv',
    headers: ['grupa', 'gtin14', 'bl_id', 'sku', 'ean_BL', 'nazwa', 'zostaje_w_indeksie', 'roznica_tylko_zera'],
    rows: pickRows(multi.flatMap(([k, v], n) => v.map((l, j) => ({ n, k, l, first: j === 0, zeros: new Set(v.map((x) => x.ean)).size > 1 }))), MAX_CSV_ROWS, () => 'all')
      .map((x) => [x.n + 1, x.k, x.l.id, x.l.sku, x.l.ean, x.l.name, x.first ? 'tak' : 'nie', x.zeros ? 'tak' : 'nie']),
  });

  // ── B + C per supplier ──
  const bRows: Array<Array<string | number>> = [];
  const dRows: Array<Array<string | number>> = [];
  const dCsv: unknown[][] = [];
  const cRows: Array<Array<string | number>> = [];
  const bCsv: unknown[][] = [];
  const cCsv: unknown[][] = [];
  const { connectors } = await import('../xml-integration/connectors');
  for (const s of suppliers) {
    const file = fromFile.get(s);
    log(`\n─── ${s.toUpperCase()} — feed ${file ? 'from file' : 'download'} ───`);
    let xml: string;
    if (file) xml = fs.readFileSync(file, 'utf8');
    else {
      const res = await fetch(connectors[s].config.xml_url);
      if (!res.ok) { log(`  [warn] download failed: HTTP ${res.status}`); bRows.push([SUPPLIER_LABEL[s], 'feed niedostępny', '', '', '', '', '']); continue; }
      xml = await res.text();
    }
    const origLog = console.log;
    console.log = () => {};
    let slim: Slim[];
    try {
      slim = connectors[s].parse(xml).map((p) => {
        const ean = (p.ean ?? '').trim();
        // Sharg before HA-2.38: code_producer parsed as a number — the leading zeros were gone
        const oldEan = s === 'sharg' && /^\d+$/.test(ean) ? ean.replace(/^0+(?=\d)/, '') : ean;
        return { id: p.connector_product_id, sku: (p.connector_sku ?? '').trim(), ean, oldEan, name: p.name, purchase: p.price_purchase };
      });
    } finally {
      console.log = origLog;
    }
    if (classifyFeed(xml, slim.length) !== 'ok') { log('  [warn] empty feed'); bRows.push([SUPPLIER_LABEL[s], 'pusty feed', '', '', '', '', '']); continue; }
    xml = '';
    log(`  ${slim.length} products`);

    const b = { zeros: 0, changed: 0, filled: 0, keptInvalidFeed: 0, same: 0 };
    const c = { same: 0, newHit: 0, newHitForeign: 0, lost: 0, moved: 0, none: 0 };
    let invalid = 0;
    for (const p of slim) {
      if (normalizeEan(p.ean).kind === 'invalid') invalid++;
      const before = oldFind(s, p.oldEan, p.sku);
      const after = findBLMatch(index, s, p.ean, p.sku);
      const kind = before === undefined && after === undefined ? 'none'
        : before === after?.id ? 'same'
        : before === undefined ? 'newHit'
        : after === undefined ? 'lost' : 'moved';
      c[kind as keyof typeof c]++;
      const target = after ? byId.get(after.id) : undefined;
      const foreign = kind === 'newHit' && target !== undefined && creatorOf(target.sku) !== s;
      if (foreign) c.newHitForeign++;
      if (kind !== 'same' && kind !== 'none') {
        cCsv.push([s, p.sku, p.ean, p.oldEan, before ?? '', after?.id ?? '', after?.via ?? '', target?.sku ?? '', foreign ? 'tak' : 'nie', kind, p.name]);
      }
      if (!target) continue;
      const write = eanForUpsert(p.ean, target.ean);
      if (write === target.ean) { b.same++; continue; }
      const kindB = normalizeEan(p.ean).kind === 'invalid' ? 'keptInvalidFeed'
        : !target.ean ? 'filled'
        : eanKey(target.ean) === eanKey(write) ? 'zeros' : 'changed';
      b[kindB as keyof typeof b]++;
      bCsv.push([s, target.id, target.sku, target.ean, write, kindB === 'zeros' ? 'dopisane zera' : kindB === 'filled' ? 'z pustego' : kindB === 'changed' ? 'inny EAN' : 'EAN feedu niepoprawny — BL bez zmian', p.sku]);
    }
    bRows.push([SUPPLIER_LABEL[s], slim.length, b.zeros, b.changed, b.filled, b.same, invalid]);

    // D. Same GTIN-14 twice or more inside one feed: these items land on one BL record and the
    // last one in feed order writes its price and stock there
    const byKey = new Map<string, Array<{ pos: number; p: Slim }>>();
    slim.forEach((p, pos) => { const k = eanKey(p.ean); if (k) byKey.set(k, [...(byKey.get(k) ?? []), { pos, p }]); });
    const coll = [...byKey.entries()].filter(([, v]) => v.length > 1);
    const zerosOnly = coll.filter(([, v]) => new Set(v.map((x) => x.p.ean)).size > 1).length;
    const priceDiff = coll.filter(([, v]) => new Set(v.map((x) => x.p.purchase)).size > 1).length;
    dRows.push([SUPPLIER_LABEL[s], coll.length, coll.reduce((a, [, v]) => a + v.length, 0), zerosOnly, priceDiff]);
    for (const [k, v] of coll) {
      v.forEach((x, j) => dCsv.push([s, k, x.p.id, x.p.sku, x.p.ean, x.p.purchase ?? '', x.pos, j === v.length - 1 ? 'tak' : 'nie', new Set(v.map((y) => y.p.purchase)).size > 1 ? 'tak' : 'nie', x.p.name]));
    }
    cRows.push([SUPPLIER_LABEL[s], c.same, c.newHit, c.newHitForeign, c.lost, c.moved, c.none]);
  }

  const table = (h: string[], rows: Array<Array<string | number>>) => [`| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map((v) => (typeof v === 'number' ? fmt(v) : String(v).replace(/\|/g, '\\|'))).join(' | ')} |`)];
  md.push('## B. EAN, który następny import zapisze w BL (górna granica — import pisze tylko przyjęte przez filtr)', '');
  md.push(...table(['Hurtownia', 'Produkty w feedzie', 'Dopisane zera (ten sam klucz)', 'Inny EAN', 'Z pustego', 'Bez zmian', 'EAN niepoprawny w feedzie (dopasowanie tylko po SKU, BL zachowuje swój EAN)'], bRows), '');
  md.push('## C. Dopasowania: klucz sprzed HA-2.38 → po normalizacji', '');
  md.push(...table(['Hurtownia', 'Bez zmian', 'Nowe trafienie', 'w tym w rekord innej hurtowni', 'Utracone', 'Przeniesione do innego rekordu', 'Bez dopasowania przed i po'], cRows), '');
  md.push('Nowe trafienie w rekord innej hurtowni = ten sam towar, który dotąd tworzył osobny rekord (zera wiodące); od teraz import zaktualizuje rekord wspólny. Utracone / przeniesione = EAN niepoprawny (teraz brak EAN) albo grupa z sekcji A.', '');
  csv.push({ file: 'B_zmiana_EAN_w_BL.csv', headers: ['hurtownia', 'bl_id', 'sku_BL', 'ean_BL', 'ean_po_imporcie', 'rodzaj', 'sku_feed'], rows: pickRows(bCsv, MAX_CSV_ROWS, (r) => `${r[0]}/${r[5]}`) });
  csv.push({ file: 'C_zmiana_dopasowania.csv', headers: ['hurtownia', 'sku_feed', 'ean_feed', 'ean_przed', 'bl_id_przed', 'bl_id_po', 'przez', 'sku_BL_po', 'rekord_innej_hurtowni', 'rodzaj', 'nazwa'], rows: pickRows(cCsv, MAX_CSV_ROWS, (r) => `${r[0]}/${r[9]}`) });

  md.push('## D. Ten sam GTIN-14 kilka razy w jednym feedzie (kolizje w obrębie hurtowni)', '');
  md.push(...table(['Hurtownia', 'Klucze z ≥ 2 pozycjami', 'Pozycji w nich', 'w tym różniące się tylko zerami (nowe przez HA-2.38)', 'z różną ceną zakupu'], dRows), '');
  md.push('Te pozycje trafiają w jeden rekord BL — cenę i stan zapisuje ostatnia w kolejności feedu (kolumna `ostatnia` w CSV). Dotyczy punktu 1 (ceny) — tu tylko liczba.', '');
  csv.push({ file: 'D_kolizje_GTIN14_w_feedzie.csv', headers: ['hurtownia', 'gtin14', 'id_feed', 'sku_feed', 'ean_feed', 'cena_zakupu', 'pozycja_w_feedzie', 'ostatnia', 'rozne_ceny_w_grupie', 'nazwa'], rows: pickRows(dCsv, MAX_CSV_ROWS, (r) => String(r[0])) });

  fs.mkdirSync(out, { recursive: true, mode: 0o700 });
  const written: string[] = [];
  const write = (name: string, content: string) => {
    const f = path.join(out!, name);
    fs.writeFileSync(f, redactSecrets(content), { mode: 0o600 });
    written.push(f);
  };
  write('ean-raport.md', md.join('\n') + '\n');
  for (const c of csv) if (c.rows.length) write(c.file, toCsv(c.headers, c.rows));
  let leaks = 0;
  for (const f of written) leaks += (fs.readFileSync(f, 'utf8').match(/\b(key|token|client)=(?!<hidden>)|https?:\/\//gi) ?? []).length;
  log(`\nsame GTIN-14 in BL: ${multi.length} groups (${zerosOnly.length} differ only by leading zeros)`);
  log(`Written ${written.length} files to ${out}`);
  log(`credential/URL patterns in output: ${leaks}`);
  if (leaks > 0) fail('output contains credential-like text — delete the directory and report this');
}

main().catch((err) => {
  console.error('\n[fatal]', redactSecrets(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
