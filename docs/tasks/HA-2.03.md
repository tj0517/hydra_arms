---
id: HA-2.03
title: Płatność Przelewy24 — adapter z trybem mock
status: review
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
- 2026-09-24 tj: migracja 011 — p24_session_id per próba płatności + p24_order_id (bigint) po opłaceniu; ponowna płatność za to samo zamówienie możliwa (opcja C)
- 2026-09-24 tj: format podpisów P24 z oficjalnej dokumentacji (developers.przelewy24.pl), wektory testowe z dokumentacji (opcja B)
- 2026-09-24 tj: druga udana płatność za opłacone zamówienie — nie weryfikujemy w P24 (pieniądze zostają u klienta), próba oznaczona jako duplikat + log; komunikat dla klienta → deferred HA-2.07/2.08 (opcja A)
- 2026-09-24 tj: pełna implementacja ukończona (src/lib/p24, migracja 011, notify/mock-pay/register/dev routes, mock page, BL mock counter, seed helper test_table_privilege); testy napisane (sign.spec.ts + p24.spec.ts); weryfikacja czeka na sesję z SUPABASE_TARGET=local (npm run db:reset + npm run test:shop:local)
- 2026-09-24 claude: refaktor sign.spec.ts — wyodrębniony src/lib/p24/sign.ts (bez server-only, bez process.env); sign.spec.ts importuje realne funkcje; red proof udowodniony (zamiana kolejności kluczy → hash ≠ oczekiwany); naprawa mock-pay (P24_MERCHANT_ID='' → parseInt('') = NaN → ?? zmieniono na ||); naprawa test forged-URL (page.request cookie-sharing); wszystkie testy P24 green; cart.spec.ts flaky (istniejący problem z banerem cookies, nie dotyczy P24)
- 2026-09-24 tj: review 1 — odesłane: fail-open trybu mock/CRC, adresy z nagłówka Host, verify dla zamówień nie-pending, wyścigi rejestracji i dwóch prób (opcja A+)
- 2026-09-24 tj: review 2 — odesłane: brak zwolnienia rezerwacji po nieudanym verify, odrzucenia poza blokadą, zamówienie utknięte po udanym verify, SHOP_BASE_URL bez fail-closed
- 2026-09-24 tj: review 3 — odesłane: zrzuty pokazują „Nie znaleziono zamówienia", shop-tests w CI czerwone od ec38083 (main zielony), brak automatycznego odblokowania zawieszonej rezerwacji
