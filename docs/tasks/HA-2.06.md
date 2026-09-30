---
id: HA-2.06
title: Compliance — odbiór osobisty dla produktów z pozwoleniem lub 18+
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-1.06]
blocked_by_questions: [O-26]
touches_db: true
touches_prod: true
pr: null
---

## Cel
Sklep sprzedaje asortyment dual-use. Dziś chroni go tylko `product_type` (odbiór osobisty dla `age_restricted`/`pickup_only`). Reguła (O-11, grupy do potwierdzenia w O-26): produkt, który wymaga pozwolenia albo ma ograniczenie 18+, idzie tylko odbiorem osobistym w salonie. Sklep nie ma bramki 18+ online, więc produkty z samą rejestracją (np. wiatrówki >17 J) i z samym 18+ (BAS ≤6 mm, gazy, paralizatory ≤10 mA, wiatrówki ≤17 J) też idą odbiorem. Kurierem idzie tylko to, co nie wymaga ani pozwolenia, ani 18+. Informację „wymaga pozwolenia” niesie flaga produktu ustawiana przy imporcie do BaseLinkera; dla pozycji „+/-” (paralizatory, zamki/BCG, zestawy konwersyjne, broń rozdzielnego ładowania, tłumiki) decyduje konkretny produkt. Sukces: sklep wymusza odbiór osobisty na podstawie flagi pozwolenia i 18+, a kategorie 01/02 zawsze, nawet gdy flagi brak. Klient przy takim zamówieniu potwierdza, że wiek i uprawnienia zostaną sprawdzone przy odbiorze. Reguł nie da się obejść żądaniem do API.

## Zakres
- [ ] odczyt stanu bieżącego: `cartAnalysis.ts`, walidacja w `checkout/route.ts`, pola `product_type`, `delivery_allowed`, jak `xml-to-baselinker.ts` i `/api/shop/sync` przenoszą te pola z BaseLinkera do Supabase, O-11/O-26
- [ ] flaga „wymaga pozwolenia” na produkcie: pole w BaseLinkerze ustawiane przy imporcie, przenoszone do Supabase przez sync
- [ ] import ustawia flagę wg grup z O-26: grupa A (pozwolenie) na podstawie kategorii; grupa C („+/-”) per produkt tam, gdzie da się to wykryć z feedu (np. natężenie paralizatora, energia >17 J), w pozostałych przypadkach tag `review` do ręcznej decyzji w BaseLinkerze
- [ ] reguła w checkoucie i w RPC: flaga pozwolenia LUB 18+ LUB kategoria 01/02 → tylko odbiór osobisty, niezależnie od `product_type`
- [ ] potwierdzenie klienta przy zamówieniu z odbiorem osobistym: „wiek/uprawnienia sprawdzane przy odbiorze”, zapisane w zamówieniu (audyt)

## Gotowe, gdy
- red proof: żądanie API z wysyłką kurierem dla produktu z flagą pozwolenia oznaczonego jako `standard` → odrzucone, bez zamówienia w bazie — **jak sprawdzić:** test API na lokalnej bazie
- red proof: żądanie API z wysyłką kurierem dla produktu 18+ bez flagi pozwolenia → odrzucone — **jak sprawdzić:** test API
- red proof: produkt z kategorii 01/02 bez flagi pozwolenia, wysyłka kurierem → odrzucone — **jak sprawdzić:** test API
- produkt bez pozwolenia i bez 18+ przechodzi z wysyłką kurierem — **jak sprawdzić:** test API
- red proof: zamówienie z odbiorem osobistym bez potwierdzenia → odrzucone — **jak sprawdzić:** test API
- zamówienie z potwierdzeniem ma je zapisane — **jak sprawdzić:** wklejony SELECT
- import ustawia flagę dla próbki produktów z grup A i C, a nierozstrzygnięte z C mają tag `review` — **jak sprawdzić:** tabela próbki (produkt, kategoria, flaga, tag) z dry-runu importu
- istniejące reguły odbioru osobistego działają — **jak sprawdzić:** istniejące testy przechodzą

## Poza zakresem
- ręczne prowadzenie kategorii koncesjonowanych (broń palna, amunicja) poza feedami → proces klienta
- bramka 18+ online / mObywatel → odłożone (O-12); po jej wdrożeniu produkty z samym 18+ lub rejestracją mogą przejść na kuriera
- przywrócenie broni czarnoprochowej w `assortment-rules.ts` → osobno, po O-21

## Bramki STOP
- nazwa i typ pola flagi w BaseLinkerze (pole dodatkowe / parametr / tag) — decyzja tj przed implementacją; konto BL klienta jeszcze niedostępne
- każda zmiana reguł `product_type` lub tras fulfillmentu — decyzja tj przed implementacją
- przed wdrożeniem migracji na prod — akceptacja
- przed ukryciem produktów na prod — lista i akceptacja

## Kontekst
- `src/lib/shop/cartAnalysis.ts`, `src/app/api/shop/checkout/route.ts`, `supabase/migrations/003_pickup_route.sql`, `007_fulfillment_routes.sql`
- `xml-integration/hydra-category-tree.txt` — kategorie 01/02 z adnotacją odbioru osobistego
- `docs/research/analiza_popularnosci_kategorii_korekta.xlsx`, arkusz „Podkategorie - korekta” — kolumny „Wymaga pozwolenia” / „Wymaga rejestracji” (klient, 2026-09-29)
- `docs/04-open-questions.md` → O-11 (reguła), O-26 (grupy A–D do potwierdzenia), O-22 (BAS)
- `scripts/xml-to-baselinker.ts` — import do BaseLinkera, tu powstaje flaga
- `xml-integration/NOTATKI-rozmowa-klient-2026-06-19.md` (compliance, pola zablokowane)
- project.md → `security.rules` (product_type)

## Notatki z realizacji
- 2026-09-22 tj: weryfikacja tylko przy odbiorze, mObywatel w przyszłości (O-12)
- 2026-09-30 tj: zakres przepisany pod regułę z O-11/O-26: pozwolenie lub 18+ → odbiór osobisty (brak bramki 18+ online). Flagę „wymaga pozwolenia” ustawiamy przy imporcie do BaseLinkera. Potwierdzenie grup przez klienta (O-26) może zmienić tylko przypisanie kategorii, nie mechanizm.
