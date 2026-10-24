---
id: HA-2.34
title: Migracja 019 — listing w Postgresie: shop_listing, shop_tree, kolumna pickup_only, indeksy, wyszukiwarka trgm+unaccent
status: review
difficulty: L
model: claude-opus-5-5
model_approved: null
effort: high
branch: feat/ha-2.34-shop-listing
due: null
depends_on: []
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: 57
---

## Cel
Dzisiejszy listing (`fetchShopData`) ściąga cały katalog do przeglądarki: zapytanie bez `.range()` ucina się na 1 000 wierszy, wpis `unstable_cache` przy kilku MB nie zapisuje się (limit 2 MB), `getReservedQuantities` z `.in(10k id)` pada po cichu w pustym `catch`. Na prod jest już 5 084 produkty `approved`, więc po pierwszym syncu z katalogu 119068 klient zobaczy 1 000 z nich. To zadanie przenosi liczenie listingu do bazy: jedna funkcja zwraca stronę 24 kart, łączną liczbę i liczniki filtrów, licząc stan jako `stock − rezerwacje`. Sukces: funkcja i jej testy są w repo, migracja 019 wgrana na prod przez tj, a `EXPLAIN ANALYZE` na prod pokazuje czas < 100 ms. Kod aplikacji nie zmienia się tutaj (HA-2.35).

## Zakres
- [ ] odczyt stanu bieżącego: `src/lib/shop/fetchProducts.ts` (co dziś filtruje JS i `PUBLIC_PRODUCT_COLUMNS`), `src/components/shop/SklepClient.tsx` (`availableBrands`, `availableSpecs`, `filteredAndSorted`, `categoryCounts`, `priceRange` — semantyka liczników do odtworzenia 1:1), `src/lib/shop/reservedStock.ts` i rezerwacje w `supabase/migrations/016_pickup_enforcement.sql`, `src/lib/shop/cartAnalysis.ts` (`mustPickup`), wzorzec uprawnień w 016, `supabase/baseline/README.md`, lista migracji `ls supabase/migrations | tail`
- [ ] `supabase/migrations/019_shop_listing.sql`:
  - `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions; CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;` oraz `public.f_unaccent(text) RETURNS text IMMUTABLE STRICT PARALLEL SAFE` opakowujące `extensions.unaccent('extensions.unaccent', $1)` (słownik podany jawnie — tylko tak funkcja jest naprawdę niezmienna)
  - `shop_products.pickup_only boolean GENERATED ALWAYS AS (product_type <> 'standard' OR requires_license OR NOT delivery_allowed OR age_min >= 18) STORED` (decyzja tj 2026-10-24, D1 = A); komentarz: lustro `mustPickup()` z `cartAnalysis.ts`; sekcja 01/02 jest pokryta przez `delivery_allowed = false` z syncu (HA-2.17)
  - indeksy: `(is_active, category_id)`, `(is_active, price)`, `(is_active, pickup_only)`, GIN `gin_trgm_ops` na `f_unaccent(name)` i na `sku`, GIN na `features` (`jsonb_path_ops`), btree na `brand` już jest (014)
  - `public.shop_listing(p_category_ids bigint[], p_q text, p_in_stock boolean, p_min numeric, p_max numeric, p_brand text, p_delivery text, p_specs jsonb, p_sort text, p_page int) RETURNS jsonb` → `{ items: [24 × PUBLIC_PRODUCT_COLUMNS bez description], total, brands: [{brand, count}], specs: [{key, values: [{val, count}]}], page, page_size }`; stan = `stock − COALESCE(rezerwacje, 0)` z LEFT JOIN do zagregowanych `order_items` zamówień `status = 'paid' AND baselinker_order_id IS NULL` (ta sama definicja co 016); marki liczone ze wszystkimi filtrami poza marką; specyfikacje liczone ze wszystkimi filtrami poza specyfikacjami, tylko gdy `p_category_ids` niepuste, przez `jsonb_each_text(features)`, klucze z ≥ 2 wartościami, OR w kluczu / AND między kluczami; `p_q` → `f_unaccent(name) ILIKE '%' || f_unaccent(p_q) || '%' OR sku ILIKE …`; `p_delivery`: `'wysylka'` → `NOT pickup_only`, `'odbior'` → `pickup_only`; sortowania `name_asc|name_desc|price_asc|price_desc|newest` z `COLLATE "pl-x-icu"` dla nazwy, `NULLS LAST` dla ceny, zawsze dogrywka `, id`; `p_page` od 1, `LIMIT 24 OFFSET …`
  - `public.shop_tree() RETURNS jsonb` → `{ categories: [{id, name, parent_id, count}], price: {min, max} }` — licznik aktywnych produktów bezpośrednio w kategorii (potomków sumuje aplikacja), zakres cen po aktywnych z ceną > 0
  - obie funkcje: `LANGUAGE sql` lub `plpgsql`, `STABLE`, `SECURITY DEFINER`, `SET search_path = public, extensions`, `REVOKE ALL … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role` (wzorzec 016); komentarz nagłówkowy jak w 016 (po co, co zmienia, rollback)
  - `src/lib/supabase/types.ts`: kolumna `pickup_only`, typy argumentów i wyniku obu funkcji (ten sam diff)
- [ ] seed (`supabase/seed.sql`), tylko dane: ≥ 3 produkty w jednej kategorii z `features` dającymi dwa klucze po ≥ 2 wartości, ≥ 2 marki w tej kategorii, dwa produkty o identycznej nazwie (dogrywka po `id`), produkt z nazwą z polskimi znakami („Luneta celownicza …”), jedno zamówienie `paid` bez `baselinker_order_id` z pozycją na produkt o `stock = 1` (red proof rezerwacji); `npm run db:reset` przechodzi
- [ ] testy `tests/shop/listing-rpc.spec.ts` — wywołania `rpc('shop_listing', …)` i `rpc('shop_tree')` klientem service-role na lokalnym stacku (klucz z `.env.development.local`); bez UI
- [ ] raport: dokładny SQL migracji do wklejenia w SQL Editor prod, zapytanie weryfikacyjne, zdanie „prod migration first, merge after”

## Gotowe, gdy
- funkcje istnieją i tylko `service_role` może je wołać — **jak sprawdzić:** test: `select has_function_privilege('anon', 'public.shop_listing(bigint[],text,boolean,numeric,numeric,text,text,jsonb,text,int)', 'EXECUTE')` = false, to samo dla `authenticated` i dla `shop_tree()`, a dla `service_role` = true (red proof odczytem, nie wywołaniem — lokalny Postgres 17 segfaultuje przy wywołaniu bez uprawnień, notatka HA-2.02); na prod: wklejony wynik tego samego zapytania
- stan odejmuje rezerwacje — **jak sprawdzić:** test: produkt z seedu `stock = 1` z opłaconym zamówieniem bez `baselinker_order_id` ma w `items[].stock` = 0 i przy `p_in_stock = true` nie wraca; po ustawieniu `baselinker_order_id` w teście wraca ze stanem 1
- wyszukiwarka bez polskich znaków i częściami słów — **jak sprawdzić:** test: `p_q = 'luneta'` oraz `'LUNETA'` znajdują „Luneta celownicza …”; `'celownicz'` też; `'xyz-nie-ma'` daje `total = 0` (red proof); test po `sku`
- strony nie nakładają się i nie gubią wierszy — **jak sprawdzić:** test: dla seedu > 24 produktów zbiór `id` ze stron 1..N jest rozłączny i równy liczbie aktywnych; przy dwóch identycznych nazwach kolejność stabilna w dwu wywołaniach
- liczniki marek i specyfikacji zgodne z dzisiejszą semantyką — **jak sprawdzić:** test: przy wybranej marce `brands` zawiera też pozostałe marki kategorii z licznikami (liczone bez filtra marki); `specs` puste bez kategorii, a z kategorią zawiera tylko klucze o ≥ 2 wartościach; wybór wartości jednego klucza nie usuwa pozostałych wartości tego klucza z liczników
- `pickup_only` zgodne z `mustPickup()` — **jak sprawdzić:** test: dla każdego produktu seedu `pickup_only` z bazy = `mustPickup(produkt)` z `src/lib/shop/cartAnalysis.ts` (import funkcji w teście); red proof: `UPDATE shop_products SET product_type = 'pickup_only'` na jednym produkcie w teście zmienia `pickup_only` na true bez syncu
- sortowanie po cenie z `NULLS LAST` i nazwa po polsku — **jak sprawdzić:** test: `price_asc` kończy się produktami bez ceny; `name_asc` ustawia „Ćwiek” między „C…” a „D…”, nie na końcu
- `shop_tree` zwraca każdą kategorię z licznikiem i zakres cen równy `min/max` aktywnych z ceną > 0 — **jak sprawdzić:** test na seedzie
- czas na prod — **jak sprawdzić:** wklejony przez tj `EXPLAIN (ANALYZE, BUFFERS) SELECT public.shop_listing(NULL, NULL, false, NULL, NULL, NULL, NULL, '{}', 'name_asc', 1)` z SQL Editora po wgraniu 019: `Execution Time` < 100 ms
- `src/lib/supabase/types.ts` zmieniony w tym samym diffie; nowa kolumna nie wchodzi do `PUBLIC_PRODUCT_COLUMNS` (to HA-2.35) — **jak sprawdzić:** `git diff main...<branch> --stat` zawiera `types.ts`; `grep -n pickup_only src/lib/shop/fetchProducts.ts` = 0
- migracja nie dotyka istniejących plików — **jak sprawdzić:** `git diff main...<branch> --stat -- supabase/migrations` pokazuje tylko `019_shop_listing.sql`

## Poza zakresem
- przepięcie `/sklep`, URL, cache → HA-2.35
- bloki Sanity, picker, sitemap, usunięcie `fetchShopData` → HA-2.36
- zmiana `checkout_create_order` na `pickup_only` (dziś ma własny warunek + `hydra_section`) → osobne zadanie S po stabilizacji; tu reguła odbioru w checkoucie nietknięta (bramka projektowa)
- Meilisearch/Algolia (tolerancja literówek) → dopiero gdy klient o to poprosi
- strony kategorii `/sklep/kategoria/...` i trzeci poziom drzewa → następny plan
- `/api/shop/products` (publiczne JSON API z `.range()`) → bez zmian

## Bramki STOP
- przed napisaniem 019 — pokaż `ls supabase/migrations | tail -3` i sygnaturę funkcji (nazwy i typy argumentów) do akceptacji; sygnatura jest kontraktem dla HA-2.35
- przed `ALTER TABLE shop_products` — pokaż diff definicji kolumny względem `mustPickup()`; zmiana reguły odbioru = bramka projektowa (project.md)
- zapis na prod wykonuje wyłącznie tj z SQL Editora po merge'u gałęzi; agent nie dotyka prod (hook); raport daje dokładny SQL + zapytanie weryfikacyjne
- stan bazy ustalasz bieżącym odczytem, nigdy z pamięci, notatek ani `src/lib/supabase/types.ts`

## Kontekst
- `src/lib/shop/fetchProducts.ts`, `src/components/shop/SklepClient.tsx` — semantyka filtrów i liczników do odtworzenia
- `src/lib/shop/reservedStock.ts`, `supabase/migrations/016_pickup_enforcement.sql` — definicja rezerwacji i wzorzec REVOKE/GRANT
- `src/lib/shop/cartAnalysis.ts` — `mustPickup()`
- `supabase/migrations/014_shop_brand.sql` — jak dodawano kolumnę filtra
- `supabase/baseline/README.md`, `docs/tasks/HA-2.02.md` (notatka o segfaulcie lokalnego Postgresa)
- `supabase/seed.sql`, `tests/shop/api.spec.ts` (wzorzec testu bez UI)
- `docs/deferred-tasks.md` — wpis 2026-09-30 o cache'owaniu pustego wyniku

## Notatki z realizacji
- 2026-10-24 tj (wf-plan): D1 = A — `pickup_only` jako kolumna GENERATED (sync nie zapisuje `product_type`, więc kolumna liczona w syncu odpadła). Reguła „tylko odbiór” zostaje w dwóch językach (TS + SQL), spójność pilnuje test porównawczy.
- 2026-10-24 tj (wf-plan): `revalidateTag(SHOP_CACHE_TAG)` po płatności już jest w `markOrderPaid.ts` — nic do zrobienia.
- 2026-10-24 tj: liczniki wg B — każdy licznik liczony ze wszystkimi pozostałymi filtrami (dziś specs ignorują markę i dostawę, brands ignorują specs); HA-2.35 ma to w kryteriach jako świadomą zmianę, nie regres.
- 2026-10-24 tj: STOP 1 — sygnatury `shop_listing(bigint[],text,boolean,numeric,numeric,text,text,jsonb,text,integer)` i `shop_tree()` zatwierdzone w wersji pokazanej (bez DEFAULT-ów; `p_q` przycięte, `%`/`_` dosłownie; nieznane `p_sort` → `name_asc`; `p_page` NULL/< 1 → 1). STOP 2 — kolumna `pickup_only` zatwierdzona w wersji pokazanej (4 kolumny źródłowe NOT NULL lokalnie i na prod).
- 2026-10-24 tj: 286 ms = zimny start; funkcja w sesji 74/42 ms, ciało 47 ms (temp 908), wąska wersja 28 ms bez temp → 020 w tym PR (wariant A), bez D i bez work_mem
