# Inwentaryzacja BaseLinkera — 2026-10 (HA-2.14)

Tylko liczby i identyfikatory techniczne. Bez danych osobowych, tokenów i nazw produktów.
Źródło każdej liczby: wynik skryptu uruchomionego przez tj na tokenie konta klienta i wklejony do czatu
2026-10-09. Skrypty: `scripts/bl-inventory-report.ts` (tylko odczyt, klient `src/lib/baselinker/readonly.ts`),
`scripts/bl-verify-categories.ts`. Żadne wywołanie nie zapisuje do BaseLinkera.

## Finding: 107789 and bl_148602/3/4 are not in the client's account

Najważniejszy wynik zadania. Pierwszy live run (tj, 2026-10-09, token z konta klienta) padł z `ERROR_STORAGE_ID`:
katalog `107789` (`BASELINKER_INVENTORY_ID` w `.env.local`) **nie istnieje** na koncie klienta. Pełny run (niżej) pokazuje:

- katalogów widocznych dla tokena: **6** (27277 Domyślny, 35743 Kobold Defense, 35836 Sharg, 36112 Sharg 2.0 XML,
  36115 MILICON, 36522 Własny);
- magazynów na koncie: **7** — `bl_45657` Domyślny, `warehouse_5007832` SHARG, `blconnect_6820` Kobold Defense,
  `bl_57196` Sharg, `blconnect_6971` MILICON, `bl_58093` Własny, `bl_76925` 042025;
- **żadnego** z `bl_148602` / `bl_148603` / `bl_148604` (`BASELINKER_WAREHOUSE_H1/H2/H3`) nie ma na koncie;
- tagów zdefiniowanych: **0** w każdym katalogu.

Wniosek (tj, 2026-10-09): identyfikatory katalogu i magazynów w `.env.local` pochodzą z sandboxa tj,
a import Spechurtu z 24.07 (6 854 produkty) nigdy nie trafił na konto klienta. Zapis z notatki
HA-2.14 z 2026-09-25 („katalog 107789, magazyn `bl_148604`”) dotyczy sandboxa.

Decyzja (tj, 2026-10-09): inwentaryzacja wszystkich 6 katalogów (poniżej). Katalog i magazyny docelowe dla
klienta pozostają do wyboru → **O-33** w `docs/04-open-questions.md`.

## Conclusion

- Import z 24.07 **nigdy nie dotarł** na konto klienta: 0 tagów i 0 kategorii Hydry we wszystkich 6 katalogach
  (7 341 produktów, 0 w drzewie 01–15, 0 z tagiem `approved`).
- Katalog klienta trzyma **dwa obce, żywe stany**: Kobold Defense 4 741 produktów (1 738 ze stanem > 0) i
  MILICON 2 591 (1 454 ze stanem > 0). Pozostałe 4 katalogi: 9 produktów łącznie.
- Katalog 35743 „Kobold Defense” ma **własne drzewo 53 kategorii** (akcesoria do broni palnej: magazynki, kolby,
  szyny, celowniki, chwyty, zawieszenia, bipody…) — żywy katalog klienta z innego kanału, nie nasz; lista w wyniku
  `bl-verify-categories.ts` niżej.
- Pytanie, dla którego powstało zadanie (produkty spoza P1 już w BL, w tym z `approved`): **odpowiedź — brak**.
- **products outside P1 with tag `approved`: 0** (wszystkie katalogi; linia z sekcji TOTALS wyniku).
- Magazyn „Hydra” (`BASELINKER_WAREHOUSE_HYDRA`): nieustawiony w `.env.local`; skrypt mówi to w banerze.
  Liczby per magazyn liczone po identyfikatorach widocznych na produktach, nie po mapowaniu env H1/H2/H3 (sandbox).
- Kryterium „red proof `bl-verify-categories.ts` na kopii z jednym zmienionym ID”: **nieweryfikowalne w tym stanie
  konta** — 206/206 ID z JSON i tak nie istnieje w BL, więc podmieniony ID nie zmienia wyniku. Zastąpione ustaleniem
  „0 kategorii Hydry na koncie” (decyzja tj, 2026-10-09). Dowód: jeden run verify (35743) niżej — 206/206 brak,
  0 tagów, 53 obce kategorie, exit=1.
- Następna decyzja: O-33.

## Run 2: `npx tsx scripts/bl-inventory-report.ts` (tj, 2026-10-09, wklejone verbatim)

```
=== bl-inventory-report (READ-ONLY) ===
BASELINKER_INVENTORY_ID (env): 107789
BASELINKER_MOCK : false
BL methods      : getInventories, getInventoryWarehouses, getInventoryTags, getInventoryProductsList, getInventoryProductsData
Client allowlist: getInventories, getInventoryWarehouses, getInventoryCategories, getInventoryTags, getInventoryProductsList, getInventoryProductsData, getInventoryProductsStock
Filter nodes    : 75 P1 Hydra nodes (assortment-rules.ts, default new-subcategory priority P2)
Warehouse env   : BASELINKER_WAREHOUSE_H1/H2/H3 set (NOT used for counts — sandbox-only ids); BASELINKER_WAREHOUSE_HYDRA NOT CONFIGURED — env var unset
Target          : live BaseLinker (READ-ONLY — no writes)
hydra-categories.json: 206 category ids

Warehouses in BL account: 7
  bl_45657  "Domyślny"
  warehouse_5007832  "SHARG"
  blconnect_6820  "Kobold Defense"
  bl_57196  "Sharg"
  blconnect_6971  "MILICON"
  bl_58093  "Własny"
  bl_76925  "042025"

Inventories visible to token: 6
  27277    "Domyślny"  products: 4  warehouses: bl_45657
  35743    "Kobold Defense"  products: 4741  warehouses: blconnect_6820
  35836    "Sharg"  products: 0  warehouses: bl_45657, bl_57196
  36112    "Sharg 2.0 XML"  products: 1  warehouses: bl_45657
  36115    "MILICON"  products: 2591  warehouses: blconnect_6971
  36522    "Własny"  products: 4  warehouses: bl_58093

⚠  Configured inventory 107789 is NOT among the inventories visible to this token — reporting ALL of them instead (tj 2026-10-09).

========================================================================
INVENTORY 27277 "Domyślny" — 4 products
========================================================================
  tags defined: 0
    import tags present: —
    import tags MISSING: auto, review, flag, approved, age_18
  details fetched: 4/4

  ── Per warehouse (ids seen on products, names from getInventoryWarehouses) ──
    bl_45657 "Domyślny"  0 with stock>0 / 4 listed
    products with stock 0 in every warehouse: 4

  ── Per import tag ──
    auto                           0
    review                         0
    flag                           0
    approved                       0
    age_18                         0
    none of the import tags        4
    no tags at all                 4

  ── Per Hydra department (via hydra-categories.json) ──
    (not in hydra-categories.json)  4 (approved: 0)
    category_id unset/0: 0; category_id not in hydra-categories.json: 4

  ── HA-2.04 filter — category criterion only (stock/price not applied) ──
    inside P1 (would pass)                           0
      of which approved                              0
    outside P1 (would NOT pass)                      4
      of which in departments 01/02                  0
        of which approved                            0
      of which category unknown to Hydra tree        4
        of which approved                            0

  products outside P1 with tag `approved` (inventory 27277): 0
  products with tag `approved` (inventory 27277, total): 0

========================================================================
INVENTORY 35743 "Kobold Defense" — 4741 products
========================================================================
  tags defined: 0
    import tags present: —
    import tags MISSING: auto, review, flag, approved, age_18
  details fetched: 4741/4741

  ── Per warehouse (ids seen on products, names from getInventoryWarehouses) ──
    blconnect_6820 "Kobold Defense"  1738 with stock>0 / 4741 listed
    products with stock 0 in every warehouse: 3003

  ── Per import tag ──
    auto                           0
    review                         0
    flag                           0
    approved                       0
    age_18                         0
    none of the import tags     4741
    no tags at all              4741

  ── Per Hydra department (via hydra-categories.json) ──
    (not in hydra-categories.json)  4741 (approved: 0)
    category_id unset/0: 0; category_id not in hydra-categories.json: 4741

  ── HA-2.04 filter — category criterion only (stock/price not applied) ──
    inside P1 (would pass)                           0
      of which approved                              0
    outside P1 (would NOT pass)                   4741
      of which in departments 01/02                  0
        of which approved                            0
      of which category unknown to Hydra tree     4741
        of which approved                            0

  products outside P1 with tag `approved` (inventory 35743): 0
  products with tag `approved` (inventory 35743, total): 0

========================================================================
INVENTORY 35836 "Sharg" — 0 products
========================================================================
  tags defined: 0
    import tags present: —
    import tags MISSING: auto, review, flag, approved, age_18
  details fetched: 0/0

  ── Per warehouse (ids seen on products, names from getInventoryWarehouses) ──
    (no stock entries)        0
    products with stock 0 in every warehouse: 0

  ── Per import tag ──
    auto                           0
    review                         0
    flag                           0
    approved                       0
    age_18                         0
    none of the import tags        0
    no tags at all                 0

  ── Per Hydra department (via hydra-categories.json) ──
    (no products)        0
    category_id unset/0: 0; category_id not in hydra-categories.json: 0

  ── HA-2.04 filter — category criterion only (stock/price not applied) ──
    inside P1 (would pass)                           0
      of which approved                              0
    outside P1 (would NOT pass)                      0
      of which in departments 01/02                  0
        of which approved                            0
      of which category unknown to Hydra tree        0
        of which approved                            0

  products outside P1 with tag `approved` (inventory 35836): 0
  products with tag `approved` (inventory 35836, total): 0

========================================================================
INVENTORY 36112 "Sharg 2.0 XML" — 1 products
========================================================================
  tags defined: 0
    import tags present: —
    import tags MISSING: auto, review, flag, approved, age_18
  details fetched: 1/1

  ── Per warehouse (ids seen on products, names from getInventoryWarehouses) ──
    bl_45657 "Domyślny"  1 with stock>0 / 1 listed
    products with stock 0 in every warehouse: 0

  ── Per import tag ──
    auto                           0
    review                         0
    flag                           0
    approved                       0
    age_18                         0
    none of the import tags        1
    no tags at all                 1

  ── Per Hydra department (via hydra-categories.json) ──
    (not in hydra-categories.json)  1 (approved: 0)
    category_id unset/0: 0; category_id not in hydra-categories.json: 1

  ── HA-2.04 filter — category criterion only (stock/price not applied) ──
    inside P1 (would pass)                           0
      of which approved                              0
    outside P1 (would NOT pass)                      1
      of which in departments 01/02                  0
        of which approved                            0
      of which category unknown to Hydra tree        1
        of which approved                            0

  products outside P1 with tag `approved` (inventory 36112): 0
  products with tag `approved` (inventory 36112, total): 0

========================================================================
INVENTORY 36115 "MILICON" — 2591 products
========================================================================
  tags defined: 0
    import tags present: —
    import tags MISSING: auto, review, flag, approved, age_18
  details fetched: 2591/2591

  ── Per warehouse (ids seen on products, names from getInventoryWarehouses) ──
    blconnect_6971 "MILICON"  1454 with stock>0 / 2591 listed
    products with stock 0 in every warehouse: 1137

  ── Per import tag ──
    auto                           0
    review                         0
    flag                           0
    approved                       0
    age_18                         0
    none of the import tags     2591
    no tags at all              2591

  ── Per Hydra department (via hydra-categories.json) ──
    (not in hydra-categories.json)  2591 (approved: 0)
    category_id unset/0: 0; category_id not in hydra-categories.json: 2591

  ── HA-2.04 filter — category criterion only (stock/price not applied) ──
    inside P1 (would pass)                           0
      of which approved                              0
    outside P1 (would NOT pass)                   2591
      of which in departments 01/02                  0
        of which approved                            0
      of which category unknown to Hydra tree     2591
        of which approved                            0

  products outside P1 with tag `approved` (inventory 36115): 0
  products with tag `approved` (inventory 36115, total): 0

========================================================================
INVENTORY 36522 "Własny" — 4 products
========================================================================
  tags defined: 0
    import tags present: —
    import tags MISSING: auto, review, flag, approved, age_18
  details fetched: 4/4

  ── Per warehouse (ids seen on products, names from getInventoryWarehouses) ──
    bl_58093 "Własny"  4 with stock>0 / 4 listed
    products with stock 0 in every warehouse: 0

  ── Per import tag ──
    auto                           0
    review                         0
    flag                           0
    approved                       0
    age_18                         0
    none of the import tags        4
    no tags at all                 4

  ── Per Hydra department (via hydra-categories.json) ──
    (not in hydra-categories.json)  4 (approved: 0)
    category_id unset/0: 4; category_id not in hydra-categories.json: 0

  ── HA-2.04 filter — category criterion only (stock/price not applied) ──
    inside P1 (would pass)                           0
      of which approved                              0
    outside P1 (would NOT pass)                      4
      of which in departments 01/02                  0
        of which approved                            0
      of which category unknown to Hydra tree        4
        of which approved                            0

  products outside P1 with tag `approved` (inventory 36522): 0
  products with tag `approved` (inventory 36522, total): 0

========================================================================
TOTALS across 6 inventories
========================================================================
  products: 7341 (details fetched: 7341)
  per import tag: auto=0, review=0, flag=0, approved=0, age_18=0; none=7341; no tags at all=7341
  inside P1: 0 (approved: 0); outside P1: 7341 (01/02: 0, approved: 0; category unknown: 7341, approved: 0)

products outside P1 with tag `approved` (all inventories): 0
products with tag `approved` (all inventories): 0

Nothing was written to BaseLinker.
```

## `npx tsx scripts/bl-verify-categories.ts --inventory=35743` (tj, 2026-10-09, wklejone verbatim)

Jeden run jako dowód dla wszystkich katalogów (decyzja tj: 0 kategorii Hydry i 0 tagów w każdym katalogu, więc
pozostałe runy i red proof na zepsutej kopii niczego nie rozróżniają). Nagłówek: `BASELINKER_MOCK: false`,
`Inventory ID : 35743` (zamiast 107789 z kryterium — katalog nie istnieje na koncie).

```
=== bl-verify-categories (READ-ONLY) ===
Inventory ID : 35743 (from --inventory)
BASELINKER_MOCK: false
Target: live BaseLinker (READ-ONLY — no writes)

JSON: 206 entries (xml-integration/hydra-categories.json)
Tree: 205 numbers from xml-integration/hydra-category-tree.txt

Fetching getInventories…
Fetching getInventoryCategories…
BL returned 53 categories

--- IDs in JSON but missing from BL (206) ---
  num=10 id=8926633 — not found in BL
  num=11 id=8926648 — not found in BL
  num=12 id=8926663 — not found in BL
  num=13 id=8926679 — not found in BL
  num=14 id=8926698 — not found in BL
  num=15 id=8926717 — not found in BL
  num=0 id=8926520 — not found in BL
  num=1 id=8926521 — not found in BL
  num=1.1 id=8926522 — not found in BL
  num=1.1.1 id=8926523 — not found in BL
  num=1.1.2 id=8926524 — not found in BL
  num=1.1.3 id=8926525 — not found in BL
  num=1.2 id=8926526 — not found in BL
  num=1.2.1 id=8926527 — not found in BL
  num=1.2.2 id=8926528 — not found in BL
  num=1.2.3 id=8926529 — not found in BL
  num=1.2.4 id=8926530 — not found in BL
  num=1.3 id=8926531 — not found in BL
  num=1.3.1 id=8926532 — not found in BL
  num=1.3.2 id=8926533 — not found in BL
  num=1.3.3 id=8926534 — not found in BL
  num=1.4 id=8926535 — not found in BL
  num=1.5 id=8926536 — not found in BL
  num=2 id=8926537 — not found in BL
  num=2.1 id=8926538 — not found in BL
  num=2.2 id=8926539 — not found in BL
  num=2.3 id=8926540 — not found in BL
  num=2.4 id=8926541 — not found in BL
  num=2.5 id=8926542 — not found in BL
  num=2.5.1 id=8926543 — not found in BL
  num=2.5.2 id=8926544 — not found in BL
  num=2.5.3 id=8926545 — not found in BL
  num=2.6 id=8926546 — not found in BL
  num=3 id=8926547 — not found in BL
  num=3.1 id=8926548 — not found in BL
  num=3.2 id=8926549 — not found in BL
  num=3.3 id=8926550 — not found in BL
  num=3.4 id=8926551 — not found in BL
  num=3.4.1 id=8926552 — not found in BL
  num=3.4.2 id=8926553 — not found in BL
  num=3.4.3 id=8926554 — not found in BL
  num=3.4.4 id=8926555 — not found in BL
  num=3.4.5 id=8926556 — not found in BL
  num=3.4.6 id=8926557 — not found in BL
  num=3.5 id=8926558 — not found in BL
  num=4 id=8926559 — not found in BL
  num=4.1 id=8926560 — not found in BL
  num=4.2 id=8926561 — not found in BL
  num=4.3 id=8926562 — not found in BL
  num=4.4 id=8926563 — not found in BL
  num=4.5 id=8926564 — not found in BL
  num=4.5.1 id=8926565 — not found in BL
  num=4.5.2 id=8926566 — not found in BL
  num=4.5.3 id=8926567 — not found in BL
  num=4.5.4 id=8926568 — not found in BL
  num=4.5.5 id=8926569 — not found in BL
  num=4.6 id=8926570 — not found in BL
  num=4.6.1 id=8926571 — not found in BL
  num=4.6.2 id=8926572 — not found in BL
  num=4.6.3 id=8926573 — not found in BL
  num=4.6.4 id=8926574 — not found in BL
  num=4.6.5 id=8926575 — not found in BL
  num=5 id=8926576 — not found in BL
  num=5.1 id=8926577 — not found in BL
  num=5.2 id=8926578 — not found in BL
  num=6 id=8926579 — not found in BL
  num=6.1 id=8926580 — not found in BL
  num=6.2 id=8926581 — not found in BL
  num=6.2.1 id=8926582 — not found in BL
  num=6.2.2 id=8926583 — not found in BL
  num=6.2.3 id=8926584 — not found in BL
  num=6.3 id=8926585 — not found in BL
  num=6.3.1 id=8926586 — not found in BL
  num=6.3.2 id=8926587 — not found in BL
  num=6.3.3 id=8926588 — not found in BL
  num=6.4 id=8926589 — not found in BL
  num=6.4.1 id=8926590 — not found in BL
  num=6.4.2 id=8926591 — not found in BL
  num=6.4.3 id=8926592 — not found in BL
  num=6.4.4 id=8926593 — not found in BL
  num=7 id=8926594 — not found in BL
  num=7.1 id=8926595 — not found in BL
  num=7.1.1 id=8926596 — not found in BL
  num=7.1.2 id=8926597 — not found in BL
  num=7.1.3 id=8926598 — not found in BL
  num=7.2 id=8926599 — not found in BL
  num=7.2.1 id=8926600 — not found in BL
  num=7.2.2 id=8926601 — not found in BL
  num=7.2.3 id=8926602 — not found in BL
  num=7.3 id=8926603 — not found in BL
  num=7.3.1 id=8926604 — not found in BL
  num=7.3.2 id=8926605 — not found in BL
  num=7.3.3 id=8926606 — not found in BL
  num=8 id=8926607 — not found in BL
  num=8.1 id=8926608 — not found in BL
  num=8.2 id=8926609 — not found in BL
  num=9 id=8926610 — not found in BL
  num=9.1 id=8926611 — not found in BL
  num=9.1.1 id=8926613 — not found in BL
  num=9.1.2 id=8926614 — not found in BL
  num=9.1.3 id=8926616 — not found in BL
  num=9.1.4 id=8926617 — not found in BL
  num=9.2 id=8926618 — not found in BL
  num=9.2.1 id=8926619 — not found in BL
  num=9.2.2 id=8926620 — not found in BL
  num=9.2.3 id=8926621 — not found in BL
  num=9.2.4 id=8926622 — not found in BL
  num=9.3 id=8926623 — not found in BL
  num=9.3.1 id=8926624 — not found in BL
  num=9.3.2 id=8926625 — not found in BL
  num=9.3.3 id=8926626 — not found in BL
  num=9.3.4 id=8926627 — not found in BL
  num=9.4 id=8926628 — not found in BL
  num=9.4.1 id=8926629 — not found in BL
  num=9.4.2 id=8926630 — not found in BL
  num=9.4.3 id=8926631 — not found in BL
  num=9.4.4 id=8926632 — not found in BL
  num=10.1 id=8926634 — not found in BL
  num=10.1.1 id=8926635 — not found in BL
  num=10.1.2 id=8926636 — not found in BL
  num=10.1.3 id=8926637 — not found in BL
  num=10.1.4 id=8926638 — not found in BL
  num=10.2 id=8926639 — not found in BL
  num=10.2.1 id=8926640 — not found in BL
  num=10.2.2 id=8926641 — not found in BL
  num=10.2.3 id=8926642 — not found in BL
  num=10.3 id=8926643 — not found in BL
  num=10.3.1 id=8926644 — not found in BL
  num=10.3.2 id=8926645 — not found in BL
  num=10.3.3 id=8926646 — not found in BL
  num=10.3.4 id=8926647 — not found in BL
  num=11.1 id=8926649 — not found in BL
  num=11.1.1 id=8926650 — not found in BL
  num=11.1.2 id=8926651 — not found in BL
  num=11.1.3 id=8926652 — not found in BL
  num=11.1.4 id=8926653 — not found in BL
  num=11.2 id=8926654 — not found in BL
  num=11.2.1 id=8926655 — not found in BL
  num=11.2.2 id=8926656 — not found in BL
  num=11.2.3 id=8926657 — not found in BL
  num=11.3 id=8926658 — not found in BL
  num=11.3.1 id=8926659 — not found in BL
  num=11.3.2 id=8926660 — not found in BL
  num=11.3.3 id=8926661 — not found in BL
  num=11.3.4 id=8926662 — not found in BL
  num=12.1 id=8926664 — not found in BL
  num=12.1.1 id=8926665 — not found in BL
  num=12.1.2 id=8926666 — not found in BL
  num=12.1.3 id=8926667 — not found in BL
  num=12.2 id=8926668 — not found in BL
  num=12.2.1 id=8926669 — not found in BL
  num=12.2.2 id=8926670 — not found in BL
  num=12.2.3 id=8926671 — not found in BL
  num=12.3 id=8926672 — not found in BL
  num=12.3.1 id=8926673 — not found in BL
  num=12.3.2 id=8926674 — not found in BL
  num=12.4 id=8926675 — not found in BL
  num=12.4.1 id=8926676 — not found in BL
  num=12.4.2 id=8926677 — not found in BL
  num=12.4.3 id=8926678 — not found in BL
  num=13.1 id=8926680 — not found in BL
  num=13.1.1 id=8926681 — not found in BL
  num=13.1.2 id=8926683 — not found in BL
  num=13.1.3 id=8926684 — not found in BL
  num=13.2 id=8926685 — not found in BL
  num=13.2.1 id=8926686 — not found in BL
  num=13.2.2 id=8926687 — not found in BL
  num=13.2.3 id=8926689 — not found in BL
  num=13.3 id=8926690 — not found in BL
  num=13.3.1 id=8926691 — not found in BL
  num=13.3.2 id=8926692 — not found in BL
  num=13.3.3 id=8926693 — not found in BL
  num=13.4 id=8926694 — not found in BL
  num=13.4.1 id=8926695 — not found in BL
  num=13.4.2 id=8926696 — not found in BL
  num=13.4.3 id=8926697 — not found in BL
  num=14.1 id=8926699 — not found in BL
  num=14.1.1 id=8926700 — not found in BL
  num=14.1.2 id=8926701 — not found in BL
  num=14.1.3 id=8926702 — not found in BL
  num=14.1.4 id=8926703 — not found in BL
  num=14.2 id=8926704 — not found in BL
  num=14.2.1 id=8926706 — not found in BL
  num=14.2.2 id=8926707 — not found in BL
  num=14.2.3 id=8926708 — not found in BL
  num=14.3 id=8926709 — not found in BL
  num=14.3.1 id=8926710 — not found in BL
  num=14.3.2 id=8926712 — not found in BL
  num=14.3.3 id=8926713 — not found in BL
  num=14.4 id=8926714 — not found in BL
  num=14.4.1 id=8926715 — not found in BL
  num=14.4.2 id=8926716 — not found in BL
  num=15.1 id=8926718 — not found in BL
  num=15.1.1 id=8926719 — not found in BL
  num=15.1.2 id=8926720 — not found in BL
  num=15.1.3 id=8926721 — not found in BL
  num=15.2 id=8926722 — not found in BL
  num=15.2.1 id=8926723 — not found in BL
  num=15.2.2 id=8926724 — not found in BL
  num=15.2.3 id=8926725 — not found in BL
  num=15.3 id=8926726 — not found in BL
  num=15.3.1 id=8926727 — not found in BL
  num=15.3.2 id=8926728 — not found in BL
  num=15.4 id=8926729 — not found in BL
  num=15.4.1 id=8926731 — not found in BL
  num=15.4.2 id=8926732 — not found in BL
Numbers in tree but no ID in JSON: OK ✓
Name mismatches (BL name ≠ expected from tree): OK ✓
Parent-ID mismatches (BL parent ≠ expected from tree structure): OK ✓

--- BL categories not referenced in JSON (informational) (53) ---
  id=2320023 name="Magazynki do broni palnej/Magazynki" parent=0
  id=2320025 name="Chwyty do broni palnej/Rękojeści" parent=0
  id=2320026 name="Kolby do broni palnej" parent=0
  id=2320027 name="Kompensatory do broni palnej/Hamulce wylotowe / Tłumiki płomienia" parent=0
  id=2320028 name="Montaże i szyny do broni/Montaże do optyki" parent=0
  id=2320036 name="Kolby do broni palnej/Akcesoria do kolb" parent=0
  id=2320037 name="Łoża do broni" parent=0
  id=2322884 name="Tłumiki dźwięku" parent=0
  id=2322899 name="Magazynki do broni palnej/Podajniki" parent=0
  id=2322900 name="Magazynki do broni palnej/Taśmy nabojowe" parent=0
  id=2322901 name="Magazynki do broni palnej/Łączniki" parent=0
  id=2322902 name="Magazynki do broni palnej/Łódki / Ładowniki" parent=0
  id=2322903 name="Montaże i szyny do broni/Szyny M-LOK" parent=0
  id=2322904 name="Chwyty do broni palnej/Chwyty przednie" parent=0
  id=2322905 name="Montaże i szyny do broni/Szyny KeyMod" parent=0
  id=2322906 name="Łoża do broni/Akcesoria do łóż" parent=0
  id=2322907 name="Zawieszenia do broni/Akcesoria do zawieszeń" parent=0
  id=2322908 name="Chwyty do broni palnej/Okładziny do pistoletów" parent=0
  id=2322909 name="Montaże i szyny do broni/Szyny do pistoletów" parent=0
  id=2322910 name="Magazynki do broni palnej/Stopki" parent=0
  id=2322911 name="Kolby do broni palnej/Kolby" parent=0
  id=2322912 name="Magazynki do broni palnej/Uchwyty" parent=0
  id=2322913 name="Magazynki do broni palnej/Osłony" parent=0
  id=2322914 name="Magazynki do broni palnej/Ograniczniki" parent=0
  id=2322915 name="Magazynki do broni palnej/Szybkoładowarki" parent=0
  id=2322916 name="Części spustu i szkieletu" parent=0
  id=2322917 name="Układy gazowe" parent=0
  id=2322918 name="Kompensatory do broni palnej/Odrzutniki do strzelania ślepego" parent=0
  id=2322919 name="Montaże i szyny do broni/Szyny do strzelb" parent=0
  id=2322920 name="Montaże i szyny do broni" parent=0
  id=2322921 name="Monopody i bipody" parent=0
  id=2322922 name="Zawieszenia do broni/Zawieszenia 2-punktowe" parent=0
  id=2322923 name="Sprzęt treningowy/Naboje treningowe" parent=0
  id=2322924 name="Celowniki" parent=0
  id=2322925 name="Chwyty do broni palnej/Akcesoria do chwytów" parent=0
  id=2322926 name="Zawieszenia do broni/Zawieszenia 3-punktowe" parent=0
  id=2322927 name="Montaże i szyny do broni/Szyny do karabinów" parent=0
  id=2322928 name="Montaże i szyny do broni/Szyny MOE" parent=0
  id=2322929 name="Chwyty do broni palnej" parent=0
  id=2322931 name="Montaże i szyny do broni/Szyny MSM" parent=0
  id=2322932 name="Montaże i szyny do broni/Montaże do latarek" parent=0
  id=2322933 name="Monopody i bipody/M-LOK" parent=0
  id=2322934 name="Monopody i bipody/Picatinny" parent=0
  id=2322935 name="Monopody i bipody/Chwyty z podstawą" parent=0
  id=2322936 name="Zawieszenia do broni/Zawieszenia 1-punktowe" parent=0
  id=2322937 name="Pojemniki i pokrowce" parent=0
  id=2322938 name="Zawieszenia do broni" parent=0
  id=2322939 name="Odzież i osprzęt/Ładownice" parent=0
  id=2322940 name="Gadżety" parent=0
  id=2322941 name="Narzędzia" parent=0
  id=2322942 name="Konserwacja broni" parent=0
  id=2322943 name="Odzież i osprzęt" parent=0
  id=2322945 name="Odzież i osprzęt/Kabury" parent=0

Fetching getInventoryTags…

Tags in BL inventory: 0 total
Required tags present (0): —
Required tags MISSING (5): auto, review, flag, age_18, approved

========================================
RESULT: 211 mismatch(es) (53 BL categories not in JSON — informational) — see above
exit=1
```
