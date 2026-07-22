# Schematy feedów XML — Kolba / Sharg / Spechurt

Zweryfikowane na realnych plikach (Kolba 62 MB / Sharg light+full+gateway / Spechurt HEAVY 18 MB).

---

## 1. KOLBA — prosty XML, CDATA

**Root:** `<produkty>` → `<produkt>`
**Klucz:** `symbol` (EAN pusty w ~19%)
**Cechy:** brak kategorii i VAT jako pól; warianty tylko jako licznik; ~63 MB.

```xml
<produkty generated="...">
  <produkt>
    <id><![CDATA[22484]]></id>
    <symbol><![CDATA[053-057ZB1]]></symbol>
    <symbol_towaru_u_dostawcy><![CDATA[]]></symbol_towaru_u_dostawcy>
    <ean><![CDATA[]]></ean>                       <!-- często puste -->
    <nazwa><![CDATA[3 x Wiatrówka Optima 90 4.5 mm]]></nazwa>
    <dlugi_opis><![CDATA[<p>...HTML...</p>]]></dlugi_opis>
    <na_magazynie><![CDATA[0]]></na_magazynie>
    <cena_brutto_detal><![CDATA[0]]></cena_brutto_detal>   <!-- bywa 0 -->
    <cena_brutto_hurt><![CDATA[996.09]]></cena_brutto_hurt>
    <atrybuty>
      <atrybut nazwa="Marka"><![CDATA[Hatsan]]></atrybut>
      <atrybut nazwa="Kaliber [mm]"><![CDATA[4,5 mm]]></atrybut>
      <atrybut nazwa="Masa [g]"><![CDATA[3200]]></atrybut>
      <atrybut nazwa="Wymagane zezwolenie?"><![CDATA[nie]]></atrybut>
    </atrybuty>
    <zdjecia>
      <zdjecie pozycja="1"><![CDATA[https://.../foto1.jpg]]></zdjecie>
    </zdjecia>
    <ilosc_wariantow><![CDATA[0]]></ilosc_wariantow>   <!-- tylko liczba, brak węzłów wariantów -->
  </produkt>
</produkty>
```

| Pole | → NormalizedProduct | Uwaga |
|---|---|---|
| `symbol` | connector_sku (klucz) | |
| `ean` | ean | ~19% puste |
| `nazwa`/`dlugi_opis` | name / description_html | HTML z encjami |
| `na_magazynie` | stock | |
| `cena_brutto_hurt` | price_purchase | baza marży |
| `cena_brutto_detal` | price_gross (fallback hurt gdy 0) | |
| `atrybut[Marka]` | brand | |
| `atrybut[Masa [g]]` | weight_g | |
| `atrybut[Wymagane zezwolenie?]` | _hints.requires_license | |
| `zdjecia/zdjecie[@pozycja]` | images | **są** — sortować po pozycji |
| — | tax_rate | brak → domyślnie 23% |
| — | supplier_category | brak w feedzie |

---

## 2. SHARG — IOF 3.0 (IdoSell)

Feed całej hurtowni (militaria + fitness/uroda itd. — **filtrować do defence**). Kilka plików, punkt wejścia = **gateway**.

**Pliki (z gateway/manifestu `<provider_description>`):**
`full` (katalog), `light` (stany+ceny), `stocks` (same stany), `categories`, `producers`, `parameters`, `sizes`, `units`, `warranties`, `series` + `changes` (inkrementalne, po hashu).

**Produkt (full):** `<offer>` → `<products>` → `<product>`, warianty jako `<sizes>/<size>`.

```xml
<product id="100554" vat="23.0" code_on_card="659-11.5 RF DS3 G" producer_code_standard="GTIN13">
  <producer name="..."/>
  <category name="Uroda/Manicure i Pedicure/..."/>
  <category_idosell path="Zdrowie i uroda > ... > Akcesoria"/>
  <description>
    <name xml:lang="pol"><![CDATA[...]]></name>
    <long_desc xml:lang="pol"><![CDATA[...]]></long_desc>
    <short_desc xml:lang="pol"><![CDATA[...]]></short_desc>
  </description>
  <images><large><image url="..." iaiext:priority="1"/></large></images>
  <sizes>
    <size code_producer="5905247629906" iaiext:code_external="000139" code="100554-uniw" weight="0">
      <stock id="1" quantity="24"/>              <!-- stan PER rozmiar; w full szczątkowy -->
      <price gross="78" net="63.41"/>
      <srp gross="78" net="63.41"/>
      <strikethrough_wholesale_price gross="49" net="39.84"/>
    </size>
  </sizes>
</product>
```

**Light (do stanów, mały):**
```xml
<product id="100571" vat="23.0">
  <price gross="60.00" net="48.78"/>
  <srp gross="60.00" net="48.78"/>
  <sizes>
    <size code_producer="5905247620859" iaiext:code_external="000151" weight="1000">
      <stock id="1" quantity="24"/>
    </size>
  </sizes>
</product>
```

| Pole | → NormalizedProduct | Uwaga |
|---|---|---|
| `product/@id` | connector_product_id | |
| `size/@code_producer` | ean (GTIN13) | **na poziomie size** |
| `size/@code_external` | connector_sku | |
| `product/@vat` | tax_rate | |
| `description/name`,`long_desc` | name / description_html | |
| `category` / `category_idosell@path` | supplier_category | ogólne → mapować |
| `producer@name` | brand | |
| `images/.../image@url` (+priority) | images | |
| `size/stock@quantity` | stock (z **light**/stocks) | per size |
| `size/price@gross`,`@net` | cena zakupu | netto+brutto |
| `size/srp` | sugerowana detaliczna | |

---

## 3. SPECHURT — plik HEAVY

**Root:** `<produkty generated="...">` → `<produkt>`
**Dostęp:** whitelista IP (serwer 51.83.134.183). Odświeżanie co ~3 h.
**Cechy:** ceny tylko brutto; `kzs` wycofywane; warianty rozpisane (z per-wariant stanem).

```xml
<produkty generated="2026-07-20 15:02:56">
  <produkt>
    <id>171</id>
    <sku>171</sku>                                <!-- = id -->
    <kzs>1197002035587</kzs>                       <!-- WYCOFYWANY -->
    <ean>022886426026</ean>
    <producent><![CDATA[Condor]]></producent>
    <nazwa><![CDATA[Condor - Pas taktyczny Rigger Belt - Czarny - RB-002]]></nazwa>
    <dlugi_opis><![CDATA[...]]></dlugi_opis>
    <kategoria>A/B/C</kategoria>
    <waga>0.35</waga>                              <!-- kg -->
    <zdjecia>
      <zdjecie pozycja="1"><![CDATA[https://.../01.jpg]]></zdjecie>
    </zdjecia>
    <warianty>
      <wariant>
        <wariant_id>...</wariant_id>
        <wariant_ean>...</wariant_ean>
        <wariant_nazwa>Rozmiar</wariant_nazwa>
        <wariant_wartosc>L</wariant_wartosc>
        <wariant_stan_magazynowy>5</wariant_stan_magazynowy>
      </wariant>
    </warianty>
    <stan_magazynowy>12</stan_magazynowy>          <!-- lub suma wariantów -->
    <cena_zewnetrzna>199.00</cena_zewnetrzna>       <!-- detal BRUTTO -->
    <cena_zewnetrzna_hurt>129.00</cena_zewnetrzna_hurt> <!-- hurt BRUTTO -->
    <vat>0.23</vat>
  </produkt>
</produkty>
```

| Pole | → NormalizedProduct | Uwaga |
|---|---|---|
| `ean` (fallback `sku`) | ean / connector_sku | EAN opcjonalny |
| `producent` | brand | |
| `nazwa`/`dlugi_opis` | name / description_html | |
| `kategoria` | supplier_category | ścieżka `A/B/C` |
| `waga` | weight_g | w **kg** → ×1000 |
| `zdjecia/zdjecie[@pozycja]` | images | |
| `warianty/wariant/*` | variants | rozpisane, per-wariant stan |
| `stan_magazynowy` | stock | suma gdy warianty |
| `cena_zewnetrzna_hurt` | price_purchase | brutto |
| `cena_zewnetrzna` | price_gross | brutto |
| `vat` | tax_rate | `0.23` → 23 |

---

## Wspólne różnice (skrót)

| | Kolba | Sharg (IOF) | Spechurt |
|---|---|---|---|
| Klucz | symbol (EAN ~81%) | code_producer (na size) | ean / sku |
| Warianty | tylko licznik | pełne (size) | pełne (wariant) |
| Stan | produkt | per size (light/stocks) | produkt + wariant |
| Ceny | brutto (detal bywa 0) | netto+brutto+SRP | brutto |
| VAT | brak (→23%) | atrybut | `0.23` |
| Kategoria | brak | 2 systemy (ogólne) | ścieżka |
| Zakres | cały = defence | cały katalog → **filtr defence** | (do potwierdzenia, prawdop. defence) |
| Dostęp | publiczny, 63 MB | token, gateway | whitelista IP, ~3 h |
