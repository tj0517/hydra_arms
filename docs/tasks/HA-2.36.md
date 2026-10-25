---
id: HA-2.36
title: Reszta bez pełnej listy — bloki Sanity na małych zapytaniach, picker z ?q= i ?ids=, sitemap pętlą, usunięcie fetchShopData
status: review
difficulty: M
model: claude-opus-5-5
model_approved: null
effort: null
branch: feat/ha-2.36-no-full-catalogue
due: null
depends_on: [HA-2.35]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Po HA-2.35 `/sklep` nie potrzebuje pełnej listy, ale nadal potrzebują jej trzy miejsca: bloki produktowe strony sklepu z Sanity (`resolveProductsForBlock`), picker produktów w Studio (`/api/shop/products-list` zwraca cały katalog) i `sitemap` (limit 500). To zadanie przepina je na małe, celowane zapytania i usuwa `fetchShopData`. Sukces: żaden kod nie ładuje całego katalogu, picker w Studio działa przez wyszukiwanie, sitemap wymienia każdy aktywny produkt.

## Zakres
- [ ] odczyt stanu bieżącego: `grep -rn fetchShopData src` (wszyscy importerzy), `src/app/(main)/sklep/page.tsx` (`resolveProductsForBlock`, tryby `new_arrivals|on_sale|manual|best_sellers`), `src/app/api/shop/products-list/route.ts`, `src/sanity/components/ProductPickerInput.tsx` (jeden `fetch` całej listy, filtrowanie w komponencie), `src/app/sitemap.ts` (limit 500), `src/sanity/schemas/shop/shopProductPickerBlock.ts`
- [ ] `src/lib/shop/shopCache.ts` (nowy): `SHOP_CACHE_TAG` i `PUBLIC_PRODUCT_COLUMNS` przeniesione z `fetchProducts.ts`; importy w `sync/route.ts`, `markOrderPaid.ts`, `sklep/[id]/page.tsx`, `api/shop/products/route.ts`, `listing.ts` poprawione
- [ ] `src/lib/shop/productBlocks.ts` (nowy): po jednym zapytaniu na blok, klient publiczny, `PUBLIC_PRODUCT_COLUMNS`, `is_active`, z obrazem (`images IS NOT NULL`), `LIMIT = block.limit ?? 4`: `new_arrivals` → `ORDER BY id DESC`; `on_sale` → `price_compare > price` (fallback na nowości jak dziś); `best_sellers` → `is_featured AND stock > 0` (fallback `stock > 0`); `manual` → `id IN (…)` z zachowaniem kolejności z Studio; całość w `unstable_cache` z `SHOP_CACHE_TAG`
- [ ] `products-list`: `?q=` (min 2 znaki, `.or('name.ilike.%q%,sku.ilike.%q%')` klientem publicznym, jak dziś tylko `is_active`; bez `shop_listing`, bo picker nie potrzebuje liczników ani stanu z rezerwacjami), limit 50; `?ids=1,2,3` → te produkty w podanej kolejności; bez parametrów → 400; odpowiedź jak dziś (`id, name, category, price, inStock`), `Cache-Control` krótszy (60 s)
- [ ] `ProductPickerInput`: pole szukania wywołuje `?q=` z debounce; wybrane produkty dociągane po `?ids=` przy montowaniu; brak pełnej listy w pamięci
- [ ] `sitemap.ts`: pętla `.range()` po `is_active`, tylko `id, updated_at`, krok 1 000, do pustej strony; bez limitu 500
- [ ] usunięcie `fetchShopData` i `getReservedQuantities` (rezerwacje liczy SQL od HA-2.34); `reservedStock.ts` usunięty, jeśli nie ma innych importerów
- [ ] test `tests/shop/api.spec.ts` lub nowy `products-list.spec.ts`: `?q=` zwraca ≤ 50 i trafia po fragmencie; `?ids=` zachowuje kolejność; bez parametrów 400; sitemap zawiera każdy aktywny produkt seedu (> 1 000 z HA-2.35)

## Gotowe, gdy
- `grep -rn "fetchShopData\|getReservedQuantities" src` → 0 trafień — **jak sprawdzić:** wklejony wynik
- bloki produktowe strony sklepu renderują te same tryby co dziś — **jak sprawdzić:** test: dla strony sklepu z seedu Sanity (lub mock `sections`) `new_arrivals` daje najwyższe `id`, `manual` zachowuje kolejność `productIds`, `on_sale` tylko z `price_compare > price`; `grep -n "LIMIT\|\.limit(" src/lib/shop/productBlocks.ts` pokazuje limit z bloku (wklejone)
- picker w Studio działa przez wyszukiwanie — **jak sprawdzić:** test API `?q=` / `?ids=` / 400; zrzut Studio `.playwright-mcp/ha-2.36-picker.png` z wynikami po wpisaniu frazy i z wcześniej wybranymi produktami
- sitemap wymienia każdy aktywny produkt — **jak sprawdzić:** test: liczba `<url>` z `/sklep/` = liczba aktywnych w seedzie (> 1 000); `grep -n "limit(500)" src/app/sitemap.ts` = 0
- `SHOP_CACHE_TAG` nadal rewalidowany po syncu i po płatności — **jak sprawdzić:** `grep -rn "revalidateTag(SHOP_CACHE_TAG" src` pokazuje `sync/route.ts` i `markOrderPaid.ts` (wklejone)
- `npm run build` i `npm run test:shop` zielone (flaky z deferred wymienione z nazwy)

## Poza zakresem
- picker z produktami nieaktywnymi (dziś tylko `is_active`) → jeśli klient zgłosi
- `/api/shop/products` → bez zmian
- PDP i rezerwacje → osobne zadanie S (deferred z HA-2.35)
- pełny kill-switch sklepu (`SHOP_DISABLED` nie obejmuje sitemap i PDP, deferred 2026-09-30) → HA-2.09

## Bramki STOP
- przed usunięciem `reservedStock.ts` — pokaż `grep -rn getReservedQuantities src scripts tests` (ma być 0 poza plikiem) i czekaj
- zmiany w `src/sanity/schemas/` — nie przewidziane; gdyby były potrzebne, STOP (schemat treści to kontrakt z Sanity)

## Kontekst
- `src/app/(main)/sklep/page.tsx`, `src/components/shop/ShopPageSections.tsx`, `src/sanity/schemas/shop/shopProductPickerBlock.ts`
- `src/app/api/shop/products-list/route.ts`, `src/sanity/components/ProductPickerInput.tsx`
- `src/app/sitemap.ts`
- `src/lib/shop/fetchProducts.ts`, `src/lib/shop/reservedStock.ts`, `src/lib/shop/listing.ts` (HA-2.35)
- `tests/shop/api.spec.ts`

## Notatki z realizacji
- 2026-10-24 tj (wf-plan): trzeci PR planu „listing w bazie” (HA-2.34 → 2.35 → 2.36).
- 2026-10-25 tj (wf-task): D1 = A — block logic split from the cache wrapper, tested by a Playwright spec on the local DB; D2 = A — Studio picker proven by API tests, tj checks /studio on the Vercel preview; D3 = A — getBlockProductPool removed together with fetchShopData; manual mode ignores limit (schema contract).
- 2026-10-25 tj: on_sale = A — one query over the 200 newest products with an image and any `price_compare`, `price_compare > price` filtered in code, fallback to new arrivals; option C (DB function / stored on-sale flag) recorded in deferred. Deleting `reservedStock.ts` approved (grep: 0 hits outside the file). `?ids=` capped at 100 (more → 400). Block spec may modify seed-bulk rows if they're restored in afterAll/finally even when a test fails; the report says whether another spec can read them meanwhile.
