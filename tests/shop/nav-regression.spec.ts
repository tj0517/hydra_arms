/**
 * Nav regression guard for the company site (HA-2.32).
 *
 * `Nav` is shared by every page. HA-2.32 adds a permanent „Sklep" link and a
 * search field on `/sklep*`; outside the shop the link list must stay exactly
 * as it was. The baseline in `__fixtures__/nav-links.json` was captured from
 * `origin/main` (e92ed97) with `NAV_FIXTURE_UPDATE=1`. A pixel diff is not a
 * deterministic check here (ScrambleLink / GSAP), so the test compares the
 * rendered link list (label + href) — desktop list and open mobile menu.
 *
 * Refresh the baseline deliberately, never to make a red run green:
 *   NAV_FIXTURE_UPDATE=1 npx playwright test tests/shop/nav-regression.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { dismissCookies, hideBanner } from './fixtures';

const SHOT_DIR = '.playwright-mcp';
const FIXTURE = path.join(__dirname, '__fixtures__', 'nav-links.json');
const UPDATE = process.env.NAV_FIXTURE_UPDATE === '1';
const PAGES = ['/', '/uslugi'] as const;

type NavLink = { label: string; href: string };
type NavSnapshot = { desktop: NavLink[]; mobile: NavLink[] };

const desktopLinks = (page: Page) => page.locator('nav ul a');
const mobileMenu = (page: Page) => page.locator('div.fixed.inset-0.lg\\:hidden');

async function readLinks(page: Page, scope: ReturnType<Page['locator']>): Promise<NavLink[]> {
  return scope.evaluateAll(els =>
    els.map(el => ({
      label: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
      href: el.getAttribute('href') ?? '',
    })),
  );
}

async function open(page: Page, url: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await hideBanner(page);
  await page.locator('nav').waitFor({ timeout: 20_000 });
  await page.mouse.move(0, 0); // keep the pointer off the links — hover scrambles the label
}

async function snapshot(page: Page, url: string, shotSlug: string): Promise<NavSnapshot> {
  await open(page, url, 1280);
  await expect(desktopLinks(page).first()).toBeVisible({ timeout: 20_000 });
  const desktop = await readLinks(page, desktopLinks(page));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOT_DIR, `ha-2.32-${shotSlug}-desktop.png`) });

  await open(page, url, 390);
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(mobileMenu(page)).toBeVisible();
  await page.waitForTimeout(700);
  const mobile = await readLinks(page, mobileMenu(page).locator('a'));
  await page.screenshot({ path: path.join(SHOT_DIR, `ha-2.32-${shotSlug}-mobile-menu.png`) });
  return { desktop, mobile };
}

test.describe('nav regression outside /sklep', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookies(page);
  });

  test('nav link lists on / and /uslugi match the origin/main baseline', async ({ page }) => {
    const prefix = UPDATE ? 'baseline-nav' : 'nav';
    const current: Record<string, NavSnapshot> = {};
    for (const url of PAGES) {
      const slug = url === '/' ? 'home' : url.slice(1);
      current[url] = await snapshot(page, url, `${prefix}-${slug}`);
    }

    if (UPDATE) {
      fs.writeFileSync(FIXTURE, JSON.stringify(current, null, 2) + '\n');
      console.log(`baseline written to ${FIXTURE}`);
      return;
    }

    expect(fs.existsSync(FIXTURE), 'baseline fixture missing — capture it on origin/main').toBe(true);
    const baseline = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as Record<string, NavSnapshot>;
    for (const url of PAGES) {
      expect(current[url].desktop, `desktop nav on ${url}`).toEqual(baseline[url].desktop);
      expect(current[url].mobile, `mobile menu on ${url}`).toEqual(baseline[url].mobile);
    }
  });
});
