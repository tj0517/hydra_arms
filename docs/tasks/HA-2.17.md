---
id: HA-2.17
title: Flagi pozwolenia i 18+ — import, sync, override w BaseLinkerze
status: review
difficulty: M
model: fable-5.1
model_approved: sonnet
effort: medium
branch: feat/ha-2.17-permit-flags
due: null
depends_on: [HA-2.04]
blocked_by_questions: []
touches_db: true
touches_prod: false
pr: null
---

## Cel
Sklep wymusza odbiór osobisty dla produktów z pozwoleniem, rejestracją lub 18+, ale nikt dziś nie ustawia tych flag poza gałęzią 15 (tag `age_18`). Sukces: import nadaje tagi wg tabeli reguł z arkusza korekty (grupy A–D z O-27), klient może w BaseLinkerze ręcznie zdjąć flagę dla konkretnego produktu tagiem `permit_off`, a sync przenosi to do Supabase (`requires_license`, `age_min`). Re-import nie nadpisuje decyzji klienta.

## Zakres
- [ ] odczyt stanu bieżącego: `scripts/xml-to-baselinker.ts` (`computeTags`, `IMPORT_OWNED_TAGS`), `src/app/api/shop/sync/route.ts` (mapowanie tagów), kolumny `requires_license`/`age_min`/`delivery_allowed` w baseline, arkusz „Podkategorie - korekta”, O-27/O-29/O-30
- [ ] tabela reguł w danych (`xml-integration/permit-rules.ts`): podkategoria → grupa A (pozwolenie) / B (rejestracja, odbiór przez 18+) / C („+/-”) / D (18+) / brak; zmiana przypisania to edycja danych, nie kodu
- [ ] tagi w BL: `permit` (A, C), `age_18` (B, D), `permit_review` (C); tagi własne importu (odświeżane przy każdym imporcie): `permit`, `age_18`, `permit_review`
- [ ] tag admina `permit_off` (klient zdejmuje flagę dla produktu) i `permit_ok` (klient potwierdza, że wymaga); każdy z nich gasi `permit_review` i przeżywa re-import
- [ ] sync: `requires_license = permit ∧ ¬permit_off`; `age_min = 18` dla `age_18` lub `permit`; działy 01 i 02 zawsze odbiór niezależnie od tagów
- [ ] domyślnie dla grupy C: `permit` + `permit_review` (odbiór do decyzji klienta, decyzja tj 2026-10-06); sporne pozycje z O-29 i O-30 także jako dane w tabeli, domyślnie odbiór

## Gotowe, gdy
- testy jednostkowe tabeli reguł: po jednym produkcie z grup A, B, C, D oraz bez grupy — **jak sprawdzić:** wklejony wynik testów
- red proof: produkt z `permit` i `permit_off` → `requires_license=false`; ten sam bez `permit_off` → `true` — **jak sprawdzić:** test funkcji mapującej
- red proof: re-import produktu z `permit_off` zachowuje `permit_off` i nie dodaje `permit_review` — **jak sprawdzić:** test na danych próbnych, `--dry-run`
- grupa C domyślnie ma `permit` i `permit_review` — **jak sprawdzić:** tabela próbki z dry-runu (≥ 12 produktów z grup A–D: produkt, kategoria, tagi)
- sync wypełnia `requires_license` i `age_min` na lokalnej bazie — **jak sprawdzić:** wklejony SELECT po lokalnym syncu z mockiem BL
- brak zapisu do BL — **jak sprawdzić:** wynik z `BASELINKER_MOCK=true` i flagą `--dry-run`, lista wywołań bez metod zapisujących

## Poza zakresem
- wymuszenie odbioru w checkoucie i RPC → HA-2.06
- zapis tagów do BL na żywo → HA-2.15 (bramka STOP)
- weryfikacja wieku online (IDENTT/mObywatel) → O-28
- zmiana reguł `product_type` → bramka STOP, nie w tym zadaniu

## Bramki STOP
- każde wywołanie zapisujące BaseLinker (tylko `--dry-run`/mock)
- przed zmianą reguł `product_type` lub tras fulfillmentu — decyzja tj
- przed migracją (jeśli okaże się potrzebna) — diff względem baseline i akceptacja

## Kontekst
- `scripts/xml-to-baselinker.ts`, `src/app/api/shop/sync/route.ts`, `src/lib/shop/cartAnalysis.ts`
- `docs/research/analiza_popularnosci_kategorii_korekta.xlsx` (arkusz „Podkategorie - korekta”)
- `docs/04-open-questions.md` → O-11, O-27, O-29, O-30

## Notatki z realizacji
- 2026-10-06 tj: override = tag admina `permit_off` (nie pole dodatkowe BL); grupa C po imporcie = odbiór + `review`.
- 2026-10-08 tj (prompt): `delivery_allowed = false` dla działów 01 i 02 niezależnie od tagów, `true` dla reszty; dział z łańcucha kategorii po nazwie korzenia („01.”/„02.”), nie po id BL. Red proof merge przeniesiony z dry-runu do testu jednostkowego (hook blokuje skrypt w każdym trybie). Hook bez zmian (poza zakresem).
- 2026-10-08 agent: tabela reguł `xml-integration/permit-rules.ts` (37 wierszy: 30 aktywnych po numerach Hydra, 7 inertnych bez gałęzi w drzewie — ASG, kusze, czarnoprochowa, lufy, BCG, konwersje). Liście drzewa: A=19, B=1, C=4, D=21, brak=106. Dopasowanie: najdłuższy prefiks (np. „1” → A, „1.4” → C). Tagi i merge wyciągnięte do `xml-integration/import-tags.ts`, resolver do `xml-integration/resolve-category.ts`; mapowanie syncu w `src/lib/shop/permitFlags.ts`, wpięte w `src/app/api/shop/sync/route.ts`. Mock BL: +6 produktów i +10 kategorii („01.”, „02.”, „15.”) na dowód mapowania. Dry-run drukuje teraz tabelę tagów per produkt (do 40 wierszy). Próbki w `samples/` mają tylko grupę D (31 kompletnych produktów) — A/B/C w tabeli z próbek brak, powiedziane wprost.
- 2026-10-08 agent — domyślne przypisania czekające na decyzję tj (dane, nie kod): 1.4 → C (O-29, liść miesza demobil/pozbawioną cech/czarnoprochową); 13.3 multitoole → brak, 13.4.3 toporki → D (O-30 „itp.”); 15.3 paralizatory → C (bez osobnego `age_18`, 18+ wynika z `permit`); 4.1–4.3 → brak (lufy/BCG/konwersje bez liścia). Zgodnie ze spec `age_min=18` gdy `permit` lub `age_18` — więc `permit_off` nie zdejmuje 18+ (produkt po `permit_off` nadal idzie odbiorem).
