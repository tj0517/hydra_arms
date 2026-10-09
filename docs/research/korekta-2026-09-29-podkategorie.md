# Arkusz „Podkategorie - korekta” (2026-09-29) — zrzut i różnice wobec arkusza z 15.09

Źródło: `docs/research/analiza_popularnosci_kategorii_korekta.xlsx`, arkusz „Podkategorie - korekta” (kolumny A–D; kolumna C „Filtry” pominięta).  
Porównanie: `docs/research/analiza_popularnosci_kategorii.xlsx`, arkusz „Podkategorie i filtry” (kolumny B, C, D = priorytet).  
Zrzut zrobiony skryptem (stdlib `zipfile` + `xml.etree`, bez nowych zależności) w HA-2.18, 2026-10-09. Arkusz korekty **nie ma** kolumn P1/P2/P3 ani „Inspiracja rynkowa”.

Legenda kolumny „Pozwolenie” (arkusz, kolumna D): `—` = pole puste (☐), `x (pozwolenie)` = x, inne = tekst klienta.

## Podsumowanie różnic

| | Liczba |
|---|---|
| Wierszy w arkuszu korekty | 363 |
| Wierszy w arkuszu 15.09 | 355 |
| Nowe nazwy podkategorii (brak w 15.09) | 46 |
| Nazwy bez zmian, ale zmieniona kategoria („Samoobrona” → „Akcesoria do samoobrony”) | 10 |
| Nazwy z 15.09, których nie ma w korekcie (zastąpione lub usunięte) | 38 |

## Nowe nazwy podkategorii (46)

Wiersz = numer wiersza w arkuszu korekty. Priorytet: żadna z tych pozycji nie ma priorytetu w arkuszu — w HA-2.18 dostają domyślny z inputu `NEW_SUBCATEGORY_DEFAULT_PRIORITY` (patrz `taksonomia-p1.md`, sekcja „Nowe podkategorie”).

| Wiersz | Kategoria | Podkategoria | Pozwolenie (arkusz) |
|---|---|---|---|
| 19 | Wyposażenie strzeleckie i trening | Markery pneumatyczne (RAM i podobne) | — |
| 22 | Broń palna | Pistolety jednostrzałowe | x (pozwolenie) |
| 23 | Broń palna | Broń PCC | x (pozwolenie) |
| 26 | Broń palna | Pistolety maszynowe — broń samoczynna | x (pozwolenie) |
| 27 | Broń palna | Karabinki jednostrzałowe | x (pozwolenie) |
| 28 | Broń palna | Karabinki powtarzalne | x (pozwolenie) |
| 30 | Broń palna | Karabinki samoczynne | x (pozwolenie) |
| 31 | Broń palna | Karabiny jednostrzałowe | x (pozwolenie) |
| 33 | Broń palna | Karabiny samopowtarzalne | x (pozwolenie) |
| 34 | Broń palna | Karabiny samoczynne | tylko koncesja/B2G |
| 35 | Broń palna | Strzelby jednostrzałowe | x (pozwolenie) |
| 36 | Broń palna | Strzelby wielolufowe łamane | x (pozwolenie) |
| 37 | Broń palna | Strzelby powtarzalne | x (pozwolenie) |
| 38 | Broń palna | Strzelby samopowtarzalne | x (pozwolenie) |
| 39 | Broń palna | Broń kombinowana | x (pozwolenie) |
| 40 | Broń palna | Broń palna alarmowa | x (pozwolenie) |
| 41 | Broń palna | Broń palna sygnałowa | x (pozwolenie) |
| 42 | Broń palna | Broń palna gazowa | x (pozwolenie) |
| 43 | Broń palna | Broń palna pozbawiona cech użytkowych | — |
| 71 | Magazynki | Magazynki pozostałe | — |
| 195 | Amunicja i elaboracja | Naboje bocznego zapłonu | x (pozwolenie) |
| 196 | Amunicja i elaboracja | Naboje centralnego zapłonu do broni krótkiej | x (pozwolenie) |
| 197 | Amunicja i elaboracja | Naboje centralnego zapłonu do broni długiej gwintowanej | x (pozwolenie) |
| 198 | Amunicja i elaboracja | Naboje śrutowe do broni gładkolufowej | x (pozwolenie) |
| 199 | Amunicja i elaboracja | Naboje kulowe do broni gładkolufowej | x (pozwolenie) |
| 200 | Amunicja i elaboracja | Naboje ślepe i hukowe | x (pozwolenie) |
| 201 | Amunicja i elaboracja | Naboje alarmowe, gazowe i sygnałowe | x (pozwolenie) |
| 202 | Amunicja i elaboracja | Naboje scalone elaborowane prochem czarnym | x (pozwolenie) |
| 203 | Amunicja i elaboracja | Amunicja szczególnie niebezpieczna lub ograniczona | tylko koncesja / B2G |
| 204 | Amunicja i elaboracja | Pociski do elaboracji | — |
| 207 | Amunicja i elaboracja | Prochy bezdymne | x (pozwolenie) |
| 208 | Amunicja i elaboracja | Proch czarny | wymagana Europejska Karta Broni |
| 209 | Amunicja i elaboracja | Przybitki, koszyki i komponenty nabojów śrutowych | — |
| 210 | Amunicja i elaboracja | Prasy elaboracyjne | — |
| 211 | Amunicja i elaboracja | Matryce elaboracyjne | — |
| 212 | Amunicja i elaboracja | Dozowniki prochu i wagi | — |
| 213 | Amunicja i elaboracja | Obróbka i kontrola łusek | — |
| 272 | Broń czarnoprochowa | Pistolety rozdzielnego ładowania odprzodowego | +/- |
| 273 | Broń czarnoprochowa | Rewolwery rozdzielnego ładowania | +/- |
| 274 | Broń czarnoprochowa | Karabiny rozdzielnego ładowania odprzodowego | +/- |
| 275 | Broń czarnoprochowa | Muszkiety i strzelby rozdzielnego ładowania odprzodowego | +/- |
| 276 | Broń czarnoprochowa | Broń rozdzielnego ładowania odtylcowego | +/- |
| 277 | Broń czarnoprochowa | Broń czarnoprochowa na amunicję scaloną — krótka | x (pozwolenie) |
| 278 | Broń czarnoprochowa | Broń czarnoprochowa na amunicję scaloną — długa gwintowana | x (pozwolenie) |
| 279 | Broń czarnoprochowa | Broń czarnoprochowa na amunicję scaloną — długa gładkolufowa lub kombinowana | x (pozwolenie) |
| 336 | Akcesoria do samoobrony | Broń alarmowo-sygnałowa (BAS) | — |

## Ta sama nazwa, inna kategoria (10)

| Wiersz | Kategoria 15.09 | Kategoria korekta | Podkategoria | Priorytet 15.09 |
|---|---|---|---|---|
| 328 | Samoobrona | Akcesoria do samoobrony | Gaz pieprzowy — strumień | P1 |
| 329 | Samoobrona | Akcesoria do samoobrony | Gaz pieprzowy — stożek / chmura | P1 |
| 330 | Samoobrona | Akcesoria do samoobrony | Gaz pieprzowy — żel / pianka | P1 |
| 331 | Samoobrona | Akcesoria do samoobrony | Paralizatory | P1 |
| 332 | Samoobrona | Akcesoria do samoobrony | Pałki teleskopowe | P1 |
| 333 | Samoobrona | Akcesoria do samoobrony | Alarmy osobiste | P2 |
| 334 | Samoobrona | Akcesoria do samoobrony | Długopisy taktyczne | P2 |
| 335 | Samoobrona | Akcesoria do samoobrony | Gazy treningowe | P2 |
| 337 | Samoobrona | Akcesoria do samoobrony | Odstraszacze zwierząt | P2 |
| 338 | Samoobrona | Akcesoria do samoobrony | Kabury i pokrowce | P3 |

## Nazwy z 15.09 nieobecne w korekcie (38)

Lp = numer z arkusza 15.09 (ten sam, którego używa `taksonomia-p1.md`). „Kolekcjonerstwo i militaria” = kategoria usunięta w całości (O-24); pozostałe = zastąpione nowymi nazwami w tej samej kategorii.

| Lp | Kategoria | Podkategoria | Priorytet 15.09 |
|---|---|---|---|
| 15 | Broń palna | Strzelby | P1 |
| 16 | Broń palna | PCC | P2 |
| 17 | Broń palna | Broń sportowa | P2 |
| 18 | Broń palna | Broń myśliwska | P2 |
| 169 | Amunicja i elaboracja | Amunicja pistoletowa | P1 |
| 170 | Amunicja i elaboracja | Amunicja karabinowa | P1 |
| 171 | Amunicja i elaboracja | Amunicja strzelbowa | P1 |
| 172 | Amunicja i elaboracja | Amunicja bocznego zapłonu | P1 |
| 173 | Amunicja i elaboracja | Amunicja myśliwska | P1 |
| 174 | Amunicja i elaboracja | Amunicja sportowa i treningowa | P2 |
| 175 | Amunicja i elaboracja | Amunicja obronna | P2 |
| 176 | Amunicja i elaboracja | Pociski | P2 |
| 179 | Amunicja i elaboracja | Prochy | P3 |
| 180 | Amunicja i elaboracja | Matryce | P3 |
| 181 | Amunicja i elaboracja | Prasy | P3 |
| 182 | Amunicja i elaboracja | Dozowniki i wagi | P3 |
| 183 | Amunicja i elaboracja | Obróbka łusek | P3 |
| 242 | Broń czarnoprochowa | Rewolwery czarnoprochowe | P1 |
| 243 | Broń czarnoprochowa | Pistolety czarnoprochowe | P1 |
| 244 | Broń czarnoprochowa | Karabiny czarnoprochowe | P1 |
| 245 | Broń czarnoprochowa | Strzelby czarnoprochowe | P1 |
| 246 | Broń czarnoprochowa | Kapiszony | P1 |
| 247 | Broń czarnoprochowa | Kule i pociski | P2 |
| 248 | Broń czarnoprochowa | Przybitki | P2 |
| 249 | Broń czarnoprochowa | Miarki i dozowniki | P2 |
| 250 | Broń czarnoprochowa | Akcesoria ładowania | P2 |
| 251 | Broń czarnoprochowa | Części zamienne | P3 |
| 252 | Broń czarnoprochowa | Czyszczenie broni czarnoprochowej | P3 |
| 253 | Kolekcjonerstwo i militaria | Broń zdezaktywowana | P1 |
| 254 | Kolekcjonerstwo i militaria | Repliki broni | P1 |
| 255 | Kolekcjonerstwo i militaria | Hełmy | P1 |
| 256 | Kolekcjonerstwo i militaria | Mundury | P1 |
| 257 | Kolekcjonerstwo i militaria | Oznaki i naszywki | P1 |
| 258 | Kolekcjonerstwo i militaria | Medale i odznaczenia | P2 |
| 259 | Kolekcjonerstwo i militaria | Oporządzenie historyczne | P2 |
| 260 | Kolekcjonerstwo i militaria | Amunicja inertna | P2 |
| 261 | Kolekcjonerstwo i militaria | Dokumenty, mapy i książki | P2 |
| 262 | Kolekcjonerstwo i militaria | Gabloty i ekspozycja | P3 |

## Pełny zrzut arkusza korekty (363 wierszy)

| Wiersz | Kategoria | Podkategoria | Pozwolenie (arkusz) |
|---|---|---|---|
| 11 | Wyposażenie strzeleckie i trening | Timery strzeleckie | — |
| 12 | Wyposażenie strzeleckie i trening | Chronografy | — |
| 13 | Wyposażenie strzeleckie i trening | Zbijaki i amunicja treningowa | — |
| 14 | Wyposażenie strzeleckie i trening | Flagi bezpieczeństwa | — |
| 15 | Wyposażenie strzeleckie i trening | Maty strzeleckie | — |
| 16 | Wyposażenie strzeleckie i trening | Worki i podpórki strzeleckie | — |
| 17 | Wyposażenie strzeleckie i trening | Ładowarki do magazynków | — |
| 18 | Wyposażenie strzeleckie i trening | Akcesoria IPSC / IDPA | — |
| 19 | Wyposażenie strzeleckie i trening | Markery pneumatyczne (RAM i podobne) | — |
| 20 | Wyposażenie strzeleckie i trening | Trenażery laserowe | — |
| 21 | Wyposażenie strzeleckie i trening | Stojaki i uchwyty treningowe | — |
| 22 | Broń palna | Pistolety jednostrzałowe | x (pozwolenie) |
| 23 | Broń palna | Broń PCC | x (pozwolenie) |
| 24 | Broń palna | Pistolety samopowtarzalne | x (pozwolenie) |
| 25 | Broń palna | Rewolwery | x (pozwolenie) |
| 26 | Broń palna | Pistolety maszynowe — broń samoczynna | x (pozwolenie) |
| 27 | Broń palna | Karabinki jednostrzałowe | x (pozwolenie) |
| 28 | Broń palna | Karabinki powtarzalne | x (pozwolenie) |
| 29 | Broń palna | Karabinki samopowtarzalne | x (pozwolenie) |
| 30 | Broń palna | Karabinki samoczynne | x (pozwolenie) |
| 31 | Broń palna | Karabiny jednostrzałowe | x (pozwolenie) |
| 32 | Broń palna | Karabiny powtarzalne | x (pozwolenie) |
| 33 | Broń palna | Karabiny samopowtarzalne | x (pozwolenie) |
| 34 | Broń palna | Karabiny samoczynne | tylko koncesja/B2G |
| 35 | Broń palna | Strzelby jednostrzałowe | x (pozwolenie) |
| 36 | Broń palna | Strzelby wielolufowe łamane | x (pozwolenie) |
| 37 | Broń palna | Strzelby powtarzalne | x (pozwolenie) |
| 38 | Broń palna | Strzelby samopowtarzalne | x (pozwolenie) |
| 39 | Broń palna | Broń kombinowana | x (pozwolenie) |
| 40 | Broń palna | Broń palna alarmowa | x (pozwolenie) |
| 41 | Broń palna | Broń palna sygnałowa | x (pozwolenie) |
| 42 | Broń palna | Broń palna gazowa | x (pozwolenie) |
| 43 | Broń palna | Broń palna pozbawiona cech użytkowych | — |
| 44 | Części i tuning broni | Lufy | x (pozwolenie) |
| 45 | Części i tuning broni | Zamki, suwadła i BCG | +/- |
| 46 | Części i tuning broni | Spusty | — |
| 47 | Części i tuning broni | Sprężyny | — |
| 48 | Części i tuning broni | Kolby i stopki | — |
| 49 | Części i tuning broni | Chwyty i okładziny | — |
| 50 | Części i tuning broni | Łoża i handguardy | — |
| 51 | Części i tuning broni | Urządzenia wylotowe | podzial na tlumiki plomienia, kompensatory i hamuce wylotowe, wielofunkcyjne urzadzenia wylotowe, a także tlumiki huku oraz pozostale. Tlumiki huku o przeznaczeniu wojskowym lub policyjnym sprzedaz ograniczona |
| 52 | Części i tuning broni | Układy gazowe | — |
| 53 | Części i tuning broni | Manipulatory i bezpieczniki | — |
| 54 | Części i tuning broni | Zestawy konwersyjne | jeśli zawiera istotne czesci broni palnej to wymaga pozwolenia |
| 55 | Części i tuning broni | Drobne części montażowe | — |
| 56 | Czyszczenie i konserwacja broni | Zestawy czyszczące | — |
| 57 | Czyszczenie i konserwacja broni | Wyciory | — |
| 58 | Czyszczenie i konserwacja broni | Szczotki, jagi i patche | — |
| 59 | Czyszczenie i konserwacja broni | Linki czyszczące / BoreSnake | — |
| 60 | Czyszczenie i konserwacja broni | Rozpuszczalniki i odtłuszczacze | — |
| 61 | Czyszczenie i konserwacja broni | Oleje i smary | — |
| 62 | Czyszczenie i konserwacja broni | Ochrona antykorozyjna | — |
| 63 | Czyszczenie i konserwacja broni | Maty i stojaki serwisowe | — |
| 64 | Czyszczenie i konserwacja broni | Czyszczenie ultradźwiękowe | — |
| 65 | Magazynki | Magazynki pistoletowe | — |
| 66 | Magazynki | Magazynki AR | — |
| 67 | Magazynki | Magazynki AK | — |
| 68 | Magazynki | Magazynki PCC / SMG | — |
| 69 | Magazynki | Magazynki do karabinów powtarzalnych | — |
| 70 | Magazynki | Magazynki do strzelb | — |
| 71 | Magazynki | Magazynki pozostałe | — |
| 72 | Magazynki | Magazynki bocznego zapłonu | — |
| 73 | Magazynki | Części i stopki magazynków | — |
| 74 | Magazynki | Szybkoładowacze i łączniki | — |
| 75 | Optyka celownicza | Lunety celownicze | — |
| 76 | Optyka celownicza | Kolimatory | — |
| 77 | Optyka celownicza | Celowniki holograficzne | — |
| 78 | Optyka celownicza | Celowniki pryzmatyczne | — |
| 79 | Optyka celownicza | Powiększalniki | — |
| 80 | Optyka celownicza | Celowniki laserowe | — |
| 81 | Optyka celownicza | Mechaniczne przyrządy celownicze | — |
| 82 | Optyka celownicza | Akcesoria optyczne | — |
| 83 | Survival, outdoor i camping | Namioty | — |
| 84 | Survival, outdoor i camping | Tarpy i schronienia | — |
| 85 | Survival, outdoor i camping | Śpiwory | — |
| 86 | Survival, outdoor i camping | Maty i materace | — |
| 87 | Survival, outdoor i camping | Hamaki | — |
| 88 | Survival, outdoor i camping | Kuchenki i naczynia | — |
| 89 | Survival, outdoor i camping | Uzdatnianie wody | — |
| 90 | Survival, outdoor i camping | Rozpalanie ognia | — |
| 91 | Survival, outdoor i camping | Żywność i racje | — |
| 92 | Survival, outdoor i camping | Higiena outdoorowa | — |
| 93 | Survival, outdoor i camping | Akcesoria biwakowe | — |
| 94 | Latarki i oświetlenie | Latarki ręczne | — |
| 95 | Latarki i oświetlenie | Latarki taktyczne do broni | — |
| 96 | Latarki i oświetlenie | Latarki czołowe | — |
| 97 | Latarki i oświetlenie | Latarnie kempingowe | — |
| 98 | Latarki i oświetlenie | Latarki poszukiwawcze | — |
| 99 | Latarki i oświetlenie | Oświetlenie IR | — |
| 100 | Latarki i oświetlenie | Oświetlenie sygnalizacyjne | — |
| 101 | Latarki i oświetlenie | Akumulatory i baterie | — |
| 102 | Latarki i oświetlenie | Ładowarki | — |
| 103 | Latarki i oświetlenie | Montaże, włączniki i filtry | — |
| 104 | Akcesoria do broni | Dwójnogi i trójnogi | — |
| 105 | Akcesoria do broni | Zawieszenia i pasy nośne | — |
| 106 | Akcesoria do broni | Podpórki i pastorały | — |
| 107 | Akcesoria do broni | Łapacze łusek | — |
| 108 | Akcesoria do broni | Flagi i znaczniki bezpieczeństwa | — |
| 109 | Akcesoria do broni | Adaptery i szyny | — |
| 110 | Akcesoria do broni | Osłony szyn | — |
| 111 | Akcesoria do broni | Chwyty pomocnicze | — |
| 112 | Akcesoria do broni | Bączki i uchwyty QD | — |
| 113 | Kabury | Kabury IWB | — |
| 114 | Kabury | Kabury OWB | — |
| 115 | Kabury | Kabury służbowe | — |
| 116 | Kabury | Kabury sportowe | — |
| 117 | Kabury | Kabury udowe | — |
| 118 | Kabury | Kabury piersiowe | — |
| 119 | Kabury | Kabury naramienne | — |
| 120 | Kabury | Kabury kieszeniowe | — |
| 121 | Kabury | Kabury uniwersalne | — |
| 122 | Kabury | Montaże i adaptery do kabur | — |
| 123 | Odzież | Kurtki i softshelle | — |
| 124 | Odzież | Spodnie | — |
| 125 | Odzież | Combat shirts i koszule | — |
| 126 | Odzież | Bluzy i polary | — |
| 127 | Odzież | Bielizna termiczna | — |
| 128 | Odzież | Odzież przeciwdeszczowa | — |
| 129 | Odzież | Rękawice | — |
| 130 | Odzież | Nakrycia głowy | — |
| 131 | Odzież | Skarpety | — |
| 132 | Odzież | Kamuflaż i maskowanie | — |
| 133 | Optyka obserwacyjna | Lornetki | — |
| 134 | Optyka obserwacyjna | Monokulary | — |
| 135 | Optyka obserwacyjna | Lunety obserwacyjne | — |
| 136 | Optyka obserwacyjna | Dalmierze | — |
| 137 | Optyka obserwacyjna | Teleskopy | — |
| 138 | Optyka obserwacyjna | Statywy | — |
| 139 | Optyka obserwacyjna | Akcesoria optyczne | — |
| 140 | Oporządzenie taktyczne | Plate carriery | — |
| 141 | Oporządzenie taktyczne | Chest rigi | — |
| 142 | Oporządzenie taktyczne | Pasy taktyczne | — |
| 143 | Oporządzenie taktyczne | Ładownice karabinowe | — |
| 144 | Oporządzenie taktyczne | Ładownice pistoletowe | — |
| 145 | Oporządzenie taktyczne | Kieszenie cargo i admin | — |
| 146 | Oporządzenie taktyczne | Torby zrzutowe | — |
| 147 | Oporządzenie taktyczne | Ładownice medyczne | — |
| 148 | Oporządzenie taktyczne | Ładownice radiowe | — |
| 149 | Oporządzenie taktyczne | Szelki i uprzęże | — |
| 150 | Oporządzenie taktyczne | Ochraniacze | — |
| 151 | Obuwie | Buty taktyczne | — |
| 152 | Obuwie | Buty trekkingowe | — |
| 153 | Obuwie | Buty myśliwskie | — |
| 154 | Obuwie | Buty zimowe | — |
| 155 | Obuwie | Buty pustynne i letnie | — |
| 156 | Obuwie | Buty gumowe i wodoodporne | — |
| 157 | Obuwie | Niskie buty tactical | — |
| 158 | Obuwie | Wkładki i impregnacja | — |
| 159 | Futerały, pokrowce i walizki | Futerały pistoletowe | — |
| 160 | Futerały, pokrowce i walizki | Futerały karabinowe | — |
| 161 | Futerały, pokrowce i walizki | Futerały do strzelb | — |
| 162 | Futerały, pokrowce i walizki | Twarde walizki transportowe | — |
| 163 | Futerały, pokrowce i walizki | Torby strzeleckie | — |
| 164 | Futerały, pokrowce i walizki | Plecaki na broń | — |
| 165 | Futerały, pokrowce i walizki | Pudełka amunicyjne | — |
| 166 | Futerały, pokrowce i walizki | Wkłady, pianki i organizery | — |
| 167 | Myślistwo | Wabiki | — |
| 168 | Myślistwo | Kamery i fotopułapki | — |
| 169 | Myślistwo | Nęciska i karmidła | — |
| 170 | Myślistwo | Akcesoria dla psa myśliwskiego | — |
| 171 | Myślistwo | Pastorały i krzesła | — |
| 172 | Myślistwo | Maskowanie | — |
| 173 | Myślistwo | Preparaty zapachowe | — |
| 174 | Myślistwo | Trofeistyka | — |
| 175 | Myślistwo | Transport zwierzyny | — |
| 176 | Noże, maczety i siekiery | Noże składane | — |
| 177 | Noże, maczety i siekiery | Noże z głownią stałą | — |
| 178 | Noże, maczety i siekiery | Noże myśliwskie | — |
| 179 | Noże, maczety i siekiery | Noże survivalowe | — |
| 180 | Noże, maczety i siekiery | Noże taktyczne | — |
| 181 | Noże, maczety i siekiery | Noże ratownicze | — |
| 182 | Noże, maczety i siekiery | Maczety | — |
| 183 | Noże, maczety i siekiery | Siekiery i toporki | — |
| 184 | Noże, maczety i siekiery | Piły outdoorowe | — |
| 185 | Noże, maczety i siekiery | Ostrzałki | — |
| 186 | Montaże optyki | Pierścienie | — |
| 187 | Montaże optyki | Montaże jednoczęściowe | — |
| 188 | Montaże optyki | Bazy montażowe | — |
| 189 | Montaże optyki | Szyny | — |
| 190 | Montaże optyki | Płytki do kolimatorów | — |
| 191 | Montaże optyki | Risery i podwyższenia | — |
| 192 | Montaże optyki | Montaże cantilever | — |
| 193 | Montaże optyki | Montaże QD | — |
| 194 | Montaże optyki | Adaptery montażowe | — |
| 195 | Amunicja i elaboracja | Naboje bocznego zapłonu | x (pozwolenie) |
| 196 | Amunicja i elaboracja | Naboje centralnego zapłonu do broni krótkiej | x (pozwolenie) |
| 197 | Amunicja i elaboracja | Naboje centralnego zapłonu do broni długiej gwintowanej | x (pozwolenie) |
| 198 | Amunicja i elaboracja | Naboje śrutowe do broni gładkolufowej | x (pozwolenie) |
| 199 | Amunicja i elaboracja | Naboje kulowe do broni gładkolufowej | x (pozwolenie) |
| 200 | Amunicja i elaboracja | Naboje ślepe i hukowe | x (pozwolenie) |
| 201 | Amunicja i elaboracja | Naboje alarmowe, gazowe i sygnałowe | x (pozwolenie) |
| 202 | Amunicja i elaboracja | Naboje scalone elaborowane prochem czarnym | x (pozwolenie) |
| 203 | Amunicja i elaboracja | Amunicja szczególnie niebezpieczna lub ograniczona | tylko koncesja / B2G |
| 204 | Amunicja i elaboracja | Pociski do elaboracji | — |
| 205 | Amunicja i elaboracja | Łuski | — |
| 206 | Amunicja i elaboracja | Spłonki | x (pozwolenie) |
| 207 | Amunicja i elaboracja | Prochy bezdymne | x (pozwolenie) |
| 208 | Amunicja i elaboracja | Proch czarny | wymagana Europejska Karta Broni |
| 209 | Amunicja i elaboracja | Przybitki, koszyki i komponenty nabojów śrutowych | — |
| 210 | Amunicja i elaboracja | Prasy elaboracyjne | — |
| 211 | Amunicja i elaboracja | Matryce elaboracyjne | — |
| 212 | Amunicja i elaboracja | Dozowniki prochu i wagi | — |
| 213 | Amunicja i elaboracja | Obróbka i kontrola łusek | — |
| 214 | Multitoole i narzędzia outdoor | Multitoole kombinerkowe | — |
| 215 | Multitoole i narzędzia outdoor | Scyzoryki | — |
| 216 | Multitoole i narzędzia outdoor | Narzędzia brelokowe | — |
| 217 | Multitoole i narzędzia outdoor | Saperki | — |
| 218 | Multitoole i narzędzia outdoor | Piły składane | — |
| 219 | Multitoole i narzędzia outdoor | Łomy i narzędzia ratownicze | — |
| 220 | Multitoole i narzędzia outdoor | Krzesiwa | — |
| 221 | Multitoole i narzędzia outdoor | Zestawy EDC | — |
| 222 | Narzędzia rusznikarskie | Wkrętaki i bity | — |
| 223 | Narzędzia rusznikarskie | Wybijaki i młotki | — |
| 224 | Narzędzia rusznikarskie | Imadła i bloki montażowe | — |
| 225 | Narzędzia rusznikarskie | Klucze dynamometryczne | — |
| 226 | Narzędzia rusznikarskie | Narzędzia do celowników | — |
| 227 | Narzędzia rusznikarskie | Narzędzia do luf i komór | — |
| 228 | Narzędzia rusznikarskie | Sprawdziany headspace i pomiary | — |
| 229 | Narzędzia rusznikarskie | Narzędzia do platform AR / AK | — |
| 230 | Narzędzia rusznikarskie | Obróbka i wykańczanie | — |
| 231 | Narzędzia rusznikarskie | Narzędzia do kolb | — |
| 232 | Tarcze, cele i kulochwyty | Tarcze papierowe | — |
| 233 | Tarcze, cele i kulochwyty | Tarcze reaktywne | — |
| 234 | Tarcze, cele i kulochwyty | Cele stalowe | — |
| 235 | Tarcze, cele i kulochwyty | Gongi | — |
| 236 | Tarcze, cele i kulochwyty | Poppery | — |
| 237 | Tarcze, cele i kulochwyty | Rzutki | — |
| 238 | Tarcze, cele i kulochwyty | Cele elektroniczne | — |
| 239 | Tarcze, cele i kulochwyty | Drzewa pojedynkowe | — |
| 240 | Tarcze, cele i kulochwyty | Stojaki i zawiesia | — |
| 241 | Tarcze, cele i kulochwyty | Kulochwyty | — |
| 242 | Tarcze, cele i kulochwyty | Tarcze łucznicze | — |
| 243 | Tarcze, cele i kulochwyty | Cele do treningu laserowego | — |
| 244 | Plecaki, torby i organizery | Plecaki taktyczne | — |
| 245 | Plecaki, torby i organizery | Plecaki jednodniowe | — |
| 246 | Plecaki, torby i organizery | Plecaki ekspedycyjne | — |
| 247 | Plecaki, torby i organizery | Torby transportowe | — |
| 248 | Plecaki, torby i organizery | Torby strzeleckie | — |
| 249 | Plecaki, torby i organizery | Plecaki hydracyjne | — |
| 250 | Plecaki, torby i organizery | Organizery EDC | — |
| 251 | Plecaki, torby i organizery | Worki wodoszczelne | — |
| 252 | Plecaki, torby i organizery | Plecaki na broń | — |
| 253 | Ochrona słuchu i wzroku | Nauszniki pasywne | — |
| 254 | Ochrona słuchu i wzroku | Nauszniki aktywne | — |
| 255 | Ochrona słuchu i wzroku | Stopery | — |
| 256 | Ochrona słuchu i wzroku | Elektroniczna ochrona douszna | — |
| 257 | Ochrona słuchu i wzroku | Okulary przezroczyste | — |
| 258 | Ochrona słuchu i wzroku | Okulary przyciemniane | — |
| 259 | Ochrona słuchu i wzroku | Okulary fotochromowe | — |
| 260 | Ochrona słuchu i wzroku | Gogle ochronne | — |
| 261 | Ochrona słuchu i wzroku | Akcesoria i części wymienne | — |
| 262 | Termowizja i noktowizja | Monokulary termowizyjne | — |
| 263 | Termowizja i noktowizja | Celowniki termowizyjne | — |
| 264 | Termowizja i noktowizja | Nasadki termowizyjne | — |
| 265 | Termowizja i noktowizja | Noktowizory cyfrowe | — |
| 266 | Termowizja i noktowizja | Noktowizory analogowe | — |
| 267 | Termowizja i noktowizja | Gogle i binokulary NV | — |
| 268 | Termowizja i noktowizja | Nasadki noktowizyjne | — |
| 269 | Termowizja i noktowizja | Iluminatory IR | — |
| 270 | Termowizja i noktowizja | Urządzenia fuzyjne thermal / NV | — |
| 271 | Termowizja i noktowizja | Montaże i akcesoria | — |
| 272 | Broń czarnoprochowa | Pistolety rozdzielnego ładowania odprzodowego | +/- |
| 273 | Broń czarnoprochowa | Rewolwery rozdzielnego ładowania | +/- |
| 274 | Broń czarnoprochowa | Karabiny rozdzielnego ładowania odprzodowego | +/- |
| 275 | Broń czarnoprochowa | Muszkiety i strzelby rozdzielnego ładowania odprzodowego | +/- |
| 276 | Broń czarnoprochowa | Broń rozdzielnego ładowania odtylcowego | +/- |
| 277 | Broń czarnoprochowa | Broń czarnoprochowa na amunicję scaloną — krótka | x (pozwolenie) |
| 278 | Broń czarnoprochowa | Broń czarnoprochowa na amunicję scaloną — długa gwintowana | x (pozwolenie) |
| 279 | Broń czarnoprochowa | Broń czarnoprochowa na amunicję scaloną — długa gładkolufowa lub kombinowana | x (pozwolenie) |
| 280 | Medycyna i pierwsza pomoc | Apteczki | — |
| 281 | Medycyna i pierwsza pomoc | IFAK | — |
| 282 | Medycyna i pierwsza pomoc | Stazy taktyczne | — |
| 283 | Medycyna i pierwsza pomoc | Hemostatyki | — |
| 284 | Medycyna i pierwsza pomoc | Opatrunki | — |
| 285 | Medycyna i pierwsza pomoc | Chest seals | — |
| 286 | Medycyna i pierwsza pomoc | Szyny unieruchamiające | — |
| 287 | Medycyna i pierwsza pomoc | Nożyczki ratownicze | — |
| 288 | Medycyna i pierwsza pomoc | Drogi oddechowe i CPR | — |
| 289 | Medycyna i pierwsza pomoc | Opatrunki na oparzenia | — |
| 290 | Medycyna i pierwsza pomoc | Ładownice medyczne | — |
| 291 | Medycyna i pierwsza pomoc | Wyposażenie treningowe | — |
| 292 | Wiatrówki | Karabinki sprężynowe | — |
| 293 | Wiatrówki | Karabinki PCP | — |
| 294 | Wiatrówki | Karabinki CO₂ | — |
| 295 | Wiatrówki | Karabinki PCA | — |
| 296 | Wiatrówki | Pistolety pneumatyczne | — |
| 297 | Wiatrówki | Rewolwery pneumatyczne | — |
| 298 | Wiatrówki | Śrut | — |
| 299 | Wiatrówki | Kulki BB | — |
| 300 | Wiatrówki | Magazynki do wiatrówek | — |
| 301 | Wiatrówki | Akcesoria PCP | — |
| 302 | Wiatrówki | Części i tuning | — |
| 303 | Wiatrówki | Czyszczenie wiatrówek | — |
| 304 | Łucznictwo | Łuki bloczkowe | — |
| 305 | Łucznictwo | Łuki refleksyjne | — |
| 306 | Łucznictwo | Łuki tradycyjne | — |
| 307 | Łucznictwo | Kusze | x (pozwolenie) |
| 308 | Łucznictwo | Strzały i bełty | — |
| 309 | Łucznictwo | Groty | — |
| 310 | Łucznictwo | Celowniki łucznicze | — |
| 311 | Łucznictwo | Podstawki pod strzałę | — |
| 312 | Łucznictwo | Spusty | — |
| 313 | Łucznictwo | Kołczany | — |
| 314 | Łucznictwo | Tarcze łucznicze | — |
| 315 | Łucznictwo | Futerały | — |
| 316 | Łucznictwo | Narzędzia tuningowe | — |
| 317 | Elektronika, nawigacja i łączność | GPS ręczne | — |
| 318 | Elektronika, nawigacja i łączność | Kompasy | — |
| 319 | Elektronika, nawigacja i łączność | Radiotelefony | — |
| 320 | Elektronika, nawigacja i łączność | PTT i zestawy słuchawkowe | — |
| 321 | Elektronika, nawigacja i łączność | Powerbanki | — |
| 322 | Elektronika, nawigacja i łączność | Panele solarne | — |
| 323 | Elektronika, nawigacja i łączność | Stacje pogodowe | — |
| 324 | Elektronika, nawigacja i łączność | Fotopułapki | — |
| 325 | Elektronika, nawigacja i łączność | Kamery sportowe | — |
| 326 | Elektronika, nawigacja i łączność | Kalkulatory balistyczne | — |
| 327 | Elektronika, nawigacja i łączność | Detektory i mierniki | — |
| 328 | Akcesoria do samoobrony | Gaz pieprzowy — strumień | — |
| 329 | Akcesoria do samoobrony | Gaz pieprzowy — stożek / chmura | — |
| 330 | Akcesoria do samoobrony | Gaz pieprzowy — żel / pianka | — |
| 331 | Akcesoria do samoobrony | Paralizatory | +/- jeśli prad w obwodzie przekracza 10mA to wymaga pozwolenia |
| 332 | Akcesoria do samoobrony | Pałki teleskopowe | — |
| 333 | Akcesoria do samoobrony | Alarmy osobiste | — |
| 334 | Akcesoria do samoobrony | Długopisy taktyczne | — |
| 335 | Akcesoria do samoobrony | Gazy treningowe | — |
| 336 | Akcesoria do samoobrony | Broń alarmowo-sygnałowa (BAS) | — |
| 337 | Akcesoria do samoobrony | Odstraszacze zwierząt | — |
| 338 | Akcesoria do samoobrony | Kabury i pokrowce | — |
| 339 | Airsoft / ASG | Karabinki AEG | — |
| 340 | Airsoft / ASG | Karabinki GBB | — |
| 341 | Airsoft / ASG | Pistolety GBB i CO₂ | — |
| 342 | Airsoft / ASG | Repliki sprężynowe i snajperskie | — |
| 343 | Airsoft / ASG | Strzelby ASG | — |
| 344 | Airsoft / ASG | Repliki wsparcia / MG | — |
| 345 | Airsoft / ASG | Kulki | — |
| 346 | Airsoft / ASG | Magazynki ASG | — |
| 347 | Airsoft / ASG | Baterie i ładowarki | — |
| 348 | Airsoft / ASG | Gazy i kapsuły CO₂ | — |
| 349 | Airsoft / ASG | Optyka ASG | — |
| 350 | Airsoft / ASG | Części i tuning ASG | — |
| 351 | Airsoft / ASG | Ochrona ASG | — |
| 352 | Airsoft / ASG | Chronografy i cele | — |
| 353 | Sejfy i przechowywanie | Szafy na broń długą | — |
| 354 | Sejfy i przechowywanie | Szafy na broń krótką | — |
| 355 | Sejfy i przechowywanie | Sejfy | — |
| 356 | Sejfy i przechowywanie | Szafy amunicyjne | — |
| 357 | Sejfy i przechowywanie | Skrzynki transportowe | — |
| 358 | Sejfy i przechowywanie | Kasety samochodowe | — |
| 359 | Sejfy i przechowywanie | Linki i blokady | — |
| 360 | Sejfy i przechowywanie | Stojaki i organizery | — |
| 361 | Sejfy i przechowywanie | Osuszacze | — |
| 362 | Ochrona balistyczna i CBRN | Płyty balistyczne | — |
| 363 | Ochrona balistyczna i CBRN | Kamizelki miękkie | — |
| 364 | Ochrona balistyczna i CBRN | Plate carriery do ochrony balistycznej | — |
| 365 | Ochrona balistyczna i CBRN | Hełmy balistyczne | — |
| 366 | Ochrona balistyczna i CBRN | Osłony twarzy | — |
| 367 | Ochrona balistyczna i CBRN | Tarcze balistyczne | — |
| 368 | Ochrona balistyczna i CBRN | Maski przeciwgazowe | — |
| 369 | Ochrona balistyczna i CBRN | Filtry do masek | — |
| 370 | Ochrona balistyczna i CBRN | Kombinezony CBRN | — |
| 371 | Ochrona balistyczna i CBRN | Rękawice i obuwie ochronne | — |
| 372 | Ochrona balistyczna i CBRN | Dozymetry i detektory | — |
| 373 | Ochrona balistyczna i CBRN | Dekontaminacja | — |
