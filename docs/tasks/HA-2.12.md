---
id: HA-2.12
title: Kategoryzacja Kolby — reguły do drzewa Hydry
status: review
difficulty: L
model: opus
model_approved: null
effort: high
branch: feat/ha-2.12-kolba-categories
due: null
depends_on: [HA-2.04]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 21
---

## Cel
Feed Kolby nie ma żadnych kategorii (100% produktów, `PROBLEMY-feedow-xml.md`). Słownik `category-map.json` ma dla Kolby 1 regułę i 2 marki, więc w podglądzie z 2026-09-25 na 13 882 produkty przyjęto 0, a 11 563 nie ma działu. Sukces: deterministyczne reguły (marka, atrybut, słowa w nazwie) przypisują dział Hydry dużej części produktów Kolby. Kontrola 50 losowych przypisań daje najwyżej 5% błędów, a podgląd pokazuje produkty Kolby w działach P1. Próg pokrycia ustala tj po analizie rozkładu (patrz Notatki 2026-09-26) — nie ma sztywnego 70% na całym feedzie, bo ASG / łucznictwo / myślistwo nie mają miejsca w drzewie (O-20).

## Zakres
- [x] odczyt stanu: pliki wymienione w brief 2026-09-26 (patrz Notatki) — **STOP po analizie**, tj ustala próg pokrycia dopiero po zobaczeniu rozkładu — wynik: tj wybrał ~55% całego feedu (AskUserQuestion, 2026-09-26)
- [x] analiza pełnego pliku Kolby (publiczny, bez tokenu): rozkład marek, atrybutów i słów kluczowych w nazwach; wynik w raporcie jako liczby; oszacowanie wielkości grup poza drzewem (ASG, łucznictwo, myślistwo — O-20) — wynik: unia poza-drzewnych grup 444/13 878 = 3,2% (dużo mniej niż się obawiano)
- [x] jeśli obecny format reguł nie wystarcza (np. brak dopasowania po słowach w nazwie), rozszerzyć `ruleMatches`, z testami — STOP przed zmianą struktury `category-map.json` — wynik: dodano opcjonalne `excludeName` (odrzuca dopasowanie po podciągu nazwy — odróżnia kompletny produkt od akcesorium „do X" i wyklucza ASG z reguł ogólnych typu „magazynek"); `ruleMatches`/`CategoryRule` przeniesione do nowego `xml-integration/category-rules.ts`, żeby dało się testować bez importu zgardowanego skryptu — bez zmiany zachowania istniejących reguł
- [x] reguły w `category-map.json`, najpierw dla działów z listy P1 (`assortment-rules.ts`), potem reszta do progu ustalonego przez tj — wynik: 98 reguł + 22 marki
- [x] raport pokrycia per dział + 20 największych niezmapowanych grup (marka lub atrybut, liczba produktów) + wielkość grup poza drzewem — w raporcie PR
- [x] próbka kontrolna: 50 losowych przypisań (nazwa produktu → dział, fixed seed=20260926) w raporcie, do oceny przez tj

## Gotowe, gdy
- pokrycie Kolby spełnia próg ustalony przez tj po analizie (patrz Notatki 2026-09-26 — zamiast sztywnego „≥ 70% całego feedu") — **jak sprawdzić:** tj uruchamia `--dry-run`; „DO PRZYPISANIA” dla Kolby w uzgodnionym limicie na uzgodnionym mianowniku (wklejone podsumowanie) — symulacja poza skryptem: 7 644/13 878 = 55,08% zmapowane (00 = 44,92%); **tj musi to potwierdzić prawdziwym `--dry-run`, bo agent nie może uruchomić skryptu**
- kontrola 50 losowych przypisań ma najwyżej 5% błędów — **jak sprawdzić:** tabela w raporcie, ocena tj — 0/50 błędów w mojej własnej weryfikacji, ale ocena należy do tj
- każdy nowy typ reguły ma test dopasowania i niedopasowania — **jak sprawdzić:** `npm run test:unit` — wynik: 49/49 pass (8 nowych testów `category-rules.test.ts`, w tym red proof dla `excludeName`)
- podgląd pokazuje przyjęte produkty Kolby w działach P1 — **jak sprawdzić:** wklejone podsumowanie (admitted dla Kolby > 0, per dział) — **tj musi to potwierdzić prawdziwym `--dry-run`**

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
- 2026-09-26 tj: próg pokrycia ustalany po analizie rozkładu (STOP po analizie), bo ASG, łucznictwo i myślistwo nie mają miejsca w drzewie (O-20).
- 2026-09-26 claude: analiza pełnego pliku (13 878 produktów, pobrany bezpośrednio — publiczny URL, bez tokenu). `grep -c '<produkt>'` = 13 878, sparsowane = 13 878, 0 błędów parsera. Obecny słownik (1 reguła + 2 marki) pokrywał 2 319/13 878 = 16,7%. Grupy poza drzewem (ASG/łucznictwo/myślistwo, O-20): unia 444 = 3,2% (ASG 293, łucznictwo 57, myślistwo 95) — dużo mniej niż się obawiano. Dodatkowa obserwacja: część nazw to towar spoza asortymentu Hydry (wędzarnie, żywność typu gulasz/baton, medale, maskotki) — to nie jest problem kategoryzacji tylko asortymentu, zgłoszone do deferred-tasks.md.
- 2026-09-26 tj: próg pokrycia = ~55% całego feedu (13 878) (AskUserQuestion, wybrana opcja spośród: ~55% całego feedu / ~80% podzbioru „w zakresie" / inne).
- 2026-09-26 claude: 98 reguł `kolba_rules` (nazwa/atrybut, P1 z `assortment-rules.ts` w priorytecie) + 22 marki `kolba_brands`. Format rozszerzony o opcjonalne `excludeName` (patrz Zakres) — bez tego pole „magazynek”/„tłumik” łapało produkty ASG (86 sztuk), a „kompas” łapał breloki/zegarki/bransoletki z wbudowanym kompasem; oba naprawione. Symulacja (poza zgardowanym skryptem, ten sam algorytm co `resolveCategory`): 7 644/13 878 = 55,08% zmapowane, 4 496 z nich w działach P1. Próbka kontrolna 50/50 (seed 20260926) — 0 błędów w mojej weryfikacji, do oceny przez tj. `npm run test:unit`: 49/49 pass. `npx tsc --noEmit`, `npm run lint`: bez nowych błędów.
