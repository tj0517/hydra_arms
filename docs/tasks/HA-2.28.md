---
id: HA-2.28
title: Klucz dopasowania importu BL — EAN między hurtowniami, SKU w obrębie hurtowni, SKU hurtowni w rekordzie
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
Import i sync (`scripts/xml-to-baselinker.ts`) dopasowują produkt w BaseLinkerze po EAN, a gdy go nie ma — po samym SKU w całym katalogu, bez względu na hurtownię. SKU Sharga i Spechurtu to gołe numery wierszy ich katalogów (9 016/9 019 i 6 161/6 161 numerycznych), które się nakładają: diagnostyka z serwera (2026-10-14, HA-2.15) pokazała, że pierwszy import Spechurtu nadpisałby 79 niezwiązanych produktów Sharga (ponczo ↔ kamizelka, kabura ↔ strzelba), a codzienny sync pisałby stan i cenę na 277 (Sharg) + 230 (Spechurt) obcych towarów. Wymaganie klienta: jeden rekord na jeden towar, bez duplikatów, z informacją skąd pochodzi i gdzie jest dostępny. Sukces: EAN pozostaje kluczem między hurtowniami, SKU łączy wyłącznie w obrębie tej samej hurtowni (import i sync tym samym kluczem), a rekord wspólny pokazuje SKU każdej hurtowni, która go ma. Decyzja tj 2026-10-14: SKU zapisywany do BL dostaje prefiks hurtowni.

## Zakres
- [ ] odczyt stanu bieżącego: `loadExistingProducts`, `findExistingId`, `runImport`, `runSync`, `toBLProduct` w `scripts/xml-to-baselinker.ts` (czytać narzędziem Read — hook blokuje Bash z nazwą skryptu); `xml-integration/feed-diagnostics.ts` i `scripts/xml-feed-diagnostics.ts` (HA-2.15); wynik diagnostyki z serwera z 2026-10-14 w notatkach HA-2.15; co `getInventoryProductsList` zwraca na produkt (`src/lib/baselinker/client.ts`)
- [ ] jedna funkcja klucza używana przez import, sync i diagnostykę: EAN → produkt z dowolnej hurtowni; brak EAN → SKU tylko tej samej hurtowni. Format SKU zapisywanego do BL: `<HURTOWNIA>-<sku z feedu>` (np. `SHARG-139`, `SPECHURT-1091`, `KOLBA-10630001`); dopasowanie po SKU porównuje pełny prefiksowany ciąg. STOP przed utrwaleniem formatu (zob. Bramki)
- [ ] SKU każdej hurtowni w parametrach produktu (`SKU Kolba`, `SKU Sharg`, `SKU Spechurt`) oraz parametr „Źródło opisu” = hurtownia, która ostatnio zapisała nazwę/opis. Parametry **scalane** z istniejącymi, nie nadpisywane: dla produktu dopasowanego po EAN z innej hurtowni skrypt dociąga istniejące parametry (tylko dopasowane produkty, nie cały katalog) i zachowuje cudze wpisy
- [ ] sync używa tej samej funkcji klucza co import (żadnej osobnej mapy)
- [ ] aktualizacja `xml-feed-diagnostics.ts` pod nowy klucz, tak żeby symulacja importu i syncu pokazywała dopasowania po prefiksowanym SKU; komenda dla tj do ponownego uruchomienia na serwerze
- [ ] testy jednostkowe w `xml-integration/__tests__/` (klucz, scalanie parametrów, prefiks) + dry-run na próbkach bez zmiany liczb przyjętych

## Gotowe, gdy
- red proof: dwa produkty różnych hurtowni z tym samym numerycznym SKU i bez EAN → dwa rekordy, nigdy jeden — **jak sprawdzić:** nazwa testu w `npm run test:unit`; po celowym usunięciu prefiksu z klucza test pada (wklejony wynik)
- ta sama hurtownia, ten sam SKU, bez EAN, dwa przebiegi → jeden rekord (aktualizacja, nie duplikat) — **jak sprawdzić:** nazwa testu w `npm run test:unit`
- ten sam EAN u dwóch hurtowni → jeden rekord, a jego parametry po drugim imporcie zawierają SKU obu hurtowni i „Źródło opisu” drugiej — **jak sprawdzić:** test scalania parametrów; red proof: wersja nadpisująca `features` gubi cudze SKU i test pada
- sync i import wołają tę samą funkcję klucza — **jak sprawdzić:** `grep -n` nazwy funkcji w `runImport` i `runSync` (narzędziem Grep) + test syncu na indeksie z prefiksowanymi SKU
- diagnostyka na serwerze po zmianie (uruchamia tj, `hydra-import`, po `git pull`): w symulacji importu „same SKU only (EAN gave no match) — earlier supplier: 0” dla każdej hurtowni i w symulacji syncu „found through the SKU alone: 0” dla każdej, przy niezmienionych „same EAN” (Sharg 5, Spechurt 122) — **jak sprawdzić:** wklejony wynik `npx tsx scripts/xml-feed-diagnostics.ts` z `grep -cE 'key=|token='` = 0
- liczby przyjętych w `--dry-run` na próbkach bez zmian względem `main`, `npx tsc --noEmit` czysto, pełny zestaw zielony (poza znanym `prod-guard.test.ts` w WSL, deferred HA-2.27) — **jak sprawdzić:** wklejone podsumowania

## Poza zakresem
- cena przy produkcie wspólnym (która hurtownia wygrywa, ping-pong ceny przez sync bez filtra asortymentu) → O-32
- własny kod towaru Hydry zamiast EAN/SKU hurtowni → O-34, osobne zadanie po odpowiedzi klienta
- 11-cyfrowe EAN Sharga (utracone zero wiodące) → deferred (HA-2.15)
- jakikolwiek zapis do BaseLinkera, pierwszy import, crontab → HA-2.15 (wznowienie od kroku 8 po merge'u tego zadania)
- filtr asortymentu w syncu → deferred (HA-2.15)

## Bramki STOP
- przed utrwaleniem formatu SKU zapisywanego do BL — pokaż dokładny format, przykład rekordu dla każdej hurtowni i produktu wspólnego (pole `sku`, parametry) i czekaj na akceptację tj
- skrypt importu jest na liście hooka i nie uruchamia się w sesji agenta w żadnym trybie; dowody testami jednostkowymi na próbkach, diagnostykę na serwerze uruchamia tj
- żadnego zapisu do BaseLinkera (`HA_ALLOW_PROD`) — to zadanie nie pisze do BL

## Kontekst
- `scripts/xml-to-baselinker.ts` — klucz dopasowania (`loadExistingProducts`, `findExistingId`), `toBLProduct` (pole `sku`, `text_fields.features` zastępowane w całości), `runSync`
- `xml-integration/feed-diagnostics.ts`, `scripts/xml-feed-diagnostics.ts` — symulacja importów i syncu; wynik z serwera 2026-10-14 w notatkach `docs/tasks/HA-2.15.md`
- `src/lib/baselinker/client.ts` — `getProductsList`, `getInventoryProductsData`, limity zapytań
- `xml-integration/connectors/{kolba,sharg,spechurt}.ts` — skąd bierze się `connector_sku` i `ean` (Sharg: `size/@code_external`)
- `docs/tasks/HA-2.15.md` — kontekst serwera, decyzje tj z 2026-10-13/14
- `docs/04-open-questions.md` — O-32, O-33, O-34

## Notatki z realizacji
- 2026-10-14 tj (wf-plan): zadanie wydzielone z HA-2.15 po diagnostyce na serwerze; HA-2.15 wznawia się od kroku 8 po merge'u. Decyzja: prefiks hurtowni w polu SKU BaseLinkera (opcja 1; opcja 2 „hurtownia = magazyn ze stanem” odrzucona, bo klucz nie może zależeć od tego, czy hurtownia ma stan). SKU wszystkich hurtowni dodatkowo w parametrach produktu, scalanych.
