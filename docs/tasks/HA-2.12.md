---
id: HA-2.12
title: Kategoryzacja Kolby — reguły do drzewa Hydry
status: todo
difficulty: L
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.04]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Feed Kolby nie ma żadnych kategorii (100% produktów, `PROBLEMY-feedow-xml.md`). Słownik `category-map.json` ma dla Kolby 1 regułę i 2 marki, więc w podglądzie z 2026-09-25 na 13 882 produkty przyjęto 0, a 11 563 nie ma działu. Sukces: deterministyczne reguły (marka, atrybut, słowa w nazwie) przypisują dział Hydry co najmniej 70% produktów Kolby. Kontrola 50 losowych przypisań daje najwyżej 5% błędów, a podgląd pokazuje produkty Kolby w działach P1.

## Zakres
- [ ] odczyt stanu: `xml-integration/connectors/kolba.ts` (atrybuty, marka, nazwa, `_hints`), `ruleMatches` i format `kolba_rules` / `kolba_brands` w `scripts/xml-to-baselinker.ts`, `hydra-category-tree.txt`, `docs/research/taksonomia-p1.md`, `xml-integration/assortment-rules.ts`
- [ ] analiza pełnego pliku Kolby (publiczny, bez tokenu): rozkład marek, atrybutów i słów kluczowych w nazwach; wynik w raporcie jako liczby
- [ ] jeśli obecny format reguł nie wystarcza (np. brak dopasowania po słowach w nazwie), rozszerzyć `ruleMatches`, z testami
- [ ] reguły w `category-map.json`, najpierw dla działów z listy P1 (`assortment-rules.ts`), potem reszta do progu
- [ ] raport pokrycia per dział + 20 największych niezmapowanych grup (marka lub atrybut, liczba produktów)
- [ ] próbka kontrolna: 50 losowych przypisań (nazwa produktu → dział) w raporcie, do oceny przez tj

## Gotowe, gdy
- co najmniej 70% produktów Kolby ma dział Hydry — **jak sprawdzić:** tj uruchamia `--dry-run`; licznik „DO PRZYPISANIA” dla Kolby ≤ 30% feedu (wklejone podsumowanie)
- kontrola 50 losowych przypisań ma najwyżej 5% błędów — **jak sprawdzić:** tabela w raporcie, ocena tj
- każdy nowy typ reguły ma test dopasowania i niedopasowania — **jak sprawdzić:** `npm run test:unit`
- podgląd pokazuje przyjęte produkty Kolby w działach P1 — **jak sprawdzić:** wklejone podsumowanie (admitted dla Kolby > 0, per dział)

## Poza zakresem
- nowe gałęzie drzewa (ASG, łucznictwo, myślistwo) → O-20
- klasyfikacja AI w czasie importu → odrzucone przez tj 2026-09-25
- zmiana listy P1 → decyzja tj
- import na żywo → HA-2.15

## Bramki STOP
- jeśli po analizie wyjdzie, że 70% wymaga więcej niż ~150 reguł albo reguł niepewnych: zatrzymaj się, pokaż rozkład i zaproponuj podział zadania
- przed zmianą struktury `category-map.json` (czymkolwiek poza dopisywaniem wpisów) pokaż diff i czekaj
- żadnego zapisu do BaseLinkera

## Kontekst
- `xml-integration/PROBLEMY-feedow-xml.md` (sekcja KOLBA), `xml-integration/SCHEMAS.md`
- `xml-integration/category-map.json` (`_comment` opisuje format)
- `docs/research/taksonomia-p1.md`, `xml-integration/assortment-rules.ts`
- `docs/tasks/HA-2.04.md` (podgląd, filtr)

## Notatki z realizacji
- 2026-09-25 tj: reguły deterministyczne w `category-map.json` (bez klasyfikacji AI w czasie importu); próg ≥ 70% produktów z działem; kontrola 50 próbek ≤ 5% błędów; jedno zadanie, podział tylko wtedy, gdy analiza pokaże, że jest za duże.
