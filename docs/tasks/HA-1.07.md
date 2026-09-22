---
id: HA-1.07
title: CI — typy, lint, skan sekretów
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Repo nie ma żadnego CI, a tokeny w migracji 004 trafiły do publicznego repo niezauważone. Sukces: każdy PR do `main` automatycznie sprawdza typy, lint i obecność sekretów, a nowy sekret w kodzie blokuje merge.

## Zakres
- [ ] odczyt stanu bieżącego: `npm run lint` i `npx tsc --noEmit` lokalnie (za zgodą tj), żeby poznać liczbę istniejących błędów
- [ ] `.github/workflows/ci.yml`: `npm ci`, `tsc --noEmit`, `npm run lint`, gitleaks (lub odpowiednik) na diffie PR
- [ ] konfiguracja skanera z wyjątkiem tylko dla znanych tokenów w `004_xml_import_fields.sql` (zaakceptowane ryzyko), z odnośnikiem do `accepted_risks`
- [ ] jeśli istniejące błędy typów/lint blokują CI: albo naprawa (gdy mało), albo lista w raporcie i propozycja dla tj

## Gotowe, gdy
- workflow przechodzi na gałęzi zadania — **jak sprawdzić:** link do przebiegu w GitHub (github MCP) ze statusem success
- red proof: commit testowy z fałszywym sekretem (np. `SUPABASE_SERVICE_ROLE_KEY=eyJ...` o prawidłowym kształcie, wymyślony) oblewa CI — **jak sprawdzić:** link do nieudanego przebiegu; commit potem usunięty z gałęzi
- red proof: celowy błąd typu oblewa CI — **jak sprawdzić:** jak wyżej
- historia z 004 nie oblewa CI — **jak sprawdzić:** przebieg zielony mimo pliku 004

## Poza zakresem
- testy e2e w CI → HA-1.08
- ochrona gałęzi `main` w ustawieniach GitHub (wymagane checki) → zmiana ustawień robi tj; w raporcie podaj instrukcję

## Bramki STOP
- przed dodaniem jakichkolwiek sekretów do GitHub Actions — nie dodawaj; to zadanie nie potrzebuje sekretów
- nie wklejaj prawdziwych tokenów z `.env.local` do testu skanera

## Kontekst
- `package.json`, `eslint.config.mjs`, `tsconfig.json`
- project.md → `security.accepted_risks`

## Notatki z realizacji
