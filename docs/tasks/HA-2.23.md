---
id: HA-2.23
title: Test płatności na prawdziwym sandboxie P24
status: todo
difficulty: S
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.08, HA-2.20]
blocked_by_questions: [O-09]
touches_db: false
touches_prod: true
pr: null
---

## Cel
Adapter P24 był testowany tylko na mocku. Przed startem sprzedaży musi przejść pełną ścieżkę na sandboxie P24 z prawdziwymi danymi dostępu. Sukces: zamówienie przechodzi rejestrację, płatność, notify i weryfikację, a błędne podpisy są odrzucane.

## Zakres
- [ ] odczyt stanu bieżącego: wartości sandbox w rejestrze inputów (status `confirmed`), `P24_MODE=sandbox`
- [ ] tj wpisuje dane sandbox do env (lokalnie, potem po akceptacji w Vercelu)
- [ ] pełna ścieżka: checkout → rejestracja → płatność sandbox → notify → verify → `paid`
- [ ] próby błędne: zły CRC / podpis, kwota niezgodna, duplikat notify

## Gotowe, gdy
- zamówienie ze statusem `paid` po prawdziwym notify sandbox — **jak sprawdzić:** wklejony SELECT i zrzuty z Playwright MCP każdego kroku
- red proof: notify ze złym podpisem → odrzucone, status bez zmian — **jak sprawdzić:** wklejony log i SELECT
- red proof: niezgodna kwota → odrzucone — **jak sprawdzić:** wklejony log
- red proof: duplikat notify nie dubluje zamówienia w BL — **jak sprawdzić:** wklejony SELECT i licznik BL (mock)

## Poza zakresem
- przełączenie na produkcyjne klucze → HA-2.09
- weryfikacja P24 przez ich zespół → proces klienta

## Bramki STOP
- zmiana env Production w Vercelu — lista zmian i akceptacja tj
- zmiana ustawień webhooków P24

## Kontekst
- `src/lib/p24/`, `docs/tasks/HA-2.03.md`, `HA-2.08.md`

## Notatki z realizacji
