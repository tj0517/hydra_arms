---
id: HA-2.02
title: Koszty i metody dostawy w checkoucie
status: in_progress
difficulty: M
model: claude-opus-5-5
model_approved: null
effort: high
branch: feat/ha-2.02-shipping-methods
due: null
depends_on: [HA-2.01, HA-2.16]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: null
---

## Cel
Checkout nie liczy dostawy, więc kwota zamówienia, a zaraz i płatności P24, jest za niska. Wszystko wysyła Hydra, jedną paczką, bez dropshippingu (O-06). Sukces: klient wybiera metodę dostawy z cennika ustalonego z klientem (O-10), darmowa dostawa działa od progu, a kwota zamówienia w bazie zawiera dostawę policzoną po stronie serwera.

## Zakres
- [ ] odczyt stanu bieżącego: `CheckoutClient.tsx`, `checkout/route.ts`, `cartAnalysis.ts` (trasy `direct_H1/H2`, `consolidated`, `pickup`), stan O-10 (przewoźnicy wg klienta 2026-10-06: DHL, DPD, InPost; cen brak), O-06 rozstrzygnięte: jedna paczka od Hydry
- [ ] konfiguracja cennika w jednym miejscu (tabela `shipping_methods` albo Sanity; wybór opisany w raporcie jako opcja dla tj, jeśli O-10 go nie przesądza)
- [ ] metody DHL, DPD, InPost z cenami wstępnymi i progiem darmowej dostawy jako inputy w rejestrze HA-2.16 (`SHIPPING_PRICE_*`, `FREE_SHIPPING_THRESHOLD`, status `placeholder`, właściciel: klient, pytanie O-10); podmiana cennika to zmiana wartości, nie kodu
- [ ] serwer liczy koszt dostawy z metody (kurier od Hydry / odbiór osobisty = 0); klient nie przesyła kwoty
- [ ] migracja (jeśli potrzebna): `shipping_cost`, `shipping_method` na `orders`; `checkout_create_order` dolicza dostawę
- [ ] UI checkoutu: wybór metody, koszt, suma, próg darmowej dostawy

## Gotowe, gdy
- zamówienie ma `total` = produkty + dostawa zgodnie z cennikiem — **jak sprawdzić:** test na lokalnej bazie dla 3 przypadków (poniżej progu, powyżej progu, odbiór osobisty = 0)
- red proof: podmieniona kwota dostawy w żądaniu klienta jest ignorowana — **jak sprawdzić:** test API z wklejonym wynikiem
- produkty `age_restricted`/`pickup_only` nadal wymuszają odbiór osobisty — **jak sprawdzić:** istniejący test / wklejony wynik
- UI pokazuje koszt i sumę — **jak sprawdzić:** zrzut z Playwright MCP
- `npm run inputs:check` w trybie live wskazuje ceny wysyłek i próg jako placeholdery — **jak sprawdzić:** wklejony wynik

## Poza zakresem
- integracja API kurierów (etykiety, tracking) → osobne zadanie po O-10
- zmiana reguł `product_type` → bramka STOP, nie w tym zadaniu

## Bramki STOP
- przed zmianą tras fulfillmentu lub reguł `product_type` — stop, decyzja tj
- przed napisaniem migracji — diff `checkout_create_order` względem baseline; przed wdrożeniem na prod — akceptacja

## Kontekst
- `src/lib/shop/cartAnalysis.ts`, `supabase/migrations/007_fulfillment_routes.sql`, `src/components/shop/CheckoutClient.tsx`
- `docs/04-open-questions.md` → O-06 (rozstrzygnięte), O-10

## Notatki z realizacji
- 2026-10-06 tj: budujemy na cenach wstępnych (klient poda cennik „na dniach”). Kurier dotyczy tylko koszyków w całości bez pozwolenia, rejestracji i 18+ (grupa D klienta), reguła już w `analyzeCart`.
- 2026-10-16 tj: cennik w zmiennych z rejestru (env); InPost Paczkomat w tym zadaniu (widget + kod automatu w zamówieniu i w BL); wartości wstępne DHL 19,99 / DPD 17,99 / InPost 14,99 / darmowa od 500 zł; model Opus high (zakres urósł o Paczkomat).
- 2026-10-17 tj: STOP 1 — InPost Geowidget zatwierdzony: skrypt i CSS z `geowidget.inpost.pl`, ładowane tylko na `/sklep/zamowienie`, dopiero po wyborze Paczkomatu i tylko przy ustawionym `INPOST_GEOWIDGET_TOKEN`; bez tokenu ręczne pole kodu. Token publiczny (`secret: false`), w rejestrze jako placeholder, właściciel tj. Do O-35 dopisany punkt (g) o InPost w politykach; uwagi o skrypcie bez wersji i o geolokalizacji → deferred.
- 2026-10-17 tj: STOP 2 — migracja 018 zatwierdzona w wersji z draftu, z dodatkowym wymaganiem: red proof, że `anon` i `authenticated` nie mogą wywołać nowej sygnatury `checkout_create_order(...)` (przyjmuje cenę i próg — bezpośrednie wywołanie nie może pozwolić przeglądarce ustawić ceny dostawy); `has_function_privilege` przed/po, czerwono przy celowo brakującym REVOKE; pokazać, że stara sygnatura 6-argumentowa nie istnieje.
- 2026-10-17 tj: D1 — A: próg darmowej dostawy liczony tylko od towarów wysyłanych (noga wysyłkowa).
- 2026-10-17 tj: D2 — A: tylko Paczkomaty (bez PaczkoPunktów), ścisły wzorzec kodu.
- 2026-10-17 tj: D3 — B: przy Paczkomacie adres domowy i telefon zostają wymagane. Telefon wymagany dla każdej metody wysyłkowej (SMS InPost); adres wymagany jak dziś.
- 2026-10-17 tj: D4 — A: fail closed — brak metody/ceny blokuje checkout; prod nie przyjmuje jeszcze prawdziwych zamówień.
- 2026-10-17 tj: strona statusu dla gościa pokazuje metodę i koszt, bez kodu automatu; dowolny wybór odbioru osobistego dla koszyków wysyłkowych → deferred.
