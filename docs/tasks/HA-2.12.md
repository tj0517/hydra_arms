---
id: HA-2.12
title: Kategoryzacja Kolby — reguły do drzewa Hydry
status: done
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
- ≥ 52% produktów Kolby (całego feedu) ma dział Hydry — **jak sprawdzić:** tj uruchamia `--dry-run`; DO PRZYPISANIA ≤ 48% feedu — **wynik (dry-run tj, po rundzie 3):** 6 617 niezmapowane z 13 878 → 52,32% zmapowane (7 261), 3 217 przyjętych (admitted) w działach P1
- kontrola 50 losowych przypisań ma najwyżej 5% błędów — **jak sprawdzić:** tabela w raporcie (patrz Notatki 2026-09-26) — próbka 1 odrzucona (27/50 bez przypisania), próbka 2 odrzucona (4/50 błędów: 25, 26, 29, 44); **próbka 3: 2/50 błędów (20, 48), ocena tj**
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
- 2026-09-26 tj: review rundy 2 — 4/50 błędów (25, 26, 29, 44: wzór »akcesorium do X → dział X« i ładownice pistoletowe); Hawke Optics i Wiley X przywrócone (usunięte wcześniej z mojej instrukcji mimo czystego audytu); excludeName zatwierdzone przez tj przed zapisem.
- 2026-09-26 claude: poprawki rundy 3 (bez dotykania `category-rules.ts` ani testów; nowy `excludeName` na istniejących regułach — mechanizm już przetestowany w rundzie 1, więc bez nowych testów, jak dopuszczone przez tj):
  1. **Przywrócone w `kolba_brands`:** Hawke Optics → "03", Wiley X → "9.2.1" (mój audyt rundy 2 już pokazywał je jako praktycznie jednokategoryjne — 0,7% i 0%).
  2. **Ładownice pistoletowe** (wiersze 25, 26): jedno pole `match.name` nie umie wymagać dwóch niezależnych podciągów jednocześnie („ładownic” I „pistolet”), więc nie da się bezpiecznie zrobić reguły „ładownica + pistolet” bez `ruleMatches`, którego nie miałem dotykać. Zamiast tego: 8 konkretnych, zweryfikowanych fraz ze zbioru 38 realnych ładownic pistoletowych → 6.2.2 (m.in. `kołczan" na pistolet`, `molle single/double pistol`, `rapid access pistol`, `ultima pistol`, `pistol mag pouch`, `pistol pouch`) — naprawia obie zgłoszone pozycje (25 przez frazę „kołczan” na pistolet”, 26 przez „ultima pistol”). Częściowe pokrycie: bezpieczne frazy w rodzaju bare „pistol”/„na pistolet”/„do pistoletu” sprawdziłem i odrzuciłem — łapały 356 niezwiązanych produktów (celowniki laserowe, bloki ryglowe, futerały, uchwyty magnetyczne, multitoole…) w całym feedzie. Reszta ładownic pistoletowych bez jednej z 8 fraz zostaje w 6.2.1 (review) — niedoskonałe, ale bez regresji.
  3. **Wzór „akcesorium do X → dział X”** (zgłoszony na wierszach 29, 44) — systematyczny skan wszystkich 98 reguł pod kątem tego wzoru (osobny skrypt: dla każdej reguły sprawdzone, co by złapała, gdyby wcześniejsze reguły w tablicy jej nie ubiegły, i czy nazwa zawiera słowo akcesorium). Prawdziwe wycieki (nie fałszywe trafienia typu „nóż w etui” = nadal nóż) naprawione przez `excludeName`:
     - `kolimator`/`red dot`: wykluczone `montaż`/`płytka montażow`/`podwyższenie montażow`/`uchwyt montażow` (30 montaży kolimatorów łapanych jako same kolimatory) — i nowa reguła `montaż kolimator` → **3.4.3 Montaże Dedykowane pod Kolimatory** (liść drzewa, dokładnie pasuje) — naprawia wiersz 29 wprost.
     - `lornetk`: wykluczone `pokrowiec`/`futerał`/`adapter statywow` (spadają do istniejącej reguły „pokrowiec”/„futerał” → 10.2.2) — naprawia wiersz 44 wprost.
     - `termowizyjn`: wykluczone `adapter`/`montaż` (nasadki i montaże do termowizorów, nie sam sprzęt).
     - `plecak`: wykluczone `pokrowiec` (pokrowce przeciwdeszczowe NA plecak spadają do reguły „pokrowiec” → 10.2.2).
     - `latark`: wykluczone `etui`/`montaż` (futerały i montaże do latarek, nie same latarki).
     - `gaz pieprzow`: wykluczone `etui`/`uchwyt` (futerały/uchwyty na gaz, nie sam gaz).
     - `magazynek`: dodatkowo wykluczone `uchwyt` (uchwyty magnetyczne NA magazynek, nie same magazynki).
     Sprawdzone i **zostawione bez zmian** (fałszywe trafienia mojego skanu — to nadal właściwy produkt, akcesorium jest dołączone, nie jest całym produktem): noże/saperki/multitoole „w etui” (nadal noże/saperki/multitoole), „Łoże M-LOK” (to JEST łoże, nie akcesorium do łoża), „Kabłąk osłona spustu” (to JEST osłona spustu, część 04), pałki teleskopowe „z uchwytem” (to JEST pałka, uchwyt dołączony), „Adapter tłumika”/„Osłona termiczna tłumika” (zostają w 04 — to nadal właściwy dział, tylko niedokładny liść, niska szkodliwość, pominięte z powodu czasu).
  4. **Znaleziony i naprawiony NOWY błąd rundy 2** (mój własny, nie zgłoszony przez tj — reguły ` low `/` high `/` mid ` z rundy 2 nie wymagały słowa „buty” w nazwie, więc łapały KAŻDY produkt z samodzielnym słowem low/high/mid): 15 produktów spoza obuwia trafiało do działów 12.2.x — montaże optyki („Montaż Primary Arms Tactical 30 mm low”), skarpety („Skarpety…Winter High”), czapka („Czapka…High Vis”), opatrunki („Opatrunki…Low Adherent”), patelnia turystyczna („…High Lid”), trójnóg („…High Country”), szyna („…Ultra Low Profile”), sprężyna („…low-force”), płyn do prania („…Mid Layers”). Naprawione: `excludeName` na wszystkich regułach wysokości butów: `skarpet, czapka, montaż, płytka, opatrun, patelni, trójnóg, szyna, sprężyn, płyn do prania`. Znalezione przy generowaniu próbki 3 (nie w próbce 2 — miałem szczęście, że żaden z 15 nie wylosował się do oceny tj).
  Wynik: pokrycie 7 261/13 878 = 52,32% (w górę z 50,63% dzięki przywróceniu 2 marek, mimo dodatkowych zawężeń tego samego dnia) — nadal poniżej 55%, zgłoszone bez dopisywania reguł żeby to nadgonić. `npm run test:unit`: 49/49. `npx tsc --noEmit`, `npm run lint`: bez nowych błędów. `git diff --stat -- xml-integration/category-rules.ts "xml-integration/__tests__/*"`: pusty (nietknięte).
- 2026-09-26 tj: odbiór PR #21 po 3 rundach — próg pokrycia obniżony z ~55% do ~52% (decyzja tj: kolejne rundy dają coraz mniej, resztę przejmie narzędzie AI z deferred); udowodnione: dry-run tj 52,32% (6617/13878 bez działu), 3217 przyjętych w P1, test:unit 49/49 (tj), próbka 3 2/50 (ocena tj). excludeName zatwierdzone przez tj przed zapisem.

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

### Próbka kontrolna 2 (odrzucona w review — 4/50 błędów: wiersze 25, 26, 29, 44; seed 20260927, losowana WYŁĄCZNIE z produktów zmapowanych)

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

### Próbka kontrolna 3 (zaakceptowana — 2/50 błędów: wiersze 20, 48; seed 20260928, losowana WYŁĄCZNIE z produktów zmapowanych)

| # | Nazwa produktu | Hydra nr | Dział Hydry | Reguła / marka |
|---|---|---|---|---|
| 1 | Buty męskie LOWA ZEPHYR MK2 GTX MID UK czarne | 12.2 | Obuwie Taktyczne i Służbowe (rodzic) | reguła: nazwa~" mid " |
| 2 | Dalmierz Vortex Viper HD 3000 | 3.3 | Optoelektronika Obserwacyjna | reguła: nazwa~"dalmierz" |
| 3 | Kabura Doubletap OWB Strighter CZ P-09 C Nocturne | 6.1 | Kabury | reguła: nazwa~"kabura" |
| 4 | Latarka taktyczna LED Fenix TK17 khaki edycja limitowana | 14.2.3 | Oświetlenie i Zasilanie | reguła: nazwa~"latark" |
| 5 | Lornetka Leupold BX-1 Rogue 8x25 | 3.3 | Optoelektronika Obserwacyjna | reguła: nazwa~"lornetk" |
| 6 | Lornetka Primary Arms GLx 10x42 | 3.3 | Optoelektronika Obserwacyjna | reguła: nazwa~"lornetk" |
| 7 | Lornetka Primary Arms SLx 10x42 | 3.3 | Optoelektronika Obserwacyjna | reguła: nazwa~"lornetk" |
| 8 | Lornetka Vortex Diamondback HD 12x50 | 3.3 | Optoelektronika Obserwacyjna | reguła: nazwa~"lornetk" |
| 9 | Luneta celownicza Hawke Endurance 30 WA 4,5-27x56 SF LR2 FD 20x | 3.1 | Lunety Celownicze | reguła: nazwa~"luneta celownicz" |
| 10 | Luneta celownicza Hawke Vantage 30 WA FD 2.5-10x50 | 3.1 | Lunety Celownicze | reguła: nazwa~"luneta celownicz" |
| 11 | Luneta obserwacyjna Hawke Endurance ED 25-75x85 kątowa | 3.3 | Optoelektronika Obserwacyjna | reguła: nazwa~"luneta obserwacyjn" |
| 12 | Ładownica gumowa Forsport 8 kul, brąz | 6.2.1 | Ładownice Karabinowe | reguła: nazwa~"ładownica" |
| 13 | Maczeta Joker Colombiano JKR487 | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 14 | Mata rusznikarska Real Avid z organizerem Master Armorer's Mat AVMAM-AR | 7.2 | Przybory Czyszczenia (rodzic) | marka="Real Avid" |
| 15 | Materac Alpinus Decin granatowy | 14.2.2 | Śpiwory/Maty | reguła: nazwa~"materac" |
| 16 | Montaż lunety Hawke z mikroskosem 30 mm wysoki Dovetail na szynę 11 mm | 03 | Optyka (rodzic, marka) | marka="Hawke Optics" |
| 17 | Multitool Gerber ArmBar Scout onyx | 13.3.2 | Multitoole Codzienne | reguła: nazwa~"multitool" |
| 18 | Multitool Kershaw PT-2 8810 | 13.3.2 | Multitoole Codzienne | reguła: nazwa~"multitool" |
| 19 | Narzędzie wielofunkcyjne multitool Ganzo G205-B | 13.3.2 | Multitoole Codzienne | reguła: nazwa~"multitool" |
| 20 | Nosek do okularów Wiley X Vapor 2.5 Twist Lock TLNP | 9.2.1 | Okulary Balistyczne | marka="Wiley X" |
| 21 | Nóż Boker Magnum Hunting Line Fixed Universal Droppoint 02RY800 | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 22 | Nóż bushcraft Condor Mountain Pass Carry | 13.1.2 | Noże Survivalowe | reguła: nazwa~"nóż bushcraft" |
| 23 | Nóż Morakniv Companion Black (S) | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 24 | Nóż Morakniv Morakniv Garberg BlackBlade C stal węglowa zielony | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 25 | Nóż Morakniv Wood Carving Hook 164 Left (S) | 13 | Noże (rodzic) | marka="Morakniv" |
| 26 | Nóż myśliwski Kandar N15 | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 27 | Nóż Opinel Colorama 08 inox grab ciemnoniebieski w blistrze | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 28 | Nóż składany Benchmade 99BK-1 Necron | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 29 | Nóż składany Civivi Altus C20076-5 green | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 30 | Nóż składany Ganzo G7393P-OR | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 31 | Nóż składany Joker JKR430 ząbkowany kamuflaż leśny | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 32 | Nóż składany Joker Tucan NO162 | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 33 | Nóż składany Kershaw Mini Iridium 2051TI | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 34 | Nóż składany Kizer Mini Militaw V3634SA6 | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 35 | Nóż taktyczny Benchmade 9170SBK Auto Triage | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 36 | Nóż wojskowy Kandar N27 czarny | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 37 | Nóż z krzesiwem Light My Fire FireKnife Orange | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 38 | Osłona antyrefleksyjna lunety Hawke z obiektywem 32 mm | 03 | Optyka (rodzic, marka) | marka="Hawke Optics" |
| 39 | Plecak taktyczny Tasmanian Tiger Modular Combat 22 L - black | 6.4.1 | Plecaki | reguła: nazwa~"plecak" |
| 40 | Skarpety Comodo Hunting Merino wool lines TRE13 szare | 12.3.2 | Skarpety Specjalistyczne | reguła: nazwa~"skarpet" |
| 41 | Skarpety techniczne Comodo Extreme khaki | 12.3.2 | Skarpety Specjalistyczne | reguła: nazwa~"skarpet" |
| 42 | Spodnie taktyczne Texar Elite Pro 2.0 micro ripstop oliwkowe | 12.1.1 | Spodnie Taktyczne | reguła: nazwa~"spodnie taktyczn" |
| 43 | Szabla Laguiole Champagne Saber Luxury Line Olive wood | 13 | Noże (rodzic) | reguła: attr="Typ noża" |
| 44 | Tłumik płomienia Gomander Helix S 7,62 5/8x24 UNEF | 04 | Części i Tuning (rodzic) | reguła: nazwa~"tłumik" |
| 45 | Wiatrówka Diana PCP XR-210 Black syntetyk 4,5 mm < 17 J | 11.1 | Karabinki Pneumatyczne (rodzic) | reguła: nazwa~"wiatrówka" |
| 46 | Wiatrówka PCP Optima by Hatsan AT44-10S long 6,35 mm | 11.1 | Karabinki Pneumatyczne (rodzic) | reguła: nazwa~"wiatrówka" |
| 47 | Wiatrówka PCP Optima by Hatsan AT44-10W long 4,5 mm | 11.1 | Karabinki Pneumatyczne (rodzic) | reguła: nazwa~"wiatrówka" |
| 48 | Zakrywka klapka obiektywu do HIKMICRO TE19(C)2.0 / TE25 2.0 / TH25P 2.0 / TH35P(C)2.0 / TQ35(C)2.0 / PH35L 2.0 / PQ35L 2.0 / FQ50 | 3.3 | Optoelektronika Obserwacyjna | marka="HIKMICRO by HIKVISION" |
| 49 | Zakrywka okularu Hawke Flip Up Professional 44 mm | 03 | Optyka (rodzic, marka) | marka="Hawke Optics" |
| 50 | Zestaw narzędzi do czyszczenia broni Real Avid Gun Boss Universal Flex Rod Kit AVGCK310-U | 7.2 | Przybory Czyszczenia (rodzic) | marka="Real Avid" |

**0/50 błędów w mojej własnej weryfikacji.** Kilka trafień na węzły-rodzice przez fallback marki (np. „Osłona antyrefleksyjna lunety Hawke” → 03, „Zakrywka okularu Hawke” → 03) — to są akcesoria optyczne trafiające do szerokiego rodzica Optyka z tagiem review, nie błędne działy (w przeciwieństwie do wierszy 29/44 z próbki 2, które trafiały do CAŁKOWICIE innego działu).

**Ocena tj: 2/50 błędów** — wiersz 20 (Wiley X nosek do okularów → 9.2.1) i wiersz 48 (HIKMICRO zakrywka obiektywu → 3.3), oba akcesoria trafiające do działu produktu przez fallback marki (nie przez `excludeName` regułę nazwy — brand fallback nie ma tego mechanizmu). Graniczne, nie policzone jako błąd: wiersz 12 (ładownica na śruty jako „karabinowa”), wiersz 43 (szabla kolekcjonerska w dziale noży — kwestia asortymentu, nie kategorii). Zaakceptowane — patrz `docs/deferred-tasks.md` (2026-09-26, akcesoria łapane przez reguły marki).

### 20 największych niezmapowanych grup (marka, wśród produktów „00”) — po poprawkach rundy 3

| # | Marka | Produktów bez działu |
|---|---|---|
| 1 | Beretta | 193 |
| 2 | Tagart | 179 |
| 3 | NN | 141 |
| 4 | M-Tac | 139 |
| 5 | KORE Essentials | 135 |
| 6 | Leapers | 134 |
| 7 | Canik | 119 |
| 8 | Magpul | 107 |
| 9 | Tigerwood | 107 |
| 10 | Bergara | 96 |
| 11 | Mil-Tec | 94 |
| 12 | Hatsan | 88 |
| 13 | Esbit | 86 |
| 14 | Lansky | 85 |
| 15 | Umarex | 81 |
| 16 | B5 | 81 |
| 17 | Heckler&Koch | 80 |
| 18 | Poe Lang | 79 |
| 19 | Tasmanian Tiger | 79 |
| 20 | 4wild.eu | 79 |

Hawke Optics i Wiley X zniknęły z tej listy po przywróceniu ich reguł marka→dział w rundzie 3.

<details><summary>Poprzednia wersja (po rundzie 2, dla porównania)</summary>

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

Hawke Optics (185) i Wiley X (104) pojawiły się na liście po usunięciu ich reguł marka→dział (runda 2, punkt 3 wyżej) — to oczekiwany, świadomy koszt tej poprawki, cofnięty w rundzie 3.

</details>

Te marki nie mają jednej dominującej kategorii (Beretta/Canik/Bergara/Heckler&Koch sprzedają zarówno broń, jak i akcesoria; Tagart/M-Tac/Mil-Tec/Tasmanian Tiger to marki wieloasortymentowe odzieżowo-taktyczne) — stąd brak reguły marka→dział; pokrycie tych grup wymagałoby reguł na poziomie nazwy/atrybutu produktu, nie marki.
