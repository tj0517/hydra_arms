/**
 * Product detail page (/sklep/[id]) E2E tests
 */
import { test, expect, type Page } from '@playwright/test';
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

/**
 * HA-2.32 — breadcrumbs on the PDP. Seed: 312001 sits in 12002 „1.1 Broń Krótka"
 * (parent 12001 „01. BROŃ PALNA"); 312002 sits in 12000 „00. DO PRZYPISANIA",
 * the importer's working bucket that is never shown publicly.
 */
test.describe('/sklep/[id] — breadcrumbs (HA-2.32)', () => {
  const SHOT_DIR = '.playwright-mcp';

  async function openPdp(page: Page, id: number, width: number) {
    await dismissCookies(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/sklep/${id}`, { waitUntil: 'domcontentloaded' });
    await hideBanner(page);
    await page.getByTestId('breadcrumbs').waitFor({ timeout: 20_000 });
  }

  const crumbs = (page: Page) =>
    page.getByTestId('breadcrumbs').locator('li').evaluateAll(els =>
      els.map(li => {
        const a = li.querySelector('a');
        return { label: (li.firstElementChild?.textContent ?? '').trim(), href: a?.getAttribute('href') ?? null };
      }),
    );

  test('product in a category shows Sklep › root › subcategory › name with ?cat= links', async ({ page }) => {
    await openPdp(page, 312001, 1280);
    expect(await crumbs(page)).toEqual([
      { label: 'Sklep', href: '/sklep' },
      { label: 'Broń palna', href: '/sklep?cat=12001' },
      { label: 'Broń krótka', href: '/sklep?cat=12002' },
      { label: 'Produkt testowy sekcji 01 (bez flag)', href: null },
    ]);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.32-pdp-312001-desktop.png` });

    // the category crumb lands on the listing filtered by that category
    await page.getByTestId('breadcrumbs').getByRole('link', { name: 'Broń krótka' }).click();
    await expect(page).toHaveURL(/\/sklep\?cat=12002/, { timeout: 10_000 });
  });

  test('product in the „00." bucket shows only Sklep › name', async ({ page }) => {
    await openPdp(page, 312002, 1280);
    expect(await crumbs(page)).toEqual([
      { label: 'Sklep', href: '/sklep' },
      { label: 'Produkt testowy do przypisania', href: null },
    ]);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.32-pdp-312002-desktop.png` });
  });

  test('breadcrumb JSON-LD is a BreadcrumbList that mirrors the trail', async ({ page }) => {
    await openPdp(page, 312001, 1280);
    const raw = await page.getByTestId('breadcrumbs').locator('script[type="application/ld+json"]').textContent();
    const ld = JSON.parse(raw ?? '{}');
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement.map((i: { name: string; item: string; position: number }) => [i.position, i.name, i.item])).toEqual([
      [1, 'Sklep', 'https://hydraarms.pl/sklep'],
      [2, 'Broń palna', 'https://hydraarms.pl/sklep?cat=12001'],
      [3, 'Broń krótka', 'https://hydraarms.pl/sklep?cat=12002'],
      [4, 'Produkt testowy sekcji 01 (bez flag)', 'https://hydraarms.pl/sklep/312001'],
    ]);
  });

  test('breadcrumbs render on mobile', async ({ page }) => {
    await openPdp(page, 312001, 390);
    await expect(page.getByTestId('breadcrumbs').getByRole('link', { name: 'Broń krótka' })).toBeVisible();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.32-pdp-312001-mobile.png` });
  });
});

/** HA-2.32 — shop header on the PDP: permanent „Sklep" link and the header search. */
test.describe('/sklep/[id] — shop header (HA-2.32)', () => {
  const SHOT_DIR = '.playwright-mcp';
  const mobileMenu = (page: Page) => page.locator('div.fixed.inset-0.lg\\:hidden');

  async function openPdp(page: Page, width: number, url = '/sklep/312001') {
    await dismissCookies(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await hideBanner(page);
    await page.locator('nav').first().waitFor({ timeout: 20_000 });
    await page.mouse.move(0, 0);
  }

  test('nav has a Sklep link on desktop', async ({ page }) => {
    await openPdp(page, 1280);
    const sklep = page.locator('nav ul').getByRole('link', { name: 'Sklep' });
    await expect(sklep).toBeVisible();
    await expect(sklep).toHaveAttribute('href', '/sklep');
    // Zaloguj / Zarejestruj stay next to it
    await expect(page.locator('nav ul').getByRole('link', { name: 'Zaloguj' })).toBeVisible();
    await expect(page.locator('nav ul').getByRole('link', { name: 'Zarejestruj' })).toBeVisible();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.32-nav-pdp-desktop.png` });
  });

  test('mobile menu has a Sklep link', async ({ page }) => {
    await openPdp(page, 390);
    await page.getByRole('button', { name: 'Menu' }).click();
    const sklep = mobileMenu(page).getByRole('link', { name: 'Sklep' });
    await expect(sklep).toBeVisible();
    await expect(sklep).toHaveAttribute('href', '/sklep');
    await expect(mobileMenu(page).getByRole('link', { name: 'Zaloguj' })).toBeVisible();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.32-nav-pdp-mobile-menu.png` });
  });

  test('header search on desktop lands on /sklep?q= with the search chip', async ({ page }) => {
    await openPdp(page, 1280);
    const field = page.getByTestId('header-search').getByRole('searchbox');
    await field.fill('test');
    await field.press('Enter');
    await expect(page).toHaveURL(/\/sklep\?q=test$/, { timeout: 10_000 });
    await expect(page.getByTestId('active-filters').locator('[data-chip="q"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('active-filters').locator('[data-chip="q"]')).toContainText('test');
    await page.locator('#catalog').evaluate(el => el.scrollIntoView());
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.32-listing-after-header-search.png` });
  });

  test('header search encodes the phrase into the URL only', async ({ page }) => {
    await openPdp(page, 1280);
    const field = page.getByTestId('header-search').getByRole('searchbox');
    await field.fill('broń <b>&x</b>');
    await field.press('Enter');
    await expect(page).toHaveURL(/\/sklep\?q=bro%C5%84\+%3Cb%3E%26x%3C%2Fb%3E$/, { timeout: 10_000 });
    const chip = page.getByTestId('active-filters').locator('[data-chip="q"]');
    await expect(chip).toContainText('broń <b>&x</b>', { timeout: 20_000 });
    expect(await chip.locator('b').count()).toBe(0);
  });

  // On /sklep itself the header form submits as a full page load (decision tj 2026-10-20, A2):
  // the listing reads ?q= only when it mounts, and keying it by q remounted the grid on every
  // toolbar keystroke. Elsewhere it stays an in-app navigation (tests above).
  test('header search from the listing itself reloads /sklep?q= and shows the chip', async ({ page }) => {
    await openPdp(page, 1280, '/sklep?q=pierwsza');
    await expect(page.getByTestId('active-filters').locator('[data-chip="q"]')).toContainText('pierwsza', { timeout: 20_000 });
    const field = page.getByTestId('header-search').getByRole('searchbox');
    await field.fill('druga');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', url: /\/sklep\?q=druga$/, timeout: 10_000 }),
      field.press('Enter'),
    ]);
    await hideBanner(page);
    await expect(page).toHaveURL(/\/sklep\?q=druga$/);
    await expect(page.getByTestId('active-filters').locator('[data-chip="q"]')).toContainText('druga', { timeout: 20_000 });
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/sklep\?q=druga$/);
  });

  test('mobile magnifier expands the search field and navigates', async ({ page }) => {
    await openPdp(page, 390);
    const mobileForm = page.getByTestId('header-search-mobile');
    await expect(mobileForm).toHaveCSS('opacity', '0');
    await page.getByRole('button', { name: 'Szukaj', exact: true }).click();
    await expect(mobileForm).toHaveCSS('opacity', '1');
    const field = mobileForm.getByRole('searchbox');
    await expect(field).toBeFocused();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.32-header-search-mobile-open.png` });
    await field.fill('test');
    await field.press('Enter');
    await expect(page).toHaveURL(/\/sklep\?q=test$/, { timeout: 10_000 });
    await expect(page.getByTestId('active-filters').locator('[data-chip="q"]')).toBeVisible({ timeout: 20_000 });
  });

  test('header search is not mounted outside /sklep', async ({ page }) => {
    await openPdp(page, 1280, '/uslugi');
    await expect(page.getByTestId('header-search')).toHaveCount(0);
    await expect(page.getByTestId('header-search-mobile')).toHaveCount(0);
  });
});
