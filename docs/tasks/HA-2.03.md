---
id: HA-2.03
title: Płatność Przelewy24 — adapter z trybem mock
status: in_progress
difficulty: L
model: claude-sonnet-4-6
model_approved: null
effort: high
branch: feat/ha-2.03-p24-mock
due: null
depends_on: [HA-2.01]
blocked_by_questions: []
touches_db: true
touches_prod: false
pr: null
---

## Cel
Sklep musi przyjmować płatności P24 przed końcem projektu, ale konto P24 jest dopiero w trakcie zakładania (O-09). Budujemy więc pełną integrację już teraz, z trybem mock: sztuczną stroną płatności i sztucznym, poprawnie podpisanym powiadomieniem, które przechodzą przez **ten sam** kod weryfikacji co prawdziwe P24. Sukces: w trybie mock cała ścieżka działa end-to-end. Zamówienie staje się opłacone wyłącznie po zweryfikowanym powiadomieniu (podpis, kwota), a przejście na sandbox lub prod to tylko zmiana env (HA-2.08, HA-2.09).

## Zakres
- [ ] odczyt stanu bieżącego: zmienne `P24_*` w `.env.local.example`, ścieżka checkout → potwierdzenie, `mark_order_paid` z HA-2.01; aktualna dokumentacja API P24 (context7/docs): rejestracja transakcji, `urlStatus`, podpis CRC, `verify`
- [ ] `src/lib/p24/`: rejestracja transakcji, podpis, weryfikacja; klucze tylko z env, tylko po stronie serwera; przełącznik `P24_MODE=mock|sandbox|production`
- [ ] tryb mock: lokalna strona „zapłać / odrzuć” + wysyłka powiadomienia podpisanego testowym CRC na prawdziwy endpoint notify; `verify` odpowiada mock; mock niedostępny, gdy `P24_MODE≠mock`
- [ ] `POST /api/shop/payments/p24/notify`: weryfikacja podpisu, kwoty i waluty względem zamówienia, idempotentność, potem `mark_order_paid`
- [ ] checkout → przekierowanie na stronę płatności (mock/P24); strona powrotu pokazuje stan z bazy, nie z parametrów URL
- [ ] kolumny lub tabela na identyfikator transakcji (migracja, jeśli potrzebna)
- [ ] test e2e ścieżki w trybie mock na lokalnym stacku

## Gotowe, gdy
- pełna ścieżka w trybie mock: zamówienie → strona płatności → powiadomienie → `paid` → mock BL — **jak sprawdzić:** test e2e + zrzuty z Playwright MCP + wklejony SELECT
- red proof: powiadomienie ze złym podpisem → 4xx, status bez zmian — **jak sprawdzić:** test API
- red proof: powiadomienie z inną kwotą niż zamówienie → odrzucone — **jak sprawdzić:** test API
- red proof: powtórzone powiadomienie → BL mock counter dla tego zamówienia = 1 i `baselinker_order_id` bez zmian po drugim — **jak sprawdzić:** test *(opcja B, 2026-09-24: BL mock nie miał licznika; tj dodaje licznik)*
- red proof: BL mock counter niedostępny gdy `BASELINKER_MOCK≠true` (404) — **jak sprawdzić:** test
- red proof: `?status=success` dopisane ręcznie do adresu powrotu nie oznacza zamówienia jako opłaconego — **jak sprawdzić:** test
- red proof: strona mock zwraca 404, gdy `P24_MODE=production` — **jak sprawdzić:** test
- `grep -rn P24_ src` — klucze tylko w plikach serwerowych — **jak sprawdzić:** wklejone wyjście

## Poza zakresem
- podpięcie danych sandbox P24 i test na prawdziwym sandboxie → HA-2.08 (po O-09)
- klucze produkcyjne → HA-2.09
- zwroty przez API P24 → odłożone
- maile po płatności → HA-2.07

## Bramki STOP
- przed wpisaniem jakichkolwiek kluczy P24 do env Vercela — tj
- żadnych prawdziwych transakcji; w tym zadaniu wyłącznie tryb mock
- zapis do BL tylko z `BASELINKER_MOCK=true`

## Kontekst
- `.env.local.example` (sekcja Przelewy24), `src/app/api/shop/checkout/route.ts`, `src/components/shop/OrderConfirmationClient.tsx`
- migracja z HA-2.01

## Notatki z realizacji
- 2026-09-22 tj: P24 w trakcie zakładania, musi być przed końcem projektu; zadania pracują na mocku / sztucznym webhooku (O-15)
- 2026-09-24 tj: dowód „jeden push do BL" przez licznik wywołań w mocku BL, dostępny wyłącznie przy BASELINKER_MOCK=true (opcja B)
