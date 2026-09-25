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
 */

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
}

export const ASSORTMENT_RULES: AssortmentRules = {
  allowedHydraNums: [
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

    // ── WYKLUCZONE PENDING O-11 ───────────────────────────────────────────────
    // Broń czarnoprochowa (gałąź 01/02, Kolba) wykluczona do czasu rozstrzygnięcia
    // wymagań compliance / licencjonowania w O-11.
    // Wiersze do przywrócenia po O-11: '1.1', '1.1.2', '1.2', '1.3', '2.6'
  ] as const,

  enabledSuppliers: ['kolba', 'sharg', 'spechurt'] as const,

  // 0 = disabled.  Raise to e.g. 30 to drop low-ticket items.
  minPricePln: 0,
};
