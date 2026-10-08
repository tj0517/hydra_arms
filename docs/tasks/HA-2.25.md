---
id: HA-2.25
title: Gałęzie 01/02 w filtrze asortymentu po O-11/O-27 + czarnoprochowa Kolby
status: review
difficulty: M
model: claude-fable-5-1
model_approved: null
effort: medium
branch: feat/ha-2.25-firearms-branches
due: null
depends_on: [HA-2.04, HA-2.17]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 34
---

## Cel
Filtr asortymentu (HA-2.04) wyklucza całe gałęzie 01 (broń palna) i 02 (amunicja) „do czasu rozstrzygnięcia O-11”. O-11 i O-27 są rozstrzygnięte (2026-10-06: pozwolenie, rejestracja lub 18+ → odbiór osobisty), a HA-2.17 nadaje tagi `permit` — ale nie ma na czym: dry-run Kolby 2026-10-08 dał grupę A = 0. Sukces: węzły 01/02, które nasze hurtownie realnie mapują, wchodzą do importu z tagiem `permit`; Kolba dostaje reguły dla broni czarnoprochowej; w kodzie nie zostaje żaden „pending O-11”.

## Zakres
- [x] odczyt stanu bieżącego: `xml-integration/assortment-rules.ts` (blok „WYKLUCZONE PENDING O-11”), `category-map.json` (mapowania Sharg/Spechurt do 1.x/2.x, brak reguł Kolby), `docs/research/taksonomia-p1.md` (wiersze 01/02), O-11, O-27, test `assortment-filter.test.ts`
- [x] `allowedHydraNums` += `1.3`, `1.4`, `1.5`, `2.5`, `2.6` (decyzja tj 2026-10-08: węzły obecne u ≥1 hurtowni + spłonki/prochy), każdy z komentarzem skąd; usunięty blok „pending O-11”; wiersze `1.1`, `1.1.2`, `1.2` z notatki HA-2.04 **nie** wracają (brak hurtowni) — komentarz, że czekają na HA-2.18
- [x] `taksonomia-p1.md`: wiersze 1.3/1.4/1.5/2.5/2.6 oznaczone jako w filtrze (obecność u hurtowni wg `category-map.json`)
- [x] `kolba_rules` w `category-map.json`: reguły nazwowe dla broni czarnoprochowej i jej amunicji → `1.4` (rewolwery, karabiny czarnoprochowe, repliki) i `2.6` (kapiszony, proch czarny, spłonki); reguły z `review: true` tam, gdzie fraza może łapać akcesoria
- [x] test w `assortment-filter.test.ts`: po jednym produkcie dla każdego z pięciu węzłów = admitted; `2.1` nadal dropped (`not_p1`)
- [x] test w `category-rules.test.ts`: po jednej nazwie Kolby → `1.4`, → `2.6`, oraz nazwa-pułapka (np. „olej do broni czarnoprochowej”) → nie 1.4
- [ ] komenda dry-run dla tj (`kolba --dry-run`, `sharg --dry-run`) i odczyt jej wyniku

## Gotowe, gdy
- `grep -n "'1\.\|'2\." xml-integration/assortment-rules.ts` zwraca dokładnie 5 wierszy (1.3, 1.4, 1.5, 2.5, 2.6) z komentarzami — **jak sprawdzić:** wklejony grep
- `grep -rniE 'pending O-11' xml-integration src` pusty — **jak sprawdzić:** wklejony grep
- test filtru: 5 produktów admitted (po jednym na węzeł), `2.1` dropped — **jak sprawdzić:** nazwy testów w wyniku `npm run test:unit`
- red proof reguł Kolby: nazwa-pułapka nie trafia do 1.4/2.6 — **jak sprawdzić:** test w `category-rules.test.ts`
- grupa A > 0 na realnych danych: dry-run `kolba` i `sharg` na pełnym feedzie pokazuje `permit groups: A=…` > 0 i w tabeli produkty z 1.4/1.5/2.5/2.6 z tagiem `permit` — **jak sprawdzić:** tj uruchamia z terminala (hook blokuje skrypt w sesji agenta), wkleja blok `permit tags:` + tabelę; agent porównuje z regułami
- pełny zestaw testów zielony — **jak sprawdzić:** `npm run test:unit` raz na końcu

## Poza zakresem
- priorytety P1/P2 nowych podkategorii z arkusza korekty i wiersze 1.1/1.1.2/1.2 → HA-2.18
- zapis do BaseLinkera na żywo → HA-2.15 (bramka STOP)
- zmiana grup A–D w `permit-rules.ts` → dane z HA-2.17, osobna decyzja tj
- szersze porządki w `category-map.json` (6 609 niezmapowanych Kolby) → narzędzie katalogowe z deferred HA-2.12
- wymuszenie odbioru w checkoucie → HA-2.06

## Bramki STOP
- każde wywołanie zapisujące BaseLinker (tylko testy i dry-run tj)
- przed dopisaniem węzła 01/02 spoza listy pięciu — decyzja tj

## Kontekst
- `xml-integration/assortment-rules.ts`, `assortment-filter.ts`, `__tests__/assortment-filter.test.ts` — filtr i jego testy
- `xml-integration/category-map.json`, `category-rules.ts`, `__tests__/category-rules.test.ts` — reguły Kolby
- `xml-integration/permit-rules.ts` — grupy A–D (1.3/1.5/2.5/2.6 → A, 1.4 → C)
- `docs/research/taksonomia-p1.md` — wiersze 01/02 „brak naszych hurtowni”
- `docs/04-open-questions.md` → O-11, O-27, O-29

## Notatki z realizacji
- 2026-10-08 tj (wf-plan): osobne zadanie (nie część HA-2.18); węzły = te, które hurtownie realnie mapują (1.3, 1.4, 1.5, 2.5, 2.6), nie pięć z notatki HA-2.04; reguły Kolby dla czarnoprochowej w zakresie.
- 2026-10-08 agent: bramka STOP „węzeł spoza listy pięciu” nie uruchomiona — dopisano dokładnie 1.3 / 1.4 / 1.5 / 2.5 / 2.6. Interpretacje bez decyzji tj (do potwierdzenia w review): (a) „repliki” w regule 1.4 = repliki czarnoprochowe (łapie je ogólna reguła „czarnoprochow” → 1.4 + review); dekoracyjne repliki (Denix, lp 254 → 00) i ASG celowo poza regułą; (b) wiersze 1.5 i 2.5 w `taksonomia-p1.md` dodane z Lp „—” (nie ma ich w arkuszu P1), nie wliczone do 175; (c) kolumny ✓ dla pięciu wierszy oznaczają mapowanie w `category-map.json`, nie „Inspirację rynkową” — zapisane w legendzie; (d) reguła „proch bezdymny” nie dodana (poza wymienionymi trzema) — w deferred.
- 2026-10-08 agent: model faktyczny = claude-fable-5-1 (prompt zakładał Sonnet); dry-run kolba/sharg do uruchomienia przez tj — porównanie z regułami po wklejeniu.
- 2026-10-08 tj (review): dry-run sharg A=289 C=4, kolba A=3 C=14 (C bez zmian — reguły 1.4 nie trafiły żadnego produktu Kolby); tabela permit drukuje tylko 40 wierszy, więc wierszy 1.x/2.x nie widać. Dopisek w tym PR: flaga `--sections=1,2` (tylko dry-run, read-only) drukująca wszystkie wiersze tabeli permit dla wskazanych sekcji; porównanie wierszy z regułami po wklejeniu; decyzja o prochu bezdymnym czeka na te wiersze; żadnej reguły nie poszerzać bez decyzji tj.
