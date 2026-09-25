---
id: HA-2.11
title: Spechurt — podgląd i walidacja na aktualnym feedzie z serwera
status: todo
difficulty: S
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.04]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Feed Spechurtu działa tylko z serwera 51.83.134.183 (whitelista IP), z Maca Spechurt odpowiada ERR105. 2026-09-25 z serwera: HTTP 200, 17 MB. Import z 24.07 uruchomiony na serwerze sparsował 6 854 produkty, z czego 99% dostało dział Hydry. Podgląd z HA-2.04 pobiera feed z Maca, więc dla Spechurtu pokazuje 0 produktów. Sukces: podgląd czyta feed z pliku lokalnego, aktualny plik Spechurtu przechodzi przez parser i podgląd z prawdziwymi liczbami, a dokumentacja przestaje twierdzić, że Spechurt jest zablokowany.

## Zakres
- [ ] odczyt stanu: `xml-integration/connectors/spechurt.ts`, `fetchAndParse` i `runDryRun` w `scripts/xml-to-baselinker.ts`, `xml-integration/README.md`, `PROBLEMY-feedow-xml.md` (sekcja SPECHURT), `SCHEMAS.md` §3, wpisy Spechurtu w `docs/deferred-tasks.md`
- [ ] opcja `--from-file=<connector>:<ścieżka>` dla `--dry-run`, która czyta feed z dysku zamiast z sieci (import bez zmian)
- [ ] aktualny plik pobiera tj na serwerze i kopiuje `scp`-em. Agent podaje komendy, sam nie łączy się z serwerem
- [ ] walidacja parsera na aktualnym pliku: liczba `<produkt>` w pliku vs liczba sparsowanych, błędy parsowania, liczba pustych EAN / cen zakupu / stanów
- [ ] pokrycie słownika Spechurtu na aktualnym pliku (ile trafia do „00”); dopisać tylko kategorie, które pojawiły się od lipca
- [ ] dokumentacja: README, PROBLEMY (SPECHURT), wpis w deferred z 2026-09-25 → „dostęp działa z serwera 51.83.134.183, z Maca ERR105”

## Gotowe, gdy
- podgląd z pliku działa bez sieci — **jak sprawdzić:** tj uruchamia `npx tsx scripts/xml-to-baselinker.ts --dry-run --from-file=spechurt:<plik>` i wkleja podsumowanie, w którym Spechurt ma > 0 produktów
- liczba sparsowanych produktów = liczba `<produkt>` w pliku albo różnica jest wyjaśniona — **jak sprawdzić:** `grep -c '<produkt>' <plik>` vs licznik z podglądu
- test parsera na małym fragmencie prawdziwego pliku w `xml-integration/samples/` — **jak sprawdzić:** `npm run test:unit`
- dokumentacja nie opisuje Spechurtu jako zablokowanego — **jak sprawdzić:** `grep -n -i 'ERR105\|blocked\|zablokow' xml-integration/README.md xml-integration/PROBLEMY-feedow-xml.md` daje trafienia tylko w kontekście „z Maca / historia”

## Poza zakresem
- import na serwerze i cron → HA-2.15
- produkty Spechurtu już obecne w BaseLinkerze → HA-2.14
- kategoryzacja Kolby → HA-2.12

## Bramki STOP
- żadnego zapisu do BaseLinkera w tym zadaniu
- agent nie łączy się z serwerem 51.83.134.183 i nie dodaje go do żadnej konfiguracji; plik pobiera tj
- pełny feed nie trafia do repo; próbka w `samples/` bez klucza w nazwie, w treści i w URL-ach

## Kontekst
- `xml-integration/connectors/spechurt.ts`, `xml-integration/SCHEMAS.md` §3, `xml-integration/PROBLEMY-feedow-xml.md`
- `scripts/xml-to-baselinker.ts` (`runDryRun`, `fetchAndParse`)
- `docs/tasks/HA-2.04.md` (filtr i podgląd)

## Notatki z realizacji
- 2026-09-25 tj: feed Spechurtu dostępny z serwera 51.83.134.183 (ssh `ubuntu@`, alias `hydra-srv`): HTTP 200, 17 MB. Z Maca ERR105. Import 24.07 z serwera: 6 854 produkty, 3 185 auto / 3 604 review / 65 flag.
