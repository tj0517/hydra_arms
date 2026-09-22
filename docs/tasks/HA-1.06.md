---
id: HA-1.06
title: Lokalny stack Supabase z seedem; testy na lokalnej bazie
status: todo
difficulty: L
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-1.01, HA-1.05]
blocked_by_questions: []
touches_db: true
touches_prod: false
pr: null
---

## Cel
Dziś jedyną bazą jest prod, więc każdy test, każda próba migracji i każdy eksperyment dzieje się na żywych danych. Sukces: jednym poleceniem stawiasz lokalną bazę z migracjami 001–00N i przykładowymi produktami, aplikacja i testy sklepu działają na niej, a migracje da się sprawdzić, zanim trafią na prod.

## Zakres
- [ ] odczyt stanu bieżącego: `docker ps` (czy nie chodzi stack FA/DCS), wersja Supabase CLI, baseline z HA-1.01
- [ ] `supabase init` → `supabase/config.toml` (bez sekretów); start odchudzony jak w FA: `supabase start -x studio,imgproxy,mailpit,logflare,vector,edge-runtime,realtime,storage-api,postgres-meta` (Mac 8 GB)
- [ ] `supabase/seed.sql`: kategorie i ok. 20–50 produktów z fikstur BL (`src/lib/baselinker/fixtures/`), wszystkie trzy `product_type`, oba magazyny; bez prawdziwych danych klientów
- [ ] `.env.development.local.example` (albo `.env.test`) z adresem i kluczami lokalnej bazy; opis przełączania w `CLAUDE.md`
- [ ] Playwright na lokalnej bazie domyślnie (`SUPABASE_TARGET=local`, zgodnie z HA-1.04/1.05)
- [ ] porównanie lokalnego schematu po migracjach z baseline prod: rozjazdy zapisane w raporcie
- [ ] skrypty npm: `db:start`, `db:reset`, `test:shop:local`

## Gotowe, gdy
- `supabase db reset` na czystym stacku przechodzi przez wszystkie migracje i seed bez błędów — **jak sprawdzić:** wklejone wyjście
- aplikacja pokazuje produkty z seeda na `/sklep` — **jak sprawdzić:** zrzut z Playwright MCP w `.playwright-mcp/`
- `npm run test:shop:local` przechodzi na lokalnej bazie — **jak sprawdzić:** wklejone podsumowanie testów (uruchomienie po zgodzie tj)
- ten sam test z env prod jest blokowany przez guard z HA-1.05 — **jak sprawdzić:** wklejony komunikat
- diff schematu lokalny ↔ baseline prod: pusty albo opisany — **jak sprawdzić:** sekcja „Rozjazd” w raporcie

## Poza zakresem
- środowisko dev w chmurze → odłożone (O-02: na razie bez dev)
- testy w CI → HA-1.08
- naprawianie rozjazdów schematu → osobne zadanie po decyzji tj

## Bramki STOP
- jeśli chodzi stack innego projektu (FA/DCS) — nie zatrzymuj go sam; zgłoś i czekaj (8 GB RAM, jeden stack naraz)
- `npm run build` tylko przy zatrzymanym stacku, za zgodą tj
- żadnego `supabase link` / `db push` do prod w tym zadaniu

## Kontekst
- `supabase/migrations/`, `supabase/baseline/`
- `src/lib/baselinker/fixtures/`, `playwright.config.ts`, `tests/shop/`
- stała reguła: nowe migracje numerowane `00N_name.sql`; nigdy nie edytuj istniejącej

## Notatki z realizacji
- 2026-09-22 tj: lokalny stack jak w FA/DCS (Docker, odchudzony start, guard localhost) — O-01
