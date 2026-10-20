/**
 * Cart E2E tests — client-side only (localStorage, no BL/P24).
 */
import { test, expect } from '@playwright/test';
import { dismissCookies, hideBanner } from './fixtures';

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookies(page);
    await page.addInitScript(() => localStorage.removeItem('hydra-cart'));
  });

  test('adding an in-stock product shows feedback on button', async ({ page }) => {
    const res = await page.request.get('/api/shop/products?in_stock=true&page=1');
    const { products } = await res.json();
    if (!products.length) { test.skip(); return; }

    await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });
    await hideBanner(page);
    await page.waitForTimeout(500);

    // "[ DODAJ DO KOSZYKA ]" — enabled when in stock
    const addBtn = page.getByRole('button', { name: /DODAJ DO KOSZYKA/i }).first();
    await expect(addBtn).toBeEnabled({ timeout: 10_000 });
    await addBtn.click();

    // Feedback: "[ DODANO DO KOSZYKA ✓ ]"
    await expect(page.getByText(/DODANO DO KOSZYKA/i).first()).toBeVisible({ timeout: 6_000 });
  });

  test('cart persists after add (localStorage)', async ({ page }) => {
    const res = await page.request.get('/api/shop/products?in_stock=true&page=1');
    const { products } = await res.json();
    if (!products.length) { test.skip(); return; }

    await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });
    await hideBanner(page);
    await page.waitForTimeout(500);

    const addBtn = page.getByRole('button', { name: /DODAJ DO KOSZYKA/i }).first();
    await expect(addBtn).toBeEnabled({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    const cart = await page.evaluate(() => localStorage.getItem('hydra-cart'));
    expect(cart).not.toBeNull();
    const parsed = JSON.parse(cart!);
    const items = Array.isArray(parsed) ? parsed : Object.values(parsed);
    expect(items.length).toBeGreaterThan(0);
  });

  test('out-of-stock product cannot be added', async ({ page }) => {
    const res = await page.request.get('/api/shop/products?page=1');
    const { products } = await res.json();
    // Seed has one sold-out product since HA-2.31 (313002) — no skip escape hatch.
    const outOfStock = products.find((p: { stock: number }) => p.stock === 0);
    expect(outOfStock, 'seed must contain a product with stock = 0').toBeTruthy();

    await page.goto(`/sklep/${outOfStock.id}`, { waitUntil: 'domcontentloaded' });
    await hideBanner(page);

    // Detail page shows "PRODUKT NIEDOSTĘPNY" and renders the CTA disabled as "[ BRAK W MAGAZYNIE ]"
    await expect(page.getByText(/PRODUKT NIEDOSTĘPNY/i)).toBeVisible({ timeout: 10_000 });
    const addBtn = page.getByRole('button', { name: /BRAK W MAGAZYNIE|DODAJ DO KOSZYKA/i });
    await expect(addBtn).toBeDisabled();
    await addBtn.click({ force: true }).catch(() => null);
    // CartProvider may persist an empty cart ("[]") on hydration — the cart must simply hold nothing
    const items = await page.evaluate(() => {
      const raw = localStorage.getItem('hydra-cart');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : Object.values(parsed);
    });
    expect(items).toEqual([]);
  });

  test('adding same product twice increases quantity', async ({ page }) => {
    const res = await page.request.get('/api/shop/products?in_stock=true&page=1');
    const { products } = await res.json();
    if (!products.length) { test.skip(); return; }

    await page.goto(`/sklep/${products[0].id}`, { waitUntil: 'domcontentloaded' });
    await hideBanner(page);

    const addBtn = page.getByRole('button', { name: /DODAJ DO KOSZYKA/i }).first();
    await expect(addBtn).toBeEnabled({ timeout: 10_000 });

    await addBtn.click();
    // openCart() fires at ~900ms (same setTimeout that re-enables button).
    // Wait for button to re-enable (means adding=false and openCart() was called).
    await expect(addBtn).toBeEnabled({ timeout: 5_000 });
    // Drawer is now open. Close it via Escape, then click with force to bypass
    // any lingering interception during the CSS transition.
    await page.evaluate(() =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    );
    await page.waitForTimeout(350); // CSS transition is 300ms
    await addBtn.click({ force: true });

    // Wait for localStorage to reflect qty >= 2 (useEffect is async).
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('hydra-cart');
      if (!raw) return false;
      const arr = JSON.parse(raw);
      const items = Array.isArray(arr) ? arr : Object.values(arr);
      return items.reduce((s: number, i: unknown) => s + (((i as { quantity?: number }).quantity) ?? 1), 0) >= 2;
    }, null, { timeout: 5_000 });

    const totalQty = await page.evaluate(() => {
      const raw = localStorage.getItem('hydra-cart')!;
      const arr = JSON.parse(raw);
      const items = Array.isArray(arr) ? arr : Object.values(arr);
      return items.reduce((s: number, i: unknown) => s + (((i as { quantity?: number }).quantity) ?? 1), 0);
    });
    expect(totalQty).toBeGreaterThanOrEqual(2);
  });

  test('adding from listing card puts item in cart', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await dismissCookies(page);
    await page.goto('/sklep', { waitUntil: 'domcontentloaded' });
    await hideBanner(page);
    await page.getByTestId('product-card').first().waitFor({ timeout: 20_000 });

    // HA-2.31: one "Do koszyka" button per card (visible text, not a title attribute).
    // Click the first enabled one — the seed has in-stock products on page 1.
    const addBtn = page
      .getByTestId('product-area')
      .getByTestId('product-card')
      .getByRole('button', { name: 'Do koszyka' })
      .and(page.locator('button:enabled'))
      .first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    await expect(page.getByRole('button', { name: 'Dodano do koszyka' }).first()).toBeVisible();
    const cart = await page.evaluate(() => localStorage.getItem('hydra-cart'));
    expect(cart).not.toBeNull();
    const parsed = JSON.parse(cart!);
    const items = Array.isArray(parsed) ? parsed : Object.values(parsed);
    expect(items.length).toBe(1);
  });
});
