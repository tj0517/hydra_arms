---
id: HA-2.33
title: Pusty feed = błąd importu (z ponowną próbą); harmonogram Spechurta po oknie regeneracji
status: done
difficulty: S
model: claude-fable-5-1
model_approved: null
effort: null
branch: feat/ha-2.33-empty-feed-retry
due: null
depends_on: [HA-2.15]
blocked_by_questions: []
touches_db: false
touches_prod: true
pr: 55
---

## Cel
Cztery noce crona (15/16–18/19.10) pokazały, że import Spechurta o 04:05 UTC dostaje pusty feed (`Received 0.0 MB`, `Parsed 0`, `Nothing to import.`, 1 s, `exit 0`), a ten sam feed o 05:40 UTC ma 16,3 MB / 6183 produkty. Skutek: od 16.10 żaden nowy produkt Spechurta nie wchodzi do katalogu 119068, dwa produkty z błędem zdjęć z 15.10 nie wróciły, a dziennik pokazuje zielone linie o niczym — pusty feed jest traktowany jak sukces. Okno regeneracji po stronie Spechurta nie jest znane (jedna próbka: 06:05 PL pusty, 07:40 PL pełny). Sukces: pusty feed kończy import i sync kodem ≠ 0 z czytelnym błędem w dzienniku i na stderr, import przy pustej odpowiedzi ponawia pobranie zamiast od razu padać, Spechurt w crontabie stoi poza oknem, pierwsza noc po zmianie przetwarza pełny feed, a zaległości Spechurta są nadrobione.

## Zakres
- [ ] odczyt stanu bieżącego: `fetchAndParse` i warunki `products.length === 0` w `scripts/xml-to-baselinker.ts` (import i sync), blok `result=` / linia `END` w `scripts/server/run-bl.sh`, sekcje 7 i 10 oraz tabela „Obsługa” w `docs/ops/serwer-importu.md`, wpis deferred 2026-10-13 „monitoring i alerty importu”, dziennik 4 nocy (wklejony przez tj: 24 przebiegi, 4× `spechurt import … duration=1s result="Nothing to import."`)
- [ ] czysta logika w `xml-integration/feed-guard.ts`: klasyfikacja odpowiedzi feedu (pusta treść / 0 produktów / ok) i polityka ponawiania (domyślnie 3 próby co 600 s, konfigurowalne env `FEED_RETRY_ATTEMPTS` / `FEED_RETRY_DELAY_S`; brak ponawiania dla `--from-file`, bo plik się nie zmieni); testy jednostkowe w `xml-integration/__tests__/`
- [ ] skrypt importu: pusty feed → ponowne pobranie wg polityki, po wyczerpaniu prób `[fatal] empty feed after N attempts` i `exit 1`; dotyczy `import`, `sync` i `--dry-run`, wszystkich trzech hurtowni; linie `Nothing to import.` / `Nothing to sync.` znikają ze skryptu (pusty wynik po `--limit` zostaje osobnym, jawnym komunikatem z `exit 0`)
- [ ] wrapper: `result=` łapie nowy komunikat `[fatal] empty feed …`, linia `END exit=1` i stderr — bez zmiany zachowania dla pozostałych ścieżek; self-test rozszerzony o ten przypadek komendą zastępczą
- [ ] harmonogram (decyzja tj 2026-10-19, D1 = B): Spechurt import `04:05 → 04:35 UTC` z `HYDRA_MAX_SECONDS=7200` (2610 s importu + do 1800 s ponawiania), Spechurt sync `05:40 → 06:50 UTC` (zasada „odstęp > limit + 60 s”: 04:35 + 7200 s + 60 s = 06:36); Kolba i Sharg bez zmian; komentarz w crontabie o Spechurcie poprawiony na stan faktyczny
- [ ] `docs/ops/serwer-importu.md`: sekcja 7 (tabela startów, uzasadnienie), sekcja 10 (nowa treść crontaba), tabela „Obsługa” (wiersz `ERROR … empty feed`), notatka o oknie regeneracji Spechurta; komenda kontrolna dnia następnego bez zmian
- [ ] bramka D2 (zaległości Spechurta) — decyzja tj przy kroku: (A) ręczny `spechurt import` przez wrapper po merge'u, w dzień, poza oknem crona; (B) czekać na pierwszą noc. Rekomendacja planu: A

## Gotowe, gdy
- pusty XML i XML bez produktów klasyfikują się jako „pusty”, a próbka `xml-integration/samples/spechurt_sample.xml` jako „ok” (red proof) — **jak sprawdzić:** nazwy testów w wyniku `npm run test:unit`
- polityka ponawiania: po N nieudanych próbach zwraca błąd, przy `--from-file` nie ponawia, odstęp i liczba prób czytane z env z domyślnymi 3 / 600 s — **jak sprawdzić:** testy jednostkowe (bez sieci, bez `sleep` — czas wstrzykiwany)
- `grep -nE 'Nothing to (import|sync)\.' scripts/xml-to-baselinker.ts` → 0 trafień — **jak sprawdzić:** wklejony wynik
- pusty plik jako feed kończy skrypt kodem ≠ 0 z `[fatal] empty feed` (uruchamia tj z terminala Maca, hook blokuje agenta): `npx tsx scripts/xml-to-baselinker.ts spechurt --dry-run --from-file=spechurt:/dev/null; echo exit=$?` — **jak sprawdzić:** wklejona ostatnia linia i `exit=1`
- wrapper przy komendzie zastępczej kończącej się kodem 1 z linią `[fatal] empty feed after 3 attempts` daje `END exit=1 … result="[fatal] empty feed after 3 attempts"` i linię na stderr — **jak sprawdzić:** nowy przypadek w `scripts/server/test-run-bl.sh`, wklejone `passed: N, failed: 0` z serwera po `git pull`
- `crontab -l` na koncie `hydra-import`: Spechurt `35 4` z `HYDRA_MAX_SECONDS=7200` i `50 6` z `600`, pozostałe cztery linie bez zmian — **jak sprawdzić:** wklejony `crontab -l` (po bramce STOP)
- pierwsza noc po zmianie: `spechurt import` w dzienniku z `END exit=0`, `result="Import done: …"` i `Received` > 10 MB w logu uruchomienia — **jak sprawdzić:** wklejone `grep -h 'spechurt import' ~/logs/run-bl-2026-10.log | tail -2` i `grep -E 'Received|Parsed' <log>`; kryterium weryfikowane po merge'u, wynik do „Notatek z realizacji” (jak pierwsza noc w HA-2.15)
- `grep -cE 'key=|token=' <każdy wklejony log>` = 0 — **jak sprawdzić:** wklejona liczba

## Poza zakresem
- alerty, gdy w oknie brak `END exit=0` → zostaje w deferred (wpis 2026-10-13 „monitoring”), to zadanie zamyka tylko część „pusty feed = `exit 0`”
- przesunięcie crona Vercela `/api/shop/sync` (dziś 02:00 UTC) → HA-2.09 / deferred; po tym zadaniu sync Spechurta kończy się ok. 06:52 UTC, więc kopia sklepu „po wszystkich hurtowniach” to ≥ 07:00 UTC, nie 06:15
- czyszczenie komunikatów błędów z adresami feedów → osobne zadanie S (deferred 2026-10-13)
- parametry Sharga scalane dla 0 produktów → deferred (HA-2.15, 2026-10-15)
- sync zapisujący cenę bezwarunkowo → osobne zadanie S przed HA-2.09
- dwa produkty Spechurta z błędem URL zdjęcia (SKU 22372, 39352) — wracają same przy pełnym imporcie, jeśli feed ma poprawny URL; jeśli nie, osobny wpis w deferred, nie poprawka tutaj

## Bramki STOP
- treść crontaba — pokaż pełny plik i czekaj na akceptację; instaluje tj z pliku (`crontab <plik>`), nie `crontab -e`
- każde uruchomienie na serwerze (`git pull`, self-test, `--check`, import ręczny) wykonuje tj według instrukcji; agent nie łączy się z serwerem i nie uruchamia skryptu importu w żadnym trybie (hook)
- przed ręcznym importem Spechurta (D2 A) — pokaż komendę z `--check` i poczekaj na decyzję A/B
- zmiany `.env.local` na serwerze — nie przewidziane; gdyby były potrzebne (nowe zmienne retry), tylko tj, same nazwy w instrukcji

## Kontekst
- `scripts/xml-to-baselinker.ts` — `fetchAndParse`, warunki pustego wyniku w `runImport` / `runSync` / `runDryRun`
- `scripts/server/run-bl.sh`, `scripts/server/test-run-bl.sh` — dziennik, `result=`, self-test
- `docs/ops/serwer-importu.md` — sekcje 7, 10, „Obsługa”
- `docs/tasks/HA-2.15.md` — notatki z pierwszych importów, czasy i limity
- `docs/deferred-tasks.md` — wpis 2026-10-13 „monitoring i alerty importu”
- `xml-integration/samples/spechurt_sample.xml` — próbka do red proofu klasyfikacji

## Notatki z realizacji
- 2026-10-19 tj (wf-plan): odczyt 4 nocy crona (15/16–18/19.10): 24 przebiegi `exit=0`, 0 `SKIP`, 0 `ERROR`, sekrety w logach 0; Kolba i Sharg poprawne (importy 3220–3260 s / 2499–2592 s, synce 38–76 s); Spechurt import 4× `Received 0.0 MB`, `Parsed 0`, `duration=1s`, `exit 0`; sync Spechurta 07:40 PL każdej nocy pełny (2141 odświeżonych; 19.10: 16,3 MB, 6183 produkty, 171 s). `cron-stderr.log` leży w `/home/hydra-import/` (zgodnie z crontabem), nie w `~/logs` — do potwierdzenia odczytem, że istnieje i ma 0 B.
- 2026-10-19 tj: D1 = B — przesunięcie Spechurta (04:35 / 06:50 UTC) plus ponowna próba przy pustym feedzie; A (samo przesunięcie) odrzucone, bo okno regeneracji znane z jednej próbki.
- 2026-10-19 tj: D2 (nadrobienie zaległości ręcznym importem vs pierwsza noc) — do rozstrzygnięcia przy bramce w trakcie zadania.
- 2026-10-19 numeracja: HA-2.30–2.32 zajęte tego samego dnia przez plan UI listingu (gałąź `docs/ha-2.30-2.32-plan`), stąd HA-2.33; gałąź planu oparta na tamtej, żeby INDEX nie konfliktował.
- 2026-10-20 agent (preflight): sesja WSL `/home/tj/hydra_arms` (zatwierdzona), `SUPABASE_TARGET=local` ustawione w sesji, hook `agent-guard.sh` zarejestrowany; model `claude-fable-5-1` (prompt mówił Sonnet — wpisany ten, na którym agent faktycznie działa). Gałąź `feat/ha-2.33-empty-feed-retry` z `main` po merge'u PR #53/#54.
- 2026-10-20 agent: `xml-integration/feed-guard.ts` — `classifyFeed` (`empty-body` / `no-products` / `ok`), `retryPolicyFromEnv` (domyślnie 3 / 600 s; `--from-file` → 1 próba; zła wartość env = odmowa, nie cicha wartość domyślna, jak `HYDRA_MAX_SECONDS` we wrapperze), `fetchFeedWithRetry` z wstrzykiwanym `sleep`/`warn`; 17 testów (`feed-guard.test.ts`), w tym próbka `spechurt_sample.xml` → `ok`. Skrypt: `fetchAndParse` owinięte w politykę; `Nothing to import.` / `Nothing to sync.` zastąpione przez `No in-stock products left after --limit=N — nothing written/refreshed.` (`exit 0`); błąd po ostatniej próbie idzie przez `main().catch` → `[fatal] empty feed after N attempts`, `exit 1`. Wrapper: pierwszy `grep` wyniku ma trzeci wzorzec `\[fatal\] empty feed after [0-9]+ attempts?`, wzorzec `Nothing to (import|sync)\.` usunięty; `test-run-bl.sh` 82 → 86 przypadków.
- 2026-10-20 agent: komunikat ma liczbę pojedynczą/mnogą (`1 attempt` / `3 attempts`), bo kryterium wrappera żąda dosłownie `after 3 attempts`, a kryterium `--from-file` pisze `1 attempt(s)` — oba spełnić jednym literałem się nie da; wzorzec wrappera łapie obie formy. Wiersz „Obsługa” nazwany `END exit=1 … result="[fatal] empty feed …"`, nie `ERROR … empty feed` — wrapper nie pisze linii `ERROR` dla błędu importu; alarmem jest `END exit=1` i linia w `cron-stderr.log`.
- 2026-10-20 tj (Mac, `npx tsx scripts/xml-to-baselinker.ts spechurt --dry-run --from-file=spechurt:/dev/null; echo exit=$?`, wklejone): `Read 0.0 MB`, `Parsed 0 products`, `[warn] empty feed (empty body) — attempt 1/1, giving up`, `[fatal] empty feed after 1 attempt (no retry for --from-file)`, `exit=1`.
- 2026-10-20 tj: STOP 1 — treść crontaba zaakceptowana bez zmian (Spechurt `35 4` z `HYDRA_MAX_SECONDS=7200`, `50 6` z `600`, pozostałe cztery linie bez zmian); wpisana do sekcji 10 `docs/ops/serwer-importu.md`. Instalacja z pliku (`crontab <plik>`) po merge'u.
- 2026-10-20 tj: D2 = A — ręczny `spechurt import` przez wrapper po merge'u, w dzień, poza oknem crona (`HYDRA_MAX_SECONDS=7200 scripts/server/run-bl.sh spechurt import` po `--check spechurt import`). Wynik i pierwsza noc → do tych notatek.
- 2026-10-20 tj: decyzja 3 — limit synców zostaje 600 s; sync z pustym feedem kończy się `exit=124 stopped-by=limit-600s` zamiast `[fatal] empty feed` — konsekwencja opisana w sekcji 7 i w deferred.
- 2026-10-20 tj: sesja szła na Fable przy prompcie „Sonnet · low” — `model:` zostaje jak wpisane, `model_approved` nietknięte.
- 2026-10-20 tj: odbiór PR #55 — udowodnione: feed-guard (17 testów, 3 mutanty czerwone), skrypt bez „Nothing to …”, red proof /dev/null na Macu (exit=1), wrapper 86/86 lokalnie z red proofem 84/2, sekcja 10 zgodna z zatwierdzonym crontabem, §S czyste, src/ nietknięte. Po merge'u (tj): test-run-bl.sh na serwerze, crontab -l, ręczny import Spechurta (D2 = A), pierwsza noc — wyniki do tej sekcji. Sesja na Fable przy prompcie Sonnet·low — przyjęte z adnotacją. Poza zakresem, do deferred: błąd HTTP feedu (5xx) nie wchodzi w retry — tylko pusta odpowiedź 200.
