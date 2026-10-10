---
id: HA-2.26
title: BL klienta — drzewo kategorii i tagi w katalogu 119068, odczyt ID konta
status: todo
difficulty: S
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.14]
blocked_by_questions: []
touches_db: false
touches_prod: true
pr: null
---

## Cel
Po HA-2.14 wiemy, że konto BL klienta nie ma nic z naszego importu, a O-33 dało nowy, pusty katalog „Hydra arms” (119068) z magazynami H1/H2/H3. Zanim HA-2.15 wgra produkty, katalog musi mieć drzewo kategorii Hydry (206 ID w `hydra-categories.json` są z sandboxa i nie istnieją na koncie klienta) oraz 5 tagów importu, a `.env.local` — prawdziwe ID grup cenowych, źródła zamówień i statusów z konta klienta zamiast sandboxowych. Sukces: `bl-verify-categories.ts --inventory=119068` → 0 rozjazdów i 5 tagów; `.env.local` kompletny; każdy zapis do BL wykonany przez tj z terminala.

## Zakres
- [ ] odczyt stanu: `scripts/bl-build-categories.ts` (tworzy tylko kategorie przez `addInventoryCategory`; tagów nie zakłada), `scripts/bl-verify-categories.ts` (po HA-2.14: `--inventory=`), `xml-integration/hydra-categories.json` (ID sandboxa), `xml-integration/hydra-category-tree.txt`, `.env.local.example` (lista zmiennych BL)
- [ ] `bl-build-categories.ts`: bierze katalog z `BASELINKER_INVENTORY_ID` (119068) i nadpisuje `hydra-categories.json` nowymi ID; dry-run nie do uruchomienia przez agenta (lista hooka) — dowód to test jednostkowy parsera drzewa na `hydra-category-tree.txt`; zapis uruchamia tj
- [ ] tagi importu `auto`/`review`/`flag`/`approved`/`age_18`: ustalić z dokumentacji BL (context7), czy API pozwala założyć tag bez produktu; jeśli tak — dopisać do `bl-build-categories.ts`; jeśli nie — zapisać w notatkach, że tagi powstają przy pierwszym imporcie, i przenieść kryterium o tagach do HA-2.15
- [ ] nowy skrypt tylko do odczytu `scripts/bl-account-ids.ts` przez `src/lib/baselinker/readonly.ts` (allowlista rozszerzona o `getInventoryPriceGroups`, `getOrderSources`, `getOrderStatusList` — konfiguracja konta, nie dane zamówień): wypisuje ID grup cenowych, źródeł zamówień i statusów z nazwami, w formacie linii do `.env.local`
- [ ] tj: uruchamia `bl-build-categories.ts` (bramka STOP: zapis do BL klienta), potem `bl-verify-categories.ts --inventory=119068` i `bl-account-ids.ts`; wkleja wyniki; wpisuje ID do `.env.local` (lokalnie i na `hydra-srv`)
- [ ] brakujące grupy cenowe / źródło „Sklep internetowy” / statusy zakłada tj ręcznie w panelu (lista z wyniku `bl-account-ids.ts`), potem ponowny odczyt

## Gotowe, gdy
- drzewo Hydry w katalogu 119068 — **jak sprawdzić:** wklejony wynik `npx tsx scripts/bl-verify-categories.ts --inventory=119068` (tj): `0 mismatch`, nagłówek `Inventory ID : 119068`, `BASELINKER_MOCK: false`; `hydra-categories.json` w diffie ma nowe ID (`grep -c 89265 xml-integration/hydra-categories.json` → 0)
- red proof verify (przeniesione z HA-2.13/2.14) — **jak sprawdzić:** kopia `hydra-categories.json` z jednym podmienionym ID → rozjazd i `exit=1` (wklejony wynik, tj)
- 5 tagów importu w katalogu 119068 albo udokumentowane, że API ich nie zakłada — **jak sprawdzić:** sekcja tagów tego samego wyniku verify: `Required tags MISSING (0)`; albo notatka z cytatem z dokumentacji BL i przeniesione kryterium w HA-2.15
- skrypt odczytu ID nie może zapisać — **jak sprawdzić:** `xml-integration/__tests__/bl-readonly-client.test.ts` rozszerzony o 3 nowe metody na allowliście i nadal rzuca na `getOrders`/`add*`; `npm run test:unit` zielony
- `.env.local` kompletny — **jak sprawdzić:** tj wkleja `grep -E '^BASELINKER_' .env.local | sed 's/=.*/=<set>/'`; każda zmienna z `.env.local.example` ustawiona (bez wartości)
- lista wywołań BL w raporcie — **jak sprawdzić:** sekcja raportu; żadnego `add*`/`update*` poza `addInventoryCategory` (i ewentualnie metodą tagów) uruchomionymi przez tj

## Poza zakresem
- import produktów → HA-2.15
- Sharg: nasz XML czy Base Connect „SHARG (Hurtownia)” → O-33 (pytanie do klienta), przed HA-2.15
- integracje hydra-arms.co… / HYDRA-ARMS (Allegro) na koncie → O-33 (pytanie do klienta)
- gałęzie ASG/łucznictwo/myślistwo → HA-2.24
- `bl-verify-categories.ts` nadal na surowym `blCall` → deferred (HA-2.14)

## Bramki STOP
- przed każdym zapisem do BL klienta (`bl-build-categories.ts`, tagi) — agent nie uruchamia; podaje komendę, uruchamia tj
- żadnego odczytu zamówień ani klientów; `getOrderSources`/`getOrderStatusList` to konfiguracja konta, nie dane zamówień
- `.env.local` edytuje wyłącznie tj

## Kontekst
- `docs/tasks/HA-2.14.md`, `docs/research/bl-inventory-2026-10.md` — stan konta klienta
- `docs/04-open-questions.md` O-33 — katalog 119068, magazyny bl_157483/4/5
- `scripts/bl-build-categories.ts`, `scripts/bl-verify-categories.ts`, `src/lib/baselinker/readonly.ts`
- `xml-integration/hydra-category-tree.txt`, `xml-integration/hydra-categories.json`

## Notatki z realizacji
- 2026-10-09 tj: katalog 119068 i magazyny bl_157483/4/5 założone ręcznie w panelu klienta; `.env.local` lokalnie ma już nowe ID katalogu i magazynów; grupy cenowe / źródło / statusy nadal sandboxowe.
