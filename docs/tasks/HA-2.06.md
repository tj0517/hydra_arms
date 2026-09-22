---
id: HA-2.06
title: Compliance — wymuszony odbiór osobisty dla kategorii 01/02 i potwierdzenie 18+
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-1.06]
blocked_by_questions: [O-11]
touches_db: true
touches_prod: true
pr: null
---

## Cel
Sklep sprzedaje asortyment dual-use. Dziś chroni go tylko `product_type` (odbiór osobisty dla `age_restricted`/`pickup_only`). Drzewo kategorii mówi, że całe 01 (broń palna, w tym 1.5 alarmowa i sygnałowa) i 02 (amunicja, w tym 2.5 hukowa) to odbiór osobisty w salonie w Krakowie. Weryfikacja wieku i uprawnień odbywa się tylko przy odbiorze, a mObywatel dojdzie później (O-12). Sukces: produkty z tych kategorii zawsze wymuszają odbiór osobisty, niezależnie od tego, jak import ustawił `product_type`. Klient przy takim zamówieniu widzi i potwierdza, że wiek i uprawnienia zostaną sprawdzone przy odbiorze. Reguł nie da się obejść żądaniem do API. Pozostałe przypadki graniczne (FAC >17 J, paralizatory, noże OTF) wchodzą według O-11.

## Zakres
- [ ] odczyt stanu bieżącego: `cartAnalysis.ts`, walidacja w `checkout/route.ts`, pola `product_type`, `delivery_allowed`, jak import ustawia te pola, odpowiedzi O-11/O-12
- [ ] reguła: kategorie 01 i 02 (z podkategoriami) → odbiór osobisty, egzekwowana w checkoucie i w RPC, niezależnie od `product_type`
- [ ] przypadki graniczne z O-11 (FAC >17 J, paralizatory, noże OTF) według odpowiedzi
- [ ] potwierdzenie klienta przy zamówieniu z odbiorem osobistym: „wiek/uprawnienia sprawdzane przy odbiorze”, zapisane w zamówieniu (audyt)

## Gotowe, gdy
- red proof: żądanie API z wysyłką kurierem dla produktu z kategorii 01/02 oznaczonego jako `standard` → odrzucone, bez zamówienia w bazie — **jak sprawdzić:** test API na lokalnej bazie
- red proof: zamówienie z odbiorem osobistym bez potwierdzenia → odrzucone — **jak sprawdzić:** test API
- zamówienie z potwierdzeniem ma je zapisane — **jak sprawdzić:** wklejony SELECT
- istniejące reguły odbioru osobistego działają — **jak sprawdzić:** istniejące testy przechodzą

## Poza zakresem
- ręczne prowadzenie kategorii koncesjonowanych (broń palna, amunicja) poza feedami → proces klienta, O-11
- weryfikacja przez mObywatel → odłożone (O-12)

## Bramki STOP
- każda zmiana reguł `product_type` lub tras fulfillmentu — decyzja tj przed implementacją
- przed wdrożeniem migracji na prod — akceptacja
- przed ukryciem produktów na prod — lista i akceptacja

## Kontekst
- `src/lib/shop/cartAnalysis.ts`, `src/app/api/shop/checkout/route.ts`, `supabase/migrations/003_pickup_route.sql`, `007_fulfillment_routes.sql`
- `xml-integration/hydra-category-tree.txt` — kategorie 01/02 z adnotacją odbioru osobistego
- `xml-integration/NOTATKI-rozmowa-klient-2026-06-19.md` (compliance, pola zablokowane)
- project.md → `security.rules` (product_type)

## Notatki z realizacji
- 2026-09-22 tj: weryfikacja tylko przy odbiorze, mObywatel w przyszłości (O-12)
