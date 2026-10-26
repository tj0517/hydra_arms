# Hydra Arms — otwarte pytania

Format: `O-xx` · status · kto rozstrzyga · blokuje. Rozstrzygnięcie dopisujemy z datą, pytania nie usuwamy.
Pytania klienta O-04–O-13 przeniesione 2026-09-22 z Notion („Lista pytań — HYDRA ARMS”, „Hydra Arms 31.07”).

## Techniczne

- **O-01** · rozstrzygnięte · tj — Czego użyć do lokalnej bazy Supabase?
  - 2026-09-22 tj: tak jak w FA/DCS. Docker, odchudzony `supabase start -x …`, bezpiecznik testów tylko dla localhost, hook `agent-guard.sh` z `HA_ALLOW_PROD=1`. Mac 8 GB, więc jeden stack naraz.
- **O-02** · rozstrzygnięte · tj — Środowisko dev?
  - 2026-09-22 tj: na razie bez dev. Zadanie dev odłożone.
- **O-03** · rozstrzygnięte · tj — Jak rezerwujemy towar dla zamówienia?
  - 2026-09-22 tj: po opłaceniu, w BaseLinkerze. Zamówienie nieopłacone niczego nie rezerwuje.
- **O-14** · rozstrzygnięte · tj — Gdzie działa zaplecze zamówień (alokacja braków wg kosztu, SLA i MOQ, kolejka wyjątków, zlecenia do hurtowni, konsolidacja, jedna paczka)?
  - 2026-09-22 tj: w BaseLinkerze (automatyzacje i statusy). Sklep przekazuje opłacone zamówienie. Flowchart:
    opłacone → walidacja (odbiór/wiek/dane) → rezerwacja stanu własnego → całość na stanie? tak: kompletacja własna / nie: alokacja braków (koszt całkowity, SLA, MOQ) → MOQ i stan potwierdzone? nie: kolejka wyjątków (MOQ/zamiennik/zwrot) / tak: zlecenia do Sharg/Spechurt/Kolba/Szafy → dostawa do Hydra Arms (bez dokumentów dla klienta) → konsolidacja i kontrola → jedna etykieta, jedna paczka.
- **O-15** · rozstrzygnięte · tj — Płatności przed uruchomieniem konta P24?
  - 2026-09-22 tj: sklep czeka z realną sprzedażą na P24; wszystko poza samym P24 przygotowujemy pod weryfikację. Integracja P24 powstaje na mocku / sztucznym webhooku, dane konta podpinamy po jego założeniu.
- **O-16** · rozstrzygnięte · tj — Gdzie konfigurujemy e-paragony?
  - 2026-09-22 tj: integracja w BaseLinkerze. Plik konfiguracyjny eparagony.pl nigdy nie trafia do repo.

## Klienta (Hydra Arms)

- **O-04** · rozstrzygnięte · klient/tj — Filtr asortymentu.
  - 2026-09-22 tj: kategorie według drzewa 01–15 (`xml-integration/hydra-category-tree.txt`), kontekst z analizy popularności kategorii (arkusz tj, 2026-09-15).
  - 2026-09-24 tj: klient wskazał jako istotną analizę z 15.09 (`docs/research/analiza_popularnosci_kategorii.xlsx`, arkusz „Podkategorie i filtry”, kolumna „Inspiracja rynkowa”). Na start import tylko podkategorii P1, które występują u co najmniej jednej z naszych hurtowni. Mapowanie P1 → drzewo 01–15 powstaje w HA-2.04.
  - 2026-09-24 tj: „na stanie” = model mieszany. Produkt wchodzi, gdy ma stan > 0 w magazynie Hydry albo w hurtowni; sklep pokazuje różny czas dostawy zależnie od źródła (osobne zadanie, do /wf-plan).
  - 2026-09-24 tj: hurtownie: Sharg, Spechurt, Kolba (Szafy poza zakresem do rozstrzygnięcia O-17; „SpecShop” w arkuszu = Spechurt). Próg cenowy na start wyłączony (0 zł), ustawialny w konfiguracji reguł.
- **O-05** · rozstrzygnięte · klient — Źródło własnego stanu magazynowego?
  - 2026-09-22 tj: BaseLinker.
- **O-06** · rozstrzygnięte · klient — Dropshipping?
  - 2026-09-22 tj: nie. Hurtownie dostarczają do Hydry, klient dostaje jedną paczkę od Hydry (O-14).
- **O-07** · otwarte · klient · dotyczy HA-2.05 — Marża per hurtownia (dziś placeholder 30%). Jedna stawka czy różna per kategoria/marka? Potwierdzenie: cena liczona z marży od ceny zakupu, nie z ceny detalicznej feedu.
  - 2026-10-06 klient: stawek nie podał; chce zbiorczego ustawiania marży przez arkusz (HA-2.22, po aneksie). Budujemy na 30% wstępnych (HA-2.05). Zob. O-32.
  - 2026-10-26 tj: arkusz odłożony (po aneksie, `docs/deferred-tasks.md`); zamiast niego marża per produkt ustawiana ręcznie w polu dodatkowym „Marża %” w BL (HA-2.22), pole puste = 30% z env. Zob. O-32.
- **O-08** · rozstrzygnięte · klient — Plan BaseLinkera.
  - 2026-09-22 tj: plan zostanie dobrany tak, żeby pomieścić produkty.
- **O-09** · otwarte · klient · dotyczy HA-2.08, test na sandboxie: HA-2.23 — P24: dane (merchant ID, POS ID, CRC, klucz API; najpierw sandbox), numer telefonu na stronę.
  - 2026-09-22 tj: konto P24 w trakcie zakładania (O-15).
- **O-10** · otwarte · klient · dotyczy HA-2.02 — Kurierzy (InPost/DPD/inne), metody i cennik dostawy, darmowa dostawa od kwoty.
  - 2026-10-06 klient: przewoźnicy „najpewniej” DHL, DPD, InPost; cen nie ma („na dniach”). Budujemy na cenach wstępnych (HA-2.02).
- **O-11** · rozstrzygnięte · klient/tj — Kategorie wrażliwe.
  - 2026-09-22 tj: według drzewa broń alarmowa i sygnałowa (1.5) oraz amunicja hukowa, alarmowa i gazowa (2.5) należą do kategorii koncesjonowanych, z odbiorem osobistym w salonie w Krakowie.
  - 2026-09-29 tj: klient przysłał korektę arkusza (`docs/research/analiza_popularnosci_kategorii_korekta.xlsx`, arkusz „Podkategorie - korekta”, stan prawny na 2026-09-28). Kolumny „Wymaga pozwolenia” / „Wymaga rejestracji” wypełnione ręcznie przez klienta:
    - broń palna (wszystkie typy wg mechanizmu: jednostrzałowa/powtarzalna/samopowtarzalna/samoczynna), broń alarmowa/sygnałowa/gazowa (>6 mm), amunicja, spłonki, prochy bezdymne → pozwolenie; karabiny samoczynne i „amunicja szczególnie niebezpieczna” → tylko koncesja/B2G; broń pozbawiona cech użytkowych → rejestracja; proch czarny → „wymagana Europejska Karta Broni”,
    - broń czarnoprochowa: rozdzielnego ładowania „+/-” (zwolnienie tylko dla egzemplarzy sprzed 1885 r. i ich replik), na amunicję scaloną → pozwolenie,
    - wiatrówki: >17 J → rejestracja (bez pozwolenia),
    - paralizatory: „+/-”, >10 mA → pozwolenie,
    - części: lufy → pozwolenie; zamki/BCG „+/-”; zestawy konwersyjne → pozwolenie, jeśli zawierają istotne części; urządzenia wylotowe do podziału (tłumiki płomienia, kompensatory/hamulce, wielofunkcyjne, tłumiki huku, pozostałe), tłumiki huku wojskowe/policyjne — sprzedaż ograniczona,
    - kusze → pozwolenie,
    - noże (w tym OTF) i BAS w „Akcesoriach do samoobrony” → bez pozwolenia i rejestracji.
  - 2026-09-29 tj: reguła robocza (do potwierdzenia przez klienta w O-27): **wymaga pozwolenia → bez kuriera** (tylko odbiór osobisty). Bez pozwolenia (w tym sama rejestracja, np. FAC >17 J, broń pozbawiona cech użytkowych) → kurier dozwolony. Pozycje „+/-” (paralizatory wg 10 mA, zamki/BCG, zestawy konwersyjne, broń rozdzielnego ładowania) rozstrzyga produkt: jeśli dany egzemplarz wymaga pozwolenia, to odbiór osobisty. Arkusz klienta jest wiążący, pozycje bierzemy tak, jak są wpisane (kusze → pozwolenie; proch czarny → EKB, sprawdzana przy odbiorze).
  - 2026-10-06 klient: rejestracja bez pozwolenia również odbiór osobisty (zapis „kurier dozwolony” z 2026-09-29 nieaktualny); zob. O-27.
- **O-12** · rozstrzygnięte · klient — Weryfikacja 18+ i uprawnień?
  - 2026-09-22 tj: na razie tylko przy odbiorze. mObywatel zakładamy w przyszłości (odłożone).
- **O-13** · rozstrzygnięte · klient/tj — Dane firmy i treści.
  - 2026-09-22 tj: e-paragony przez BaseLinker (O-16).
  - 2026-09-29 tj: dane firmy są już na stronie; polityka zwrotów w `legal/Regulamin sklepu.docx` (§ 6, odstąpienie 14 dni); opisy produktów: wiążące są te w BaseLinkerze, ich pochodzenie (w tym z hurtowni) nie jest po naszej stronie.
- **O-17** · rozstrzygnięte · tj — Czym są „Szafy” we flowcharcie (czwarta hurtownia/dostawca)? Czy potrzebny jest dla nich konektor feedu?
  - 2026-09-29 tj: pomijamy Szafy, poza zakresem, bez konektora.
- **O-18** · rozstrzygnięte · tj — Czy ścieżka XML→Supabase wraca?
  - 2026-09-23 tj: nie. Przepływ: XML → BaseLinker (xml-to-baselinker.ts) → Supabase (/api/shop/sync) → BaseLinker (zamówienia). source_connectors, engine.ts, /api/xml/sync, next_xml_product_id do usunięcia osobnym zadaniem po HA-1.06.
- **O-19** · rozstrzygnięte · tj · dotyczy HA-2.15 — Serwer importu 51.83.134.183 (OVH, Ubuntu 26.04, Node 20, 3,7 GB RAM).
  - 2026-09-25 tj: dostęp `ssh ubuntu@` kluczem (alias `hydra-srv`); feed Spechurtu działa tylko stąd (HTTP 200, 17 MB); na serwerze klon repo z lipca i `.env.local`.
  - 2026-10-12 tj: opcja B — import na serwerze z ograniczonymi kluczami, na dedykowanym użytkowniku / własnym pliku env z uprawnieniami 600; tylko `BASELINKER_*` i klucze feedów, bez Supabase service role.
  - 2026-10-13 tj: serwer zostaje do odwołania, koszt ponosi Hydra.
- **O-20** · otwarte · klient — ASG, łucznictwo i myślistwo nie mają gałęzi w drzewie 01–15 (HA-2.04: samo ASG to ok. 1–2 tys. produktów we wszystkich trzech hurtowniach). Dodajemy gałęzie (zmiana drzewa i kategorii w BL) czy zostają poza sklepem?
  - 2026-10-06 klient traktuje ASG jako towar z odbiorem osobistym; gałęzie w HA-2.24 po decyzji.
- **O-21** · rozstrzygnięte · klient · dotyczy HA-2.14, HA-2.15 — Dostęp do BaseLinkera klienta (konto, inventory ID, magazyny, grupy cen).
  - 2026-09-26 tj: obecny BaseLinker (w tym import z 24.07, katalog 107789) to sandbox tj; konta klienta jeszcze nie otrzymał. Inwentaryzacja (HA-2.14) i import na żywo (HA-2.15) dopiero na koncie klienta.
  - 2026-10-06 klient: przekazał login do konta BL; hasło i token nie sprawdzone przez tj. HA-2.14 startuje po wpisaniu tokena do `.env.local`.
  - 2026-10-06 rozstrzygnięte: dostęp do BL klienta otrzymany; inventory 107789, magazyny bl_148602 / bl_148603 / bl_148604 (zapis w HA-2.14, 2026-10-09).
  - 2026-10-09 tj: live run HA-2.14 — katalog 107789 i magazyny bl_148602/3/4 to sandbox tj, NIE ma ich na koncie klienta (6 katalogów, 7 magazynów, 0 tagów). Dostęp jest; katalog i magazyny docelowe dla klienta pozostają do wyboru → O-33.
- **O-22** · otwarte · klient · dotyczy HA-2.18 (wartości do podmiany) — Arkusz „Podkategorie - korekta” (2026-09-29) nie ma kolumn priorytetu (P1/P2/P3) ani „Inspiracja rynkowa”, na których opiera się O-04 (import tylko P1 dostępnych w naszej hurtowni). Czy priorytety z arkusza z 15.09 obowiązują dalej dla podkategorii bez zmian? Jaki priorytet mają nowe podkategorie broni palnej, amunicji, broni czarnoprochowej, samoobrony, „Markery pneumatyczne (RAM)” i „Magazynki pozostałe”?
  - 2026-10-06 tj: budujemy z domyślnym priorytetem nowych podkategorii (HA-2.18, wartość wstępna P2); odpowiedź klienta podmienia tylko wartości.
  - 2026-10-09 tj/HA-2.18: zrobione — input `NEW_SUBCATEGORY_DEFAULT_PRIORITY` (`config/inputs.ts`, P1 | P2 | P3, nieustawiony = P2); 46 nowych nazw w `xml-integration/assortment-rules.ts` → `newSubcategories` (węzeł wg `docs/research/taksonomia-p1.md`, sekcja „Nowe podkategorie”). Odpowiedź klienta = pole `priority` w wierszu (per podkategoria) albo wartość env (wszystkie naraz). Podkategorie bez zmian nazwy zachowują priorytet z 15.09.
- **O-23** · rozstrzygnięte · klient — BAS. W korekcie „Broń alarmowo-sygnałowa (BAS)” trafiła do „Akcesoriów do samoobrony” bez pozwolenia, a „Broń palna alarmowa/sygnałowa/gazowa” do broni palnej z pozwoleniem (próg kalibru 6 mm). Decyzja z 2026-09-22 (O-11) mówi, że cała gałąź 1.5 idzie przez odbiór osobisty. Czy BAS ≤6 mm wysyłamy kurierem (z potwierdzeniem 18+), czy zostaje odbiór osobisty? Gdzie BAS ląduje w drzewie 01–15: 1.5 czy 15?
  - 2026-09-29 tj: zmiana klienta jest wiążąca. BAS jest w „Akcesoriach do samoobrony”, nie wymaga pozwolenia, więc wg O-11 może iść kurierem.
- **O-24** · rozstrzygnięte · klient — Korekta usunęła kategorię „Kolekcjonerstwo i militaria” (broń zdezaktywowana, repliki, hełmy, mundury, naszywki, medale, amunicja inertna itd.). Świadomie wypada ze sklepu? Hełmy i mundury były zmapowane w HA-2.04 (9.3.4, 12.1).
  - 2026-09-29 tj: usunięcie jest wiążące, kategoria wypada ze sklepu.
- **O-25** · rozstrzygnięte · tj — Kusze oznaczone „wymaga pozwolenia”. Potwierdzić z aktualną ustawą (art. 11) — od tego zależy, czy łucznictwo z O-20 ma sens w sklepie bez koncesji na tę pozycję.
  - 2026-09-29 tj: bierzemy tak, jak wpisał klient: pozwolenie, więc bez kuriera.
- **O-26** · rozstrzygnięte · tj — „Proch czarny: wymagana Europejska Karta Broni” — czy chodzi o pozwolenie na nabycie (sprzedaż w salonie za okazaniem pozwolenia), czy faktycznie o EKB? Czy proch i spłonki w ogóle sprzedajemy online, czy tylko w salonie?
  - 2026-09-29 tj: bierzemy tak, jak wpisał klient (EKB).
- **O-27** · rozstrzygnięte · klient — Potwierdzenie reguły wysyłki (robocza reguła z O-11), grupy wg arkusza „Podkategorie - korekta”:
  - **A. Wymaga pozwolenia → tylko odbiór osobisty?** Broń palna (wszystkie typy: pistolety, rewolwery, PCC, pistolety maszynowe, karabinki, karabiny, strzelby, broń kombinowana), broń palna alarmowa/sygnałowa/gazowa, broń czarnoprochowa na amunicję scaloną, wszystkie naboje (w tym ślepe, hukowe, alarmowe, gazowe, sygnałowe i czarnoprochowe), spłonki, prochy bezdymne, lufy, kusze. Do tego proch czarny (EKB) oraz karabiny samoczynne i amunicja szczególnie niebezpieczna (tylko koncesja/B2G).
  - **B. Tylko rejestracja → kurier dozwolony?** Wiatrówki >17 J (karabinki sprężynowe, PCP, CO₂, PCA, pistolety i rewolwery pneumatyczne), broń pozbawiona cech użytkowych.
  - **C. „+/-” → decyzja per produkt (pozwolenie = odbiór, bez pozwolenia = kurier)?** Paralizatory (próg 10 mA), zamki/suwadła/BCG, zestawy konwersyjne (z istotnymi częściami broni), broń rozdzielnego ładowania (zwolnione egzemplarze sprzed 1885 r. i repliki), urządzenia wylotowe (tłumiki huku wojskowe/policyjne — sprzedaż ograniczona).
  - **D. Bez pozwolenia i rejestracji:** produkty z wymogiem 18+ (BAS ≤6 mm, gazy, paralizatory ≤10 mA, wiatrówki ≤17 J itp.) → odbiór osobisty, dopóki nie ma bramki 18+ (O-12); bez ograniczenia wieku (noże, pałki itp.) → kurier.
  - 2026-09-29 tj: oznaczenie „wymaga pozwolenia” dla pozycji z grupy C ustawiamy w BaseLinkerze na etapie importu. Grupa B też wymaga 18+, więc do czasu bramki 18+ idzie odbiorem osobistym.
  - 2026-10-06 klient: potwierdził grupy A–D. B (rejestracja) → odbiór; D: „ASG, noże itp.” też odbiór do czasu weryfikacji wieku. Nowa reguła (zastępuje roboczą z O-11): wymaga pozwolenia, rejestracji lub 18+ → bez kuriera. Zostają O-29 i O-30 (domyślnie odbiór, zmiana w danych HA-2.17).
- **O-28** · otwarte · tj/klient — IDENTT (weryfikacja tożsamości i wieku online) jako alternatywa dla mObywatela (wraca O-12). Klient podał serwis 2026-10-06. Nie blokuje: do czasu bramki wszystko 18+ idzie odbiorem. Do ustalenia: oferta, koszt, integracja.
- **O-29** · otwarte · klient — Broń rozdzielnego ładowania: w wiadomości klienta jest w grupie A („również”) i w grupie C („+/-”). Domyślnie odbiór (HA-2.17), zmiana to dane w tabeli reguł.
- **O-30** · otwarte · klient — Grupa D: czy „ASG, noże itp.” ma iść odbiorem osobistym aż do bramki 18+ („do czasu braku weryfikacji wieku”). Domyślnie tak (HA-2.17).
- **O-31** · rozstrzygnięte · tj · dotyczy HA-2.21 — Domena główna: hydra-arms.com (regulamin, polityki) czy hydraarms.pl (canonical, og:url, sitemap w kodzie). Potwierdzone odczytem 2026-10-06.
  - 2026-10-25 tj: domena główna hydra-arms.com
- **O-32** · rozstrzygnięte · klient/tj · dotyczy HA-2.05, HA-2.22 — Marża z arkusza: czy ręcznie zmieniona cena w BL ma przeżyć kolejny import czy zostać nadpisana, oraz zakres (aneks).
  - 2026-10-13 tj (HA-2.15): przy produkcie wspólnym dla dwóch hurtowni (ten sam EAN) cenę sprzedaży wyznacza hurtownia importowana później — jej cena zakupu plus marża. Harmonogram z HA-2.15 daje pierwszeństwo Shargowi przed Kolbą i Kolbie przed Spechurtem; reguły „wygrywa najtańsza hurtownia” nie ma. Import nadpisuje też nazwę, opis i kategorię poprawione ręcznie w BL (wpisy w `docs/deferred-tasks.md`).
  - 2026-10-14 pomiar (HA-2.15, diagnostyka na serwerze, klucz z HA-2.28): sync idzie po całym feedzie bez filtru asortymentu, więc przez wspólny EAN zapisałby stan i cenę na produkt innej hurtowni — Kolba 446, Sharg 45, Spechurt 177 produktów (po SKU: 0). Cena sprzedaży takiego produktu to więc cena hurtowni, której sync przeszedł ostatni (harmonogram: Spechurt 05:40 UTC), a stan pojawia się w dwóch magazynach. Poza zakresem HA-2.15 (decyzja tj 2026-10-14, prompt zadania) — tu.
  - 2026-10-26 tj: ROZSTRZYGNIĘTE w tej formie (po rozmowie z klientem): ręcznie zmieniona CENA w BL nadal jest nadpisywana przez import i sync; narzędziem klienta jest pole dodatkowe „Marża %” na produkcie w katalogu 119068 (HA-2.22) — import i sync liczą cenę z tej marży, a pole puste = marża hurtowni z env. Marże z arkusza odłożone (`docs/deferred-tasks.md`, 2026-10-26). Kwestia ceny produktu wspólnego dla dwóch hurtowni (wpisy 2026-10-13/14) bez zmian, z jednym wyjątkiem: marża z pola produktu ma pierwszeństwo przed env każdej hurtowni.
- **O-33** · rozstrzygnięte · klient/tj · dotyczy HA-2.14, HA-2.15 — Katalog i magazyny docelowe na koncie BL klienta. Konto ma 6 katalogów i 7 magazynów (bl_45657 Domyślny, warehouse_5007832 SHARG, blconnect_6820 Kobold Defense, bl_57196 Sharg, blconnect_6971 MILICON, bl_58093 Własny, bl_76925 042025), 0 tagów; identyfikatory 107789 i bl_148602/3/4 w `.env.local` są z sandboxa tj. Do wyboru: nowy katalog Hydra czy jeden z istniejących; które magazyny grają rolę H1 Kolba / H2 Sharg / H3 Spechurt / Hydra własny; czy tagi importu (`auto`/`review`/`flag`/`approved`/`age_18`) zakłada klient czy skrypt (`bl-build-categories.ts`). Blokuje HA-2.15. Decyzja po raporcie HA-2.14.
  - 2026-10-09 tj: ROZSTRZYGNIĘTE — nowy katalog „Hydra arms” **id 119068** i nowe magazyny **H1 Kolba bl_157483 / H2 Sharg bl_157484 / H3 Spechurt bl_157485** (założone ręcznie w panelu klienta; rezerwacja stanów: tak; ujemne stany: blokuj; synchronizacja z integracjami konta nieaktywna). Istniejących katalogów (Kobold Defense 4 741, MILICON 2 591, …) nie ruszamy. Do wyjaśnienia z klientem przed HA-2.15: (a) integracje „hydra-arms.co…” i HYDRA-ARMS (Allegro) na koncie — co to i czy sprzedaje; (b) Sharg jest też jako Base Connect „SHARG (Hurtownia)” — nasz import XML czy Base Connect. Grupy cenowe / źródło zamówień / statusy: odczyt API i kategorie + tagi w katalogu 119068 → HA-2.26. Nowe ID w `.env.local` lokalnie (tj 2026-10-09); na serwerze `hydra-srv` przy HA-2.15.
  - 2026-10-14 tj (HA-2.15): (a) i (b) nadal bez odpowiedzi; pytania wysłane do klienta 2026-10-14. Decyzja: pierwszy import trzech hurtowni do 119068 idzie mimo to (opcja A) — katalog ma wyłączoną synchronizację z integracjami konta, sklep pokazuje tylko `approved`; gdyby klient wskazał Base Connect dla Sharga, produkty z magazynu H2 (bl_157484) trzeba usunąć z katalogu ręcznie albo skryptem.
- **O-34** · otwarte · klient · dotyczy HA-2.28, HA-2.15 — Co klient rozumie przez „SKU ma łączyć produkty, żeby nie było dwa razy tego samego”: kod producenta (EAN — tak działa import; SKU hurtowni to numery wierszy ich katalogów i nie mogą łączyć między hurtowniami, dowód: diagnostyka 2026-10-14) czy własny kod towaru Hydry nadawany w BL? Oraz: czy pole SKU w BaseLinkerze może nieść prefiks hurtowni (`SHARG-139`), skoro katalog 119068 jest nowy i osobny od integracji Allegro (O-33a)? Nie blokuje HA-2.28 (budujemy na EAN + prefiks, decyzja tj 2026-10-14); odpowiedź „własny kod Hydry” = osobne zadanie (kto nadaje, co z towarem bez EAN).
- **O-35** · otwarte · klient · dotyczy HA-2.08, HA-2.23 — P24 wymaga od klienta: (a) wzoru formularza odstąpienia od umowy (§ 6 ust. 2 Regulaminu o nim wspomina, w repo go nie ma); (b) potwierdzenia numeru telefonu (511 307 179 to wartość zapasowa w kodzie, O-09); (c) klauzuli operatora płatności (PayPro SA dla kart) po akceptacji konta P24; (d) potwierdzenia, że na produkcji każda kategoria ma co najmniej jeden aktywny produkt ze zdjęciem, opisem i ceną; (e) potwierdzenia brzmienia checkboxa akceptacji: «Zapoznałem(-am) się z Regulaminem sklepu oraz Polityką prywatności i akceptuję ich treść.»; (f) czy fraza o roboczym/deweloperskim adresie ma zostać w publicznej Polityce prywatności i Polityce cookies; (g) Polityka prywatności/cookies nie wspomina InPost — przy wyborze Paczkomatu przeglądarka klienta łączy się z serwerami InPost (mapa); czy klient dopisze to do polityk (dopisane w HA-2.02, 2026-10-17)
- **O-36** · otwarte · klient · dotyczy HA-2.39 — Cena produktu wspólnego dla kilku hurtowni (ten sam EAN): czy klient akceptuje regułę „najtańsza cena zakupu wśród hurtowni, które mają towar na stanie (gdy żadna nie ma — najtańsza w ogóle)”, czy woli stały priorytet hurtowni (np. Sharg przed Kolbą)? Oraz: czy alokacja zamówienia w BaseLinkerze (automatyzacje, O-14) ma kierować zamówienie do tej samej hurtowni, której cenę wybrała wycena? Nie blokuje HA-2.39 — budujemy na „najtańsza dostępna” jako wartości domyślnej.
  - 2026-10-26 tj (plan po audycie HA-2.37): reguła domyślna „najtańsza dostępna”; zmiana na priorytet po odpowiedzi klienta = zmiana reguły w HA-2.39, bez zmiany modelu danych (grupy „Zakup Kolba / Sharg / Spechurt”).
