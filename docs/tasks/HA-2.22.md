---
id: HA-2.22
title: Marża per produkt ustawiana ręcznie w BaseLinkerze (pole dodatkowe)
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Klient chce sprawdzić, czy ręczne nadawanie marży wybranym produktom w panelu BaseLinkera ma sens. Dziś to niemożliwe: tryb `sync` w `scripts/xml-to-baselinker.ts` przy każdym przebiegu przelicza cenę = zakup × (1 + marża z env) i nadpisuje grupę cenową sprzedaży, więc każda ręczna zmiana w BL znika. Sukces: produkt w katalogu 119068 może mieć w polu dodatkowym „Marża %” własną stawkę; import i sync liczą wtedy cena = zakup × (1 + marża produktu), a pole puste = marża hurtowni z env (`BASELINKER_MARKUP_*`, dziś 30). Ręczna marża przeżywa każdy import i sync. Klient edytuje ją w panelu BL, bez arkusza.

## Zakres
- [ ] odczyt stanu: `computeSellingPrice`, tryby `import` i `sync`, jak sync dziś pobiera dane produktów (czy w ogóle czyta produkty z BL, czy tylko indeks EAN/SKU), limity API
- [ ] pole dodatkowe „Marża %” w katalogu 119068 — zakłada tj w panelu (STOP); ID pola jako input `BASELINKER_EXTRA_FIELD_MARGIN` w rejestrze HA-2.16
- [ ] odczyt pola przez `getInventoryProductsData` (`src/lib/baselinker/readonly.ts`) dla produktów, które sync/import aktualizuje; parsowanie: „45”, „45%”, „45,5” → 45.5
- [ ] walidacja: liczba w zakresie 0–200; wartość nieprawidłowa → marża z env + ostrzeżenie w logu z ID produktu (nigdy cena 0, nigdy przerwanie całego przebiegu)
- [ ] produkt wspólny dla kilku hurtowni (ten sam EAN): marża z pola ma pierwszeństwo przed env każdej z nich
- [ ] import nigdy nie zapisuje pola „Marża %” (pole należy do klienta, jak tag `permit_off`)
- [ ] podsumowanie w logu: ile produktów z ręczną marżą, ile odrzuconych wartości
- [ ] `--dry-run`: tabela ≥ 5 produktów (ID, zakup, marża użyta, źródło marży env/pole, cena przed, cena po)
- [ ] audyt HA-2.37 (`scripts/audit-import.ts`, sekcja A) liczy oczekiwaną cenę z marżą z pola „Marża %”, gdy jest ustawione, zamiast zawsze z env — inaczej każdy produkt z ręczną marżą wyjdzie jako rozbieżność ceny
- [ ] krótka instrukcja dla klienta (`docs/ops` lub osobny plik): jak ustawić marżę produktu w panelu, kiedy zmiana wejdzie (najbliższy sync — godziny z crontaba, `docs/ops/serwer-importu.md` § 7), że ręczna zmiana CENY nadal będzie nadpisana — zmienia się marżę, nie cenę

## Gotowe, gdy
- test: pole puste → env; pole 45 → zakup × 1,45; pole „abc”/-5/250 → env + ostrzeżenie — **jak sprawdzić:** testy jednostkowe
- red proof: ręczna marża przeżywa sync — **jak sprawdzić:** test na atrapie BL (mock) pokazujący, że przed zmianą sync nadpisywał, po zmianie nie
- red proof: import nie wysyła pola „Marża %” w żadnym zapisie — **jak sprawdzić:** test na payloadzie
- audyt HA-2.37: produkt z polem „Marża %” = 45 i ceną zakup × 1,45 nie jest raportowany jako rozbieżność ceny — **jak sprawdzić:** test jednostkowy
- dry-run ≥ 5 produktów — **jak sprawdzić:** wklejona tabela z danych katalogu 119068 (odczyt)

## Poza zakresem
- marże z arkusza → po aneksie; dotychczasowa treść zadania przeniesiona do `docs/deferred-tasks.md` (wpis 2026-10-26)
- marże per kategoria/marka → HA-2.05
- ręcznie zmieniona cena, nazwa, opis → nadal nadpisywane przez import/sync
- produkty bez ceny zakupu → bez zmian (HA-2.05)

## Bramki STOP
- założenie pola „Marża %” w panelu BL — tj
- ustawienie `BASELINKER_EXTRA_FIELD_MARGIN` na serwerze — tj
- pierwszy sync z nową logiką na serwerze — tj, po akceptacji dry-runu

## Kontekst
- `scripts/xml-to-baselinker.ts`, `src/lib/baselinker/readonly.ts`, `config/inputs.ts` (rejestr HA-2.16), `docs/ops/serwer-importu.md` (harmonogram, crontab), `docs/tasks/HA-2.05.md`, O-07, O-32

## Notatki z realizacji
- 2026-10-06 tj: (poprzednia wersja zadania — marże z arkusza) start dopiero po aneksie.
- 2026-10-26 tj: zmiana zakresu po rozmowie z klientem — ręczna marża w BL zamiast arkusza.
