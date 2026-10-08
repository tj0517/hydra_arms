/**
 * xml-integration/permit-rules.ts — HA-2.17
 *
 * DATA TABLE: Hydra subcategory → permit group. Changing an assignment is an
 * edit of a row below, never a code change.
 *
 * Source: the client's binding sheet „Podkategorie - korekta”
 * (docs/research/analiza_popularnosci_kategorii_korekta.xlsx, legal state
 * 2026-09-28) read through the groups fixed in docs/04-open-questions.md O-27
 * (confirmed by the client 2026-10-06):
 *
 *   A — requires a permit (pozwolenie)            → tag `permit`
 *   B — registration only, pickup by an adult     → tag `age_18`
 *   C — „+/-”, decided per product                → tags `permit` + `permit_review`
 *   D — 18+ without permit/registration           → tag `age_18`
 *   null — no restriction                         → no permit tags
 *
 * Rule: permit, registration or 18+ → no courier (pickup only). Group C is
 * pickup until the client decides per product in BaseLinker (`permit_off`
 * removes the permit flag, `permit_ok` confirms it — see import-tags.ts).
 *
 * Matching: `hydra` is a Hydra tree number (xml-integration/hydra-category-tree.txt,
 * leading zero optional). A row covers its own number and every descendant;
 * the most specific (longest) matching row wins, so "1" → A can be refined by
 * "1.4" → C. Rows with `hydra: null` are sheet positions that have no Hydra
 * branch yet (O-20 / HA-2.24): kept as data so the client's assignment is
 * visible, inert until the tree gains that branch.
 *
 * Open questions are rows too, each with its O-number in `note`, default =
 * pickup (the stricter outcome). Resolving them is a data edit here.
 */

export type PermitGroup = 'A' | 'B' | 'C' | 'D';

export interface PermitRule {
  /** Hydra tree number ("1", "1.4", "11.1.2"); null = no Hydra branch yet (inert). */
  hydra: string | null;
  /** Human label — the sheet subcategory / Hydra node name this row stands for. */
  label: string;
  /** Permit group, or null when the sheet marks no permit, registration or 18+. */
  group: PermitGroup | null;
  /** Why — sheet row, O-number, or decision date. */
  note?: string;
}

/** Tags the import writes for each group (refreshed on every import). */
export const GROUP_TAGS: Readonly<Record<PermitGroup, readonly string[]>> = {
  A: ['permit'],
  B: ['age_18'],
  C: ['permit', 'permit_review'],
  D: ['age_18'],
};

export const PERMIT_RULES: readonly PermitRule[] = [
  // ── 01. Broń palna ───────────────────────────────────────────────────────
  { hydra: '1', label: '01. Broń palna (pistolety, rewolwery, karabiny, strzelby, PCC)', group: 'A',
    note: 'arkusz: Broń palna — wszystkie typy wg mechanizmu „x”; karabiny samoczynne tylko koncesja/B2G (też A)' },
  { hydra: '1.4', label: '1.4 Broń kolekcjonerska i historyczna (demobil, pozbawiona cech użytkowych, czarnoprochowa)', group: 'C',
    note: 'O-29 — broń rozdzielnego ładowania u klienta w A i w C; liść miesza demobil (A), pozbawioną cech (B) i czarnoprochową (C) → „+/-” per produkt, domyślnie odbiór' },
  { hydra: '1.5', label: '1.5 Broń alarmowa i sygnałowa', group: 'A',
    note: 'arkusz: Broń palna alarmowa/sygnałowa/gazowa „x” (>6 mm); BAS ≤6 mm nie ma liścia w drzewie (O-23)' },

  // ── 02. Amunicja ─────────────────────────────────────────────────────────
  { hydra: '2', label: '02. Amunicja i elementy rechargingu (naboje, hukowe, alarmowe, gazowe, sygnałowe, spłonki, prochy)', group: 'A',
    note: 'arkusz: wszystkie naboje „x”, spłonki „x”, prochy bezdymne „x”, proch czarny — EKB (sprawdzana przy odbiorze), amunicja szczególnie niebezpieczna tylko koncesja/B2G' },

  // ── 03. Optyka ───────────────────────────────────────────────────────────
  { hydra: '3', label: '03. Optyka strzelecka i optoelektronika', group: null, note: 'arkusz: Optyka celownicza / obserwacyjna / termowizja — bez pozwolenia' },

  // ── 04. Części i tuning ──────────────────────────────────────────────────
  { hydra: '4', label: '04. Części zamienne i tuning broni', group: null,
    note: 'arkusz: spusty, sprężyny, kolby, chwyty, łoża, układy gazowe, manipulatory, drobne części — bez pozwolenia; lufy / zamki-BCG / zestawy konwersyjne nie mają liścia w drzewie (wiersze inertne niżej)' },
  { hydra: '4.5.2', label: '4.5.2 Tłumiki huku i wielofunkcyjne urządzenia wylotowe', group: 'C',
    note: 'O-27 grupa C: tłumiki huku o przeznaczeniu wojskowym/policyjnym — sprzedaż ograniczona; decyzja per produkt' },

  // ── 05–10, 12, 14 ────────────────────────────────────────────────────────
  { hydra: '5', label: '05. Magazynki i szybkoładowarki', group: null, note: 'arkusz: Magazynki — bez pozwolenia' },
  { hydra: '6', label: '06. Przenoszenie broni i wyposażenia', group: null, note: 'arkusz: Kabury / Oporządzenie / Plecaki — bez pozwolenia' },
  { hydra: '7', label: '07. Konserwacja, chemia i narzędzia rusznikarskie', group: null, note: 'arkusz: Czyszczenie / Narzędzia rusznikarskie — bez pozwolenia' },
  { hydra: '8', label: '08. Elaboracja amunicji (elementy niekoncesjonowane)', group: null, note: 'arkusz: prasy, matryce, pociski, łuski — bez pozwolenia (spłonki i prochy są w 2.6 → A)' },
  { hydra: '9', label: '09. Ochrona indywidualna, słuchu, wzroku i balistyka', group: null, note: 'arkusz: Ochrona słuchu i wzroku / balistyczna i CBRN — bez pozwolenia' },
  { hydra: '10', label: '10. Akcesoria strzelnicze i logistyka', group: null, note: 'arkusz: Sejfy / Futerały / Tarcze / Wyposażenie strzeleckie — bez pozwolenia' },
  { hydra: '12', label: '12. Odzież, obuwie i systemy nośne', group: null, note: 'arkusz: Odzież / Obuwie — bez pozwolenia' },
  { hydra: '14', label: '14. Outdoor, survival i medycyna polowa', group: null, note: 'arkusz: Survival / Medycyna / Elektronika — bez pozwolenia' },

  // ── 11. Wiatrówki ────────────────────────────────────────────────────────
  { hydra: '11', label: '11. Strzelectwo pneumatyczne (węzeł nadrzędny, produkt bez liścia)', group: 'D',
    note: 'O-27 D: wiatrówki ≤17 J → 18+; produkt zmapowany tylko na gałąź dostaje ostrzejszy domyślny odbiór' },
  { hydra: '11.1.1', label: '11.1.1 Karabinki PCP do 17 J', group: 'D', note: 'O-27 D: wiatrówki ≤17 J → 18+' },
  { hydra: '11.1.2', label: '11.1.2 Karabinki PCP FAC powyżej 17 J', group: 'B', note: 'arkusz: >17 J → rejestracja (broń pneumatyczna); O-27 B → odbiór przez 18+' },
  { hydra: '11.1.3', label: '11.1.3 Karabinki sprężynowe', group: 'D', note: 'O-27 D; arkusz: >17 J → rejestracja — drzewo nie rozdziela mocy, B i D dają ten sam tag age_18' },
  { hydra: '11.1.4', label: '11.1.4 Karabinki PCA i CO2', group: 'D', note: 'O-27 D; jak 11.1.3' },
  { hydra: '11.2', label: '11.2 Pistolety i rewolwery pneumatyczne', group: 'D', note: 'O-27 D: wiatrówki ≤17 J → 18+' },
  { hydra: '11.3', label: '11.3 Amunicja i akcesoria pneumatyczne (śrut, BB, kapsuły, konserwacja)', group: null, note: 'arkusz: Śrut / Kulki BB / Akcesoria PCP — bez pozwolenia' },

  // ── 13. Noże ─────────────────────────────────────────────────────────────
  { hydra: '13', label: '13. Noże, multitoole, force entry (węzeł nadrzędny, produkt bez liścia)', group: 'D',
    note: 'O-30 — „ASG, noże itp.” odbiór do czasu bramki 18+; domyślnie odbiór' },
  { hydra: '13.1', label: '13.1 Noże ze stałą klingą', group: 'D', note: 'O-30 — domyślnie odbiór (arkusz: bez pozwolenia i rejestracji)' },
  { hydra: '13.2', label: '13.2 Noże składane (w tym OTF / automatyczne)', group: 'D', note: 'O-30 — domyślnie odbiór (arkusz: noże w tym OTF bez pozwolenia)' },
  { hydra: '13.3', label: '13.3 Narzędzia wielofunkcyjne i multitoole', group: null, note: 'arkusz: Multitoole i narzędzia outdoor — bez pozwolenia; nie objęte O-30 (nie są nożami)' },
  { hydra: '13.4', label: '13.4 Narzędzia wejścia i saperskie (tarany, łomy, saperki)', group: null, note: 'arkusz: Łomy i narzędzia ratownicze / Saperki — bez pozwolenia' },
  { hydra: '13.4.3', label: '13.4.3 Toporki i tomahawki taktyczne', group: 'D', note: 'O-30 — broń biała jak noże („itp.”), domyślnie odbiór' },

  // ── 15. Samoobrona ───────────────────────────────────────────────────────
  { hydra: '15', label: '15. Środki do ochrony osobistej (gazy, pałki, alarmy, akcesoria)', group: 'D',
    note: 'O-27 D: gazy, pałki → 18+; zachowuje dotychczasową regułę importu „gałąź 15 → age_18”' },
  { hydra: '15.3', label: '15.3 Paralizatory', group: 'C',
    note: 'arkusz / O-27 C: „+/-”, >10 mA wymaga pozwolenia; ≤10 mA 18+ (D) — decyzja per produkt, domyślnie odbiór' },

  // ── Sheet positions without a Hydra branch (inert until HA-2.24 / tree edit) ──
  { hydra: null, label: 'Broń czarnoprochowa — rozdzielnego ładowania (odprzodowa, odtylcowa)', group: 'C',
    note: 'O-29 — u klienta w A i w C; zwolnienie tylko dla egzemplarzy sprzed 1885 r. i replik; brak gałęzi w drzewie' },
  { hydra: null, label: 'Broń czarnoprochowa — na amunicję scaloną', group: 'A', note: 'arkusz „x”; brak gałęzi w drzewie' },
  { hydra: null, label: 'Łucznictwo — kusze', group: 'A', note: 'arkusz „x”; brak gałęzi w drzewie (O-20, HA-2.24)' },
  { hydra: null, label: 'Airsoft / ASG (repliki, kulki, magazynki, części)', group: 'D',
    note: 'O-30 — „ASG, noże itp.” odbiór do czasu bramki 18+; brak gałęzi w drzewie (O-20, HA-2.24)' },
  { hydra: null, label: 'Części i tuning — lufy', group: 'A', note: 'arkusz „x”; brak liścia w drzewie (04 nie rozdziela luf)' },
  { hydra: null, label: 'Części i tuning — zamki, suwadła i BCG', group: 'C', note: 'arkusz „+/-”; brak liścia w drzewie' },
  { hydra: null, label: 'Części i tuning — zestawy konwersyjne', group: 'C', note: 'arkusz: pozwolenie, jeśli zawiera istotne części broni; brak liścia w drzewie' },
];

// Mirrors normNum in the import script ("03" → "3")
const normNum = (n: string) => n.trim().replace(/^0+(?=\d)/, '');

/**
 * Most specific rule covering a Hydra number (own number or ancestor), or
 * undefined when no row covers it. Inert rows (`hydra: null`) never match.
 */
export function permitRuleFor(hydraNum: string | null | undefined): PermitRule | undefined {
  if (!hydraNum) return undefined;
  const n = normNum(hydraNum);
  let best: PermitRule | undefined;
  for (const rule of PERMIT_RULES) {
    if (rule.hydra === null) continue;
    const r = normNum(rule.hydra);
    if (n === r || n.startsWith(`${r}.`)) {
      if (!best || r.length > normNum(best.hydra!).length) best = rule;
    }
  }
  return best;
}

export function permitGroupFor(hydraNum: string | null | undefined): PermitGroup | null {
  return permitRuleFor(hydraNum)?.group ?? null;
}

/** Permit tags for a Hydra number: [] for group null, unmapped, or "00. DO PRZYPISANIA". */
export function permitTagsFor(hydraNum: string | null | undefined): string[] {
  const group = permitGroupFor(hydraNum);
  return group ? [...GROUP_TAGS[group]] : [];
}
