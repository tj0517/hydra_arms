---
id: HA-2.14
title: Inwentaryzacja BaseLinkera (tylko odczyt)
status: review
difficulty: S
model: claude-fable-5-1
model_approved: null
effort: low
branch: feat/ha-2.14-bl-inventory
due: null
depends_on: [HA-2.13]
blocked_by_questions: []
touches_db: false
touches_prod: true
pr: 36
---

## Cel
24.07 z serwera poszedł import Spechurtu na żywo do pustego katalogu 107789: 6 854 produkty, bez filtra P1 i z błędami tagów. Dziś nie wiemy, co jest w BaseLinkerze. Pierwszy import z filtrem z HA-2.04 i bramka „przed ukryciem produktów już obecnych w BL” wymagają tej wiedzy. Sukces: raport z liczbami, na podstawie którego tj zdecyduje, co zrobić z produktami spoza P1, które już są w BL.

## Zakres
- [x] tj weryfikuje login do konta BL klienta i wpisuje token API do `.env.local` (poza czatem i repo); agent nie loguje się do konta
- [x] odczyt stanu: `src/lib/baselinker/client.ts`, `scripts/baselinker-sync.ts` (warunek `approved`), `xml-integration/assortment-rules.ts`, `assortment-filter.ts`
- [x] tj uruchamia `npx tsx scripts/bl-verify-categories.ts` (plik; `--inventory=35743`); red proof na kopii nieweryfikowalny w tym stanie konta (0 kategorii Hydry) — zob. notatki 2026-10-09; poprawka skryptu (`--inventory`, sprawdzenie `getInventories`) w tym zadaniu
- [x] skrypt tylko do odczytu (`scripts/bl-inventory-report.ts`) przez klienta, który udostępnia wyłącznie metody `get*` (`src/lib/baselinker/readonly.ts`, test `bl-readonly-client.test.ts`). Uruchamia tj
- [x] liczby: produkty w katalogu; per magazyn (po id z produktów — H1/H2/H3 z env to sandbox; Hydra nieustawiony); per tag (`auto`/`review`/`flag`/`approved`/`age_18`/brak); per dział Hydry (przez `hydra-categories.json`)
- [x] ile produktów nie przeszłoby przez filtr z HA-2.04 (dział spoza P1, działy 01/02), z czego ile ma `approved` (czyli jest widocznych w sklepie) — 7 341 / 0 / 0
- [x] raport `docs/research/bl-inventory-2026-10.md` (nazwa wg tj 2026-10-09): same liczby, bez danych osobowych i tokenów

## Gotowe, gdy
- raport z liczbami w repo — **jak sprawdzić:** plik raportu + wklejony wynik skryptu (uruchomionego przez tj)
- skrypt nie może zapisać — **jak sprawdzić:** test: wywołanie metody zapisującej przez klienta tylko do odczytu rzuca błąd (red proof, `npm run test:unit`)
- liczba produktów spoza P1 z tagiem `approved` podana wprost — **jak sprawdzić:** osobna linia w raporcie
- zgodność `hydra-categories.json` z BaseLinkerem (przeniesione z HA-2.13) — **jak sprawdzić:** wklejony wynik `bl-verify-categories.ts` (tj): 0 rozjazdów albo ich lista; w nagłówku `BASELINKER_MOCK: false`, `Inventory ID : 35743` (107789 nie istnieje na koncie klienta; wynik: 206/206 ID brak w BL, 53 obce kategorie)
- lista tagów importu obecnych i brakujących w BL (przeniesione z HA-2.13) — **jak sprawdzić:** w tym samym wyniku
- ~~red proof `bl-verify-categories.ts` (przeniesione z HA-2.13): podmieniony ID w kopii → rozjazd i exit ≠ 0~~ — **nieweryfikowalne w tym stanie konta** (0 kategorii Hydry: 206/206 ID i tak brak, podmieniony ID nie zmienia wyniku); zastąpione ustaleniem „0 kategorii Hydry na koncie” (tj 2026-10-09), dowód: run verify 35743 w raporcie

## Poza zakresem
- usuwanie, ukrywanie albo przetagowanie produktów → decyzja tj po raporcie (nowe pytanie lub zadanie)
- kategoryzacja Kolby → HA-2.12
- import na żywo → HA-2.15

## Bramki STOP
- żadnego wywołania zapisującego BaseLinker; lista wywołań w raporcie
- żadnego odczytu danych zamówień ani klientów, tylko katalog produktów

## Kontekst
- `docs/tasks/HA-2.04.md`, `docs/tasks/HA-2.13.md`
- `src/lib/baselinker/client.ts`, `scripts/baselinker-sync.ts`

## Notatki z realizacji
- 2026-09-25 tj: log importu z 24.07 na serwerze: katalog 107789, magazyn Spechurtu `bl_148604`, 0 produktów w BL przed importem.
- 2026-09-25 tj: konto BaseLinker zablokowane (`ERROR_USER_ACCOUNT_BLOCKED`); zadanie czeka na odblokowanie. Przejęło weryfikację na żywo z HA-2.13.
- 2026-09-26 tj: obecny BaseLinker to sandbox tj, nie konto klienta — inwentaryzacja sandboxa nie daje wiedzy potrzebnej przed importem z filtrem. Zadanie odłożone do dostępu do BL klienta (O-21).
- 2026-10-06 tj: dostęp do BL klienta otrzymany (login); hasła i tokena jeszcze nie sprawdzono. Zadanie startuje po wpisaniu tokena do `.env.local`.
- 2026-10-09 claude: odczyt stanu — `client.ts`: metody zapisujące to `addInventoryProduct`, `updateInventoryProductsStock`, `updateInventoryProductsPrices`, `addOrder`; `scripts/baselinker-sync.ts`: `is_active = tags.includes('approved')`, stan = suma po wszystkich magazynach (zmienne `BASELINKER_WAREHOUSE_*` nie są w syncu używane; mapowanie H1/H2/H3 ↔ hurtownia jest w `xml-to-baselinker.ts`). W `.env.local` są H1/H2/H3; `BASELINKER_WAREHOUSE_HYDRA` nieustawione — raport mówi to wprost.
- 2026-10-09 claude: filtr P1 liczony przez `effectiveAllowedHydraNums(ASSORTMENT_RULES)` (stan po HA-2.25/HA-2.18: 75 węzłów, w tym 1.3/1.4/1.5/2.5/2.6 z działów 01/02 — prompt zadania mówił „01/02 wykluczone do O-11”, to już nieaktualne). Raport podaje osobno produkty spoza P1 w działach 01/02. Tylko kryterium kategorii; stan/cena nieliczone (podano liczbę produktów ze stanem 0 wszędzie jako informację).
- 2026-10-09 claude: klient tylko do odczytu = zamknięta lista 7 metod `getInventor*` sprawdzana przed `blCall` (także przed mockiem i tokenem); `getOrders`/`getOrderStatusList` celowo poza listą (bramka STOP: żadnych zamówień). Red proof: `bl-readonly-client.test.ts` (20 przypadków), pełna suita 140/140.
- 2026-10-09 claude: O-21 oznaczone jako rozstrzygnięte w `docs/04-open-questions.md` (wiersz sprzed edycji zacytowany w raporcie PR). Plik `docs/research/bl-inventory-2026-10.md` powstaje dopiero z wklejonego wyniku tj.
- 2026-10-09 tj: live run na tokenie klienta — katalog 107789 NIE istnieje na koncie klienta (`ERROR_STORAGE_ID`); widocznych 6 katalogów, 7 magazynów (bl_45657 Domyślny, warehouse_5007832 SHARG, blconnect_6820 Kobold Defense, bl_57196 Sharg, blconnect_6971 MILICON, bl_58093 Własny, bl_76925 042025), żadnego bl_148602/3/4, 0 tagów. Identyfikatory w `.env.local` są z sandboxa tj; import z 24.07 nigdy nie trafił na konto klienta. Etap kodu (klient read-only, red proof, skrypt) odebrany bez zmian.
- 2026-10-09 tj — decyzja: inwentaryzacja wszystkich 6 katalogów. Skrypt listuje katalogi (id, nazwa, liczba produktów), nie kończy się gdy `BASELINKER_INVENTORY_ID` nie istnieje, iteruje po wszystkich; magazyny po id widocznych na produktach z nazwami z `getInventoryWarehouses` (mapowanie env H1/H2/H3 nieużywane — sandbox); `bl-verify-categories.ts` przyjmuje `--inventory=<id>` i sprawdza istnienie katalogu przez `getInventories` zamiast padać na `ERROR_STORAGE_ID`. `.env.local` nietknięte; HA-2.15 nietknięte; O-21 tylko nota datowana.
- 2026-10-09 claude: `docs/research/bl-inventory-2026-10.md` założony z sekcją „Finding: 107789 and bl_148602/3/4 are not in the client's account”; sekcje z liczbami czekają na wklejone wyniki runu 2.
- 2026-10-09 tj: run 2 (wszystkie katalogi) i verify 35743 wklejone do `docs/research/bl-inventory-2026-10.md`. Wynik: 6 katalogów, 7 341 produktów, 0 tagów, 0 kategorii Hydry, 0 z `approved`; dwa obce żywe stany — Kobold Defense 4 741 (1 738 ze stanem) i MILICON 2 591 (1 454 ze stanem); katalog 35743 ma własne drzewo 53 kategorii (akcesoria do broni palnej) z innego kanału. Pytanie zadania (produkty spoza P1 już w BL): brak. Decyzja: kryterium red proof `bl-verify-categories.ts` nieweryfikowalne w tym stanie konta, zastąpione ustaleniem „0 kategorii Hydry”; jeden run verify (35743) jako dowód. Następna decyzja: O-33 (katalog i magazyny docelowe; dopisane do `blocked_by_questions` HA-2.15).
