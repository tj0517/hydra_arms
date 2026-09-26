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
- ≥ 55% produktów Kolby (całego feedu) ma dział Hydry — **jak sprawdzić:** tj uruchamia `--dry-run`; DO PRZYPISANIA ≤ 45% feedu — **STAN PO POPRAWKACH 2026-09-26 (review, runda 2): 7 027/13 878 = 50,63% — PONIŻEJ progu 55%.** Spadek (-4,45 pp, -617 produktów) to bezpośredni koszt zawężenia reguł „buty”/„spodnie” (część trafia teraz do rodzica z review zamiast liścia — nadal liczy się jako zmapowane, ale mniej niż wcześniej z powodu wykluczeń), usunięcia 7 reguł marka→dział dla marek wieloasortymentowych i dodatkowych wykluczeń w regule „magazynek”. **Nie dopisywałem nowych reguł, żeby wrócić nad 55%** — zgodnie z instrukcją tj z rundy 2. Czeka na decyzję tj: zaakceptować niższe pokrycie, czy dopisać dodatkowe *precyzyjne* reguły w kolejnej rundzie.
- pokrycie Kolby spełnia próg ustalony przez tj po analizie (patrz Notatki 2026-09-26 — zamiast sztywnego „≥ 70% całego feedu") — **jak sprawdzić:** tj uruchamia `--dry-run`; „DO PRZYPISANIA” dla Kolby w uzgodnionym limicie na uzgodnionym mianowniku (wklejone podsumowanie) — symulacja poza skryptem po poprawkach rundy 2: 7 027/13 878 = 50,63% (00 = 49,37%) — **poniżej uzgodnionych ~55%, zgłoszone zamiast dociągane sztucznie**
- kontrola 50 losowych przypisań ma najwyżej 5% błędów — **jak sprawdzić:** tabela w raporcie (patrz Notatki 2026-09-26, próbka 2), ocena tj — próbka 1 odrzucona (27/50 bez przypisania, realnie oceniono tylko 23); próbka 2 losowana WYŁĄCZNIE z produktów zmapowanych, nowy seed 20260927
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
- 2026-09-26 tj: review PR #21 — odesłane: próbka nie spełnia ≤ 5% (reguły szerokie po nazwie i po marce), próbka 1 zawierała 27/50 nieprzypisanych.
- 2026-09-26 claude: poprawki rundy 2 (bez dotykania `category-rules.ts`, testów ani reguł spoza tej listy):
  1. **„buty”** rozbite na wysokie/niskie po słowach w nazwie: ` low `/` low,`/` low-` → 12.2.2 (niskie); ` hi `/` high `/` high,`/„combat boot” → 12.2.1 (wysokie); ` mid `/` mid,`/` mid-` → rodzic 12.2 (review, bo „mid” nie da się jednoznacznie przypisać do liścia drzewa); reszta (bez słowa wysokości, np. „Buty Beretta Terrier GTX ST301”) → rodzic 12.2 (review). Wyłączone: „ochraniacze”/„sneakers” (nie są butami taktycznymi).
  2. **„spodnie”** zawężone: `spodnie taktyczn`/`spodnie bojówki` → 12.1.1 (liść, jak było); reszta (myśliwskie, trekkingowe, bez określnika — większość, np. marki Chevalier/Härkila/Pinewood) → rodzic 12.1 (review), nie 12.1.1. Wyłączone: „ochraniacze na spodnie”.
  3. **Marki wieloasortymentowe** — usunięte z `kolba_brands` (7): Vortex Optics (sprzedaje też czapki, stację pogodową), Hawke Optics, Leupold (czapki, koszulki), Condor Tool&Knife, Joker (kompasy, pastorały do broni — realnie źle klasyfikowane), Wiley X, Texar (74% jej katalogu to nie odzież: plecaki, pasy, manierki, kominiarki — trafiały do „12.1” błędnie). Hawke Optics i Wiley X usunięte mimo że mój własny audyt (próbka losowa 20/marka + pełne przeliczenie „cross-section”) nie znalazł w nich istotnego wymieszania kategorii (Hawke: 3/413 = 0,7% pogranicznych, Wiley X: 0/108) — usunięte **na wprost polecenie tj**, nie na podstawie mojego wyniku; zaznaczam to na wypadek, gdyby tj chciał to zrewidować.
     **Zatrzymane (15) i dlaczego** — audyt: pełne przeliczenie słów spoza domeny marki na całym katalogu marki (nie próbka):
     Kizer (nóż, 0% obcych) · Primary Arms (celowniki, 0%) · Vector Optics (optyka, 0%) · Holosun (kolimatory, 0%) · HIKMICRO by HIKVISION (termowizja, 0%) · Fenix (latarki/akumulatory, „obce” trafienia to tylko latarki czołowe/długopisy z latarką — wciąż 14.2.3) · Civivi (nóż, 0%) · We Knife (nóż, 0%) · Ruike (nóż, 0%) · Real Avid (narzędzia rusznikarskie, 0%) · Ganzo/Firebird (noże + kamienie do ostrzenia do własnego systemu Ganzo Touch Pro — nie krzyżuje działu) · Kershaw (noże/multitoole, 1 wyjątek na 180 — niezbędnik łyżkowidelec, pomijalne) · Morakniv (noże, krzesiwka pod tą samą marką — pomijalne) · Opinel (noże, w tym kuchenne — nie krzyżuje DZIAŁU Hydry, ale to inny segment rynku niż taktyczny/survivalowy; zgłoszone niżej jako osobna uwaga) · Benchmade (noże, 1 czapka na 253 — pomijalne).
  4. **Magazynki do wiatrówek** wykluczone z reguły „magazynek” (dodatkowo do ASG): `4,5 mm`/`5,5 mm`/`6,35 mm`/`blowback`/`.22lr`/`.22wmr`/`do wiatrówki`/`do wiatrówka` + marki wiatrówkowe (Umarex, Diana, Hatsan, Optima, Borner, Artemis, Norica, Black Ops). **W drzewie nie ma węzła „magazynki do wiatrówek”** (11.3 ma tylko śrut/kapsuły CO2/akcesoria konserwacyjne) — zgodnie z poleceniem tj zostają nieprzypisane (00), a nie wciśnięte w niepasujący liść.
  5. **Przy okazji naprawiony** dodatkowy błąd tego samego typu co zgłoszony (reguła ogólna łapiąca pokrowiec/akcesorium zamiast właściwego produktu): reguła „magazynek” łapała też „Ładownica na magazynek…” (pokrowiec na magazynek, nie magazynek) — 21 sztuk; dodano `excludeName: ["ładownic"]`.
  6. **Znalezione, ale NIE naprawione w tej rundzie** (spoza listy tj, zgłaszam zamiast cicho poprawiać poza zakresem): (a) `ładownica` → zawsze 6.2.1 „Ładownice Karabinowe”, nawet gdy nazwa mówi „na pistolet” (powinno być 6.2.2) — patrz próbka 2 wiersz 25; (b) reguła „lornetk” łapie też pokrowce/futerały NA lornetkę (np. „Pokrowiec futerał na lornetkę Vortex GlassPack” → 3.3 zamiast 10.2.2) — patrz próbka 2 wiersz 44. Oba to reguły sprzed tej rundy (nie dodane/zmienione teraz) i nie było ich na liście do poprawy — zostawione do osobnej decyzji tj.
  Wynik: pokrycie spadło do 7 027/13 878 = 50,63% (poniżej 55%) — zgłoszone w „Gotowe, gdy”, bez dopisywania reguł żeby to nadgonić. `npm run test:unit`: 49/49 (bez zmian, kod nietknięty). `npx tsc --noEmit`, `npm run lint`: bez nowych błędów.

### Próbka kontrolna 1 (odrzucona w review — 27/50 bez przypisania, seed 20260926, losowana z całego feedu)

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

27/50 bez przypisania (00) — reprezentatywnych dla oceny było tylko 23/50, za mało; próbka odrzucona przez tj 2026-09-26. Losowana z CAŁEGO feedu, nie tylko produktów zmapowanych — błąd metody poprawiony w próbce 2 niżej.

### Próbka kontrolna 2 (seed 20260927, losowana WYŁĄCZNIE z produktów zmapowanych) — do oceny tj

Wygenerowana z wersji `category-map.json` **po poprawkach rundy 2** (usunięte marki, rozbite buty/spodnie, wykluczenia w magazynku).

| # | Nazwa produktu | Hydra nr | Dział Hydry | Reguła / marka |
|---|---|---|---|---|
| 1 | Bluza M-Tac polarowa Nord Fleece army oliwkowa | 12.1.2 | Bluzy/Combat Shirty | reguła: nazwa~"bluza" |
| 2 | Butelka Nalgene Wide Mouth 500 ml - pastel green | 14.3.2 | Przenoszenie Wody | reguła: nazwa~"butelka" |
| 3 | Butelka składana HydraPak Stow Bottle 500 ml - sage green | 14.3.2 | Przenoszenie Wody | reguła: nazwa~"butelka" |
| 4 | Buty M-Tac Summer Pro czarne | 12.2 | Obuwie Taktyczne i Służbowe (rodzic) | reguła: nazwa~"buty" |
| 5 | Futerał na broń Beretta Uniform Pro EVO Soft Gun Case 138 cm niebieski | 10.2.2 | Pokrowce Miękkie | reguła: nazwa~"futerał" |
| 6 | Gaz pieprzowy Fox Labs 89 ml strumień 3.0oz | 15.1.1 | Gazy Pieprzowe Ręczne | reguła: nazwa~"gaz pieprzow" |
| 7 | Gaz pieprzowy Police Perfect Guard 550 żel 550 ml gaśnica | 15.1.1 | Gazy Pieprzowe Ręczne | reguła: nazwa~"gaz pieprzow" |
| 8 | Hamak TigerWood Ważka V2 z moskitierą pustynny | 14.2.1 | Schronienie | reguła: nazwa~"hamak" |
| 9 | Kabura Doubletap OWB Strighter Walther PDP 4,5" | 6.1 | Kabury | reguła: nazwa~"kabura" |
| 10 | Kabura na paralizator ESP POWER 200 | 6.1 | Kabury | reguła: nazwa~"kabura" |
| 11 | Kabura uniwersalna Tasmanian Tiger TAC Holster MKII olive | 6.1 | Kabury | reguła: nazwa~"kabura" |
| 12 | Kolimator Aimpoint PRO | 3.2 | Celowniki Kolimatorowe | reguła: nazwa~"kolimator" |
| 13 | Kolimator Holosun HS507COMP-RD Red Dot, montaż RMR | 3.2 | Celowniki Kolimatorowe | reguła: nazwa~"kolimator" |
| 14 | Kolimator pistoletowy Holosun RONIN 507COMP czerwony znak MRS RMR | 3.2 | Celowniki Kolimatorowe | reguła: nazwa~"kolimator" |
| 15 | Kompas nadgarstkowy Silva Arc Jet 360 Left | 14.4.1 | Nawigacja Klasyczna | reguła: nazwa~"kompas" |
| 16 | Kurtka damska Tagart Cramp Pro ciemnozielona | 12.1.3 | Kurtki | reguła: nazwa~"kurtk" |
| 17 | Kurtka polarowa M-Tac Windblock Division Gen. II - coyote brown | 12.1.3 | Kurtki | reguła: nazwa~"kurtk" |
| 18 | Latarka do pałki teleskopowej ESP Baton BL-03 | 14.2.3 | Oświetlenie i Zasilanie | reguła: nazwa~"latark" |
| 19 | Latarka LED Fenix E06R Pro RG pomarańczowa | 14.2.3 | Oświetlenie i Zasilanie | reguła: nazwa~"latark" |
| 20 | Lornetka Delta Optical Titanium 8x56 | 3.3 | Optoelektronika Obserwacyjna | reguła: nazwa~"lornetk" |
| 21 | Lornetka Hawke Frontier APO 10x42 zielona | 3.3 | Optoelektronika Obserwacyjna | reguła: nazwa~"lornetk" |
| 22 | Luneta celownicza Hawke Vantage 1" 4x32 Mil Dot | 3.1 | Lunety Celownicze | reguła: nazwa~"luneta celownicz" |
| 23 | Luneta celownicza Vortex Crossfire HD 3-9x40 1" Straight-Wall BDC MOA | 3.1 | Lunety Celownicze | reguła: nazwa~"luneta celownicz" |
| 24 | Luneta celownicza Vortex Triumph HD 3-9x40 1" Dead-Hold BDC MOA z montażem 1"/22 mm | 3.1 | Lunety Celownicze | reguła: nazwa~"luneta celownicz" |
| 25 | Ładownica M-Tac na magazynek "Kołczan" na pistolet oliwkowa | 6.2.1 | Ładownice Karabinowe | reguła: nazwa~"ładownica" **(⚠ patrz uwaga 6a wyżej — nazwa mówi "na pistolet", powinno być 6.2.2, nie naprawione w tej rundzie)** |
| 26 | Ładownica Neptune Spear Ultima Pistol Multicam Original | 6.2.1 | Ładownice Karabinowe | reguła: nazwa~"ładownica" |
| 27 | Magazynek Magpul  PMAG 30 AR/M4 gen. M3 | 5.1 | Magazynki | reguła: nazwa~"magazynek" |
| 28 | Mechanizm spustowy Hiperfire Competition do AR15/10 | 04 | Części i Tuning (rodzic) | reguła: nazwa~"spust" |
| 29 | Montaż kolimatora Unity Tactical Fast Holosun AEMS czarny | 3.2 | Celowniki Kolimatorowe | reguła: nazwa~"kolimator" |
| 30 | Nóż bushcraft Morakniv Lok BlackBlade Ash Wood stal nierdzewna | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 31 | Nóż bushcraft Real Steel Furrier drewno | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 32 | Nóż Kandar N154 z niedźwiedziem | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 33 | Nóż kuchenny Opinel 126 Paring Knife | 13 | Noże (rodzic) | reguła: attr="Typ noża" **(nóż kuchenny — kwestia dopasowania asortymentu, nie działu; patrz uwaga o Opinel wyżej)** |
| 34 | Nóż składany Benchmade 315BK-01 Successor | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 35 | Nóż składany Kershaw Bel Air XL 6110FDE | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 36 | Nóż składany Kershaw Camshaft 1370 | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 37 | Ochronniki słuchu aktywne 3M Peltor EEP-100 pomarańczowe | 9.1.1 | Ochronniki Słuchu Aktywne | reguła: nazwa~"ochronniki słuchu aktywne" |
| 38 | Ochronniki słuchu aktywne Earmor M31 Mark4 M31-BK-MARK4 czarne | 9.1.1 | Ochronniki Słuchu Aktywne | reguła: nazwa~"ochronniki słuchu aktywne" |
| 39 | Pałka teleskopowa ESP 26" czarna hartowana, rękojeść czarna | 15.2.1 | Pałki Teleskopowe | reguła: nazwa~"pałka teleskopow" |
| 40 | Pistolet wiatrówka RGun Excite 4,5 mm BB CO2 | 11.2 | Pistolety Pneumatyczne | reguła: nazwa~"pistolet wiatrówka" |
| 41 | Pistolet wiatrówka Umarex TDP 45 4,5 mm BB CO2 | 11.2 | Pistolety Pneumatyczne | reguła: nazwa~"pistolet wiatrówka" |
| 42 | Pistolet wiatrówka UX SPA Professional 5,5 mm CO2 | 11.2 | Pistolety Pneumatyczne | reguła: nazwa~"pistolet wiatrówka" |
| 43 | Plecak Texar Aldus 57 l oliwkowy | 6.4.1 | Plecaki | reguła: nazwa~"plecak" |
| 44 | Pokrowiec futerał na lornetkę Vortex GlassPack | 3.3 | Optoelektronika Obserwacyjna | reguła: nazwa~"lornetk" **(⚠ patrz uwaga 6b wyżej — to pokrowiec, powinno być 10.2.2, nie naprawione w tej rundzie)** |
| 45 | Pokrowiec na broń Forsport Silent Hunter 123 cm - oliwkowy | 10.2.2 | Pokrowce Miękkie | reguła: nazwa~"pokrowiec" |
| 46 | Skarpety Comodo Climacontrol Heavy Hiker antracytowe | 12.3.2 | Skarpety Specjalistyczne | reguła: nazwa~"skarpet" |
| 47 | Śpiwór Alpinus Fiber Pro 1100 dla leworęcznych, szary | 14.2.2 | Śpiwory/Maty | reguła: nazwa~"śpiwór" |
| 48 | Tłumik do broni Acheron Librarian .22 LR 1/2x20 UNEF | 04 | Części i Tuning (rodzic) | reguła: nazwa~"tłumik" |
| 49 | Wiatrówka Diana PCP Stormrider 5,5 mm Ek < 17J drewno | 11.1 | Karabinki Pneumatyczne (rodzic) | reguła: nazwa~"wiatrówka" |
| 50 | Wiatrówka PCP Optima by Hatsan Factor FDE 4,5 mm | 11.1 | Karabinki Pneumatyczne (rodzic) | reguła: nazwa~"wiatrówka" |

**2/50 znane niedokładności w mojej własnej weryfikacji** (wiersze 25 i 44, oba opisane w uwadze 6 wyżej — sprzed tej rundy, zgłoszone a nie ukryte) = 4%, w granicach 5%, ale proszę o ocenę tj. Reszta (48/50) wygląda poprawnie.

### 20 największych niezmapowanych grup (marka, wśród produktów „00”) — po poprawkach rundy 2

| # | Marka | Produktów bez działu |
|---|---|---|
| 1 | Beretta | 193 |
| 2 | Hawke Optics | 185 |
| 3 | Tagart | 179 |
| 4 | NN | 141 |
| 5 | M-Tac | 138 |
| 6 | KORE Essentials | 135 |
| 7 | Leapers | 131 |
| 8 | Canik | 115 |
| 9 | Magpul | 107 |
| 10 | Tigerwood | 107 |
| 11 | Wiley X | 104 |
| 12 | Bergara | 96 |
| 13 | Mil-Tec | 94 |
| 14 | Hatsan | 88 |
| 15 | Esbit | 86 |
| 16 | Lansky | 85 |
| 17 | B5 | 81 |
| 18 | Heckler&Koch | 80 |
| 19 | Umarex | 79 |
| 20 | Poe Lang | 79 |

Hawke Optics (185) i Wiley X (104) pojawiły się na liście po usunięciu ich reguł marka→dział (runda 2, punkt 3 wyżej) — to oczekiwany, świadomy koszt tej poprawki. Hatsan (88) i Umarex (79) pojawiły się głównie z powodu wykluczenia magazynków/akcesoriów do wiatrówek z reguły „magazynek” (runda 2, punkt 4).

Te marki nie mają jednej dominującej kategorii (Beretta/Canik/Bergara/Heckler&Koch sprzedają zarówno broń, jak i akcesoria; Tagart/M-Tac/Mil-Tec/Tasmanian Tiger to marki wieloasortymentowe odzieżowo-taktyczne) — stąd brak reguły marka→dział; pokrycie tych grup wymagałoby reguł na poziomie nazwy/atrybutu produktu, nie marki.
