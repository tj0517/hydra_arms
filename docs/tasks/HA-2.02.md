---
id: HA-2.02
title: Koszty i metody dostawy w checkoucie
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.01]
blocked_by_questions: [O-10]
touches_db: true
touches_prod: true
pr: null
---

## Cel
Checkout nie liczy dostawy, więc kwota zamówienia, a zaraz i płatności P24, jest za niska. Wszystko wysyła Hydra, jedną paczką, bez dropshippingu (O-06). Sukces: klient wybiera metodę dostawy z cennika ustalonego z klientem (O-10), darmowa dostawa działa od progu, a kwota zamówienia w bazie zawiera dostawę policzoną po stronie serwera.

## Zakres
- [ ] odczyt stanu bieżącego: `CheckoutClient.tsx`, `checkout/route.ts`, `cartAnalysis.ts` (trasy `direct_H1/H2`, `consolidated`, `pickup`), odpowiedź O-10 (O-06 rozstrzygnięte: jedna paczka od Hydry)
- [ ] konfiguracja cennika w jednym miejscu (tabela `shipping_methods` albo Sanity; wybór opisany w raporcie jako opcja dla tj, jeśli O-10 go nie przesądza)
- [ ] serwer liczy koszt dostawy z metody (kurier od Hydry / odbiór osobisty = 0); klient nie przesyła kwoty
- [ ] migracja (jeśli potrzebna): `shipping_cost`, `shipping_method` na `orders`; `checkout_create_order` dolicza dostawę
- [ ] UI checkoutu: wybór metody, koszt, suma, próg darmowej dostawy

## Gotowe, gdy
- zamówienie ma `total` = produkty + dostawa zgodnie z cennikiem — **jak sprawdzić:** test na lokalnej bazie dla 3 przypadków (poniżej progu, powyżej progu, odbiór osobisty = 0)
- red proof: podmieniona kwota dostawy w żądaniu klienta jest ignorowana — **jak sprawdzić:** test API z wklejonym wynikiem
- produkty `age_restricted`/`pickup_only` nadal wymuszają odbiór osobisty — **jak sprawdzić:** istniejący test / wklejony wynik
- UI pokazuje koszt i sumę — **jak sprawdzić:** zrzut z Playwright MCP

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
