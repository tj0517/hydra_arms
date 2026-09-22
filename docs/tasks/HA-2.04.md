---
id: HA-2.04
title: Filtr asortymentu w imporcie
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-1.05]
blocked_by_questions: [O-04]
touches_db: true
touches_prod: true
pr: null
---

## Cel
Trzy hurtownie mają około 29 tys. pozycji, a klient nie chce całego asortymentu. Kategorie wyznacza drzewo 01–15 (`xml-integration/hydra-category-tree.txt`). Plan BL zostanie podniesiony tak, żeby produkty się zmieściły (O-08), a stan prowadzimy w BL (O-05). Sukces: import przepuszcza tylko produkty spełniające reguły ustalone z klientem (O-04, np. stan > 0, cena ≥ próg, kategoria z listy, wybrane hurtownie), reguły są w jednym, czytelnym miejscu, a przed zapisem widać podgląd: ile produktów wejdzie, a ile odpadnie.

## Zakres
- [ ] odczyt stanu bieżącego: gdzie dziś zapada decyzja o imporcie (`scripts/xml-to-baselinker.ts`, filtr obronny Sharg, `xml-integration/engine.ts`, `/api/shop/sync`), odpowiedź O-04 (próg cenowy, „na stanie”, hurtownie)
- [ ] jedna konfiguracja reguł (plik lub tabela) + funkcja filtra z testami jednostkowymi
- [ ] tryb podglądu (`--dry-run`): liczby per hurtownia i kategoria, bez zapisu do BL

## Gotowe, gdy
- testy jednostkowe filtra: produkt poniżej progu, bez stanu, spoza kategorii i z wyłączonej hurtowni odpada; poprawny przechodzi — **jak sprawdzić:** wklejony wynik testów
- podgląd na aktualnych feedach pokazuje liczby per hurtownia i kategoria drzewa — **jak sprawdzić:** wklejone podsumowanie `--dry-run` (odczyt feedów, bez zapisu)
- reguły da się zmienić bez zmiany kodu filtra — **jak sprawdzić:** zmiana progu w konfiguracji zmienia wynik podglądu (wklejone oba wyniki)

## Poza zakresem
- marże → HA-2.05
- kategorie wyłączone ze sprzedaży online (compliance) → HA-2.06
- faktyczny import do BL na żywo → bramka STOP, po akceptacji podglądu przez tj

## Bramki STOP
- przed jakimkolwiek zapisem do BaseLinkera (live token, `BASELINKER_MOCK` ≠ true) — pokaż podgląd i czekaj
- przed usunięciem/ukryciem produktów już obecnych w BL lub w `shop_products` na prod — pokaż listę i czekaj
- nie wypisuj tokenów feedów w logach

## Kontekst
- `xml-integration/hydra-category-tree.txt`, `category-map.json` — drzewo kategorii (potwierdzone przez tj 2026-09-22)
- `xml-integration/README.md`, `SCHEMAS.md`, `PROBLEMY-feedow-xml.md`, `NOTATKI-rozmowa-klient-2026-06-19.md`
- `scripts/xml-to-baselinker.ts`, `xml-integration/category-map.json`

## Notatki z realizacji
