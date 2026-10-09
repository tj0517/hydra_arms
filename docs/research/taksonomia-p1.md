# Mapowanie podkategorii P1 → drzewo Hydra 01–15

Źródło: `docs/research/analiza_popularnosci_kategorii.xlsx`, arkusz „Podkategorie i filtry", kolumna D = P1.  
Hydra: `xml-integration/hydra-category-tree.txt`.  
Wygenerowane: HA-2.04, 2026-09-24.

**175 wierszy P1** — wszystkie zmapowane (liść lub węzeł rodzic) albo jawnie oznaczone `brak` (17 wierszy).

Kolumny: Lp · Kategoria (arkusz) · Podkategoria · Hydra numer · Hydra nazwa (skrócona) · Sharg · Kolba · SpecShop · Uwagi

- Sharg / Kolba / SpecShop = ✓ gdy nazwa hurtowni pojawia się w „Inspiracja rynkowa"; „—" gdy brak. Wyjątek: wiersze z dopiskiem **w filtrze (HA-2.25)** lub **feed Kolby** — tam ✓ = hurtownia mapuje ten węzeł w `category-map.json` **i** ma takie produkty w feedzie (dry-run + grep feedu 2026-10-08).  
- `brak` = brak odpowiadającego węzła w drzewie 01–15.  
- Węzeł rodzic (np. `04`) → tag `review` w imporcie.


> **Korekta 2026-09-29** (`analiza_popularnosci_kategorii_korekta.xlsx`, arkusz „Podkategorie - korekta”; zrzut i różnice: `korekta-2026-09-29-podkategorie.md`): klient przebudował broń palną, amunicję i broń czarnoprochową (nowe podkategorie wg mechanizmu działania), zmienił „Samoobrona” → „Akcesoria do samoobrony” (+ BAS), usunął „Kolekcjonerstwo i militaria”, dodał „Markery pneumatyczne (RAM i podobne)” i „Magazynki pozostałe”. Nowy arkusz nie ma kolumn P1/P2/P3 ani „Inspiracja rynkowa”.  
> **Zastosowane w HA-2.18 (2026-10-09):** wiersze bez zmian nazwy zachowują priorytet z 15.09; wiersze usunięte (O-24) i zastąpione są tak oznaczone w „Uwagach”; wszystkie **46 nowych nazw** z korekty są w sekcji „Nowe podkategorie” z priorytetem **domyślnym** = input `NEW_SUBCATEGORY_DEFAULT_PRIORITY` (`config/inputs.ts`, O-22; nieustawiony = **P2 = nie importujemy**, tj 2026-10-09). Filtr (`xml-integration/assortment-rules.ts` → `newSubcategories`) dopuszcza węzeł nowej podkategorii tylko przy efektywnym priorytecie P1; odpowiedź klienta na O-22 = pole `priority` w wierszu albo wartość env dla wszystkich naraz.

---

## Brak odpowiednika w drzewie 01–15 — 17 wierszy z 15.09 (2 usunięte w korekcie) + 2 nowe

Wiersze, dla których w drzewie Hydra nie istnieje żaden węzeł (liść ani gałąź) pasujący do tej podkategorii produktowej:

| Lp | Kategoria | Podkategoria | Sharg | Kolba | SpecShop | Powód braku |
|----|-----------|--------------|-------|-------|---------|-------------|
| 141 | Myślistwo | Wabiki | ✓ | ✓ | — | brak gałęzi myślistwo w drzewie |
| 142 | Myślistwo | Kamery i fotopułapki | ✓ | ✓ | — | brak gałęzi myślistwo |
| 143 | Myślistwo | Nęciska i karmidła | ✓ | ✓ | — | brak gałęzi myślistwo |
| 144 | Myślistwo | Akcesoria dla psa myśliwskiego | ✓ | ✓ | — | brak gałęzi myślistwo |
| 145 | Myślistwo | Pastorały i krzesła | ✓ | ✓ | — | brak gałęzi myślistwo |
| 254 | Kolekcjonerstwo i militaria | Repliki broni | — | — | — | **usunięta (O-24)**; category-map.json → 00 (Sharg „Repliki broni”) |
| 257 | Kolekcjonerstwo i militaria | Oznaki i naszywki | — | — | — | **usunięta (O-24)**; category-map.json → 00 (Spechurt „Patches”) |
| 287 | Łucznictwo | Łuki bloczkowe | — | ✓ | — | brak gałęzi łucznictwo; category-map.json → 00 |
| 288 | Łucznictwo | Łuki refleksyjne | — | ✓ | — | brak gałęzi łucznictwo |
| 289 | Łucznictwo | Łuki tradycyjne | — | ✓ | — | brak gałęzi łucznictwo |
| 290 | Łucznictwo | Kusze | — | ✓ | — | brak gałęzi łucznictwo |
| 291 | Łucznictwo | Strzały i bełty | — | ✓ | — | brak gałęzi łucznictwo |
| 321 | Airsoft / ASG | Karabinki AEG | ✓ | ✓ | ✓ | brak gałęzi ASG; category-map.json → 00 |
| 322 | Airsoft / ASG | Karabinki GBB | ✓ | ✓ | ✓ | brak gałęzi ASG |
| 323 | Airsoft / ASG | Pistolety GBB i CO₂ | ✓ | ✓ | ✓ | brak gałęzi ASG |
| 324 | Airsoft / ASG | Repliki sprężynowe i snajperskie | ✓ | ✓ | ✓ | brak gałęzi ASG |
| 325 | Airsoft / ASG | Strzelby ASG | ✓ | ✓ | ✓ | brak gałęzi ASG |

> Łucznictwo (5 szt.), ASG (5 szt.), Myślistwo (5 szt.) = **15 wierszy P1 bez odpowiednika**; Kolekcjonerstwo (2 szt.) usunięte w korekcie (O-24) — zostawione w tabeli jako ślad.  
> Z korekty dochodzą 2 nowe nazwy bez węzła: „Markery pneumatyczne (RAM i podobne)” i „Broń alarmowo-sygnałowa (BAS)” — w sekcji „Nowe podkategorie”, priorytet domyślny, pozycje nieaktywne w filtrze niezależnie od priorytetu.  
> Pozostałe 15 pojawia się u naszych hurtowni i trafia do „00. DO PRZYPISANIA" przy imporcie.  
> Decyzja o dodaniu nowych gałęzi należy do klienta (HA-2.10, O-17).

---

## Pełna tabela mapowania — 175 wierszy P1 z 15.09 (stan po korekcie w „Uwagach”)

| Lp | Kategoria | Podkategoria | Hydra | Hydra nazwa | Sharg | Kolba | SpecShop | Uwagi |
|----|-----------|--------------|-------|-------------|-------|-------|---------|-------|
| 1 | Wyposażenie strzeleckie i trening | Timery strzeleckie | 10.3.2 | Timery Strzeleckie | ✓ | ✓ | ✓ | |
| 2 | Wyposażenie strzeleckie i trening | Chronografy | 10.3.1 | Urządzenia Pomiarowe i Chronografy | ✓ | ✓ | ✓ | |
| 3 | Wyposażenie strzeleckie i trening | Zbijaki i amunicja treningowa | 10.3.3 | Cele Stalowe i Reaktory | ✓ | ✓ | ✓ | zbijaki = popery; amunicja treningowa może też trafiać do 02 |
| 4 | Wyposażenie strzeleckie i trening | Flagi bezpieczeństwa | 10.3.4 | Cele Papierowe i Akcesoria | ✓ | ✓ | ✓ | brak liścia; review |
| 5 | Wyposażenie strzeleckie i trening | Maty strzeleckie | 10.3.4 | Cele Papierowe i Akcesoria | ✓ | ✓ | ✓ | brak liścia; review |
| 11 | Broń palna | Pistolety samopowtarzalne | 1.1.1 | Pistolety Samopowtarzalne | — | — | — | nazwa bez zmian w korekcie → P1 z 15.09; koncesja; brak naszych hurtowni (Sharg „Broń palna” → 00, deferred HA-2.25) |
| 12 | Broń palna | Rewolwery | 1.1.2 | Rewolwery | — | — | — | nazwa bez zmian w korekcie → P1 z 15.09; koncesja; brak naszych hurtowni |
| 13 | Broń palna | Karabinki samopowtarzalne | 1.2.1 | Karabiny i Karabinki Samopowtarzalne | — | — | — | nazwa bez zmian w korekcie → P1 z 15.09; koncesja; brak naszych hurtowni |
| 14 | Broń palna | Karabiny powtarzalne | 1.2.2 | Karabiny i Karabinki Powtarzalne | — | — | — | nazwa bez zmian w korekcie → P1 z 15.09; koncesja; brak naszych hurtowni |
| 15 | Broń palna | Strzelby | 1.3 | Strzelby Gładkolufowe | ✓ | — | — | **zastąpiony w korekcie** przez 4 nowe podkategorie (Strzelby jednostrzałowe / wielolufowe łamane / powtarzalne / samopowtarzalne → 1.3.3 / 1.3.3 / 1.3.1 / 1.3.2, priorytet domyślny — tabela „Nowe podkategorie”); węzeł 1.3 **zostaje w filtrze** jako istniejący węzeł (HA-2.25: Sharg „Strzelby Hatsan” → 1.3); rodzic → review; permit (grupa A) |
| — | Broń palna | Broń alarmowa i sygnałowa | 1.5 | Broń alarmowa i sygnałowa | ✓ | — | ✓ | **w filtrze (HA-2.25)**: wiersz dodany (brak w arkuszu P1); Sharg „Rewolwery Alarmowe” / „BROŃ ALARMOWA Rewolwery”, Spechurt „Broń hukowa” → 1.5 (Sharg „Broń palna” usunięte z mapy — mieszało broń palną, Piettę i części) (`category-map.json`); permit (grupa A); O-23: BAS ≤6 mm wg klienta bez pozwolenia |
| 19 | Części i tuning broni | Lufy | 04 | Części Zamienne i Tuning Broni | — | — | ✓ | brak liścia lufy; rodzic → review |
| 20 | Części i tuning broni | Zamki, suwadła i BCG | 04 | Części Zamienne i Tuning Broni | — | — | ✓ | brak liścia; rodzic → review |
| 21 | Części i tuning broni | Spusty | 04 | Części Zamienne i Tuning Broni | — | — | ✓ | rodzic → review |
| 22 | Części i tuning broni | Sprężyny | 04 | Części Zamienne i Tuning Broni | — | — | ✓ | brak liścia; rodzic → review |
| 23 | Części i tuning broni | Kolby i stopki | 4.6.1 | Kolby | — | — | ✓ | |
| 31 | Czyszczenie i konserwacja broni | Zestawy czyszczące | 7.2 | Przybory do Czyszczenia | ✓ | ✓ | ✓ | brak liścia „zestaw"; rodzic → review |
| 32 | Czyszczenie i konserwacja broni | Wyciory | 7.2.1 | Wyciory i Sznury do Luf | ✓ | ✓ | ✓ | |
| 33 | Czyszczenie i konserwacja broni | Szczotki, jagi i patche | 7.2 | Przybory do Czyszczenia | ✓ | ✓ | ✓ | spans 7.2.2 + 7.2.3; rodzic → review |
| 34 | Czyszczenie i konserwacja broni | Linki czyszczące / BoreSnake | 7.2.1 | Wyciory i Sznury do Luf | ✓ | ✓ | ✓ | sznury BoreSnake = 7.2.1 |
| 35 | Czyszczenie i konserwacja broni | Rozpuszczalniki i odtłuszczacze | 7.1.1 | Solwenty i Zmywacze | ✓ | ✓ | ✓ | |
| 40 | Magazynki | Magazynki pistoletowe | 5.1 | Magazynki Pistoletowe i Karabinowe | ✓ | ✓ | ✓ | |
| 41 | Magazynki | Magazynki AR | 5.1 | Magazynki Pistoletowe i Karabinowe | ✓ | ✓ | ✓ | |
| 42 | Magazynki | Magazynki AK | 5.1 | Magazynki Pistoletowe i Karabinowe | ✓ | ✓ | ✓ | |
| 43 | Magazynki | Magazynki PCC / SMG | 5.1 | Magazynki Pistoletowe i Karabinowe | ✓ | ✓ | ✓ | |
| 44 | Magazynki | Magazynki do karabinów powtarzalnych | 5.1 | Magazynki Pistoletowe i Karabinowe | ✓ | ✓ | ✓ | |
| 49 | Optyka celownicza | Lunety celownicze | 3.1 | Lunety Celownicze | ✓ | ✓ | ✓ | |
| 50 | Optyka celownicza | Kolimatory | 3.2 | Celowniki Kolimatorowe i Holograficzne | ✓ | ✓ | ✓ | |
| 51 | Optyka celownicza | Celowniki holograficzne | 3.2 | Celowniki Kolimatorowe i Holograficzne | ✓ | ✓ | ✓ | |
| 52 | Optyka celownicza | Celowniki pryzmatyczne | 3.2 | Celowniki Kolimatorowe i Holograficzne | ✓ | ✓ | ✓ | Prism Scopes wymienione w opisie 3.2 |
| 53 | Optyka celownicza | Powiększalniki | 3.2 | Celowniki Kolimatorowe i Holograficzne | ✓ | ✓ | ✓ | Magnifiers 3x/5x wymienione w opisie 3.2 |
| 57 | Survival, outdoor i camping | Namioty | 14.2.1 | Schronienie | ✓ | ✓ | ✓ | |
| 58 | Survival, outdoor i camping | Tarpy i schronienia | 14.2.1 | Schronienie | ✓ | ✓ | ✓ | tarpy/płachty wymienione w 14.2.1 |
| 59 | Survival, outdoor i camping | Śpiwory | 14.2.2 | Systemy Śpiworów | ✓ | ✓ | ✓ | |
| 60 | Survival, outdoor i camping | Maty i materace | 14.2.2 | Systemy Śpiworów | ✓ | ✓ | ✓ | materace samopompujące w opisie 14.2.2 |
| 61 | Survival, outdoor i camping | Hamaki | 14.2.1 | Schronienie | ✓ | ✓ | ✓ | hamaki taktyczne w opisie 14.2.1 |
| 68 | Latarki i oświetlenie | Latarki ręczne | 14.2.3 | Oświetlenie i Zasilanie | ✓ | ✓ | ✓ | |
| 69 | Latarki i oświetlenie | Latarki taktyczne do broni | 14.2.3 | Oświetlenie i Zasilanie | ✓ | ✓ | ✓ | konwencja z category-map.json |
| 70 | Latarki i oświetlenie | Latarki czołowe | 14.2.3 | Oświetlenie i Zasilanie | ✓ | ✓ | ✓ | |
| 71 | Latarki i oświetlenie | Latarnie kempingowe | 14.2.3 | Oświetlenie i Zasilanie | ✓ | ✓ | ✓ | |
| 72 | Latarki i oświetlenie | Latarki poszukiwawcze | 14.2.3 | Oświetlenie i Zasilanie | ✓ | ✓ | ✓ | |
| 78 | Akcesoria do broni | Dwójnogi i trójnogi | 04 | Części Zamienne i Tuning Broni | ✓ | ✓ | ✓ | brak liścia; rodzic → review |
| 79 | Akcesoria do broni | Zawieszenia i pasy nośne | 6.3.3 | Pasy Nośne do Broni | ✓ | ✓ | ✓ | |
| 80 | Akcesoria do broni | Podpórki i pastorały | 04 | Części Zamienne i Tuning Broni | ✓ | ✓ | ✓ | brak liścia; rodzic → review |
| 81 | Akcesoria do broni | Łapacze łusek | 04 | Części Zamienne i Tuning Broni | ✓ | ✓ | ✓ | brak liścia; rodzic → review |
| 82 | Akcesoria do broni | Flagi i znaczniki bezpieczeństwa | 10 | Akcesoria Strzelnicze i Logistyka | ✓ | ✓ | ✓ | akcesoria torowe; brak liścia; rodzic → review |
| 87 | Kabury | Kabury IWB | 6.1 | Kabury Pistoletowe | ✓ | ✓ | ✓ | |
| 88 | Kabury | Kabury OWB | 6.1 | Kabury Pistoletowe | ✓ | ✓ | ✓ | |
| 89 | Kabury | Kabury służbowe | 6.1 | Kabury Pistoletowe | ✓ | ✓ | ✓ | |
| 90 | Kabury | Kabury sportowe | 6.1 | Kabury Pistoletowe | ✓ | ✓ | ✓ | |
| 91 | Kabury | Kabury udowe | 6.1 | Kabury Pistoletowe | ✓ | ✓ | ✓ | kabury udowe = holster, mieści się w 6.1 |
| 97 | Odzież | Kurtki i softshelle | 12.1.3 | Kurtki i Warstwy Zewnętrzne | ✓ | ✓ | ✓ | |
| 98 | Odzież | Spodnie | 12.1.1 | Spodnie Taktyczne i Bojówki | ✓ | ✓ | ✓ | |
| 99 | Odzież | Combat shirts i koszule | 12.1.2 | Bluzy i Combat Shirty | ✓ | ✓ | ✓ | |
| 100 | Odzież | Bluzy i polary | 12.1 | Odzież Taktyczna i Mundurowa | ✓ | ✓ | ✓ | spans 12.1.2 + 12.1.3; rodzic → review |
| 101 | Odzież | Bielizna termiczna | 12.3.1 | Bielizna Aktywna | ✓ | ✓ | ✓ | |
| 107 | Optyka obserwacyjna | Lornetki | 3.3 | Optoelektronika Obserwacyjna i Celownicza | — | ✓ | ✓ | |
| 108 | Optyka obserwacyjna | Monokulary | 3.3 | Optoelektronika Obserwacyjna i Celownicza | — | ✓ | ✓ | |
| 109 | Optyka obserwacyjna | Lunety obserwacyjne | 3.3 | Optoelektronika Obserwacyjna i Celownicza | — | ✓ | ✓ | spotting scopes |
| 110 | Optyka obserwacyjna | Dalmierze | 3.3 | Optoelektronika Obserwacyjna i Celownicza | — | ✓ | ✓ | Dalmierze laserowe w opisie 3.3 |
| 111 | Optyka obserwacyjna | Teleskopy | 3.3 | Optoelektronika Obserwacyjna i Celownicza | — | ✓ | ✓ | teleskopy obserwacyjne (nie astronomiczne) |
| 114 | Oporządzenie taktyczne | Plate carriery | 9.3.1 | Kamizelki Zintegrowane i Plate Carriery | ✓ | — | ✓ | plate carrier (oporządzenie, bez płyt) = 9.3.1; review |
| 115 | Oporządzenie taktyczne | Chest rigi | 6.4 | Pozostałe Wyposażenie do Przenoszenia | ✓ | — | ✓ | brak liścia chest rig; rodzic → review |
| 116 | Oporządzenie taktyczne | Pasy taktyczne | 6.3.2 | Pasy Taktyczne i Służbowe | ✓ | — | ✓ | |
| 117 | Oporządzenie taktyczne | Ładownice karabinowe | 6.2.1 | Ładownice Karabinowe | ✓ | — | ✓ | |
| 118 | Oporządzenie taktyczne | Ładownice pistoletowe | 6.2.2 | Ładownice Pistoletowe | ✓ | — | ✓ | |
| 125 | Obuwie | Buty taktyczne | 12.2.1 | Obuwie Wysokie | — | ✓ | ✓ | |
| 126 | Obuwie | Buty trekkingowe | 12.2.2 | Obuwie Niskie i Podejściowe | — | ✓ | ✓ | |
| 127 | Obuwie | Buty myśliwskie | 12.2.1 | Obuwie Wysokie | — | ✓ | ✓ | brak liścia myśliwskie; review |
| 128 | Obuwie | Buty zimowe | 12.2 | Obuwie Taktyczne i Służbowe | — | ✓ | ✓ | brak liścia zimowe; rodzic → review |
| 129 | Obuwie | Buty pustynne i letnie | 12.2.1 | Obuwie Wysokie | — | ✓ | ✓ | buty pustynne wymienione w opisie 12.2.1 |
| 133 | Futerały, pokrowce i walizki | Futerały pistoletowe | 10.2.2 | Pokrowce Miękkie | ✓ | ✓ | ✓ | |
| 134 | Futerały, pokrowce i walizki | Futerały karabinowe | 10.2.2 | Pokrowce Miękkie | ✓ | ✓ | ✓ | |
| 135 | Futerały, pokrowce i walizki | Futerały do strzelb | 10.2.2 | Pokrowce Miękkie | ✓ | ✓ | ✓ | |
| 136 | Futerały, pokrowce i walizki | Twarde walizki transportowe | 10.2.1 | Walizki Sztywne | ✓ | ✓ | ✓ | |
| 137 | Futerały, pokrowce i walizki | Torby strzeleckie | 6.4.2 | Torby Strzeleckie | ✓ | ✓ | ✓ | |
| 141 | Myślistwo | Wabiki | brak | — | ✓ | ✓ | — | brak gałęzi myślistwo |
| 142 | Myślistwo | Kamery i fotopułapki | brak | — | ✓ | ✓ | — | brak gałęzi myślistwo |
| 143 | Myślistwo | Nęciska i karmidła | brak | — | ✓ | ✓ | — | brak gałęzi myślistwo |
| 144 | Myślistwo | Akcesoria dla psa myśliwskiego | brak | — | ✓ | ✓ | — | brak gałęzi myślistwo |
| 145 | Myślistwo | Pastorały i krzesła | brak | — | ✓ | ✓ | — | brak gałęzi myślistwo |
| 150 | Noże, maczety i siekiery | Noże składane | 13.2 | Noże Składane | ✓ | ✓ | ✓ | |
| 151 | Noże, maczety i siekiery | Noże z głownią stałą | 13.1 | Noże ze Stałą Klingą | ✓ | ✓ | ✓ | |
| 152 | Noże, maczety i siekiery | Noże myśliwskie | 13.1.2 | Noże Survivalowe i Bushcraftowe | ✓ | ✓ | ✓ | konwencja z category-map.json |
| 153 | Noże, maczety i siekiery | Noże survivalowe | 13.1.2 | Noże Survivalowe i Bushcraftowe | ✓ | ✓ | ✓ | |
| 154 | Noże, maczety i siekiery | Noże taktyczne | 13.1.1 | Noże Taktyczne i Bojowe | ✓ | ✓ | ✓ | |
| 160 | Montaże optyki | Pierścienie | 3.4.2 | Pierścienie i Obejmy Montażowe | ✓ | ✓ | ✓ | |
| 161 | Montaże optyki | Montaże jednoczęściowe | 3.4.1 | Montaże Jednoczęściowe | ✓ | ✓ | ✓ | |
| 162 | Montaże optyki | Bazy montażowe | 3.4.4 | Bazy i Szyny Montażowe | ✓ | ✓ | ✓ | |
| 163 | Montaże optyki | Szyny | 3.4.4 | Bazy i Szyny Montażowe | ✓ | ✓ | ✓ | Picatinny / Weaver |
| 164 | Montaże optyki | Płytki do kolimatorów | 3.4.3 | Montaże Dedykowane pod Kolimatory | ✓ | ✓ | ✓ | |
| 169 | Amunicja i elaboracja | Amunicja pistoletowa | 2.1 | Amunicja Pistoletowa i Rewolwerowa | — | — | — | **zastąpiony w korekcie** przez „Naboje centralnego zapłonu do broni krótkiej” (→ 2.1, priorytet domyślny); koncesja; brak naszych hurtowni; poza filtrem |
| 170 | Amunicja i elaboracja | Amunicja karabinowa | 2.2 | Amunicja Pośrednia i Karabinowa | — | — | — | **zastąpiony w korekcie** przez „Naboje centralnego zapłonu do broni długiej gwintowanej” (→ 2.2, priorytet domyślny); koncesja; brak naszych hurtowni; poza filtrem |
| 171 | Amunicja i elaboracja | Amunicja strzelbowa | 2.3 | Amunicja Śrutowa | — | — | — | **zastąpiony w korekcie** przez „Naboje śrutowe / kulowe do broni gładkolufowej” (→ 2.3, priorytet domyślny); koncesja; brak naszych hurtowni; poza filtrem |
| 172 | Amunicja i elaboracja | Amunicja bocznego zapłonu | 2.4 | Amunicja Bocznego Zapłonu | — | — | — | **zastąpiony w korekcie** przez „Naboje bocznego zapłonu” (→ 2.4, priorytet domyślny); koncesja; brak naszych hurtowni; poza filtrem |
| — | Amunicja i elaboracja | Amunicja hukowa, alarmowa i gazowa | 2.5 | Amunicja Hukowa, Alarmowa i Gazowa | ✓ | — | — | **w filtrze (HA-2.25)**: wiersz dodany (brak w arkuszu P1); Sharg „BROŃ HUKOWA Amunicja” / „…Konserwacja i akcesoria do broni palnej > Amunicja” → 2.5 (`category-map.json`); rodzic → review; permit (grupa A) |
| 173 | Amunicja i elaboracja | Amunicja myśliwska | 02 | Amunicja i Elementy Rechargingu | — | — | — | **zastąpiony w korekcie** — korekta dzieli amunicję wg zapłonu/lufy, nie wg celu (brak odpowiednika „myśliwska”); brak naszych hurtowni; poza filtrem |
| 184 | Multitoole i narzędzia outdoor | Multitoole kombinerkowe | 13.3.2 | Multitoole Codzienne | ✓ | ✓ | ✓ | |
| 185 | Multitoole i narzędzia outdoor | Scyzoryki | 13.2 | Noże Składane | ✓ | ✓ | ✓ | konwencja z category-map.json |
| 186 | Multitoole i narzędzia outdoor | Narzędzia brelokowe | 13.3 | Narzędzia Wielofunkcyjne i Multitool-e | ✓ | ✓ | ✓ | brak liścia; rodzic → review |
| 187 | Multitoole i narzędzia outdoor | Saperki | 13.4.2 | Narzędzia Saperskie | ✓ | ✓ | ✓ | |
| 188 | Multitoole i narzędzia outdoor | Piły składane | 13.4.2 | Narzędzia Saperskie | ✓ | ✓ | ✓ | piły ręczne w opisie 13.4.2 |
| 192 | Narzędzia rusznikarskie | Wkrętaki i bity | 7.3.1 | Klucze i Narzędzia Dedykowane | — | ✓ | ✓ | |
| 193 | Narzędzia rusznikarskie | Wybijaki i młotki | 7.3.1 | Klucze i Narzędzia Dedykowane | — | ✓ | ✓ | wybijaki do pinów, młotki w opisie 7.3.1 |
| 194 | Narzędzia rusznikarskie | Imadła i bloki montażowe | 7.3.1 | Klucze i Narzędzia Dedykowane | — | ✓ | ✓ | bloki montażowe do imadeł w opisie 7.3.1 |
| 195 | Narzędzia rusznikarskie | Klucze dynamometryczne | 7.3.2 | Narzędzia Precyzyjne i Pomiarowe | — | ✓ | ✓ | |
| 196 | Narzędzia rusznikarskie | Narzędzia do celowników | 7.3.2 | Narzędzia Precyzyjne i Pomiarowe | — | ✓ | ✓ | |
| 202 | Tarcze, cele i kulochwyty | Tarcze papierowe | 10.3.4 | Cele Papierowe i Akcesoria | ✓ | ✓ | ✓ | |
| 203 | Tarcze, cele i kulochwyty | Tarcze reaktywne | 10.3.3 | Cele Stalowe i Reaktory | ✓ | ✓ | ✓ | |
| 204 | Tarcze, cele i kulochwyty | Cele stalowe | 10.3.3 | Cele Stalowe i Reaktory | ✓ | ✓ | ✓ | |
| 205 | Tarcze, cele i kulochwyty | Gongi | 10.3.3 | Cele Stalowe i Reaktory | ✓ | ✓ | ✓ | gongi wymienione w opisie 10.3.3 |
| 206 | Tarcze, cele i kulochwyty | Poppery | 10.3.3 | Cele Stalowe i Reaktory | ✓ | ✓ | ✓ | popery wymienione w opisie 10.3.3 |
| 214 | Plecaki, torby i organizery | Plecaki taktyczne | 6.4.1 | Plecaki Taktyczne i Patrolowe | ✓ | ✓ | ✓ | |
| 215 | Plecaki, torby i organizery | Plecaki jednodniowe | 6.4.1 | Plecaki Taktyczne i Patrolowe | ✓ | ✓ | ✓ | |
| 216 | Plecaki, torby i organizery | Plecaki ekspedycyjne | 6.4.1 | Plecaki Taktyczne i Patrolowe | ✓ | ✓ | ✓ | |
| 217 | Plecaki, torby i organizery | Torby transportowe | 6.4 | Pozostałe Wyposażenie do Przenoszenia | ✓ | ✓ | ✓ | brak liścia; rodzic → review |
| 218 | Plecaki, torby i organizery | Torby strzeleckie | 6.4.2 | Torby Strzeleckie | ✓ | ✓ | ✓ | |
| 223 | Ochrona słuchu i wzroku | Nauszniki pasywne | 9.1.2 | Pasywne Ochronniki Słuchu | ✓ | ✓ | ✓ | |
| 224 | Ochrona słuchu i wzroku | Nauszniki aktywne | 9.1.1 | Aktywne Ochronniki Słuchu | ✓ | ✓ | ✓ | |
| 225 | Ochrona słuchu i wzroku | Stopery | 9.1.3 | Zatyczki i Stopery Douszne | ✓ | ✓ | ✓ | |
| 226 | Ochrona słuchu i wzroku | Elektroniczna ochrona douszna | 9.1.3 | Zatyczki i Stopery Douszne | ✓ | ✓ | ✓ | zatyczki aktywne douszne w opisie 9.1.3 |
| 227 | Ochrona słuchu i wzroku | Okulary przezroczyste | 9.2.1 | Okulary Balistyczne | ✓ | ✓ | ✓ | okulary z wizjerami klasy balistycznej |
| 232 | Termowizja i noktowizja | Monokulary termowizyjne | 3.3 | Optoelektronika Obserwacyjna i Celownicza | ✓ | ✓ | — | |
| 233 | Termowizja i noktowizja | Celowniki termowizyjne | 3.3 | Optoelektronika Obserwacyjna i Celownicza | ✓ | ✓ | — | |
| 234 | Termowizja i noktowizja | Nasadki termowizyjne | 3.3 | Optoelektronika Obserwacyjna i Celownicza | ✓ | ✓ | — | clip-on thermal; brak liścia; review |
| 235 | Termowizja i noktowizja | Noktowizory cyfrowe | 3.3 | Optoelektronika Obserwacyjna i Celownicza | ✓ | ✓ | — | |
| 236 | Termowizja i noktowizja | Noktowizory analogowe | 3.3 | Optoelektronika Obserwacyjna i Celownicza | ✓ | ✓ | — | |
| 242 | Broń czarnoprochowa | Rewolwery czarnoprochowe | 1.1.2 | Rewolwery | — | — | — | **zastąpiony w korekcie** przez „Rewolwery rozdzielnego ładowania” (→ **1.4**, priorytet domyślny) — rozjazd 1.1.2 (HA-2.04) vs 1.4 (reguły Kolby, HA-2.25) rozstrzygnięty na 1.4 w nowym wierszu; feed Kolby bez czarnoprochowej (grep 2026-10-08); Sharg Pietta w „Broń palna” → 00 (deferred HA-2.25) |
| 243 | Broń czarnoprochowa | Pistolety czarnoprochowe | 1.1 | Broń Krótka | — | — | — | **zastąpiony w korekcie** przez „Pistolety rozdzielnego ładowania odprzodowego” (→ **1.4**, priorytet domyślny) i „Broń czarnoprochowa na amunicję scaloną — krótka” (→ 1.1); feed Kolby bez czarnoprochowej (grep 2026-10-08) |
| 244 | Broń czarnoprochowa | Karabiny czarnoprochowe | 1.2 | Broń Długa | — | — | — | **zastąpiony w korekcie** przez „Karabiny rozdzielnego ładowania odprzodowego” (→ **1.4**, priorytet domyślny) i „…na amunicję scaloną — długa gwintowana” (→ 1.2); feed Kolby bez czarnoprochowej (grep 2026-10-08) |
| 245 | Broń czarnoprochowa | Strzelby czarnoprochowe | 1.3 | Strzelby Gładkolufowe | ✓ | — | — | **zastąpiony w korekcie** przez „Muszkiety i strzelby rozdzielnego ładowania odprzodowego” (→ **1.4**, zgodnie z regułą Kolby „czarnoprochow”) i „…na amunicję scaloną — długa gładkolufowa lub kombinowana” (→ 1.3); węzeł 1.3 zostaje w filtrze (HA-2.25, Sharg „Strzelby Hatsan”) |
| 246 | Broń czarnoprochowa | Kapiszony | 2.6 | Elementy Koncesjonowane do Elaboracji | — | — | — | **zastąpiony w korekcie** — kapiszony nie mają już własnego wiersza (najbliżej: „Spłonki”, nazwa z 15.09 z priorytetem **P3**, oraz nowa „Proch czarny” → 2.6, priorytet domyślny); węzeł 2.6 **zostaje w filtrze** jako istniejący (HA-2.25; reguły Kolby „kapiszon” / „proch czarny” uśpione — feed bez takich produktów); permit (grupa A) |
| 253 | Kolekcjonerstwo i militaria | Broń zdezaktywowana | 1.4 | Broń Kolekcjonerska i Historyczna | ✓ | — | — | **usunięta (O-24, 2026-09-29)** — kategoria wypada ze sklepu; węzeł 1.4 **zostaje w filtrze wyłącznie dlatego**, że podkategorie broni czarnoprochowej z korekty (rozdzielnego ładowania) mapują tam przez Sharg „Broń czarnoprochowa” (HA-2.25), nie z powodu tego wiersza; permit + permit_review (grupa C, O-29) |
| 254 | Kolekcjonerstwo i militaria | Repliki broni | brak | — | — | — | — | **usunięta (O-24)**; Sharg „Repliki broni” → 00 w category-map.json — wpis zostaje jako jawne „nie mapujemy” (nie dopuszcza niczego); red proof: `assortment-filter.test.ts` |
| 255 | Kolekcjonerstwo i militaria | Hełmy militarne | 9.3.4 | Hełmy Balistyczne | — | — | — | **usunięta (O-24)**; węzeł 9.3.4 zostaje w filtrze z innego wiersza P1 (lp 347 Hełmy balistyczne, Sharg/SpecShop) |
| 256 | Kolekcjonerstwo i militaria | Mundury | 12.1 | Odzież Taktyczna i Mundurowa | — | — | — | **usunięta (O-24)**; węzeł 12.1 zostaje w filtrze z innych wierszy P1 (lp 100 Bluzy i polary; Kolba „spodnie” → 12.1 review) |
| 257 | Kolekcjonerstwo i militaria | Oznaki i naszywki | brak | — | — | — | — | **usunięta (O-24)**; Spechurt „Patches” → 00 w category-map.json — wpis zostaje jako jawne „nie mapujemy”; red proof: `assortment-filter.test.ts` |
| 263 | Medycyna i pierwsza pomoc | Apteczki | 14.1.1 | Indywidualne Apteczki Taktyczne | — | — | ✓ | |
| 264 | Medycyna i pierwsza pomoc | IFAK | 14.1.1 | Indywidualne Apteczki Taktyczne | — | — | ✓ | IFAK wymienione w opisie 14.1.1 |
| 265 | Medycyna i pierwsza pomoc | Stazy taktyczne | 14.1.2 | Wyposażenie Hemostatyczne | — | — | ✓ | CAT Gen7 / SOFTT-W w opisie 14.1.2 |
| 266 | Medycyna i pierwsza pomoc | Hemostatyki | 14.1.2 | Wyposażenie Hemostatyczne | — | — | ✓ | QuikClot / Celox w opisie 14.1.2 |
| 267 | Medycyna i pierwsza pomoc | Opatrunki | 14.1.2 | Wyposażenie Hemostatyczne | — | — | ✓ | opatrunki hemostatyczne; brak liścia; review |
| 275 | Wiatrówki | Karabinki sprężynowe | 11.1.3 | Karabinki Sprężynowe | ✓ | ✓ | — | |
| 276 | Wiatrówki | Karabinki PCP | 11.1 | Karabinki Pneumatyczne | ✓ | ✓ | — | spans 11.1.1 (≤17 J) + 11.1.2 (FAC >17 J); rodzic → review |
| 277 | Wiatrówki | Karabinki CO₂ | 11.1.4 | Karabinki PCA i CO2 | ✓ | ✓ | — | |
| 278 | Wiatrówki | Karabinki PCA | 11.1.4 | Karabinki PCA i CO2 | ✓ | ✓ | — | |
| 279 | Wiatrówki | Pistolety pneumatyczne | 11.2 | Pistolety i Rewolwery Pneumatyczne | ✓ | ✓ | — | |
| 287 | Łucznictwo | Łuki bloczkowe | brak | — | — | ✓ | — | brak gałęzi łucznictwo |
| 288 | Łucznictwo | Łuki refleksyjne | brak | — | — | ✓ | — | brak gałęzi łucznictwo |
| 289 | Łucznictwo | Łuki tradycyjne | brak | — | — | ✓ | — | brak gałęzi łucznictwo |
| 290 | Łucznictwo | Kusze | brak | — | — | ✓ | — | brak gałęzi łucznictwo |
| 291 | Łucznictwo | Strzały i bełty | brak | — | — | ✓ | — | brak gałęzi łucznictwo |
| 300 | Elektronika, nawigacja i łączność | GPS ręczne | 14.4.1 | Nawigacja Klasyczna | — | — | ✓ | |
| 301 | Elektronika, nawigacja i łączność | Kompasy | 14.4.1 | Nawigacja Klasyczna | — | — | ✓ | |
| 302 | Elektronika, nawigacja i łączność | Radiotelefony | 14.4.2 | Radiokomunikacja | — | — | ✓ | |
| 303 | Elektronika, nawigacja i łączność | PTT i zestawy słuchawkowe | 14.4.2 | Radiokomunikacja | — | — | ✓ | ochronniki ze zintegrowanym radiem w opisie 14.4.2 |
| 304 | Elektronika, nawigacja i łączność | Powerbanki | 14.2.3 | Oświetlenie i Zasilanie | — | — | ✓ | powerbanki w opisie 14.2.3 |
| 311 | Akcesoria do samoobrony | Gaz pieprzowy — strumień | 15.1.1 | Gazy Pieprzowe Ręczne | ✓ | ✓ | ✓ | strumień w opisie 15.1.1; **[nowa kategoria: Akcesoria do samoobrony]** (korekta 2026-09-29; była „Samoobrona”); P1 z 15.09 bez zmian |
| 312 | Akcesoria do samoobrony | Gaz pieprzowy — stożek / chmura | 15.1.1 | Gazy Pieprzowe Ręczne | ✓ | ✓ | ✓ | Fog w opisie 15.1.1; **[nowa kategoria: Akcesoria do samoobrony]**; P1 z 15.09 bez zmian |
| 313 | Akcesoria do samoobrony | Gaz pieprzowy — żel / pianka | 15.1.1 | Gazy Pieprzowe Ręczne | ✓ | ✓ | ✓ | Foam w opisie 15.1.1; **[nowa kategoria: Akcesoria do samoobrony]**; P1 z 15.09 bez zmian |
| 314 | Akcesoria do samoobrony | Paralizatory | 15.3 | Paralizatory | ✓ | ✓ | ✓ | **[nowa kategoria: Akcesoria do samoobrony]**; P1 z 15.09 bez zmian; arkusz: „+/-” >10 mA → permit + permit_review (grupa C, permit-rules.ts) |
| 315 | Akcesoria do samoobrony | Pałki teleskopowe | 15.2.1 | Pałki Teleskopowe Hartowane | ✓ | ✓ | ✓ | **[nowa kategoria: Akcesoria do samoobrony]**; P1 z 15.09 bez zmian |
| 321 | Airsoft / ASG | Karabinki AEG | brak | — | ✓ | ✓ | ✓ | brak gałęzi ASG; category-map.json → 00 |
| 322 | Airsoft / ASG | Karabinki GBB | brak | — | ✓ | ✓ | ✓ | brak gałęzi ASG |
| 323 | Airsoft / ASG | Pistolety GBB i CO₂ | brak | — | ✓ | ✓ | ✓ | brak gałęzi ASG |
| 324 | Airsoft / ASG | Repliki sprężynowe i snajperskie | brak | — | ✓ | ✓ | ✓ | brak gałęzi ASG |
| 325 | Airsoft / ASG | Strzelby ASG | brak | — | ✓ | ✓ | ✓ | brak gałęzi ASG |
| 335 | Sejfy i przechowywanie | Szafy na broń długą | 10.1.1 | Szafy na Broń Długą | — | ✓ | — | |
| 336 | Sejfy i przechowywanie | Szafy na broń krótką | 10.1.2 | Sejfy na Broń Krótką | — | ✓ | — | |
| 337 | Sejfy i przechowywanie | Sejfy | 10.1 | Sejfy i Szafy na Broń | — | ✓ | — | spans 10.1.2 + 10.1.3; rodzic → review |
| 338 | Sejfy i przechowywanie | Szafy amunicyjne | 10.1 | Sejfy i Szafy na Broń | — | ✓ | — | brak liścia amunicyjne; rodzic → review |
| 339 | Sejfy i przechowywanie | Skrzynki transportowe | 10.2.1 | Walizki Sztywne | — | ✓ | — | |
| 344 | Ochrona balistyczna i CBRN | Płyty balistyczne | 9.3.2 | Twarde Płyty Balistyczne | ✓ | — | ✓ | |
| 345 | Ochrona balistyczna i CBRN | Kamizelki miękkie | 9.3.3 | Miękkie Wkłady Balistyczne | ✓ | — | ✓ | |
| 346 | Ochrona balistyczna i CBRN | Plate carriery do ochrony balistycznej | 9.3.1 | Kamizelki Zintegrowane i Plate Carriery | ✓ | — | ✓ | |
| 347 | Ochrona balistyczna i CBRN | Hełmy balistyczne | 9.3.4 | Hełmy Balistyczne | ✓ | — | ✓ | |
| 348 | Ochrona balistyczna i CBRN | Osłony twarzy | 09 | Ochrona Indywidualna | ✓ | — | ✓ | brak liścia face shield; rodzic → review |

---

## Nowe podkategorie z korekty 2026-09-29 — 46 wierszy (HA-2.18)

Źródło danych: `xml-integration/assortment-rules.ts` → `newSubcategories` (ta tabela jest jego odbiciem; zmiana priorytetu = pole `priority` tam, nie tutaj).  
Kolumny: Wiersz (arkusz korekty) · Kategoria · Podkategoria · Hydra · Hydra nazwa · Sharg / Kolba / SpecShop · Priorytet · Pozwolenie · Uwagi.  
- Sharg / Kolba / SpecShop = ✓ gdy hurtownia mapuje **dokładnie ten węzeł** w `category-map.json` (nie „Inspiracja rynkowa” — korekta jej nie ma; obecność w feedzie sprawdzona tylko w HA-2.25 dla 1.3/1.4/1.5/2.5). Reguły Kolby → 1.4 / 2.6 są uśpione (feed bez takich produktów), więc Kolba = ✓ tylko formalnie.  
- `brak` = brak węzła w drzewie 01–15 → pozycja nieaktywna w filtrze niezależnie od priorytetu.  
- **Priorytet** `domyślny` = `NEW_SUBCATEGORY_DEFAULT_PRIORITY` (`config/inputs.ts`, O-22, właściciel klient); nieustawiony = **P2 = nie importujemy** (tj 2026-10-09). Węzeł wchodzi do filtru tylko przy P1. Węzły oznaczone „(w filtrze)” są już w `allowedHydraNums` z HA-2.25 i zostają tam niezależnie od tego priorytetu.  
- Pozwolenie = kolumna D arkusza korekty; grupy permit nadaje `permit-rules.ts` (nie zmienione w HA-2.18).

| Wiersz | Kategoria | Podkategoria | Hydra | Hydra nazwa | Sharg | Kolba | SpecShop | Priorytet | Pozwolenie (arkusz) | Uwagi |
|---|---|---|---|---|---|---|---|---|---|---|
| 19 | Wyposażenie strzeleckie i trening | Markery pneumatyczne (RAM i podobne) | brak | — | — | — | — | domyślny | — | brak węzła (arkusz: dział wyposażenia strzeleckiego = 10, bez liścia); Sharg „BROŃ NA KULE (RAM)” mapuje dziś na rodzica 15 → review, poza filtrem |
| 22 | Broń palna | Pistolety jednostrzałowe | 1.1 | Broń Krótka | — | — | — | domyślny | x | brak liścia; rodzic → review |
| 23 | Broń palna | Broń PCC | 1.2.4 | Karabinki PCC | — | — | — | domyślny | x |  |
| 26 | Broń palna | Pistolety maszynowe — broń samoczynna | 1.2.4 | Karabinki PCC | — | — | — | domyślny | x | arkusz: x (koncesja) |
| 27 | Broń palna | Karabinki jednostrzałowe | 1.2 | Broń Długa | — | — | — | domyślny | x | brak liścia; rodzic → review |
| 28 | Broń palna | Karabinki powtarzalne | 1.2.2 | Karabiny i Karabinki Powtarzalne | — | — | — | domyślny | x |  |
| 30 | Broń palna | Karabinki samoczynne | 1.2.3 | Karabinki Samoczynne | — | — | — | domyślny | x |  |
| 31 | Broń palna | Karabiny jednostrzałowe | 1.2 | Broń Długa | — | — | — | domyślny | x | brak liścia; rodzic → review |
| 33 | Broń palna | Karabiny samopowtarzalne | 1.2.1 | Karabiny i Karabinki Samopowtarzalne | — | — | — | domyślny | x |  |
| 34 | Broń palna | Karabiny samoczynne | 1.2.3 | Karabinki Samoczynne | — | — | — | domyślny | tylko koncesja/B2G | arkusz: tylko koncesja/B2G |
| 35 | Broń palna | Strzelby jednostrzałowe | 1.3.3 | Strzelby Łamane i Inne | — | — | — | domyślny | x |  |
| 36 | Broń palna | Strzelby wielolufowe łamane | 1.3.3 | Strzelby Łamane i Inne | — | — | — | domyślny | x |  |
| 37 | Broń palna | Strzelby powtarzalne | 1.3.1 | Strzelby Powtarzalne | — | — | — | domyślny | x |  |
| 38 | Broń palna | Strzelby samopowtarzalne | 1.3.2 | Strzelby Samopowtarzalne | — | — | — | domyślny | x |  |
| 39 | Broń palna | Broń kombinowana | 1.3.3 | Strzelby Łamane i Inne | — | — | — | domyślny | x | „Strzelby Łamane i Inne”; brak liścia dla broni kombinowanej |
| 40 | Broń palna | Broń palna alarmowa | 1.5 (w filtrze) | Broń alarmowa i sygnałowa | ✓ | — | ✓ | domyślny | x | węzeł już w allowedHydraNums (HA-2.25) |
| 41 | Broń palna | Broń palna sygnałowa | 1.5 (w filtrze) | Broń alarmowa i sygnałowa | ✓ | — | ✓ | domyślny | x | węzeł już w allowedHydraNums (HA-2.25) |
| 42 | Broń palna | Broń palna gazowa | 1.5 (w filtrze) | Broń alarmowa i sygnałowa | ✓ | — | ✓ | domyślny | x | węzeł już w allowedHydraNums (HA-2.25) |
| 43 | Broń palna | Broń palna pozbawiona cech użytkowych | 1.4 (w filtrze) | Broń Kolekcjonerska i Historyczna | ✓ | ✓ | — | domyślny | — | węzeł już w allowedHydraNums (HA-2.25); arkusz: rejestracja |
| 71 | Magazynki | Magazynki pozostałe | 05 | Magazynki i Szybkoładowarki | — | — | ✓ | domyślny | — | brak liścia; rodzic → review; Spechurt „Magazynki i akcesoria” → 05 |
| 195 | Amunicja i elaboracja | Naboje bocznego zapłonu | 2.4 | Amunicja Bocznego Zapłonu | — | — | — | domyślny | x |  |
| 196 | Amunicja i elaboracja | Naboje centralnego zapłonu do broni krótkiej | 2.1 | Amunicja Pistoletowa i Rewolwerowa | — | — | — | domyślny | x |  |
| 197 | Amunicja i elaboracja | Naboje centralnego zapłonu do broni długiej gwintowanej | 2.2 | Amunicja Pośrednia i Karabinowa | — | — | — | domyślny | x |  |
| 198 | Amunicja i elaboracja | Naboje śrutowe do broni gładkolufowej | 2.3 | Amunicja Śrutowa | — | — | — | domyślny | x |  |
| 199 | Amunicja i elaboracja | Naboje kulowe do broni gładkolufowej | 2.3 | Amunicja Śrutowa | — | — | — | domyślny | x | breneka w opisie 2.3 |
| 200 | Amunicja i elaboracja | Naboje ślepe i hukowe | 2.5 (w filtrze) | Amunicja Hukowa, Alarmowa i Gazowa | ✓ | — | — | domyślny | x | rodzic → review; węzeł już w allowedHydraNums (HA-2.25) |
| 201 | Amunicja i elaboracja | Naboje alarmowe, gazowe i sygnałowe | 2.5 (w filtrze) | Amunicja Hukowa, Alarmowa i Gazowa | ✓ | — | — | domyślny | x | węzeł już w allowedHydraNums (HA-2.25) |
| 202 | Amunicja i elaboracja | Naboje scalone elaborowane prochem czarnym | 02 | Amunicja i Elementy Rechargingu | — | — | — | domyślny | x | brak liścia; rodzic → review |
| 203 | Amunicja i elaboracja | Amunicja szczególnie niebezpieczna lub ograniczona | 02 | Amunicja i Elementy Rechargingu | — | — | — | domyślny | tylko koncesja / B2G | arkusz: tylko koncesja/B2G; brak liścia |
| 204 | Amunicja i elaboracja | Pociski do elaboracji | 8.2 | Komponenty i Przygotowanie Łusek | — | — | — | domyślny | — | 15.09: „Pociski” P2 (zmiana nazwy) |
| 207 | Amunicja i elaboracja | Prochy bezdymne | 2.6 (w filtrze) | Elementy Koncesjonowane do Elaboracji | — | ✓ | — | domyślny | x | węzeł już w allowedHydraNums (HA-2.25); 15.09: „Prochy” P3 |
| 208 | Amunicja i elaboracja | Proch czarny | 2.6 (w filtrze) | Elementy Koncesjonowane do Elaboracji | — | ✓ | — | domyślny | wymagana Europejska Karta Broni | węzeł już w allowedHydraNums (HA-2.25); reguły Kolby uśpione |
| 209 | Amunicja i elaboracja | Przybitki, koszyki i komponenty nabojów śrutowych | 8.2 | Komponenty i Przygotowanie Łusek | — | — | — | domyślny | — |  |
| 210 | Amunicja i elaboracja | Prasy elaboracyjne | 8.1 | Prasy i Matryce | — | — | — | domyślny | — | 15.09: „Prasy” P3 (zmiana nazwy) |
| 211 | Amunicja i elaboracja | Matryce elaboracyjne | 8.1 | Prasy i Matryce | — | — | — | domyślny | — | 15.09: „Matryce” P3 (zmiana nazwy) |
| 212 | Amunicja i elaboracja | Dozowniki prochu i wagi | 08 | Elaboracja Amunicji | — | — | — | domyślny | — | brak liścia; rodzic → review; 15.09: „Dozowniki i wagi” P3 |
| 213 | Amunicja i elaboracja | Obróbka i kontrola łusek | 8.2 | Komponenty i Przygotowanie Łusek | — | — | — | domyślny | — | 15.09: „Obróbka łusek” P3 (zmiana nazwy) |
| 272 | Broń czarnoprochowa | Pistolety rozdzielnego ładowania odprzodowego | 1.4 (w filtrze) | Broń Kolekcjonerska i Historyczna | ✓ | ✓ | — | domyślny | +/- | węzeł już w allowedHydraNums (HA-2.25); Sharg „Broń czarnoprochowa”, reguły Kolby uśpione |
| 273 | Broń czarnoprochowa | Rewolwery rozdzielnego ładowania | 1.4 (w filtrze) | Broń Kolekcjonerska i Historyczna | ✓ | ✓ | — | domyślny | +/- | jw. |
| 274 | Broń czarnoprochowa | Karabiny rozdzielnego ładowania odprzodowego | 1.4 (w filtrze) | Broń Kolekcjonerska i Historyczna | ✓ | ✓ | — | domyślny | +/- | jw. |
| 275 | Broń czarnoprochowa | Muszkiety i strzelby rozdzielnego ładowania odprzodowego | 1.4 (w filtrze) | Broń Kolekcjonerska i Historyczna | ✓ | ✓ | — | domyślny | +/- | jw. |
| 276 | Broń czarnoprochowa | Broń rozdzielnego ładowania odtylcowego | 1.4 (w filtrze) | Broń Kolekcjonerska i Historyczna | ✓ | ✓ | — | domyślny | +/- | jw. |
| 277 | Broń czarnoprochowa | Broń czarnoprochowa na amunicję scaloną — krótka | 1.1 | Broń Krótka | — | — | — | domyślny | x | arkusz: x (koncesja) → rodzic 1.1 → review; Sharg wrzuca całą czarnoprochową do 1.4 |
| 278 | Broń czarnoprochowa | Broń czarnoprochowa na amunicję scaloną — długa gwintowana | 1.2 | Broń Długa | — | — | — | domyślny | x | jw., rodzic 1.2 |
| 279 | Broń czarnoprochowa | Broń czarnoprochowa na amunicję scaloną — długa gładkolufowa lub kombinowana | 1.3 (w filtrze) | Strzelby Gładkolufowe | ✓ | — | — | domyślny | x | jw., rodzic 1.3 (już w allowedHydraNums, HA-2.25) |
| 336 | Akcesoria do samoobrony | Broń alarmowo-sygnałowa (BAS) | brak | — | — | — | — | domyślny | — | O-23: bez pozwolenia, w dziale samoobrony — drzewo 15 nie ma liścia BAS; dziś Sharg „Rewolwery Alarmowe” / Spechurt „Broń hukowa” → 1.5 (grupa A, HA-2.25); rozjazd do HA-2.17 / HA-2.06 |

> Nowe nazwy: **46** — z węzłem już w filtrze (1.3/1.4/1.5/2.5/2.6): 14; z węzłem-liściem poza filtrem: 21; z węzłem-rodzicem poza filtrem: 9; bez węzła (`brak`): 2.  
> Przy P1 filtr dopuściłby dodatkowo węzły: 1.1, 1.2, 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.3.1, 1.3.2, 1.3.3, 02, 2.1, 2.2, 2.3, 2.4, 05, 08, 8.1, 8.2 (test `taxonomy-sample-table.test.ts` drukuje tę listę z danych).  
> Sześć z nowych nazw to przemianowane wiersze P2/P3 z 15.09 (Pociski, Prochy, Prasy, Matryce, Dozowniki i wagi, Obróbka łusek) — traktowane jak nowe (priorytet domyślny), skutek dla filtru identyczny (nie importujemy); stary priorytet w „Uwagach”.  
> BAS (O-23): w arkuszu bez pozwolenia, w „Akcesoriach do samoobrony”; drzewo 15 nie ma liścia BAS, a Sharg „Rewolwery Alarmowe” / Spechurt „Broń hukowa” mapują dziś do 1.5 (grupa A, odbiór) — mapowanie i `permit-rules.ts` **nie zmienione** (bramka STOP HA-2.18 → HA-2.17 / HA-2.06).

---

## Podsumowanie

Stan z 15.09 (HA-2.04) i korekta HA-2.25:

| | Wiersze |
|---|---|
| Wszystkich P1 (arkusz 15.09) | 175 |
| Zmapowane do liścia drzewa | 131 |
| Zmapowane do węzła rodzica (→ tag `review`) | 27 |
| Brak odpowiednika w drzewie | 17 |
| Spośród „brak" — obecne u naszych hurtowni | 15 |
| P1 bez żadnej z naszych hurtowni (poza zakresem importu) | 13 |

> HA-2.25 (2026-10-08): lp 15 (1.3) i 253 (1.4) weszły do filtru (Sharg wg `category-map.json`) — stąd 15 → 13. Dodane 2 wiersze spoza arkusza P1 (1.5, 2.5) nie wliczają się do 175.

Stan po korekcie 2026-09-29 (HA-2.18, 2026-10-09):

| | Wiersze |
|---|---|
| P1 z 15.09 **usunięte** w korekcie (Kolekcjonerstwo i militaria, O-24: lp 253–257) | 5 |
| P1 z 15.09 **zastąpione** nowymi nazwami (lp 15, 169–173, 242–246) — priorytet P1 **nie** przechodzi na nowe nazwy | 11 |
| P1 z 15.09 z nazwą bez zmian — priorytet P1 obowiązuje dalej | 159 |
| &nbsp;&nbsp;w tym ze zmienioną kategorią („Samoobrona” → „Akcesoria do samoobrony”, lp 311–315) | 5 |
| &nbsp;&nbsp;w tym do liścia / rodzica / `brak` | 123 / 21 / 15 |
| **Nowe nazwy** z korekty (priorytet domyślny z inputu; dziś P2) | 46 |
| &nbsp;&nbsp;w tym z węzłem już w filtrze (1.3/1.4/1.5/2.5/2.6) / liść poza filtrem / rodzic poza filtrem / `brak` | 14 / 21 / 9 / 2 |
| Węzły w `allowedHydraNums` | bez zmian wobec HA-2.25 (nowe podkategorie dochodzą tylko przy P1) |

> Węzły 1.4 i 2.6 są w filtrze jako istniejące (HA-2.25), choć ich podstawa z arkusza 15.09 zniknęła (lp 253 usunięty, lp 246 zastąpiony), a nowa podstawa (czarnoprochowa, proch czarny) ma priorytet domyślny P2 — do uporządkowania razem z odpowiedzią na O-22 (deferred HA-2.18).

Kategorie bez gałęzi w drzewie (decyzja klienta do HA-2.10 lub osobnego zadania):
- **ASG / Airsoft** (5 podkategorii) — wszystkie 3 nasze hurtownie; ok. 1 000–2 000 produktów w feedach
- **Łucznictwo** (5) — Kolba; ok. kilkaset produktów
- **Myślistwo** (5) — Sharg + Kolba; wabiki, karmidła, kamery — nie ma gdzie przypisać
- **Kolekcjonerstwo** (5) — kategoria usunięta w korekcie 2026-09-29 (O-24); poza sklepem
