/**
 * Red proof: /sklep without SUPABASE_SERVICE_ROLE_KEY is an error, not an empty
 * shop (HA-2.35). Run with: npm run test:listing:no-service-role
 *
 * The webServer in playwright.listing-no-service-role.config.ts runs with the key
 * empty. loadListing() → createAdminClient() throws, unstable_cache stores nothing,
 * Next answers 500.
 *
 * Do NOT loosen the assertions; fix src/lib/shop/listing.ts instead.
 */
import { test, expect } from '@playwright/test'

test('RED PROOF: /sklep without the service-role key answers 500, not 200 with an empty list', async ({ request }) => {
  for (const url of ['/sklep', '/sklep?cat=4003&page=2']) {
    const res = await request.get(url)
    const body = await res.text()
    console.log(`[${url}] status`, res.status(), 'empty-state text present:', body.includes('Brak wyników'))
    expect(res.status(), url).toBe(500)
    expect(body, url).not.toContain('data-testid="product-count"')
  }
})
