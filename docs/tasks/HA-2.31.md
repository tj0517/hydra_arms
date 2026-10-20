---
id: HA-2.31
title: Karta produktu — packshot w całości, jedno CTA, cena przekreślona, linia stanu i dostawy, tagi pozwolenie/18+
status: in_progress
difficulty: M
model: claude-fable-5-1
model_approved: null
effort: null
branch: feat/ha-2.31-product-card
due: null
depends_on: [HA-2.30]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Karta produktu na listingu i w „powiązanych” na PDP ma dziś dwa równorzędne przyciski (`[ SZCZEGÓŁY ]` i ikona koszyka), packshot przycinany `object-cover`, dokładny stan magazynowy „W MAGAZYNIE · 1 SZT.”, brak ceny przekreślonej i badge `[ ODBIÓR ]`/`18+` bez wyjaśnienia. Sukces: karta czytelna jak w standardowym sklepie — cały packshot na jasnym tle, nazwa i cena w hierarchii, przekreślona cena katalogowa gdy jest, jedna linia „Dostępny · wysyłka kurierem” / „Tylko odbiór osobisty w Krakowie” / „Niedostępny”, jeden główny przycisk „Do koszyka”, klik w kartę = szczegóły, tagi „Wymaga pozwolenia” / „18+” jako czytelne etykiety.

## Zakres
- [ ] odczyt stanu bieżącego: `src/components/shop/ProductCard.tsx`, użycia w `SklepClient` i `ProductDetailClient` (powiązane), `src/lib/shop/cartAnalysis.ts` (`mustPickup`), pola `price_compare`, `product_type`, `requires_license`, `age_min`, `delivery_allowed`, `badge`, `availability_status` w `PUBLIC_PRODUCT_COLUMNS`; `tests/shop/cart.spec.ts` (dodawanie z karty), `product-detail.spec.ts`, `pickup-compliance.spec.ts`; `supabase/seed.sql` (czy jest produkt z `price_compare`)
- [ ] obraz: kontener 1:1, `object-contain`, jasne tło pod packshotem (packshoty hurtowni są na białym), placeholder bez zdjęcia neutralny (koniec z losowym `/img/service-0N.jpg`)
- [ ] treść: etykieta kategorii przez `categoryDisplayName` (HA-2.30); nazwa 2 linie; cena bieżąca wyróżniona + `price_compare` przekreślona, gdy wyższa; jedna linia stanu/dostawy wyliczana z `stock` i `mustPickup` (bez dokładnej liczby sztuk; „Ostatnie sztuki” przy stanie ≤ 3)
- [ ] akcje: cała karta linkiem do PDP; jeden przycisk „Do koszyka” pełną szerokością (stany: dodano / niedostępny / limit koszyka); przycisk „Szczegóły” znika
- [ ] tagi: „Wymaga pozwolenia” (gdy `requires_license`), „18+” (gdy `age_min` ≥ 18), „Odbiór osobisty” (gdy `mustPickup` bez powyższych) — pełne słowa, bez nawiasów kwadratowych
- [ ] seed: jeśli brak, jeden produkt z `price_compare > price` (same dane, bez zmiany schematu)
- [ ] aktualizacja selektorów w `cart.spec.ts` / `listing.spec.ts` / `product-detail.spec.ts` bez osłabiania asercji

## Gotowe, gdy
- karta nie ma przycisku „Szczegóły”, ma jeden przycisk „Do koszyka”, a klik w obraz lub nazwę prowadzi na `/sklep/<id>` — **jak sprawdzić:** `grep -c "SZCZEGÓŁY" src/components/shop/ProductCard.tsx` = 0; test `cart.spec.ts` „adding from listing card puts item in cart” zielony; test nawigacji z karty
- packshot renderowany w całości: w `ProductCard.tsx` brak `object-cover`, obraz w kontenerze 1:1 — **jak sprawdzić:** `grep -n "object-" src/components/shop/ProductCard.tsx`; zrzut gridu z co najmniej 6 kartami
- cena przekreślona pokazuje się tylko, gdy `price_compare > price` — **jak sprawdzić:** test Playwright na produkcie z seedu z `price_compare` + red proof: produkt z `price_compare ≤ price` → brak przekreślenia
- linia stanu: produkt wysyłkowy → „Dostępny · wysyłka kurierem”, `mustPickup` → „Tylko odbiór osobisty w Krakowie”, `stock = 0` → „Niedostępny”; nigdzie na karcie nie ma dokładnej liczby sztuk — **jak sprawdzić:** `grep -n "SZT" src/components/shop/ProductCard.tsx` = 0; test na produkcie `pickup_only` z seedu
- tagi „Wymaga pozwolenia” / „18+” widoczne na karcie produktu z flagą — **jak sprawdzić:** test na produkcie `age_restricted` z seedu; `grep -nE '\[ [A-ZĄĆĘŁŃÓŚŹŻ ]+ \]' src/components/shop/ProductCard.tsx` = 0

## Poza zakresem
- panel zakupu na PDP (blok zaufania: koszt/czas dostawy, odbiór, zwroty) → osobne zadanie S po cenniku od klienta (O-10)
- zmiana reguł `product_type` / `mustPickup` → bramka STOP projektu, nie tu
- szybki podgląd (quick view) w modalu → nie planujemy
- zdjęcia produktów bez packshotu (jakość feedów) → dane, nie UI

## Bramki STOP
- STOP 1 — po pierwszej wersji karty: zrzut gridu desktop + mobile i propozycja treści linii stanu do akceptacji tj, przed poprawką testów

## Kontekst
- `src/components/shop/ProductCard.tsx` — komponent
- `src/lib/shop/cartAnalysis.ts` — `mustPickup`, jedyne źródło reguły odbioru
- `src/lib/shop/categoryLabel.ts` — etykiety z HA-2.30
- `src/lib/shop/fetchProducts.ts` — `PUBLIC_PRODUCT_COLUMNS` (dostępne pola; nic więcej nie wolno czytać)
- `tests/shop/cart.spec.ts`, `listing.spec.ts`, `product-detail.spec.ts`, `pickup-compliance.spec.ts`, `supabase/seed.sql`

## Notatki z realizacji
- 2026-10-19 tj (wf-plan): zadanie wydzielone z pakietu UI listingu; zależy od HA-2.30 (wspólne etykiety kategorii i tokeny typografii).
- 2026-10-20 agent: sesja na Fable 5.1 (claude-fable-5-1). Preflight OK (SUPABASE_TARGET=local, hook, HA-2.30 na origin/main). Brak Playwright MCP na WSL — zrzuty z page.screenshot() w tests/shop/product-card.spec.ts do .playwright-mcp/ha-2.31-*.png.
- 2026-10-20 tj: STOP 1 zaakceptowany. D1 — linia stanu dokładnie wg tabeli (5 wariantów): „Niedostępny” / „Tylko odbiór osobisty w Krakowie” / „Ostatnie sztuki · tylko odbiór osobisty w Krakowie” / „Dostępny · wysyłka kurierem” / „Ostatnie sztuki · wysyłka kurierem”; etykiety przycisku „Do koszyka” / „Dodano do koszyka” / „Limit w koszyku” przyjęte.
- 2026-10-20 tj: D2 — produkt ze stanem 0 trafia do seeda (same dane, bez zmiany schematu); służy testowi „Niedostępny” i red proof 2; jeśli odblokowuje odłożony test cart.spec.ts:52, włączyć go i odnotować w raporcie, nie szerzej.
- 2026-10-20 tj: D3 — karta mówi „wysyłka kurierem” dla produktów sekcji 01/02, a checkout odmawia kuriera przez hydra_section(); mustPickup() NIE zmieniać w tym zadaniu; wpis w docs/deferred-tasks.md jako bloker HA-2.09 (osobne zadanie S: jedno źródło prawdy).
- 2026-10-20 tj: D4 — seed dostaje jeden produkt z images wskazującym na lokalny plik pod public/ (białe tło, bez zewnętrznych URL), zrzut karty desktop + mobile w dowodach. Znana luka: sekcje sklepu z Sanity (product picker) nierenderowalne lokalnie — w raporcie jako niezweryfikowane lokalnie.
