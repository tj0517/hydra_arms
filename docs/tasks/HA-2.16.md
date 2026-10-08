---
id: HA-2.16
title: Rejestr inputów i guard placeholderów
status: done
difficulty: M
model: null
model_approved: null
effort: null
branch: feat/ha-2.16-inputs-registry
due: null
depends_on: []
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 29
---

## Cel
Brakujące dane od klienta (ceny wysyłek, marże, dane P24, domena, tokeny) mają żyć w jednym miejscu, każda wartość oznaczona jako `placeholder` albo `confirmed`. Dzięki temu większość kodu powstaje już teraz, a podmiana wartości to zmiana jednej linii. Sukces: start sprzedaży (HA-2.09) nie przejdzie, dopóki jakikolwiek input jest placeholderem.

## Zakres
- [ ] odczyt stanu bieżącego: gdzie dziś żyją wartości konfiguracyjne (`.env.local.example`, `.env.development.local.example`, stałe w kodzie, `scripts/lib/prodGuard.ts`)
- [ ] rejestr `config/inputs.ts`: nazwa, źródło (env / plik), status (`placeholder` | `confirmed`), właściciel (klient / tj), gdzie użyte, pytanie O-xx
- [ ] polecenie `npm run inputs:check`: tabela inputów bez wartości sekretów; kod wyjścia ≠ 0, gdy tryb live (`SHOP_MODE=live`) i jakikolwiek input jest placeholderem
- [ ] `docs/inputs.md` generowany z rejestru (lista „co jeszcze trzeba dostarczyć”)
- [ ] wpisy startowe: `P24_*`, `BASELINKER_MARKUP_*`, ceny i próg dostawy (HA-2.02), `SITE_URL` (HA-2.21), `ORDER_LINK_SECRET` (HA-2.19), IP serwerów P24 (HA-2.20)

## Gotowe, gdy
- red proof: rejestr z jednym placeholderem + `SHOP_MODE=live` → `inputs:check` kończy się kodem ≠ 0 i wskazuje ten input — **jak sprawdzić:** wklejony wynik komendy
- wszystkie `confirmed` → kod wyjścia 0 — **jak sprawdzić:** test jednostkowy z wklejonym wynikiem
- wynik komendy nie zawiera żadnej wartości sekretu — **jak sprawdzić:** test, który podstawia znacznik `SECRET_MARKER_123` jako wartość i sprawdza brak w wyjściu
- tryb nie-live (dev/test) nie jest blokowany placeholderami — **jak sprawdzić:** test jednostkowy
- `docs/inputs.md` zgodny z rejestrem — **jak sprawdzić:** test porównujący wygenerowany plik z zapisanym

## Poza zakresem
- ustawianie env w Vercelu → HA-2.09 (bramka STOP)
- konkretne wartości (ceny, marże, klucze) → zadania właścicieli (HA-2.02, HA-2.05, HA-2.08, HA-2.23)
- uruchomienie guarda w deployu → HA-2.09

## Bramki STOP
- żadnych zmian zmiennych środowiskowych w Vercelu ani w `.env.local` na prod

## Kontekst
- `.env.local.example`, `scripts/lib/prodGuard.ts`, `docs/04-open-questions.md`

## Notatki z realizacji
- 2026-10-06 tj: cel planu — większość projektu gotowa, wartości jako minimalne inputy do działających funkcji.
- 2026-10-08 tj: SHOP_MODE — zamknięta lista (live / verification / brak = dev); inna wartość = błąd inputs:check.
- 2026-10-08 tj: SHOP_BASE_URL w rejestrze obok SITE_URL, oba placeholder (O-31), bez zmiany nazw — opcja A.
- 2026-10-08 tj: P24_MODE zostaje confirmed (przełącznik środowiska, nie brakująca dana); sprawdzenie wartości przy starcie należy do HA-2.09.
- 2026-10-08 tj: odbiór PR #29 — 6/6 kryteriów udowodnionych (red proofs: placeholder w live, znacznik sekretu, nieaktualny docs/inputs.md); notatki i deferred uzupełnione w tej samej gałęzi.
