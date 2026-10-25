---
id: HA-2.35
title: /sklep liczony na serwerze — URL jako stan (page, spec), SklepClient bez filtrowania, cache per kombinacja filtrów
status: in_progress
difficulty: L
model: claude-opus-5-5
model_approved: null
effort: high
branch: feat/ha-2.35-server-listing
due: null
depends_on: [HA-2.34]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Listing `/sklep` ma dostawać z serwera tylko to, co widać: 24 karty, łączną liczbę i liczniki filtrów z `shop_listing` (HA-2.34), a drzewo kategorii z `shop_tree`. Źródłem stanu jest URL — każda zmiana filtra to nowy adres, więc deep linki działają także dla strony i specyfikacji (dziś `spec` nie jest w URL, deferred HA-2.30). Komponenty UI z HA-2.30 zostają; zmienia się tylko skąd biorą `options` i `count`. Sukces: listing z 5 000+ produktów renderuje się w < 200 KB HTML, filtruje bez przeładowania strony, a testy listingu przechodzą na seedzie > 1 000 wierszy.

## Zakres
- [ ] odczyt stanu bieżącego: `src/app/(main)/sklep/page.tsx` (`fetchShopData`, `resolveProductsForBlock`, `ShopPageSections`), `src/components/shop/SklepClient.tsx` (stan, `router.replace`, 8 kluczy URL, paginacja lokalna), `listingFilters.ts` (kontrakt `FilterOptions`/`FilterState`), `HeaderSearch.tsx` (pełne przeładowanie na `/sklep`, HA-2.32 A2), `tests/shop/listing.spec.ts`, sygnatura funkcji z 019 (`supabase/migrations/019_shop_listing.sql`)
- [ ] `src/lib/shop/listing.ts` (nowy): parser `searchParams` → argumenty `shop_listing` (walidacja: `sort` przez `isSortKey`, `dostawa` przez `isDeliveryMode`, `page` ≥ 1, `spec` w formacie `Klucz:wartość`, powtarzalny); `getListing(params)` i `getShopTree()` w `unstable_cache` — klucz = znormalizowane parametry, `revalidate: 300`, `tags: [SHOP_CACHE_TAG]`; wywołanie przez `createAdminClient()`; brak klucza service-role lub błąd RPC = `throw` (strona błędu Next), nigdy pusty listing ani cache'owanie błędu (deferred 2026-09-30)
- [ ] potomków kategorii liczy aplikacja z `shop_tree()` (dwa poziomy jak dziś) i podaje do SQL gotowe `p_category_ids`
- [ ] `sklep/page.tsx`: czyta `searchParams`, woła `getListing` + `getShopTree`, przekazuje do `SklepClient` wynik strony zamiast pełnej listy; `resolveProductsForBlock` tymczasowo na osobnym małym zapytaniu (`is_active`, z obrazem, `ORDER BY id DESC LIMIT 48`) — docelowo HA-2.36
- [ ] `SklepClient`: bez `useMemo` filtrujących; stan wyłącznie z URL; zmiana filtra = `router.push(url, { scroll: false })` w `startTransition`, `isPending` → wskaźnik ładowania na gridzie; wyszukiwarka toolbaru: debounce 300 ms, potem push; paginacja z `?page=`; nowe klucze URL `page` i `spec` (`spec=Kaliber:9mm&spec=Kaliber:.22`), istniejące 8 kluczy i ich wartości bez zmian (kontrakt HA-2.30)
- [ ] `FiltersSidebar`, `ListingToolbar`, `ActiveFilterChips`, `MobileFilterSheet`: tylko źródło `options`/`count`; chip specyfikacji usuwa parametr z URL
- [ ] seed: generowany blok > 1 000 aktywnych produktów (pętla SQL `generate_series`, jedna kategoria „seed-bulk”, bez zdjęć) — potrzebny do kryteriów paginacji i rozmiaru; pozostałe testy nie mogą od niego zależeć (filtr kategorii)
- [ ] testy `tests/shop/listing.spec.ts`: aktualizacja selektorów bez osłabiania; nowe: deep link `?cat=<id>&spec=Klucz:wartość&page=2` odtwarza sidebar, chipsy i stronę; × na chipie spec usuwa parametr; zmiana kategorii zmienia listę marek; zmiana filtra bez `load` strony (`page.waitForEvent('framenavigated')` nie odpala pełnego ładowania; test przez `performance.navigation`/`__next` marker); szukaj z headera z PDP nadal trafia na `/sklep?q=` (regresja HA-2.32)

## Gotowe, gdy
- listing z seedu > 1 000 produktów pokazuje 24 karty na stronę i wszystkie produkty przez paginację — **jak sprawdzić:** test: `total` na toolbarze = liczba aktywnych z seedu; ostatnia strona ma `total mod 24` kart (lub 24); `curl -s -o /dev/null -w '%{size_download}' http://localhost:<port>/sklep` < 200 000 (wklejone)
- stan w URL kompletny — **jak sprawdzić:** test deep link (`cat`, `spec`, `page`, `marka`) odtwarza sidebar, chipsy, numer strony i produkty; `grep -n "params.set\|params.append" src/components/shop/SklepClient.tsx` pokazuje stare 8 kluczy + `page` + `spec` (wklejone)
- zmiana filtra nie przeładowuje strony i pokazuje wskaźnik ładowania — **jak sprawdzić:** test: po kliku w filtr `window.__hydraMarker` ustawiony przed klikiem nadal istnieje, URL zmieniony, lista zmieniona
- liczniki marek liczone bez filtra marki, specyfikacje tylko przy kategorii — **jak sprawdzić:** test UI na seedzie z HA-2.34 (wybór marki nie usuwa innych marek z sidebara; bez kategorii sekcja specyfikacji nieobecna)
- stan odejmuje rezerwacje na karcie — **jak sprawdzić:** test: produkt z opłaconym zamówieniem z seedu HA-2.34 ma na karcie „brak” / nie wraca przy `stock=1`
- brak klucza service-role to błąd, nie pusty sklep — **jak sprawdzić:** `grep -n "catch" src/lib/shop/listing.ts` = 0 trafień wokół wywołania RPC (wklejone) + konfiguracja Playwright bez `SUPABASE_SERVICE_ROLE_KEY` daje na `/sklep` status 500, nie 200 z pustą listą (nowy mini-config jak `playwright.shipping-env.config.ts`)
- cache nie zapisuje błędów i jest kluczowany parametrami — **jak sprawdzić:** `grep -n "unstable_cache" src/lib/shop/listing.ts` pokazuje klucz z parametrów (wklejone); test: dwa różne URL-e dają różne wyniki bez czekania 5 min
- kontrakt URL z HA-2.30 nienaruszony — **jak sprawdzić:** testy `listing.spec.ts` z `main` dotyczące `cat,q,stock,min,max,sort,marka,dostawa` przechodzą bez zmiany asercji wartości (zmiany selektorów dopuszczone, wymienione w raporcie)
- `npm run test:shop` zielony poza znanymi flaky z deferred (wymienione z nazwy); `npm run build` bez błędów; zrzuty `.playwright-mcp/ha-2.35-desktop.png`, `ha-2.35-mobile.png`, `ha-2.35-loading.png`

## Poza zakresem
- bloki Sanity na docelowych zapytaniach, picker, sitemap, usunięcie `fetchShopData` → HA-2.36 (tu `fetchShopData` zostaje w repo, ale `/sklep` już go nie importuje)
- `/api/shop/products` (publiczne JSON API z `.range()`, `api.spec.ts`) → bez zmian
- PDP (`sklep/[id]`) pokazuje surowy `stock` bez rezerwacji (stan sprzed; wpis do deferred) → osobne zadanie S
- strony kategorii i trzeci poziom drzewa → następny plan
- zmiana wyglądu komponentów z HA-2.30/2.31 → nie tu
- `HeaderSearch` → bez zmian (pełne przeładowanie na `/sklep` zostaje; po tym zadaniu może przejść na push — deferred)

## Bramki STOP
- przed merge'em — tj wkleja z prod wynik `select proname from pg_proc where proname in ('shop_listing','shop_tree')` (2 wiersze) i `select column_name from information_schema.columns where table_name='shop_products' and column_name='pickup_only'`; bez tego merge łamie prod (kod woła funkcję, której nie ma)
- przed dodaniem kolumny `pickup_only` do `PUBLIC_PRODUCT_COLUMNS` — pokaż diff; kolumna jest pochodną pól już publicznych, więc może wejść, ale decyzja tj
- przed zmianą któregokolwiek z 8 istniejących kluczy URL lub ich wartości — STOP (łamie deep linki i testy)
- zmiany w `supabase/migrations/` — nie przewidziane; gdyby funkcja z 019 wymagała poprawki, STOP i powrót do HA-2.34 (nowa migracja 020, nigdy edycja 019)

## Kontekst
- `supabase/migrations/019_shop_listing.sql`, `tests/shop/listing-rpc.spec.ts` — kontrakt funkcji (HA-2.34)
- `src/app/(main)/sklep/page.tsx`, `src/components/shop/SklepClient.tsx`, `src/components/shop/listingFilters.ts`
- `src/components/shop/{FiltersSidebar,ListingToolbar,ActiveFilterChips,MobileFilterSheet}.tsx` (HA-2.30)
- `src/components/shop/HeaderSearch.tsx`, `docs/tasks/HA-2.32.md` (dlaczego pełne przeładowanie na `/sklep`)
- `src/lib/shop/fetchProducts.ts` (`SHOP_CACHE_TAG`, `PUBLIC_PRODUCT_COLUMNS`), `src/lib/supabase/admin.ts`
- `tests/shop/listing.spec.ts`, `tests/shop/fixtures.ts`, `playwright.shipping-env.config.ts` (wzorzec configu bez zmiennej)
- `docs/deferred-tasks.md` — wpisy 2026-09-30 (cache pustego katalogu), 2026-10-19 (spec bez URL, trzeci poziom), flaky z HA-2.19/2.29

## Notatki z realizacji
- 2026-10-24 tj (wf-plan): D2 = A — HA-2.09 (start sprzedaży) zależy od tego zadania.
- 2026-10-24 tj (wf-plan): TTL cache 300 s zostaje; świeżość po płatności zapewnia istniejący `revalidateTag` w `markOrderPaid.ts`, po syncu — w `/api/shop/sync`.
- 2026-10-25 tj (wf-task): liczniki wg decyzji B (tj 2026-10-24, HA-2.34) — każdy licznik liczony ze wszystkimi pozostałymi filtrami; specyfikacje uwzględniają markę i dostawę, marki uwzględniają specyfikacje; różnica względem HA-2.30 to świadoma zmiana, nie regres.
- 2026-10-25 tj (wf-task): seed bulk = A — produkty masowe w jednej kategorii „seed-bulk”, nazwy sortujące się po wszystkich innych produktach seeda, bez zdjęć, zwykły typ (nie tylko odbiór); pozostałe pliki testów bez zmian.
