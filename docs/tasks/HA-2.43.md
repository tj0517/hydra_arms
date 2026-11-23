---
id: HA-2.43
title: Poprawki graficzne sklepu po spotkaniu z klientem — slider produktów, kafelki kategorii z ikoną, certyfikaty w stopce na mobile
status: review
difficulty: S
model: claude-opus-5-5
model_approved: null
effort: null
branch: feat/ha-2.43-shop-visual-tweaks
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 70
---

> Zlecone jako „HA-2.39”; numer był już zajęty (wycena wspólnych, PR #69), stąd HA-2.43.

## Cel
Trzy poprawki wizualne po spotkaniu z klientem: sekcja produktów może być przewijanym sliderem, kafelki głównych kategorii mogą mieć ikonę na przyciemnionym tle, a certyfikaty w stopce na telefonie układają się jeden pod drugim. Istniejące dane Sanity wyglądają tak jak dotąd.

## Zakres
- [x] `shopProductPickerBlock.layout`: nowa opcja `slider` („Slider (przewijany)”); typ `ProductPickerBlock.layout` rozszerzony
- [x] `ProductPickerSection` w trybie `slider`: poziomy pas `ProductCard` na CSS scroll-snap (`snap-x snap-mandatory`, `scrollbar-hide`), karta 75% szerokości na mobile / 1/3 od md / 1/4 od lg; strzałki ‹ › przy nagłówku tylko od md (`scrollBy` o szerokość widoku, disabled na krańcach); na mobile sam swipe; link CTA bez zmian; logika pobierania produktów bez zmian
- [x] `shopTileGridBlock`: kafelek dostaje opcjonalne `icon` (SVG/PNG) i `background` (z hotspotem); `image` zostaje i jest tłem zastępczym; blok dostaje `variant` (`photo` domyślny, `icon`)
- [x] `shopPageQuery`: projekcja `variant`, `tiles[].icon`, `tiles[].background`
- [x] `TileGridSection` w wariancie `icon`: tło ze zdjęcia z przyciemnieniem `bg-black/75` albo ciemne tło z siatką i zielonym gradientem (kolory z `COLORS.md`); ikona wyśrodkowana 36px mobile / 48px md, renderowana jako CSS mask, więc jednokolorowa ikona dostaje kolor tekstu i na hover kolor akcentu ze skalą 110%; brak ikony → sama etykieta; obramowanie i pasek akcentu na hover jak w wariancie `photo`; na <sm kafelek kwadratowy, żeby etykieta + opis zmieściły się w 2 kolumnach na 375px
- [x] `Footer.tsx`, „Col 2: Cert Badges”: poniżej md `grid-cols-1`, karty 1 i 2 `h-[88px]`, karta PCA na pełną szerokość; od md bez zmian (2 + 1, `md:col-span-2`, `h-[100px]`)

## Gotowe, gdy
- w Studio pole „Układ siatki” ma opcję „Slider (przewijany)”, a blok w tym trybie renderuje przewijany pas z widocznym kawałkiem następnej karty na mobile — **jak sprawdzić:** `docs/screenshots/ha-2.43/sections-375.png`, `sections-1440.png`, `slider-1440-end.png`
- strzałki przewijają o widok i są wyłączone na krańcach — **jak sprawdzić:** skrypt Playwright na 12 kartach przy 1440: start prev=disabled; po 2× next scrollLeft 2576, next=disabled; po prev oba aktywne
- kafelki w wariancie `icon` pokazują ikonę nad etykietą na tle zdjęcia albo na tle zastępczym, bez pustego miejsca przy braku ikony — **jak sprawdzić:** `sections-375.png` / `sections-1440.png` (sekcja „Kategorie (wariant icon)”)
- istniejące bloki (bez nowych pól) renderują się identycznie — **jak sprawdzić:** `tiles-photo-before-*.png` i `tiles-photo-after-*.png` są identyczne bajt w bajt (375 i 1440)
- certyfikaty w stopce na 375px stoją w jednej kolumnie; od md układ bez zmian — **jak sprawdzić:** `footer-before-375.png` vs `footer-after-375.png`; geometria kart certyfikatów (x/szerokość/wysokość) przed/po identyczna przy 768/1024/1440
- `npm run lint` (0 błędów), `npx tsc --noEmit`, `npm run build` przechodzą

## Poza zakresem
- zmiany w produkcyjnym datasecie Sanity: redakcja sama przełącza bloki na `slider` / `icon` i wgrywa ikony
- logika wyboru produktów (`getBlockProducts`, `productBlocks.ts`)

## Kontekst
- `src/sanity/schemas/shop/shopProductPickerBlock.ts`, `src/sanity/schemas/shop/shopTileGridBlock.ts`, `src/sanity/queries.ts`
- `src/components/shop/ShopPageSections.tsx`, `src/components/Footer.tsx`
- `COLORS.md`

## Notatki z realizacji
- Zrzuty: tymczasowa trasa `src/app/(main)/ha243-preview` (niecommitowana, usunięta) z sekcjami z fixtury zbudowanej na kopii bloków `shopPage` (Sanity tylko odczyt, przez dev server z `NEXT_PUBLIC_SANITY_PROJECT_ID` ustawionym inline). Produkty z lokalnego Supabase (`db:start`, seed). Ikony: fikcyjne refy `image-ha243*-48x48-svg`, które Playwright podmienia (`page.route`) na lokalne SVG. Tło: istniejący asset z datasetu. Nic nie zapisano ani do Sanity, ani do Supabase.
- Ikona jako CSS `mask-image` z `cdn.sanity.io` wymaga CORS; Sanity CDN odpowiada `Access-Control-Allow-Origin: *`. Wielokolorowe ikony będą renderowane jako sylwetka jednego koloru (zgodnie z opisem pola „białe/jednokolorowe”).
