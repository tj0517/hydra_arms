---
id: HA-2.08
title: Tryb weryfikacji P24 — mock, telefon, strony prawne
status: done
difficulty: M
model: sonnet-5.5
model_approved: null
effort: null
branch: feat/ha-2.08-p24-verification-mode
due: null
depends_on: [HA-2.03, HA-2.07, HA-2.16]
blocked_by_questions: []
touches_db: true
touches_prod: true
pr: 47
---

## Cel
P24 weryfikuje sklep przed aktywacją: sprawdza pełną ścieżkę zamówienia, dane firmy, telefon, regulamin i zasady zwrotów. Klient nie chce jeszcze realnej sprzedaży. Sukces: publiczna strona pozwala przejść całą ścieżkę do płatności na mocku P24 (prawdziwy sandbox: HA-2.23), jest wyraźnie oznaczona jako tryb testowy, a wszystkie wymagane przez P24 elementy są na miejscu.

## Zakres
- [ ] odczyt stanu bieżącego: aktualne wymagania weryfikacyjne P24 (docs), strony `regulamin`, `polityka-prywatnosci`, stopka/nawigacja (telefon), `legal/*.docx` (nieśledzone pliki od klienta), odpowiedzi O-09, O-13
- [ ] adapter z HA-2.03 w trybie `sandbox` konfigurowany wartościami z rejestru HA-2.16 (`P24_*`, status `placeholder`, właściciel: klient, O-09); test na prawdziwym sandboxie → HA-2.23
- [ ] flaga trybu (np. `SHOP_MODE=verification`): baner „tryb testowy”, płatności tylko sandbox
- [ ] brakujące treści: regulamin sklepu, zwroty i reklamacje, dane firmy, telefon (z O-09/O-13; treść prawną dostarcza klient, zadanie ją wstawia)
- [ ] checklista wymagań P24 w raporcie: wymaganie → gdzie na stronie

## Gotowe, gdy
- pełna ścieżka w trybie weryfikacji na mocku P24 (lokalnie, a po zgodzie tj na produkcyjnej domenie) — **jak sprawdzić:** zrzuty z Playwright MCP każdego kroku
- red proof: w trybie weryfikacji checkout nie może użyć produkcyjnych kluczy P24 — **jak sprawdzić:** test/konfiguracja z wklejonym błędem przy `P24_MODE=production`
- checklista P24 kompletna, każdy punkt ze wskazaniem strony — **jak sprawdzić:** tabela w raporcie

## Poza zakresem
- pisanie treści prawnych od zera → klient / prawnik
- test na prawdziwym sandboxie P24 → HA-2.23
- przełączenie na realną sprzedaż → HA-2.09

## Bramki STOP
- przed zmianą env w Vercelu (Production) — lista zmian i akceptacja tj
- przed publikacją treści prawnych — akceptacja tj (treść od klienta)

## Kontekst
- `src/app/(main)/regulamin/`, `polityka-prywatnosci/`, `legal/`
- `docs/04-open-questions.md` → O-09, O-13

## Notatki z realizacji
- 2026-09-30 tj: O-13 rozstrzygnięte — dane firmy są na stronie, zwroty w `legal/Regulamin sklepu.docx` (§ 6), opisy produktów z BaseLinkera.
- 2026-10-06 tj: dane P24 (O-09) blokują tylko HA-2.23; reszta powstaje na mocku i wartościach wstępnych.
- 2026-10-16 tj: HA-2.08 tylko lokalnie (produkcja w trybie weryfikacji dopiero z sandboxem P24, HA-2.23); zamówienia w trybie weryfikacji bez BL i oznaczone jako testowe; obowiązkowy checkbox regulaminu i polityki w checkoucie; ikony P24 w stopce jako zaślepka + wpis w rejestrze.
- 2026-10-16 tj (decyzje po raporcie): (1) oznaczenie zamówień testowych: opcja A — kolumna `orders.is_test` (boolean, NOT NULL, domyślnie false; migracja `017_orders_is_test.sql`); checkout ustawia `is_test = true` dla każdego zamówienia z `SHOP_MODE=verification`; push do BL (`markOrderPaid`) i ponowienie osieroconych w `/api/shop/orders/sync` pomijają wiersze `is_test` na podstawie kolumny, niezależnie od bieżącego trybu (po przełączeniu na live stare zamówienia testowe nie mogą trafić do BL klienta); typy w tym samym diffie; migracja tylko lokalnie, na prod wkleja tj w SQL Editorze **przed** merge (merge = auto-deploy; kod piszący `is_test` przed istnieniem kolumny zepsułby checkout), nigdy `supabase db push`. (2) Teksty prawne: `/polityka-prywatnosci` i `/polityka-cookies` dopasować do pełnego `.docx` klienta (brzmienie z dokumentu, układ strony zostaje); Regulamin bez zmian (różnice kosmetyczne); `rodo@hydra-arms.pl` zostaje; diff do akceptacji tj przed commitem. (3) Brzmienie checkboxa zostaje, dopisane do pytań do klienta (O-35). (4) W tym PR: telefon na `/kontakt` z tego samego źródła co stopka; `SHOP_MODE=live` przyjmuje tylko `P24_MODE=production`. (5) O-35 dodane, O-36 nie (zastąpione decyzją 2).
- 2026-10-16 tj: Polityka prywatności zatwierdzona jak w .docx (zostaje „(oraz powiązanych podstron i wersji roboczych)”; pytanie o frazę o roboczym/deweloperskim adresie → O-35 f). Polityka cookies zatwierdzona z jednym wyjątkiem: opcja A — § 3.3 z .docx (klauzula o linku „Ustawienia Cookies” w stopce) POMINIĘTA, bo takiego linku w stopce nie ma; wpis w `docs/deferred-tasks.md` (dodać link otwierający baner ponownie, potem przywrócić § 3.3 dosłownie).
- 2026-10-16 tj (przegląd PR #47): zaślepka znaków P24 w stopce tylko przy `SHOP_MODE=verification` lub w dev (`SHOP_MODE` nieustawiony i `NODE_ENV` ≠ production); produkcja bez pliku nie renderuje nic; gdy istnieje `public/payment-marks/p24-marks.*`, obrazek w każdym trybie; wpis w rejestrze zostaje. Decyzja: `src/lib/shop/paymentMarks.ts`.
- 2026-10-16 tj: odbiór PR #47 po 2 rundach — przyjęte. Udowodnione: tryb weryfikacji z banerem, odmowa checkoutu przy P24_MODE=production (weryfikacja) i przy mock/sandbox (live), checkbox regulaminu i polityki wymuszany na serwerze, zamówienia is_test nie trafiają do BL także po przełączeniu trybu (red proofy + test kontrolny), telefon na /kontakt, polityki prywatności i cookies zgodne z .docx klienta (bez § 3.3), znaki P24 jako zaślepka tylko w weryfikacji/dev. Migracja 017 wgrana na prod przez tj przed merge'em. Zostaje: O-35 do klienta, oficjalne grafiki P24, link „Ustawienia Cookies” i § 3.3, produkcja w trybie weryfikacji (HA-2.23).
