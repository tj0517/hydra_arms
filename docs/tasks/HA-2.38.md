---
id: HA-2.38
title: Poprawki importu po audycie — rozjazdy cen, normalizacja EAN, zerowanie wycofanych, waga
status: in_progress
difficulty: M
model: claude-opus-5-5
model_approved: tj
effort: high
branch: feat/ha-2.38-poprawki-importu
due: null
depends_on: [HA-2.37]
blocked_by_questions: []
touches_db: false
touches_prod: true
pr: null
---

## Cel
Audyt HA-2.37 na serwerze (2026-10-26, katalog 119068) pokazał cztery błędy po naszej stronie:
- Sharg ma 34 rekordy z ceną zakupu w BL różną od feedu, w tym 20 rekordów jednej hurtowni, choć feed (wygenerowany 22:19 UTC) jest starszy niż sync (00:50 UTC). Przykład: SHARG 5652 (rekord jednej hurtowni), feed 328, BL 231,75.
- Kolba ma 520 rekordów własnych (15%) z ceną sprzedaży różną od „zakup × narzut”.
- Ten sam towar ląduje w dwóch rekordach, bo EAN różnią się zerem wiodącym: Kolba `192687280759` i Spechurt `0192687280759`. Sharg ma 91 EAN 11-cyfrowych (zgubione zero).
- 17 rekordów wycofanych przez hurtownie ma nadal stan w BL, w tym 8 z `approved` ze stanem > 0, czyli widocznych w sklepie.
- 56 rekordów ma wagę w feedzie, a w BL 0.

Sukces: ceny w BL zgadzają się z feedem albo każdy rozjazd ma nazwaną przyczynę. Jeden EAN to jeden klucz niezależnie od zer wiodących. Rekord, którego kodu hurtownia już nie ma, dostaje stan 0 w jej magazynie — chyba że feed wygląda na niepełny. Waga z feedu trafia do BL.

## Zakres
- [ ] odczyt stanu: `runImport`, `runSync`, `toBLProduct`, `computeSellingPrice` w `scripts/xml-to-baselinker.ts` (czytać narzędziem Read — hook blokuje Bash z nazwą skryptu); `xml-integration/connectors/sharg.ts` (`parseAttributeValue: true`, cena z pierwszego rozmiaru), `bl-match-key.ts`, `scripts/audit-import.ts` (jak liczy rozjazd ceny zakupu — czy rozdziela rekordy wspólne), raport audytu z 2026-10-26 (CSV `A_cena_rozbiezna.csv`, `A_osierocone_w_BL.csv`, `F_brak_wagi.csv`)
- [ ] **1. Ceny — najpierw diagnoza, potem poprawka.** Rozjazdy dzielą się na dwie grupy.

  **Rekordy wspólne.** Cenę zakupu wspólnego rekordu nadpisuje sync hurtowni, która przeszła ostatnia w nocy (Spechurt 06:50 UTC). Rozjazd jest tu oczekiwany do czasu HA-2.39. W tym zadaniu wystarczy go policzyć osobno i opisać.

  **Rekordy jednej hurtowni (Sharg 20, Kolba 520).** To błąd do znalezienia. Przykład: SHARG 5652 ma w `A_cena_rozbiezna.csv` `rekord_wspolny = nie`, cenę zakupu w BL 231,75 przy 328 w feedzie, a cenę sprzedaży 301,28 = 231,75 × 1,3. To rekord jednej hurtowni z nieaktualną ceną zakupu, choć feed (22:19 UTC) jest starszy niż sync (00:50 UTC). Diagnoza ma ustalić, dlaczego sync nie zapisał nowej ceny zakupu:
  - (a) czy sync w ogóle trafia w te ID — klucz `findBLMatch`, kolejność indeksu, ten sam EAN 2× w feedzie, EAN trafiający w inny rekord;
  - (b) czy `updateInventoryProductsPrices` zwraca błędy albo ostrzeżenia per produkt, które dziś pomijamy — skrypt loguje tylko liczbę `warnings`;
  - (c) czy pole czytane przez sync to to samo, co pokazuje feed `full` — cena z pierwszego rozmiaru (`firstSize.price`), kolejność rozmiarów, `full` kontra `light`;
  - (d) czy feed zmienił się między syncem a audytem.
  
  Kolba: rozkład 520 rozjazdów — wielkość, znak, rekordy z fallbackiem na cenę brutto, czy feed Kolby zmienia się w ciągu dnia. Wynik diagnozy jako tabela przyczyna → liczba w „Notatkach”, potem poprawka
- [ ] **2. Normalizacja EAN** — jedna funkcja w `bl-match-key.ts` używana przez indeks, dopasowanie, zapis i audyt. Format (decyzja tj 2026-10-26):
  - same cyfry;
  - kanon do porównania to GTIN-14 dopełniony zerami z lewej;
  - zapis do BL jako GTIN-13, gdy mieści się w 13 cyfrach (8-cyfrowe EAN-8 bez zmian);
  - zła cyfra kontrolna → EAN traktowany jak brak, z ostrzeżeniem w logu.
  
  Sharg: koniec gubienia zera (`code_producer` czytany jako tekst). Raport (tylko odczyt) par rekordów w BL, które po zmianie mają ten sam kanoniczny EAN: liczba, przykłady, który rekord zostałby. Scalanie istniejących par — osobna decyzja tj (STOP)
- [ ] **3. Wycofane produkty** — sync (albo osobny krok po nim, pod tą samą blokadą) ustawia stan 0 w magazynie hurtowni na rekordzie, który ma jej kod (prefiks SKU albo parametr `SKU <Hurtownia>`), a którego kodu nie ma w dzisiejszym feedzie. Definicja jak w audycie HA-2.37.

  Bezpiecznik: liczba produktów w feedzie < 90% liczby z poprzedniego udanego przebiegu tej hurtowni → zero zapisów stanu 0, linia `[error] feed looks incomplete …`, `exit ≠ 0`. Licznik z poprzedniego przebiegu trzymany w pliku stanu na koncie `hydra-import`. Brak historii (pierwszy przebieg) → nie zerujemy, tylko zapisujemy licznik.

  Nic nie jest usuwane ani odpinane: zmienia się wyłącznie stan w magazynie tej hurtowni. Podsumowanie w logu: „zeroed: N (approved: M)”
- [ ] **4. Waga** — przyczyna 56 rekordów z wagą w feedzie i 0 w BL. Hipotezy:
  - zaokrąglenie `round2(weight_g / 1000)` zeruje wagi < 5 g;
  - jednostki Sharga i Spechurta;
  - sync nie zapisuje wagi, a rekordy powstały przed zmianą.
  
  Poprawka w imporcie; test na wartości granicznej
- [ ] audyt HA-2.37 po zmianach: ta sama normalizacja EAN, kolumna rozjazdu ceny zakupu rozdzielona na rekordy własne i wspólne (dziś liczy je razem)
- [ ] `docs/ops/serwer-importu.md`: nowa linia w podsumowaniu syncu („zeroed”), nowy błąd „feed looks incomplete” w tabeli „Obsługa”, plik stanu licznika

## Gotowe, gdy
- diagnoza cen: tabela przyczyna → liczba dla rekordów jednej hurtowni (Sharg 20, Kolba 520) i osobno dla rekordów wspólnych Sharga; każda przyczyna z ≥ 1 przykładem prześledzonym od feedu do BL — **jak sprawdzić:** „Notatki z realizacji” + odczyt BL tych rekordów (tj, readonly)
- red proof nadpisywania: sync Spechurtu, który przez EAN trafia rekord SHARG-5652 (bez członkostwa Spechurtu), przed poprawką zapisuje na nim cenę, a po poprawce nie — **jak sprawdzić:** nazwa testu w `npm run test:unit`; po cofnięciu poprawki test pada
- normalizacja EAN: `192687280759` i `0192687280759` to ten sam klucz; 11-cyfrowy EAN Sharga z zerem z feedu zachowuje zero — **jak sprawdzić:** testy `bl-match-key` + konektora Sharga; red proof: bez normalizacji test „Kolba + Spechurt, ten sam towar” daje dwa rekordy
- raport par do scalenia (liczba + CSV) — **jak sprawdzić:** wklejone podsumowanie z odczytu katalogu 119068 (uruchamia tj)
- zerowanie: rekord z kodem hurtowni, którego nie ma w feedzie → stan 0 tylko w magazynie tej hurtowni, inne magazyny bez zmian — **jak sprawdzić:** test na atrapie BL
- red proof bezpiecznika: feed z liczbą produktów 89% poprzedniej → zero zapisów, `exit ≠ 0`; 90% → zerowanie idzie — **jak sprawdzić:** testy jednostkowe (bez sieci)
- waga: przypadek graniczny (np. 3 g) nie daje 0 w payloadzie — **jak sprawdzić:** test na payloadzie `toBLProduct`
- ponowny audyt HA-2.37 na serwerze po drugiej nocy z nowym kodem: osierocone ze stanem > 0 = 0; rozjazdy cen na rekordach jednej hurtowni (Sharg i Kolba) = 0 albo każdy przypisany do wyjaśnionej przyczyny (np. zmiana feedu po syncu); rozjazdy na rekordach wspólnych — oczekiwane do HA-2.39; „brak wagi — źródło import — przyjęte” = 0; „poza filtrem” podane jako liczba — **jak sprawdzić:** wklejone tabele A i F z raportu, `grep -cE 'key=|token='` = 0
- `npx tsc --noEmit` czysto, `npm run test:unit` zielony (poza znanym `prod-guard` w WSL) — **jak sprawdzić:** wklejone podsumowania

## Poza zakresem
- scalanie istniejących par rekordów o tym samym kanonicznym EAN — tylko raport; scalenie po decyzji tj, osobnym krokiem
- cena produktu wspólnego (która hurtownia wyznacza cenę) → HA-2.39
- SKU Sharga bez zer wiodących (`SHARG-139` zamiast `000139`) — format zatwierdzony w HA-2.28, zmiana zerwałaby dopasowanie istniejących rekordów
- parametry techniczne Sharga scalane dla 0 produktów (deferred 2026-10-15)
- mapowanie marek Kolby bez kategorii (4789 na stanie) — odłożone (tj 2026-10-26)

## Bramki STOP
- przed scaleniem jakichkolwiek istniejących rekordów — tylko raport, decyzja tj
- przed pierwszym przebiegiem z zerowaniem stanów na serwerze — tj uruchamia po merge'u, najpierw dry-run z listą rekordów do wyzerowania
- skrypt importu jest na liście hooka; zapisy do BL wyłącznie na serwerze przez tj

## Kontekst
- `scripts/xml-to-baselinker.ts`, `xml-integration/bl-match-key.ts`, `xml-integration/connectors/{kolba,sharg,spechurt}.ts`, `scripts/audit-import.ts`, `xml-integration/import-audit.ts`
- `docs/ops/serwer-importu.md` — crontab, wrapper, „Obsługa”
- `docs/deferred-tasks.md` — 2026-10-13 (11-cyfrowe EAN, sync nie zeruje stanu), 2026-10-15 (sync zapisuje cenę bezwarunkowo)
- `docs/tasks/HA-2.37.md` — definicje osieroconych i rozjazdów

## Notatki z realizacji
- 2026-10-26 agent — **odczyt potwierdzający (tj, `diag-prices` Spechurt + Kolba na 178 rekordach Sharga + 710340232, main @ 9929bf9, pliki `diag-ha-2.38b/`)**: przyczyna z diagnozy potwierdzona dla **wszystkich 178** rekordów — cena zakupu w BL = bieżąca cena zakupu pozycji feedu innej hurtowni (albo właściciela), dopasowanej do rekordu kluczem syncu; niewyjaśnionych 0. Sprawdzone własnym skryptem (porównanie `zakup_BL` z `rozjazdy-sharg.csv` z `price_purchase` pozycji w `feed_items` z `match.id` = rekord, tolerancja 0,01), liczby zgodne z odczytem tj:

  | rekord (SKU w BL, rodzaj wg diagnozy) | liczba | cena w BL pochodzi z feedu | przykład |
  | --- | --- | --- | --- |
  | `SHARG-`, „własny” | 117 | Kolby | 710960237 `SHARG-5543`: BL 143,20 = Kolba `653-006` 143,20 (Sharg 168,00) |
  | `SHARG-`, „własny” | 10 | Spechurta | 710960249 `SHARG-5652`: BL 231,75 = Spechurt `10310` 231,75 (Sharg 328) |
  | `KOLBA-`, „własny” | 32 | Kolby (właściciel) | 710608191 `KOLBA-401-000`: BL 102,23 = Kolba `401-000` 102,23 |
  | `KOLBA-`, wspólny | 5 | Kolby (właściciel) | 710615545 `KOLBA-034-095`: BL 95,20 = Kolba `034-095` |
  | `SHARG-`, wspólny | 9 | Spechurta | 710960504 `SHARG-6526`: BL 96,00 = Spechurt `6636` |
  | `SHARG-`, wspólny | 1 | Kolby | 710963366 `SHARG-4776`: BL 29,09 = Kolba `404-142` |
  | `SPECHURT-`, „własny” | 2 | Spechurta (właściciel) | 711050226 `SPECHURT-19983`: BL 76,00 = Spechurt `19983` |
  | `SPECHURT-`, „własny” | 1 | Kolby | 711051273 `SPECHURT-22657`: BL 97,30 = Kolba `034-037` |
  | `SPECHURT-`, wspólny | 1 | Spechurta (właściciel) | 711033562 `SPECHURT-6635`: BL 63,20 = Spechurt `6635` |
  | **razem** | **178** | 130 Kolby, 48 Spechurta | |

  Wzrost z 20 (audyt rano) do 162 rekordów „własnych” Sharga (diagnoza po południu) tłumaczy dzienny sync Kolby 13:25 UTC (`kolba-sync-20261026-142504.log`), który przyszedł po syncu Sharga 00:50 UTC i Spechurta 06:50 UTC. Poprawka 63f8701 (ceny tylko na rekordach, których hurtownia jest członkiem) potwierdzona jako trafiająca w przyczynę — decyzja tj: dalej. Otwarte, nie gonione teraz: Spechurt ma 191 własnych rekordów `SPECHURT-` z rozjazdem, a jego feed był wygenerowany 2026-10-26 15:11 czasu polskiego, długo po syncu 05:40 UTC — podgląd przed merge (`diag-prices --other-feeds`) oddzieli „feed zmienił się po syncu” od „nadpisany przez inną hurtownię”.
- 2026-10-26 tj: red proof ceny zamieniony na test nadpisywania przez sync innej hurtowni; pytanie o cenę Sharga (price = SRP?) wydzielone do O-37
- 2026-10-26 agent — **diagnoza cen (punkt 1), wynik z serwera** (`diag-prices.ts`, commit 9929bf9, 14:27–14:29 UTC; pliki u tj: `diag-{sharg,kolba}.{md,json}`, `rozjazdy-*.csv`). Bez poprawek — STOP dla tj.

  **Mechanizm (dowód z kodu):** `planSync` (`xml-integration/bl-write.ts`) pisze cenę na każdy rekord, który trafi klucz (EAN między hurtowniami), bez filtra asortymentu. Parametr `SKU <Hurtownia>`, po którym audyt i diagnoza rozpoznają „rekord wspólny” (`recordSuppliers`), pisze tylko **import** — a import przyjmuje tylko produkty przechodzące filtr. Rekord trafiany przez EAN syncu innej hurtowni, której import ten produkt odfiltrował, nie ma jej parametru: liczy się jako „własny”, a jego cenę pisze sync, który biegł **ostatni** (noc: Kolba 22:55 → Sharg 00:50 → Spechurt 06:50 UTC; 26.10 dodatkowo dzienny sync Kolby 13:25 UTC, `kolba-sync-20261026-142504.log`, czas w nazwie polski).

  **Sharg (178 = 162 „własne” + 16 wspólne):**

  | przyczyna | rekordy „własne” | wspólne | przykład prześledzony |
  | --- | --- | --- | --- |
  | rekord innej hurtowni (SKU `KOLBA-`/`SPECHURT-`) trafiany przez EAN Sharga — Sharg nie jest zapisanym członkiem; cenę pisze ostatni sync (tu Kolba 13:25 UTC) | 35 (Kolba 32, Spechurt 3) | — | 710608191 `KOLBA-401-000`: feed Sharga 128,00; BL 102,23 / 132,90 = 102,23 × 1,3; diagnoza Kolby nie ma na nim rozjazdu, czyli BL = cena z feedu Kolby |
  | rekord Sharga (SKU `SHARG-`) trafiany przez EAN syncu Spechurta/Kolby, których import go nie przyjął — ostatni sync wygrywa (wiodąca hipoteza, 1 prześledzony; potwierdzenie: odczyt niżej) | 127 | — | 710960249 `SHARG-5652`: tylko `SKU Sharg`, a stan **8 w magazynie Spechurta** `bl_157485` (H3) — sync Spechurta pisze ten rekord; BL 231,75 / 301,28 = spójna para innej hurtowni; feed Sharga 328 |
  | rekord wspólny zapisany parametrami (HA-2.39) | — | 16 | 710960504 |
  | kilka pozycji feedu → jeden rekord | 0 | 0 | — |
  | feed zmienił się po syncu | 0 | 0 | sync 00:50 UTC i diagnoza czytały ten sam feed: `generated=2026-10-25 22:19:07`, 248,7 MB |
  | sync nie zapisał (BL odrzucił) | 0 | 0 | `counter` 2402 = wysłane 2402, `warnings` 0 |

  Wykluczone z kodu: (a) inny feed — cron (`run-bl.sh` → skrypt importu `sync` → `fetchAndParse` → `connectors.sharg.config.xml_url`, `SHARG_TOKEN_FULL`, `type=full`) i diagnoza czytają ten sam URL tym samym parserem; (b) zły cel zapisu — `planSync` dla 710960249 buduje `{ "104512": 328, "104511": 426.4 }`, to te same grupy, z których diagnoza czyta BL. Zostaje (c): ten sam rekord nadpisuje sync innej hurtowni. Znak: BL niżej w 164/178 — Kolba i Spechurt mają niższą cenę niż `price` Sharga (patrz pytanie o SRP).

  **Kolba (3 z 520):**

  | przyczyna | liczba | przykład |
  | --- | --- | --- |
  | feed zmienił się po syncu (Last-Modified 13:55 UTC > sync 13:25 UTC) | 2 | 710578230 `KOLBA-492-016`: feed 20,22, BL 19,36 / 25,17 = 19,36 × 1,3 |
  | pole „Marża %” w chwili diagnozy = 0% (BL 551 = 380 × 1,45 z wcześniejszego zapisu) | 1 | 710340232 `KOLBA-764-006` |
  | (z audytu, wnioskowane) rekordy Kolby nadpisane w nocy przez sync Sharga/Spechurta przez EAN, odzyskane dziennym syncem Kolby 13:25 UTC | ok. 517 | — |

  764-006 to **nie błąd diagnozy**: diagnoza i sync czytają pole tą samą funkcją (`readMarginRaw` → `chooseMargin` → `planSync`, ten sam `getInventoryProductsData`, klucz `extra_field_31810`); `narzut 0` w CSV znaczy, że pole miało o 14:28 wartość dającą 0% („0”). Sync 13:25 UTC policzył 1 produkt z pola — 551 pasuje do 45% w tamtej chwili; między 13:25 a 14:28 pole zmieniło się na 0 albo rekord nie był wśród 3619 dopasowań syncu (diagnoza ma 3620). Uwaga: przy „0” najbliższy sync zapisze 380 — sprzedaż po cenie zakupu.

  **Propozycja poprawki (do akceptacji tj):** sync pisze **ceny** tylko na rekordach, których hurtownia jest członkiem (prefiks SKU albo parametr `SKU <Hurtownia>`; dane już czytane razem z polem marży); na rekordzie trafionym przez EAN bez członkostwa pisze tylko stan we własnym magazynie, a w logu `prices skipped: N (record of another supplier)`. Rekordy wspólne z parametrami — bez zmian do HA-2.39. Audyt i diagnoza: „wspólny” = zapisany parametrami **albo** trafiany przez feedy ≥ 2 hurtowni. Dodatkowo log treści ostrzeżeń BL (dziś tylko liczba). Red proof: SHARG 5652 — sync Spechurta trafiający rekord Sharga przez EAN nie nadpisuje ceny Sharga (przed poprawką nadpisuje). Kryterium „231,75 przed → 328 po” zależy od pytania o SRP.

  **Otwarte pytanie — `price` Sharga to cena zakupu czy SRP?** Konektor bierze cenę zakupu z `size/price@gross` (SCHEMAS.md: „cena zakupu”). W feedzie `price` = `srp` w **każdym** produkcie: 103621 (328 = 328, a do tego `omnibus_price_retail` 328) oraz wszystkie produkty próbek `sharg_full_sample.xml` (6/6) i `sharg_light_sample.xml` (100/100); ceny kończą się na 8 (78, 328, 398) jak detaliczne. Cena zakupu równa sugerowanej detalicznej jest niemożliwa dla odsprzedawcy, więc `price` to najpewniej cena detaliczna sklepu `shop=3` z adresu feedu. Kandydaci na cenę hurtową: `strikethrough_wholesale_price` (103621: 181,06; w próbce 49 przy 78 — tylko przy części produktów, brak w feedzie `light`) i `iaiext:omnibus_price_wholesale` (103621: 270,40 — najniższa cena hurtowa z 30 dni, wymóg Omnibus; niespójna z 181,06). Żadne pole nie jest pewne bez Sharga: która konfiguracja feedu (`shop`, cennik klienta) daje cenę hurtową klienta i jak ma się do faktury za jeden produkt. Jeśli `price` to SRP, każda cena sprzedaży Sharga w BL = SRP × 1,3. Red proofa SHARG 5652 nie buduję, dopóki to nie zostanie rozstrzygnięte.
- 2026-10-26 tj: kryterium audytu — po drugiej nocy (zgodnie z D2)
- 2026-10-26 tj: kryterium wagi zawężone do rekordów przyjmowanych przez import (opcja C); rekordy spoza filtra → deferred
- 2026-10-26 tj (review punktów 2–4): D1 — gdy feed nie ma poprawnego EAN, import zachowuje EAN, który rekord BL już ma (wybór agenta, przyjęty); `ean-report.ts` liczy dodatkowo rekordy BL, których obecny EAN ma złą cyfrę kontrolną (liczba + do 10 przykładów z ID produktu i hurtownią). D2 — ponowny audyt HA-2.37 po **drugiej** nocy z nowym kodem (pierwsza tylko zapisuje liczniki bezpiecznika); bez ręcznych zmian pliku licznika. D3 — dalej z follow-upami: push gałęzi `wip/ha-2.38-ean-zerowanie-waga` (bez PR), kolizje GTIN-14 w obrębie feedu w raporcie EAN, dowód exit ≠ 0 bezpiecznika, ustalenia wagi, wpis o bezpieczniku do deferred.
- 2026-10-26 tj (start): model claude-opus-5-5 / high zatwierdzony. Kolejność: najpierw diagnoza cen bez poprawek — STOP z tabelą przyczyna → liczba i proponowaną poprawką; EAN, wycofane i waga równolegle. Diagnoza na danych z serwera: `scripts/diag-prices.ts` (tylko odczyt, BL przez `readonly.ts`) jako pierwszy, osobny PR; tj uruchamia na serwerze i wkleja wynik. Fixture do red proofa SHARG 5652 z fragmentu feedu z diagnozy. Dodatkowa bramka STOP: przed pierwszym przebiegiem z nową normalizacją EAN na serwerze dry-run — ile rekordów zmieniłoby EAN w BL i ile dopasowań się zmieni. Ponowny audyt HA-2.37 dopiero po pierwszej nocy z nowym kodem.
- 2026-10-26 agent (odczyt kodu, przed diagnozą): `planSync` (bl-write.ts) zapisuje `priceUpdates[id]` dla każdej pozycji feedu po kolei, więc gdy kilka pozycji feedu trafia w jeden rekord (ten sam EAN albo SKU), w BL zostaje cena **ostatniej**; audyt porównuje każdą pozycję osobno i liczy pozostałe jako rozjazd. Ten sam kształt co SHARG 5652 (BL 231,75 / 301,28 = spójna para z innej ceny). Hipoteza do potwierdzenia skryptem — nic jeszcze nie poprawione.
- 2026-10-26 tj: poprawka planu — hipoteza „rekord wspólny nadpisany przez Spechurt” nie tłumaczy SHARG 5652 (`rekord_wspolny = nie`, sprzedaż 301,28 = 231,75 × 1,3); dotyczy tylko rekordów wspólnych. Dla rekordów jednej hurtowni diagnoza szuka przyczyny po stronie syncu. Format EAN zatwierdzony: zapis GTIN-13 (gdy się da), porównanie po GTIN-14.
- 2026-10-26 tj (plan po audycie HA-2.37): liczby w Celu z raportu audytu na serwerze z 2026-10-26. Mapowanie marek Kolby, `permit_review` (70) i kandydaci duplikatów bez EAN (2 + 18) — po stronie klienta albo odłożone, poza tym zadaniem.
