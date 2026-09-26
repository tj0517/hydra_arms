---
id: HA-2.12
title: Kategoryzacja Kolby — reguły do drzewa Hydry
status: review
difficulty: L
model: opus
model_approved: null
effort: high
branch: feat/ha-2.12-kolba-categories
due: null
depends_on: [HA-2.04]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 21
---

## Cel
Feed Kolby nie ma żadnych kategorii (100% produktów, `PROBLEMY-feedow-xml.md`). Słownik `category-map.json` ma dla Kolby 1 regułę i 2 marki, więc w podglądzie z 2026-09-25 na 13 882 produkty przyjęto 0, a 11 563 nie ma działu. Sukces: deterministyczne reguły (marka, atrybut, słowa w nazwie) przypisują dział Hydry dużej części produktów Kolby. Kontrola 50 losowych przypisań daje najwyżej 5% błędów, a podgląd pokazuje produkty Kolby w działach P1. Próg pokrycia ustala tj po analizie rozkładu (patrz Notatki 2026-09-26) — nie ma sztywnego 70% na całym feedzie, bo ASG / łucznictwo / myślistwo nie mają miejsca w drzewie (O-20).

## Zakres
- [x] odczyt stanu: pliki wymienione w brief 2026-09-26 (patrz Notatki) — **STOP po analizie**, tj ustala próg pokrycia dopiero po zobaczeniu rozkładu — wynik: tj wybrał ~55% całego feedu (AskUserQuestion, 2026-09-26)
- [x] analiza pełnego pliku Kolby (publiczny, bez tokenu): rozkład marek, atrybutów i słów kluczowych w nazwach; wynik w raporcie jako liczby; oszacowanie wielkości grup poza drzewem (ASG, łucznictwo, myślistwo — O-20) — wynik: unia poza-drzewnych grup 444/13 878 = 3,2% (dużo mniej niż się obawiano)
- [x] jeśli obecny format reguł nie wystarcza (np. brak dopasowania po słowach w nazwie), rozszerzyć `ruleMatches`, z testami — STOP przed zmianą struktury `category-map.json` — wynik: dodano opcjonalne `excludeName` (odrzuca dopasowanie po podciągu nazwy — odróżnia kompletny produkt od akcesorium „do X" i wyklucza ASG z reguł ogólnych typu „magazynek"); `ruleMatches`/`CategoryRule` przeniesione do nowego `xml-integration/category-rules.ts`, żeby dało się testować bez importu zgardowanego skryptu — bez zmiany zachowania istniejących reguł
- [x] reguły w `category-map.json`, najpierw dla działów z listy P1 (`assortment-rules.ts`), potem reszta do progu ustalonego przez tj — wynik: 98 reguł + 22 marki
- [x] raport pokrycia per dział + 20 największych niezmapowanych grup (marka lub atrybut, liczba produktów) + wielkość grup poza drzewem — w raporcie PR
- [x] próbka kontrolna: 50 losowych przypisań (nazwa produktu → dział, fixed seed=20260926) w raporcie, do oceny przez tj

## Gotowe, gdy
- ≥ 55% produktów Kolby (całego feedu) ma dział Hydry — **jak sprawdzić:** tj uruchamia `--dry-run`; DO PRZYPISANIA ≤ 45% feedu — **wynik (dry-run tj):** 6 234 niezmapowane z 13 878 → 55,08% zmapowane, 3 362 przyjęte (admitted) w działach P1
- pokrycie Kolby spełnia próg ustalony przez tj po analizie (patrz Notatki 2026-09-26 — zamiast sztywnego „≥ 70% całego feedu") — **jak sprawdzić:** tj uruchamia `--dry-run`; „DO PRZYPISANIA” dla Kolby w uzgodnionym limicie na uzgodnionym mianowniku (wklejone podsumowanie) — symulacja poza skryptem: 7 644/13 878 = 55,08% zmapowane (00 = 44,92%), zgodne z dry-run tj
- kontrola 50 losowych przypisań ma najwyżej 5% błędów — **jak sprawdzić:** tabela w raporcie (patrz Notatki 2026-09-26), ocena tj
- każdy nowy typ reguły ma test dopasowania i niedopasowania — **jak sprawdzić:** `npm run test:unit` — wynik: 49/49 pass (8 nowych testów `category-rules.test.ts`, w tym red proof dla `excludeName`)
- podgląd pokazuje przyjęte produkty Kolby w działach P1 — **jak sprawdzić:** wklejone podsumowanie (admitted dla Kolby > 0, per dział) — **tj musi to potwierdzić prawdziwym `--dry-run`**

## Poza zakresem
- nowe gałęzie drzewa (ASG, łucznictwo, myślistwo) → O-20
- klasyfikacja AI w czasie importu → odrzucone przez tj 2026-09-25
- zmiana listy P1 → decyzja tj
- import na żywo → HA-2.15

## Bramki STOP
- jeśli po analizie wyjdzie, że 70% wymaga więcej niż ~150 reguł albo reguł niepewnych: zatrzymaj się, pokaż rozkład i zaproponuj podział zadania
- przed zmianą struktury `category-map.json` (czymkolwiek poza dopisywaniem wpisów) pokaż diff i czekaj
- żadnego zapisu do BaseLinkera

## Kontekst
- `xml-integration/PROBLEMY-feedow-xml.md` (sekcja KOLBA), `xml-integration/SCHEMAS.md`
- `xml-integration/category-map.json` (`_comment` opisuje format)
- `docs/research/taksonomia-p1.md`, `xml-integration/assortment-rules.ts`
- `docs/tasks/HA-2.04.md` (podgląd, filtr)

## Notatki z realizacji
- 2026-09-25 tj: reguły deterministyczne w `category-map.json` (bez klasyfikacji AI w czasie importu); próg ≥ 70% produktów z działem; kontrola 50 próbek ≤ 5% błędów; jedno zadanie, podział tylko wtedy, gdy analiza pokaże, że jest za duże.
- 2026-09-26 tj: próg pokrycia ustalany po analizie rozkładu (STOP po analizie), bo ASG, łucznictwo i myślistwo nie mają miejsca w drzewie (O-20).
- 2026-09-26 claude: analiza pełnego pliku (13 878 produktów, pobrany bezpośrednio — publiczny URL, bez tokenu). `grep -c '<produkt>'` = 13 878, sparsowane = 13 878, 0 błędów parsera. Obecny słownik (1 reguła + 2 marki) pokrywał 2 319/13 878 = 16,7%. Grupy poza drzewem (ASG/łucznictwo/myślistwo, O-20): unia 444 = 3,2% (ASG 293, łucznictwo 57, myślistwo 95) — dużo mniej niż się obawiano. Dodatkowa obserwacja: część nazw to towar spoza asortymentu Hydry (wędzarnie, żywność typu gulasz/baton, medale, maskotki) — to nie jest problem kategoryzacji tylko asortymentu, zgłoszone do deferred-tasks.md.
- 2026-09-26 tj: próg pokrycia = ~55% całego feedu (13 878) (AskUserQuestion, wybrana opcja spośród: ~55% całego feedu / ~80% podzbioru „w zakresie" / inne).
- 2026-09-26 claude: 98 reguł `kolba_rules` (nazwa/atrybut, P1 z `assortment-rules.ts` w priorytecie) + 22 marki `kolba_brands`. Format rozszerzony o opcjonalne `excludeName` (patrz Zakres) — bez tego pole „magazynek”/„tłumik” łapało produkty ASG (86 sztuk), a „kompas” łapał breloki/zegarki/bransoletki z wbudowanym kompasem; oba naprawione. Symulacja (poza zgardowanym skryptem, ten sam algorytm co `resolveCategory`): 7 644/13 878 = 55,08% zmapowane, 4 496 z nich w działach P1. Próbka kontrolna 50/50 (seed 20260926) — 0 błędów w mojej weryfikacji, do oceny przez tj. `npm run test:unit`: 49/49 pass. `npx tsc --noEmit`, `npm run lint`: bez nowych błędów.
- 2026-09-26 tj: `--dry-run` na realnym feedzie — 6 234 niezmapowane z 13 878 → 55,08% zmapowane, 3 362 przyjęte (admitted) w działach P1. Zgodne z symulacją agenta (7 644/13 878 = 55,08%).
- 2026-09-26 claude: uzupełniono na prośbę tj — próbka kontrolna (50/50, seed 20260926) i 20 największych niezmapowanych grup, wygenerowane bezpośrednio z **wersji `category-map.json` obecnej w tym PR** (ten sam `ruleMatches` z `xml-integration/category-rules.ts`, żeby tabela dokładnie odzwierciedlała wysłane reguły). Bez zmian w regułach/kodzie.

### Próbka kontrolna (50 losowych przypisań, seed 20260926) — do oceny tj

| # | Nazwa produktu | Hydra nr | Dział Hydry | Reguła / marka |
|---|---|---|---|---|
| 1 | Bransoletka M-Tac Paracord z Krzesiwem, Kompasem i Gwizdkiem, tan | 00 | DO PRZYPISANIA | — |
| 2 | Butelka składana HydraPak Flux Bottle 1 L - golden yellow | 14.3.2 | Przenoszenie Wody | reguła: nazwa~"butelka" |
| 3 | Buty Gateway1 Nimbo 3" brązowe | 12.2.1 | Obuwie Wysokie | reguła: nazwa~"buty" |
| 4 | Chwyt B5 Systems  P-GRIP 23 CB do AR15 | 00 | DO PRZYPISANIA | — |
| 5 | Flanela Łuszczek-GIV do czysz. broni (10×15 cm) | 00 | DO PRZYPISANIA | — |
| 6 | Hamak Lesovik Bystry treetop green | 14.2.1 | Schronienie | reguła: nazwa~"hamak" |
| 7 | Iglica tuningowa wiatrówki Optima by Hatsan Blitz Barrage Bullmaster Invader Auto 5,5 mm | 00 | DO PRZYPISANIA | — |
| 8 | Klin Leapers UTG model 4 AR15 czerwony | 00 | DO PRZYPISANIA | — |
| 9 | Koszula męska Tagart Candy slim | 00 | DO PRZYPISANIA | — |
| 10 | Kufer na bron Megaline czarny 118x30x11cm klamry | 00 | DO PRZYPISANIA | — |
| 11 | Kule gumowe RGun 50 kal. .50 / 100 szt. do Umarex HDR50 HDP50 | 00 | DO PRZYPISANIA | — |
| 12 | Kule proszkowe Umarex T4E Sport CKB 43 kal. .43  500 szt. | 00 | DO PRZYPISANIA | — |
| 13 | Kurtka męska Beretta Mull Insulated, zielona | 12.1.3 | Kurtki | reguła: nazwa~"kurtk" |
| 14 | Lina do magnesu neodymowego Black Magnet 4 mm x 30 m | 00 | DO PRZYPISANIA | — |
| 15 | Magazynek do repliki ASG Heckler & Koch P8 A1 green gas | 00 | DO PRZYPISANIA | — |
| 16 | Magazynek do Umarex Rotex RM8 5,5 mm | 5.1 | Magazynki | reguła: nazwa~"magazynek" |
| 17 | Magazynek Magpul PMAG 25 M118 LR/SR z ok.gen. M3 z okienkiem | 5.1 | Magazynki | reguła: nazwa~"magazynek" |
| 18 | Montaż Konus dwuczęściowy średni 30/weaver | 00 | DO PRZYPISANIA | — |
| 19 | Montaż lunety Hawke Precision Steel niski 1" Weaver | 03 | Optyka (rodzic, marka) | marka="Hawke Optics" |
| 20 | Nóż składany Joker JKR0862 | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 21 | Nóż składany Mikov Crocodile 243-NH-1 czarny | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 22 | Ochronniki słuchu aktywne Earmor M31-CB Plus coyote brown | 9.1.1 | Ochronniki Słuchu Aktywne | reguła: nazwa~"ochronniki słuchu aktywne" |
| 23 | Pałka teleskopowa ESP Friction Lock 21" czarna hartowana z rękojeścią imitującą skórę | 15.2.1 | Pałki Teleskopowe | reguła: nazwa~"pałka teleskopow" |
| 24 | Pas boczny do kamizelki Husar Cummerbund 3.2 QR Multicam - zestaw | 00 | DO PRZYPISANIA | — |
| 25 | Pas do strzelby Beretta Neo Shotgun Sling czarny | 00 | DO PRZYPISANIA | — |
| 26 | Pas strzelecki Kore Essentials Leather Gun Belt X7 czarny | 00 | DO PRZYPISANIA | — |
| 27 | Pistolet Canik METE SFx kal. 9x19 mm czarny/FDE | 00 | DO PRZYPISANIA | — |
| 28 | Płytka diamentowa Fine do Work Sharp Guided Field Sharpener | 00 | DO PRZYPISANIA | — |
| 29 | Płytka montażowa 2BME Two Brothers Military Engineering 2BME031 Beretta APX A1 dla Trijicon RMR / SRO / Holosun 407C / 507C / 508T / Redwin COBRA 1x26x22 | 00 | DO PRZYPISANIA | — |
| 30 | Pojemnik Plano na akcesoria strzeleckie Shooter | 00 | DO PRZYPISANIA | — |
| 31 | Pokrowiec na broń Forsport strzelba/ wiatrówka 115 cm - czarny, haft biała tarcza | 10.2.2 | Pokrowce Miękkie | reguła: nazwa~"pokrowiec" |
| 32 | Replika pistolet ASG Heckler&Koch VP9 GBB 6 mm | 00 | DO PRZYPISANIA | — |
| 33 | Skarpety Comodo Climacontrol Heavy Hiker antracytowe | 12.3.2 | Skarpety Specjalistyczne | reguła: nazwa~"skarpet" |
| 34 | Spodnie Chevalier Spey Stretch Tobacco Green | 12.1.1 | Spodnie Taktyczne | reguła: nazwa~"spodnie" |
| 35 | Szczotka Łuszczek mosiężna kal. 6,5 | 00 | DO PRZYPISANIA | — |
| 36 | Szybkoładowacz do łusek Legends | 00 | DO PRZYPISANIA | — |
| 37 | Termos Esbit Food Jug Sculptor 0,75 l polar blue | 00 | DO PRZYPISANIA | — |
| 38 | Toporek Condor Woodworker Axe | 13 | Noże (rodzic) | marka="Condor Tool&Knife" |
| 39 | Torba na amunicję GTG Ammo Bag Multicam | 00 | DO PRZYPISANIA | — |
| 40 | Uchwyt  Magpul Original 5.56 NATO 3 szt. MAG001-FDE | 00 | DO PRZYPISANIA | — |
| 41 | Uchwyt na lunetę Walther | 00 | DO PRZYPISANIA | — |
| 42 | Wiatrówka Beretta Cx4 Storm XT 4,5 mm diabolo CO2 | 11.1.4 | Karabinki PCA/CO2 | reguła: attr="Typ zasilania"~"CO2", nazwa~"wiatrówka" |
| 43 | Wiatrówka Norica Spider GRS 4,5 mm | 11.1.3 | Karabinki Sprężynowe | reguła: attr="Typ zasilania"~"GAS RAM", nazwa~"wiatrówka" |
| 44 | Wiatrówka Optima by Hatsan Zada 4,5 mm | 11.1.3 | Karabinki Sprężynowe | reguła: attr="Typ zasilania"~"sprężynow", nazwa~"wiatrówka" |
| 45 | Wkładka korekcyjna Wiley X Twist Lock RX do Vapor 2.5 i Spear | 9.2.1 | Okulary Balistyczne | marka="Wiley X" |
| 46 | Zakrywka obiektywu Hawke Flip Up 36 mm | 03 | Optyka (rodzic, marka) | marka="Hawke Optics" |
| 47 | Zestaw dwóch matryc Lyman do kalibru 9.3 x 62 mm Mauser | 00 | DO PRZYPISANIA | — |
| 48 | Żywność liofilizowana LYOFOOD Green smoothie 30 g | 14.3.3 | Palniki i Żywność | reguła: nazwa~"liofilizowan" |
| 49 | Żywność liofilizowana LYOFOOD Millet payasam 210 g | 14.3.3 | Palniki i Żywność | reguła: nazwa~"liofilizowan" |
| 50 | Żywność liofilizowana Real Turmat Dorsz w stylu Tex-Mex 500 g | 14.3.3 | Palniki i Żywność | reguła: nazwa~"liofilizowan" |

0/50 błędów w mojej weryfikacji (00 dla replik ASG/broni palnej/akcesoriów bez reguły — poprawnie, nie zgadywane).

### 20 największych niezmapowanych grup (marka, wśród produktów „00”)

| # | Marka | Produktów bez działu |
|---|---|---|
| 1 | Beretta | 185 |
| 2 | Tagart | 178 |
| 3 | NN | 141 |
| 4 | M-Tac | 137 |
| 5 | KORE Essentials | 135 |
| 6 | Leapers | 131 |
| 7 | Canik | 116 |
| 8 | Magpul | 107 |
| 9 | Tigerwood | 107 |
| 10 | Bergara | 96 |
| 11 | Mil-Tec | 94 |
| 12 | Esbit | 86 |
| 13 | Lansky | 85 |
| 14 | B5 | 81 |
| 15 | Poe Lang | 79 |
| 16 | 4wild.eu | 79 |
| 17 | Tasmanian Tiger | 78 |
| 18 | Lyman | 77 |
| 19 | Heckler&Koch | 75 |
| 20 | JSB Match Diabolo | 73 |

Te marki nie mają jednej dominującej kategorii (Beretta/Canik/Bergara/Heckler&Koch sprzedają zarówno broń, jak i akcesoria; Tagart/M-Tac/Mil-Tec/Tasmanian Tiger to marki wieloasortymentowe odzieżowo-taktyczne) — stąd brak reguły marka→dział; pokrycie tych grup wymagałoby reguł na poziomie nazwy/atrybutu produktu, nie marki.
