---
id: HA-2.09
title: Start sprzedaży — przełączenie na produkcję
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-1.02, HA-1.03, HA-1.07, HA-2.02, HA-2.03, HA-2.04, HA-2.05, HA-2.06, HA-2.07, HA-2.08, HA-2.15]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: null
---

## Cel
Po akceptacji P24 sklep ma zacząć realną sprzedaż. To moment, w którym zamówienia stają się danymi klientów i pieniędzy: nie wolno ich zmieniać ani usuwać, a każda pomyłka w konfiguracji kosztuje realne pieniądze. Sukces: produkcyjne klucze P24, BL na żywo, tryb weryfikacji wyłączony, zamówienia chronione, a pierwsze prawdziwe zamówienie przechodzi całą ścieżkę.

## Zakres
- [ ] BASELINKER_WAREHOUSE_HYDRA ustawione (magazyn własny Hydry w BL) — bez tego model mieszany z O-04 działa jak „tylko stan hurtowni"
- [ ] odczyt stanu bieżącego: `P24_MODE=production` możliwy (konto P24 aktywne), status wszystkich zależności, env Production w Vercelu (nazwy), crony, `BASELINKER_MOCK`, advisory Supabase (wklejone przez agenta)
- [ ] checklista przełączenia (runbook) w `docs/go-live.md`: kolejność kroków, kto robi, jak cofnąć; w tym elementy konfigurowane w BaseLinkerze, nie w kodzie: automatyzacje zaplecza z flowchartu (O-14) i integracja e-paragonów (O-16)
- [ ] ochrona `orders`/`order_items` przed zmianą historii (np. brak UPDATE/DELETE poza statusem przez service role), migracja
- [ ] propozycja diffu do project.md: `security.immutable: [orders, order_items]`, notatka o starcie
- [ ] test dymny po przełączeniu: jedno realne zamówienie o niskiej wartości (robi tj), potem zwrot

## Gotowe, gdy
- runbook przejrzany przez tj — **jak sprawdzić:** akceptacja tj w notatkach
- red proof: próba usunięcia/zmiany kwoty zamówienia (lokalnie) → odrzucona — **jak sprawdzić:** wklejony błąd
- pierwsze realne zamówienie: P24 → `paid` → BL → mail — **jak sprawdzić:** wklejone SELECT, identyfikator w BL, zrzut maila (dane klienta zamaskowane)

## Poza zakresem
- nowe funkcje sklepu → etap 3

## Bramki STOP
- każdy krok runbooka dotykający prod, Vercela, P24 lub BL — osobna akceptacja tj
- migracja chroniąca zamówienia — akceptacja przed wdrożeniem
- zmiana `vercel.json` (crony) — akceptacja

## Kontekst
- project.md (security, bramki), `docs/deferred-tasks.md`, raporty HA-2.01–2.08

## Notatki z realizacji
