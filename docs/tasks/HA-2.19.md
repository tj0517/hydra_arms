---
id: HA-2.19
title: Podpisany link statusu zamówienia dla gościa
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.07]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Klient bez konta musi mieć w mailu link do statusu swojego zamówienia, który nie pozwala zgadywać cudzych zamówień. Decyzja tj z 2026-09-30 (opcja C+B): link podpisany i wygasający. Sukces: mail zawiera taki link, strona statusu pokazuje zamówienie tylko przy poprawnym i niewygasłym podpisie.

## Zakres
- [ ] odczyt stanu bieżącego: `src/lib/email/orderEmails.ts`, strona `/konto/zamowienia/[id]`, sposób obsługi gości (`orderSession.ts`), `SHOP_BASE_URL`
- [ ] podpisany token (id zamówienia + czas wygaśnięcia, HMAC), sekret `ORDER_LINK_SECRET` w rejestrze inputów (HA-2.16)
- [ ] strona statusu dla gościa pod tokenem; bez danych osobowych w adresie
- [ ] maile „zamówienie przyjęte” i „opłacone” zawierają link; gdy `SHOP_BASE_URL` puste, link jest pomijany (nie względny)

## Gotowe, gdy
- red proof: token wygasły → odmowa — **jak sprawdzić:** test API
- red proof: token sfałszowany (zmieniony podpis) → odmowa — **jak sprawdzić:** test API
- red proof: token z id zamówienia A użyty dla zamówienia B → odmowa — **jak sprawdzić:** test API
- poprawny token pokazuje status zamówienia — **jak sprawdzić:** test API + zrzut z Playwright MCP
- mail zawiera link o poprawnym podpisie, a przy pustym `SHOP_BASE_URL` linku nie ma — **jak sprawdzić:** testy szablonów (mock Resend)

## Poza zakresem
- konto z logowaniem i historią zamówień → bez zmian
- własny SMTP Supabase Auth → runbook HA-2.09
- czasowy `await` wysyłki maila w checkoucie (`after()`) → deferred

## Bramki STOP
- ustawienie `ORDER_LINK_SECRET` w Vercelu — tj
- wysyłka realnych maili poza trybem testowym

## Kontekst
- `src/lib/email/orderEmails.ts`, `src/lib/shop/orderSession.ts`, `docs/deferred-tasks.md` (2026-09-30 HA-2.07)

## Notatki z realizacji
- 2026-09-30 tj: decyzja C+B — link podpisany i wygasający, potrzebny przed HA-2.09.
