/**
 * Product detail page (/sklep/[id]) E2E tests
 */
import { test, expect } from '@playwright/test';
import { dismissCookies, hideBanner } from './fixtures';

test.describe('/sklep/[id] — product detail page', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookies(page);
  });

  test('navigating from listing opens detail page', async ({ page }) => {
    await page.goto('/sklep', { waitUntil: 'domcontentloaded' });
    await hideBanner(page);
    await page.waitForSelector('a[href^="/sklep/"]', { timeout: 20_000 });

    const href = await page.locator('a[href^="/sklep/"]').first().getAttribute('href');
    expect(href).toBeTruthy();

    await page.locator(`a[href="${href}"]`).first().click();
    await expect(page).toHaveURL(href!, { timeout: 10_000 });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('detail page shows product name', async ({ page }) => {
    const res = await page.request.get('/api/shop/products?page=1');
    const { products } = await res.json();
    expect(products.length).toBeGreaterThan(0);

    await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    const name = await heading.textContent();
    expect(name?.trim().length).toBeGreaterThan(0);
  });

  test('detail page shows price', async ({ page }) => {
    const res = await page.request.get('/api/shop/products?page=1');
    const { products } = await res.json();

    await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=PLN', { timeout: 10_000 });
    await expect(page.getByText('PLN').first()).toBeVisible();
  });

  test('add-to-cart button is present', async ({ page }) => {
    const res = await page.request.get('/api/shop/products?page=1');
    const { products } = await res.json();

    await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });

    const btn = page.getByText(/DODAJ DO KOSZYKA|BRAK W MAGAZYNIE/i).first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
  });

  test('related products section is present', async ({ page }) => {
    const res = await page.request.get('/api/shop/products?page=1');
    const { products } = await res.json();

    await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const allLinks = page.locator('a[href^="/sklep/"]');
    expect(await allLinks.count()).toBeGreaterThanOrEqual(1);
  });

  test('direct URL to valid product renders without 404', async ({ page }) => {
    const res = await page.request.get('/api/shop/products?page=1');
    const { products } = await res.json();
    expect(products.length).toBeGreaterThan(0);

    const response = await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).not.toBe(404);
    await expect(page.locator('main')).toBeVisible();
  });

  test('non-existent product returns 404 page', async ({ page }) => {
    const response = await page.goto('/sklep/999999999', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
  });
});
