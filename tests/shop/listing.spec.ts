/**
 * Shop listing page (/sklep) E2E tests
 *
 * HA-2.30 UI: category tree + accordion filters in <aside> (desktop ≥ 1024 px),
 * active-filter chips above the grid, toolbar with "N produktów" / search / sort,
 * sticky bottom bar + bottom sheet below 1024 px. URL contract unchanged:
 * cat, q, stock, min, max, sort, marka, dostawa; HA-2.35 adds page and spec.
 *
 * HA-2.35: the listing is computed on the server (shop_listing/shop_tree) — every
 * filter change is a router.push to a new URL and the grid shows one page of 24.
 * A filter change is done once the URL changed (the URL commits with the new data).
 * The seed carries 1 100 "seed-bulk" products (category 13000, names "Żżż …" sort
 * last) so the total is > 1 000.
 */
import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
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
/** Total matching products from the toolbar ("25 produktów") — the grid itself shows at most one page (24). */
const totalCount = async (page: Page) => Number((await page.getByTestId('product-count').innerText()).match(/\d+/)?.[0]);
const sidebar = (page: Page) => page.locator('aside').first();
const chips = (page: Page) => page.getByTestId('active-filters').locator('button[data-chip]');
/** The sidebar "Kategorie" section starts collapsed — open it before using the tree. */
async function openCategories(page: Page) {
  await sidebar(page).getByRole('button', { name: /^Kategorie/ }).click();
}

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
    await expect(tree).toBeHidden(); // collapsed by default
    await openCategories(page);
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
    await expect(page).toHaveURL(/[?&]q=/); // HA-2.35: server round trip done

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
    await expect(page).toHaveURL(/[?&]page=2(&|$)/); // HA-2.35: page 2 is a URL

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

    // HA-2.31: the seed has 25 products, one more than a page — compare against the toolbar total
    const initialCount = await totalCount(page);
    const aside = sidebar(page);

    // HA-2.35: toolbar totals, not the grid — shippable is > 24 with the bulk seed
    await aside.getByText('Tylko odbiór osobisty', { exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/dostawa=odbior/);
    const pickupCount = await totalCount(page);
    expect(pickupCount).toBeGreaterThan(0);
    expect(pickupCount).toBeLessThan(initialCount);

    await aside.getByText('Wysyłka kurierem', { exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/dostawa=wysylka/);
    const shippableCount = await totalCount(page);
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
    await openCategories(page);
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

    // collapsed header still names the active category
    await expect(aside.getByRole('button', { name: /^Kategorie/ })).toContainText('Broń palna');
    await openCategories(page);
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

    const allCount = await totalCount(page); // toolbar total, not the paginated grid (HA-2.31: 25 products)

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

  // ── HA-2.35 — listing computed on the server, URL as the only state ─────

  const BULK_CAT = 13000;
  const OPTICS = 4003;

  async function activeInSeed(): Promise<number> {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { count, error } = await sb.from('shop_products').select('id', { count: 'exact', head: true }).eq('is_active', true);
    expect(error).toBeNull();
    return count ?? 0;
  }

  const pageNumber = (page: Page) =>
    page.getByRole('navigation', { name: 'Paginacja' }).locator('button[aria-current="page"]');

  test('bulk seed: toolbar total = active products in the seed, 24 per page, the last page holds the rest', async ({ page }) => {
    const active = await activeInSeed();
    console.log('[bulk] active products in seed =', active);
    expect(active).toBeGreaterThan(1000);

    await goToShop(page);
    expect(await totalCount(page)).toBe(active);
    await expect(productLinks(page)).toHaveCount(24);

    const lastPage = Math.ceil(active / 24);
    const expectedLast = active % 24 || 24;
    await goToShop(page, `/sklep?page=${lastPage}`);
    await expect(pageNumber(page)).toHaveText(String(lastPage));
    await expect(productLinks(page)).toHaveCount(expectedLast);
    // the bulk names sort last, so the last page under name_asc is bulk only
    for (const name of await productNames(page).allInnerTexts()) expect(name).toMatch(/^Żżż seed-bulk \d{4}$/);
    await expect(page.getByRole('button', { name: 'Następna →' })).toBeDisabled();
    console.log(`[bulk] last page ${lastPage}: ${expectedLast} cards`);

    // a page past the end shows the last page instead of an empty grid
    await goToShop(page, '/sklep?page=999');
    await expect(pageNumber(page)).toHaveText(String(lastPage));
    await expect(productLinks(page)).toHaveCount(expectedLast);
  });

  test('deep link ?cat=&marka=&spec=&page=2 restores the sidebar, the chips, the page and the products', async ({ page }) => {
    await goToShop(page, `/sklep?cat=${BULK_CAT}&marka=Seed+Bulk+A&spec=Rozmiar:M&page=2`);
    const aside = sidebar(page);
    const tree = aside.getByTestId('category-tree');

    await openCategories(page);
    await expect(tree.getByRole('button', { name: /^seed-bulk/i })).toHaveAttribute('aria-current', 'page');
    await expect(aside.getByRole('checkbox', { name: /^Seed Bulk A \(\d+\)$/ })).toBeChecked();
    const specHeader = aside.getByRole('button', { name: /^Rozmiar/ });
    await expect(specHeader).toContainText('(1)');
    await specHeader.click();
    await expect(aside.getByRole('checkbox', { name: /^M \(\d+\)$/ })).toBeChecked();
    await expect(aside.getByRole('checkbox', { name: /^S \(\d+\)$/ })).not.toBeChecked();

    await expect(chips(page)).toHaveCount(3);
    await expect(chips(page).filter({ hasText: 'seed-bulk' })).toHaveCount(1);
    await expect(chips(page).filter({ hasText: 'Marka: Seed Bulk A' })).toHaveCount(1);
    await expect(chips(page).filter({ hasText: 'Rozmiar: M' })).toHaveCount(1);

    await expect(pageNumber(page)).toHaveText('2');
    // seed: brand A = even i, size M = i % 3 == 1 → i ≡ 4 (mod 6); page 2 of name_asc starts at the 25th match
    await expect(productLinks(page)).toHaveCount(24);
    await expect(productNames(page).first()).toHaveText(`Żżż seed-bulk ${String(4 + 24 * 6).padStart(4, '0')}`);
    expect(await totalCount(page)).toBe(183);

    await settleCatalog(page);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.35-desktop.png` });
  });

  test('× on a spec chip removes its spec= parameter (and goes back to page 1)', async ({ page }) => {
    await goToShop(page, `/sklep?cat=${BULK_CAT}&spec=Rozmiar:M&spec=Rozmiar:S&page=3`);
    await expect(chips(page)).toHaveCount(3);
    const before = await totalCount(page);

    await page.getByRole('button', { name: 'Usuń filtr: Rozmiar: M' }).click();
    await expect(page).not.toHaveURL(/spec=Rozmiar%3AM/);
    await expect(page).toHaveURL(/spec=Rozmiar%3AS/);
    await expect(page).not.toHaveURL(/[?&]page=/);
    await expect(chips(page)).toHaveCount(2);
    expect(await totalCount(page)).toBeLessThan(before);
  });

  test('changing the category changes the brand list', async ({ page }) => {
    await goToShop(page);
    const aside = sidebar(page);
    const brandSection = aside.getByRole('button', { name: /^Marka/ }).locator('xpath=..');
    const brandRows = brandSection.locator('label span span:first-child');
    await brandSection.getByRole('button', { name: /^Pokaż więcej/ }).click(); // > 6 brands shop-wide
    const shopWide = await brandRows.allInnerTexts();
    expect(shopWide).toContain('Test');
    expect(shopWide).toContain('Seed Bulk A');

    await aside.getByRole('button', { name: /^seed-bulk/i }).click();
    await expect(page).toHaveURL(new RegExp(`[?&]cat=${BULK_CAT}(&|$)`));
    await expect(brandRows).toHaveText(['Seed Bulk A', 'Seed Bulk B']);
    expect(shopWide).not.toEqual(['Seed Bulk A', 'Seed Bulk B']);
  });

  test('a filter change is a client navigation: no full page load, URL and list change, loading indicator shown', async ({ page }) => {
    await goToShop(page);
    await page.evaluate(() => { (window as unknown as { __hydraMarker: string }).__hydraMarker = 'ha-2.35'; });
    const before = await productNames(page).allInnerTexts();

    // Hold the RSC response for 1.5 s so the pending state is observable
    await page.route('**/sklep?**', async route => {
      if (route.request().headers()['rsc'] === '1') await new Promise(r => setTimeout(r, 1500));
      await route.continue();
    });

    await sidebar(page).getByText('Tylko odbiór osobisty', { exact: true }).click();
    const loading = page.getByTestId('listing-loading');
    await expect(loading).toBeVisible();
    await expect(page.getByTestId('product-area')).toHaveAttribute('aria-busy', 'true');
    // the checkbox follows the click at once (optimistic), before the data arrives
    await expect(sidebar(page).getByRole('checkbox', { name: 'Tylko odbiór osobisty' })).toBeChecked();
    await page.locator('#catalog').evaluate(el => el.scrollIntoView());
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.35-loading.png` });

    await expect(page).toHaveURL(/dostawa=odbior/);
    await expect(loading).toBeHidden();
    const after = await productNames(page).allInnerTexts();
    expect(after).not.toEqual(before);
    expect(await page.evaluate(() => (window as unknown as { __hydraMarker?: string }).__hydraMarker)).toBe('ha-2.35');
  });

  test('header search from a product page lands on /sklep?q= (HA-2.32 regression)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await dismissCookies(page);
    await page.goto('/sklep/301001', { waitUntil: 'domcontentloaded' });
    await hideBanner(page);
    await hideDevOverlay(page);

    const input = page.getByTestId('header-search').locator('input[name="q"]');
    await input.fill('Spodnie');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/sklep\?q=Spodnie$/);
    await page.getByTestId('product-area').waitFor({ timeout: 20_000 });
    await expect(page.getByPlaceholder('Szukaj produktu…')).toHaveValue('Spodnie');
    await expect(chips(page).filter({ hasText: 'Szukaj: „Spodnie”' })).toHaveCount(1);
    const names = await productNames(page).allInnerTexts();
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n.toLowerCase()).toContain('spodnie');
  });

  test('counters follow decision B: a selected brand keeps the other brands; specs only with a category', async ({ page }) => {
    // no category → no spec section, only the hint
    await goToShop(page);
    const aside = sidebar(page);
    await expect(aside.getByText('Wybierz kategorię, aby zobaczyć filtry specyfikacji.')).toBeVisible();
    await expect(aside.getByRole('button', { name: /^Powiększenie/ })).toHaveCount(0);

    await goToShop(page, `/sklep?cat=${OPTICS}`);
    await expect(aside.getByRole('button', { name: /^Powiększenie/ })).toBeVisible();
    await aside.getByText('Delta Optical', { exact: true }).click();
    await expect(page).toHaveURL(/marka=Delta\+Optical/);
    await expect(aside.getByRole('checkbox', { name: /^Delta Optical \(1\)$/ })).toBeChecked();
    // Vortex Optics stays offered, counted without the brand filter
    await expect(aside.getByRole('checkbox', { name: /^Vortex Optics \(3\)$/ })).not.toBeChecked();
    expect(await totalCount(page)).toBe(1);
  });

  test('card stock subtracts reservations: 314004 (paid order …2034) is unavailable and gone with stock=1', async ({ page }) => {
    await goToShop(page, '/sklep?q=%C4%86wiek');
    const card = page.getByTestId('product-area').locator('.bg-bg-card').filter({ hasText: 'Ćwiek mosiężny do pasa' });
    await expect(card).toHaveCount(1);
    await expect(card.getByText('Niedostępny')).toBeVisible();

    await sidebar(page).getByText('Tylko dostępne', { exact: true }).click();
    await expect(page).toHaveURL(/stock=1/);
    await expect(page.getByText('Brak wyników')).toBeVisible();
  });

  test('the cache is keyed by the filters: two URLs give two results at once, the same URL the same result', async ({ page }) => {
    await goToShop(page, '/sklep?cat=4003');
    const optics = await productNames(page).allInnerTexts();
    await goToShop(page, '/sklep?cat=2003');
    const backpacks = await productNames(page).allInnerTexts();
    await goToShop(page, '/sklep?cat=4003');
    const opticsAgain = await productNames(page).allInnerTexts();

    console.log('[cache] cat=4003', JSON.stringify(optics), '| cat=2003', JSON.stringify(backpacks));
    expect(optics.length).toBeGreaterThan(0);
    expect(backpacks.length).toBeGreaterThan(0);
    expect(optics).not.toEqual(backpacks);
    expect(opticsAgain).toEqual(optics);
  });

  // Red proof: invalid page/sort/spec values are ignored, never a 500 and never a filter.
  test('invalid spec, page and sort values in the URL are ignored (200, no chips, full total)', async ({ page, request }) => {
    const baseline = await activeInSeed();
    for (const url of [
      '/sklep?spec=bez-dwukropka&spec=%3Ax&spec=x%3A&page=-3&sort=bogus',
      '/sklep?page=abc&page=2&sort=name_asc%27%3B--',
      '/sklep?spec=Powi%C4%99kszenie%3A6x', // a spec without a category is not applied
    ]) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(200);
      await goToShop(page, url);
      expect(await totalCount(page), url).toBe(baseline);
      await expect(chips(page), url).toHaveCount(0);
    }
    // a spec value the category does not offer is dropped, the category stays
    await goToShop(page, `/sklep?cat=${OPTICS}&spec=Powi%C4%99kszenie%3A999x`);
    await expect(chips(page)).toHaveCount(1);
    expect(await totalCount(page)).toBe(4);
  });

  test('screenshots: mobile 375 px and the empty state', async ({ page }) => {
    await goToShop(page, '/sklep?q=xyzniema');
    await expect(page.getByText('Brak wyników')).toBeVisible();
    await settleCatalog(page);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.35-empty.png` });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/sklep?cat=${BULK_CAT}&page=2`, { waitUntil: 'domcontentloaded' });
    await hideBanner(page);
    await hideDevOverlay(page);
    await productLinks(page).first().waitFor({ timeout: 20_000 });
    await expect(page.getByTestId('mobile-filter-bar')).toBeVisible();
    await settleCatalog(page);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.35-mobile.png` });
  });
});
