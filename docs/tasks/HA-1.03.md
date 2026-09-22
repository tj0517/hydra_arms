---
id: HA-1.03
title: Funkcje SECURITY DEFINER — search_path i odebranie publicznego wywołania
status: todo
difficulty: S
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-1.01]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: null
---

## Cel
Dwie funkcje działające z uprawnieniami właściciela, `create_user_profile` (001) i `next_xml_product_id` (004), nie mają ustalonej ścieżki wyszukiwania i można je wywołać publicznie. Pierwsza daje furtkę do podmiany obiektów, druga pozwala każdemu „spalać” numerację produktów przez API. Wzorzec jest w 006 (`checkout_create_order`). Sukces: obie funkcje są utwardzone tak jak 006, a rejestracja użytkownika i import XML działają dalej.

## Zakres
- [ ] odczyt stanu bieżącego: definicje i uprawnienia obu funkcji z HA-1.01 (baseline); **diff definicji względem baseline pokazany przed napisaniem migracji**
- [ ] nowa migracja `009_harden_security_definer.sql`: `SET search_path = public` (lub `''` z kwalifikowanymi nazwami) dla obu funkcji; `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` dla `next_xml_product_id` i `GRANT ... TO service_role`; dla `create_user_profile` (funkcja wyzwalacza) odebranie wywołania przez API
- [ ] sprawdzenie, kto wywołuje `next_xml_product_id` (`grep -rn next_xml_product_id`) — musi to być klient service role

## Gotowe, gdy
- red proof: anon nie może wywołać `next_xml_product_id` — **jak sprawdzić:** wklejony wynik `SELECT has_function_privilege('anon', 'next_xml_product_id()', 'EXECUTE')` na prod przed wdrożeniem (true) i po nim (false); sam odczyt
- rejestracja nadal tworzy profil — **jak sprawdzić:** po wdrożeniu wklejony `pg_get_functiondef` (ciało bez zmian, poza ustawieniami) oraz ręczna rejestracja testowego konta wykonana przez tj (zapis na prod, więc robi ją tj, nie agent)
- `proconfig` obu funkcji zawiera `search_path` — **jak sprawdzić:** wklejony wynik `SELECT proname, proconfig FROM pg_proc WHERE proname IN (...)`
- istniejące migracje nietknięte — **jak sprawdzić:** `git diff main --stat -- supabase/migrations` pokazuje tylko nowy plik

## Poza zakresem
- `checkout_create_order` → już utwardzona; zmiany statusów → HA-2.01
- RLS `source_connectors` → HA-1.02

## Bramki STOP
- przed napisaniem migracji — pokaż diff definicji względem baseline (zmiana funkcji)
- przed wdrożeniem 009 na prod — pokaż migrację i odczyty „przed”, czekaj na akceptację

## Kontekst
- `supabase/migrations/001_shop_schema.sql` (l. 65–75), `004_xml_import_fields.sql` (l. 16–20), `006_checkout_atomic.sql` (wzorzec REVOKE/GRANT)
- `supabase/baseline/` (z HA-1.01)
- stała reguła: stan bazy ustalasz bieżącym odczytem, nigdy z pamięci, notatek ani pliku typów

## Notatki z realizacji
