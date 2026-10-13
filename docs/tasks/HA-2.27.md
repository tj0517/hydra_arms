---
id: HA-2.27
title: Reguły nazwowe Sharga — broń palna i amunicja myśliwska do drzewa
status: review
difficulty: M
model: claude-opus-5-5
model_approved: null
effort: high
branch: feat/ha-2.27-sharg-rules
due: null
depends_on: [HA-2.18, HA-2.25]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 40
---

## Cel
Dwie ścieżki Sharga wypadły z mapy `category-map.json` w HA-2.25 i produkty spadają do „00. DO PRZYPISANIA”: „Artykuły dla dorosłych > Broń > Broń palna” (~175 pozycji: broń palna, rewolwery i zestawy czarnoprochowe Pietta, części Pietta, amunicja myśliwska) oraz „… > Konserwacja i akcesoria do broni palnej > Amunicja” (5 pozycji). Mapa po ścieżce nie rozróżnia ich, więc Sharg dostaje reguły nazwowe (jak `kolba_rules`). Sukces: te pozycje trafiają do 1.1 / 1.2 (broń palna), 1.4 (czarnoprochowa), 04 (części), 2.2 / 2.3 (amunicja myśliwska), z tagami z `permit-rules.ts`, a w „00” zostaje z tych ścieżek tylko to, czego reguły świadomie nie łapią.

## Zakres
- [x] odczyt stanu bieżącego: `category-map.json` (klucz `sharg`, brak ścieżek „Broń palna”/„Amunicja”), `category-rules.ts`, `resolveCategory`, `assortment-rules.ts`, `permit-rules.ts`, drzewo `xml-integration/hydra-category-tree.txt` (które z 1.1 / 1.2 / 2.2 / 2.3 mają liście), deferred z 2026-10-08 (HA-2.25) i lista pozycji z `--dry-run --sections=1,2` wklejona przez tj (stan „przed”)
- [x] `sharg_rules` w `category-map.json` + obsługa w `resolveCategory` (te same reguły dopasowania co `kolba_rules`, z opcjonalnym filtrem po ścieżce kategorii Sharga, żeby reguła nie łapała produktów spoza tych dwóch ścieżek)
- [x] reguły: rewolwery i zestawy czarnoprochowe Pietta → 1.4; części Pietta → 04; broń palna (Hatsan Escort, ISSC, GSG, Astra STG itd.) → 1.1 / 1.2 wg drzewa; amunicja myśliwska (Sako 9.3x74R, Federal/PMC .270 Win, brenneka Sauvestre) → 2.2 / 2.3; reguły o niepewnym zasięgu z `review: true`
- [x] `allowedHydraNums` += węzły 1.1, 1.2, 2.2, 2.3 (i ich liście, jeśli drzewo je ma), każdy z komentarzem skąd (decyzja tj 2026-10-13)
- [x] testy: po jednej nazwie dla każdej grupy → oczekiwany węzeł; nazwa-pułapka dla każdej reguły; admitted/dropped dla czterech nowych węzłów w filtrze; tagi `permit` dla 1.1 / 1.2 / 2.2 / 2.3 w `permit-flags.test.ts`
- [x] komenda dry-run dla tj (`sharg --dry-run --sections=1,2`) i porównanie wyniku z regułami po wklejeniu

## Gotowe, gdy
- w `category-map.json` istnieje `sharg_rules`, a `resolveCategory` je stosuje tylko do zadeklarowanych ścieżek — **jak sprawdzić:** test w `category-rules.test.ts` (reguła dla pozycji z ścieżki objętej i brak trafienia dla tej samej nazwy w innej ścieżce)
- po jednej reprezentatywnej nazwie → właściwy węzeł dla każdej z pięciu grup (1.1/1.2, 1.4, 04, 2.2/2.3) — **jak sprawdzić:** nazwy testów w wyniku `npm run test:unit`
- red proof: nazwa-pułapka (np. „bęben do rewolweru Pietta”, „olej do broni czarnoprochowej”) nie trafia do 1.1 / 1.2 / 1.4 — **jak sprawdzić:** test w `category-rules.test.ts`
- węzły 1.1, 1.2, 2.2, 2.3 w filtrze: produkt admitted, a `2.1` nadal dropped — **jak sprawdzić:** `assortment-filter.test.ts`
- tagi `permit` grupy A dla 1.1 / 1.2 / 2.2 / 2.3 — **jak sprawdzić:** `permit-flags.test.ts`
- dry-run Sharga na realnym feedzie (uruchamia tj): linia Sharga „no category mapping (→ DO PRZYPISANIA)” spada mniej więcej o liczbę pozycji łapanych przez reguły, a wiersze permit sekcji 1 i 2 pokazują oczekiwaną broń palną w grupie A i Piettę w grupie C — **jak sprawdzić:** wklejone przez tj bloki „przed” i „po” oraz tabela z `--sections=1,2` (zmiana 2026-10-13: dry-run drukuje tylko sumę na hurtownię, nie licznik per ścieżka, więc kryterium opiera się na sumie; poprzednie brzmienie „z ~180 do wartości uzasadnionej regułami” było niesprawdzalne)

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
- 2026-10-13 odczyt feedu (tj, komenda read-only): ścieżka „Broń palna” = 273 pozycje (nie ~175), „Amunicja” = 5, razem 278. Marki: Pietta 238, Hatsan 19, Ekol 11, GSG 2, PMC 2, ISSC 1, Astra 1, Federal 1, Sako 1, Sauvestre 1, Pobjeda 1. Całych rewolwerów Pietta jest 78, części 131 (+ 10 luf i 15 bębnów Pietta, 5 bębnów Ekol).
- 2026-10-13 decyzja tj (STOP 2): diff silnika zatwierdzony (`ShargRule`, `shargRuleMatches`, gałąź Sharga w `resolveCategory`, klucz `sharg_rules`). Kolejność — opcja A: reguły nazwowe przed słownikiem ścieżek, słownik jako fallback. `paths` zostaje opcjonalne w silniku; test pilnuje, że każda reguła w `category-map.json` ma `paths`.
- 2026-10-13 decyzja tj: lufy („Lufa …”) i bębny („Bęben …”) zostają na razie w „00” — w 04 nie dostałyby tagu permit (wiersz arkusza „lufy → A” jest w `permit-rules.ts` nieaktywny, bo drzewo nie ma liścia). Opcje przy bramce węzłów razem ze strzelbami Hatsan (19), pistoletami Ekol (3), amunicją hukową Pobjeda (1) i 7 akcesoriami Pietta (klucze do kominków, zestawy, gilzy). Do tej bramki do `allowedHydraNums` wchodzą tylko 1.1, 1.2, 2.2, 2.3 i ich liście.
- 2026-10-13 reguły dla uzgodnionych grup: 29 reguł, łapią 218 z 278 pozycji (1.4: 78, 04: 131 w tym 3 części Ekol, 1.1.3: 1, 1.2.1: 1, 1.2: 2, 2.2: 4, 2.3: 1); 60 zostaje w „00” do decyzji tj. Amunicja myśliwska po kalibrze („270 win”, „9.3x74r”), bo feed ma literówkę „myśłiwska” (Federal). Reguły amunicji przypięte tylko do ścieżki „Amunicja” — „270 win” na ścieżce „Broń palna” złapałoby sztucer w tym kalibrze.
- 2026-10-13 decyzja tj (bramka węzłów, STOP 3): (1) strzelby Hatsan (19) — opcja A: reguły po nazwie do 1.3.1 (12) / 1.3.2 (5) / 1.3.3 (2), do `allowedHydraNums` dokładnie 1.3.1, 1.3.2, 1.3.3; (2) pistolety Ekol (3) → 1.5 review — tj potwierdza, że to pistolety alarmowe; „Pistolet Special 99 Rev II” po dosłownej nazwie modelu; amunicja hukowa Pobjeda (1) → 2.5 review; (3) lufy (10) i bębny (20) — opcja A: zostają w „00”; **tj zapyta klienta, do której grupy pozwoleń należą lufy i bębny** (do tego czasu bez reguły); (4) akcesoria Pietta — opcja B: 4 klucze do kominków → 7.3.1 review, 2 zestawy do ładowania i gilzy zostają w „00”.
- 2026-10-13 stan końcowy reguł: 36 reguł, łapią 245 z 278 pozycji — 1.4: 78, 04: 131, 1.3.1: 12, 1.3.2: 5, 1.3.3: 2, 1.5: 3, 1.2: 2, 1.2.1: 1, 1.1.3: 1, 2.2: 4, 2.3: 1, 2.5: 1, 7.3.1: 4; w „00” świadomie 33 (10 luf, 20 bębnów, 2 zestawy, 1 gilzy). Liść 1.2.3 (tylko podmioty koncesjonowane) jest w filtrze, choć żadna reguła tam nie kieruje — wpis w deferred.
- 2026-10-13 dry-run Sharga na realnym feedzie (uruchomił tj; „przed” = main, „po” = gałąź @ 8f9b4ff, feed 9019 w obu): „no category mapping (→ DO PRZYPISANIA)” 835 → 590 (−245, tyle łapią reguły); admitted 2118 → 2280 (+162), no_stock 2786 → 2869 (+83), not_p1 4115 → 3870 (−245; 162 + 83 = 245); permit tags: permit 15 → 125 (+110), permit_review 4 → 82 (+78); permit groups: A 11 → 43 (+32), C 4 → 82 (+78), D bez zmian (6528); wiersze permit sekcji 1,2: 13 → 123 (+110 = 78 + 32). Wszystkie sumy zgodne z liczbami podanymi przed uruchomieniem. Pierwsze ~40 wierszy tabeli odczytał tj (Hatsan 1.3.x, Pietta 1.4 C, amunicja 2.2 / 2.3, ISSC 1.1.3, GSG 1.2 review, Astra 1.2.1); pozostałych wierszy agent nie widział — rozkład per węzeł potwierdzają sumy grup i testy na realnych nazwach.
- 2026-10-13 testy: pełny `npm run test:unit` na Macu tj — 198 / 198 (wg tj). W klonie WSL agenta 196 / 198: dwa testy `prod-guard.test.ts` czerwone także na czystym `origin/main` (środowisko, wpis w deferred). Red proof: po usunięciu „sprężyna” z `excludeName` reguły „rewolwer pietta” test „14 real part names…” pada („Sprężyna główna rewolwer Pietta 1851…”: expected 04, actual 1.4), po przywróceniu przechodzi.
