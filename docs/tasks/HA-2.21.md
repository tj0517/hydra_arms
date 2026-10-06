---
id: HA-2.21
title: Domena główna z jednej zmiennej i ujednolicone e-maile
status: todo
difficulty: S
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.16]
blocked_by_questions: [O-31]
touches_db: false
touches_prod: false
pr: null
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
