---
id: HA-2.21
title: Domena główna z jednej zmiennej i ujednolicone e-maile
status: done
difficulty: S
model: claude-opus-5-5
model_approved: null
effort: null
branch: feat/ha-2.21-site-url
due: null
depends_on: [HA-2.16]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 60
---

## Cel
Strona ma dziś trzy warianty domeny: canonical, og:url i sitemap na hydraarms.pl, adresy e-mail na stronie głównej na @hydraarms.com, reszta (regulamin, stopka, formularze) na hydra-arms.com. Sukces: jedna zmienna `SITE_URL` steruje canonical, og:url, og:image, sitemap i robots, a e-maile na stronie są ujednolicone. Zmiana domeny po decyzji klienta to zmiana jednej wartości.

## Zakres
- [ ] odczyt stanu bieżącego: `src/app/layout.tsx` (`BASE_URL`), `src/app/sitemap.ts`, `public/robots.txt`, cztery adresy w `HomePageClient.tsx`, stopka i formularze
- [ ] `SITE_URL` w rejestrze inputów (wartość wstępna `https://hydra-arms.com`, zgodna z regulaminem i politykami); użycie w metadanych i sitemap
- [ ] adresy e-mail na stronie głównej z tego samego źródła co stopka (`siteSettings`/env)
- [ ] propozycja diffu: przekierowania 301 z pozostałych domen na główną (do wdrożenia przez tj w Vercelu/DNS)

## Gotowe, gdy
- w build'zie canonical i og:url równe `SITE_URL` — **jak sprawdzić:** `curl` lokalnego buildu, wklejone nagłówki `<head>`
- brak twardo zapisanych domen poza rejestrem — **jak sprawdzić:** `grep -rn "hydraarms\.\(pl\|com\)" src` = 0
- test jednostkowy generatora sitemap z różnymi `SITE_URL` — **jak sprawdzić:** wklejony wynik testu
- adresy e-mail na stronie głównej pochodzą z jednego źródła — **jak sprawdzić:** grep po `HomePageClient.tsx`

## Poza zakresem
- DNS i rejestracja domen → klient/tj
- Search Console i reindeksacja → po wdrożeniu, tj
- treść regulaminu → bez zmian

## Bramki STOP
- zmiana env w Vercelu i przekierowań 301 — tj

## Kontekst
- `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/components/HomePageClient.tsx`, `src/components/Footer.tsx`

## Notatki z realizacji
- 2026-10-06: potwierdzone odczytem strony i kodu — canonical i og:url wskazują hydraarms.pl; fetch hydraarms.pl nie rozwiązał nazwy z jednego miejsca.
- 2026-10-25 tj (wf-task): O-31 = hydra-arms.com. D1 = A — homepage e-mails from the same source as the footer (Sanity siteSettings, fallback @hydra-arms.com), no new client question. D2 — SHOP_BASE_URL merged into SITE_URL with two behaviours: SEO/metadata use SITE_URL with fallback https://hydra-arms.com; payments and e-mail links use SITE_URL without fallback (missing → refuse, as SHOP_BASE_URL did). D3 = A — fallback https://hydra-arms.com for SEO.
- 2026-10-25 tj: D4 = A — stopka czytała `emailRd`/`emailB2g`, a schemat Sanity i zapytanie mają `emailRD`/`emailB2G`; wspólny `siteEmails()` czyta poprawne pola. Uwaga po decyzji (korekta agenta): stopka renderuje tylko adres biura, więc poprawka nie zmienia nic widocznego w stopce — wartości R&D/B2G ze Studio widać teraz na stronie głównej.
- 2026-10-25 tj (wf-review): PR #60 accepted. Proven: canonical/og:url/og:image/sitemap/robots follow SITE_URL in a production build (example.test and unset → hydra-arms.com); hardcoded hydraarms.* and SHOP_BASE_URL greps = 0; test:site-url 3×4/4; fail-closed kept — p24-no-baseurl 3/3 and order-link-no-secret 1/1, red proof with a fallback in shopBaseUrl() sends checkout to production; inputs:check passes; build, lint and tsc clean. test:shop: 317 passed, 1 failure from the known is-test-mode-switch afterAll (HA-2.36 deferred), listing-rpc 11/11 after reset. Model: ran on Opus (recommended Sonnet low). Homepage e-mails now use the footer's addresses (research@/gov@/sprzedaz@/office@hydra-arms.com or the Studio values) — tj accepted under D1 = A; tj checks the Studio values. Vercel (tj): SITE_URL Production = https://hydra-arms.com; Preview = the previous SHOP_BASE_URL Preview value (empty if there was none); merge; then remove SHOP_BASE_URL. www.hydra-arms.com serves the site without a redirect today — the www/hydraarms.pl/hydra-arms.pl → apex redirect is tj's.
