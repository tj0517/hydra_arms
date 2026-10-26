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
- red proof ceny: SHARG 5652 — test na danych tego produktu pokazuje nieaktualną cenę zakupu (231,75) przed poprawką i cenę z feedu (328) po niej — **jak sprawdzić:** nazwa testu w `npm run test:unit`; po cofnięciu poprawki test pada
- normalizacja EAN: `192687280759` i `0192687280759` to ten sam klucz; 11-cyfrowy EAN Sharga z zerem z feedu zachowuje zero — **jak sprawdzić:** testy `bl-match-key` + konektora Sharga; red proof: bez normalizacji test „Kolba + Spechurt, ten sam towar” daje dwa rekordy
- raport par do scalenia (liczba + CSV) — **jak sprawdzić:** wklejone podsumowanie z odczytu katalogu 119068 (uruchamia tj)
- zerowanie: rekord z kodem hurtowni, którego nie ma w feedzie → stan 0 tylko w magazynie tej hurtowni, inne magazyny bez zmian — **jak sprawdzić:** test na atrapie BL
- red proof bezpiecznika: feed z liczbą produktów 89% poprzedniej → zero zapisów, `exit ≠ 0`; 90% → zerowanie idzie — **jak sprawdzić:** testy jednostkowe (bez sieci)
- waga: przypadek graniczny (np. 3 g) nie daje 0 w payloadzie — **jak sprawdzić:** test na payloadzie `toBLProduct`
- ponowny audyt HA-2.37 na serwerze po pierwszej nocy z nowym kodem: osierocone ze stanem > 0 = 0; rozjazdy cen na rekordach jednej hurtowni (Sharg i Kolba) = 0 albo każdy przypisany do wyjaśnionej przyczyny (np. zmiana feedu po syncu); rozjazdy na rekordach wspólnych — oczekiwane do HA-2.39; „brak wagi — źródło import — przyjęte” = 0; „poza filtrem” podane jako liczba — **jak sprawdzić:** wklejone tabele A i F z raportu, `grep -cE 'key=|token='` = 0
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
- 2026-10-26 tj: kryterium wagi zawężone do rekordów przyjmowanych przez import (opcja C); rekordy spoza filtra → deferred
- 2026-10-26 tj (review punktów 2–4): D1 — gdy feed nie ma poprawnego EAN, import zachowuje EAN, który rekord BL już ma (wybór agenta, przyjęty); `ean-report.ts` liczy dodatkowo rekordy BL, których obecny EAN ma złą cyfrę kontrolną (liczba + do 10 przykładów z ID produktu i hurtownią). D2 — ponowny audyt HA-2.37 po **drugiej** nocy z nowym kodem (pierwsza tylko zapisuje liczniki bezpiecznika); bez ręcznych zmian pliku licznika. D3 — dalej z follow-upami: push gałęzi `wip/ha-2.38-ean-zerowanie-waga` (bez PR), kolizje GTIN-14 w obrębie feedu w raporcie EAN, dowód exit ≠ 0 bezpiecznika, ustalenia wagi, wpis o bezpieczniku do deferred.
- 2026-10-26 tj (start): model claude-opus-5-5 / high zatwierdzony. Kolejność: najpierw diagnoza cen bez poprawek — STOP z tabelą przyczyna → liczba i proponowaną poprawką; EAN, wycofane i waga równolegle. Diagnoza na danych z serwera: `scripts/diag-prices.ts` (tylko odczyt, BL przez `readonly.ts`) jako pierwszy, osobny PR; tj uruchamia na serwerze i wkleja wynik. Fixture do red proofa SHARG 5652 z fragmentu feedu z diagnozy. Dodatkowa bramka STOP: przed pierwszym przebiegiem z nową normalizacją EAN na serwerze dry-run — ile rekordów zmieniłoby EAN w BL i ile dopasowań się zmieni. Ponowny audyt HA-2.37 dopiero po pierwszej nocy z nowym kodem.
- 2026-10-26 agent (odczyt kodu, przed diagnozą): `planSync` (bl-write.ts) zapisuje `priceUpdates[id]` dla każdej pozycji feedu po kolei, więc gdy kilka pozycji feedu trafia w jeden rekord (ten sam EAN albo SKU), w BL zostaje cena **ostatniej**; audyt porównuje każdą pozycję osobno i liczy pozostałe jako rozjazd. Ten sam kształt co SHARG 5652 (BL 231,75 / 301,28 = spójna para z innej ceny). Hipoteza do potwierdzenia skryptem — nic jeszcze nie poprawione.
- 2026-10-26 tj: poprawka planu — hipoteza „rekord wspólny nadpisany przez Spechurt” nie tłumaczy SHARG 5652 (`rekord_wspolny = nie`, sprzedaż 301,28 = 231,75 × 1,3); dotyczy tylko rekordów wspólnych. Dla rekordów jednej hurtowni diagnoza szuka przyczyny po stronie syncu. Format EAN zatwierdzony: zapis GTIN-13 (gdy się da), porównanie po GTIN-14.
- 2026-10-26 tj (plan po audycie HA-2.37): liczby w Celu z raportu audytu na serwerze z 2026-10-26. Mapowanie marek Kolby, `permit_review` (70) i kandydaci duplikatów bez EAN (2 + 18) — po stronie klienta albo odłożone, poza tym zadaniem.
