---
id: HA-2.26
title: BL klienta — drzewo kategorii i tagi w katalogu 119068, odczyt ID konta
status: review
difficulty: S
model: claude-opus-5-5
model_approved: null
effort: high
branch: feat/ha-2.26-bl-categories-tags
due: null
depends_on: [HA-2.14]
blocked_by_questions: []
touches_db: false
touches_prod: true
pr: 38
---

## Cel
Po HA-2.14 wiemy, że konto BL klienta nie ma nic z naszego importu, a O-33 dało nowy, pusty katalog „Hydra arms” (119068) z magazynami H1/H2/H3. Zanim HA-2.15 wgra produkty, katalog musi mieć drzewo kategorii Hydry (206 ID w `hydra-categories.json` są z sandboxa i nie istnieją na koncie klienta) oraz 5 tagów importu, a `.env.local` — prawdziwe ID grup cenowych, źródła zamówień i statusów z konta klienta zamiast sandboxowych. Sukces: `bl-verify-categories.ts --inventory=119068` → 0 rozjazdów i 5 tagów; `.env.local` kompletny; każdy zapis do BL wykonany przez tj z terminala.

## Zakres
- [x] odczyt stanu: `scripts/bl-build-categories.ts` (tworzy tylko kategorie przez `addInventoryCategory`; tagów nie zakłada), `scripts/bl-verify-categories.ts` (po HA-2.14: `--inventory=`), `xml-integration/hydra-categories.json` (ID sandboxa), `xml-integration/hydra-category-tree.txt`, `.env.local.example` (lista zmiennych BL)
- [x] `bl-build-categories.ts`: bierze katalog z `BASELINKER_INVENTORY_ID` (119068) i nadpisuje `hydra-categories.json` nowymi ID; dry-run nie do uruchomienia przez agenta (lista hooka) — dowód to test jednostkowy parsera drzewa na `hydra-category-tree.txt`; zapis uruchamia tj
- [x] tagi importu `auto`/`review`/`flag`/`approved`/`age_18`: ustalić z dokumentacji BL (context7), czy API pozwala założyć tag bez produktu; jeśli tak — dopisać do `bl-build-categories.ts`; jeśli nie — zapisać w notatkach, że tagi powstają przy pierwszym imporcie, i przenieść kryterium o tagach do HA-2.15
- [x] nowy skrypt tylko do odczytu `scripts/bl-account-ids.ts` przez `src/lib/baselinker/readonly.ts` (allowlista rozszerzona o `getInventoryPriceGroups`, `getOrderSources`, `getOrderStatusList` — konfiguracja konta, nie dane zamówień): wypisuje ID grup cenowych, źródeł zamówień i statusów z nazwami, w formacie linii do `.env.local`
- [ ] tj: uruchamia `bl-build-categories.ts` (bramka STOP: zapis do BL klienta), potem `bl-verify-categories.ts --inventory=119068` i `bl-account-ids.ts`; wkleja wyniki; wpisuje ID do `.env.local` (lokalnie i na `hydra-srv`)
- [x] brakujące grupy cenowe / źródło „Sklep internetowy” / statusy zakłada tj ręcznie w panelu (lista z wyniku `bl-account-ids.ts`), potem ponowny odczyt

## Gotowe, gdy
- drzewo Hydry w katalogu 119068 — **jak sprawdzić:** wklejony wynik `npx tsx scripts/bl-verify-categories.ts --inventory=119068` (tj): `0 mismatch`, nagłówek `Inventory ID : 119068`, `BASELINKER_MOCK: false`; `hydra-categories.json` w diffie ma nowe ID (`grep -c 89265 xml-integration/hydra-categories.json` → 0)
- red proof verify (przeniesione z HA-2.13/2.14) — **jak sprawdzić:** kopia `hydra-categories.json` z jednym podmienionym ID → rozjazd i `exit=1` (wklejony wynik, tj)
- 5 tagów importu w katalogu 119068 albo udokumentowane, że API ich nie zakłada — **jak sprawdzić:** sekcja tagów tego samego wyniku verify: `Required tags MISSING (0)`; albo notatka z cytatem z dokumentacji BL i przeniesione kryterium w HA-2.15
- skrypt odczytu ID nie może zapisać — **jak sprawdzić:** `xml-integration/__tests__/bl-readonly-client.test.ts` rozszerzony o 3 nowe metody na allowliście i nadal rzuca na `getOrders`/`add*`; `npm run test:unit` zielony
- `.env.local` kompletny — **jak sprawdzić:** tj wkleja `grep -E '^BASELINKER_' .env.local | sed 's/=.*/=<set>/'`; każda zmienna z `.env.local.example` ustawiona (bez wartości)
- lista wywołań BL w raporcie — **jak sprawdzić:** sekcja raportu; żadnego `add*`/`update*` poza `addInventoryCategory` (i ewentualnie metodą tagów) uruchomionymi przez tj

## Poza zakresem
- import produktów → HA-2.15
- Sharg: nasz XML czy Base Connect „SHARG (Hurtownia)” → O-33 (pytanie do klienta), przed HA-2.15
- integracje hydra-arms.co… / HYDRA-ARMS (Allegro) na koncie → O-33 (pytanie do klienta)
- gałęzie ASG/łucznictwo/myślistwo → HA-2.24
- `bl-verify-categories.ts` nadal na surowym `blCall` → deferred (HA-2.14)

## Bramki STOP
- przed każdym zapisem do BL klienta (`bl-build-categories.ts`, tagi) — agent nie uruchamia; podaje komendę, uruchamia tj
- żadnego odczytu zamówień ani klientów; `getOrderSources`/`getOrderStatusList` to konfiguracja konta, nie dane zamówień
- `.env.local` edytuje wyłącznie tj

## Kontekst
- `docs/tasks/HA-2.14.md`, `docs/research/bl-inventory-2026-10.md` — stan konta klienta
- `docs/04-open-questions.md` O-33 — katalog 119068, magazyny bl_157483/4/5
- `scripts/bl-build-categories.ts`, `scripts/bl-verify-categories.ts`, `src/lib/baselinker/readonly.ts`
- `xml-integration/hydra-category-tree.txt`, `xml-integration/hydra-categories.json`

## Notatki z realizacji
- 2026-10-09 tj: katalog 119068 i magazyny bl_157483/4/5 założone ręcznie w panelu klienta; `.env.local` lokalnie ma już nowe ID katalogu i magazynów; grupy cenowe / źródło / statusy nadal sandboxowe.
- 2026-10-12 tj: `BASELINKER_WAREHOUSE_HYDRA` zostaje puste do HA-2.09 (O-33 dało tylko H1/H2/H3) — kryterium „`.env.local` kompletny” nie obejmuje tej zmiennej. Kryterium tagów: verify przy komplecie wypisuje `All required tags present ✓` (linia `Required tags MISSING (n)` pojawia się tylko przy braku), więc to ten napis jest dowodem.
- 2026-10-12 claude: tagi — API BL pozwala założyć tag bez produktu. Dokumentacja `addInventoryTag` (https://api.baselinker.com/index.php?method=addInventoryTag): „The method allows you to add a tag to the Base product catalog. Adding a tag with the same tag_id again updates the previously saved tag.”; parametry wejściowe tylko `tag_id` („Tag identifier. Provide for updates. Leave blank or set to 0 when creating a new tag.”) i `name` („Tag name. Must be unique within the user account. Maximum 25 characters.”); zwraca `tag_id`. Brak `inventory_id` i brak identyfikatora produktu — tagi są wspólne dla całego konta, nie dla katalogu 119068 (`getInventoryTags` też nie ma parametrów wejściowych). Zakładanie tagów dopisane do `bl-build-categories.ts` (po kategoriach; istniejące po nazwie pomija) — lista tagów wg decyzji tj niżej.
- 2026-10-12 claude: odczyt stanu — `bl-build-categories.ts` brał katalog z `BASELINKER_INVENTORY_ID`, ale z domyślnym `35743`; to istniejący katalog klienta z 53 własnymi kategoriami (HA-2.14), więc brak zmiennej oznaczałby 206 kategorii w cudzym katalogu. Zmienione: zmienna wymagana (bez wartości domyślnej), sprawdzenie przez `getInventories`, że katalog jest na koncie, odmowa zapisu, gdy katalog ma kategorie spoza drzewa Hydry, odmowa przy `BASELINKER_MOCK=true`. Parser drzewa przeniesiony do `xml-integration/hydra-tree-txt.ts` (`parseHydraTree`), a logika zapisu (co jest „nasze”, co utworzyć, które tagi) do `xml-integration/bl-catalogue-setup.ts`, bo skryptu nie da się zaimportować w teście (guard + `main()` przy imporcie). Skrypt wymaga `HA_ALLOW_PROD=1` (`assertExternalProd`) — komenda dla tj to `HA_ALLOW_PROD=1 npx tsx scripts/bl-build-categories.ts`, nie gołe `npx tsx …`.
- 2026-10-12 claude: różnice względem pliku zadania — (1) kod importu po HA-2.17 pisze też tagi `permit` i `permit_review`, a admin używa `permit_off`/`permit_ok` (`xml-integration/import-tags.ts`); zadanie wymienia tylko 5 tagów — skrypt zakłada 5, reszta do decyzji tj; (2) zmiennych `BASELINKER_ORDER_SOURCE_ID` oraz `BASELINKER_STATUS_PROCESSING/SHIPPED/DELIVERED/CANCELLED/RETURN` nie czyta żaden plik w `src/` ani `scripts/` (czytane są `BASELINKER_STATUS_PAID` i nieobecna w `.env.local.example` `BASELINKER_ORDER_STATUS_ID`) → deferred; (3) hook blokuje `npm run test:unit` w tej sesji — testy uruchamiane przez `npx tsx --test xml-integration/__tests__/*.test.ts` (to samo polecenie, co skrypt npm; wpis w deferred z HA-2.18).
- 2026-10-12 tj: bramka 1 — diff allowlisty zatwierdzony bez zmian: dokładnie `getInventoryPriceGroups`, `getOrderSources`, `getOrderStatusList`, nic więcej.
- 2026-10-12 tj: tagi — opcja D: skrypt zakłada 7 tagów: pięć z zadania (`auto`, `review`, `flag`, `approved`, `age_18`) oraz `permit` i `permit_review`, które pisze import (`xml-integration/import-tags.ts`). `permit_off` i `permit_ok` NIE są zakładane — zostają na osobne zadanie, gdy tj ustali ich nazwy z klientem. `bl-verify-categories.ts` nadal sprawdza tylko pięć tagów z zadania (bez zmian). Tagi są wspólne dla konta, więc 7 tagów pojawi się na całym koncie klienta; skrypt pomija tag, który już istnieje po nazwie (ponowne uruchomienie nie tworzy duplikatów).
- 2026-10-12 tj: testy `prod-guard.test.ts` — opcja A: dwa czerwone testy zostają, udokumentowane (deferred); `scripts/lib/prodGuard.ts` i test nietknięte. Kryterium w raporcie: „brak nowych porażek względem `origin/main`: te same dwa przypadki `prod-guard.test.ts` czerwone przed i po”. tj uruchomi `npm run test:unit` raz u siebie.
- 2026-10-12 tj: dodatki w `bl-build-categories.ts` zostają (odmowa przy braku katalogu na koncie, przy kategoriach spoza drzewa Hydry i przy `BASELINKER_MOCK=true`; `BASELINKER_INVENTORY_ID` wymagane) + test ponownego uruchomienia po przerwanym zapisie.
- 2026-10-12 claude: jak skrypt rozpoznaje kategorię Hydry — po NAZWIE: każda kategoria drzewa jest zakładana z numerem w nazwie (`01. BROŃ PALNA`, `1.1 Broń Krótka`, `00. DO PRZYPISANIA`), więc kategoria w katalogu jest „nasza” dokładnie wtedy, gdy jej nazwa równa się jednej z 206 nazw drzewa (porównanie dokładne, z wielkością liter); każda inna blokuje zapis. Ponowne użycie jest ostrzejsze: ta sama nazwa ORAZ ten sam rodzic (ID BL). Po przerwanym zapisie katalog ma wyłącznie kategorie Hydry, więc kolejne uruchomienie nie odmawia, używa ponownie istniejących i dokłada brakujące (`bl-catalogue-setup.test.ts`: przerwanie po 80 → drugi przebieg 126 utworzonych, 80 użytych ponownie, 206 bez duplikatów; trzeci przebieg 0 zapisów). Plik `hydra-categories.json` jest zapisywany dopiero po ostatniej kategorii.
- 2026-10-12 claude: test `bl-readonly-client.test.ts` — `getOrderStatusList` i `getOrderSources` celowo PRZENIESIONE z listy „muszą rzucać” na listę akceptowanych (razem z `getInventoryPriceGroups`); `getOrders`, `getInvoices` i 13 metod zapisu (w tym `addInventoryCategory`, `addInventoryTag`, `updateInventoryProductsStock`) nadal rzucają `BaseLinkerReadOnlyError`; allowlista sprawdzana jako dokładna lista 10 nazw. Suita: 167 testów, 165 zielonych, 2 czerwone — te same dwa przypadki `prod-guard.test.ts`, czerwone także na czystym `origin/main`.
- 2026-10-12 tj: zapis do BL wykonany przez tj z własnego terminala (Mac); wynik w commicie `52088ea` (`hydra-categories.json` z ID katalogu 119068). Sprawdzone przez claude po `git pull --ff-only`: commit zmienia tylko ten plik; `grep -c 89265 xml-integration/hydra-categories.json` → `0` (było 80); 206 kluczy, 206 różnych ID (9755703–9755909), ten sam zestaw kluczy co przed zmianą, 0 ID wspólnych z plikiem sandboxowym.
- 2026-10-12 tj (wiadomość): `.env.local` na Macu tj zgodny z kontem klienta — `BASELINKER_PRICE_GROUP=104511`, `BASELINKER_PRICE_GROUP_PURCHASE=104512`, `BASELINKER_ORDER_SOURCE_ID=88589`, `BASELINKER_STATUS_PAID=169030`, `_PROCESSING=169036`, `_SHIPPED=130423`, `_DELIVERED=169037`, `_CANCELLED=130424`, `BASELINKER_INVENTORY_ID=119068`, `BASELINKER_WAREHOUSE_H1/H2/H3=bl_157483/4/5`, `BASELINKER_TOKEN` ustawiony.
- 2026-10-12 tj: decyzja — `BASELINKER_STATUS_RETURN` zostaje puste (nie czyta go żaden plik w `src/` ani `scripts/`); kryterium „`.env.local` kompletny” nie obejmuje tej zmiennej ani `BASELINKER_WAREHOUSE_HYDRA` (do HA-2.09). Status zwrotu do rozstrzygnięcia razem z procesem zwrotów → deferred.
- 2026-10-12 tj (wiadomość): ponowny odczyt `bl-account-ids.ts` po zmianach w panelu — grupy cenowe „Cena sprzedaży” 104511 i „Cena zakupu” 104512 w katalogu 119068; źródło „Sklep internetowy” 88589 (typ `personal`); jedyna linia `MISSING` to `BASELINKER_STATUS_RETURN` (zgodnie z decyzją wyżej). Skutek: skrypt kończy się kodem 1, dopóki na koncie nie ma statusu „Zwrot”.
- 2026-10-12 tj (wiadomość): `npm run test:unit` na Macu tj — 167/167 zielonych, także `prod-guard.test.ts`; dwa czerwone przypadki występują tylko w klonie linuksowym `/home/tj/hydra_arms` (po pullu `52088ea` nadal 167 / 165 / 2, te same dwa).
- 2026-10-12 claude: stan dowodów — surowe wyniki `bl-verify-categories.ts --inventory=119068`, red proof, `bl-account-ids.ts` i `grep -E '^BASELINKER_' .env.local` nie zostały wklejone w tej sesji; powyższe wpisy „tj (wiadomość)” to streszczenie tj, nie odczyt claude. claude nie wykonał żadnego wywołania BaseLinkera (w klonie nie ma `.env.local`). `.env.local` na `hydra-srv` — bez potwierdzenia, punkt zakresu zostaje otwarty.
- 2026-10-12 tj (review PR #38): przyjęte z uzupełnieniami, status zostaje `review`. `.env.local` na `hydra-srv` — niepotwierdzone, do sprawdzenia w preflighcie HA-2.15; punkt zakresu zostaje otwarty, serwer nietknięty. Surowe wyniki verify / red proof / odczytu ID konta wkleja tj do sekcji „Proof” w opisie PR #38. `docs/04-open-questions.md` i `project.md` poza tym PR (osobna gałąź docs tj).
