---
id: HA-2.04
title: Filtr asortymentu w imporcie
status: review
difficulty: L
model: claude-sonnet-4-6
model_approved: null
effort: high
branch: feat/ha-2.04-assortment-filter
due: null
depends_on: [HA-1.05]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: 17
---

## Cel
Trzy hurtownie mają około 29 tys. pozycji, a klient nie chce całego asortymentu. Kategorie wyznacza drzewo 01–15 (`xml-integration/hydra-category-tree.txt`). Plan BL zostanie podniesiony tak, żeby produkty się zmieściły (O-08), a stan prowadzimy w BL (O-05). Sukces: import przepuszcza tylko produkty spełniające reguły ustalone z klientem (O-04): podkategoria P1 z analizy z 15.09, występująca u co najmniej jednej z naszych hurtowni; stan > 0 w magazynie Hydry albo w hurtowni (model mieszany); hurtownie Sharg, Spechurt, Kolba; próg cenowy na start wyłączony (0 zł), ale ustawialny. Reguły są w jednym, czytelnym miejscu, a przed zapisem widać podgląd: ile produktów wejdzie, a ile odpadnie.

## Zakres
- [ ] odczyt stanu bieżącego: gdzie dziś zapada decyzja o imporcie (`scripts/xml-to-baselinker.ts`, filtr obronny Sharg, `xml-integration/engine.ts`, `/api/shop/sync`), decyzje O-04 (rozstrzygnięte 2026-09-24)
- [ ] mapowanie podkategorii P1 (175 wierszy arkusza „Podkategorie i filtry”) → drzewo 01–15, zapisane w repo (`docs/research/taksonomia-p1.md` lub JSON obok `category-map.json`); wiersze bez odpowiednika wypisane (przeniesione z HA-2.10)
- [ ] jedna konfiguracja reguł (plik lub tabela) + funkcja filtra z testami jednostkowymi
- [ ] tryb podglądu (`--dry-run`): liczby per hurtownia i kategoria, bez zapisu do BL

## Gotowe, gdy
- mapowanie P1 → drzewo 01–15 obejmuje wszystkie 175 wierszy P1 (zmapowane albo jawnie „brak odpowiednika”) — **jak sprawdzić:** liczba wierszy w pliku + lista braków w raporcie
- testy jednostkowe filtra: produkt poniżej progu, bez stanu nigdzie, spoza P1 i z wyłączonej hurtowni odpada; przechodzi produkt ze stanem tylko u Hydry i produkt ze stanem tylko w hurtowni — **jak sprawdzić:** wklejony wynik testów
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
- 2026-09-24 tj: zakres asortymentu = podkategorie P1 dostępne u naszych hurtowni; mapowanie P1 → 01–15 w tym zadaniu (M → L) (O-04)
- 2026-09-24 tj: hurtownie Sharg, Spechurt, Kolba (bez Szaf do O-17); próg cenowy na start 0 zł, ustawialny (O-04 rozstrzygnięte)
- 2026-09-24 tj: „na stanie” = model mieszany (stan Hydry albo hurtowni); prezentacja czasu dostawy wg źródła poza zakresem (O-04)
- 2026-09-25 claude: własny stan Hydry (BASELINKER_WAREHOUSE_HYDRA) nie jest jeszcze skonfigurowany; do czasu jego ustawienia dry-run i import traktują własny stan jako 0 z wyraźnym ostrzeżeniem; część mieszanego modelu aktywuje się po dodaniu zmiennej do .env.local
- 2026-09-25 claude: broń czarnoprochowa (gałąź 01/02, Kolba) wykluczona z allowedHydraNums do rozstrzygnięcia O-11 (compliance); wiersze do przywrócenia: 1.1, 1.1.2, 1.2, 1.3, 2.6
- 2026-09-25 claude: isP1() zmienione na exact match (bez prefix-matching na węzłach rodzicach); filtr assortmentu NIE stosowany w trybie sync (tylko import)
