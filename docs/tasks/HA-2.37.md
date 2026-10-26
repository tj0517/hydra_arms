---
id: HA-2.37
title: Audyt importerów XML — raport tylko do odczytu (pokrycie, kategorie, pozwolenia, duplikaty, warianty, jakość, zdrowie importu)
status: review
difficulty: M
model: claude-opus-5-5
model_approved: null
effort: null
branch: feat/ha-2.37-import-audit
due: null
depends_on: [HA-2.15, HA-2.28, HA-2.33]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Przed rozmową z klientem twarde liczby: czy import Kolba / Sharg / Spechurt → BaseLinker (katalog 119068) robi to, co powinien, i gdzie są dziury w danych. Wynik to raport z liczbami i przykładami, nie poprawki. Bez zmian w imporcie, bez zapisów do BL i Supabase.

## Zakres
- [x] KROK 0: lista „jak import POWINIEN działać” (O1–O9) z README, SCHEMAS, PROBLEMY-feedow-xml, `bl-match-key.ts`, `import-tags.ts`, `permit-rules.ts`, `resolve-category.ts`, `assortment-filter.ts`, skryptu importu, `docs/ops/serwer-importu.md` i zadań HA-2.12/2.15/2.17/2.27/2.28/2.33 — wpisana na stałe w raport (sekcja 0)
- [x] `scripts/audit-import.ts`: BL tylko przez `src/lib/baselinker/readonly.ts`, feedy przez konektory importu, filtr, kategorie, tagi i klucz — te same funkcje co import; `--out <katalog>` → `raport.md` + CSV (≤ 50 wierszy na problem); bez tokenów, kluczy i adresów feedów; tryb `BASELINKER_MOCK=true`
- [x] sekcje A–G (pokrycie i stany/ceny, kategorie, pozwolenia, EAN/duplikaty, warianty, jakość danych, zdrowie importu z logów) + podsumowanie w 10 punktach
- [x] czyste funkcje w `xml-integration/import-audit.ts` + testy jednostkowe (normalizacja nazw, grupowanie duplikatów i wariantów, dziennik, redakcja, statyczny test allowlisty)
- [x] komendy dla tj: aktualizacja klonu, uruchomienie audytu jako `hydra-import`, skopiowanie wyniku na Maca — `docs/ops/serwer-importu.md`, sekcja „Audyt importu (HA-2.37)”

## Gotowe, gdy
- PR zmergowalny — **jak sprawdzić:** `npx tsc --noEmit`, `npm run test:unit`, eslint nowych plików
- smoke test w trybie mock przechodzi — **jak sprawdzić:** `BASELINKER_MOCK=true npx tsx scripts/audit-import.ts --out <dir> --from-file=…` → `exit=0`, `credential/URL patterns in output: 0`
- skrypt nie zawiera żadnego wywołania BL spoza allowlisty `readonly.ts` — **jak sprawdzić:** grep + test „scripts/audit-import.ts: no BaseLinker client import, no blCall, only allowlisted read methods” (z red proofem)
- komendy z KROKU 3 kompletne — **jak sprawdzić:** sekcja „Audyt importu (HA-2.37)” w `docs/ops/serwer-importu.md`

## Poza zakresem
- jakiekolwiek poprawki importu wynikające z audytu → osobne zadania po raporcie
- uruchomienie na serwerze — robi tj (STOP po PR)
- scalanie duplikatów, tworzenie wariantów — raport daje tylko listy kandydatów

## Bramki STOP
- STOP po PR — agent nie uruchamia niczego na serwerze i nie czyta żywego BL

## Kontekst
- `scripts/audit-import.ts`, `xml-integration/import-audit.ts`, `xml-integration/__tests__/import-audit.test.ts`
- `src/lib/baselinker/readonly.ts` — allowlista metod odczytu
- `scripts/server/run-bl.sh` — format dziennika (`START`/`END … result="…"`), z którego czyta sekcja G

## Notatki z realizacji
- 2026-10-26 agent: sesja WSL `/home/tj/hydra_arms`, `SUPABASE_TARGET=local`, hook `agent-guard.sh` załadowany; prompt nie miał preflightu `hydra_arms/web`. Gałąź `feat/ha-2.37-import-audit` z `origin/main` (`bae5fb3`). Model: Opus 5.5.
- 2026-10-26 agent: decyzje w kodzie (do oceny przy review):
  - audyt odmawia startu bez `BASELINKER_INVENTORY_ID` (import ma domyślne 35743 — żywy katalog „Kobold Defense”); w mocku 35743 z fixtures;
  - kategorie i status liście/rodzic liczone z `hydra-categories.json` (jak import), nie z drzewa `.txt` (jak dry-run);
  - BL czytany w całości: lista (strony po 1000) + `getInventoryProductsData` po 250 id, 700 ms między wywołaniami (jak import); indeks dopasowania budowany tą samą funkcją i w tej samej kolejności co `loadExistingProducts`;
  - „osierocony” = rekord z kodem hurtowni (prefiks SKU albo parametr `SKU …`), którego nie dopasował żaden produkt dzisiejszego feedu tej hurtowni i którego kodu nie ma w feedzie;
  - porównanie cen rozdziela rekordy jednej hurtowni i wspólne (cena wspólnego = ostatni sync, O-32); stan porównywany z magazynem hurtowni (`BASELINKER_WAREHOUSE_H1/2/3`);
  - kandydaci D i E liczeni na katalogu BL (to widzi klient), producent z dopasowanego produktu feedu (BL ma puste pole „Producent”);
  - F przypisuje każdy brak do źródła: feed (dopasowany produkt feedu ma ten sam brak) / import / brak w feedzie (rekord osierocony);
  - G: noc = czas wpisu minus 12 h (Kolba 22:20, Sharg 01:15, Spechurt 06:35 jednego cyklu mają jeden klucz); z logów uruchomień czytane są tylko liczby (`Received`, `Parsed`, `[warn] empty feed`, `  ⚠`, oczekiwania na limit BL);
  - werdykty w raporcie są automatyczne (progi opisane w sekcjach) — punkt wyjścia do rozmowy, nie ocena końcowa.
- 2026-10-26 agent: dowody lokalne — `npx tsc --noEmit` czysto; eslint nowych plików 0 problemów; `npm run test:unit` 265/267 (padają tylko 2 znane testy `prod-guard` w WSL, deferred HA-2.27); 21 nowych testów zielonych; red proofy: wstawione `'updateInventoryProductsStock'` w skrypt → test allowlisty pada; import `baselinker/client` → pada; `normalizeName` bez sortowania → 2 testy padają; `duplicateCandidates` bez sprawdzenia odrębnych rekordów → 1 test pada; po przywróceniu 21/21.
- 2026-10-26 agent: smoke test mock (`BASELINKER_MOCK=true`, próbki z `~/hydra-samples/`, sztuczny dziennik `run-bl` w scratchpadzie): `exit=0`, wywołania BL tylko `getInventories`, `getInventoryWarehouses`, `getInventoryPriceGroups`, `getInventoryCategories`, `getInventoryProductsList`, `getInventoryProductsData`; `credential/URL patterns in output: 0`. Sekcje A–F sprawdzone dodatkowo na syntetycznym katalogu (jednorazowa kopia skryptu poza repo z podstawionym odczytem BL): brakujący produkt, osierocony ze stanem i `approved`, rozjazd ceny i stanu, rekord w 00, duplikat EAN, rekord wspólny, kandydaci duplikatów i wariantów — każdy wykryty.
- 2026-10-26 agent: próbka Sharga (`sharg_full_sample.xml`) daje 0 produktów po filtrze obronnym konektora — w smoke teście Sharg jest „niedostępny: empty feed”, tak samo jak potraktowałby go import; logika Sharga (warianty z rozmiarów) sprawdzona tylko testami jednostkowymi, na żywym feedzie dopiero na serwerze.
