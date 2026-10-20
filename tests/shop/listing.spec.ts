/**
 * Shop listing page (/sklep) E2E tests
 *
 * HA-2.30 UI: category tree + accordion filters in <aside> (desktop ≥ 1024 px),
 * active-filter chips above the grid, toolbar with "N produktów" / search / sort,
 * sticky bottom bar + bottom sheet below 1024 px. URL contract unchanged:
 * cat, q, stock, min, max, sort, marka, dostawa.
 */
import { test, expect, type Page } from '@playwright/test';
import { dismissCookies, hideBanner } from './fixtures';

const SHOT_DIR = '.playwright-mcp';

async function goToShop(page: Page, url = '/sklep') {
  await page.setViewportSize({ width: 1280, height: 900 });
  await dismissCookies(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await hideBanner(page);
  await hideDevOverlay(page);
  await page.getByTestId('product-area').waitFor({ timeout: 20_000 });
  // products, or the empty state when the URL filters everything out
  await page.locator('a[href^="/sklep/"]').or(page.getByText('Brak wyników')).first().waitFor({ timeout: 20_000 });
}

/** The Next.js dev-overlay bubble sits bottom-left, over the mobile bottom bar — not present in production. */
async function hideDevOverlay(page: Page) {
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' }).catch(() => null);
}

/** Scroll the catalogue into view and let the scroll-triggered animations settle. */
async function settleCatalog(page: Page) {
  await page.locator('#catalog').evaluate(el => el.scrollIntoView());
  await page.waitForTimeout(2000);
}

const productLinks = (page: Page) => page.getByTestId('product-area').locator('a[href^="/sklep/"]');
const productNames = (page: Page) => page.getByTestId('product-area').locator('a[href^="/sklep/"] h3');
const sidebar = (page: Page) => page.locator('aside').first();
const chips = (page: Page) => page.getByTestId('active-filters').locator('button[data-chip]');

test.describe('/sklep — listing page', () => {
  test('page loads and shows products', async ({ page }) => {
    await goToShop(page);

    await expect(productLinks(page).first()).toBeVisible();
    expect(await productLinks(page).count()).toBeGreaterThan(0);
  });

  test('shows product name and price on cards', async ({ page }) => {
    await goToShop(page);

    // Scope both assertions to the first card container so PLN cannot match
    // anything in the filters aside or any other page element.
    const firstCard = page.getByTestId('product-area').locator('.bg-bg-card').first();
    await expect(firstCard.locator('a[href^="/sklep/"] h3')).toBeVisible();
    await expect(firstCard.getByText('PLN', { exact: true })).toBeVisible();
  });

  // HA-2.30 acceptance 1: sidebar with the category tree, "00." root hidden, its
  // product listed under "Wszystkie", category click sets ?cat= as before.
  test('desktop sidebar: category tree without the "00." root, its product visible, click sets ?cat=', async ({ page }) => {
    await goToShop(page);
    const aside = sidebar(page);
    await expect(aside).toBeVisible();

    const tree = aside.getByTestId('category-tree');
    await expect(tree).toBeVisible();
    await expect(tree.getByRole('button', { name: /^Wszystkie/ })).toBeVisible();

    // The working root "00. DO PRZYPISANIA" (seed 12000) is not in the tree …
    const asideText = (await aside.innerText()).toLowerCase();
    expect(asideText).not.toContain('do przypisania');
    expect(asideText).not.toMatch(/\b00\./);
    // … and no public label carries a numeric prefix
    const labels = await tree.locator('button span:first-child').allInnerTexts();
    for (const label of labels) expect(label).not.toMatch(/^\d/);

    // … but its product (seed 312002) is listed with no filter active
    await expect(productNames(page).filter({ hasText: 'Produkt testowy do przypisania' })).toHaveCount(1);

    // Deep-link-free start: expand "Broń palna" to show the subcategory, then screenshot
    await aside.getByRole('button', { name: /Rozwiń: Broń palna/ }).click();
    await expect(tree.getByRole('button', { name: /^Broń krótka/ })).toBeVisible();

    // Two filters active + chips visible for the screenshot
    await aside.getByText('Tylko dostępne', { exact: true }).click();
    await aside.getByText('Tylko odbiór osobisty', { exact: true }).click();
    await expect(chips(page)).toHaveCount(2);
    await settleCatalog(page);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.30-desktop-sidebar.png` });

    // Clicking a category sets ?cat=<id>
    await tree.getByRole('button', { name: /^Broń krótka/ }).click();
    await expect(page).toHaveURL(/[?&]cat=12002(&|$)/);
    await expect(tree.getByRole('button', { name: /^Broń krótka/ })).toHaveAttribute('aria-current', 'page');
  });

  test('product count label is shown', async ({ page }) => {
    await goToShop(page);

    // "22 produktów" in the toolbar
    await expect(page.getByTestId('product-count')).toHaveText(/^\d+ produkt(y|ów)?$/, { timeout: 5_000 });
  });

  test('search filters products by name', async ({ page }) => {
    await goToShop(page);

    const firstName = await productNames(page).first().textContent();
    const searchTerm = firstName?.split(' ')[0] ?? 'nóż';

    await page.getByPlaceholder('Szukaj produktu…').fill(searchTerm);
    await page.waitForTimeout(400);

    const count = await productLinks(page).count();
    if (count > 0) {
      const firstVisible = await productNames(page).first().textContent();
      expect(firstVisible?.toLowerCase()).toContain(searchTerm.toLowerCase().slice(0, 3));
    } else {
      await expect(page.getByText('Brak wyników')).toBeVisible();
    }
    // the query gets its own chip
    await expect(chips(page).filter({ hasText: `Szukaj: „${searchTerm}”` })).toHaveCount(1);
  });

  test('in-stock filter hides out-of-stock products', async ({ page }) => {
    await goToShop(page);

    await sidebar(page).getByText('Tylko dostępne', { exact: true }).click();
    await expect(page).toHaveURL(/stock=1/);

    // Wait for React to re-render (NIEDOSTĘPNY overlays should disappear)
    await page.waitForFunction(() => {
      const overlays = Array.from(document.querySelectorAll('.absolute'))
        .filter(el => el.textContent?.trim() === 'NIEDOSTĘPNY');
      return overlays.every(el => {
        const style = window.getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      });
    }, null, { timeout: 5_000 }).catch(() => null); // soft-fail if products are all in-stock already

    // Count NIEDOSTĘPNY text nodes within the product grid only
    const niedostepny = page.getByTestId('product-area').getByText('NIEDOSTĘPNY', { exact: true });
    expect(await niedostepny.count()).toBe(0);
  });

  test('clearing filters restores all products', async ({ page }) => {
    await goToShop(page);

    const initialCount = await productLinks(page).count();

    await sidebar(page).getByText('Tylko dostępne', { exact: true }).click();
    await expect(page).toHaveURL(/stock=1/);

    await sidebar(page).getByRole('button', { name: 'Wyczyść filtry' }).click();
    await expect(page).not.toHaveURL(/stock=1/);

    const restoredCount = await productLinks(page).count();
    expect(restoredCount).toBe(initialCount);
  });

  test('pagination shows different products on page 2', async ({ page }) => {
    await goToShop(page);

    const nextBtn = page.getByRole('button', { name: 'Następna →' });
    if (!(await nextBtn.isVisible())) {
      test.skip();
      return;
    }

    const ids1 = await productLinks(page).evaluateAll(
      (els) => els.map((el) => (el as HTMLAnchorElement).pathname)
    );

    await nextBtn.click();
    await page.waitForTimeout(500);

    const ids2 = await productLinks(page).evaluateAll(
      (els) => els.map((el) => (el as HTMLAnchorElement).pathname)
    );

    const set1 = new Set(ids1);
    const overlap = ids2.filter((id) => set1.has(id));
    expect(overlap.length).toBe(0);
  });

  test('brand filter narrows products and syncs to the URL', async ({ page }) => {
    await goToShop(page);

    const initialCount = await productLinks(page).count();

    // "Marka" accordion header (button) → its section div → first checkbox row
    const brandSection = sidebar(page).getByRole('button', { name: /^Marka/ }).locator('xpath=..');
    const firstBrandRow = brandSection.locator('label').first();
    const brandName = (await firstBrandRow.locator('span span').first().textContent())?.trim();
    expect(brandName).toBeTruthy();

    await firstBrandRow.click();
    await page.waitForTimeout(300);

    const expectedParam = new URLSearchParams({ marka: brandName! }).toString();
    await expect(page).toHaveURL(new RegExp(expectedParam.replace(/[.+]/g, '\\$&')));

    const filteredCount = await productLinks(page).count();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('delivery mode filter separates shippable from pickup-only products', async ({ page }) => {
    await goToShop(page);

    const initialCount = await productLinks(page).count();
    const aside = sidebar(page);

    await aside.getByText('Tylko odbiór osobisty', { exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/dostawa=odbior/);
    const pickupCount = await productLinks(page).count();
    expect(pickupCount).toBeGreaterThan(0);
    expect(pickupCount).toBeLessThan(initialCount);

    await aside.getByText('Wysyłka kurierem', { exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/dostawa=wysylka/);
    const shippableCount = await productLinks(page).count();
    expect(shippableCount).toBeGreaterThan(0);
    expect(shippableCount + pickupCount).toBe(initialCount);
  });

  // Red proof: a pickup-only product (delivery_allowed=FALSE in seed.sql) must
  // never appear when "Wysyłka kurierem" is active, only under "Tylko odbiór osobisty".
  test('pickup-only product never appears under the shippable filter', async ({ page }) => {
    await goToShop(page);
    const aside = sidebar(page);

    await page.getByPlaceholder('Szukaj produktu…').fill('Kamizelka taktyczna JPC');
    await page.waitForTimeout(400);
    await expect(productNames(page).first()).toContainText('Kamizelka');

    await aside.getByText('Wysyłka kurierem', { exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Brak wyników')).toBeVisible();

    await aside.getByText('Wysyłka kurierem', { exact: true }).click(); // deselect
    await aside.getByText('Tylko odbiór osobisty', { exact: true }).click();
    await page.waitForTimeout(300);
    await expect(productNames(page).first()).toContainText('Kamizelka');
  });

  // Red proof: unknown ?marka=/?dostawa= values are validated against the known
  // set (brands actually present, and the fixed wysylka/odbior pair) and ignored,
  // not applied as a filter and not string-built into a query.
  test('invalid marka and dostawa URL values are ignored', async ({ page }) => {
    await goToShop(page);
    const baselineCount = await productLinks(page).count();

    await goToShop(page, '/sklep?marka=NieistniejacaMarkaXYZ&dostawa=foo');

    const count = await productLinks(page).count();
    expect(count).toBe(baselineCount);
    await expect(chips(page)).toHaveCount(0);
  });

  test('category click filters products', async ({ page }) => {
    await goToShop(page);

    const allCount = await productLinks(page).count();

    // First root category in the tree (not "Wszystkie", not an expand chevron)
    const tree = sidebar(page).getByTestId('category-tree');
    const firstRoot = tree.locator('li > div > button:not([aria-label])').first();
    const label = (await firstRoot.innerText()).trim();
    expect(label).not.toMatch(/^Wszystkie/);

    await firstRoot.click();
    await expect(page).toHaveURL(/[?&]cat=\d+/);

    const filteredCount = await productLinks(page).count();
    expect(filteredCount).toBeLessThanOrEqual(allCount);
    await expect(firstRoot).toHaveAttribute('aria-current', 'page');
  });

  // ── HA-2.30 ─────────────────────────────────────────────────────────────

  // Acceptance 3: a chip removes exactly its filter and updates the URL;
  // "Wyczyść wszystko" clears every param.
  test('active-filter chip removes its filter and updates the URL; "Wyczyść wszystko" clears all', async ({ page }) => {
    await goToShop(page);
    const aside = sidebar(page);

    await aside.getByText('Tylko dostępne', { exact: true }).click();
    await aside.getByText('Tylko odbiór osobisty', { exact: true }).click();
    await expect(page).toHaveURL(/stock=1/);
    await expect(page).toHaveURL(/dostawa=odbior/);
    await expect(chips(page)).toHaveCount(2);
    await expect(chips(page).filter({ hasText: 'Tylko dostępne' })).toHaveCount(1);
    await expect(chips(page).filter({ hasText: 'Tylko odbiór osobisty' })).toHaveCount(1);

    // × on the stock chip → stock= gone, dostawa= stays, one chip left
    await page.getByRole('button', { name: 'Usuń filtr: Tylko dostępne' }).click();
    await expect(page).not.toHaveURL(/stock=1/);
    await expect(page).toHaveURL(/dostawa=odbior/);
    await expect(chips(page)).toHaveCount(1);
    await expect(aside.getByRole('checkbox', { name: 'Tylko dostępne' })).not.toBeChecked();
    await expect(aside.getByRole('checkbox', { name: 'Tylko odbiór osobisty' })).toBeChecked();

    // "Wyczyść wszystko" → no params at all
    await page.getByRole('button', { name: 'Wyczyść wszystko' }).click();
    await expect(page).toHaveURL(/\/sklep\??$/);
    await expect(page.getByTestId('active-filters')).toHaveCount(0);
  });

  // Acceptance 6: a deep link restores the sidebar (active path, expanded
  // subcategory, checked brand) and the chips.
  test('deep link ?cat=<id>&marka=<x> restores the sidebar and the chips', async ({ page }) => {
    await goToShop(page, '/sklep?cat=12001&marka=Test');
    const aside = sidebar(page);
    const tree = aside.getByTestId('category-tree');

    await expect(tree.getByRole('button', { name: /^Broń palna/ })).toHaveAttribute('aria-current', 'page');
    await expect(tree.getByRole('button', { name: /^Broń krótka/ })).toBeVisible(); // auto-expanded active path
    await expect(aside.getByRole('checkbox', { name: /^Test \(\d+\)$/ })).toBeChecked();

    await expect(chips(page)).toHaveCount(2);
    await expect(chips(page).filter({ hasText: 'Broń palna' })).toHaveCount(1);
    await expect(chips(page).filter({ hasText: 'Marka: Test' })).toHaveCount(1);

    // the URL keeps the same keys and values
    await expect(page).toHaveURL(/cat=12001/);
    await expect(page).toHaveURL(/marka=Test/);
    await expect(productNames(page)).toHaveCount(1);
    await expect(productNames(page).first()).toContainText('Produkt testowy sekcji 01');
  });

  // Empty state keeps the chips so the shopper sees what to remove.
  test('empty state shows chips and a single clear CTA', async ({ page }) => {
    await goToShop(page, '/sklep?q=xyzniema&marka=Gerber');
    await expect(page.getByText('Brak wyników')).toBeVisible();
    await expect(chips(page)).toHaveCount(2);
    await settleCatalog(page);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.30-desktop-empty.png` });
    await page.getByTestId('product-area').getByRole('button', { name: 'Wyczyść filtry' }).click();
    await expect(page).toHaveURL(/\/sklep\??$/);
    await expect(productLinks(page).first()).toBeVisible();
  });

  // Acceptance 4: mobile 375 px — sticky bottom bar, bottom sheet with tree and
  // filters, "Pokaż N produktów" closes the sheet and the filters stay applied.
  test('mobile 375 px: bottom bar opens the sheet, counts products and applies a filter', async ({ page }) => {
    await dismissCookies(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/sklep', { waitUntil: 'domcontentloaded' });
    await hideBanner(page);
    await hideDevOverlay(page);
    await page.waitForSelector('a[href^="/sklep/"]', { timeout: 20_000 });

    // desktop sidebar hidden, sticky bar visible
    await expect(sidebar(page)).toBeHidden();
    const bar = page.getByTestId('mobile-filter-bar');
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('button', { name: /^Filtry/ })).toBeVisible();
    await expect(bar.getByRole('button', { name: /^Sortuj/ })).toBeVisible();
    await settleCatalog(page);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.30-mobile-bar.png` });

    const allCount = await productNames(page).count();

    await bar.getByRole('button', { name: /^Filtry/ }).click();
    const sheet = page.getByTestId('mobile-filter-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId('category-tree')).toBeVisible();
    await expect(sheet.getByRole('button', { name: new RegExp(`^Pokaż ${allCount} produkt`) })).toBeVisible();

    // apply a filter inside the sheet → the count button and the URL follow
    await sheet.getByText('Tylko odbiór osobisty', { exact: true }).click();
    await expect(page).toHaveURL(/dostawa=odbior/);
    const showBtn = sheet.getByRole('button', { name: /^Pokaż \d+ produkt/ });
    const shown = Number((await showBtn.innerText()).match(/\d+/)?.[0]);
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(allCount);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.30-mobile-sheet.png` });

    await showBtn.click();
    await expect(sheet).toBeHidden();
    expect(await productNames(page).count()).toBe(shown);
    await expect(bar.getByRole('button', { name: /^Filtry/ })).toContainText('(1)');
    await expect(chips(page).filter({ hasText: 'Tylko odbiór osobisty' })).toHaveCount(1);
  });
});
