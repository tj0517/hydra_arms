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
| HA-2.01 | Zamówienie czeka na płatność — nowy status, BL dopiero po opłaceniu | done | L | HA-1.01, HA-1.06 | — | — |
| HA-2.02 | Koszty i metody dostawy w checkoucie | todo | M | HA-2.01, HA-2.16 | — | — |
| HA-2.03 | Płatność Przelewy24 — adapter z trybem mock | done | L | HA-2.01 | — | — |
| HA-2.04 | Filtr asortymentu w imporcie | done | L | HA-1.05 | — | — |
| HA-2.05 | Marże per hurtownia (i ewentualnie per kategoria) | todo | S | HA-2.04, HA-2.16 | — | — |
| HA-2.06 | Compliance — wymuszenie odbioru osobistego (pozwolenie, rejestracja, 18+) | todo | M | HA-1.06, HA-2.17 | — | — |
| HA-2.07 | Maile — potwierdzenie zamówienia i płatności | done | M | HA-2.03 | — | — |
| HA-2.08 | Tryb weryfikacji P24 — mock, telefon, strony prawne | todo | M | HA-2.03, HA-2.07, HA-2.16 | — | — |
| HA-2.09 | Start sprzedaży — przełączenie na produkcję | todo | M | HA-1.02, HA-1.03, HA-1.07, HA-2.02, HA-2.03, HA-2.04, HA-2.05, HA-2.06, HA-2.07, HA-2.08, HA-2.15, HA-2.16, HA-2.19, HA-2.20, HA-2.21, HA-2.23 | — | — |
| HA-2.10 | Filtry katalogu dla podkategorii P1 | done | L | HA-2.04 | — | — |
| HA-2.11 | Spechurt — podgląd i walidacja na aktualnym feedzie z serwera | done | S | HA-2.04 | — | — |
| HA-2.12 | Kategoryzacja Kolby — reguły do drzewa Hydry | done | L | HA-2.04 | — | — |
| HA-2.13 | hydra-categories.json do repo i weryfikacja z BaseLinkerem | done | S | — | — | — |
| HA-2.14 | Inwentaryzacja BaseLinkera (tylko odczyt) | done | S | HA-2.13 | — | — |
| HA-2.15 | Import hurtowni na serwerze — cron sync i import | todo | M | HA-2.11, HA-2.13, HA-2.14, HA-2.18, HA-2.26 | O-19 | — |
| HA-2.16 | Rejestr inputów i guard placeholderów | done | M | — | — | — |
| HA-2.17 | Flagi pozwolenia i 18+ — import, sync, override w BaseLinkerze | done | M | HA-2.04 | — | — |
| HA-2.18 | Taksonomia P1 wg arkusza korekty z domyślnymi priorytetami | done | M | HA-2.04, HA-2.25 | — | — |
| HA-2.19 | Podpisany link statusu zamówienia dla gościa | todo | M | HA-2.07 | — | — |
| HA-2.20 | Hardening P24 — notify tylko z IP P24, RLS koszyków, guard licznika BL | done | M | HA-2.03 | — | feat/ha-2.20-p24-hardening, PR #30 |
| HA-2.21 | Domena główna z jednej zmiennej i ujednolicone e-maile | todo | S | HA-2.16 | O-31 | — |
| HA-2.22 | Marże sterowane arkuszem (wymienne źródło wartości) | todo | M | HA-2.05 | O-32 | — |
| HA-2.23 | Test płatności na prawdziwym sandboxie P24 | todo | S | HA-2.08, HA-2.20 | O-09 | — |
| HA-2.24 | Gałęzie ASG, łucznictwo i myślistwo w drzewie kategorii | todo | S | HA-2.18, HA-2.17 | O-20 | — |
| HA-2.25 | Gałęzie 01/02 w filtrze asortymentu po O-11/O-27 + czarnoprochowa Kolby | done | M | HA-2.04, HA-2.17 | — | — |
| HA-2.26 | BL klienta: kategorie i tagi w katalogu 119068, odczyt ID konta | todo | S | HA-2.14 | — | — |
