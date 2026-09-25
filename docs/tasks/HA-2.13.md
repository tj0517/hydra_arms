---
id: HA-2.13
title: hydra-categories.json do repo i weryfikacja z BaseLinkerem
status: review
difficulty: S
model: claude-sonnet-4-6
model_approved: null
effort: low
branch: chore/ha-2.13-hydra-categories
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: true
pr: 19
---

## Cel
Import na żywo potrzebuje mapy „numer działu Hydry → ID kategorii w BaseLinkerze". Plik jest tylko na serwerze (`~/hydra/xml-integration/hydra-categories.json`, 2026-07-24, 4 KB), a drzewo w BL (katalog 107789) zbudowano 24.07. Import z 24.07 sypał błędami „Tag with given name does not exists". Sukces: plik jest w repo, zgadza się z aktualnym BaseLinkerem i z drzewem w `hydra-category-tree.txt`, a wiadomo, których tagów importu brakuje w BL. Zadanie tylko czyta produkcję (BaseLinker), nic w niej nie zmienia.

## Zakres
- [x] odczyt stanu: `scripts/bl-build-categories.ts`, `HydraTree`, `computeTags`, `IMPORT_OWNED_TAGS` w `scripts/xml-to-baselinker.ts`
- [x] tj kopiuje plik z serwera: `scp hydra-srv:hydra/xml-integration/hydra-categories.json xml-integration/`. Agent nie łączy się z serwerem
- [x] skrypt tylko do odczytu (np. `scripts/bl-verify-categories.ts`): porównuje plik z kategoriami w BL (`getInventoryCategories`) i z drzewem z txt, sprawdza istnienie tagów używanych przez import (`auto`, `review`, `flag`, `age_18`, `approved`). Uruchamia tj, bo hook blokuje skrypty
- [ ] raport: numery bez ID, ID bez numeru, rozjazdy nazw, brakujące tagi

## Gotowe, gdy
- plik w repo, każdy numer z `hydra-category-tree.txt` ma ID — **jak sprawdzić:** test jednostkowy porównujący plik z drzewem txt (`npm run test:unit`)
- zgodność z BaseLinkerem — **jak sprawdzić:** wklejony wynik skryptu (uruchomionego przez tj): 0 rozjazdów albo ich lista
- lista tagów importu obecnych i brakujących w BL — **jak sprawdzić:** w tym samym wyniku
- red proof: podmieniony ID w kopii pliku → skrypt zgłasza rozjazd — **jak sprawdzić:** wklejony wynik na zepsutej kopii

## Poza zakresem
- tworzenie brakujących tagów lub kategorii w BL (zapis na prod) → osobna decyzja tj po raporcie
- inwentaryzacja produktów w BL → HA-2.14

## Bramki STOP
- skrypt nie wywołuje żadnej metody zapisującej BaseLinkera (`add*`, `update*`, `delete*`); w raporcie lista wszystkich wywołań BL
- przed utworzeniem czegokolwiek w BL — STOP, decyzja tj

## Kontekst
- `scripts/bl-build-categories.ts`, `scripts/xml-to-baselinker.ts`, `src/lib/baselinker/client.ts`
- `xml-integration/hydra-category-tree.txt`
- `docs/deferred-tasks.md` (wpis HA-2.04 o `hydra-categories.json`)

## Notatki z realizacji
- 2026-09-25 tj: plik `hydra-categories.json` istnieje na serwerze 51.83.134.183 (2026-07-24); drzewo w BL zbudowane 24.07 (fallback „00" → BL 8926520).
- 2026-09-25 agent: parser comparison — `parseTree` (bl-build-categories.ts) i `parseHydraTreeNumbers` (hydra-tree-txt.ts) dają identyczny zbiór 205 numerów po `normNum` (0 różnic). `getInventoryTags` to metoda tylko do odczytu w BL API. Wyniki live run oczekują na wklejenie przez tj.
