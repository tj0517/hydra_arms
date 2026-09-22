---
id: HA-1.05
title: Bezpiecznik prod w skryptach i testach
status: done
difficulty: M
model: claude-sonnet-4-6
model_approved: null
effort: medium
branch: chore/ha-1.05-prod-guard
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 5
---

## Cel
Testy Playwright i skrypty w `scripts/` czytają `.env.local`, czyli pracują na bazie prod. Hook z HA-1.04 chroni tylko przed agentem, a tj uruchamiający skrypt ręcznie nie ma żadnej ochrony. Sukces: każdy piszący skrypt i każdy test sam odmawia pracy, gdy adres bazy wskazuje prod, chyba że ktoś świadomie to zezwoli.

## Zakres
- [ ] odczyt stanu bieżącego: które skrypty piszą (jak w HA-1.04), jak `playwright.config.ts` i `tests/shop/fixtures.ts` dostają env, czy któryś test zapisuje (checkout, zamówienia)
- [ ] wspólny moduł `scripts/lib/prodGuard.ts` (albo `src/lib/env/prodGuard.ts`): `assertNotProd()` przepuszcza tylko bazę pod `127.0.0.1`/`localhost` (lista dozwolonych, jak w FA); każdy inny adres, w tym prod `breqmmlcaxsvxcqlcmqc`, przepuszcza wyłącznie przy `HA_ALLOW_PROD=1`, z wyraźnym ostrzeżeniem
- [ ] wywołanie guarda na początku każdego piszącego skryptu
- [ ] guard w `playwright.config.ts` (globalSetup): testy odmawiają startu na prod
- [ ] `.env.local.example`: opis `HA_ALLOW_PROD`

## Gotowe, gdy
- red proof: `npx tsx scripts/reset-shop-db.ts` z `.env.local` wskazującym prod kończy się błędem guarda **przed** połączeniem z bazą — **jak sprawdzić:** uruchomienie z podmienionym `SUPABASE_SERVICE_ROLE_KEY=invalid` (żeby nawet przy błędzie guarda nic nie zapisało) i wklejony komunikat
- red proof: `npx playwright test` na prod kończy się błędem globalSetup — **jak sprawdzić:** wklejony komunikat (uruchamia tj albo agent za zgodą; test nie dochodzi do przeglądarki)
- każdy piszący skrypt importuje guard — **jak sprawdzić:** `grep -L assertNotProd` na liście piszących skryptów zwraca pusto
- guard ma test jednostkowy (URL prod → błąd, dowolny inny zdalny URL → błąd, localhost/127.0.0.1 → OK, prod + `HA_ALLOW_PROD=1` → OK z ostrzeżeniem) — **jak sprawdzić:** wklejony wynik testu

## Poza zakresem
- hook agenta → HA-1.04
- przełączenie testów na lokalną bazę → HA-1.06
- testy w CI → HA-1.08

## Bramki STOP
- red proof robisz wyłącznie z nieprawidłowym kluczem service role albo bez niego; nigdy z prawdziwym kluczem prod
- nie uruchamiaj testów ani buildów na komputerze tj bez pytania

## Kontekst
- `scripts/reset-shop-db.ts` — przykład piszącego skryptu
- `playwright.config.ts`, `tests/shop/fixtures.ts`, `tests/shop/MANUAL_TESTS.md`
- stała reguła: `.env.local` wskazuje bazę prod; nie uruchamiaj piszących `scripts/*.ts` ani checkoutu w Playwright bez wyraźnej zgody

## Notatki z realizacji

- 2026-09-22 · decyzja tj: `scripts/lib/prodGuard.ts` (nie `src/lib/env/`); wszystkie 14 piszących skryptów chronione; guard uruchamiany w playwright.config.ts przy ewaluacji konfiguracji (nie w globalSetup)
- 2026-09-22 · decyzja tj: skrypty piszące do BaseLinker/Sanity używają `assertExternalProd()` (zawsze wymaga HA_ALLOW_PROD=1); skrypty piszące do Supabase używają `assertNotProd()` (localhost/127.0.0.1 przechodzi, reszta wymaga HA_ALLOW_PROD=1); skrypty piszące do obydwu (baselinker-sync.ts, supabase-to-baselinker.ts) wywołują oba guardy
- 2026-09-22 tj: review — przyjęte; red proofs uruchomione ręcznie przez tj (test 9/9, reset-shop-db, xml-to-baselinker, playwright — wszystkie zatrzymane przez guard przed połączeniem)
