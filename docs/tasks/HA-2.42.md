---
id: HA-2.42
title: Warianty C2 — sklep: jedna karta na grupę wariantów („od X zł”), wybór wariantu na stronie produktu, bezpiecznik dla grup mieszanych
status: todo
difficulty: L
model: claude-opus-5-5
model_approved: null
effort: high
branch: null
due: null
depends_on: [HA-2.40]
blocked_by_questions: []
touches_db: true
touches_prod: false
pr: null
---

## Cel
Po HA-2.40 i HA-2.41 produkty BL niosą pola „Grupa wariantów” i „Wariant”. Sklep o nich nie wie: każdy rozmiar to osobna karta na liście.

Sukces:
- listing zwija grupę do jednej karty z ceną „od X zł” i łącznym stanem;
- strona produktu pokazuje wybór wariantu, a URL wskazuje konkretny wariant;
- koszyk i zamówienie zawsze dotyczą konkretnego produktu.

Grupa, której produkty różnią się pozwoleniem, odbiorem osobistym albo 18+, nie jest grupowana.

## Zakres
- [ ] odczyt stanu: `src/app/api/shop/sync/route.ts` (mapowanie BL → `shop_products`, jak czytane są `text_fields`), `supabase/migrations/019_shop_listing.sql` / `020_shop_listing_narrow.sql` (`shop_listing`, `shop_tree`, `pickup_only`), `src/lib/shop/listing.ts`, `src/app/(main)/sklep/page.tsx` i `[id]`, `permitFlags.ts`, `cartAnalysis.ts`, karta produktu (HA-2.31)
- [ ] migracja `021`: kolumny `variant_group` i `variant_label` w `shop_products` (+ indeks), bez zmian RLS i `PUBLIC_PRODUCT_COLUMNS` poza dodaniem tych dwóch pól (STOP: diff względem baseline)
- [ ] sync BL → Supabase przenosi pola dodatkowe (ID z env, rejestr HA-2.16). Bezpiecznik w syncu: grupa, w której produkty różnią się `requires_license`, `pickup_only`, `age_min` albo działem 01/02, dostaje `variant_group = null` dla wszystkich swoich produktów (osobne karty) i ostrzeżenie w logu z nazwą grupy i ID produktów
- [ ] `shop_listing`: jedna pozycja na grupę wśród produktów aktywnych spełniających filtry:
  - karta = reprezentant grupy (najtańszy dostępny);
  - `price_from` = min ceny, `stock_total` = suma stanów, `variant_count`;
  - produkt bez grupy jak dziś.
  
  Liczniki facet (kategorie, marki, odbiór) liczą karty, czyli grupy — to widzi klient (decyzja tj 2026-10-26). Wyszukiwarka i paginacja na kartach
- [ ] karta produktu: „od X zł”, gdy grupa ma różne ceny; liczba wariantów; link do reprezentanta
- [ ] strona grupy (decyzja tj 2026-10-26): grupa ma jedną stronę pod stałym adresem, a wybrany wariant jest parametrem tej strony (np. `?wariant=<id produktu>`); canonical = strona grupy bez parametru. Adres grupy nie może zależeć od cen ani stanów — reprezentant „najtańszy dostępny” służy tylko karcie na liście. Dokładną postać adresu ustala zadanie. `/sklep/<id>` produktu z grupy prowadzi na stronę grupy z tym wariantem. Wybór wariantu z rodzeństwa grupy: etykiety „Wariant”, niedostępne wyszarzone. Cena, stan, EAN, dostępność dostawy i tagi pozwolenie/18+ zawsze wybranego produktu
- [ ] koszyk / checkout / zamówienie BL bez zmian modelu (`product_id` konkretnego wariantu); nazwa w koszyku z etykietą wariantu
- [ ] seed lokalny (`supabase/seed.sql`) + fixtures mocka BL: grupa 3 wariantów, grupa mieszana (pozwolenie / bez), produkt bez grupy
- [ ] testy Playwright (`tests/shop/`, lokalny stack)

## Gotowe, gdy
- listing: grupa 3 wariantów → jedna karta „od <min> zł”, stan = suma; produkt bez grupy bez zmian — **jak sprawdzić:** test Playwright + test SQL `shop_listing` na lokalnym stacku
- red proof bezpiecznika: grupa mieszająca pozwolenie (albo odbiór / 18+) → osobne karty, w logu syncu ostrzeżenie; po usunięciu bezpiecznika test pada (jedna karta) — **jak sprawdzić:** test syncu z mockiem BL + Playwright
- strona grupy: wybór wariantu zmienia parametr w URL, cena i stan zmieniają się, wariantu bez stanu nie da się dodać do koszyka; canonical = strona grupy bez parametru; `/sklep/<id>` wariantu otwiera stronę grupy z tym wariantem — **jak sprawdzić:** test Playwright
- koszyk i zamówienie zawierają `product_id` wybranego wariantu, payload BL na konkretny produkt — **jak sprawdzić:** test checkoutu na lokalnym stacku (mock BL)
- filtry (facety), wyszukiwarka i paginacja liczą karty (grupy), nie produkty — **jak sprawdzić:** test Playwright
- migracja: `npm run db:reset` czysto, diff migracji pokazany przed zatwierdzeniem; `npx tsc --noEmit`, `npm run lint`, `npm run test:shop:local` zielone — **jak sprawdzić:** wklejone podsumowania

## Poza zakresem
- import rozmiarów do BL → HA-2.40; kandydaci z osobnych produktów → HA-2.41
- prawdziwe warianty BL (`parent_id`)
- migracja na prod — `supabase db push` przez tj po merge'u
- zmiany w checkoucie poza nazwą pozycji (model zamówienia bez zmian)

## Bramki STOP
- migracja `021` — diff względem baseline i akceptacja przed zastosowaniem (lokalnie), na prod tylko tj
- testy tylko na lokalnym stacku (`SUPABASE_TARGET=local`)

## Kontekst
- `src/app/api/shop/sync/route.ts`, `supabase/migrations/019_shop_listing.sql`, `020_shop_listing_narrow.sql`, `src/lib/shop/listing.ts`, `src/app/(main)/sklep/`, `src/lib/shop/permitFlags.ts`, `src/lib/shop/cartAnalysis.ts`, `src/lib/shop/shopCache.ts`
- `docs/tasks/HA-2.34.md`, `HA-2.35.md` (listing w Postgresie), `HA-2.31.md` (karta produktu), `HA-2.40.md`, `HA-2.41.md`

## Notatki z realizacji
- 2026-10-26 tj: facety liczą karty (grupy); wariant jako parametr na stronie grupy, canonical = strona grupy.
- 2026-10-26 tj (plan po audycie HA-2.37): zamówienie i BL zawsze na konkretny produkt; grupa mieszająca pozwolenie / odbiór / 18+ nie jest grupowana. Dane do testów na prod pojawią się po HA-2.40.
