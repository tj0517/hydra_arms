---
id: HA-1.07
title: CI — typy, lint, skan sekretów
status: review
difficulty: M
model: claude-sonnet-4-6
model_approved: null
effort: medium
branch: chore/ha-1.07-ci
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 6
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

- 2026-09-22 · decyzja tj: Option B — fix the 26 mechanical errors (no-unescaped-entities, jsx-no-comment-textnodes, no-explicit-any); for jsx-no-comment-textnodes decide per hit whether the `//` text is visible (→ string literal) or a developer comment (→ JSX comment); add `eslint-disable-next-line <rule>` with "pre-existing, fixed in HA-1.10" on the 10 non-trivial React lines; add HA-1.10 deferred entry listing all 10 lines; paste lint+tsc output after fixes.
- 2026-09-22 · po poprawkach: `npm run lint` → 0 errors, 34 warnings (pre-existing, no rules downgraded); `npx tsc --noEmit` → 0 errors. 9×no-unescaped-entities (HTML entity), 10×jsx-no-comment-textnodes (all visible → string literal), 7×no-explicit-any (typed casts in bl scripts), 10×eslint-disable-next-line dla React compiler rules.
- 2026-09-22 · `.github/workflows/ci.yml` stworzony: npm ci, tsc --noEmit, npm run lint, gitleaks binary 8.18.4 (bez akcji, bez licencji). `.gitleaks.toml` z path-allowlistem na 004_xml_import_fields.sql i xml-integration/samples/.
- 2026-09-22 · red proof #1 — fake secret (Supabase service_role JWT, ref: fakeprojctxforredproof) w .ts: CI oblał na Secret scan (run 35735686450, PR #6). Cofnięty. Uwaga: konfiguracja gitleaks musi zawierać [extend] useDefault = true — bez tego brak reguł wykrywania.
- 2026-09-22 · red proof #2 — celowy błąd typów (string do number): CI oblał na Type check (run 35735920411, PR #6). Cofnięty.
- 2026-09-22 · finalne CI zielone (run 35736772796, PR #6): tsc ✓, lint ✓ (0 errors), gitleaks ✓.
- 2026-09-22 · review tj (PR #6): 4 poprawki wymagane w tym samym PR bez force push. (1) Skan sekretów musi działać w trybie git (--log-opts), nie --no-git — sekret dodany i cofnięty w PR zostaje w historii git. (2) Allowlist XML zawężony do dwóch konkretnych plików (sharg_full_sample.xml, sharg_gateway_sample.xml). (3) permissions: contents: read + weryfikacja sumy kontrolnej tarballa gitleaks przed rozpakowaniem. (4) Status review, pr: 6, wpis w INDEX. Przed allowlistowaniem: reguła jwt wystrzelona na commitach b7e1059, ea4aa4f, 858deaa — pełne SHA dodane jako commits w .gitleaks.toml. Lokalny skan git-mode zielony: 8 commitów, 0 wycieków.
- 2026-09-22 · poprawki review wdrożone (commit c01339b + 394595d). Finalne CI zielone po review (run 35741709534, PR #6): tsc ✓, lint ✓, gitleaks git-mode ✓ (checksum verified). Plik checksums ma nazwę gitleaks_VERSION_checksums.txt (nie checksums.txt) — poprawiono w 394595d.
