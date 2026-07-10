# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shop/product-detail.spec.ts >> /sklep/[id] — product detail page >> navigating from listing opens detail page
- Location: tests/shop/product-detail.spec.ts:12:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:3001/sklep/619345684"
Received: "http://localhost:3001/sklep"
Timeout:  10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    20 × unexpected value "http://localhost:3001/sklep"

```

```yaml
- navigation:
  - link "HYDRA.ARMS":
    - /url: /
  - list:
    - listitem:
      - link "Usługi":
        - /url: /uslugi
    - listitem:
      - link "O nas":
        - /url: /o-nas
    - listitem:
      - link "Współpraca":
        - /url: /wspolpraca
    - listitem:
      - link "Blog":
        - /url: /blog
    - listitem:
      - link "Kontakt":
        - /url: /kontakt
    - listitem:
      - link "[ Zaloguj ]":
        - /url: /konto/login
    - listitem:
      - link "[ Zarejestruj ]":
        - /url: /konto/rejestracja
- main:
  - img
  - text: X:0000 Y:0000 HYDRA ARMS / Sklep
  - heading "Sklep" [level=1]
  - button "01 Kategoria / 01 Broń i strzelanie 39 produktów ODKRYJ →":
    - text: "01"
    - paragraph: Kategoria / 01
    - heading "Broń i strzelanie" [level=3]
    - text: 39 produktów ODKRYJ →
  - button "02 Kategoria / 02 Odzież i wyposażenie 22 produktów ODKRYJ →":
    - text: "02"
    - paragraph: Kategoria / 02
    - heading "Odzież i wyposażenie" [level=3]
    - text: 22 produktów ODKRYJ →
  - button "03 Kategoria / 03 Optyka 15 produktów ODKRYJ →":
    - text: "03"
    - paragraph: Kategoria / 03
    - heading "Optyka" [level=3]
    - text: 15 produktów ODKRYJ →
  - paragraph: Przeglądaj
  - heading "Polecane kategorie" [level=2]
  - button "Wszystkie kategorie →"
  - button "Samoobrona 15 szt.":
    - paragraph: Samoobrona
    - paragraph: 15 szt.
  - button "Noże i broń biała 9 szt.":
    - paragraph: Noże i broń biała
    - paragraph: 9 szt.
  - paragraph: Właśnie dodane
  - heading "Nowe produkty" [level=2]
  - button "Zobacz więcej →"
  - link "Buty M-Tac Summer Light Trekking Dark Olive (805514-DO) Obuwie taktyczne Buty M-Tac Summer Light Trekking Dark Olive (805514-DO) 210,00 PLN W MAGAZYNIE · 1 SZT. [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619345684
    - img "Buty M-Tac Summer Light Trekking Dark Olive (805514-DO)"
    - text: Obuwie taktyczne
    - heading "Buty M-Tac Summer Light Trekking Dark Olive (805514-DO)" [level=3]
    - text: 210,00 PLN W MAGAZYNIE · 1 SZT.
    - button "[ DODAJ DO KOSZYKA ]"
  - link "Buty Bennon Recado XTR O2 Low, Regi-Tex Vibram (0696030260) Obuwie taktyczne Buty Bennon Recado XTR O2 Low, Regi-Tex Vibram (0696030260) 498,00 PLN W MAGAZYNIE · 2 SZT. [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619345662
    - img "Buty Bennon Recado XTR O2 Low, Regi-Tex Vibram (0696030260)"
    - text: Obuwie taktyczne
    - heading "Buty Bennon Recado XTR O2 Low, Regi-Tex Vibram (0696030260)" [level=3]
    - text: 498,00 PLN W MAGAZYNIE · 2 SZT.
    - button "[ DODAJ DO KOSZYKA ]"
  - link "Buty Bennon Panther XTR O2 Low, Regi-Tex Vibram (0760030260) Obuwie taktyczne Buty Bennon Panther XTR O2 Low, Regi-Tex Vibram (0760030260) 488,00 PLN W MAGAZYNIE · 1 SZT. [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619345638
    - img "Buty Bennon Panther XTR O2 Low, Regi-Tex Vibram (0760030260)"
    - text: Obuwie taktyczne
    - heading "Buty Bennon Panther XTR O2 Low, Regi-Tex Vibram (0760030260)" [level=3]
    - text: 488,00 PLN W MAGAZYNIE · 1 SZT.
    - button "[ DODAJ DO KOSZYKA ]"
  - link "Buty Bennon Nexo Khaki Low (0854030050) NIEDOSTĘPNY Obuwie taktyczne Buty Bennon Nexo Khaki Low (0854030050) 123,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619345608
    - img "Buty Bennon Nexo Khaki Low (0854030050)"
    - text: NIEDOSTĘPNY Obuwie taktyczne
    - heading "Buty Bennon Nexo Khaki Low (0854030050)" [level=3]
    - text: 123,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - paragraph: Wybór redakcji
  - heading "Polecane produkty" [level=2]
  - button "Zobacz więcej →"
  - link "Amunicja hukowa pistoletowa WADIE 9mm P.A.Knall 50szt (845644) Broń alarmowa i hukowa Amunicja hukowa pistoletowa WADIE 9mm P.A.Knall 50szt (845644) 1,78 PLN W MAGAZYNIE · 78400 SZT. [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619345325
    - img "Amunicja hukowa pistoletowa WADIE 9mm P.A.Knall 50szt (845644)"
    - text: Broń alarmowa i hukowa
    - heading "Amunicja hukowa pistoletowa WADIE 9mm P.A.Knall 50szt (845644)" [level=3]
    - text: 1,78 PLN W MAGAZYNIE · 78400 SZT.
    - button "[ DODAJ DO KOSZYKA ]"
  - link "Buty Bennon Panther XTR O2 Low, Regi-Tex Vibram (0760030260) Obuwie taktyczne Buty Bennon Panther XTR O2 Low, Regi-Tex Vibram (0760030260) 488,00 PLN W MAGAZYNIE · 1 SZT. [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619345638
    - img "Buty Bennon Panther XTR O2 Low, Regi-Tex Vibram (0760030260)"
    - text: Obuwie taktyczne
    - heading "Buty Bennon Panther XTR O2 Low, Regi-Tex Vibram (0760030260)" [level=3]
    - text: 488,00 PLN W MAGAZYNIE · 1 SZT.
    - button "[ DODAJ DO KOSZYKA ]"
  - link "Buty Bennon Recado XTR O2 Low, Regi-Tex Vibram (0696030260) Obuwie taktyczne Buty Bennon Recado XTR O2 Low, Regi-Tex Vibram (0696030260) 498,00 PLN W MAGAZYNIE · 2 SZT. [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619345662
    - img "Buty Bennon Recado XTR O2 Low, Regi-Tex Vibram (0696030260)"
    - text: Obuwie taktyczne
    - heading "Buty Bennon Recado XTR O2 Low, Regi-Tex Vibram (0696030260)" [level=3]
    - text: 498,00 PLN W MAGAZYNIE · 2 SZT.
    - button "[ DODAJ DO KOSZYKA ]"
  - link "Buty M-Tac Summer Light Trekking Dark Olive (805514-DO) Obuwie taktyczne Buty M-Tac Summer Light Trekking Dark Olive (805514-DO) 210,00 PLN W MAGAZYNIE · 1 SZT. [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619345684
    - img "Buty M-Tac Summer Light Trekking Dark Olive (805514-DO)"
    - text: Obuwie taktyczne
    - heading "Buty M-Tac Summer Light Trekking Dark Olive (805514-DO)" [level=3]
    - text: 210,00 PLN W MAGAZYNIE · 1 SZT.
    - button "[ DODAJ DO KOSZYKA ]"
  - text: KATALOG PRODUKTÓW Koszyk
  - button "×"
  - img
  - paragraph: KOSZYK JEST PUSTY
  - text: 200 PRODUKTÓW
  - textbox "SZUKAJ..."
  - complementary:
    - text: Kategorie
    - navigation:
      - button "▸ WSZYSTKIE PRODUKTY 200"
      - button "BROŃ I STRZELANIE"
      - button "Rozwiń": +
      - button "NOŻE I BROŃ BIAŁA"
      - button "Rozwiń": +
      - button "ODZIEŻ I WYPOSAŻENIE"
      - button "Rozwiń": +
      - button "OPTYKA"
      - button "Rozwiń": +
      - button "SAMOOBRONA"
      - button "Rozwiń": +
    - text: Filtry
    - paragraph: Dostępność
    - text: Tylko dostępne
    - paragraph: Cena (PLN)
    - spinbutton
    - text: —
    - spinbutton
  - link "NIEDOSTĘPNY 10 x nóż Morakniv Hook 162 Double Edge stal nierdzewna 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638287
    - text: NIEDOSTĘPNY
    - heading "10 x nóż Morakniv Hook 162 Double Edge stal nierdzewna" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY 10 x nóż Morakniv Hook 163 Double Edge stal nierdzewna 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638311
    - text: NIEDOSTĘPNY
    - heading "10 x nóż Morakniv Hook 163 Double Edge stal nierdzewna" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY 10 x nóż Morakniv Wood Carving Hook 164 Right stal nierdzewna 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638330
    - text: NIEDOSTĘPNY
    - heading "10 x nóż Morakniv Wood Carving Hook 164 Right stal nierdzewna" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY 169Nóż składany Kizer Mini Bulldog Ki3672SA1 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638369
    - text: NIEDOSTĘPNY
    - heading "169Nóż składany Kizer Mini Bulldog Ki3672SA1" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY 3 x Wiatrówka Optima 90 4.5 mm 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638224
    - text: NIEDOSTĘPNY
    - heading "3 x Wiatrówka Optima 90 4.5 mm" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY 45 x Kule metalowe RGun Steel Core Devastator kal. .68 / 40 szt. do Umarex HDR 68 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638350
    - text: NIEDOSTĘPNY
    - heading "45 x Kule metalowe RGun Steel Core Devastator kal. .68 / 40 szt. do Umarex HDR 68" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY 5 x krzesiwo Morakniv Fire Starter 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638242
    - text: NIEDOSTĘPNY
    - heading "5 x krzesiwo Morakniv Fire Starter" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY 6 x ostrzałka karabińczyk Lansky Road 1 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638261
    - text: NIEDOSTĘPNY
    - heading "6 x ostrzałka karabińczyk Lansky Road 1" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter Acheron TriLug 1/2\" 28 UNEF 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638390
    - text: NIEDOSTĘPNY
    - heading "Adapter Acheron TriLug 1/2\" 28 UNEF" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter aluminiowy FTCS dla kolby AR15 do AKM 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638408
    - text: NIEDOSTĘPNY
    - heading "Adapter aluminiowy FTCS dla kolby AR15 do AKM" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter CO2 Walther 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638433
    - text: NIEDOSTĘPNY
    - heading "Adapter CO2 Walther" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping Hawke do lunet Nature Trek 65/80 i Endurance 50/60/85 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638457
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping Hawke do lunet Nature Trek 65/80 i Endurance 50/60/85" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping Hawke do lunet obserwacyjnych z okuarem 28-45 mm 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638484
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping Hawke do lunet obserwacyjnych z okuarem 28-45 mm" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping Hawke do lunety Nature Trek 9-27x56 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638508
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping Hawke do lunety Nature Trek 9-27x56" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping Hawke do Smartfona 60 mm 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638529
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping Hawke do Smartfona 60 mm" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping T2 Hawke do aparatów Canon EOS 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638551
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping T2 Hawke do aparatów Canon EOS" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping T2 Hawke do aparatów Fuji 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638570
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping T2 Hawke do aparatów Fuji" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping T2 Hawke do aparatów Minolta Maxxum 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638593
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping T2 Hawke do aparatów Minolta Maxxum" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping T2 Hawke do aparatów Nikon 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638613
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping T2 Hawke do aparatów Nikon" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping T2 Hawke do aparatów Olympus 4/3 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638635
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping T2 Hawke do aparatów Olympus 4/3" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping T2 Hawke do aparatów Pentax K 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638658
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping T2 Hawke do aparatów Pentax K" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping T2 Hawke do aparatów Sony Alpha 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638690
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping T2 Hawke do aparatów Sony Alpha" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter digiscoping T2 Hawke do aparatów Sony NEX-E 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638723
    - text: NIEDOSTĘPNY
    - heading "Adapter digiscoping T2 Hawke do aparatów Sony NEX-E" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - link "NIEDOSTĘPNY Adapter do bipodów Harris na M-LOK 0,00 PLN BRAK W MAGAZYNIE [ DODAJ DO KOSZYKA ]":
    - /url: /sklep/619638755
    - text: NIEDOSTĘPNY
    - heading "Adapter do bipodów Harris na M-LOK" [level=3]
    - text: 0,00 PLN BRAK W MAGAZYNIE
    - button "[ DODAJ DO KOSZYKA ]" [disabled]
  - button "← POPRZEDNIA" [disabled]
  - button "1"
  - button "2"
  - button "3"
  - text: …
  - button "9"
  - button "NASTĘPNA →"
- text: // SUBSKRYBUJ Kanał informacyjny
- checkbox "AKTUALNOŚCI" [checked]
- text: AKTUALNOŚCI
- checkbox "BLOG"
- text: BLOG
- checkbox "B2G"
- text: B2G
- checkbox "B2B"
- text: B2B
- checkbox "SKLEP"
- text: SKLEP >
- textbox "EMAIL@DOMENA.PL"
- button "ZAPISZ"
- contentinfo:
  - text: HYDRA.ARMS
  - paragraph: HYDRA ARMS SP. Z O.O.
  - paragraph: ul. Cechowa 44B 30-614 Kraków
  - paragraph: "Sklep: ul. Gdańska 22, 31-411 Kraków"
  - paragraph: "NIP: [ 6793302181 ]"
  - paragraph: "REGON: [ 528976880 ]"
  - paragraph: "KRS: [ 0001111593 ]"
  - paragraph: "BDO: [ 000654184 ]"
  - paragraph: "Koncesja MSWiA: [ B-117/2025 ]"
  - paragraph: "NCAGE: [ 9CJ3H ]"
  - paragraph: "D-U-N-S®: [ 665007622 ]"
  - paragraph: "UEI: [ YUXMMDP8MNP4 ]"
  - heading "Certyfikaty" [level=4]
  - img "CCJ — AQAP 2110:2016, PN-EN ISO 9001:2015, WSK"
  - img "NCAGE 9CJ3H"
  - img "CCJ + PCA — PN-EN ISO 9001:2015, AC 057"
  - heading "Nawigacja" [level=4]
  - list:
    - listitem:
      - link "Usługi":
        - /url: /uslugi
    - listitem:
      - link "O nas":
        - /url: /o-nas
    - listitem:
      - link "Współpraca":
        - /url: /wspolpraca
    - listitem:
      - link "Aktualności":
        - /url: /aktualnosci
    - listitem:
      - link "Blog":
        - /url: /blog
    - listitem:
      - link "Kontakt":
        - /url: /kontakt
    - listitem:
      - link "Sklep":
        - /url: /sklep
  - link "Facebook":
    - /url: "#!"
    - img
  - link "Instagram":
    - /url: "#!"
    - img
  - link "LinkedIn":
    - /url: "#!"
    - img
  - link "Email":
    - /url: mailto:biuro@hydraarms.com
    - img
  - link "[ Polityka prywatności ]":
    - /url: /polityka-prywatnosci
  - link "[ Regulamin ]":
    - /url: /regulamin
  - link "[ Polityka jakości ]":
    - /url: /polityka-jakosci
  - link "[ Polityka WSK ]":
    - /url: /polityka-wsk
  - text: "[ REALIZACJA ... ]"
- button "KOSZYK 0":
  - img
  - text: KOSZYK 0
- alert
```

# Test source

```ts
  1  | /**
  2  |  * Product detail page (/sklep/[id]) E2E tests
  3  |  */
  4  | import { test, expect } from '@playwright/test';
  5  | import { dismissCookies, hideBanner } from './fixtures';
  6  | 
  7  | test.describe('/sklep/[id] — product detail page', () => {
  8  |   test.beforeEach(async ({ page }) => {
  9  |     await dismissCookies(page);
  10 |   });
  11 | 
  12 |   test('navigating from listing opens detail page', async ({ page }) => {
  13 |     await page.goto('/sklep', { waitUntil: 'domcontentloaded' });
  14 |     await hideBanner(page);
  15 |     await page.waitForSelector('a[href^="/sklep/"]', { timeout: 20_000 });
  16 | 
  17 |     const href = await page.locator('a[href^="/sklep/"]').first().getAttribute('href');
  18 |     expect(href).toBeTruthy();
  19 | 
  20 |     await page.locator(`a[href="${href}"]`).first().click();
> 21 |     await expect(page).toHaveURL(href!, { timeout: 10_000 });
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  22 |     await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  23 |   });
  24 | 
  25 |   test('detail page shows product name', async ({ page }) => {
  26 |     const res = await page.request.get('/api/shop/products?page=1');
  27 |     const { products } = await res.json();
  28 |     expect(products.length).toBeGreaterThan(0);
  29 | 
  30 |     await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });
  31 | 
  32 |     const heading = page.locator('h1, h2').first();
  33 |     await expect(heading).toBeVisible({ timeout: 10_000 });
  34 |     const name = await heading.textContent();
  35 |     expect(name?.trim().length).toBeGreaterThan(0);
  36 |   });
  37 | 
  38 |   test('detail page shows price', async ({ page }) => {
  39 |     const res = await page.request.get('/api/shop/products?page=1');
  40 |     const { products } = await res.json();
  41 | 
  42 |     await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });
  43 |     await page.waitForSelector('text=PLN', { timeout: 10_000 });
  44 |     await expect(page.getByText('PLN').first()).toBeVisible();
  45 |   });
  46 | 
  47 |   test('add-to-cart button is present', async ({ page }) => {
  48 |     const res = await page.request.get('/api/shop/products?page=1');
  49 |     const { products } = await res.json();
  50 | 
  51 |     await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });
  52 | 
  53 |     const btn = page.getByText(/DODAJ DO KOSZYKA|BRAK W MAGAZYNIE/i).first();
  54 |     await expect(btn).toBeVisible({ timeout: 10_000 });
  55 |   });
  56 | 
  57 |   test('related products section is present', async ({ page }) => {
  58 |     const res = await page.request.get('/api/shop/products?page=1');
  59 |     const { products } = await res.json();
  60 | 
  61 |     await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });
  62 |     await page.waitForTimeout(1500);
  63 | 
  64 |     const allLinks = page.locator('a[href^="/sklep/"]');
  65 |     expect(await allLinks.count()).toBeGreaterThanOrEqual(1);
  66 |   });
  67 | 
  68 |   test('direct URL to valid product renders without 404', async ({ page }) => {
  69 |     const res = await page.request.get('/api/shop/products?page=1');
  70 |     const { products } = await res.json();
  71 |     expect(products.length).toBeGreaterThan(0);
  72 | 
  73 |     const response = await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });
  74 |     expect(response?.status()).not.toBe(404);
  75 |     await expect(page.locator('main')).toBeVisible();
  76 |   });
  77 | 
  78 |   test('non-existent product returns 404 page', async ({ page }) => {
  79 |     const response = await page.goto('/sklep/999999999', { waitUntil: 'domcontentloaded' });
  80 |     expect(response?.status()).toBe(404);
  81 |   });
  82 | });
  83 | 
```