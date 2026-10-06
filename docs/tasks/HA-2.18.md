---
id: HA-2.18
title: Taksonomia P1 wg arkusza korekty z domyślnymi priorytetami
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.04]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Arkusz korekty (2026-09-29) zmienił drzewo i przypisania, ale nie ma priorytetów P1/P2/P3, na których opiera się filtr importu (O-04). Zamiast czekać na odpowiedź klienta (O-22), aktualizujemy taksonomię i mapowanie, a nowe podkategorie dostają jedną domyślną wartość priorytetu z rejestru inputów. Sukces: filtr importu działa wg korekty, a zmiana priorytetu nowej podkategorii to jedna zmiana w danych.

## Zakres
- [ ] odczyt stanu bieżącego: `docs/research/taksonomia-p1.md`, `xml-integration/assortment-rules.ts`, `category-map.json`, arkusz „Podkategorie - korekta”, O-04, O-22, O-23, O-24
- [ ] aktualizacja `taksonomia-p1.md` i mapowania wg korekty: usunięta „Kolekcjonerstwo i militaria” (O-24), BAS w „Akcesoriach do samoobrony” (O-23), nowe podkategorie broni palnej, amunicji, broni czarnoprochowej, samoobrony, markery RAM, magazynki pozostałe
- [ ] domyślny priorytet nowych podkategorii jako input (`NEW_SUBCATEGORY_DEFAULT_PRIORITY`, wartość wstępna **P2 = nie importujemy**, do potwierdzenia przez tj przy akceptacji); podkategorie bez zmian zachowują priorytet z arkusza z 15.09
- [ ] dry-run filtru na próbkach feedów: liczby przed i po

## Gotowe, gdy
- red proof: produkt z usuniętej kategorii „Kolekcjonerstwo i militaria” jest odrzucany przez filtr — **jak sprawdzić:** test jednostkowy
- red proof: nowa podkategoria z priorytetem domyślnym P2 nie przechodzi, po zmianie inputu na P1 przechodzi — **jak sprawdzić:** test jednostkowy z oboma wartościami
- tabela przed/po dla próbek Sharg/Kolba/Spechurt (przyjęte, odrzucone, powód) — **jak sprawdzić:** wklejona tabela z dry-runu na `xml-integration/samples/`
- istniejące testy filtra przechodzą — **jak sprawdzić:** wklejony wynik `npm run test:unit`
- `taksonomia-p1.md` zawiera wszystkie nowe podkategorie z oznaczeniem priorytetu — **jak sprawdzić:** grep po nazwach z arkusza

## Poza zakresem
- gałęzie ASG, łucznictwo, myślistwo → HA-2.24
- filtry katalogu działów 01/02/15 → osobne zadanie po odpowiedzi w O-22
- zapis do BL → HA-2.15

## Bramki STOP
- brak zapisu do BL ani Supabase

## Kontekst
- `docs/research/taksonomia-p1.md`, `xml-integration/assortment-rules.ts`, `xml-integration/category-map.json`
- `docs/research/analiza_popularnosci_kategorii_korekta.xlsx`
- `docs/04-open-questions.md` → O-04, O-22, O-23, O-24

## Notatki z realizacji
- 2026-10-06 tj: budujemy z domyślnym priorytetem; O-22 podmienia tylko wartości.
