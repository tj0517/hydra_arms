---
id: HA-1.01
title: Baseline schematu prod i raport rozjazdu z migracjami
status: review
difficulty: S
model: sonnet
model_approved: null
effort: medium
branch: chore/prod-schema-baseline
due: null
depends_on: []
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: null
---

## Cel
Nie wiemy, jak naprawdę wygląda baza prod (`breqmmlcaxsvxcqlcmqc`). Migracje 001–007 były wdrażane ręcznie, a dumpa schematu nie ma. Kolejne zadania zmieniają funkcje i polityki bezpieczeństwa (RLS), więc najpierw potrzebny jest punkt odniesienia. Sukces: w repo jest zrzut schematu prod i raport, który mówi, czym prod różni się od migracji. Wiemy też, czy tabela `source_connectors` jest czytelna publicznym kluczem i czy jej wiersze nadal zawierają tokeny dostawców.

## Zakres
- [ ] odczyt stanu bieżącego: `ls supabase/migrations`, `supabase/.temp/project-ref`, czy CLI jest podlinkowane do `breqmmlcaxsvxcqlcmqc`
- [ ] zrzut samego schematu prod (bez danych), tylko do odczytu, do `supabase/baseline/prod-schema-<RRRR-MM-DD>.sql`
- [ ] zapytania SELECT: `relrowsecurity` dla wszystkich tabel w `public`, `pg_policies`, uprawnienia EXECUTE funkcji (`create_user_profile`, `next_xml_product_id`, `checkout_create_order`, `update_updated_at`), definicje tych funkcji (`pg_get_functiondef`)
- [ ] dla `source_connectors`: liczba wierszy oraz to, czy `xml_url` / `extra_config` zawierają `token=` lub `key=`, jako wynik tak/nie, **bez wypisywania wartości**
- [ ] raport `supabase/baseline/README.md`: z jakiej daty jest zrzut, jak go odtworzyć i czym prod różni się od migracji 001–007
- [ ] uzupełnienie `db.baseline` w project.md: propozycja diffu dla tj (zapis w repo workflow robi tj)

## Gotowe, gdy
- plik zrzutu istnieje, zawiera tabele i funkcje z 001–007 i nie zawiera danych — **jak sprawdzić:** `grep -c 'CREATE TABLE' supabase/baseline/*.sql` ≥ 7; `grep -n -E '^(INSERT INTO|COPY) ' supabase/baseline/*.sql` zwraca pusto (INSERT wewnątrz funkcji jest dozwolony)
- w zrzucie ani w raporcie nie ma tokenów — **jak sprawdzić:** `grep -rn -E '(token|key)=[A-Za-z0-9_-]{6,}' supabase/baseline/` zwraca pusto (tekst zapytania typu `'%token=%'` nie jest wartością)
- raport zawiera wklejone wyniki zapytań o RLS, polityki i uprawnienia funkcji (surowy wynik, nie streszczenie) — **jak sprawdzić:** czytelnie w README, sekcja „Odczyty”
- raport jednoznacznie odpowiada na dwa pytania: czy RLS na `source_connectors` jest włączony (tak/nie) i czy wiersze zawierają tokeny (tak/nie) — **jak sprawdzić:** wklejony wynik zapytania
- lista rozjazdów prod ↔ migracje (albo „brak”) — **jak sprawdzić:** sekcja „Rozjazd” w README

## Poza zakresem
- włączenie RLS / czyszczenie tokenów → HA-1.02
- poprawki funkcji SECURITY DEFINER → HA-1.03
- lokalna baza z tego zrzutu → HA-1.06
- naprawianie rozjazdów → nowe zadanie po decyzji tj

## Bramki STOP
- przed jakimkolwiek poleceniem innym niż odczyt na prod (w tym `db push`, `migration repair`, SQL inny niż SELECT) — nie wykonuj, zgłoś
- jeśli zrzut wymaga hasła do bazy, którego nie ma w env — zatrzymaj się i poproś tj, nie szukaj go w plikach

## Kontekst
- `CLAUDE.md` — architektura
- `supabase/migrations/001_shop_schema.sql`, `004_xml_import_fields.sql`, `006_checkout_atomic.sql` — co powinno być na prod
- stała reguła: stan bazy ustalasz bieżącym odczytem, nigdy z pamięci, notatek ani `src/lib/supabase/types.ts`

## Notatki z realizacji

**2026-09-22, decyzja tj:** odblokowano zadanie.
1. `.mcp.json` definiuje `supabase-prod` (read-only, `project_ref=breqmmlcaxsvxcqlcmqc`), tj uwierzytelnił połączenie. Preflight potwierdzony: `execute_sql` przez `supabase-prod` zwraca dane z żywej bazy; inne serwery Supabase (`supabase`, `claude_ai_Supabase`) są ignorowane w tym zadaniu.
2. `SUPABASE_DB_PASSWORD` wyeksportowany w shellu, wyłącznie do jednej komendy: `supabase db dump --linked -f supabase/baseline/prod-schema-<data>.sql` (schema-only, bez `--data-only`/`--use-copy`).
3. Zabronione z tym hasłem: `psql`, `db push`, `db reset`, `migration repair`, `db pull`, zmiany `supabase link`, `scripts/*.ts`, inne polecenia łączące się z bazą zdalną.
4. Wszystkie SELECT-y przez `supabase-prod` MCP, wklejane z wynikiem.
5. Błąd dumpa → STOP i wklejenie dokładnego błędu, bez prób alternatywnych metod połączenia.
- 2026-09-22 tj: kryteria „brak danych” i „brak tokenów” zawężone (INSERT w treści funkcji 001/006; zapytanie w raporcie zawiera `token=`); model Sonnet · medium; bierzemy przed HA-1.04 (bez guarda, bramki tylko w prompcie)
