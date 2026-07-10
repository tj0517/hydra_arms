# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shop/product-detail.spec.ts >> /sklep/[id] — product detail page >> navigating from listing opens detail page
- Location: tests/shop/product-detail.spec.ts:12:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3001/sklep", waiting until "domcontentloaded"

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
> 13 |     await page.goto('/sklep', { waitUntil: 'domcontentloaded' });
     |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  14 |     await hideBanner(page);
  15 |     await page.waitForSelector('a[href^="/sklep/"]', { timeout: 20_000 });
  16 | 
  17 |     const href = await page.locator('a[href^="/sklep/"]').first().getAttribute('href');
  18 |     expect(href).toBeTruthy();
  19 | 
  20 |     await page.locator(`a[href="${href}"]`).first().click();
  21 |     await expect(page).toHaveURL(href!, { timeout: 10_000 });
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