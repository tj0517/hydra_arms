---
id: HA-2.22
title: Marża per produkt ustawiana ręcznie w BaseLinkerze (pole dodatkowe)
status: done
difficulty: M
model: claude-opus-5-5
model_approved: null
effort: null
branch: feat/ha-2.22-marza-reczna
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 65
---

## Cel
Klient chce sprawdzić, czy ręczne nadawanie marży wybranym produktom w panelu BaseLinkera ma sens. Dziś to niemożliwe: tryb `sync` w `scripts/xml-to-baselinker.ts` przy każdym przebiegu przelicza cenę = zakup × (1 + marża z env) i nadpisuje grupę cenową sprzedaży, więc każda ręczna zmiana w BL znika. Sukces: produkt w katalogu 119068 może mieć w polu dodatkowym „Marża %” własną stawkę; import i sync liczą wtedy cena = zakup × (1 + marża produktu), a pole puste = marża hurtowni z env (`BASELINKER_MARKUP_*`, dziś 30). Ręczna marża przeżywa każdy import i sync. Klient edytuje ją w panelu BL, bez arkusza.

## Zakres
- [x] odczyt stanu: `computeSellingPrice`, tryby `import` i `sync`, jak sync dziś pobiera dane produktów (czy w ogóle czyta produkty z BL, czy tylko indeks EAN/SKU), limity API
- [ ] pole dodatkowe „Marża %” w katalogu 119068 — zakłada tj w panelu (STOP); ID pola jako input `BASELINKER_EXTRA_FIELD_MARGIN` w rejestrze HA-2.16 (wpis w rejestrze: zrobione; pole w panelu: tj)
- [x] odczyt pola przez `getInventoryProductsData` (`src/lib/baselinker/readonly.ts`) dla produktów, które sync/import aktualizuje; parsowanie: „45”, „45%”, „45,5” → 45.5
- [x] walidacja: liczba w zakresie 0–200; wartość nieprawidłowa → marża z env + ostrzeżenie w logu z ID produktu (nigdy cena 0, nigdy przerwanie całego przebiegu)
- [x] produkt wspólny dla kilku hurtowni (ten sam EAN): marża z pola ma pierwszeństwo przed env każdej z nich
- [x] import nigdy nie zapisuje pola „Marża %” (pole należy do klienta, jak tag `permit_off`)
- [x] podsumowanie w logu: ile produktów z ręczną marżą, ile odrzuconych wartości
- [x] `--dry-run`: tabela ≥ 5 produktów (ID, zakup, marża użyta, źródło marży env/pole, cena przed, cena po) — kod; wynik z katalogu 119068 uruchamia tj na serwerze
- [x] audyt HA-2.37 (`scripts/audit-import.ts`, sekcja A) liczy oczekiwaną cenę z marżą z pola „Marża %”, gdy jest ustawione, zamiast zawsze z env — inaczej każdy produkt z ręczną marżą wyjdzie jako rozbieżność ceny
- [x] krótka instrukcja dla klienta (`docs/ops` lub osobny plik): jak ustawić marżę produktu w panelu, kiedy zmiana wejdzie (najbliższy sync — godziny z crontaba, `docs/ops/serwer-importu.md` § 7), że ręczna zmiana CENY nadal będzie nadpisana — zmienia się marżę, nie cenę
- [x] `--only-bl-id=<id>`: import jednej hurtowni (i jej `--dry-run`) ograniczony do jednego produktu BL — do testu na jednym produkcie przed pełnym importem

## Gotowe, gdy
- test: pole puste → env; pole 45 → zakup × 1,45; pole „abc”/-5/250 → env + ostrzeżenie — **jak sprawdzić:** testy jednostkowe
- red proof: ręczna marża przeżywa sync — **jak sprawdzić:** test na atrapie BL (mock) pokazujący, że przed zmianą sync nadpisywał, po zmianie nie
- red proof: import nie wysyła pola „Marża %” w żadnym zapisie — **jak sprawdzić:** test na payloadzie
- audyt HA-2.37: produkt z polem „Marża %” = 45 i ceną zakup × 1,45 nie jest raportowany jako rozbieżność ceny — **jak sprawdzić:** test jednostkowy
- dry-run ≥ 5 produktów — **jak sprawdzić:** wklejona tabela z danych katalogu 119068 (odczyt)
- pole przeżywa import na jednym produkcie — **jak sprawdzić:** tj, panel BL po imporcie z `--only-bl-id` (`docs/ops/serwer-importu.md`, „Marża ręczna (HA-2.22)”, krok 4)

## Poza zakresem
- marże z arkusza → po aneksie; dotychczasowa treść zadania przeniesiona do `docs/deferred-tasks.md` (wpis 2026-10-26)
- marże per kategoria/marka → HA-2.05
- ręcznie zmieniona cena, nazwa, opis → nadal nadpisywane przez import/sync
- produkty bez ceny zakupu → bez zmian (HA-2.05)

## Bramki STOP
- założenie pola „Marża %” w panelu BL — tj
- test na jednym produkcie PRZED pełnym importem/syncem z nową logiką: tj ustawia „Marża %” na wskazanym produkcie → import ograniczony do niego (`--only-bl-id`) → tj sprawdza w panelu, że pole przeżyło i cena = zakup × (1 + marża); jeśli BL wyczyścił pole — stop i opcje
- ustawienie `BASELINKER_EXTRA_FIELD_MARGIN` na serwerze — tj
- pierwszy sync z nową logiką na serwerze — tj, po akceptacji dry-runu

## Kontekst
- `scripts/xml-to-baselinker.ts`, `src/lib/baselinker/readonly.ts`, `config/inputs.ts` (rejestr HA-2.16), `docs/ops/serwer-importu.md` (harmonogram, crontab), `docs/tasks/HA-2.05.md`, O-07, O-32

## Notatki z realizacji
- 2026-10-06 tj: (poprzednia wersja zadania — marże z arkusza) start dopiero po aneksie.
- 2026-10-26 tj: zmiana zakresu po rozmowie z klientem — ręczna marża w BL zamiast arkusza.
- 2026-10-26 agent: sesja WSL `/home/tj/hydra_arms`, `SUPABASE_TARGET=local`, hook `agent-guard.sh` załadowany. Gałąź `feat/ha-2.22-marza-reczna` od `docs/ha-2.22-marza-reczna` (PR #64). Model: Opus 5.5.
- 2026-10-26 agent, odczyt stanu: sync czytał z BL wyłącznie indeks (`getInventoryProductsList`, strony po 1000: EAN/SKU/ID), danych produktów nie czytał wcale; import już czytał `getInventoryProductsData` (po 100) dopasowanych produktów po filtrze, więc pole ma za darmo. Szacunek kosztu odczytu pola w syncu: Kolba ok. 3,5 tys. dopasowanych → ok. 14 wywołań po 250 (Sharg ok. 10, Spechurt ok. 8), +30–120 s do 61–89 s synca; do limitu API daleko. Lokalnie nie do zmierzenia (brak tokenu BL na WSL) — dry-run na serwerze wypisuje zmierzony czas.
- 2026-10-26 tj: opcja A — odczyt pola w każdym syncu (po 250 id, `readonly.ts`). **Wariant C** (jeden pełny odczyt pola na dobę + cache wspólny dla trzech hurtowni) — wrócić przy HA-2.09, jeśli synce zrobią się częste albo czas odczytu z dry-runu okaże się duży.
- 2026-10-26 agent, dokumentacja API BL (`addInventoryProduct`, odczyt api.baselinker.com 2026-10-26): o aktualizacji tylko „Entering the product with the ID updates previously saved product.”; `text_fields`: „A list containing field text values (names, descriptions, etc.) of a product, where the key is the field text ID”, klucze „name”, „description”, „features”, „description_extra1”…, „extra_field_[extra-field-ID] e.g. "extra_field_75"”. Zachowanie nie wysłanych kluczy `text_fields` przy aktualizacji **nie jest opisane** (opisane jest tylko dla tagów: „No tags are provided in the API request, the product retains its existing tags”, i zdjęć: „Images not included in the request will remain unchanged.”). Stąd bramka testu na jednym produkcie (decyzja tj 2026-10-26).
- 2026-10-26 agent, decyzje w kodzie (do oceny przy review):
  - nowe moduły: `xml-integration/margin.ts` (parsowanie, walidacja, wybór marży, `computeSellingPrice` przeniesione ze skryptu, liczniki), `xml-integration/bl-write.ts` (`toBLProduct` i cała ścieżka synca `runSyncCore` z wstrzykiwanymi wywołaniami BL) — skrypt woła je, żeby testy sprawdzały ten sam kod;
  - `BASELINKER_EXTRA_FIELD_MARGIN` puste = zachowanie sprzed HA-2.22 (marża z env, sync nic dodatkowo nie czyta, jedna linia ostrzeżenia); wartość inna niż liczba / `extra_field_<n>` przerywa uruchomienie (zła konfiguracja, nie dane klienta);
  - pole czytane z klucza `extra_field_<id>`, a gdy go nie ma — z jedynego wariantu językowego `extra_field_<id>|xx`; nadpisania per integracja (`…|xx|<source>`) ignorowane;
  - nieudany odczyt pola w syncu → stany zapisane, **żadna** cena sprzedaży nie jest zapisana (env skasowałby ręczne marże), wyjście `exit 1`; produkt, którego BL nie zwrócił w odczycie, zachowuje cenę (licznik `NOT written`);
  - produkt bez ceny zakupu (fallback na cenę brutto z feedu) — pole nie działa i nie wchodzi do liczników;
  - filtr asortymentu w imporcie liczy cenę z env (pole czytane jest dopiero dla przyjętych produktów); ma znaczenie dopiero przy `minPricePln > 0` (dziś 0);
  - ostrzeżenia o odrzuconych wartościach: do 50 linii z ID produktu, reszta w liczniku podsumowania;
  - dry-run korzysta teraz z `readonly.ts` także przy odczycie stanu własnego (wcześniej `client.ts`); z ustawionym polem czyta indeks i dane dopasowanych produktów, drukuje czas odczytu i tabelę (najpierw produkty z polem i odrzucone, potem env, min. 15 wierszy);
  - `--only-bl-id`: tylko import jednej hurtowni albo jej `--dry-run`, nie razem z `--limit`; brak dopasowania albo produkt odrzucony przez filtr → komunikat i `exit 1`, nic nie zapisane; dry-run z tą flagą wypisuje pola dodatkowe produktu (sposób na odczyt ID pola bez dokładania metody `getInventoryExtraFields` do allowlisty);
  - audyt: sekcja A liczy oczekiwaną cenę przez `expectedSalePrice` z polem rekordu, CSV `A_cena_rozbiezna.csv` dostał kolumnę `marza`, pod tabelą cen licznik dopasowań z ręczną marżą i odrzuconych.
- 2026-10-26 agent, dowody lokalne: `npx tsc --noEmit` czysto; eslint zmienionych i nowych plików 0 problemów; `npx tsx --test xml-integration/__tests__/margin.test.ts` 20/20; `npm run test:unit` (wprost: `npx tsx --test xml-integration/__tests__/*.test.ts`) 285/287 — padają tylko 2 znane `prod-guard` (WSL, deferred HA-2.27); `npx tsx --test config/inputs.test.ts` 32/33 — pada `P24_NOTIFY_ALLOWED_IPS is provisional but claims a real usage path`, identycznie bez zmian HA-2.22 (`git stash`, deferred 2026-10-16). Red proofy mutacyjne (każda mutacja cofnięta, potem 20/20): sync ignoruje pole → 4 testy padają (w tym „ręczna marża przeżywa sync”); payload importu z `extra_field_75` → pada test payloadu; audyt bez pola → pada test audytu; walidacja bez zakresu 0–200 → 3 testy; nieudany odczyt traktowany jak „pole wyłączone” → pada test nieudanego odczytu.
- 2026-10-26 agent: samego skryptu importu nie uruchamiałem (hook blokuje każdą komendę z jego nazwą, także dry-run w trybie mock) — ścieżka synca i payload są testowane przez wydzielone moduły, dry-run i `--only-bl-id` tylko przez `tsc`/eslint i przegląd; pierwsze uruchomienie to krok 2 z `docs/ops/serwer-importu.md`, „Marża ręczna (HA-2.22)”.
- 2026-10-26 tj: odbiór PR #65 — przyjęte przed merge'em (zamknięcie po fakcie, w pierwszym commicie HA-2.39)
