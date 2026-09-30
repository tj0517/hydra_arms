---
id: HA-2.10
title: Filtry katalogu dla podkategorii P1
status: review
difficulty: L
model: claude-sonnet-5
model_approved: null
effort: medium
branch: feat/ha-2.10-p1-filters
due: null
depends_on: [HA-2.04]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: 25
---

## Cel
Sklep ma dziś filtry kategorii, wyszukiwarki, dostępności i przedziału ceny (`SklepClient.tsx`). Analiza popularności kategorii (arkusz tj, 2026-09-15, `docs/research/`) proponuje taksonomię z priorytetami P1–P3 i filtrami: uniwersalnymi (marka, cena, dostępność, wysyłka lub odbiór) oraz kluczowymi dla każdej kategorii (np. kaliber, platforma, średnica tubusu). Sukces: dla podkategorii P1, zmapowanych na drzewo 15 działów Hydry, klient filtruje po marce, sposobie dostawy i po kluczowych parametrach tam, gdzie feedy te dane dają. Raport mówi uczciwie, gdzie danych brakuje.

## Zakres
- [x] odczyt stanu bieżącego: filtry w `SklepClient.tsx` i `src/lib/shop/categoryFilter.ts`, jakie pola produktu mamy w `shop_products` (marka/producent, parametry), co dają feedy (Sharg gateway: parametry; Kolba, Spechurt: sprawdź `xml-integration/SCHEMAS.md`), arkusz „Podkategorie i filtry” (P1 = 175 wierszy)
- [x] korzysta z mapowania P1 → drzewo 01–15 z HA-2.04 (nie tworzy własnego)
- [x] filtry uniwersalne: marka, wysyłka / tylko odbiór osobisty (z `mustPickup`); dane marki z BL/feedów (kolumna + sync, migracja, jeśli potrzebna)
- [x] filtry kluczowe per dział — **odłożone w całości** (decyzja tj 2026-09-30): pokrycie danymi ~0% w każdym dziale w zakresie, tabela w raporcie; wraca po realnym imporcie BL
- [x] filtry w URL (spójnie z obecnymi), działają z `PUBLIC_PRODUCT_COLUMNS` — dotyczy wdrożonych filtrów uniwersalnych (`marka`, `dostawa`)

## Gotowe, gdy
- filtr marki i filtr „wysyłka / tylko odbiór” działają na lokalnej bazie z seedem — **jak sprawdzić:** test e2e + zrzuty z Playwright MCP
- tabela pokrycia danymi dla każdego proponowanego filtra kluczowego — **jak sprawdzić:** tabela w raporcie z liczbami z zapytania na lokalnej bazie po imporcie próbki
- klient nie dostaje nowych kolumn spoza listy publicznych (np. `price_purchase`) — **jak sprawdzić:** `git diff main -- 'src/**' | grep -n "select('\*')"` pusto; nowe pola dopisane jawnie do `PUBLIC_PRODUCT_COLUMNS`

## Poza zakresem
- podkategorie P2/P3 → później
- ręczne uzupełnianie parametrów produktów w BL → proces klienta
- zmiana drzewa kategorii → decyzja klienta

## Bramki STOP
- przed wdrożeniem migracji (nowe kolumny) na prod — akceptacja tj
- przed pełnym syncem z BL, który zapisze nowe pola na prod — akceptacja tj
- wybór progu pokrycia danymi dla filtrów kluczowych — decyzja tj (pokaż tabelę)

## Kolejność wdrożenia (WYMAGANA — merge do main wdraża)
Prod nie ma dziś kolumny `brand`; zwykły merge zepsułby `/sklep` (zapytanie `select`
z nieistniejącą kolumną → `fetchShopData` zwraca pustą listę produktów) i nocny
cron `/api/shop/sync` (upsert z nieistniejącym polem). Kolejność:
1. migracja `014_shop_brand.sql` wdrożona na prod — **akceptacja tj**
2. weryfikacja przez zapytanie read-only (`select column_name from information_schema.columns where table_name='shop_products' and column_name='brand'` przez `supabase-prod`)
3. dopiero wtedy merge tego PR do `main`

## Kontekst
- `docs/research/analiza_popularnosci_kategorii.xlsx` (arkusze „Podkategorie i filtry”, „Ranking kategorii”)
- `xml-integration/hydra-category-tree.txt`, `xml-integration/category-map.json`, `xml-integration/SCHEMAS.md`
- `src/components/shop/SklepClient.tsx`, `src/lib/shop/categoryFilter.ts`, `src/lib/shop/fetchProducts.ts` (`PUBLIC_PRODUCT_COLUMNS`)

## Notatki z realizacji
- 2026-09-22 tj: filtry dla podkategorii P1 jako zadanie etapu 2 (analiza z 2026-09-15)
- 2026-09-24 tj: mapowanie P1 → 01–15 przeniesione do HA-2.04
- 2026-09-30: PR #25 — filtry uniwersalne (marka, dostawa) gotowe i przetestowane lokalnie; filtry kluczowe i próg pokrycia czekają na decyzję tj (patrz raport w sesji) i O-22
- 2026-09-30 tj: filtry kluczowe odłożone w całości — pokrycie danymi ~0% we wszystkich działach w zakresie (prod i próbki feedów), nie ma czego filtrować; wrócić po realnym imporcie BL, który wypełni `features`/`brand` dla tych działów. Próg liczbowy niepotrzebny na razie.
- 2026-09-30 tj: review rundy 1 (PR #25) — zaakceptowane z poprawkami: kolejność wdrożenia (migracja na prod → weryfikacja → merge, patrz sekcja wyżej), log błędu zapytania produktów zamiast cichego połykania, `brand` na stronie produktu (regresja — sync usuwa „Marka"/„Producent" z `features`, a `ProductDetailClient.tsx` nie renderował `brand`), higiena `INDEX.md`/frontmatter. Runda 2 w toku na tym samym branchu.
