---
id: HA-2.20
title: Hardening P24 — notify tylko z IP P24, RLS koszyków, guard licznika BL
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.03]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: null
---

## Cel
Przed sandboxem P24 i startem sprzedaży zamykamy trzy luki z deferred: notify można wywołać z dowolnego adresu, polityka koszyków przepuszcza cudze sesje, a licznik BL nie ma guarda poza mockiem. Sukces: każda z tych trzech rzeczy ma red proof.

## Zakres
- [ ] odczyt stanu bieżącego: endpoint notify P24, lista IP z dokumentacji P24, polityka `own cart` na `cart_items` i użycie tabeli w `src/`, `/api/shop/dev/bl-mock-counter`
- [ ] notify przyjmuje tylko adresy IP serwerów P24 (lista w rejestrze inputów); wyłączane w trybie mock i lokalnym
- [ ] `cart_items`: zawężenie polityki albo usunięcie nieużywanej tabeli — **decyzja tj** (drop = bramka STOP, nieodwracalne)
- [ ] `bl-mock-counter` zwraca 404 przy `BASELINKER_MOCK` ≠ true

## Gotowe, gdy
- red proof: notify z obcego IP → 403 i zamówienie bez zmian — **jak sprawdzić:** test API
- notify z IP z listy (sandbox) → przetworzone — **jak sprawdzić:** test API z podstawionym nagłówkiem na lokalnym środowisku
- red proof: odczyt `cart_items` z cudzym `session_id` przez klucz anon → brak wierszy — **jak sprawdzić:** test na lokalnej bazie (np. `scripts/check-anon-access.ts`)
- red proof: `bl-mock-counter` przy `BASELINKER_MOCK=false` → 404 — **jak sprawdzić:** test API
- migracja (jeśli jest) ma `ENABLE ROW LEVEL SECURITY` i politykę w tej samej migracji — **jak sprawdzić:** grep po pliku migracji

## Poza zakresem
- test na prawdziwym sandboxie P24 → HA-2.23
- zmiana tras fulfillmentu → bramka STOP

## Bramki STOP
- przed napisaniem migracji — diff polityki względem baseline
- drop tabeli `cart_items` — decyzja tj
- przed wdrożeniem migracji na prod — akceptacja

## Kontekst
- `src/lib/p24/`, `supabase/migrations/`, `supabase/baseline/prod-schema-2026-09-22.sql`, `docs/deferred-tasks.md`

## Notatki z realizacji
