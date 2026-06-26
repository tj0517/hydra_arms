# Notatki do rozmowy z klientem — integracje XML (19.06.2026)

> Moje punkty do prowadzenia rozmowy. Cel: ustalić zakres po stronie XML, wyciągnąć od klienta to, co jest po ICH stronie, i pokazać jak rozwiążę resztę.

---

## 0. Jedno zdanie na start

Mamy 3 hurtownie (SPECHURT, Sharg, Kolba), które mają zasilać sklep stanami i produktami przez XML. Parser i normalizacja są już zbudowane w repo (`web/xml-integration`). Zanim ruszymy produkcyjnie, trzeba podjąć **jedną decyzję architektoniczną** i odblokować **kilka dostępów po stronie klienta**.

---

## 1. DECYZJA #1 — gdzie jest źródło prawdy (do ustalenia na rozmowie)

To determinuje całą resztę. Dwa warianty:

- **A. BaseLinker jako centrum** — XML → BaseLinker → Supabase → Next. Spójne z tym, co dotąd mówiliśmy. Wymaga przepięcia zapisu kodu na BaseLinker API.
- **B. Kod/Supabase jako centrum** — XML → Supabase → Next, a BaseLinker tylko do zamówień i własnego magazynu. **To jest to, co już zbudowane w repo** (silnik pisze dziś prosto do Supabase).

➡️ **Pytanie do klienta:** czy BaseLinker ma być realnym źródłem prawdy dla produktów z XML (A), czy wystarczy że trzyma zamówienia/własny magazyn, a produkty z hurtowni żyją w Supabase (B)?

---

## 2. CO MUSI ZROBIĆ KLIENT (akcje po ich stronie — bez tego nie ruszę)

### Dostępy do feedów
- [ ] **Sharg** — feed jest teraz **wyłączony** („Dostęp do oferty został wyłączony"). Klient musi skontaktować się z obsługą Sharga i reaktywować eksport dla konta `office@hydra-arms.com`.
- [ ] **SPECHURT** — feed za **whitelistą IP** (próba łączenia z 83.25.13.208 = błąd ERR105). Klient/IT musi:
  - albo zgłosić SPECHURT-owi **stałe IP**, z którego będziemy pobierać,
  - albo poprosić SPECHURT, żeby whitelistowali **IP BaseLinkera** (jeśli idziemy wariantem A — wtedy zero serwera po naszej stronie).
- [ ] **Kolba** — potwierdzić, że pełny URL działa (mamy tylko sample, pełny plik się nie pobrał).

### Wyjaśnienia / decyzje biznesowe
- [ ] Decyzja **A vs B** (pkt 1).
- [ ] **Marża/ceny** — jaką regułę narzutu stosujemy na cenę zakupu? (feedy dają cenę hurtową, nie sprzedażną; detal z Kolby bywa 0).
- [ ] **Zdjęcia dla Kolby** — feed Kolby **nie ma zdjęć**. Skąd je bierzemy? (inne źródło / ręcznie / placeholder).
- [ ] **Kto przeklikuje review** po pierwszym imporcie (wiek, licencje, kategorie, publikacja) — ich osoba czy my?
- [ ] Czym dokładnie są **KZS** i **Automatyzer** (to NIE hurtownie) — do wyjaśnienia, czy Automatyzer już czegoś nie robi za nich.

---

## 3. CO TRZEBA ZROBIĆ PO STRONIE XML + JAK TO ROZWIĄŻĘ

| Temat | Problem | Jak rozwiązuję |
|---|---|---|
| **Sink** | Kod pisze dziś do Supabase, nie do BL | Po decyzji A: dokładam moduł BaseLinker API (`addInventoryProduct`, `updateInventoryProductsStock`, `updateInventoryProductsPrices`), podmieniam ujście w silniku. Po B: zostaje jak jest. |
| **Klucz dopasowania** | EAN pusty w ~38% Kolby, opcjonalny w SPECHURT | EAN jako klucz główny, fallback na SKU dostawcy; magazyn osobny per hurtownia. |
| **Dedup między hurtowniami** | Bez EAN ten sam towar = duplikaty kart | Match po EAN→connector_id; braki EAN trafiają do review jako możliwe duplikaty. |
| **Kategorie** | Kolba bez kategorii, Sharg ma nierelewantne (np. „Uroda/Manicure") | Buduję **własne drzewo** Hydra Arms + słownik mapujący kategoria dostawcy→nasza; Kolba po atrybutach/słowach kluczowych; reszta → review. |
| **Atrybuty/filtry** | — | Kaliber, marka, energia itp. jako **filtry**, nie kategorie. |
| **Warianty** | Kolba daje tylko licznik, nie rozbija | Sharg/SPECHURT rozpisane normalnie; produkty wariantowe Kolby jako pojedyncze (lub flagowane). |
| **Zdjęcia** | Brak w Kolbie | Wymaga źródła od klienta; do czasu — flaga `no_images`. |
| **Ceny** | Feedy = ceny hurtowe; detal Kolby bywa 0 | Cena sprzedaży z **reguły marży**, nie z feedu. |
| **Compliance (wiek/licencja)** | XML nie da pewnej informacji | Auto-podpowiedzi (`>17J`, „Wymagane zezwolenie?") → admin potwierdza; **pola zablokowane** = cron ich nie nadpisze. |
| **Świeżość / bezpieczeństwo** | SPECHURT raz/dobę; feedy potrafią paść | Guard „nie zeruj stanów przy pustym/błędnym feedzie" + alert; bufor na SPECHURT. |
| **SPECHURT connector** | W repo tylko stub | Dokończę po odblokowaniu IP (mam spec z PDF). |

---

## 4. JAK TO BĘDZIE DZIAŁAĆ (przepływ do pokazania)

```
1× BIG IMPORT   → BL/Supabase pełne produktami (nieaktywne)
      ▼
ADMIN REVIEW    → wiek / licencja / kategoria / zdjęcia / publikacja
                  (te pola zostają ZABLOKOWANE)
      ▼
CRON            → tylko stany + ceny; locked fields nietknięte
                  nowe produkty → wracają do review
```

Harmonogram crona:
- Sharg `light` co ~1h (stany+ceny), `incremental` (gateway) co ~15 min, pełny nocą.
- Kolba pełny raz/dobę (brak lekkiego pliku).
- SPECHURT raz/dobę (gdy IP odblokowane) — musi stać na maszynie ze stałym IP.

---

## 5. KOLEJNOŚĆ PRAC (co po czym)

1. **Decyzja A/B** + odblokowanie dostępów (klient).
2. Sink + reguła marży + drzewo kategorii i słownik mapujący.
3. Dokończenie SPECHURT, guardy bezpieczeństwa + alerty.
4. Big import → review przez admina.
5. Włączenie crona → tryb utrzymaniowy.

---

## 6. Pytania do odhaczenia na rozmowie

- [ ] A czy B?
- [ ] Reguła marży?
- [ ] Skąd zdjęcia do Kolby?
- [ ] Kto reaktywuje Sharga i zgłasza IP do SPECHURT?
- [ ] Kto robi review (wiek/licencje/kategorie)?
- [ ] Co to KZS i Automatyzer?

---

## 7. Źródła i dostępy (stan na 19.06.2026)

> ⚠️ Pełne URL-e Sharga/Spechurtu zawierają **tokeny (sekrety)** — trzymać w menedżerze sekretów / pliku gitignored, NIE w repo.

| Źródło | Typ | URL / dostęp | Status |
|---|---|---|---|
| **Kolba** | hurtownia, prosty XML | `b2b.kolba.pl/.../KOLBAB2B.xml` (publiczny, bez auth) | ✅ zweryfikowany: **62,8 MB / 13 687 szt.** — za duży dla web_fetch i Automatyzera (10 MB) → pobieranie strumieniowe; brak kategorii/VAT, EAN pusty 14% |
| **Sharg — full** | hurtownia, IOF 3.0 katalog | `hurt.sharg.pl/edi/export-offer.php?...type=full` (token) | przez przeglądarkę działa; server→server dawał „disabled" (do potwierdzenia dla crona) |
| **Sharg — light** | stany+ceny | `...type=light` (token) | ✅ zweryfikowany 24.06: 2,48 MB, 6052 produkty, 7501 rozmiarów |
| **Sharg — categories** | słownik kategorii | `...type=categories` (token) | ✅ 295 kategorii (ogólne: sport/fitness/sporty walki — do zmapowania) |
| **Sharg — gateway** | manifest/wejście (8381) | `...type=gateway` (token) | ✅ działa — mamy świeży plik z 19.06; z niego: categories/producers/parameters/light/stocks/changes |
| **Automatyzer** | NIE hurtownia — usługa | `xml.automatyzer.com` | **konwerter XML → format BaseLinker**; limit pliku **10 MB** → nie ogarnie Kolby (62,8 MB); konwertuje format, nie naprawia braków danych |
| **Spechurt** | hurtownia, HEAVY | `b2b.spechurt.pl/xml_heavy_export.php?key=...` | ⛔ whitelista IP — ERR105 z 2 IP (83.25.13.208 i 37.31.147.160); blokuje każde nasze IP |
| **KZS** | — | brak na liście źródeł | NIE jest dostawcą; wgrany „KZS.pdf" to faktycznie spec SPECHURT |

**Wniosek dla Sharga:** integrować przez **gateway** (jeden URL wejścia → hashe → pobieramy tylko zmiany). Najpierw jednak wyjaśnić ze Shargiem, czemu `full`/`light` zwracają „disabled", a gateway działa.


newsletter jako sma element formualrza konaktwoego 
ikony w wersji mobilnej 
mobilna wersjaaaaaa
27.06 10:00 spotkanie 
pryzogtuj plik xml- prolbmey wyślij dziś/ jutro 
