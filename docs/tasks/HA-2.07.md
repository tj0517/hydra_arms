---
id: HA-2.07
title: Maile — potwierdzenie zamówienia i płatności
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.03]
blocked_by_questions: [O-13]
touches_db: false
touches_prod: false
pr: null
---

## Cel
Klient po zakupie nie dostaje żadnego maila, a sklep z płatnościami musi potwierdzić zamówienie (wymagają tego też regulamin i P24). Sukces: po złożeniu zamówienia i po opłaceniu klient dostaje mail z danymi firmy (O-13), pozycjami, kwotą, dostawą i linkiem do statusu. Wysyłka nie blokuje checkoutu i nie wysyła się dwa razy.

## Zakres
- [ ] odczyt stanu bieżącego: użycie Resend w `api/contact` i `api/newsletter`, `RESEND_FROM_EMAIL`, dane firmy (O-13)
- [ ] szablony: „zamówienie przyjęte, czeka na płatność” i „płatność przyjęta”
- [ ] wysyłka z `mark_order_paid` / notify P24 (idempotentna; znacznik wysłania w zamówieniu)
- [ ] tryb testowy: bez `RESEND_API_KEY` albo z flagą testową maile trafiają do logu, nie do klienta

## Gotowe, gdy
- w trybie testowym oba maile generują się z poprawnymi danymi — **jak sprawdzić:** wklejony podgląd HTML/log dla zamówienia testowego
- red proof: powtórne powiadomienie P24 nie wysyła drugiego maila — **jak sprawdzić:** test (licznik wysyłek = 1)
- błąd Resend nie psuje zamówienia — **jak sprawdzić:** test z wymuszonym błędem; status zamówienia bez zmian, błąd w logu

## Poza zakresem
- maile o wysyłce i dostawie (statusy BL) → osobne zadanie
- faktury → BaseLinker / proces klienta, O-13

## Bramki STOP
- wysyłka przez Resend poza trybem testowym — tylko na adres tj, po zgodzie
- zmiana env w Vercelu — tj

## Kontekst
- `src/app/api/contact/route.ts`, `src/app/api/newsletter/route.ts`, `.env.local.example` (Resend)
- HA-2.03 (notify P24)

## Notatki z realizacji
