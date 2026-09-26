# Problemy feedów XML — Kolba / Sharg / SPECHURT

**Zakres:** analiza realnych plików (sample Kolby i Sharga) oraz specyfikacji SPECHURT.
**Uwaga:** liczby procentowe pochodzą z **próbek** (sample ucięte na 60 KB) i są poglądowe — finalnie do potwierdzenia na pełnych plikach.

---

## SHARG (format IOF 3.0) — ZWERYFIKOWANY przez przeglądarkę: DZIAŁA

> Pobrane na żywo 24.06: `gateway`, `light` (2,48 MB, **6052 produkty**, 7501 rozmiarów), `categories` (**295 kategorii**) — wszystko status 200, żadnego „wyłączone". Wcześniejsze „Dostęp wyłączony" dotyczyło **pobierania server→server**, nie konta.

| # | Problem / uwaga | Skutek | Czyja akcja |
|---|---|---|---|
| 1 | **`full`/`light` przez fetch server→server dawały „Dostęp wyłączony"**, choć przez przeglądarkę działają | Cron (serwer) może być blokowany po IP/User-Agent | **Klient → Sharg:** potwierdzić, że pobieranie automatyczne (serwer) jest dozwolone / ew. whitelist IP |
| 2 | W panelu status **„Pobrany: Nigdy"** | Integracja nigdy nie uruchomiona (ale pliki się generują) | Klient: pierwszy pull |
| 3 | **Stan w `full` szczątkowy** | Stan brać z `light`/`stocks`, nie z `full` | My |
| 4 | **EAN i stan na poziomie wariantu** (`size/@code_producer`, `size/stock`) | Łatwo źle zmapować klucz/stan | My (mapowanie) |
| 5 | **Kategorie Sharga są ogólne** (Sport, fitness, sporty walki, nurkowanie…), nie „broniarskie" | Nie nadają się 1:1 — trzeba mapować na nasze drzewo | My |

> Pozytyw: format bogaty i poprawny (netto+brutto+SRP, kategorie, zdjęcia, VAT, słowniki w osobnych plikach, sync inkrementalny po hashach). **Realnie najgotowszy z trzech.**

---

## KOLBA (prosty XML) — zweryfikowane na PEŁNYM pliku (62,8 MB, 13 687 produktów)

> Liczby z całego pliku, nie z próbki. Plik jest publiczny (status 200, bez autoryzacji), ale **ogromny — 62,8 MB**.

| # | Problem | Skala (pełny plik) | Skutek | Czyja akcja |
|---|---|---|---|---|
| 1 | **Rozmiar 62,8 MB** | 13 687 produktów | Nie przejdzie przez Automatyzer (limit 10 MB) ani web_fetch; pobieranie musi być **strumieniowe po stronie serwera**; cron ściąga 62 MB/dobę | My (konektor) |
| 2 | **Brak kategorii w feedzie** | 100% (feed nie ma kategorii) | Kategoryzacja w całości po naszej stronie — HA-2.12 (2026-09-26): deterministyczne reguły w `category-map.json` (marka, atrybut, słowa w nazwie) pokrywają ~55% pełnego feedu (13 878 produktów); reszta trafia do „00. DO PRZYPISANIA" (m.in. ASG/łucznictwo/myślistwo — brak gałęzi w drzewie, O-20) | My (drzewo + reguły) |
| 3 | **Brak stawki VAT** | 100% | Trzeba przyjąć domyślną (23%) lub mapować | My |
| 4 | **EAN pusty** | 2 789 = **14%** | Brak klucza → ryzyko duplikatów | My + (klient: czy Kolba uzupełni EAN?) |
| 5 | **Brak ceny zakupu** (`cena_brutto_hurt` 0/pusta) | 1 001 = **~7%** | Nie da się policzyć ceny sprzedaży | My + klient |
| 6 | **Warianty tylko jako licznik** | 1 386 produktów (~10%) | Nie da się rozbić na warianty z osobnym stanem | My (decyzja: pojedynczy produkt) |
| 7 | `cena_brutto_detal=0` | 417 | Nie ufać cenie detalicznej z feedu | My: cena z marży |
| 8 | Zduplikowane `id` | 4 | Drobne, do obsłużenia przy imporcie | My |
| 9 | Opisy w pełnym HTML z encjami (`&oacute;`) | większość | Do oczyszczenia przed publikacją | My |

> ✅ **Zdjęcia NIE są problemem** — wcześniejsza próbka/README myliły. Na pełnym pliku tylko **7 z 13 687** produktów jest bez zdjęcia.

---

## SPECHURT (plik HEAVY) — dostęp działa z serwera 51.83.134.183, z Maca ERR105

> Zweryfikowane na realnym pliku 2026-09-26 (z serwera 51.83.134.183, 17 MB, 6 188 `<produkt>`):
> parser sparsował wszystkie 6 188 pozycji bez błędów (`diff = 0`). Puste EAN: 413 (6,7%),
> zerowy/pusty stan: 1 578 (25,5%), pusta/zerowa cena zakupu: 0. Pola tekstowe to plain text
> z HTML zescapowanym encjami, **nie CDATA** (0 wystąpień w pliku) — dokumentacja poniżej i w
> `SCHEMAS.md`/`connectors/spechurt.ts` była w tym błędna, poprawiono w HA-2.11. Liczba
> produktów niższa niż w imporcie z lipca (6 854) — zmiana po stronie dostawcy, nie zbadana
> dalej (poza zakresem HA-2.11).

| # | Problem | Skutek | Czyja akcja |
|---|---|---|---|
| 1 | **Dostęp działa tylko z serwera 51.83.134.183 (whitelista IP)** — z Maca (i każdego innego IP) `ERR105` | Podgląd/import lokalny wymaga pliku pobranego na serwerze i skopiowanego na Maca (`--from-file`, patrz README) | Zamknięte — HA-2.11. Import/cron na serwerze → HA-2.15 |
| 2 | **Stan generowany raz na dobę** (3:00–4:00) | Brak stanów w czasie zbliskim rzeczywistemu → ryzyko przesprzedaży | My (bufor bezpieczeństwa) |
| 3 | **EAN opcjonalny** — 6,7% pustych na realnym pliku | Część bez klucza EAN | My (fallback na SKU) |
| 4 | Pole **`kzs` wycofywane** | Nie opierać klucza na `kzs` | My |
| 5 | **Ceny tylko brutto** | Netto trzeba liczyć z VAT | My |

---

## Nie-hurtownie (do wyjaśnienia)

- **Automatyzer** (`xml.automatyzer.com`) — to **usługa**, nie hurtownia. Wyjaśnić, czy już czegoś nie agreguje/pośredniczy.
- **KZS** — **nie ma na liście źródeł**; nie jest dostawcą. (Wgrany plik „KZS.pdf" to faktycznie specyfikacja SPECHURT.)

---

## Co blokuje start (skrót dla klienta)

1. **Sharg** — działa (zweryfikowane); potwierdzić tylko, że pobieranie automatyczne/serwerowe jest dozwolone (cron).
2. **SPECHURT** — dostęp działa z serwera 51.83.134.183 (whitelista IP potwierdzona); z Maca nadal ERR105. Podgląd lokalny → `--from-file` (HA-2.11); import/cron na serwerze → HA-2.15.
3. **Kolba** — plik publiczny, ale 62,8 MB → pobieranie strumieniowe po naszej stronie (Automatyzer odpada, limit 10 MB); braki kategorii/VAT/EAN do obsłużenia w mapowaniu.
4. Wspólnie: reguła marży, kto robi przegląd produktów (kategorie/wiek/licencje).
