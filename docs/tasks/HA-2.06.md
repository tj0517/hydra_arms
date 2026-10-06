---
id: HA-2.06
title: Compliance — wymuszenie odbioru osobistego (pozwolenie, rejestracja, 18+)
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-1.06, HA-2.17]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: null
---

## Cel
Sklep sprzedaje asortyment dual-use. Produkt z pozwoleniem, rejestracją lub ograniczeniem 18+ idzie wyłącznie odbiorem osobistym w salonie (potwierdzone przez klienta 2026-10-06, grupy A–D z O-27). Flagi ustawia HA-2.17 (tagi z BL → `requires_license`, `age_min`). Sukces: sklep wymusza odbiór na podstawie tych flag oraz kategorii 01/02 (nawet bez flagi), reguły nie da się obejść żądaniem do API, a klient przy odbiorze osobistym potwierdza, że wiek i uprawnienia zostaną sprawdzone na miejscu.

## Zakres
- [ ] odczyt stanu bieżącego: `cartAnalysis.ts` (`mustPickup`), walidacja w `checkout/route.ts`, RPC `checkout_create_order`, pola `product_type`, `requires_license`, `delivery_allowed`, `age_min`, wynik HA-2.17
- [ ] reguła w checkoucie i RPC: `requires_license` ∨ `age_min ≥ 18` ∨ kategoria 01/02 → tylko odbiór osobisty, niezależnie od `product_type`
- [ ] potwierdzenie klienta przy zamówieniu z odbiorem osobistym („wiek/uprawnienia sprawdzane przy odbiorze”), zapisane w zamówieniu (audyt)
- [ ] migracja (kolumna potwierdzenia), jeśli potrzebna

## Gotowe, gdy
- red proof: kurier dla produktu z `requires_license` oznaczonego `standard` → odrzucone, bez zamówienia w bazie — **jak sprawdzić:** test API na lokalnej bazie
- red proof: kurier dla produktu 18+ bez flagi pozwolenia → odrzucone — **jak sprawdzić:** test API
- red proof: produkt z kategorii 01/02 bez flagi, kurier → odrzucone — **jak sprawdzić:** test API
- produkt bez pozwolenia, rejestracji i 18+ przechodzi z kurierem — **jak sprawdzić:** test API
- red proof: odbiór osobisty bez potwierdzenia → odrzucone — **jak sprawdzić:** test API
- zamówienie z potwierdzeniem ma je zapisane — **jak sprawdzić:** wklejony SELECT
- istniejące reguły odbioru działają — **jak sprawdzić:** istniejące testy przechodzą

## Poza zakresem
- ustawianie flag przy imporcie → HA-2.17
- bramka 18+ online / mObywatel / IDENTT → O-28
- przywrócenie broni czarnoprochowej w `assortment-rules.ts` → osobno, po O-22

## Bramki STOP
- każda zmiana reguł `product_type` lub tras fulfillmentu — decyzja tj przed implementacją
- przed napisaniem migracji — diff względem baseline; przed wdrożeniem na prod — akceptacja
- przed ukryciem produktów na prod — lista i akceptacja

## Kontekst
- `src/lib/shop/cartAnalysis.ts`, `src/app/api/shop/checkout/route.ts`, `supabase/migrations/003_pickup_route.sql`, `007_fulfillment_routes.sql`
- `docs/tasks/HA-2.17.md`
- `docs/04-open-questions.md` → O-11, O-27

## Notatki z realizacji
- 2026-09-22 tj: weryfikacja tylko przy odbiorze, mObywatel w przyszłości (O-12)
- 2026-09-30 tj: reguła pozwolenie lub 18+ → odbiór (brak bramki 18+ online)
- 2026-10-06 tj: ustawianie flag przeniesione do HA-2.17; klient potwierdził grupy A–D (rejestracja i ASG/noże też odbiór).
