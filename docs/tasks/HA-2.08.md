---
id: HA-2.08
title: Tryb weryfikacji P24 — sandbox, telefon, strony prawne
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.03, HA-2.07]
blocked_by_questions: [O-09, O-13]
touches_db: false
touches_prod: true
pr: null
---

## Cel
P24 weryfikuje sklep przed aktywacją: sprawdza pełną ścieżkę zamówienia, dane firmy, telefon, regulamin i zasady zwrotów. Klient nie chce jeszcze realnej sprzedaży. Sukces: publiczna strona pozwala przejść całą ścieżkę do płatności w sandboxie, jest wyraźnie oznaczona jako tryb testowy, a wszystkie wymagane przez P24 elementy są na miejscu.

## Zakres
- [ ] odczyt stanu bieżącego: aktualne wymagania weryfikacyjne P24 (docs), strony `regulamin`, `polityka-prywatnosci`, stopka/nawigacja (telefon), `legal/*.docx` (nieśledzone pliki od klienta), odpowiedzi O-09, O-13
- [ ] podpięcie danych sandbox P24 (O-09) pod adapter z HA-2.03 (`P24_MODE=sandbox`) i test ścieżki na prawdziwym sandboxie
- [ ] flaga trybu (np. `SHOP_MODE=verification`): baner „tryb testowy”, płatności tylko sandbox
- [ ] brakujące treści: regulamin sklepu, zwroty i reklamacje, dane firmy, telefon (z O-09/O-13; treść prawną dostarcza klient, zadanie ją wstawia)
- [ ] checklista wymagań P24 w raporcie: wymaganie → gdzie na stronie

## Gotowe, gdy
- pełna ścieżka w trybie weryfikacji na sandboxie P24 (lokalnie, a po zgodzie tj na produkcyjnej domenie) — **jak sprawdzić:** zrzuty z Playwright MCP każdego kroku
- red proof: w trybie weryfikacji checkout nie może użyć produkcyjnych kluczy P24 — **jak sprawdzić:** test/konfiguracja z wklejonym błędem przy `P24_MODE=production`
- checklista P24 kompletna, każdy punkt ze wskazaniem strony — **jak sprawdzić:** tabela w raporcie

## Poza zakresem
- pisanie treści prawnych od zera → klient / prawnik
- przełączenie na realną sprzedaż → HA-2.09

## Bramki STOP
- przed zmianą env w Vercelu (Production) — lista zmian i akceptacja tj
- przed publikacją treści prawnych — akceptacja tj (treść od klienta)

## Kontekst
- `src/app/(main)/regulamin/`, `polityka-prywatnosci/`, `legal/`
- `docs/04-open-questions.md` → O-09, O-13

## Notatki z realizacji
