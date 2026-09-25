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
- **O-07** · otwarte · klient · blokuje HA-2.05 — Marża per hurtownia (dziś placeholder 30%). Jedna stawka czy różna per kategoria/marka? Potwierdzenie: cena liczona z marży od ceny zakupu, nie z ceny detalicznej feedu.
- **O-08** · rozstrzygnięte · klient — Plan BaseLinkera.
  - 2026-09-22 tj: plan zostanie dobrany tak, żeby pomieścić produkty.
- **O-09** · otwarte · klient · blokuje HA-2.08 — P24: dane (merchant ID, POS ID, CRC, klucz API; najpierw sandbox), numer telefonu na stronę.
  - 2026-09-22 tj: konto P24 w trakcie zakładania (O-15).
- **O-10** · otwarte · klient · blokuje HA-2.02 — Kurierzy (InPost/DPD/inne), metody i cennik dostawy, darmowa dostawa od kwoty.
- **O-11** · częściowo · klient · blokuje HA-2.06 — Kategorie wrażliwe.
  - 2026-09-22 tj: według drzewa broń alarmowa i sygnałowa (1.5) oraz amunicja hukowa, alarmowa i gazowa (2.5) należą do kategorii koncesjonowanych, z odbiorem osobistym w salonie w Krakowie.
  - **Otwarte:** czy koncesjonowane (01, 02) są prowadzone tylko ręcznie, poza feedami. Jak traktować FAC >17 J (11.1.2), paralizatory (15.3) i noże automatyczne/OTF (13.2.3): wysyłka czy odbiór osobisty?
- **O-12** · rozstrzygnięte · klient — Weryfikacja 18+ i uprawnień?
  - 2026-09-22 tj: na razie tylko przy odbiorze. mObywatel zakładamy w przyszłości (odłożone).
- **O-13** · częściowo · klient · blokuje HA-2.07, HA-2.08 — Dane firmy i treści.
  - 2026-09-22 tj: e-paragony przez BaseLinker (O-16).
  - **Otwarte:** dane do potwierdzeń zamówień, polityka zwrotów, dane firmy, kto przygotowuje opisy i kategorie pod SEO, zgoda na opisy produktów z hurtowni.
- **O-17** · otwarte · tj — Czym są „Szafy” we flowcharcie (czwarta hurtownia/dostawca)? Czy potrzebny jest dla nich konektor feedu?
- **O-18** · rozstrzygnięte · tj — Czy ścieżka XML→Supabase wraca?
  - 2026-09-23 tj: nie. Przepływ: XML → BaseLinker (xml-to-baselinker.ts) → Supabase (/api/shop/sync) → BaseLinker (zamówienia). source_connectors, engine.ts, /api/xml/sync, next_xml_product_id do usunięcia osobnym zadaniem po HA-1.06.
- **O-19** · otwarte · tj · blokuje HA-2.15 — Serwer importu 51.83.134.183 (OVH, Ubuntu 26.04, Node 20, 3,7 GB RAM).
  - 2026-09-25 tj: dostęp `ssh ubuntu@` kluczem (alias `hydra-srv`); feed Spechurtu działa tylko stąd (HTTP 200, 17 MB); na serwerze klon repo z lipca i `.env.local`.
  - **Otwarte:** czy serwer zostaje na stałe i kto za niego płaci; czy akceptujemy klucze produkcyjne (Supabase service role, BaseLinker) w `.env.local` na serwerze, z dostępem przez konto `ubuntu`.
- **O-20** · otwarte · klient — ASG, łucznictwo i myślistwo nie mają gałęzi w drzewie 01–15 (HA-2.04: samo ASG to ok. 1–2 tys. produktów we wszystkich trzech hurtowniach). Dodajemy gałęzie (zmiana drzewa i kategorii w BL) czy zostają poza sklepem?
