---
id: HA-2.27
title: Reguły nazwowe Sharga — broń palna i amunicja myśliwska do drzewa
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.18, HA-2.25]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Dwie ścieżki Sharga wypadły z mapy `category-map.json` w HA-2.25 i produkty spadają do „00. DO PRZYPISANIA”: „Artykuły dla dorosłych > Broń > Broń palna” (~175 pozycji: broń palna, rewolwery i zestawy czarnoprochowe Pietta, części Pietta, amunicja myśliwska) oraz „… > Konserwacja i akcesoria do broni palnej > Amunicja” (5 pozycji). Mapa po ścieżce nie rozróżnia ich, więc Sharg dostaje reguły nazwowe (jak `kolba_rules`). Sukces: te pozycje trafiają do 1.1 / 1.2 (broń palna), 1.4 (czarnoprochowa), 04 (części), 2.2 / 2.3 (amunicja myśliwska), z tagami z `permit-rules.ts`, a w „00” zostaje z tych ścieżek tylko to, czego reguły świadomie nie łapią.

## Zakres
- [ ] odczyt stanu bieżącego: `category-map.json` (klucz `sharg`, brak ścieżek „Broń palna”/„Amunicja”), `category-rules.ts`, `resolveCategory`, `assortment-rules.ts`, `permit-rules.ts`, drzewo `xml-integration/hydra-category-tree.txt` (które z 1.1 / 1.2 / 2.2 / 2.3 mają liście), deferred z 2026-10-08 (HA-2.25) i lista pozycji z `--dry-run --sections=1,2` wklejona przez tj (stan „przed”)
- [ ] `sharg_rules` w `category-map.json` + obsługa w `resolveCategory` (te same reguły dopasowania co `kolba_rules`, z opcjonalnym filtrem po ścieżce kategorii Sharga, żeby reguła nie łapała produktów spoza tych dwóch ścieżek)
- [ ] reguły: rewolwery i zestawy czarnoprochowe Pietta → 1.4; części Pietta → 04; broń palna (Hatsan Escort, ISSC, GSG, Astra STG itd.) → 1.1 / 1.2 wg drzewa; amunicja myśliwska (Sako 9.3x74R, Federal/PMC .270 Win, brenneka Sauvestre) → 2.2 / 2.3; reguły o niepewnym zasięgu z `review: true`
- [ ] `allowedHydraNums` += węzły 1.1, 1.2, 2.2, 2.3 (i ich liście, jeśli drzewo je ma), każdy z komentarzem skąd (decyzja tj 2026-10-13)
- [ ] testy: po jednej nazwie dla każdej grupy → oczekiwany węzeł; nazwa-pułapka dla każdej reguły; admitted/dropped dla czterech nowych węzłów w filtrze; tagi `permit` dla 1.1 / 1.2 / 2.2 / 2.3 w `permit-flags.test.ts`
- [ ] komenda dry-run dla tj (`sharg --dry-run --sections=1,2`) i porównanie wyniku z regułami po wklejeniu

## Gotowe, gdy
- w `category-map.json` istnieje `sharg_rules`, a `resolveCategory` je stosuje tylko do zadeklarowanych ścieżek — **jak sprawdzić:** test w `category-rules.test.ts` (reguła dla pozycji z ścieżki objętej i brak trafienia dla tej samej nazwy w innej ścieżce)
- po jednej reprezentatywnej nazwie → właściwy węzeł dla każdej z pięciu grup (1.1/1.2, 1.4, 04, 2.2/2.3) — **jak sprawdzić:** nazwy testów w wyniku `npm run test:unit`
- red proof: nazwa-pułapka (np. „bęben do rewolweru Pietta”, „olej do broni czarnoprochowej”) nie trafia do 1.1 / 1.2 / 1.4 — **jak sprawdzić:** test w `category-rules.test.ts`
- węzły 1.1, 1.2, 2.2, 2.3 w filtrze: produkt admitted, a `2.1` nadal dropped — **jak sprawdzić:** `assortment-filter.test.ts`
- tagi `permit` grupy A dla 1.1 / 1.2 / 2.2 / 2.3 — **jak sprawdzić:** `permit-flags.test.ts`
- dry-run Sharga na realnym feedzie (uruchamia tj): liczba pozycji z dwóch ścieżek w „00” spada z ~180 do wartości uzasadnionej regułami; tabela permit sekcji 1 i 2 zawiera Hatsan/ISSC/GSG/Astra w grupie A i Pietta w grupie C — **jak sprawdzić:** wklejony blok `permit tags:` / `permit groups:` + tabela z `--sections=1,2`, z liczbami „przed” i „po”

## Poza zakresem
- rozjazd BAS (alarmówki ≤6 mm w grupie A mimo O-23) → deferred HA-2.17 / HA-2.06
- węzeł dla markerów RAM → deferred HA-2.18
- reguły Kolby i jej mapa → HA-2.12 / HA-2.25 (done); 48% niezmapowanych Kolby to w większości towar spoza asortymentu
- zmiana grup A–D w `permit-rules.ts`; O-29 (rozdzielne ładowanie: domyślnie odbiór) → dane w tabeli, decyzja tj
- zapis do BaseLinkera na żywo → HA-2.15

## Bramki STOP
- przed dodaniem klucza `sharg_rules` do struktury `category-map.json` i zmianą `resolveCategory` — pokaż diff i czekaj
- przed dopisaniem do `allowedHydraNums` czegokolwiek poza 1.1, 1.2, 2.2, 2.3 i ich liśćmi z drzewa — pokaż listę i czekaj
- żadnego zapisu do BaseLinkera; skrypty z listy guarda uruchamia tj

## Kontekst
- `xml-integration/category-map.json`, `category-rules.ts`, `__tests__/category-rules.test.ts` — format i silnik reguł
- `xml-integration/assortment-rules.ts`, `permit-rules.ts` — filtr i grupy A–D
- `docs/research/taksonomia-p1.md`, `xml-integration/hydra-category-tree.txt` — węzły drzewa
- `docs/tasks/HA-2.25.md`, `HA-2.12.md` — wzorzec reguł i procesu review
- `docs/deferred-tasks.md` — wpis HA-2.25 z 2026-10-08 (lista grup produktów)
- `docs/04-open-questions.md` → O-11, O-27, O-29

## Notatki z realizacji
- 2026-10-13 tj (wf-plan): zadanie przed HA-2.15; osobnego zadania dla Kolby nie ma (HA-2.12: 52,32% zmapowane, 3 217 przyjętych). Węzły 1.1, 1.2, 2.2, 2.3 wchodzą do filtra w tym zadaniu (opcja A): broń z pozwoleniem idzie przez odbiór osobisty zgodnie z O-11 / O-27.
