---
id: HA-2.40
title: Warianty C1 — rozmiary Sharga i Spechurta jako osobne rekordy BL z polami „Grupa wariantów” / „Wariant”
status: todo
difficulty: L
model: claude-opus-5-5
model_approved: null
effort: high
branch: null
due: null
depends_on: [HA-2.38]
blocked_by_questions: []
touches_db: false
touches_prod: true
pr: null
---

## Cel
Import zapisuje produkt wariantowy jako jeden rekord BL (`parent_id: 0`):
- stan to suma rozmiarów;
- EAN to EAN pierwszego rozmiaru;
- reszty EAN-ów w BL nie ma.

Audyt HA-2.37 (2026-10-26) policzył 107 takich spłaszczonych rekordów Sharga i Spechurta. Klient nie może sprzedać konkretnego rozmiaru ani zobaczyć jego stanu.

Model wariantów (decyzja tj 2026-10-26):
- prawdziwych wariantów BL nie używamy;
- każdy rozmiar to osobny produkt BL;
- dwa pola dodatkowe w katalogu 119068: „Grupa wariantów” (slug) i „Wariant” (etykieta, np. `10x42`, `43`);
- zamówienie zawsze idzie na konkretny produkt.

Sukces: każdy rozmiar Sharga i Spechurta to osobny rekord z własnym EAN, stanem i SKU, a pola Grupa/Wariant są wypełnione z feedu.

## Zakres
- [ ] odczyt stanu: `connectors/sharg.ts` (`isMultiSize`, `variants`, cena i stan per rozmiar), `connectors/spechurt.ts` (`warianty`, EAN i stan per wariant, cena produktu), `toBLProduct`, `bl-match-key.ts` (klucz EAN → SKU tej samej hurtowni), CSV `E_warianty_splaszczone.csv` z audytu, jak BL zwraca pola dodatkowe (`text_fields.extra_field_<id>`) w `getInventoryProductsData`
- [ ] pola dodatkowe „Grupa wariantów” i „Wariant” w katalogu 119068 — zakłada tj w panelu (STOP); ID jako inputy w rejestrze HA-2.16: `BASELINKER_EXTRA_FIELD_VARIANT_GROUP`, `BASELINKER_EXTRA_FIELD_VARIANT_LABEL`
- [ ] import: produkt wariantowy Sharga/Spechurta → jeden upsert na rozmiar:
  - EAN rozmiaru (znormalizowany wg HA-2.38), stan i cena rozmiaru (Sharg ma cenę per rozmiar, Spechurt — cenę produktu);
  - nazwa produktu + etykieta rozmiaru; kategoria i tagi jak dla produktu;
  - SKU `<HURTOWNIA>-<id produktu>-<id rozmiaru>`, gdzie id rozmiaru to stabilny identyfikator z feedu (Sharg `size/@id`, Spechurt `wariant_id`), nie slug etykiety — etykiety się zmieniają (decyzja tj 2026-10-26). Sprawdzić unikalność w feedzie i to, że nie koliduje z istniejącym `<HURTOWNIA>-<sku>` (`bl-match-key.ts`);
  - „Grupa wariantów” = `<hurtownia>-<id produktu>`, „Wariant” = etykieta rozmiaru — wpisywane tylko, gdy pole w BL jest puste (wartość wpisana ręcznie w panelu wygrywa, jak tag `permit_off`).
  
  Sync: stan i cena per rozmiar tym samym kluczem
- [ ] filtr asortymentu per rozmiar (stan rozmiaru, nie suma) — skutek dla liczby przyjętych pokazany w dry-runie
- [ ] migracja 107 spłaszczonych rekordów — plan per rekord w dry-runie:
  - (a) rekord przejęty przez rozmiar, którego EAN = EAN rekordu: ten rozmiar go aktualizuje, SKU zmienia się na nowy format;
  - (b) rekord, którego nie przejmie żaden rozmiar → lista do wycofania (stan 0 w magazynie hurtowni, bez usuwania).
  
  Wycofanie = bramka STOP tj
- [ ] tagi nowych rekordów rozmiarów (decyzja tj 2026-10-26): tagi admina ze spłaszczonego rekordu — `approved`, `permit_off`, `permit_ok` i każdy inny spoza tagów importu — przechodzą na wszystkie rekordy rozmiarów tej grupy; tagi importu (`auto`/`review`/`flag`/`permit`/`permit_review`/`age_18`) liczone na nowo (`mergeImportTags`)
- [ ] `--dry-run`: tabela ≥ 10 produktów wariantowych (produkt → rekordy rozmiarów: SKU, EAN, stan, cena, Grupa, Wariant, plan migracji starego rekordu) i podsumowanie (nowe rekordy, przejęte, do wycofania)
- [ ] audyt HA-2.37 sekcja E: produkty wariantowe liczone jako grupa rekordów z polem „Grupa wariantów” (spłaszczone → 0 po migracji)
- [ ] `docs/ops/serwer-importu.md`: pola dodatkowe, nowy format SKU rozmiaru, czas importu (więcej zapytań — oszacować z liczby rozmiarów)

## Gotowe, gdy
- konektory: produkt Sharga z 3 rozmiarami i produkt Spechurta z 2 wariantami → odpowiednio 3 i 2 upserty z własnym EAN, stanem i ceną — **jak sprawdzić:** testy na próbkach (naprawione kopie z `~/hydra-samples/` albo fragmenty w teście)
- red proof: przed zmianą ten sam produkt daje 1 upsert ze stanem = suma — **jak sprawdzić:** test pada po cofnięciu zmiany
- SKU rozmiaru unikalne w całym feedzie Sharga i Spechurta, nie koliduje z `<HURTOWNIA>-<sku>` produktów bez wariantów — **jak sprawdzić:** test + liczba z feedu na serwerze (dry-run, tj)
- dziedziczenie tagów: spłaszczony rekord z `approved` i `permit_off` → każdy rekord rozmiaru ma oba, a tagi importu przeliczone; red proof: bez dziedziczenia rekord rozmiaru nie ma `approved` i test pada — **jak sprawdzić:** test na atrapie BL
- pola Grupa/Wariant: puste → wypełnione z feedu; wpisane ręcznie → nietknięte przez import i sync — **jak sprawdzić:** test na payloadzie; red proof: wersja zawsze zapisująca pola nadpisuje wartość ręczną i test pada
- produkt bez wariantów: payload bez zmian względem `main` — **jak sprawdzić:** test porównujący payload
- dry-run na serwerze (tj): tabela ≥ 10 produktów wariantowych + plan migracji 107 rekordów (przejęte / do wycofania) — **jak sprawdzić:** wklejony wynik, `grep -cE 'key=|token='` = 0
- po pierwszym imporcie: audyt HA-2.37 — spłaszczonych 0, rekordy rozmiarów z wypełnionymi polami — **jak sprawdzić:** wklejona sekcja E

## Poza zakresem
- Kolba — feed podaje tylko liczbę wariantów (`ilosc_wariantow`), bez listy
- grupowanie w sklepie (karta „od X zł”, wybór wariantu) → HA-2.42
- kandydaci na grupy z osobnych produktów → HA-2.41
- prawdziwe warianty BL (`parent_id`) — model odrzucony (tj 2026-10-26)
- usuwanie rekordów z BL — tylko stan 0 po bramce

## Bramki STOP
- założenie pól dodatkowych w panelu BL i ich ID na serwerze — tj
- przed wycofaniem spłaszczonych rekordów — lista + decyzja tj
- import na żywo — tj na serwerze po akceptacji dry-runu

## Kontekst
- `xml-integration/connectors/sharg.ts`, `xml-integration/connectors/spechurt.ts`, `xml-integration/types.ts` (`NormalizedVariant`), `scripts/xml-to-baselinker.ts`, `xml-integration/bl-match-key.ts`
- `scripts/audit-import.ts` sekcja E, `xml-integration/import-audit.ts`
- `docs/tasks/HA-2.28.md` (format SKU), `docs/tasks/HA-2.38.md` (normalizacja EAN)

## Notatki z realizacji
- 2026-10-26 tj: SKU rozmiaru ze stabilnego id rozmiaru z feedu; nowe rekordy rozmiarów dziedziczą tagi admina ze spłaszczonego rekordu, tagi importu liczone na nowo.
- 2026-10-26 tj (plan po audycie HA-2.37): model wariantów — osobne produkty BL + pola dodatkowe „Grupa wariantów” / „Wariant”; import wypełnia pola tylko, gdy puste. Zależy od HA-2.38 (EAN rozmiarów zapisywane już znormalizowane). Niezależne od HA-2.41.
