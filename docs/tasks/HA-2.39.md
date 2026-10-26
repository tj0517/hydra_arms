---
id: HA-2.39
title: Wycena produktów wspólnych dla kilku hurtowni — cena zakupu per hurtownia, krok „wycena” po nocnych syncach
status: review
difficulty: M
model: claude-opus-5-5
model_approved: null
effort: high
branch: feat/ha-2.39-wycena-wspolnych
due: null
depends_on: [HA-2.38, HA-2.22]
blocked_by_questions: []
touches_db: false
touches_prod: true
pr: 69
---

## Cel
Rekord wspólny (jeden EAN, kilka hurtowni) ma dziś cenę hurtowni, której sync przeszedł ostatni w nocy (O-32): zwykle Spechurtu, także gdy Spechurt nie ma towaru albo jest najdroższy. Każdy sync nadpisuje też wspólną grupę „Cena zakupu”, więc cena zakupu drugiej hurtowni w ogóle nie zostaje w BL.

Sukces:
- każda hurtownia zapisuje cenę zakupu do własnej grupy cenowej;
- po ostatnim syncu nocy osobny krok „wycena” ustala cenę rekordów wspólnych z danych w BL: najtańsza cena zakupu wśród hurtowni z towarem, plus marża;
- sync pojedynczej hurtowni nie rusza ceny sprzedaży rekordu wspólnego.

## Zakres
- [ ] odczyt stanu: `runSync` (zapis cen dla każdego dopasowanego produktu, także rekordów innej hurtowni), `toBLProduct`, `recordIdentity` / parametry `SKU <Hurtownia>` (`bl-match-key.ts`), marża z pola „Marża %” po HA-2.22, `scripts/server/run-bl.sh` (argumenty `<hurtownia> <tryb>`), crontab w `docs/ops/serwer-importu.md` § 10; liczba rekordów wspólnych po HA-2.38 (normalizacja EAN zmienia ten zbiór)
- [ ] grupy cenowe „Zakup Kolba”, „Zakup Sharg”, „Zakup Spechurt” w katalogu 119068 — zakłada tj w panelu (STOP). ID jako inputy w rejestrze HA-2.16 (`config/inputs.ts`): `BASELINKER_PRICE_GROUP_PURCHASE_KOLBA` / `_SHARG` / `_SPECHURT`
- [ ] import i sync każdej hurtowni zapisują cenę zakupu do jej grupy (każdy rekord, który ta hurtownia dopasuje, również wspólny **i rekord dopasowany tylko przez EAN, bez członkostwa — decyzja 2026-10-26**; tam nadal bez ceny sprzedaży i wspólnej „Ceny zakupu”). Na rekordzie jednej hurtowni dalej jak dziś: cena sprzedaży i wspólna „Cena zakupu”. Na rekordzie wspólnym: tylko własna grupa zakupu i stan we własnym magazynie — cenę sprzedaży i wspólną „Cenę zakupu” zostawiają wycenie
- [ ] „wspólny” = rekord z ceną > 0 we własnych grupach zakupu ≥ 2 hurtowni — tylko dane w BL, bez feedów (decyzja 2026-10-26; zastępuje „kody ≥ 2 hurtowni”) — jedna funkcja dla importu, syncu, wyceny i audytu
- [ ] krok „wycena” — tryb skryptu (np. `price-shared`) uruchamiany przez `run-bl.sh` pod tą samą blokadą `flock`; wrapper i `test-run-bl.sh` rozszerzone o ten tryb. Dane wyłącznie z BL (`getInventoryProductsList` + `getInventoryProductsData`), bez pobierania feedów
- [ ] reguła wyboru dla każdego rekordu wspólnego:
  - kandydaci = hurtownie z ceną > 0 we własnej grupie zakupu;
  - spośród nich te ze stanem > 0 we własnym magazynie (H1/H2/H3); najtańsza wygrywa;
  - żadna nie ma stanu → najtańsza w ogóle;
  - remis → stała kolejność Kolba, Sharg, Spechurt;
  - < 1 kandydata → rekord pominięty i liczony w podsumowaniu.
  
  Zapis: cena sprzedaży = wybrana × (1 + marża z pola „Marża %” produktu, inaczej env wybranej hurtowni), wspólna „Cena zakupu” = wybrana. Zapis wsadowy `updateInventoryProductsPrices`, tylko rekordy, których cena się zmienia
- [ ] `--dry-run` wyceny: tabela ≥ 10 rekordów wspólnych (ID, EAN, ceny zakupu per hurtownia, stany per magazyn, wybrana hurtownia i powód, marża i jej źródło, cena sprzedaży przed / po) oraz podsumowanie (ile zmian, ile pominiętych, rozkład wybranych hurtowni)
- [ ] crontab: nowa linia po syncu Spechurta (06:50 UTC + limit 600 s + 60 s → najwcześniej 07:01 UTC), z własnym `HYDRA_MAX_SECONDS`. Uwaga w instrukcji: sklep kopiuje BL o 02:00 UTC, więc wycena trafia do sklepu następnej nocy (przesunięcie crona Vercela — deferred, HA-2.09)
- [ ] audyt HA-2.37 (`scripts/audit-import.ts`, sekcja A): rekord wspólny porównywany z regułą wyceny, nie z ceną pojedynczej hurtowni; cena zakupu porównywana z grupą danej hurtowni
- [ ] pytanie do klienta O-36 (reguła „najtańsza dostępna” kontra stały priorytet hurtowni; alokacja zamówień w BL do tej samej hurtowni) — budujemy na „najtańsza dostępna”, odpowiedź nie blokuje
- [ ] `docs/ops/serwer-importu.md`: grupy cenowe, tryb wyceny, linia crontaba, czytanie podsumowania

## Gotowe, gdy
- reguła wyboru: testy jednostkowe dla — dwie hurtownie ze stanem (wygrywa tańsza); tańsza bez stanu, droższa ze stanem (wygrywa droższa); żadna bez stanu (wygrywa najtańsza); remis (kolejność stała); marża z pola kontra env wybranej hurtowni — **jak sprawdzić:** nazwy testów w `npm run test:unit`
- red proof: rekord wspólny Kolba 100 (stan 5) / Spechurt 80 (stan 0), sync Spechurta po zmianie nie zmienia ceny sprzedaży, a wycena daje 100 × (1 + marża) — przed zmianą test pokazuje cenę ze Spechurta — **jak sprawdzić:** test na atrapie BL
- red proof: sync zapisuje cenę zakupu tylko do grupy swojej hurtowni na rekordzie wspólnym (payload bez grupy sprzedaży i wspólnej zakupu) — **jak sprawdzić:** test na payloadzie
- wycena nie pobiera feedów i nie woła metod spoza zapisu cen — **jak sprawdzić:** test / grep listy wywołań w trybie mock
- dry-run na katalogu 119068 (uruchamia tj, odczyt): tabela ≥ 10 rekordów wspólnych + podsumowanie — **jak sprawdzić:** wklejony wynik, `grep -cE 'key=|token='` = 0
- wrapper: `test-run-bl.sh` zielony z nowym trybem; `crontab -l` z nową linią (po STOP) — **jak sprawdzić:** wklejone wyniki z serwera
- pierwsza noc: wpis `END exit=0` dla wyceny, ponowny audyt HA-2.37 bez rozjazdów cen rekordów wspólnych poza zmianami feedu — **jak sprawdzić:** wklejone linie dziennika i tabela A

## Poza zakresem
- alokacja zamówień do hurtowni w BL (automatyzacje BL, O-14) — tylko pytanie O-36
- priorytet hurtowni zamiast „najtańszej” — po odpowiedzi klienta, zmiana reguły w danych
- przesunięcie crona Vercela `/api/shop/sync` po wycenie → HA-2.09 / deferred
- scalanie rekordów o tym samym EAN → HA-2.38 (raport) i decyzja tj

## Bramki STOP
- założenie trzech grup cenowych w panelu BL i ID na serwerze — tj
- treść linii crontaba — pokaż i czekaj; instaluje tj z pliku
- pierwsza wycena na żywo — tj, po akceptacji dry-runu
- każde uruchomienie skryptu importu/wyceny — tj na serwerze (hook)

## Kontekst
- `scripts/xml-to-baselinker.ts`, `xml-integration/bl-match-key.ts`, `xml-integration/import-audit.ts`, `scripts/audit-import.ts`
- `scripts/server/run-bl.sh`, `scripts/server/test-run-bl.sh`, `docs/ops/serwer-importu.md` § 7, § 10
- `config/inputs.ts` (HA-2.16), `docs/tasks/HA-2.22.md` (pole „Marża %”)
- `docs/04-open-questions.md` — O-07, O-14, O-32, O-36

## Notatki z realizacji
- 2026-10-26 tj: sync BL → Supabase (cron Vercela, 02:00 UTC) biegnie przed syncami Sharga i Spechurta i przed wyceną, więc sklep pokazuje ceny z opóźnieniem ok. 1 doby. Do rozważenia przesunięcie go na po 07:01 UTC — osobna decyzja tj, nie blokuje tego zadania.
- 2026-10-26 tj (plan po audycie HA-2.37): reguła domyślna „najtańsza dostępna”; pytanie do klienta O-36 nie blokuje. Zależy od HA-2.38 (normalizacja EAN zmienia zbiór rekordów wspólnych, zerowanie wycofanych zmienia „stan > 0”) i HA-2.22 (pole „Marża %”).
- 2026-10-26 tj (decyzje przed startem): (1) budujemy teraz, wdrożenie na serwer dopiero po ponownym audycie HA-2.38 (po jego drugiej nocy), żeby ten audyt mierzył samo HA-2.38 — kolejność wdrożenia w opisie PR; (2) na rekordzie dopasowanym tylko przez EAN (hurtownia nie jest członkiem — reguła HA-2.38) hurtownia zapisuje cenę zakupu do SWOJEJ grupy zakupu, nadal bez ceny sprzedaży i wspólnej „Ceny zakupu”; „wspólny” dla wyceny = rekord z ceną > 0 we własnych grupach zakupu ≥ 2 hurtowni (tylko dane w BL, bez feedów) — zastępuje definicję „kody ≥ 2 hurtowni”; (3) Sharg porównywany normalnie, dopóki O-37 (czy `price` Sharga to SRP) jest otwarte — bez wyjątków.
- 2026-10-26 tj: przestarzała własna cena zakupu (hurtownia przestała prowadzić rekord) — **opcja A, szerokie sprzątanie**: każdy sync ustawia stan 0 we własnym magazynie i czyści własną grupę zakupu na każdym rekordzie, którego dzisiejszy feed tej hurtowni już nie trafia, a który ma u niej stan > 0 albo własną cenę zakupu > 0 — z kodem hurtowni (jak HA-2.38) i bez (rekord dopasowany wcześniej tylko przez EAN); ten sam bezpiecznik 90%. Grupy cenowe: tj zakłada je później — do tego czasu placeholdery w `docs/ops/serwer-importu.md`.
- 2026-10-26 tj: linia crontaba wyceny — **07:02 UTC**, `HYDRA_MAX_SECONDS=600` (`2 7 * * * HYDRA_MAX_SECONDS=600 /home/hydra-import/hydra/scripts/server/run-bl.sh all price-shared 2>>/home/hydra-import/cron-stderr.log`), nie 07:01: 06:50 + 600 s + 60 s = dokładnie 07:01, a § 7 wymaga odstępu większego niż limit + 60 s. Instaluje tj po pierwszej wycenie na żywo, po ponownym audycie HA-2.38.
- 2026-10-26 agent — realizacja: `xml-integration/shared-pricing.ts` (ID grup z env — trzy albo żadna, jedna definicja „wspólny” `isSharedByPurchase`, reguła `chooseSupplier`, cena `priceSharedRecord`), `bl-write.ts` (`planSync`/`toBLProduct`/`planZeroing`/`runSharedPricing`), tryb `price-shared [--dry-run [--out=<dir>]]` w skrypcie importu, `run-bl.sh all price-shared`, audyt A, inputy. Ustalenia: (1) podgląd wyceny na 119068 pokaże rekordy wspólne dopiero po **jednej nocy** synców z ustawionymi ID — wcześniej żadna własna grupa nie ma ceny (`0 shared`); w tę noc rekord wspólny zachowuje cenę hurtowni, która zsynchronizowała go pierwsza, wycena następnego dnia poprawia to przed kopiowaniem o 02:00 UTC; (2) „< 1 kandydata → pominięty” jest po decyzji 2 nieosiągalne (wspólny ⇒ ≥ 2 kandydatów) — `skipped` liczy rekordy, dla których BL nie zwrócił danych albo których bieżące ceny już nie czynią wspólnymi; (3) import wysyła w `addInventoryProduct` całą bieżącą listę cen rekordu plus własną grupę — dokumentacja BL nie mówi, czy aktualizacja zostawia niewysłane grupy; (4) czy BL przyjmuje cenę 0 w grupie (czyszczenie z decyzji A) — niesprawdzone, kontrola w logu pierwszej nocy (deferred); (5) liczby rekordów wspólnych wg decyzji 2 nie da się odczytać z sesji agenta (dane tylko w BL, grupy jeszcze nie istnieją) — pokaże ją podgląd (`N products in BL, S shared`).
