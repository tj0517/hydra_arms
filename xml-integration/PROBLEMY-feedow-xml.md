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
| 2 | **Brak kategorii** | 100% | Kategoryzacja w całości po naszej stronie | My (drzewo + reguły) |
| 3 | **Brak stawki VAT** | 100% | Trzeba przyjąć domyślną (23%) lub mapować | My |
| 4 | **EAN pusty** | 2 789 = **14%** | Brak klucza → ryzyko duplikatów | My + (klient: czy Kolba uzupełni EAN?) |
| 5 | **Brak ceny zakupu** (`cena_brutto_hurt` 0/pusta) | 1 001 = **~7%** | Nie da się policzyć ceny sprzedaży | My + klient |
| 6 | **Warianty tylko jako licznik** | 1 386 produktów (~10%) | Nie da się rozbić na warianty z osobnym stanem | My (decyzja: pojedynczy produkt) |
| 7 | `cena_brutto_detal=0` | 417 | Nie ufać cenie detalicznej z feedu | My: cena z marży |
| 8 | Zduplikowane `id` | 4 | Drobne, do obsłużenia przy imporcie | My |
| 9 | Opisy w pełnym HTML z encjami (`&oacute;`) | większość | Do oczyszczenia przed publikacją | My |

> ✅ **Zdjęcia NIE są problemem** — wcześniejsza próbka/README myliły. Na pełnym pliku tylko **7 z 13 687** produktów jest bez zdjęcia.

---

## SPECHURT (plik HEAVY) — najpierw w ogóle brak dostępu

| # | Problem | Skutek | Czyja akcja |
|---|---|---|---|
| 1 | **Brak dostępu — whitelista IP** — `ERR105` zweryfikowane 2× z dwóch różnych IP (83.25.13.208 oraz 37.31.147.160 z przeglądarki) | Nie mamy ani jednego realnego rekordu — feed nigdy nie pobrany, z żadnego naszego IP | **Klient → SPECHURT:** zgłosić docelowe stałe IP (lub IP BaseLinkera) na whitelistę |
| 2 | **Stan generowany raz na dobę** (3:00–4:00) | Brak stanów w czasie zbliskim rzeczywistemu → ryzyko przesprzedaży | My (bufor bezpieczeństwa) |
| 3 | **EAN opcjonalny** („jeśli produkt go posiada") | Część bez klucza EAN | My (fallback na SKU) |
| 4 | Pole **`kzs` wycofywane** | Nie opierać klucza na `kzs` | My |
| 5 | **Ceny tylko brutto**; brak deklaracji kodowania w odpowiedzi | Netto trzeba liczyć z VAT; pilnować UTF-8 | My |
| 6 | Literówki/niespójności w dokumentacji (`wariant_wariant_stan_magazynowy`, urwane tagi) | Realny plik trzeba zwalidować po pierwszym pobraniu | My (walidacja) |

---

## Nie-hurtownie (do wyjaśnienia)

- **Automatyzer** (`xml.automatyzer.com`) — to **usługa**, nie hurtownia. Wyjaśnić, czy już czegoś nie agreguje/pośredniczy.
- **KZS** — **nie ma na liście źródeł**; nie jest dostawcą. (Wgrany plik „KZS.pdf" to faktycznie specyfikacja SPECHURT.)

---

## Co blokuje start (skrót dla klienta)

1. **Sharg** — działa (zweryfikowane); potwierdzić tylko, że pobieranie automatyczne/serwerowe jest dozwolone (cron).
2. **SPECHURT** — zgłosić IP na whitelistę (potwierdzone: blokuje każde nasze IP).
3. **Kolba** — plik publiczny, ale 62,8 MB → pobieranie strumieniowe po naszej stronie (Automatyzer odpada, limit 10 MB); braki kategorii/VAT/EAN do obsłużenia w mapowaniu.
4. Wspólnie: reguła marży, kto robi przegląd produktów (kategorie/wiek/licencje).
