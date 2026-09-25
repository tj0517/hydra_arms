---
id: HA-2.15
title: Import hurtowni na serwerze — cron sync i import
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.11, HA-2.13, HA-2.14]
blocked_by_questions: [O-19]
touches_db: false
touches_prod: true
pr: null
---

## Cel
Feedy hurtowni ważą 54–246 MB, Spechurt działa tylko z serwera 51.83.134.183, a Vercel nie nadaje się do takich plików. Dziś import uruchamia się tylko ręcznie. Serwer (Ubuntu 26.04, Node 20, 3,7 GB RAM, 32 GB wolnego miejsca) ma klon repo z lipca (`f20a13d`) i `.env.local` z kluczami produkcyjnymi, ale nie ma crona. Sukces: aktualny kod na serwerze, cron odświeżania stanów i cen oraz import produktów z filtrem dla trzech hurtowni, logi bez tokenów, zmierzona pamięć przy feedzie Sharga.

## Zakres
- [ ] odczyt stanu (wkleja tj): commit klonu, nazwy zmiennych w `.env.local` na serwerze (bez wartości), `crontab -l`, stare pliki w `~`
- [ ] instrukcja wdrożenia w `docs/ops/serwer-importu.md`: aktualizacja klonu, `npm ci`, wymagane zmienne (same nazwy), cron, rotacja logów. Kroki na serwerze wykonuje tj
- [ ] pomiar szczytowej pamięci podglądu Sharga na serwerze; jeśli > ~2,5 GB — STOP z opcjami (parsowanie strumieniowe, swap, większy VPS)
- [ ] propozycja harmonogramu: sync stanów i cen (Spechurt odświeża co ~3 h, stan raz na dobę 3:00–4:00) oraz import produktów raz na dobę. Decyzja tj
- [ ] blokada równoległych uruchomień (`flock`)
- [ ] porządki na serwerze: stary `~/spechurt.xml` i `~/spechurt-import.log` (zawiera fragment klucza) — po zgodzie tj

## Gotowe, gdy
- podgląd na serwerze dla trzech hurtowni z liczbami i szczytową pamięcią — **jak sprawdzić:** wklejony wynik (uruchamia tj, np. `/usr/bin/time -v`)
- crontab z wpisami i `flock` — **jak sprawdzić:** wklejony `crontab -l`
- pierwszy sync na żywo, po zgodzie tj: log bez tokenów, liczba zaktualizowanych stanów — **jak sprawdzić:** wklejony fragment logu + `grep -c 'key=' <log>` = 0
- red proof `flock`: drugie uruchomienie w trakcie pierwszego kończy się bez działania — **jak sprawdzić:** wklejony log

## Poza zakresem
- decyzja o produktach spoza P1 już obecnych w BL → po HA-2.14
- crony na Vercelu (sync BL → Supabase) → bez zmian
- monitoring i alerty → deferred

## Bramki STOP
- każdy zapis do BaseLinkera (`HA_ALLOW_PROD=1` na serwerze) — tylko tj, po akceptacji podglądu
- treść crontaba — akceptuje tj przed wpisaniem
- usunięcie plików na serwerze i zmiany `.env.local` na serwerze — tj
- agent nie łączy się z serwerem; wszystkie kroki na serwerze wykonuje tj według instrukcji

## Kontekst
- `scripts/xml-to-baselinker.ts`, `scripts/lib/prodGuard.ts`
- `docs/tasks/HA-2.04.md`, `HA-2.11.md`, `HA-2.13.md`, `HA-2.14.md`
- `xml-integration/PROBLEMY-feedow-xml.md` (rozmiary feedów, harmonogram Spechurtu)

## Notatki z realizacji
- 2026-09-25 tj: serwer 51.83.134.183 — Ubuntu 26.04, Node v20.20.2, 3,7 GB RAM, 32 GB wolne; `~/hydra` = klon repo na `f20a13d` z `.env.local`; brak crontaba.
