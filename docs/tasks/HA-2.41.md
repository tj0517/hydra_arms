---
id: HA-2.41
title: Warianty C3 — kandydaci na grupy wariantów z osobnych produktów: CSV do przeglądu, zapis pól Grupa/Wariant po zatwierdzeniu
status: todo
difficulty: M
model: claude-sonnet-5-5
model_approved: null
effort: medium
branch: null
due: null
depends_on: [HA-2.37]
blocked_by_questions: []
touches_db: false
touches_prod: true
pr: null
---

## Cel
W katalogu 119068 są osobne produkty, które klient sprzedałby jako jeden produkt z wyborem parametru (kaliber, średnica, powiększenie, rozmiar). Audyt HA-2.37 (2026-10-26) znalazł 222 takie grupy kandydatów, razem 567 rekordów. Model wariantów jest ten sam co w HA-2.40: produkty zostają osobne w BL, łączą je pola dodatkowe „Grupa wariantów” i „Wariant”.

Sukces:
- skrypt generuje CSV kandydatów do przeglądu;
- tj (z klientem) zatwierdza wiersze w CSV;
- zatwierdzony CSV zapisuje pola Grupa/Wariant do BL — wyłącznie po dry-runie i bramce STOP.

## Zakres
- [ ] odczyt stanu: `variantGroupCandidates`, `extractVariantAttrs` w `xml-integration/import-audit.ts` (logika audytu, sekcja E), CSV `E_kandydaci_grup_wariantow.csv` z 2026-10-26, pola dodatkowe z HA-2.40 (`BASELINKER_EXTRA_FIELD_VARIANT_GROUP`, `_VARIANT_LABEL`)
- [ ] skrypt kandydatów, tylko odczyt (BL przez `readonly.ts`, ta sama logika grupowania co audyt — jedna funkcja). Wynik: CSV, jeden wiersz na rekord. Kolumny:
  - `grupa`, `parametr`, `wartosc`, `bl_id`, `sku`, `nazwa`, `kategoria`;
  - `permit`, `odbior_osobisty`, `age_18`, `mieszana` (grupa miesza pozwolenie / odbiór / 18+);
  - proponowany slug grupy i etykieta wariantu;
  - pusta kolumna `zatwierdz` do wypełnienia.
  
  Rekordy, które mają już wypełnione pole Grupa (ręcznie albo z HA-2.40), pomijane i liczone
- [ ] slug grupy: deterministyczny z producenta i nazwy bazowej, unikalny w katalogu, inny niż slugi z HA-2.40 (`<hurtownia>-<id>`), np. prefiks `g-`. Etykieta wariantu: wartość parametru w czytelnej formie (`4,5 mm`, `3-9x40`, `XL`)
- [ ] zapis: wczytanie zatwierdzonego CSV (`zatwierdz` = `tak`), walidacja:
  - rekord istnieje;
  - pola w BL nadal puste;
  - grupa ≥ 2 rekordy;
  - grupa nie mieszająca pozwolenia, odbioru ani 18+ — taką odrzuca, bez nadpisywania.
  
  `--dry-run` → tabela zmian; zapis pól tylko przez osobny tryb z odblokowaniem prod (skrypt na liście hooka, `assertExternalProd`). Zapisywane wyłącznie te dwa pola — nic innego w rekordzie
- [ ] instrukcja dla tj/klienta: jak czytać CSV i co znaczy `mieszana`; jak poprawić grupę ręcznie w panelu (pole wpisane ręcznie wygrywa z importem)

## Gotowe, gdy
- grupowanie w skrypcie to ta sama funkcja co w audycie — **jak sprawdzić:** grep importu + test: te same wejścia → te same grupy
- CSV dla katalogu 119068 (uruchamia tj, odczyt): liczba grup i rekordów zgodna z audytem z tego samego dnia — **jak sprawdzić:** wklejone podsumowanie
- walidacja zapisu: rekord z niepustym polem, grupa 1-elementowa, grupa mieszana, nieistniejące `bl_id` → odrzucone z powodem — **jak sprawdzić:** testy jednostkowe
- red proof: grupa mieszająca `permit` z rekordem bez `permit` nie zostaje zapisana, nawet z `zatwierdz` = `tak` — **jak sprawdzić:** test pada po usunięciu warunku
- red proof: payload zapisu zawiera wyłącznie dwa pola dodatkowe — **jak sprawdzić:** test na payloadzie
- dry-run zapisu na zatwierdzonym CSV — tabela zmian (uruchamia tj) — **jak sprawdzić:** wklejony wynik, `grep -cE 'key=|token='` = 0

## Poza zakresem
- przegląd i zatwierdzenie kandydatów — klient / tj
- grupowanie w sklepie → HA-2.42
- rozmiary z feedów Sharga i Spechurta → HA-2.40
- łączenie duplikatów (ten sam towar w dwóch rekordach) — to nie warianty; kandydaci duplikatów bez EAN po stronie klienta (tj 2026-10-26)

## Bramki STOP
- pola dodatkowe muszą istnieć (HA-2.40, zakłada tj)
- zapis pól do BL — tylko po zatwierdzonym CSV i dry-runie, uruchamia tj z `HA_ALLOW_PROD=1`

## Kontekst
- `xml-integration/import-audit.ts`, `scripts/audit-import.ts`, `src/lib/baselinker/readonly.ts`, `scripts/lib/prodGuard.ts`
- `docs/tasks/HA-2.37.md`, `docs/tasks/HA-2.40.md`

## Notatki z realizacji
- 2026-10-26 tj (plan po audycie HA-2.37): kandydaci z audytu 2026-10-26 — 222 grupy / 567 rekordów. Niezależne od HA-2.40 (wymaga tylko pól dodatkowych).
