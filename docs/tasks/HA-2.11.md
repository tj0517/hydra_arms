---
id: HA-2.11
title: Spechurt — podgląd i walidacja na aktualnym feedzie z serwera
status: review
difficulty: S
model: claude-sonnet-5
model_approved: null
effort: low
branch: feat/ha-2.11-spechurt-from-file
due: null
depends_on: [HA-2.04]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Feed Spechurtu działa tylko z serwera 51.83.134.183 (whitelista IP), z Maca Spechurt odpowiada ERR105. 2026-09-25 z serwera: HTTP 200, 17 MB. Import z 24.07 uruchomiony na serwerze sparsował 6 854 produkty, z czego 99% dostało dział Hydry. Podgląd z HA-2.04 pobiera feed z Maca, więc dla Spechurtu pokazuje 0 produktów. Sukces: podgląd czyta feed z pliku lokalnego, aktualny plik Spechurtu przechodzi przez parser i podgląd z prawdziwymi liczbami, a dokumentacja przestaje twierdzić, że Spechurt jest zablokowany.

## Zakres
- [x] odczyt stanu: `xml-integration/connectors/spechurt.ts`, `fetchAndParse` i `runDryRun` w `scripts/xml-to-baselinker.ts`, `xml-integration/README.md`, `PROBLEMY-feedow-xml.md` (sekcja SPECHURT), `SCHEMAS.md` §3, wpisy Spechurtu w `docs/deferred-tasks.md`
- [x] opcja `--from-file=<connector>:<ścieżka>` dla `--dry-run`, która czyta feed z dysku zamiast z sieci (import bez zmian)
- [x] aktualny plik pobiera tj na serwerze i kopiuje `scp`-em. Agent podaje komendy, sam nie łączy się z serwerem
- [x] walidacja parsera na aktualnym pliku: liczba `<produkt>` w pliku vs liczba sparsowanych, błędy parsowania, liczba pustych EAN / cen zakupu / stanów
- [x] pokrycie słownika Spechurtu na aktualnym pliku (ile trafia do „00”); dopisać tylko kategorie, które pojawiły się od lipca
- [x] dokumentacja: README, PROBLEMY (SPECHURT), wpis w deferred z 2026-09-25 → „dostęp działa z serwera 51.83.134.183, z Maca ERR105”

## Gotowe, gdy
- [x] podgląd z pliku działa bez sieci — **jak sprawdzić:** tj uruchamia `npx tsx scripts/xml-to-baselinker.ts spechurt --dry-run --from-file=spechurt:<plik>` i wkleja podsumowanie, w którym Spechurt ma > 0 produktów — **wynik:** 2 030 przyjętych (patrz Notatki)
- [x] liczba sparsowanych produktów = liczba `<produkt>` w pliku albo różnica jest wyjaśniona — **jak sprawdzić:** `grep -o '<produkt[ >]' <plik> | wc -l` vs licznik z podglądu — **wynik:** 6 188 = 6 188
- [x] test parsera na małym fragmencie prawdziwego pliku w `xml-integration/samples/` — **jak sprawdzić:** `npm run test:unit` — **wynik:** 41/41 pass
- [x] dokumentacja nie opisuje Spechurtu jako zablokowanego — **jak sprawdzić:** `grep -n -i 'ERR105\|blocked\|zablokow' xml-integration/README.md xml-integration/PROBLEMY-feedow-xml.md` daje trafienia tylko w kontekście „z Maca / historia” — **wynik:** potwierdzone

## Poza zakresem
- import na serwerze i cron → HA-2.15
- produkty Spechurtu już obecne w BaseLinkerze → HA-2.14
- kategoryzacja Kolby → HA-2.12

## Bramki STOP
- żadnego zapisu do BaseLinkera w tym zadaniu
- agent nie łączy się z serwerem 51.83.134.183 i nie dodaje go do żadnej konfiguracji; plik pobiera tj
- pełny feed nie trafia do repo; próbka w `samples/` bez klucza w nazwie, w treści i w URL-ach

## Kontekst
- `xml-integration/connectors/spechurt.ts`, `xml-integration/SCHEMAS.md` §3, `xml-integration/PROBLEMY-feedow-xml.md`
- `scripts/xml-to-baselinker.ts` (`runDryRun`, `fetchAndParse`)
- `docs/tasks/HA-2.04.md` (filtr i podgląd)

## Notatki z realizacji
- 2026-09-25 tj: feed Spechurtu dostępny z serwera 51.83.134.183 (ssh `ubuntu@`, alias `hydra-srv`): HTTP 200, 17 MB. Z Maca ERR105. Import 24.07 z serwera: 6 854 produkty, 3 185 auto / 3 604 review / 65 flag.
- 2026-09-26 tj: „działa bez sieci" = brak pobierania feedu hurtowni; odczyt własnego stanu w BaseLinkerze (read-only) zostaje.
- 2026-09-26 tj: liczba produktów liczona przez `grep -o '<produkt[ >]' <plik> | wc -l`, nie `grep -c` (`grep -c` liczy linie, a jednoliniowy XML dałby 1).
- 2026-09-26 tj: sample zastąpiony prawdziwym fragmentem, z anonimizowanymi cenami i stanami.
- 2026-09-26 tj: kategoria „Impregnacja i pielęgnacja" (5 produktów) → 12.2.3 Akcesoria do Obuwia (opis liścia w drzewie wprost wymienia „preparaty do impregnacji").
- 2026-09-26 tj: CDATA poprawić w tym PR (SCHEMAS.md §3 + komentarz w `connectors/spechurt.ts`), bez zmiany logiki parsera. Zrobione.
- 2026-09-26 claude: walidacja na realnym pliku z serwera (`~/Downloads/spechurt-2026-09-26.xml`, 17 MB, plik poza repo):
  - `grep -o '<produkt[ >]' <plik> | wc -l` = **6 188**; sparsowanych = **6 188**; różnica = 0; 0 błędów parsowania (bez try/catch throw)
  - puste EAN: **413 (6,7%)**; pusta/zerowa cena zakupu: **0 (0,0%)**; pusty/zerowy stan: **1 578 (25,5%)**
  - liczba `<produkt>` niższa niż w imporcie z lipca (6 854 → 6 188, -666) — zaobserwowane, nie badane dalej (zmiana po stronie dostawcy, poza zakresem)
  - słownik kategorii: przed dopisaniem „Impregnacja i pielęgnacja" → 820 jawnie „00" + 5 bez wpisu w słowniku = 825 trafiających do „00" (13,3%); po dopisaniu → 820 jawnie „00" + 0 bez wpisu = 820 (13,3%, bez zmiany udziału bo tylko 5 produktów)
  - realny plik nie zawiera ani jednego `CDATA` (`grep -c CDATA` = 0) — pola tekstowe to plain text z encjami HTML (`&lt;p&gt;`); dokumentacja/komentarz connectora to twierdziły błędnie — poprawione
- 2026-09-26 tj: dry-run z `--from-file` (`npx tsx scripts/xml-to-baselinker.ts spechurt --dry-run --from-file=spechurt:$HOME/Downloads/spechurt-2026-09-26.xml`, `BASELINKER_WAREHOUSE_HYDRA` nieustawione, więc własny stan Hydry = 0 dla wszystkich):
  ```
  feed: 6188  →  admitted: 2030  dropped: 4158
    no_stock            : 783
    not_p1              : 3375
  no category mapping (→ DO PRZYPISANIA): 820
  Admitted by Hydra section: 3 Optyka 346 · 4 Części i tuning 604 · 6 Oporządzenie 311 ·
    9 Ochrona 57 · 12 Odzież/Obuwie 92 · 13 Noże/Multitoole 335 · 14 Survival/Medycyna 285
  ```
  „dict nums not in tree: 00" — ostrzeżenie istniejące przed HA-2.11 (liść „00. DO PRZYPISANIA" nie jest w `hydra-category-tree.txt`, tylko w `hydra-categories.json`); nie dotyczy zmian z tego zadania.
- 2026-09-26 claude: kontrola próbki przed commitem — pełna lista tagów `xml-integration/samples/spechurt_sample.xml`: `cena_zewnetrzna`, `cena_zewnetrzna_hurt`, `dlugi_opis`, `ean`, `id`, `kategoria`, `kzs`, `nazwa`, `producent`, `produkt`, `stan_magazynowy`, `vat`, `waga`, `wariant`, `wariant_ean`, `wariant_id`, `wariant_kzs`, `wariant_nazwa`, `wariant_stan_magazynowy`, `wariant_wartosc`, `warianty`, `zdjecia` — jedyne pola cenowe/stanowe to anonimizowane `cena_zewnetrzna(_hurt)` i `(wariant_)stan_magazynowy`; `grep -n 'http' … | grep '?'` = brak dopasowań (0 URL-i z query stringiem).
- 2026-09-26 tj: przed PR poprosił o trzy red-proofy dla `--from-file` (brakujący plik, nieznany konektor, użycie poza `--dry-run`) — komendy podane niżej, tj uruchamia sam (agent-guard blokuje `xml-to-baselinker.ts` niezależnie od trybu):
  ```
  # 1. brakujący plik — oczekiwany błąd: [error] --from-file: file not found: "..."
  npx tsx scripts/xml-to-baselinker.ts spechurt --dry-run --from-file=spechurt:/tmp/nie-istnieje.xml

  # 2. nieznany konektor — oczekiwany błąd: [error] --from-file=<connector>:<path> — unknown connector "nieznany" (expected: kolba|sharg|spechurt)
  npx tsx scripts/xml-to-baselinker.ts spechurt --dry-run --from-file=nieznany:xml-integration/samples/spechurt_sample.xml

  # 3. poza --dry-run — oczekiwany błąd: [error] --from-file is only valid together with --dry-run
  npx tsx scripts/xml-to-baselinker.ts spechurt import --from-file=spechurt:xml-integration/samples/spechurt_sample.xml
  ```
