---
id: HA-2.19
title: Podpisany link statusu zamówienia dla gościa
status: done
difficulty: M
model: sonnet-5.5
model_approved: null
effort: null
branch: feat/ha-2.19-guest-order-link
due: null
depends_on: [HA-2.07]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 46
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
- 2026-10-16 tj: link ważny 30 dni; strona gościa bez adresu i danych osobowych; brak ORDER_LINK_SECRET → mail bez linku, strona odmawia.
- 2026-10-16 tj: oba serwery (DCS 3001, Hydra) muszą działać naraz — HYDRA_TEST_PORT z domyślnym 3001, CI bez zmian.
- 2026-10-16 tj: katalog roboczy `/home/tj/hydra_arms` (klon WSL) zatwierdzony dla HA-2.19, jak dla HA-2.15, HA-2.28 i HA-2.06; preflight spełniony, gdy toplevel zawiera `CLAUDE.md` i `.claude/settings.json` z hookiem `agent-guard.sh`.
- 2026-10-16 tj: dowody UI bez Playwright MCP — zrzuty z samego testu Playwright (`page.screenshot()`) do `.playwright-mcp/ha-2.19-*.png` (minimum: ważny token i wygasły token; element w widoku, ~2 s czekania na GSAP). Nie instalować ani nie konfigurować serwerów MCP.
- 2026-10-16 tj: Docker — stack DCS (Seaclouds) może działać na domyślnych portach Supabase; stack Hydry na 553xx (HA-2.29). Zatrzymać tylko, gdy port Hydry (55321/55322/553xx) jest zajęty; `docker ps` w raporcie.
- 2026-10-16 tj: odbiór PR #46 po 1 rundzie — przyjęte. Udowodnione: red proofy wygasłego, sfałszowanego i cudzego linku (test na zepsutej weryfikacji → czerwony, na prawdziwej → zielony), odpowiedź bez adresu/danych osobowych (dokładna lista pól), link w obu mailach weryfikuje się tylko dla swojego zamówienia, brak linku przy pustym SHOP_BASE_URL i bez sekretu. CI zielone. Zostaje: ORDER_LINK_SECRET w Vercelu (tj), unieważnianie linków i krok CI dla no-secret w deferred.
