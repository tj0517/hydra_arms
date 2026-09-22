---
id: HA-1.04
title: Guard agenta — hook blokujący zapisy na prod
status: done
difficulty: M
model: sonnet
model_approved: true
effort: medium
branch: chore/ha-1.04-agent-guard
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 4
---

## Cel
Claude Code pracuje w tym repo w trybie `bypassPermissions` z `Bash(*)`, a `.env.local` zawiera klucz service role do prod. Jedna pomyłka agenta, na przykład `npx tsx scripts/reset-shop-db.ts`, czyści zamówienia na prod bez pytania. Tj zostaje przy trybie bypass (decyzja 2026-09-22), więc potrzebny jest bezpiecznik: hook, który przed wykonaniem polecenia blokuje znane polecenia zapisujące. Sukces: takie polecenia są zatrzymywane z czytelnym komunikatem, a zwykła praca idzie bez zmian.

## Zakres
- [ ] odczyt stanu bieżącego: `web/.claude/settings.local.json`, `hydra_arms/.claude/settings.local.json`, status `.claude/` w git (dziś nieśledzony), lista `scripts/*.ts` z podziałem na czytające i piszące (piszące rozpoznasz po `.insert/.update/.delete/.upsert/.rpc` lub zapisie do BL)
- [ ] skrypt hooka `PreToolUse` dla Bash (`.claude/hooks/agent-guard.sh`, ten sam wzorzec co w projekcie FA), który blokuje: piszące `scripts/*.ts` (lista z odczytu), `supabase db push`, `supabase migration repair`, `psql`/SQL z DDL/DML, `playwright test` bez `SUPABASE_TARGET=local`, `vercel env`, `git push --force`; komunikat mówi, co zablokowano i jak tj może to świadomie odblokować (np. zmienna `HA_ALLOW_PROD=1` ustawiona przez tj)
- [ ] rejestracja hooka w `.claude/settings.json` (śledzony w git), tryb `bypassPermissions` bez zmian
- [ ] `.gitignore`: `settings.local.json` nieśledzony, `settings.json` i `hooks/` śledzone
- [ ] krótki opis w `CLAUDE.md` (sekcja „Safety”)

## Gotowe, gdy
- red proof: próba `npx tsx scripts/reset-shop-db.ts` przez agenta kończy się blokadą hooka — **jak sprawdzić:** wklejony komunikat z sesji; skrypt nie wystartował (brak logów „Resetting shop tables”)
- red proof dla `supabase db push` — **jak sprawdzić:** jak wyżej
- polecenia czytające (`npm run lint`, `git status`, `npx tsx scripts/check-db.ts`) przechodzą — **jak sprawdzić:** wklejone wyjście
- hook ma test jednostkowy: skrypt podający hookowi przykładowe polecenia i sprawdzający wynik (zablokowane / przepuszczone) — **jak sprawdzić:** `bash .claude/hooks/test-guard.sh` → wszystkie przypadki OK
- lista piszących skryptów w hooku odpowiada odczytowi (każdy skrypt z zapisem jest na liście) — **jak sprawdzić:** tabela w raporcie: skrypt → czyta/pisze → na liście tak/nie

## Poza zakresem
- zmiana trybu na pytający → odrzucone przez tj 2026-09-22
- bezpiecznik w samym kodzie skryptów i testów → HA-1.05
- lokalna baza → HA-1.06

## Bramki STOP
- przed zmianą `settings.local.json` tj — pokaż diff (to jego lokalny plik)
- testując blokadę, nie uruchamiaj piszącego skryptu bez hooka; red proof robisz tylko przy aktywnym hooku

## Kontekst
- `web/.claude/settings.local.json`, `../.claude/settings.local.json`
- `scripts/` — lista skryptów
- dokumentacja hooków Claude Code (context7 / docs)

## Notatki z realizacji
- 2026-09-22 tj: zostajemy przy `bypassPermissions`; guard jako hook (D4)
- 2026-09-22 tj: wzorzec jak w FA (`agent-guard.sh`, odblokowanie `HA_ALLOW_PROD=1`)
- 2026-09-22 tj: hook rejestrowany też dla sesji startowanych w `hydra_arms/` (drugi, nieśledzony `../.claude/settings.json`)
- 2026-09-22 tj: red proof w kolejności — najpierw test jednostkowy (`test-guard.sh`), potem próba na żywo z nieprawidłowym kluczem (`SUPABASE_SERVICE_ROLE_KEY=invalid`)
- 2026-09-22 tj: odblokowanie tylko przez zmienną środowiskową sesji; `HA_ALLOW_PROD` wpisane inline w poleceniu jest traktowane jako próba obejścia i blokowane
- 2026-09-22 tj: skrypty piszące tylko do Sanity (`sanity-seed.ts`, `patch-homepage-fields.ts`) też trafiają na listę blokad (spójna reguła, nie tylko Supabase/BL)
- 2026-09-22 tj: review — poprawki w tym PR (cd scripts, SUPABASE_TARGET early-allow, glob, CLAUDE.md)
- 2026-09-22 tj: review runda 2 — przyjęte; test-guard.sh 159/159 (uruchomione w review); pozostałe warianty po `cd scripts` → deferred, zamyka HA-1.05
- 2026-09-22 tj: test na żywo z sesji w `hydra_arms/` — `SUPABASE_SERVICE_ROLE_KEY=invalid npx tsx web/scripts/reset-shop-db.ts` zablokowane przez agent-guard przed startem skryptu
