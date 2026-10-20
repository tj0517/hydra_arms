/**
 * Product card (HA-2.31) — listing grid, PDP "related", shop sections.
 *
 * One stretched link per card (image + name + price + availability line) and one
 * sibling "Do koszyka" button; nothing interactive is nested. Availability line and
 * tags derive from stock + mustPickup(); the card never shows the unit count.
 *
 * Seed products used (supabase/seed.sql):
 *   301001 5.11 trousers      — standard, shippable, no flags, price_compare NULL (red proofs)
 *   302001 Crye JPC vest      — pickup_only, no licence, no age          → "Odbiór osobisty"
 *   306001 Gerber knife       — age_restricted, age_min 18                → "18+"
 *   307001 Blackhawk holster  — requires_license TRUE (category 7005)    → "Wymaga pozwolenia"
 *   313001 backpack           — price_compare 349 > price 299             → struck-through price
 *   313002 gloves             — stock 0                                   → "Niedostępny", button disabled
 *   313003 pouch              — images → /img/seed/packshot-test.png      → whole packshot, 1:1 box
 */
import { test, expect, type Page } from '@playwright/test';
import { dismissCookies, hideBanner } from './fixtures';

const SHOT_DIR = '.playwright-mcp';

const CLEAN = 301001;
const PICKUP_ONLY = 302001;
const ADULT = 306001;
const LICENCE = 307001;
const COMPARE = 313001;
const OUT_OF_STOCK = 313002;
const WITH_IMAGE = 313003;

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
const tagsOf = (card: ReturnType<typeof cardById>) => card.getByRole('list', { name: 'Oznaczenia' }).getByRole('listitem');

/** Narrow the grid by name so the card is on page 1 regardless of pagination, and bring it into view. */
async function showCard(page: Page, term: string, id: number) {
  await page.getByPlaceholder('Szukaj produktu…').fill(term);
  const card = cardById(page, id);
  await card.waitFor({ timeout: 10_000 });
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  return card;
}

test.describe('product card — structure and actions', () => {
  test('exactly one "Do koszyka" button per card, no "Szczegóły" button, nothing nested', async ({ page }) => {
    await goToShop(page);
    const first = cards(page).first();
    await expect(first.getByRole('button', { name: 'Do koszyka' })).toHaveCount(1);
    await expect(first.getByRole('button')).toHaveCount(1);
    await expect(first.getByRole('link')).toHaveCount(1);
    await expect(first.getByText(/szczegóły/i)).toHaveCount(0);
    // the button is not a descendant of the link
    await expect(first.locator('a button')).toHaveCount(0);
  });

  test('clicking the name navigates to /sklep/<id>', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Spodnie taktyczne Ripstop', CLEAN);
    await card.locator('h3').click();
    await expect(page).toHaveURL(`/sklep/${CLEAN}`, { timeout: 10_000 });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('clicking the image navigates to /sklep/<id>', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Ładownica uniwersalna', WITH_IMAGE);
    await card.locator('img').click();
    await expect(page).toHaveURL(`/sklep/${WITH_IMAGE}`, { timeout: 10_000 });
  });

  test('keyboard: Tab moves from the card link to its button', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Spodnie taktyczne Ripstop', CLEAN);
    await card.getByRole('link').focus();
    await page.keyboard.press('Tab');
    await expect(card.getByRole('button', { name: 'Do koszyka' })).toBeFocused();
  });

  test('"Do koszyka" adds the product and shows "Dodano do koszyka"', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Spodnie taktyczne Ripstop', CLEAN);
    await card.getByRole('button', { name: 'Do koszyka' }).click();
    await expect(card.getByRole('button', { name: 'Dodano do koszyka' })).toBeVisible();
    await expect(page).toHaveURL(/\/sklep(\?.*)?$/); // the click did not follow the card link
    const items = await page.evaluate(() => {
      const raw = localStorage.getItem('hydra-cart');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : Object.values(parsed);
    });
    expect(items.map((i: { product: { id: number } }) => i.product.id)).toEqual([CLEAN]);
  });
});

test.describe('product card — price', () => {
  test('catalogue price is struck through only when price_compare > price', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Plecak taktyczny 3-Day', COMPARE);
    const struck = card.locator('s[data-testid="price-compare"]');
    await expect(struck).toHaveText('349,00');
    await expect(card.getByText('299,00', { exact: true })).toBeVisible();
    await expect(card.getByText('PLN', { exact: true })).toHaveCount(1);
    await card.screenshot({ path: `${SHOT_DIR}/ha-2.31-card-compare.png` });
  });

  test('RED: product with price_compare NULL has no strike-through element', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Spodnie taktyczne Ripstop', CLEAN);
    await expect(card.locator('s')).toHaveCount(0);
    await expect(card.locator('[data-testid="price-compare"]')).toHaveCount(0);
    await expect(card.getByText('PLN', { exact: true })).toHaveCount(1); // exactly one price
  });
});

test.describe('product card — availability line and tags', () => {
  test('shippable product: "Dostępny · wysyłka kurierem", no tags (RED for tags)', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Spodnie taktyczne Ripstop', CLEAN);
    await expect(card.getByTestId('availability')).toHaveText('Dostępny · wysyłka kurierem');
    await expect(tagsOf(card)).toHaveCount(0);
    await expect(card.getByText(/Odbiór osobisty|Wymaga pozwolenia|18\+/)).toHaveCount(0);
    await expect(card.getByText(/szt\./i)).toHaveCount(0);
  });

  test('pickup_only product: "Tylko odbiór osobisty w Krakowie" + tag "Odbiór osobisty"', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Kamizelka taktyczna JPC', PICKUP_ONLY);
    await expect(card.getByTestId('availability')).toHaveText('Tylko odbiór osobisty w Krakowie');
    await expect(tagsOf(card)).toHaveText(['Odbiór osobisty']);
    await expect(card.getByRole('button', { name: 'Do koszyka' })).toBeEnabled();
  });

  test('out-of-stock product: "Niedostępny", button disabled, no unit count (RED)', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Rękawice taktyczne Nomex', OUT_OF_STOCK);
    await expect(card.getByTestId('availability')).toHaveText('Niedostępny');
    await expect(card.getByRole('button', { name: 'Do koszyka' })).toBeDisabled();
    await expect(card.getByText(/\d+\s*szt/i)).toHaveCount(0);
    await card.screenshot({ path: `${SHOT_DIR}/ha-2.31-card-out-of-stock.png` });
  });

  test('age_restricted product shows "18+"', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Nóż taktyczny Gerber', ADULT);
    await expect(tagsOf(card)).toHaveText(['18+']);
    await expect(card.getByTestId('availability')).toHaveText('Tylko odbiór osobisty w Krakowie');
  });

  test('requires_license product shows "Wymaga pozwolenia"', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Kaburka udowa', LICENCE);
    await expect(tagsOf(card)).toHaveText(['Wymaga pozwolenia']);
    await expect(card.getByText(/\[/)).toHaveCount(0); // no "[ ODBIÓR ]"-style brackets
  });
});

test.describe('product card — packshot', () => {
  test('image is rendered whole in a 1:1 box (object-contain) on a light background', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Ładownica uniwersalna', WITH_IMAGE);
    const img = card.locator('img');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', /packshot-test/);
    await expect(img).toHaveAttribute('alt', /Ładownica uniwersalna/);
    const box = await img.evaluate(el => {
      const cs = getComputedStyle(el);
      const parent = el.parentElement!;
      const pb = parent.getBoundingClientRect();
      return { fit: cs.objectFit, ratio: pb.width / pb.height, bg: getComputedStyle(parent).backgroundColor };
    });
    expect(box.fit).toBe('contain');
    expect(box.ratio).toBeCloseTo(1, 1);
    expect(box.bg).toBe('rgb(243, 243, 241)');
    await card.screenshot({ path: `${SHOT_DIR}/ha-2.31-card-image-desktop.png` });
  });

  test('packshot card on mobile', async ({ page }) => {
    await goToShop(page, '/sklep', { width: 375, height: 812 });
    const card = await showCard(page, 'Ładownica uniwersalna', WITH_IMAGE);
    await expect(card.locator('img')).toBeVisible();
    await card.screenshot({ path: `${SHOT_DIR}/ha-2.31-card-image-mobile.png` });
  });

  test('card without images shows the neutral placeholder, never a service photo', async ({ page }) => {
    await goToShop(page);
    const card = await showCard(page, 'Spodnie taktyczne Ripstop', CLEAN);
    await expect(card.locator('img')).toHaveCount(0);
    await expect(card.getByText('Brak zdjęcia')).toBeAttached();
  });
});

test.describe('product card — call sites (screenshots)', () => {
  test('listing grid: desktop with at least 6 cards, and mobile', async ({ page }) => {
    await goToShop(page);
    await settleCatalog(page);
    expect(await cards(page).count()).toBeGreaterThanOrEqual(6);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.31-grid-desktop.png` });

    await goToShop(page, '/sklep', { width: 375, height: 812 });
    await settleCatalog(page);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.31-grid-mobile.png` });
  });

  test('PDP related grid renders cards', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await dismissCookies(page);
    await page.goto(`/sklep/${CLEAN}`, { waitUntil: 'domcontentloaded' });
    await hideBanner(page);
    await hideDevOverlay(page);
    const related = page.getByTestId('product-card').first();
    await related.waitFor({ timeout: 20_000 });
    await expect(related.getByRole('button', { name: 'Do koszyka' })).toHaveCount(1);
    await related.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.31-pdp-related.png` });
  });

  test('shop sections above the catalogue (Sanity product picker)', async ({ page }) => {
    await goToShop(page);
    const total = await page.getByTestId('product-card').count();
    const inArea = await cards(page).count();
    if (total - inArea === 0) { test.skip(true, 'no product-picker section in local Sanity content'); return; }
    const first = page.getByTestId('product-card').first();
    await first.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOT_DIR}/ha-2.31-shop-sections.png` });
  });
});
