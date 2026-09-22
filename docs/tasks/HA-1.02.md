---
id: HA-1.02
title: source_connectors — RLS i usunięcie tokenów z wierszy
status: review
difficulty: M
model: sonnet
model_approved: null
effort: medium
branch: fix/ha-1.02-source-connectors-lockdown
due: null
depends_on: [HA-1.01]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: 8
---

## Cel
Migracja 004 utworzyła tabelę `source_connectors` bez RLS i wpisała do niej adresy feedów Sharg i Spechurt razem z tokenami. Kod bierze dziś te adresy z env (`xml-integration/connectors/*.ts`), więc tokeny w bazie są niepotrzebne. Jeśli RLS na prod jest wyłączony, każdy z publicznym kluczem ze strony może je odczytać. Sukces: publiczny klucz nie widzi tej tabeli, a jej wiersze nie zawierają tokenów.

## Zakres
- [ ] odczyt stanu bieżącego: wynik HA-1.01 dla `source_connectors`; `grep -rn source_connectors src scripts xml-integration`, żeby ustalić, kto czyta i pisze tę tabelę i czy ktoś czyta z niej `xml_url`
- [ ] nowa migracja `008_source_connectors_lockdown.sql`: `ENABLE ROW LEVEL SECURITY` bez polityk dla anon/authenticated (dostęp tylko service role); `xml_url` i adresy w `extra_config` bez parametrów `token`/`key` (np. adres bazowy albo znacznik „z env”)
- [ ] jeśli jakiś kod czyta `xml_url` z bazy: przestawienie go na konfigurację z env
- [ ] `src/lib/supabase/types.ts` zgodny ze zmianą (jeśli zmienia się typ)
- [ ] skrypt tylko do odczytu (`scripts/check-anon-access.ts`), który próbuje czytać `source_connectors` kluczem anon i wypisuje liczbę wierszy, bez wartości

## Gotowe, gdy
- red proof: odczyt `source_connectors` kluczem anon zwraca 0 wierszy albo błąd, a przed migracją zwracał wiersze (albo HA-1.01 pokazał, że RLS był już włączony) — **jak sprawdzić:** wklejony wynik odczytu kluczem anon na prod przed wdrożeniem i po nim (sam odczyt, bez zapisu)
- żaden wiersz nie zawiera `token=` ani `key=` — **jak sprawdzić:** wklejony wynik `SELECT count(*) FROM source_connectors WHERE xml_url ~ '(token|key)=' OR extra_config::text ~ '(token|key)='` = 0
- sync (engine) nadal zapisuje statystyki do tabeli (działa na service role) — **jak sprawdzić:** `grep` ścieżki zapisu + wskazanie w kodzie, że zapis idzie przez klienta service role (`src/lib/supabase/admin.ts` lub skrypt), plus po wdrożeniu wklejony `last_synced_at` po najbliższym syncu
- migracja 004 nietknięta — **jak sprawdzić:** `git diff main -- supabase/migrations/004_xml_import_fields.sql` pusto

## Poza zakresem
- rotacja tokenów u dostawców → zaakceptowane ryzyko (project.md, `accepted_risks`)
- przepisywanie historii gita → nie robimy
- funkcje SECURITY DEFINER → HA-1.03
- usunięcie kolumny `xml_url` → ewentualnie osobne zadanie po decyzji tj

## Bramki STOP
- przed wdrożeniem migracji 008 na prod — pokaż treść migracji i wynik odczytu anon „przed”, czekaj na akceptację; wdrożenie ręczne (lokalna baza powstaje dopiero w HA-1.06)
- przed jakimkolwiek UPDATE/DELETE na prod poza migracją — nie wykonuj
- nie wypisuj tokenów w logach, raporcie ani diffie

## Kontekst
- `supabase/migrations/004_xml_import_fields.sql` — skąd tokeny
- `xml-integration/connectors/sharg.ts`, `spechurt.ts`, `xml-integration/engine.ts`, `src/app/api/xml/sync/route.ts`
- `supabase/baseline/README.md` (z HA-1.01)
- stała reguła: stan bazy ustalasz bieżącym odczytem, nigdy z pamięci, notatek ani pliku typów

## Notatki z realizacji
