---
id: HA-2.05
title: Marże per hurtownia (i ewentualnie per kategoria)
status: todo
difficulty: S
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.04]
blocked_by_questions: [O-07]
touches_db: false
touches_prod: false
pr: null
---

## Cel
Cena sprzedaży jest liczona z ceny zakupu i marży (`BASELINKER_MARKUP_*`), dziś z placeholderem 30%. Sukces: marże są zgodne z O-07, a jeśli klient chce różnych stawek per kategoria lub marka, są konfigurowalne bez zmiany kodu. Cena sprzedaży nigdy nie pochodzi z feedu.

## Zakres
- [ ] odczyt stanu bieżącego: jak `scripts/xml-to-baselinker.ts` liczy cenę, gdzie są `BASELINKER_MARKUP_*`, odpowiedź O-07
- [ ] reguła marży (hurtownia → kategoria/marka → domyślna) w konfiguracji z HA-2.04, z testami
- [ ] zaokrąglanie cen zgodnie z ustaleniem z klientem (jeśli O-07 je określa)
- [ ] podgląd: przykładowe ceny przed/po dla kilku produktów (`--dry-run`)

## Gotowe, gdy
- testy: cena = zakup × (1 + marża) dla każdej hurtowni; stawka kategorii nadpisuje stawkę hurtowni — **jak sprawdzić:** wklejony wynik testów
- red proof: produkt z ceną detaliczną w feedzie i bez ceny zakupu nie dostaje ceny z feedu (odpada albo trafia na listę do przeglądu) — **jak sprawdzić:** test
- podgląd cen dla ≥ 5 produktów — **jak sprawdzić:** wklejona tabela

## Poza zakresem
- aktualizacja cen w BL na żywo → bramka STOP, po akceptacji podglądu
- promocje/rabaty → osobne zadanie

## Bramki STOP
- przed zapisem cen do BaseLinkera — pokaż podgląd i czekaj
- przed zmianą `BASELINKER_MARKUP_*` w env Vercela — tj

## Kontekst
- `scripts/xml-to-baselinker.ts`, `.env.local.example` (marże), `xml-integration/NOTATKI-rozmowa-klient-2026-06-19.md`

## Notatki z realizacji
