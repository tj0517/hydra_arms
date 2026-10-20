/**
 * Product card (HA-2.31) — listing grid, PDP "related", shop sections.
 *
 * One stretched link per card (image + name + price + availability line) and one
 * sibling "Do koszyka" button; nothing interactive is nested. Availability line and
 * tags derive from stock + mustPickup(); the card never shows the unit count.
 */
import { test, expect, type Page } from '@playwright/test';
import { dismissCookies, hideBanner } from './fixtures';

const SHOT_DIR = '.playwright-mcp';

const PICKUP_ONLY = 302001;  // seed: Crye Precision JPC — product_type pickup_only, no licence, no age
const ADULT = 306001;        // seed: Gerber knife — age_restricted, age_min 18
const LICENCE = 307001;      // seed: Blackhawk holster — requires_license TRUE (category 7005)
const CLEAN = 301001;        // seed: 5.11 trousers — standard, shippable

// Throw-away row for the out-of-stock card (no seed product has stock = 0)
const T_OUT_OF_STOCK = 399201;
const T_NAME = 'HA-2.31 test — brak na stanie';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const serviceHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function rest(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = init;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...rest,
    headers: { ...serviceHeaders, ...(rest.headers as Record<string, string> | undefined) },
    body: json === undefined ? rest.body : JSON.stringify(json),
  });
}

test.beforeAll(async () => {
  await rest(`shop_products?id=eq.${T_OUT_OF_STOCK}`, { method: 'DELETE' });
  const res = await rest('shop_products', {
    method: 'POST',
    json: [{
      id: T_OUT_OF_STOCK, inventory_id: 35743, sku: 'HA231-OOS', ean: '5909990000231', name: T_NAME,
      price: 199, tax_rate: 23, stock: 0, weight: 0.1, category_id: 1002, product_type: 'standard',
      is_active: true, source_warehouse: 'own', age_min: 0, requires_license: false, delivery_allowed: true,
      brand: 'Test',
    }],
  });
  expect(res.status).toBe(201);
});

test.afterAll(async () => {
  await rest(`shop_products?id=eq.${T_OUT_OF_STOCK}`, { method: 'DELETE' });
});

async function hideDevOverlay(page: Page) {
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' }).catch(() => null);
}

async function goToShop(page: Page, url = '/sklep', viewport = { width: 1280, height: 1100 }) {
  await page.setViewportSize(viewport);
  await dismissCookies(page);
  await page.addInitScript(() => localStorage.removeItem('hydra-cart'));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await hideBanner(page);
  await hideDevOverlay(page);
  await page.getByTestId('product-area').waitFor({ timeout: 20_000 });
  await page.getByTestId('product-card').first().waitFor({ timeout: 20_000 });
}

/** Scroll the catalogue into view and let the scroll-triggered animations settle. */
async function settleCatalog(page: Page) {
  await page.locator('#catalog').evaluate(el => el.scrollIntoView());
  await page.waitForTimeout(2000);
}

const cards = (page: Page) => page.getByTestId('product-area').getByTestId('product-card');
const cardById = (page: Page, id: number) =>
  page.getByTestId('product-card').filter({ has: page.locator(`a[href="/sklep/${id}"]`) }).first();

async function searchFor(page: Page, term: string) {
  await page.getByPlaceholder('Szukaj produktu…').fill(term);
  await page.waitForTimeout(600);
}

test.describe('product card — screenshots (STOP 1 evidence)', () => {
  test('desktop grid with at least 6 cards', async ({ page }) => {
    await goToShop(page);
    await settleCatalog(page);
    expect(await cards(page).count()).toBeGreaterThanOrEqual(6);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.31-grid-desktop.png` });
  });

  test('mobile grid', async ({ page }) => {
    await goToShop(page, '/sklep', { width: 375, height: 812 });
    await settleCatalog(page);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.31-grid-mobile.png` });
  });

  test('single cards: pickup-only, 18+, licence, out of stock, clean', async ({ page }) => {
    await goToShop(page);
    await settleCatalog(page);
    const shots: [string, number | null, string][] = [
      ['Kamizelka taktyczna JPC', PICKUP_ONLY, 'pickup'],
      ['Nóż taktyczny Gerber', ADULT, '18plus'],
      ['Kaburka udowa', LICENCE, 'license'],
      [T_NAME, T_OUT_OF_STOCK, 'out-of-stock'],
      ['Spodnie taktyczne Ripstop', CLEAN, 'clean'],
    ];
    for (const [term, id, name] of shots) {
      await searchFor(page, term);
      const card = cardById(page, id!);
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await card.screenshot({ path: `${SHOT_DIR}/ha-2.31-card-${name}.png` });
    }
  });

  test('PDP related grid', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await dismissCookies(page);
    await page.goto(`/sklep/${CLEAN}`, { waitUntil: 'domcontentloaded' });
    await hideBanner(page);
    await hideDevOverlay(page);
    const related = page.getByTestId('product-card').first();
    await related.waitFor({ timeout: 20_000 });
    await related.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.31-pdp-related.png` });
  });

  test('shop sections above the catalogue (Sanity product picker)', async ({ page }) => {
    await goToShop(page);
    const total = await page.getByTestId('product-card').count();
    const inArea = await cards(page).count();
    test.info().annotations.push({ type: 'sections-cards', description: String(total - inArea) });
    if (total - inArea === 0) { test.skip(true, 'no product-picker section in local Sanity content'); return; }
    const first = page.getByTestId('product-card').first();
    await first.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.31-shop-sections.png` });
  });
});
