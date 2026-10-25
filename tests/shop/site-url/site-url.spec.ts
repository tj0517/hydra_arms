/**
 * SITE_URL drives canonical, og:url, og:image, robots, sitemap and breadcrumb JSON-LD (HA-2.21).
 * Runs once per case in playwright.site-url.config.ts (two values + unset → https://hydra-arms.com).
 *
 * Run: npm run test:site-url
 */
import { test, expect } from '@playwright/test'

const EXPECTED = process.env.EXPECTED_SITE_URL ?? ''

test.beforeAll(() => {
  expect(EXPECTED, 'EXPECTED_SITE_URL is set by playwright.site-url.config.ts').toMatch(/^https:\/\/[^/]+$/)
})

function attr(html: string, re: RegExp): string | null {
  return html.match(re)?.[1] ?? null
}

test('homepage: canonical, og:url and og:image use SITE_URL', async ({ request }) => {
  const res = await request.get('/')
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(attr(html, /<link rel="canonical" href="([^"]*)"/)).toBe(EXPECTED)
  expect(attr(html, /<meta property="og:url" content="([^"]*)"/)).toBe(EXPECTED)
  expect(attr(html, /<meta property="og:image" content="([^"]*)"/)).toBe(`${EXPECTED}/og-default.jpg`)
})

test('robots.txt: same rules as before, Sitemap on SITE_URL', async ({ request }) => {
  const res = await request.get('/robots.txt')
  expect(res.status()).toBe(200)
  const txt = await res.text()
  expect(txt).toContain('User-Agent: *')
  expect(txt).toContain('Allow: /')
  for (const p of ['/studio/', '/api/', '/konto/']) expect(txt).toContain(`Disallow: ${p}`)
  expect(txt).toContain(`Sitemap: ${EXPECTED}/sitemap.xml`)
})

test('sitemap.xml: every <loc> is on SITE_URL', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)
  const locs = [...(await res.text()).matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])
  expect(locs.length).toBeGreaterThan(10)
  expect(locs.filter((l) => !l.startsWith(`${EXPECTED}/`))).toEqual([])
  expect(locs).toContain(`${EXPECTED}/sklep`)
})

test('product page: breadcrumb JSON-LD items are on SITE_URL', async ({ page }) => {
  await page.goto('/sklep/312001')
  const raw = await page.getByTestId('breadcrumbs').locator('script[type="application/ld+json"]').textContent()
  const items = (JSON.parse(raw ?? '{}').itemListElement ?? []).map((i: { item: string }) => i.item)
  expect(items).toEqual([
    `${EXPECTED}/sklep`,
    `${EXPECTED}/sklep?cat=12001`,
    `${EXPECTED}/sklep?cat=12002`,
    `${EXPECTED}/sklep/312001`,
  ])
})
