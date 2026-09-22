---
id: HA-1.09
title: Higiena — server-only w kliencie admin i poprawki CLAUDE.md
status: done
difficulty: S
model: sonnet
model_approved: null
effort: low
branch: chore/ha-1.09-hygiene
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 7
---

## Cel
Klient z kluczem service role (`src/lib/supabase/admin.ts`) nie jest zabezpieczony przed przypadkowym importem w komponencie przeglądarkowym; skutkiem byłby wyciek klucza w bundlu. `CLAUDE.md` wprowadza agentów w błąd („No test runner”, „001→006”, trasy `direct_H1/H2/consolidated` zamiast `own/sourced/pickup`). Sukces: import admina po stronie klienta wywala build, a `CLAUDE.md` mówi prawdę.

## Zakres
- [ ] odczyt stanu bieżącego: `grep -rn "supabase/admin" src`, czy pakiet `server-only` jest w zależnościach, `FulfillmentRoute` w `src/lib/shop/cartAnalysis.ts`
- [ ] `import 'server-only'` w `src/lib/supabase/admin.ts` (+ zależność, jeśli brak)
- [ ] `CLAUDE.md`: Playwright (`npm run test`, `test:shop`), migracje 001→007, trasy fulfillmentu zgodne z kodem, `.env.local` = prod (ostrzeżenie)

## Gotowe, gdy
- red proof: tymczasowy import admina w komponencie `'use client'` oblewa `npm run build` — **jak sprawdzić:** wklejony błąd; zmiana cofnięta (build za zgodą tj)
- `grep -rn SERVICE_ROLE src` pokazuje tylko `admin.ts` — **jak sprawdzić:** wklejone wyjście
- `CLAUDE.md` nie zawiera „No test runner” ani `direct_H1` — **jak sprawdzić:** `grep -n -E "No test runner|direct_H1" CLAUDE.md` pusto

## Poza zakresem
- opis guardów i lokalnej bazy w `CLAUDE.md` → HA-1.04 / HA-1.06

## Bramki STOP
- brak specyficznych (zadanie nie dotyka bazy ani env)

## Kontekst
- `src/lib/supabase/admin.ts`, `CLAUDE.md`, `src/lib/shop/cartAnalysis.ts`

## Notatki z realizacji

2026-09-22 (agent): `server-only` installed and imported; CLAUDE.md corrected (test runner, routes, migrations). Red proof confirmed with `sklep/page.tsx`. Build passes. PR #7 opened.
- 2026-09-22 tj: review — przyjęte; red proof server-only (build z komponentem renderowanym w /sklep oblany), build po cofnięciu zielony, greps OK
