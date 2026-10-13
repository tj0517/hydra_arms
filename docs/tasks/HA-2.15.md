---
id: HA-2.15
title: Import hurtowni na serwerze — cron sync i import
status: in_progress
difficulty: M
model: claude-opus-5-5
model_approved: null
effort: xhigh
branch: feat/ha-2.15-import-server
due: null
depends_on: [HA-2.11, HA-2.13, HA-2.14, HA-2.18, HA-2.26, HA-2.27]
blocked_by_questions: []
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
- pierwszy import na żywo per hurtownia (po akceptacji podglądu, STOP przed każdym), a po nim pierwszy sync — **jak sprawdzić:** wklejone fragmenty logów z liczbami created/updated (import) i updated (sync) + `grep -cE 'key=|token=' <log>` = 0 dla każdego logu
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
- 2026-10-06 tj: O-21 zdjęte (dostęp do BL, zob. HA-2.14); zostaje decyzja tj O-19 (serwer, klucze produkcyjne na serwerze). Import na żywo z marżą wstępną tylko, gdy sklep nie sprzedaje (czeka na P24); zapis cen to bramka STOP.
- 2026-10-13 tj: O-19 rozstrzygnięte (opcja B). HA-2.15 po HA-2.27, bo bez reguł Sharga ~175 pozycji wpadłoby do „00”. Przed startem: `.env.local` na hydra-srv (tylko `BASELINKER_*` i klucze feedów), `git pull` (stary `hydra-categories.json` ma stare ID), kryterium „sync na żywo” dopiero po pierwszym imporcie (katalog 119068 jest pusty).
- 2026-10-13 decyzja tj (prompt zadania): kryterium „pierwszy sync na żywo … `grep -c 'key=' <log>` = 0” zastąpione kryterium „pierwszy import na żywo per hurtownia, a po nim pierwszy sync … `grep -cE 'key=|token=' <log>` = 0 dla każdego logu”. Powód: `sync` dotyka tylko produktów już obecnych w BL, a katalog 119068 jest pusty, więc sam sync niczego by nie dowiódł; token Sharga jedzie w URL jako `token=`, nie `key=`.
- 2026-10-13 decyzja tj (preflight): zadanie idzie w klonie WSL `/home/tj/hydra_arms` — `git rev-parse --show-toplevel` nie kończy się tu na `hydra_arms/web`, ale `.claude/settings.json` z hookiem `agent-guard.sh` i `CLAUDE.md` są załadowane. Sesja: `claude-opus-5-5`, effort `xhigh` (ustawiony przez tj w sesji; w prompcie zatwierdzony `high`).
- 2026-10-13 decyzja tj (logi): opcja A — osobny plik na każde uruchomienie w `~/logs` (`<hurtownia>-<tryb>-<RRRRMMDD-GGMMSS>.log`) plus dziennik miesięczny `run-bl-RRRR-MM.log` (linia na start / koniec / pominięcie / błąd); wrapper kasuje własne pliki starsze niż 30 dni.
- 2026-10-13 wrapper `scripts/server/run-bl.sh` — dowód lokalny wyłącznie komendą zastępczą (`--cmd`) i `--check`; prawdziwy import nie był uruchamiany (w klonie WSL nie ma `.env.local`). Red proof `flock`: drugie uruchomienie w trakcie pierwszego kończy się po 0,04 s kodem 0 z linią `SKIP lock held by another run — skipping (holder: …)`, także dla innej hurtowni; po zakończeniu pierwszego blokada jest wolna. Blokada jest jedna na cały serwer (feedy parsowane w pamięci przy 3,7 GB RAM i wspólny limit zapytań BL). Pozostałe dowody: kod wyjścia komendy przechodzi (3), złe argumenty → 64, limit czasu → 124, retencja kasuje tylko własne pliki ≥ 30 dni (plik 29 d 23 h zostaje, 30 d 1 h znika, `preview-*.log` nietknięty), pliki 600 / katalog 700.
- 2026-10-13 wrapper — dodane ponad listę z zadania, **do akceptacji tj**: (1) prawdziwy import startuje tylko, gdy istnieje `~/.hydra-import-server` (hook agenta nie zna wrappera, a wrapper sam podaje odblokowanie prod); (2) `--check` — sprawdza konfigurację prawdziwego uruchomienia i niczego nie uruchamia; (3) odmowa (kod 78), gdy w `.env.local` jest linia odblokowania prod, brak liczbowego `BASELINKER_INVENTORY_ID` (skrypt wziąłby domyślny katalog 35743 — żywy „Kobold Defense” klienta) albo `BASELINKER_MOCK=true`; ostrzeżenie, gdy plik nie ma trybu 600; (4) `HYDRA_MAX_SECONDS` — limit czasu, domyślnie wyłączony; (5) `TZ=Europe/Warsaw` i `unset NODE_DEBUG` dla procesu importu; (6) linia END w dzienniku liczy linie logu wyglądające na adres z danymi dostępowymi (`url-credentials=N`). Każdy punkt ma red proof przez `--check` albo `--cmd` na katalogach testowych. Komenda zastępcza nie dostaje odblokowania prod.
- 2026-10-13 audyt logów (trzech niezależnych czytelników kodu + własne sprawdzenie): oba komunikaty z adresem feedu ucinają query (linie 346 i 393 skryptu importu), `[fatal]` drukuje samo `err.message` (bez stosu i `cause`), token BL idzie w treści POST i nie jest nigdzie wypisywany, skrypt nic nie zapisuje na dysk. Pięć miejsc drukuje jednak cudzy tekst w `err.message` (353→965, 395, 402/409, 565, `client.ts:80`); dwa mechanizmy potwierdzone lokalnie na sztucznych danych, bez sieci: Node rzuca „Failed to parse URL from <cały adres>”, a fast-xml-parser 5.9.2 przy urwanym dokumencie dokleja 100 znaków treści — manifest gateway Sharga zawiera adresy z `token=`. Poza ścieżką importu: `src/app/api/xml/sync/route.ts:36` i `xml-integration/engine.ts:166` wkładają pełny adres do komunikatu błędu. Skryptu nie zmieniano — decyzja tj.
- 2026-10-13 hook: jedna komenda Bash zablokowana przez `agent-guard.sh` — `sed` poprawiający wrapper miał w treści nazwę zmiennej odblokowania; poprawka zrobiona narzędziem Edit. Żaden skrypt z listy guarda nie był uruchamiany.
- 2026-10-13 otwarte przed pierwszym importem na żywo: w `docs/04-open-questions.md` przy O-33 stoi „do wyjaśnienia z klientem przed HA-2.15” — (a) integracje „hydra-arms.co…” i HYDRA-ARMS (Allegro) na koncie BL, (b) Sharg jako Base Connect „SHARG (Hurtownia)” obok naszego importu XML; odpowiedzi w dokumentach nie ma.
