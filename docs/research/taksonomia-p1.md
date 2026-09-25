# Mapowanie podkategorii P1 → drzewo Hydra 01–15

Źródło: `docs/research/analiza_popularnosci_kategorii.xlsx`, arkusz „Podkategorie i filtry", kolumna D = P1.  
Hydra: `xml-integration/hydra-category-tree.txt`.  
Wygenerowane: HA-2.04, 2026-09-24.

**175 wierszy P1** — wszystkie zmapowane (liść lub węzeł rodzic) albo jawnie oznaczone `brak` (17 wierszy).

Kolumny: Lp · Kategoria (arkusz) · Podkategoria · Hydra numer · Hydra nazwa (skrócona) · Sharg · Kolba · SpecShop · Uwagi

- Sharg / Kolba / SpecShop = ✓ gdy nazwa hurtowni pojawia się w „Inspiracja rynkowa"; „—" gdy brak.  
- `brak` = brak odpowiadającego węzła w drzewie 01–15.  
- Węzeł rodzic (np. `04`) → tag `review` w imporcie.

---

## Brak odpowiednika w drzewie 01–15 — 17 wierszy

Wiersze, dla których w drzewie Hydra nie istnieje żaden węzeł (liść ani gałąź) pasujący do tej podkategorii produktowej:

| Lp | Kategoria | Podkategoria | Sharg | Kolba | SpecShop | Powód braku |
|----|-----------|--------------|-------|-------|---------|-------------|
| 141 | Myślistwo | Wabiki | ✓ | ✓ | — | brak gałęzi myślistwo w drzewie |
| 142 | Myślistwo | Kamery i fotopułapki | ✓ | ✓ | — | brak gałęzi myślistwo |
| 143 | Myślistwo | Nęciska i karmidła | ✓ | ✓ | — | brak gałęzi myślistwo |
| 144 | Myślistwo | Akcesoria dla psa myśliwskiego | ✓ | ✓ | — | brak gałęzi myślistwo |
| 145 | Myślistwo | Pastorały i krzesła | ✓ | ✓ | — | brak gałęzi myślistwo |
| 254 | Kolekcjonerstwo i militaria | Repliki broni | — | — | — | category-map.json → 00; brak naszych hurtowni |
| 257 | Kolekcjonerstwo i militaria | Oznaki i naszywki | — | — | — | category-map.json → 00; brak naszych hurtowni |
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

> Łucznictwo (5 szt.), ASG (5 szt.), Myślistwo (5 szt.), Kolekcjonerstwo (2 szt.) = **17 wierszy bez odpowiednika**.  
> Kolekcjonerstwo lp 253, 255, 256 mają węzły (1.4, 9.3.4, 12.1) ale żadnej naszej hurtowni — w tabeli poniżej, poza filtrem importu.  
> Spośród nich 15 pojawia się u naszych hurtowni i trafi do „00. DO PRZYPISANIA" przy imporcie; 2 (Kolekcjonerstwo) bez hurtowni.  
> Decyzja o dodaniu nowych gałęzi należy do klienta (HA-2.10, O-17).

---

## Pełna tabela mapowania — 175 wierszy

| Lp | Kategoria | Podkategoria | Hydra | Hydra nazwa | Sharg | Kolba | SpecShop | Uwagi |
|----|-----------|--------------|-------|-------------|-------|-------|---------|-------|
| 1 | Wyposażenie strzeleckie i trening | Timery strzeleckie | 10.3.2 | Timery Strzeleckie | ✓ | ✓ | ✓ | |
| 2 | Wyposażenie strzeleckie i trening | Chronografy | 10.3.1 | Urządzenia Pomiarowe i Chronografy | ✓ | ✓ | ✓ | |
| 3 | Wyposażenie strzeleckie i trening | Zbijaki i amunicja treningowa | 10.3.3 | Cele Stalowe i Reaktory | ✓ | ✓ | ✓ | zbijaki = popery; amunicja treningowa może też trafiać do 02 |
| 4 | Wyposażenie strzeleckie i trening | Flagi bezpieczeństwa | 10.3.4 | Cele Papierowe i Akcesoria | ✓ | ✓ | ✓ | brak liścia; review |
| 5 | Wyposażenie strzeleckie i trening | Maty strzeleckie | 10.3.4 | Cele Papierowe i Akcesoria | ✓ | ✓ | ✓ | brak liścia; review |
| 11 | Broń palna | Pistolety samopowtarzalne | 1.1.1 | Pistolety Samopowtarzalne | — | — | — | koncesja; brak naszych hurtowni |
| 12 | Broń palna | Rewolwery | 1.1.2 | Rewolwery | — | — | — | koncesja; brak naszych hurtowni |
| 13 | Broń palna | Karabinki samopowtarzalne | 1.2.1 | Karabiny i Karabinki Samopowtarzalne | — | — | — | koncesja; brak naszych hurtowni |
| 14 | Broń palna | Karabiny powtarzalne | 1.2.2 | Karabiny i Karabinki Powtarzalne | — | — | — | koncesja; brak naszych hurtowni |
| 15 | Broń palna | Strzelby | 1.3 | Strzelby Gładkolufowe | — | — | — | koncesja; brak naszych hurtowni |
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
| 169 | Amunicja i elaboracja | Amunicja pistoletowa | 2.1 | Amunicja Pistoletowa i Rewolwerowa | — | — | — | koncesja; brak naszych hurtowni |
| 170 | Amunicja i elaboracja | Amunicja karabinowa | 2.2 | Amunicja Pośrednia i Karabinowa | — | — | — | koncesja; brak naszych hurtowni |
| 171 | Amunicja i elaboracja | Amunicja strzelbowa | 2.3 | Amunicja Śrutowa | — | — | — | koncesja; brak naszych hurtowni |
| 172 | Amunicja i elaboracja | Amunicja bocznego zapłonu | 2.4 | Amunicja Bocznego Zapłonu | — | — | — | koncesja; brak naszych hurtowni |
| 173 | Amunicja i elaboracja | Amunicja myśliwska | 02 | Amunicja i Elementy Rechargingu | — | — | — | spans wiele kalibrów; rodzic → review; brak naszych hurtowni |
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
| 242 | Broń czarnoprochowa | Rewolwery czarnoprochowe | 1.1.2 | Rewolwery | — | ✓ | — | |
| 243 | Broń czarnoprochowa | Pistolety czarnoprochowe | 1.1 | Broń Krótka | — | ✓ | — | brak liścia black powder pistol; rodzic → review |
| 244 | Broń czarnoprochowa | Karabiny czarnoprochowe | 1.2 | Broń Długa | — | ✓ | — | brak liścia black powder rifle; rodzic → review |
| 245 | Broń czarnoprochowa | Strzelby czarnoprochowe | 1.3 | Strzelby Gładkolufowe | — | ✓ | — | |
| 246 | Broń czarnoprochowa | Kapiszony | 2.6 | Elementy Koncesjonowane do Elaboracji | — | ✓ | — | spłonki do broni czarnoprochowej |
| 253 | Kolekcjonerstwo i militaria | Broń zdezaktywowana | 1.4 | Broń Kolekcjonerska i Historyczna | — | — | — | brak naszych hurtowni |
| 254 | Kolekcjonerstwo i militaria | Repliki broni | brak | — | — | — | — | category-map.json → 00; brak naszych hurtowni |
| 255 | Kolekcjonerstwo i militaria | Hełmy militarne | 9.3.4 | Hełmy Balistyczne | — | — | — | brak naszych hurtowni |
| 256 | Kolekcjonerstwo i militaria | Mundury | 12.1 | Odzież Taktyczna i Mundurowa | — | — | — | brak naszych hurtowni |
| 257 | Kolekcjonerstwo i militaria | Oznaki i naszywki | brak | — | — | — | — | category-map.json → 00; brak naszych hurtowni |
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
| 311 | Samoobrona | Gaz pieprzowy — strumień | 15.1.1 | Gazy Pieprzowe Ręczne | ✓ | ✓ | ✓ | strumień w opisie 15.1.1 |
| 312 | Samoobrona | Gaz pieprzowy — stożek / chmura | 15.1.1 | Gazy Pieprzowe Ręczne | ✓ | ✓ | ✓ | Fog w opisie 15.1.1 |
| 313 | Samoobrona | Gaz pieprzowy — żel / pianka | 15.1.1 | Gazy Pieprzowe Ręczne | ✓ | ✓ | ✓ | Foam w opisie 15.1.1 |
| 314 | Samoobrona | Paralizatory | 15.3 | Paralizatory | ✓ | ✓ | ✓ | |
| 315 | Samoobrona | Pałki teleskopowe | 15.2.1 | Pałki Teleskopowe Hartowane | ✓ | ✓ | ✓ | |
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

## Podsumowanie

| | Wiersze |
|---|---|
| Wszystkich P1 | 175 |
| Zmapowane do liścia drzewa | ~100 |
| Zmapowane do węzła rodzica (→ tag `review`) | ~35 |
| Brak odpowiednika w drzewie | 17 |
| Spośród „brak" — obecne u naszych hurtowni | 15 |
| P1 bez żadnej z naszych hurtowni (poza zakresem importu) | 15 |

Kategorie bez gałęzi w drzewie (decyzja klienta do HA-2.10 lub osobnego zadania):
- **ASG / Airsoft** (5 podkategorii) — wszystkie 3 nasze hurtownie; ok. 1 000–2 000 produktów w feedach
- **Łucznictwo** (5) — Kolba; ok. kilkaset produktów
- **Myślistwo** (5) — Sharg + Kolba; wabiki, karmidła, kamery — nie ma gdzie przypisać
- **Kolekcjonerstwo** (5) — żadnej z naszych hurtowni — poza zakresem importu
