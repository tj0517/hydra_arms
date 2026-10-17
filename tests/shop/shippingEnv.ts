/**
 * HA-2.02: shipping price list for every Playwright dev server — preliminary values
 * (tj 2026-10-16), the same as .env.development.local.example. Spread into each
 * config's webServer.env so tests never depend on a developer's local env file.
 *
 * INPOST_GEOWIDGET_TOKEN is empty on purpose: the checkout then shows the manual
 * Paczkomat code field and no test ever loads the InPost script.
 * playwright.shipping-env.config.ts overrides these with a broken price list.
 */
export const TEST_SHIPPING_ENV = {
  SHIPPING_PRICE_DHL: '19.99',
  SHIPPING_PRICE_DPD: '17.99',
  SHIPPING_PRICE_INPOST: '14.99',
  SHIPPING_PRICE_INPOST_LOCKER: '14.99',
  FREE_SHIPPING_THRESHOLD: '500.00',
  INPOST_GEOWIDGET_TOKEN: '',
} as const
