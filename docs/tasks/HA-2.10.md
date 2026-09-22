---
id: HA-2.10
title: Filtry katalogu dla podkategorii P1
status: todo
difficulty: L
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.04]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: null
---

## Cel
Sklep ma dziś filtry kategorii, wyszukiwarki, dostępności i przedziału ceny (`SklepClient.tsx`). Analiza popularności kategorii (arkusz tj, 2026-09-15, `docs/research/`) proponuje taksonomię z priorytetami P1–P3 i filtrami: uniwersalnymi (marka, cena, dostępność, wysyłka lub odbiór) oraz kluczowymi dla każdej kategorii (np. kaliber, platforma, średnica tubusu). Sukces: dla podkategorii P1, zmapowanych na drzewo 15 działów Hydry, klient filtruje po marce, sposobie dostawy i po kluczowych parametrach tam, gdzie feedy te dane dają. Raport mówi uczciwie, gdzie danych brakuje.

## Zakres
- [ ] odczyt stanu bieżącego: filtry w `SklepClient.tsx` i `src/lib/shop/categoryFilter.ts`, jakie pola produktu mamy w `shop_products` (marka/producent, parametry), co dają feedy (Sharg gateway: parametry; Kolba, Spechurt: sprawdź `xml-integration/SCHEMAS.md`), arkusz „Podkategorie i filtry” (P1 = 175 wierszy)
- [ ] mapowanie P1 (35 kategorii znormalizowanych) → drzewo 15 działów Hydry, zapisane w repo (`docs/research/taksonomia-p1.md` lub JSON obok `category-map.json`); wiersze bez odpowiednika wypisane
- [ ] filtry uniwersalne: marka, wysyłka / tylko odbiór osobisty (z `mustPickup`); dane marki z BL/feedów (kolumna + sync, migracja, jeśli potrzebna)
- [ ] filtry kluczowe per dział tylko tam, gdzie pokrycie danymi ≥ próg ustalony z tj (w raporcie tabela: dział → filtr → % produktów z wartością)
- [ ] filtry w URL (spójnie z obecnymi), działają z `PUBLIC_PRODUCT_COLUMNS`

## Gotowe, gdy
- mapowanie P1 → działy istnieje i obejmuje wszystkie 175 wierszy P1 (zmapowane albo jawnie „brak odpowiednika”) — **jak sprawdzić:** liczba wierszy w pliku + lista braków w raporcie
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

## Kontekst
- `docs/research/analiza_popularnosci_kategorii.xlsx` (arkusze „Podkategorie i filtry”, „Ranking kategorii”)
- `xml-integration/hydra-category-tree.txt`, `xml-integration/category-map.json`, `xml-integration/SCHEMAS.md`
- `src/components/shop/SklepClient.tsx`, `src/lib/shop/categoryFilter.ts`, `src/lib/shop/fetchProducts.ts` (`PUBLIC_PRODUCT_COLUMNS`)

## Notatki z realizacji
- 2026-09-22 tj: filtry dla podkategorii P1 jako zadanie etapu 2 (analiza z 2026-09-15)
