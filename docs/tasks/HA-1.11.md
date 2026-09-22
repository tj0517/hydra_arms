---
id: HA-1.11
title: Hook agenta — wyjątek dla lokalnej bazy i fałszywy alarm na treści commitów
status: review
difficulty: M
model: sonnet
model_approved: null
effort: medium
branch: chore/ha-1.11-guard-local-exception
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 10
---

## Cel
Hook z HA-1.04 blokuje każde `psql` i każdą komendę zawierającą DDL/DML niezależnie od hosta, więc agent nie może pracować na lokalnej bazie z HA-1.06 bez odblokowania całej sesji `HA_ALLOW_PROD=1`, które zdejmuje ochronę produ. Skaner SQL blokuje też commity, których komunikat zawiera „grant"/„revoke" (HA-1.03). Sukces: przy `SUPABASE_TARGET=local` w środowisku sesji agent może użyć `psql`/SQL wobec jawnie lokalnego hosta, wszystko inne jest blokowane jak dotąd, a treść commitów i PR-ów nie uruchamia skanera.

## Zakres
- [ ] odczyt stanu bieżącego: `.claude/hooks/agent-guard.sh` (sekcje test runners l. ~90–98, psql/SQL l. ~133–139), `test-guard.sh` (liczba i format przypadków), wpis w `docs/deferred-tasks.md` z HA-1.03, sekcja Safety w `CLAUDE.md`
- [ ] wyjątek lokalny: `psql` i skaner DDL/DML przepuszczają komendę **tylko** gdy jednocześnie: `SUPABASE_TARGET=local` jest w środowisku sesji (nie inline — jak `HA_ALLOW_PROD`), komenda zawiera jawnie lokalny host (`127.0.0.1` albo `localhost`) **i** nie zawiera `supabase.co`, refu prod ani `--linked`; komendy złożone (`;`, `&&`, `|`) nadal spadają do pozostałych sprawdzeń
- [ ] fałszywy alarm: skaner DDL/DML pomija treść argumentów `git commit -m/-F`, `gh pr create/edit --title/--body` i `gh issue` — bez wyłączania skanera dla reszty komendy złożonej
- [ ] `test-guard.sh`: nowe przypadki po obu stronach (co najmniej: psql localhost + `SUPABASE_TARGET=local` → allow; psql localhost bez zmiennej → block; psql host prod + zmienna → block; `SUPABASE_TARGET=local` inline w komendzie → block; `psql -h localhost … && npx tsx scripts/reset-shop-db.ts` → block; `git commit -m "revoke grant on x"` → allow; `git commit -m "x" && psql …` bez zmiennej → block)
- [ ] `CLAUDE.md` sekcja Safety: jedno–dwa zdania o wyjątku lokalnym; `.claude/settings.json` i tryb `bypassPermissions` bez zmian
- [ ] wpis z HA-1.03 w `docs/deferred-tasks.md` oznaczony jako załatwiony przez HA-1.11

## Gotowe, gdy
- red proof (blokada nadal działa): z sesji **bez** `SUPABASE_TARGET=local` `psql -h 127.0.0.1 -c 'select 1'` jest blokowane; z sesji **z** `SUPABASE_TARGET=local` `psql -h db.breqmmlcaxsvxcqlcmqc.supabase.co` jest blokowane — **jak sprawdzić:** wklejone komunikaty hooka z obu prób (psql nie musi być zainstalowany, hook odrzuca przed uruchomieniem)
- wyjątek działa: z sesji z `SUPABASE_TARGET=local` `psql -h 127.0.0.1 -c 'select 1'` przechodzi przez hook — **jak sprawdzić:** wklejone wyjście (błąd połączenia jest w porządku, liczy się brak komunikatu `agent-guard: blocked`)
- commit z „revoke"/„grant" w treści przechodzi — **jak sprawdzić:** wklejony wynik `git commit --allow-empty -m "test: revoke grant wording"` na gałęzi zadania, potem ten commit usunięty z gałęzi przed PR-em i pokazany `git log`
- wszystkie przypadki testowe przechodzą, stare i nowe — **jak sprawdzić:** wklejone podsumowanie `bash .claude/hooks/test-guard.sh` z liczbą przypadków ≥ 159 + nowe
- nic poza hookiem, testem, `CLAUDE.md`, deferred i plikami zadania — **jak sprawdzić:** `git diff main --stat` w raporcie

## Poza zakresem
- lokalny stack, seed, testy na lokalnej bazie → HA-1.06
- testy w CI → HA-1.08
- rozszerzanie `HA_ALLOW_PROD` albo zmiana trybu `bypassPermissions` → odrzucone (HA-1.04)
- bezpiecznik w skryptach (`prodGuard.ts`) → HA-1.05, gotowe

## Bramki STOP
- przed implementacją — pokaż regex rozpoznający „jawnie lokalny host" i „prod" oraz pełną listę nowych przypadków testowych (allow/block); czekaj na akceptację
- nie zmieniaj `.claude/settings.json`, `settings.local.json` ani `hydra_arms/.claude/` (rodzic) — jeśli coś tego wymaga, stop i pytaj
- red proofy tylko przy aktywnym hooku; żadnego `HA_ALLOW_PROD`

## Kontekst
- `.claude/hooks/agent-guard.sh`, `.claude/hooks/test-guard.sh` — mechanizm i test
- `docs/tasks/HA-1.04.md` — decyzje tj o hooku (odblokowanie tylko ze środowiska sesji, inline = obejście)
- `docs/deferred-tasks.md` — wpis HA-1.03 o fałszywym alarmie
- `CLAUDE.md` §Safety

## Notatki z realizacji
- 2026-09-22 tj: zadanie założone, bo HA-1.06 wymaga pracy agenta na lokalnej bazie bez zdejmowania ochrony produ; plik zadania zakłada agent w pierwszym commicie gałęzi (decyzja tj, odstępstwo od reguły „plik na main przed startem")
- 2026-09-22 agent: implementacja — SUPABASE_TARGET=local inline bypass check zaraz po HA_ALLOW_PROD check; IS_LOCAL; psql check na CMD (safe direction: over-block jeśli "psql" w treści commita); DDL scan na SCAN_CMD (stripped); stripping dwuetapowy: (1) awk line-wise dla heredoków będących argumentem -m (wzorzec '"$(cat <<...EOF'), (2) tr+sed [^"]*/[^']* — bez .* żeby uniknąć bypass przez compound commands; _unsafe_subst guard dla non-heredoc $(); local exception (localhost/127.0.0.1 bez prod markera) na obu sprawdzeniach; po review bypass — poprawka: awk tylko dla message-heredoków żeby cat <<'EOF' > plik.sql nadal był skanowany; 185/185 testów (26 nowych)
- 2026-09-22 agent: wpis HA-1.03 w deferred-tasks.md NIE zaktualizowany na tej gałęzi — PR #9 (HA-1.03) i ta gałąź appendują do tego samego pliku, merge conflict przy scaleniu; zostaje otwarte do załatwienia po scaleniu obu PR-ów
