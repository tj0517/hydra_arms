# Hydra Arms — zadania

Widok dla ludzi. Przy rozbieżności rozstrzyga frontmatter pliku zadania.
Etap 1: bezpieczny fundament (audyt 2026-09-22). Etap 2: płatności i uruchomienie sklepu.

| id | tytuł | status | trudność | zależności | pytania | due |
|---|---|---|---|---|---|---|
| HA-1.01 | Baseline schematu prod i raport rozjazdu z migracjami | done | S | — | — | — |
| HA-1.02 | source_connectors — RLS i usunięcie tokenów z wierszy | done | M | HA-1.01 | — | — |
| HA-1.03 | Funkcje SECURITY DEFINER — search_path i odebranie publicznego wywołania | done | S | HA-1.01 | — | — |
| HA-1.04 | Guard agenta — hook blokujący zapisy na prod | done | M | — | — | — |
| HA-1.05 | Bezpiecznik prod w skryptach i testach | done | M | — | — | — |
| HA-1.06 | Lokalny stack Supabase z seedem; testy na lokalnej bazie | done | L | HA-1.01, HA-1.05, HA-1.11 | — | — |
| HA-1.07 | CI — typy, lint, skan sekretów | done | M | — | — | — |
| HA-1.08 | CI — testy sklepu na lokalnym stacku | done | M | HA-1.06, HA-1.07 | — | — |
| HA-1.09 | Higiena — server-only w kliencie admin i poprawki CLAUDE.md | done | S | — | — | — |
| HA-1.10 | Poprawki React — 10 wyłączonych reguł lint (efekty, czystość renderu, komponenty w renderze) | todo | M | HA-1.06, HA-1.07 | — | — |
| HA-1.11 | Hook agenta — wyjątek dla lokalnej bazy i fałszywy alarm na treści commitów | done | M | — | — | — |
| HA-2.01 | Zamówienie czeka na płatność — nowy status, BL dopiero po opłaceniu | review | L | HA-1.01, HA-1.06 | — | — |
| HA-2.02 | Koszty i metody dostawy w checkoucie | todo | M | HA-2.01 | O-10 | — |
| HA-2.03 | Płatność Przelewy24 — adapter z trybem mock | todo | L | HA-2.01 | — | — |
| HA-2.04 | Filtr asortymentu w imporcie | todo | M | HA-1.05 | O-04 | — |
| HA-2.05 | Marże per hurtownia (i ewentualnie per kategoria) | todo | S | HA-2.04 | O-07 | — |
| HA-2.06 | Compliance — wymuszony odbiór osobisty dla kategorii 01/02 i potwierdzenie 18+ | todo | M | HA-1.06 | O-11 | — |
| HA-2.07 | Maile — potwierdzenie zamówienia i płatności | todo | M | HA-2.03 | O-13 | — |
| HA-2.08 | Tryb weryfikacji P24 — sandbox, telefon, strony prawne | todo | M | HA-2.03, HA-2.07 | O-09, O-13 | — |
| HA-2.09 | Start sprzedaży — przełączenie na produkcję | todo | M | HA-1.02, HA-1.03, HA-1.07, HA-2.02, HA-2.03, HA-2.04, HA-2.05, HA-2.06, HA-2.07, HA-2.08 | — | — |
| HA-2.10 | Filtry katalogu dla podkategorii P1 | todo | L | HA-2.04 | — | — |
