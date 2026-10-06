---
id: HA-2.22
title: Marże sterowane arkuszem (wymienne źródło wartości)
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.05]
blocked_by_questions: [O-32]
touches_db: false
touches_prod: false
pr: null
---

## Cel
Klient chce zmieniać marże zbiorczo, w arkuszu, bez przeklikiwania w BaseLinkerze. To zakres dodatkowy: zadanie startuje dopiero po aneksie do umowy (decyzja tj 2026-10-06). Sukces: silnik marży z HA-2.05 czyta stawki z arkusza, z walidacją i bezpiecznym powrotem do wartości z env, gdy arkusz jest niedostępny.

## Zakres
- [ ] odczyt stanu bieżącego: silnik reguł z HA-2.05, sposób pracy importu na serwerze, O-32
- [ ] dostawca wartości za interfejsem (env | arkusz); arkusz: hurtownia, kategoria, marka, procent
- [ ] walidacja arkusza: odrzuca ujemne i > 200%, puste pola, duplikaty reguł
- [ ] odczyt przez konto serwisowe; sekret w rejestrze inputów
- [ ] `--dry-run` pokazuje różnice cen względem stanu dzisiejszego dla ≥ 5 produktów

## Gotowe, gdy
- red proof: arkusz z ujemną marżą → import odmawia i wskazuje wiersz — **jak sprawdzić:** test jednostkowy
- red proof: arkusz niedostępny → wartości z env i ostrzeżenie w logu — **jak sprawdzić:** test z atrapą dostawcy
- stawka kategorii nadpisuje stawkę hurtowni — **jak sprawdzić:** test jednostkowy
- podgląd ≥ 5 produktów przed/po — **jak sprawdzić:** wklejona tabela z dry-runu

## Poza zakresem
- zapis cen do BL → bramka STOP po akceptacji podglądu
- promocje i rabaty → osobne zadanie
- zachowanie ręcznie zmienionej ceny w BL → decyzja O-32

## Bramki STOP
- zapis cen do BaseLinkera i zmiana env w Vercelu/serwerze — tj
- nadanie dostępu kontu serwisowemu do arkusza klienta — tj

## Kontekst
- `docs/tasks/HA-2.05.md`, `scripts/xml-to-baselinker.ts`

## Notatki z realizacji
- 2026-10-06 tj: start dopiero po aneksie.
