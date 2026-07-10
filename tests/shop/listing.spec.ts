/**
 * Shop listing page (/sklep) E2E tests
 */
import { test, expect } from '@playwright/test';
import { dismissCookies, hideBanner } from './fixtures';

async function goToShop(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await dismissCookies(page);
  await page.goto('/sklep', { waitUntil: 'domcontentloaded' });
  await hideBanner(page);
  await page.waitForSelector('a[href^="/sklep/"]', { timeout: 20_000 });
}

test.describe('/sklep — listing page', () => {
  test('page loads and shows products', async ({ page }) => {
    await goToShop(page);

    const productLinks = page.locator('a[href^="/sklep/"]');
    await expect(productLinks.first()).toBeVisible();
    expect(await productLinks.count()).toBeGreaterThan(0);
  });

  test('shows product name and price on cards', async ({ page }) => {
    await goToShop(page);

    const firstCard = page.locator('a[href^="/sklep/"]').first();
    await expect(firstCard.locator('h3')).toBeVisible();
    await expect(firstCard.getByText('PLN')).toBeVisible();
  });

  test('category sidebar is visible on desktop', async ({ page }) => {
    await goToShop(page);

    // The aside is visible at 1280px (hidden md:block)
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
    await expect(page.getByText('WSZYSTKIE PRODUKTY').first()).toBeVisible();
  });

  test('product count label is shown', async ({ page }) => {
    await goToShop(page);

    // "200 PRODUKTÓW" in the toolbar — hidden md:inline means visible at 1280px
    const label = page.locator('span').filter({ hasText: /\d+ PRODUKTÓW/ }).first();
    await expect(label).toBeVisible({ timeout: 5_000 });
  });

  test('search filters products by name', async ({ page }) => {
    await goToShop(page);

    const firstName = await page.locator('a[href^="/sklep/"] h3').first().textContent();
    const searchTerm = firstName?.split(' ')[0] ?? 'nóż';

    await page.getByPlaceholder('SZUKAJ...').fill(searchTerm);
    await page.waitForTimeout(400);

    const cards = page.locator('a[href^="/sklep/"]');
    const count = await cards.count();
    if (count > 0) {
      const firstVisible = await cards.first().locator('h3').textContent();
      expect(firstVisible?.toLowerCase()).toContain(searchTerm.toLowerCase().slice(0, 3));
    } else {
      await expect(page.getByText('BRAK WYNIKÓW')).toBeVisible();
    }
  });

  test('in-stock filter hides out-of-stock products', async ({ page }) => {
    await goToShop(page);

    await page.getByText('Tylko dostępne').click();

    // Wait for React to re-render (NIEDOSTĘPNY overlays should disappear)
    await page.waitForFunction(() => {
      const overlays = Array.from(document.querySelectorAll('.absolute'))
        .filter(el => el.textContent?.trim() === 'NIEDOSTĘPNY');
      return overlays.every(el => {
        const style = window.getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      });
    }, null, { timeout: 5_000 }).catch(() => null); // soft-fail if products are all in-stock already

    // Count NIEDOSTĘPNY text nodes that are within the SklepClient grid only
    const grid = page.locator('#catalog div.flex-1');
    const niedostepny = grid.getByText('NIEDOSTĘPNY', { exact: true });
    expect(await niedostepny.count()).toBe(0);
  });

  test('clearing filters restores all products', async ({ page }) => {
    await goToShop(page);

    const initialCount = await page.locator('a[href^="/sklep/"]').count();

    await page.getByText('Tylko dostępne').click();
    await page.waitForTimeout(300);

    const clearBtn = page.getByText('WYCZYŚĆ FILTRY');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    } else {
      await page.getByText('Tylko dostępne').click();
    }
    await page.waitForTimeout(300);

    const restoredCount = await page.locator('a[href^="/sklep/"]').count();
    expect(restoredCount).toBe(initialCount);
  });

  test('pagination shows different products on page 2', async ({ page }) => {
    await goToShop(page);

    const nextBtn = page.getByText('NASTĘPNA →');
    if (!(await nextBtn.isVisible())) {
      test.skip();
      return;
    }

    // Scope to the product grid only (inside SklepClient's flex container)
    // The grid is the last main section — scoped by the aside+grid wrapper
    const grid = page.locator('div.flex-1.min-w-0');

    const ids1 = await grid.locator('a[href^="/sklep/"]').evaluateAll(
      (els) => els.map((el) => (el as HTMLAnchorElement).pathname)
    );

    await nextBtn.click();
    await page.waitForTimeout(500);

    const ids2 = await grid.locator('a[href^="/sklep/"]').evaluateAll(
      (els) => els.map((el) => (el as HTMLAnchorElement).pathname)
    );

    const set1 = new Set(ids1);
    const overlap = ids2.filter((id) => set1.has(id));
    expect(overlap.length).toBe(0);
  });

  test('category click filters products', async ({ page }) => {
    await goToShop(page);

    const allCount = await page.locator('a[href^="/sklep/"]').count();

    // Find first non-"WSZYSTKIE" category button inside the sidebar
    const sidebar = page.locator('aside').first();
    const catBtns = sidebar.locator('button');
    const count = await catBtns.count();

    let clicked = false;
    for (let i = 0; i < count; i++) {
      const btn = catBtns.nth(i);
      const txt = await btn.textContent();
      if (txt && !txt.includes('WSZYSTKIE') && !txt.includes('+') && !txt.includes('−')) {
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) { test.skip(); return; }
    await page.waitForTimeout(300);

    const filteredCount = await page.locator('a[href^="/sklep/"]').count();
    expect(filteredCount).toBeLessThanOrEqual(allCount);
  });
});
