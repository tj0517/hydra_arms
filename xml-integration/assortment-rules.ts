/**
 * Assortment rules — single source of truth for the import filter.
 *
 * To change scope: edit this file. The filter function reads it at runtime.
 * No code changes needed elsewhere unless you add a new rule type.
 *
 * Source: P1 subcategories from docs/research/analiza_popularnosci_kategorii.xlsx
 * (sheet "Podkategorie i filtry", column D), mapped to Hydra tree 01–15 in
 * docs/research/taksonomia-p1.md.  Only subcategories present at ≥1 of our
 * wholesalers (Sharg / Kolba / Spechurt) are included.
 *
 * New subcategories (HA-2.18, 2026-10-09): the client's correction sheet
 * („Podkategorie - korekta”, 2026-09-29) added subcategories without any
 * P1/P2/P3 column (O-22).  They live in `newSubcategories` below, one row per
 * sheet name, each with an optional explicit `priority`.  A row without one
 * takes `newSubcategoryDefaultPriority`, read from the registered input
 * NEW_SUBCATEGORY_DEFAULT_PRIORITY (config/inputs.ts; unset = P2 = not
 * imported, tj 2026-10-09).  Only rows whose effective priority is P1 add their
 * Hydra node to the filter; nodes already in `allowedHydraNums` are never
 * removed by a row.  Answering O-22 = editing `priority` on the rows, or the
 * env value for all of them at once.
 */

/** Sheet priority: P1 = import now, P2 = after the core, P3 = specialisation. */
export type Priority = 'P1' | 'P2' | 'P3';

/** Env var that carries the default priority of new subcategories (registered in config/inputs.ts). */
export const NEW_SUBCATEGORY_PRIORITY_ENV = 'NEW_SUBCATEGORY_DEFAULT_PRIORITY';

/**
 * Parse the input.  Unset / empty = P2 (tj 2026-10-09).  Anything else than
 * P1 | P2 | P3 (case-sensitive) throws, so a typo cannot silently widen or
 * narrow the import — the message never echoes the value.
 */
export function parseNewSubcategoryPriority(raw: string | undefined): Priority {
  if (raw === undefined || raw === '') return 'P2';
  if (raw === 'P1' || raw === 'P2' || raw === 'P3') return raw;
  throw new Error(`${NEW_SUBCATEGORY_PRIORITY_ENV} must be P1, P2 or P3 (case-sensitive) or unset (= P2)`);
}

export interface NewSubcategoryRule {
  /** Subcategory name exactly as in the corrected sheet (grep target). */
  name: string;
  /** Sheet category. */
  category: string;
  /**
   * Hydra tree node from docs/research/taksonomia-p1.md (leading zero
   * optional; parent node ⇒ tag review as everywhere else), or null when the
   * tree has no node for it — then the row is inert whatever its priority
   * (same convention as permit-rules.ts).
   */
  hydra: string | null;
  /** Explicit priority once the client answers O-22; absent = the default input. */
  priority?: Priority;
  note?: string;
}

export interface AssortmentRules {
  /**
   * Hydra tree numbers in scope (P1, wholesaler-present).
   * A product is in scope when its resolved Hydra number exactly matches one of
   * these (after stripping leading zeros).  Parent entries like "04" admit only
   * products mapped to that exact node; children must be listed explicitly.
   * Numbers from docs/research/taksonomia-p1.md; "brak" rows are excluded.
   */
  allowedHydraNums: readonly string[];

  /** Connector names active for import.  "szafy" excluded pending O-17. */
  enabledSuppliers: readonly string[];

  /**
   * Minimum selling price in PLN (purchase price + markup, computed at runtime).
   * 0 = filter disabled.  Set e.g. 30 to drop products below 30 PLN.
   */
  minPricePln: number;

  /** Subcategories added by the correction sheet (2026-09-29) — see header. */
  newSubcategories: readonly NewSubcategoryRule[];

  /** Priority of every `newSubcategories` row without an explicit `priority`. */
  newSubcategoryDefaultPriority: Priority;
}

/** Priority a new-subcategory row currently has (explicit, else the default). */
export function effectivePriority(rule: NewSubcategoryRule, rules: AssortmentRules): Priority {
  return rule.priority ?? rules.newSubcategoryDefaultPriority;
}

/**
 * Hydra nodes the filter admits: `allowedHydraNums` plus the node of every
 * new-subcategory row whose effective priority is P1 (rows with `hydra: null`
 * never add anything).  Pure — the filter calls it per product.
 */
export function effectiveAllowedHydraNums(rules: AssortmentRules): readonly string[] {
  const extra = rules.newSubcategories
    .filter((r) => r.hydra !== null && effectivePriority(r, rules) === 'P1')
    .map((r) => r.hydra as string);
  return extra.length === 0 ? rules.allowedHydraNums : [...rules.allowedHydraNums, ...extra];
}

export const ASSORTMENT_RULES: AssortmentRules = {
  allowedHydraNums: [
    // ── 01. BROŃ PALNA (O-11/O-27 rozstrzygnięte; HA-2.25, 2026-10-08) ───────
    // Tagi permit nadaje permit-rules.ts (1.3/1.5 → A, 1.4 → C).  Wchodzą tylko
    // węzły, które ≥1 hurtownia realnie mapuje w category-map.json.
    // 1.1 / 1.1.2 / 1.2 (czarnoprochowa Kolby wg notatki HA-2.04) nie wracają —
    // żadna hurtownia ich nie mapuje; Kolba idzie regułami nazwowymi do 1.4 → HA-2.18.
    '1.3',    // Strzelby Gładkolufowe (parent → review) — Sharg „Strzelby Hatsan”
    '1.4',    // Broń Kolekcjonerska i Historyczna (czarnoprochowa) — Sharg „Broń czarnoprochowa”, Kolba (kolba_rules, dormant — no such products in the feed as of 2026-10-08)
    '1.5',    // Broń alarmowa i sygnałowa — Sharg (rewolwery/pistolety alarmowe), Spechurt „Broń hukowa”

    // ── 02. AMUNICJA I ELEMENTY ELABORACJI (jw.; 2.5/2.6 → grupa A) ───────────
    '2.5',    // Amunicja Hukowa, Alarmowa i Gazowa (parent → review) — Sharg (amunicja alarmowa/hukowa)
    '2.6',    // Elementy Koncesjonowane do Elaboracji (kapiszony, proch czarny, spłonki) — Kolba (kolba_rules, dormant — no such products in the feed as of 2026-10-08)

    // ── 03. OPTYKA STRZELECKA I OPTOELEKTRONIKA ───────────────────────────────
    '3.1',    // Lunety Celownicze
    '3.2',    // Celowniki Kolimatorowe i Holograficzne (w tym Prism Scopes, Magnifiers)
    '3.3',    // Optoelektronika Obserwacyjna (lornetki, monokulary, termowizja, noktowizja)
    '3.4.1',  // Montaże Jednoczęściowe
    '3.4.2',  // Pierścienie i Obejmy Montażowe
    '3.4.3',  // Montaże Dedykowane pod Kolimatory
    '3.4.4',  // Bazy i Szyny Montażowe

    // ── 04. CZĘŚCI ZAMIENNE I TUNING BRONI ───────────────────────────────────
    '04',     // Części Zamienne i Tuning (parent; products mapped here → tag review)
    '4.6.1',  // Kolby

    // ── 05. MAGAZYNKI ─────────────────────────────────────────────────────────
    '5.1',    // Magazynki Pistoletowe i Karabinowe

    // ── 06. OPORZĄDZENIE / KABURY / TORBY ────────────────────────────────────
    '6.1',    // Kabury Pistoletowe
    '6.2.1',  // Ładownice Karabinowe
    '6.2.2',  // Ładownice Pistoletowe
    '6.3.2',  // Pasy Taktyczne i Służbowe
    '6.3.3',  // Pasy Nośne do Broni
    '6.4',    // Pozostałe Wyposażenie do Przenoszenia (chest rigi, torby transportowe)
    '6.4.1',  // Plecaki Taktyczne i Patrolowe
    '6.4.2',  // Torby Strzeleckie

    // ── 07. CZYSZCZENIE I NARZĘDZIA RUSZNIKARSKIE ────────────────────────────
    '7.1.1',  // Solwenty i Zmywacze
    '7.2',    // Przybory do Czyszczenia (parent; zestawy, szczotki, jagi, patche)
    '7.2.1',  // Wyciory i Sznury do Luf
    '7.3.1',  // Klucze i Narzędzia Dedykowane (wybijaki, imadła, wkrętaki)
    '7.3.2',  // Narzędzia Precyzyjne i Pomiarowe

    // ── 09. OCHRONA INDYWIDUALNA ─────────────────────────────────────────────
    '9.1.1',  // Aktywne Ochronniki Słuchu
    '9.1.2',  // Pasywne Ochronniki Słuchu
    '9.1.3',  // Zatyczki i Stopery Douszne (w tym aktywne douszne)
    '9.2.1',  // Okulary Balistyczne
    '9.3.1',  // Kamizelki Zintegrowane i Plate Carriery
    '9.3.2',  // Twarde Płyty Balistyczne
    '9.3.3',  // Miękkie Wkłady Balistyczne
    '9.3.4',  // Hełmy Balistyczne
    '09',     // Ochrona Indywidualna (parent; osłony twarzy → 09, brak liścia)

    // ── 10. AKCESORIA STRZELNICZE I LOGISTYKA ────────────────────────────────
    '10.1',   // Sejfy i Szafy na Broń (parent)
    '10.1.1', // Szafy na Broń Długą
    '10.1.2', // Sejfy na Broń Krótką
    '10.2.1', // Walizki Sztywne
    '10.2.2', // Pokrowce Miękkie (futerały pistoletowe / karabinowe / strzelb)
    '10.3.1', // Urządzenia Pomiarowe i Chronografy
    '10.3.2', // Timery Strzeleckie
    '10.3.3', // Cele Stalowe i Reaktory (gongi, poppery, cele reaktywne)
    '10.3.4', // Cele Papierowe i Akcesoria (tarcze papierowe, maty, flagi)

    // ── 11. WIATRÓWKI I BROŃ PNEUMATYCZNA ────────────────────────────────────
    '11.1',   // Karabinki Pneumatyczne (parent; PCP spans ≤17 J + FAC >17 J)
    '11.1.3', // Karabinki Sprężynowe
    '11.1.4', // Karabinki PCA i CO2
    '11.2',   // Pistolety i Rewolwery Pneumatyczne

    // ── 12. ODZIEŻ I OBUWIE TAKTYCZNE ────────────────────────────────────────
    '12.1',   // Odzież Taktyczna i Mundurowa (parent; bluzy, polary)
    '12.1.1', // Spodnie Taktyczne i Bojówki
    '12.1.2', // Bluzy i Combat Shirty
    '12.1.3', // Kurtki i Warstwy Zewnętrzne
    '12.2',   // Obuwie Taktyczne i Służbowe (parent; buty zimowe)
    '12.2.1', // Obuwie Wysokie (taktyczne, myśliwskie, pustynne)
    '12.2.2', // Obuwie Niskie i Podejściowe
    '12.3.1', // Bielizna Aktywna

    // ── 13. NOŻE I NARZĘDZIA WIELOFUNKCYJNE ──────────────────────────────────
    '13.1',   // Noże ze Stałą Klingą (parent)
    '13.1.1', // Noże Taktyczne i Bojowe
    '13.1.2', // Noże Survivalowe i Bushcraftowe (w tym myśliwskie)
    '13.2',   // Noże Składane (w tym scyzoryki)
    '13.3',   // Narzędzia Wielofunkcyjne — Multitoole (parent)
    '13.3.2', // Multitoole Codzienne
    '13.4.2', // Narzędzia Saperskie (saperki, piły składane)

    // ── 14. SURVIVAL, OUTDOOR I MEDYCYNA ────────────────────────────────────
    '14.1.1', // Indywidualne Apteczki Taktyczne (IFAK)
    '14.1.2', // Wyposażenie Hemostatyczne (stazy, hemostatyki, opatrunki)
    '14.2.1', // Schronienie (namioty, tarpy, hamaki taktyczne)
    '14.2.2', // Systemy Śpiworów i Mat (śpiwory, materace samopompujące)
    '14.2.3', // Oświetlenie i Zasilanie (latarki, powerbanki)
    '14.4.1', // Nawigacja Klasyczna (GPS ręczne, kompasy)
    '14.4.2', // Radiokomunikacja (radiotelefony, zestawy PTT)

    // ── 15. SAMOOBRONA ────────────────────────────────────────────────────────
    '15.1.1', // Gazy Pieprzowe Ręczne (strumień, stożek/chmura, żel/pianka)
    '15.2.1', // Pałki Teleskopowe Hartowane
    '15.3',   // Paralizatory
  ] as const,

  enabledSuppliers: ['kolba', 'sharg', 'spechurt'] as const,

  // 0 = disabled.  Raise to e.g. 30 to drop low-ticket items.
  minPricePln: 0,

  // ── Nowe podkategorie z arkusza korekty 2026-09-29 (HA-2.18) ───────────────
  // Jedna pozycja na nazwę z arkusza (46). `hydra` wg docs/research/taksonomia-p1.md
  // (sekcja „Nowe podkategorie”); null = brak węzła w drzewie 01–15 (pozycja
  // nieaktywna).  Bez `priority` ⇒ newSubcategoryDefaultPriority.  Węzły już
  // obecne w allowedHydraNums (1.3, 1.4, 1.5, 2.5, 2.6) zostają w filtrze
  // niezależnie od tych wierszy.  Odpowiedź klienta na O-22 = `priority` w wierszu.
  newSubcategories: [
    // Wyposażenie strzeleckie i trening
    { name: 'Markery pneumatyczne (RAM i podobne)', category: 'Wyposażenie strzeleckie i trening', hydra: null,
      note: 'brak węzła (arkusz: dział wyposażenia strzeleckiego = 10, bez liścia); Sharg „BROŃ NA KULE (RAM)” mapuje dziś na rodzica 15 → review, poza filtrem' },

    // Broń palna (permit-rules.ts: 1 → grupa A)
    { name: 'Pistolety jednostrzałowe', category: 'Broń palna', hydra: '1.1', note: 'brak liścia; rodzic → review' },
    { name: 'Broń PCC', category: 'Broń palna', hydra: '1.2.4' },
    { name: 'Pistolety maszynowe — broń samoczynna', category: 'Broń palna', hydra: '1.2.4', note: 'arkusz: x (koncesja)' },
    { name: 'Karabinki jednostrzałowe', category: 'Broń palna', hydra: '1.2', note: 'brak liścia; rodzic → review' },
    { name: 'Karabinki powtarzalne', category: 'Broń palna', hydra: '1.2.2' },
    { name: 'Karabinki samoczynne', category: 'Broń palna', hydra: '1.2.3' },
    { name: 'Karabiny jednostrzałowe', category: 'Broń palna', hydra: '1.2', note: 'brak liścia; rodzic → review' },
    { name: 'Karabiny samopowtarzalne', category: 'Broń palna', hydra: '1.2.1' },
    { name: 'Karabiny samoczynne', category: 'Broń palna', hydra: '1.2.3', note: 'arkusz: tylko koncesja/B2G' },
    { name: 'Strzelby jednostrzałowe', category: 'Broń palna', hydra: '1.3.3' },
    { name: 'Strzelby wielolufowe łamane', category: 'Broń palna', hydra: '1.3.3' },
    { name: 'Strzelby powtarzalne', category: 'Broń palna', hydra: '1.3.1' },
    { name: 'Strzelby samopowtarzalne', category: 'Broń palna', hydra: '1.3.2' },
    { name: 'Broń kombinowana', category: 'Broń palna', hydra: '1.3.3', note: '„Strzelby Łamane i Inne”; brak liścia dla broni kombinowanej' },
    { name: 'Broń palna alarmowa', category: 'Broń palna', hydra: '1.5', note: 'węzeł już w allowedHydraNums (HA-2.25)' },
    { name: 'Broń palna sygnałowa', category: 'Broń palna', hydra: '1.5', note: 'węzeł już w allowedHydraNums (HA-2.25)' },
    { name: 'Broń palna gazowa', category: 'Broń palna', hydra: '1.5', note: 'węzeł już w allowedHydraNums (HA-2.25)' },
    { name: 'Broń palna pozbawiona cech użytkowych', category: 'Broń palna', hydra: '1.4', note: 'węzeł już w allowedHydraNums (HA-2.25); arkusz: rejestracja' },

    // Magazynki
    { name: 'Magazynki pozostałe', category: 'Magazynki', hydra: '05', note: 'brak liścia; rodzic → review; Spechurt „Magazynki i akcesoria” → 05' },

    // Amunicja i elaboracja (permit-rules.ts: 2 → grupa A; 8 → bez pozwolenia)
    { name: 'Naboje bocznego zapłonu', category: 'Amunicja i elaboracja', hydra: '2.4' },
    { name: 'Naboje centralnego zapłonu do broni krótkiej', category: 'Amunicja i elaboracja', hydra: '2.1' },
    { name: 'Naboje centralnego zapłonu do broni długiej gwintowanej', category: 'Amunicja i elaboracja', hydra: '2.2' },
    { name: 'Naboje śrutowe do broni gładkolufowej', category: 'Amunicja i elaboracja', hydra: '2.3' },
    { name: 'Naboje kulowe do broni gładkolufowej', category: 'Amunicja i elaboracja', hydra: '2.3', note: 'breneka w opisie 2.3' },
    { name: 'Naboje ślepe i hukowe', category: 'Amunicja i elaboracja', hydra: '2.5', note: 'rodzic → review; węzeł już w allowedHydraNums (HA-2.25)' },
    { name: 'Naboje alarmowe, gazowe i sygnałowe', category: 'Amunicja i elaboracja', hydra: '2.5', note: 'węzeł już w allowedHydraNums (HA-2.25)' },
    { name: 'Naboje scalone elaborowane prochem czarnym', category: 'Amunicja i elaboracja', hydra: '02', note: 'brak liścia; rodzic → review' },
    { name: 'Amunicja szczególnie niebezpieczna lub ograniczona', category: 'Amunicja i elaboracja', hydra: '02', note: 'arkusz: tylko koncesja/B2G; brak liścia' },
    { name: 'Pociski do elaboracji', category: 'Amunicja i elaboracja', hydra: '8.2', note: '15.09: „Pociski” P2 (zmiana nazwy)' },
    { name: 'Prochy bezdymne', category: 'Amunicja i elaboracja', hydra: '2.6', note: 'węzeł już w allowedHydraNums (HA-2.25); 15.09: „Prochy” P3' },
    { name: 'Proch czarny', category: 'Amunicja i elaboracja', hydra: '2.6', note: 'węzeł już w allowedHydraNums (HA-2.25); reguły Kolby uśpione' },
    { name: 'Przybitki, koszyki i komponenty nabojów śrutowych', category: 'Amunicja i elaboracja', hydra: '8.2' },
    { name: 'Prasy elaboracyjne', category: 'Amunicja i elaboracja', hydra: '8.1', note: '15.09: „Prasy” P3 (zmiana nazwy)' },
    { name: 'Matryce elaboracyjne', category: 'Amunicja i elaboracja', hydra: '8.1', note: '15.09: „Matryce” P3 (zmiana nazwy)' },
    { name: 'Dozowniki prochu i wagi', category: 'Amunicja i elaboracja', hydra: '08', note: 'brak liścia; rodzic → review; 15.09: „Dozowniki i wagi” P3' },
    { name: 'Obróbka i kontrola łusek', category: 'Amunicja i elaboracja', hydra: '8.2', note: '15.09: „Obróbka łusek” P3 (zmiana nazwy)' },

    // Broń czarnoprochowa (permit-rules.ts: 1.4 → grupa C / O-29; 1 → A)
    { name: 'Pistolety rozdzielnego ładowania odprzodowego', category: 'Broń czarnoprochowa', hydra: '1.4', note: 'węzeł już w allowedHydraNums (HA-2.25); Sharg „Broń czarnoprochowa”, reguły Kolby uśpione' },
    { name: 'Rewolwery rozdzielnego ładowania', category: 'Broń czarnoprochowa', hydra: '1.4', note: 'jw.' },
    { name: 'Karabiny rozdzielnego ładowania odprzodowego', category: 'Broń czarnoprochowa', hydra: '1.4', note: 'jw.' },
    { name: 'Muszkiety i strzelby rozdzielnego ładowania odprzodowego', category: 'Broń czarnoprochowa', hydra: '1.4', note: 'jw.' },
    { name: 'Broń rozdzielnego ładowania odtylcowego', category: 'Broń czarnoprochowa', hydra: '1.4', note: 'jw.' },
    { name: 'Broń czarnoprochowa na amunicję scaloną — krótka', category: 'Broń czarnoprochowa', hydra: '1.1', note: 'arkusz: x (koncesja) → rodzic 1.1 → review; Sharg wrzuca całą czarnoprochową do 1.4' },
    { name: 'Broń czarnoprochowa na amunicję scaloną — długa gwintowana', category: 'Broń czarnoprochowa', hydra: '1.2', note: 'jw., rodzic 1.2' },
    { name: 'Broń czarnoprochowa na amunicję scaloną — długa gładkolufowa lub kombinowana', category: 'Broń czarnoprochowa', hydra: '1.3', note: 'jw., rodzic 1.3 (już w allowedHydraNums, HA-2.25)' },

    // Akcesoria do samoobrony (O-23)
    { name: 'Broń alarmowo-sygnałowa (BAS)', category: 'Akcesoria do samoobrony', hydra: null,
      note: 'O-23: bez pozwolenia, w dziale samoobrony — drzewo 15 nie ma liścia BAS; dziś Sharg „Rewolwery Alarmowe” / Spechurt „Broń hukowa” → 1.5 (grupa A, HA-2.25); rozjazd do HA-2.17 / HA-2.06' },
  ],

  newSubcategoryDefaultPriority: parseNewSubcategoryPriority(process.env[NEW_SUBCATEGORY_PRIORITY_ENV]),
};
