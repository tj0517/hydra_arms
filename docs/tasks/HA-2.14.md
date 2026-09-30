---
id: HA-2.14
title: Inwentaryzacja BaseLinkera (tylko odczyt)
status: todo
difficulty: S
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.13]
blocked_by_questions: [O-21]
touches_db: false
touches_prod: true
pr: null
---

## Cel
24.07 z serwera poszedł import Spechurtu na żywo do pustego katalogu 107789: 6 854 produkty, bez filtra P1 i z błędami tagów. Dziś nie wiemy, co jest w BaseLinkerze. Pierwszy import z filtrem z HA-2.04 i bramka „przed ukryciem produktów już obecnych w BL” wymagają tej wiedzy. Sukces: raport z liczbami, na podstawie którego tj zdecyduje, co zrobić z produktami spoza P1, które już są w BL.

## Zakres
- [ ] odczyt stanu: `src/lib/baselinker/client.ts`, `scripts/baselinker-sync.ts` (warunek `approved`), `xml-integration/assortment-rules.ts`, `assortment-filter.ts`
- [ ] tj uruchamia `npx tsx scripts/bl-verify-categories.ts` (plik) i na kopii z jednym zmienionym ID (red proof); jeśli skrypt padnie na kształcie odpowiedzi BL — poprawka w tym zadaniu
- [ ] skrypt tylko do odczytu (np. `scripts/bl-inventory-report.ts`) przez klienta, który udostępnia wyłącznie metody `get*`. Uruchamia tj
- [ ] liczby: produkty w katalogu; per magazyn (H1 Kolba, H2 Sharg, H3 Spechurt, Hydra); per tag (`auto`/`review`/`flag`/`approved`/`age_18`/brak); per dział Hydry (przez `hydra-categories.json`)
- [ ] ile produktów nie przeszłoby przez filtr z HA-2.04 (dział spoza P1, działy 01/02), z czego ile ma `approved` (czyli jest widocznych w sklepie)
- [ ] raport `docs/research/bl-inventory-2026-09.md`: same liczby, bez danych osobowych i tokenów

## Gotowe, gdy
- raport z liczbami w repo — **jak sprawdzić:** plik raportu + wklejony wynik skryptu (uruchomionego przez tj)
- skrypt nie może zapisać — **jak sprawdzić:** test: wywołanie metody zapisującej przez klienta tylko do odczytu rzuca błąd (red proof, `npm run test:unit`)
- liczba produktów spoza P1 z tagiem `approved` podana wprost — **jak sprawdzić:** osobna linia w raporcie
- zgodność `hydra-categories.json` z BaseLinkerem (przeniesione z HA-2.13) — **jak sprawdzić:** wklejony wynik `bl-verify-categories.ts` (tj): 0 rozjazdów albo ich lista; w nagłówku `BASELINKER_MOCK: false`, `Inventory ID : 107789`
- lista tagów importu obecnych i brakujących w BL (przeniesione z HA-2.13) — **jak sprawdzić:** w tym samym wyniku
- red proof `bl-verify-categories.ts` (przeniesione z HA-2.13): podmieniony ID w kopii → rozjazd i exit ≠ 0 — **jak sprawdzić:** wklejony wynik na zepsutej kopii

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
