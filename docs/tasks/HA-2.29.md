---
id: HA-2.29
title: Lokalny stack Supabase na własnych portach (55321+) — współżycie z DCS na WSL
status: review
difficulty: S
model: sonnet-5.5
model_approved: null
effort: null
branch: feat/ha-2.29-local-ports
due: null
depends_on: [HA-1.06]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 43
---

## Cel
Lokalny stack Hydry używa domyślnych portów Supabase (54321–54329), tych samych co stack DCS (Seaclouds). Na WSL oba muszą stać jednocześnie, więc `npm run db:start` pada na „port is already allocated”. Sukces: Hydra ma własne porty, `db:start` rusza obok działającego DCS, testy i dev łączą się z właściwą bazą, a nikt nie musi zatrzymywać cudzego stacka.

## Zakres
- [ ] odczyt stanu bieżącego: wszystkie wystąpienia `5432x` w repo (`git grep -nE '5432[0-9]'` bez `package-lock.json`), `supabase/config.toml`, `.env.development.local.example`, fallbacki `SUPABASE_URL` w `tests/shop/**`, `scripts/lib/prodGuard.test.ts`, workflow CI
- [ ] `supabase/config.toml`: porty 55321 (api), 55322 (db), 55320 (shadow), 55323 (studio), 55324 (inbucket), 55327 (analytics), 55329 (pooler) — zachować wyłączenia z `db:start -x …`
- [ ] `.env.development.local.example`: URL na 55321; fallbacki w testach na 55321 (albo jeden wspólny fallback w `tests/shop/fixtures.ts`)
- [ ] `prodGuard.test.ts`: potwierdzić odczytem, że guard sprawdza host, nie port — jeśli tak, bez zmian
- [ ] `CLAUDE.md` (sekcja Commands/Supabase) i `docs/` tam, gdzie wymieniono 54321/54322

## Gotowe, gdy
- `npm run db:start` rusza przy działającym stacku DCS na 54321/54322 — **jak sprawdzić:** wklejony `docker ps` z obiema grupami kontenerów
- `npm run db:reset` przechodzi — **jak sprawdzić:** wklejony ogon wyniku
- pełny zestaw testów bez regresji względem 196/198 na WSL — **jak sprawdzić:** wklejona linia podsumowania
- `git grep -nE '5432[0-9]'` poza `package-lock.json` zwraca tylko `prodGuard.test.ts` (jeśli zostawiony) — **jak sprawdzić:** wklejony wynik
- red proof: `.env.development.local` wskazujący stary port → testy padają na połączeniu, nie przechodzą po cichu na inną bazę — **jak sprawdzić:** wklejony błąd

## Poza zakresem
- zmiana portów DCS/FA → ich repa
- cokolwiek w `.env.local` (prod) — nie dotykać

## Bramki STOP
- przed zmianą `.github/workflows/*` — pokaż diff i czekaj

## Kontekst
- `supabase/config.toml` — źródło portów
- `.env.development.local.example`, `tests/shop/fixtures.ts`, `scripts/lib/prodGuard.ts` — gdzie URL lokalny jest czytany
- `docs/tasks/HA-1.06.md` — jak powstał lokalny stack

## Notatki z realizacji
- 2026-10-15 tj: Seaclouds zostaje na domyślnych portach; Hydra przechodzi na 553xx (decyzja przy starcie HA-2.06).
- 2026-10-15 agent: `.github/workflows/ci.yml` bez zmian — CI buduje `.env.development.local` z `supabase status -o env` (API_URL z config.toml), w workflow nie ma żadnego `5432x`; bramka STOP nie wystąpiła.
- 2026-10-15 agent: `prodGuard.ts` sprawdza `hostname` (nie port) → `prodGuard.test.ts` bez zmian (stałe `:54321` to tylko dane testowe URL-i).
- 2026-10-15 agent: `.env.development.local` nie istniał na tej maszynie — utworzony (nietrackowany, w .gitignore) z `.env.development.local.example` + kluczami z `supabase status -o env`.
- 2026-10-15 agent: red proof na starym porcie 54321 nie daje „connection refused” — port zajmuje stack DCS i przyjmuje klucz anon Hydry (PGRST205, brak tabeli `shop_products`). Dowód połączeniowy zrobiony na porcie bez nasłuchu (55399); luka guardów w deferred-tasks.
- 2026-10-15 tj (review): accepted z dodatkiem — `assertNotProd()` port-aware w `prodGuard.ts` (host localhost/127.0.0.1 ∧ port 55321; inny port lokalny → odmowa z nazwą portu i „another project's local stack?”); `agent-guard.sh` osobnym zadaniem (deferred).
- 2026-10-15 agent: `prodGuard.ts` widzi wyłącznie `NEXT_PUBLIC_SUPABASE_URL` (URL API) — adresy DB nigdzie do niego nie trafiają, więc reguły dla 55322 nie dodano. Odmowa nie jest odblokowywana przez override prod (to nie prod, tylko cudzy stack). `scripts/lib/prodGuard.test.ts` nie wchodzi do `npm run test:unit` (glob `xml-integration/__tests__`) — uruchamiany osobno: `npx tsx --test scripts/lib/prodGuard.test.ts`.
- 2026-10-15 agent: rebase na origin/main (zawiera HA-2.28, PR #42): INDEX — wiersz HA-2.29 po HA-2.28; deferred-tasks — zachowane oba wpisy.
