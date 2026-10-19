---
id: HA-2.30
title: Listing w stylu e-commerce — sidebar z drzewem kategorii, filtry akordeonowe, chipsy, bottom sheet na mobile, ludzkie etykiety kategorii
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Listing sklepu (`/sklep`) jest dziś zbudowany w języku wizualnym strony firmowej: pills kategorii nad gridem, filtry w mono 9–10 px z trackingiem, bez widoku aktywnych filtrów, panel mobilny rozwijany nad gridem. Klient nie widzi, co ma włączone, drzewa kategorii nie da się przeglądać, a surowe nazwy z BaseLinkera („00. DO PRZYPISANIA”, „01. BROŃ PALNA (Koncesjonowana – …)”) renderują się publicznie. Sukces: sidebar z drzewem kategorii i filtrami akordeonowymi na desktopie, bottom sheet z tym samym zestawem na mobile, pasek chipsów aktywnych filtrów nad gridem, wszystkie etykiety czytelne (≥ 13 px, font główny, kontrast), nazwy kategorii bez prefiksów numerycznych i nawiasów — przy niezmienionym stanie filtrów w URL, tak żeby przyszły listing server-side podmieniał tylko źródło danych.

## Zakres
- [ ] odczyt stanu bieżącego: `src/components/shop/SklepClient.tsx` (stan filtrów, parametry URL `cat,q,stock,min,max,sort,marka,dostawa`, `buildTree`, `availableSpecs`, `availableBrands`), `ProductCard.tsx` (`categoryLabel`), `ProductDetailClient.tsx` (nagłówek kategorii), `tests/shop/listing.spec.ts` (selektory), nazwy kategorii w `xml-integration/hydra-category-tree.txt` i parser `xml-integration/hydra-tree-txt.ts`, `supabase/seed.sql` (kategorie 12001 „01. BROŃ PALNA” / 12002 „1.1 Broń Krótka”, brak korzenia „00.”), `COLORS.md`, `REFACTOR_PLAN.md`
- [ ] `src/lib/shop/categoryLabel.ts`: `categoryDisplayName(name)` — odcina prefiks numeryczny („01.”, „1.1”, „1.1.1”), nawias z opisem i poprawia wielkość liter („01. BROŃ PALNA (Koncesjonowana – …)” → „Broń palna”, „1.1 Broń Krótka” → „Broń krótka”); `isWorkingCategory(name)` = prawda dla korzenia „00.”; używane w sidebarze, karcie i PDP (decyzje tj 2026-10-19: D1 A — „00” ukryte w drzewie, D2 A — etykieta z nazwy BL w kodzie)
- [ ] `supabase/seed.sql`: korzeń `00. DO PRZYPISANIA` (nowe id) z jednym aktywnym produktem — tylko dane seedu, bez zmiany schematu; `npm run db:reset` przechodzi
- [ ] rozbicie `SklepClient` na: `FiltersSidebar` (drzewo kategorii 2 poziomy z licznikami produktów, rozwijane, aktywna ścieżka podświetlona, korzeń „00.” pominięty; sekcje akordeonowe: Dostępność, Dostawa, Cena, Marka, specyfikacje — pierwsze cztery otwarte domyślnie; cena jako suwak dwustronny + dwa pola; marka z „pokaż więcej” po 6 i polem szukania po 8), `ActiveFilterChips` (chip z × dla każdego aktywnego filtra, w tym kategorii i frazy; „Wyczyść wszystko”), `ListingToolbar` (licznik „N produktów”, sortowanie jako dropdown z pełnymi etykietami „Cena: od najniższej”, pole szukaj), `MobileFilterSheet` (sticky dolny pasek „Filtry (n) · Sortuj”, bottom sheet na pełną wysokość z tymi samymi sekcjami, przycisk „Pokaż N produktów”); `SklepClient` zostaje właścicielem stanu i URL
- [ ] typografia i kontrast listingu: etykiety filtrów, nazwy kategorii, chipsy, sortowanie, paginacja w foncie głównym (Outfit) 13–14 px, kolor pełny `text` / `text-dim` bez przezroczystości poniżej 0.6; mono + tracking tylko na metadanych (nagłówki sekcji typu `FILTRY`, liczniki w nawiasach) i nie mniejsze niż 11 px; akcent zielony na stanie aktywnym i jednym CTA, nie na ramkach
- [ ] usunięcie przycisku „[ UKRYJ KATEGORIE ]” i pills kategorii nad gridem (zastąpione drzewem); grid 3 kolumny przy sidebarze, 2 na tablecie, 1–2 na mobile; `ProductCard` bez zmian poza etykietą kategorii (karta → HA-2.31)
- [ ] aktualizacja selektorów w `tests/shop/listing.spec.ts` do nowego UI (bez osłabiania asercji) + nowe testy: chip usuwa filtr i aktualizuje URL; bottom sheet na viewport 375 px otwiera się, zlicza produkty i stosuje filtr; deep link `?cat=<id>&marka=<x>` odtwarza stan w sidebarze i chipsach; korzeń „00.” nieobecny w drzewie, a jego produkt widoczny w „Wszystkie”
- [ ] test jednostkowy `xml-integration/__tests__/category-label.test.ts` (tam łapie go `npm run test:unit`) importujący `src/lib/shop/categoryLabel.ts`: wszystkie nazwy z `hydra-category-tree.txt` + próbka podkategorii (`1.2.1 Karabiny i Karabinki Samopowtarzalne (Platformy AR-15, …)` → „Karabiny i karabinki samopowtarzalne”) i red proof (nazwa bez prefiksu przechodzi bez zmian poza wielkością liter; nawias w nazwie produktu nie jest cięty — funkcja dotyczy wyłącznie kategorii)

## Gotowe, gdy
- desktop ≥ 1024 px: sidebar z drzewem kategorii (korzenie + podkategorie po rozwinięciu, licznik przy każdej, aktywna ścieżka podświetlona), bez korzenia „00.” w drzewie, a produkt z „00.” widoczny w „Wszystkie”; klik w kategorię ustawia `?cat=` jak dziś — **jak sprawdzić:** test w `listing.spec.ts` (drzewo widoczne, brak „Do przypisania” w `aside`, produkt z seedu „00.” na liście bez filtra, klik → URL zawiera `cat=`), zrzut `.playwright-mcp/ha-2.30-desktop-sidebar.png`
- sekcje filtrów są akordeonami, a w nowych komponentach nie ma tekstu poniżej 11 px ani mono na elementach klikalnych — **jak sprawdzić:** `grep -cE 'text-\[(9|10)px\]' src/components/shop/{FiltersSidebar,ActiveFilterChips,ListingToolbar,MobileFilterSheet}.tsx` = 0 w każdym; `grep -n 'font-mono\|--font-mono' src/components/shop/FiltersSidebar.tsx` tylko przy nagłówkach sekcji i licznikach (wklejone); zrzut
- pasek chipsów: każdy aktywny filtr (kategoria, fraza, dostępność, dostawa, marka, cena, specyfikacje) ma chip z ×; × usuwa dokładnie ten filtr i aktualizuje URL; „Wyczyść wszystko” zeruje wszystkie parametry — **jak sprawdzić:** nowy test w `listing.spec.ts` (włącz 2 filtry → 2 chipsy → × na jednym → URL bez tego parametru, drugi zostaje)
- mobile 375 px: sticky dolny pasek „Filtry (n) · Sortuj”, bottom sheet z drzewem i filtrami, przycisk „Pokaż N produktów” zamyka arkusz i stosuje filtry — **jak sprawdzić:** nowy test w `listing.spec.ts` na viewport 375×812 (`page.setViewportSize`) + zrzut `.playwright-mcp/ha-2.30-mobile-sheet.png`
- żadna publiczna etykieta kategorii nie zawiera prefiksu numerycznego ani nawiasu: `categoryDisplayName` dla każdej nazwy z `hydra-category-tree.txt` daje wynik bez `^\d` i bez `(`; red proof: nazwa produktu z nawiasem przechodzi do funkcji bez zmian — **jak sprawdzić:** nazwy testów w `npm run test:unit`; `grep -n "\.name" src/components/shop/*.tsx` — każde użycie nazwy kategorii w JSX przechodzi przez `categoryDisplayName` (wklejone)
- stan filtrów w URL bez zmian i wstecznie zgodny: te same klucze `cat,q,stock,min,max,sort,marka,dostawa`, te same wartości; deep link odtwarza sidebar i chipsy — **jak sprawdzić:** `grep -n "params.set" src/components/shop/SklepClient.tsx` (ten sam zestaw co na `main`), test deep link; pełny `npm run test:shop` zielony (poza znanymi flaky z deferred HA-2.19, wymienionymi z nazwy w raporcie)

## Poza zakresem
- listing server-side (paginacja, FTS, facety w Supabase) → osobne zadanie z własnego `/wf-plan` (pakiet A); tu stan URL ma być do niego gotowy, nic więcej
- karta produktu (packshot, CTA, cena przekreślona, linia stanu) → HA-2.31
- link „Sklep” w `Nav.tsx`, wyszukiwarka w headerze, breadcrumby, CTA na home → HA-2.32; `Nav.tsx` i `HomePageClient.tsx` w tym zadaniu nietykane
- cookie banner (rozmiar na mobile, ponowne pojawianie się mimo zgody) → osobne zadanie S po sprawdzeniu, czy to regresja HA-2.08
- lint `react-hooks/static-components` poza komponentami, które to zadanie i tak wyodrębnia → HA-1.10 (agent odnotowuje w raporcie, które wyjątki zniknęły)
- strony kategorii z własnymi ścieżkami (`/sklep/kategoria/...`) → razem z listingiem server-side

## Bramki STOP
- STOP 1 — po pierwszym renderze sidebara, chipsów i toolbaru na desktopie (przed bottom sheetem i testami): zrzuty desktop + opis hierarchii typograficznej (rozmiary, fonty, kolory per element) do akceptacji tj; dopiero potem mobile
- przed zmianą któregokolwiek klucza lub wartości parametru URL — stop, to łamie deep linki i założenie pakietu A

## Kontekst
- `src/components/shop/SklepClient.tsx` — stan, URL, filtry, drzewo; punkt wyjścia do rozbicia
- `src/components/shop/ProductCard.tsx`, `ProductDetailClient.tsx` — miejsca, gdzie renderuje się nazwa kategorii
- `xml-integration/hydra-category-tree.txt`, `xml-integration/hydra-tree-txt.ts` — pełna lista nazw kategorii i istniejący parser prefiksów
- `supabase/seed.sql` — kategorie i produkty lokalne (12001/12002 z prefiksami; brak „00.”)
- `tests/shop/listing.spec.ts`, `tests/shop/fixtures.ts` — testy do aktualizacji; uruchamianie na WSL: `HYDRA_TEST_PORT=3101`, sesja `SUPABASE_TARGET=local`
- `COLORS.md`, `REFACTOR_PLAN.md` — paleta i wzorce (CornerCTA, padding sekcji)
- `docs/deferred-tasks.md` — wpisy HA-2.19 o flaky `cart.spec.ts:112`, `listing.spec.ts:165`

## Notatki z realizacji
- 2026-10-19 tj (wf-plan): D1 A — korzeń „00.” ukryty w drzewie (produkty widoczne w „Wszystkie” i w wyszukiwarce); D2 A — etykiety wyliczane z nazwy BL w kodzie, bez migracji; D4 — Opus high mimo trudności M (zadanie projektowe, pierwszy render ma być do przyjęcia). Seed dostaje korzeń „00.” z produktem, bo bez niego test ukrycia nie ma na czym działać.
