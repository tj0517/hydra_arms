---
id: HA-2.01
title: Zamówienie czeka na płatność — nowy status, BL dopiero po opłaceniu
status: review
difficulty: L
model: claude-sonnet-4-6
model_approved: null
effort: high
branch: feat/ha-2.01-pending-payment
due: null
depends_on: [HA-1.01, HA-1.06]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: 14
---

## Cel
Dziś checkout od razu zapisuje zamówienie jako `paid`, zdejmuje stan w Supabase i wysyła zamówienie do BaseLinkera jako opłacone, choć nikt nie zapłacił. Stan prowadzimy w BaseLinkerze, a towar ma być rezerwowany dopiero po opłaceniu (O-03, O-05). Dalszą obsługę, czyli alokację braków, zlecenia do hurtowni i konsolidację, robi BL (O-14). Sukces: nowe zamówienie ma status „czeka na płatność”, niczego nie rezerwuje i nie trafia do BL. Po opłaceniu trafia do BL jako opłacone i dopiero wtedy BL rezerwuje towar.

## Zakres
- [ ] odczyt stanu bieżącego: `checkout/route.ts`, `checkout_create_order` (baseline), `reservedStock.ts`, `blStatusMap.ts`, `orders/sync`, widoki statusu (`konto/zamowienia/[id]`, `OrderConfirmationClient`); **diff definicji funkcji względem baseline przed migracją**
- [ ] migracja `010_order_payment_status.sql`: status `pending_payment`; `checkout_create_order` tworzy `pending_payment` i sprawdza dostępność, ale **nie zdejmuje stanu**; funkcja `mark_order_paid(order_id)` wywoływalna tylko przez service role
- [ ] checkout: bez pushu do BL; push do BL (jako opłacone, z trasą i magazynem źródłowym pozycji) wywoływany po `mark_order_paid` (źródło płatności: HA-2.03)
- [ ] `reservedStock.ts`, `orders/sync` (ponawianie osieroconych pushy tylko dla `paid`), UI statusów i `types.ts` zgodne z nowym statusem

## Gotowe, gdy
- checkout na lokalnej bazie tworzy zamówienie `pending_payment`, stan produktu bez zmian, brak wywołania BL — **jak sprawdzić:** test API + wklejony SELECT stanu przed/po + log mocka BL (0 wywołań)
- red proof: `mark_order_paid` kluczem anon/authenticated → błąd uprawnień — **jak sprawdzić:** wklejony wynik na lokalnej bazie
- po `mark_order_paid` zamówienie ma `paid` i trafia do mocka BL jako opłacone, dokładnie raz — **jak sprawdzić:** test z `BASELINKER_MOCK=true` (liczba wywołań = 1, także po drugim `mark_order_paid`)
- red proof: `orders/sync` nie wysyła do BL zamówień `pending_payment` — **jak sprawdzić:** test
- produkt niedostępny w chwili zamówienia nadal jest odrzucany — **jak sprawdzić:** istniejący lub nowy test

## Poza zakresem
- bramka P24 → HA-2.03
- koszty dostawy → HA-2.02
- anulowanie niezapłaconych zamówień po czasie → odłożone
- alokacja braków, MOQ, zlecenia do hurtowni, konsolidacja → automatyzacje w BaseLinkerze (O-14), nie kod
- maile → HA-2.07

## Bramki STOP
- przed napisaniem migracji — diff funkcji `checkout_create_order` względem baseline
- przed wdrożeniem 010 na prod — pokaż migrację i wyniki lokalne, czekaj
- zapis do BL tylko z `BASELINKER_MOCK=true`

## Kontekst
- `supabase/migrations/006_checkout_atomic.sql`, `007_fulfillment_routes.sql`, `src/lib/shop/cartAnalysis.ts`
- `src/app/api/shop/checkout/route.ts`, `src/lib/shop/reservedStock.ts`, `src/lib/shop/blStatusMap.ts`, `src/app/api/shop/orders/sync/route.ts`, `src/lib/baselinker/client.ts`
- stałe reguły: stan bazy odczytem, nie z `types.ts`; nowe migracje `00N_name.sql`; checkoutu w Playwright nie uruchamiasz na prod

## Notatki z realizacji
- 2026-09-22 tj: stan w BL, rezerwacja po opłaceniu, w BL (O-03, O-05); zaplecze zamówień w BL (O-14)
- 2026-09-23 tj: rezerwacja lokalna tylko w okienku opłacone-niewysłane-do-BL, dalej BL (opcja A)
- 2026-09-23 tj: 010 wgrywa tj ręcznie na prod tuż przed merge, agent potwierdza odczytem (opcja A)
- 2026-09-23 tj: CHECK na orders.status w 010 (opcja A)
- 2026-09-23 tj: plan 010 zatwierdzony (CHECK 5 statusów, default pending_payment, checkout bez dekrementu, mark_order_paid service_role) z warunkami: dowód definicji z prod, odczyt 4 zamówień prod, dostępność z tej samej liczby co wyświetlana
