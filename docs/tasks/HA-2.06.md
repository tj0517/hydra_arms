---
id: HA-2.06
title: Compliance — wymuszenie odbioru osobistego (pozwolenie, rejestracja, 18+)
status: review
difficulty: M
model: sonnet-5.5
model_approved: null
effort: null
branch: feat/ha-2.06-compliance-pickup
due: null
depends_on: [HA-1.06, HA-2.17, HA-2.29]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: 44
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
- 2026-10-15 tj: praca w /home/tj/hydra_arms (korzeń repo na WSL, nie `hydra_arms/web`) — jak dla HA-2.15 (2026-10-13) i HA-2.28 (2026-10-14); hook guard i CLAUDE.md ładują się z tego korzenia.
- 2026-10-15 tj: Playwright MCP niedostępny na tej maszynie — weryfikacja UI zrzutami z `page.screenshot()` w teście Playwright (`.playwright-mcp/ha-2.06-*.png`: niezaznaczone → błąd, zaznaczone → sukces).
- 2026-10-15 tj: wstrzymane do HA-2.29 (porty lokalnego stacka)
- 2026-10-15 tj: HA-2.29 zmergowane, wznowienie
- 2026-10-15 tj: decyzja 1 — opcja C: jedna funkcja SQL `hydra_section(category_id)` używana przez route i RPC; dopasowanie po prefiksie nazwy korzenia „01.” / „02.” jak w HA-2.17. Ryzyko zmiany nazw korzeni → deferred (test strażnik: każdy korzeń z prod pasuje do `^\d\d\.`, osobne zadanie).
- 2026-10-15 tj: decyzja 2 — nieznana kategoria, zerwany łańcuch albo korzeń bez „NN.” = nie 01/02; flagi nadal decydują.
- 2026-10-15 tj: walidator body pisany ręcznie, bez nowej zależności; MANUAL_TESTS.md TC-11/12 z potwierdzeniem.
- 2026-10-15 agent: stan prod (odczyt): definicja RPC `checkout_create_order` ma ten sam md5 co lokalna po 001–015 (651401a2…), kolumny/constrainty/policy `orders` identyczne — prod jest na poziomie 015 dla tych obiektów (list_migrations prod zwraca pustą listę — migracje wdrażane SQL Editorem).
- 2026-10-15 tj: Option C (hydra_section SQL), unknown category = not 01/02, confirmation on every pickup order; old 5-arg RPC dropped (fail closed). Runbook note for go-live: apply 016 and deploy the app together — between them pickup orders are refused.
- 2026-10-15 tj: `hydra_section` jako SECURITY INVOKER (wywołują ją service_role z route i właściciel RPC; wykonanie tylko service_role).
- 2026-10-15 agent: pierwszy przebieg `npm run test:shop -- <plik>` uruchomił cały `tests/shop` (skrypt ma już ścieżkę) i padł na obcym serwerze na :3001 (404 HTML, brak linii [WebServer] = reuseExistingServer); po sprawdzeniu, że :3001 jest wolny, przebiegi: spec 16/16, test:shop 151 passed / 1 flaky (cart.spec.ts:112, znany) / 4 skipped, `npm run test` jw., test:unit 219/221 (te same 2 prod-guard).

