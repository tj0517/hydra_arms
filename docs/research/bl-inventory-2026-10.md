# Inwentaryzacja BaseLinkera — 2026-10 (HA-2.14)

Tylko liczby i identyfikatory techniczne. Bez danych osobowych, tokenów i nazw produktów.
Źródło każdej liczby: wynik skryptu uruchomionego przez tj i wklejony do czatu (data przy sekcji).
Skrypty: `scripts/bl-inventory-report.ts` (tylko odczyt, klient `src/lib/baselinker/readonly.ts`),
`scripts/bl-verify-categories.ts`. Żadne wywołanie nie zapisuje do BaseLinkera.

## Finding: 107789 and bl_148602/3/4 are not in the client's account

Najważniejszy wynik zadania. Pierwszy live run (tj, 2026-10-09, token z konta klienta):

- katalog `107789` (`BASELINKER_INVENTORY_ID` w `.env.local`) **nie istnieje** na koncie klienta — skrypt
  padł z `ERROR_STORAGE_ID`;
- widocznych katalogów: **6**;
- magazynów na koncie: **7** — `bl_45657` Domyślny, `warehouse_5007832` SHARG, `blconnect_6820` Kobold Defense,
  `bl_57196` Sharg, `blconnect_6971` MILICON, `bl_58093` Własny, `bl_76925` 042025;
- **żadnego** z `bl_148602` / `bl_148603` / `bl_148604` (`BASELINKER_WAREHOUSE_H1/H2/H3`) nie ma na koncie;
- tagów zdefiniowanych: **0**.

Wniosek (tj, 2026-10-09): identyfikatory katalogu i magazynów w `.env.local` pochodzą z sandboxa tj,
a import Spechurtu z 24.07 (6 854 produkty) nigdy nie trafił na konto klienta. Zapis z notatki
HA-2.14 z 2026-09-25 („katalog 107789, magazyn `bl_148604`”) dotyczy sandboxa.

Decyzja (tj, 2026-10-09): inwentaryzacja wszystkich 6 katalogów. Katalog i magazyny docelowe dla
klienta pozostają do wyboru (nowe pytanie otwarte — zob. `docs/04-open-questions.md`).

Wklejony wynik pierwszego runu (surowe stdout) — do uzupełnienia, gdy tj wklei blok z terminala;
powyższa lista pochodzi z podsumowania tj z 2026-10-09.

## Run 2: `npx tsx scripts/bl-inventory-report.ts` (wszystkie katalogi)

_Oczekuje na wklejony wynik._

Linia wymagana przez kryteria akceptacji (z sekcji TOTALS wyniku):

- products outside P1 with tag `approved`: _oczekuje_

Magazyn „Hydra” (`BASELINKER_WAREHOUSE_HYDRA`): nieustawiony w `.env.local`; skrypt mówi to wprost
w banerze. Liczby per magazyn liczone po identyfikatorach widocznych na produktach, nie po mapowaniu
env H1/H2/H3 (sandbox).

## `npx tsx scripts/bl-verify-categories.ts` (live, per katalog)

_Oczekuje na wklejony wynik._ Wymagane w nagłówku: `BASELINKER_MOCK: false`, `Inventory ID : <id>`.

## Red proof: `bl-verify-categories.ts` na kopii z jednym zmienionym ID

_Oczekuje na wklejony wynik._ Oczekiwane: rozjazd dla num=1.3 i `exit=1`.
