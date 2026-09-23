---
id: HA-1.08
title: CI — testy sklepu na lokalnym stacku
status: review
difficulty: M
model: claude-sonnet-4-6
model_approved: null
effort: medium
branch: ci/ha-1.08-shop-tests
due: null
depends_on: [HA-1.06, HA-1.07]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: 13
---

## Cel
Testy sklepu istnieją, ale nikt ich nie uruchamia automatycznie, a dotąd chodziły na prod. Sukces: każdy PR stawia w CI lokalną bazę z seedem i przechodzi testy sklepu; zepsuty koszyk albo listing blokuje merge.

## Zakres
- [ ] odczyt stanu bieżącego: workflow z HA-1.07, polecenia z HA-1.06
- [ ] job w CI: Supabase CLI → `supabase start` → `db reset` z seedem → `npm run build` → `playwright test tests/shop` na lokalnym stacku, z `BASELINKER_MOCK=true`
- [ ] artefakty: raport Playwright i trace przy porażce
- [ ] env w CI tylko lokalne klucze demo (bez sekretów)

## Gotowe, gdy
- job przechodzi na PR — **jak sprawdzić:** link do przebiegu
- red proof: celowo zepsuty test (np. oczekiwana cena zmieniona) oblewa job — **jak sprawdzić:** link do nieudanego przebiegu; zmiana cofnięta
- w logach CI nie ma adresu `breqmmlcaxsvxcqlcmqc` — **jak sprawdzić:** wyszukanie w logu przebiegu
- czas joba zapisany w raporcie — **jak sprawdzić:** liczba z przebiegu

## Poza zakresem
- testy płatności P24 → HA-2.03
- nowe testy → tylko jeśli trzeba poprawić istniejące pod lokalną bazę

## Bramki STOP
- żadnych sekretów prod w GitHub Actions

## Kontekst
- `.github/workflows/ci.yml` (HA-1.07), `supabase/config.toml`, `supabase/seed.sql` (HA-1.06)
- `tests/shop/`, `playwright.config.ts`

## Notatki z realizacji
- 2026-09-23 tj: 3 preegzystujące testy listing.spec.ts poprawiane w HA-1.08 (opcja A)
- 2026-09-23 tj: diff schematu lokal↔prod poza HA-1.08, zostaje w deferred (opcja A)
- 2026-09-23 tj: test sidebaru — opcja C (jeden test, nowa nazwa, aside FILTRY + przycisk WSZYSTKIE exact); "WSZYSTKIE PRODUKTY" potwierdzone jako nieaktualne na podstawie git log
