/**
 * Playwright config for the listing fail-closed red proof (HA-2.35).
 *
 * The server runs WITHOUT SUPABASE_SERVICE_ROLE_KEY. shop_listing/shop_tree are
 * EXECUTE for service_role only, so /sklep must fail with the error page (500) —
 * never render 200 with an empty catalogue (deferred 2026-09-30).
 *
 * Run with: npm run test:listing:no-service-role
 */
import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { assertNotProd } from './scripts/lib/prodGuard'
import { TEST_SHIPPING_ENV } from './tests/shop/shippingEnv'

// Load local Supabase keys (never override with prod secrets)
dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true })
assertNotProd('npx playwright test --config playwright.listing-no-service-role.config.ts')

export default defineConfig({
  testDir: './tests/shop/listing-no-service-role',
  testMatch: 'listing-no-service-role.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3008',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- -p 3008',
    url: 'http://localhost:3008',
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      ...TEST_SHIPPING_ENV,
      PORT: '3008',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      // The point of this config: no service-role key. Empty overrides any value
      // Next would otherwise load from an .env file.
      SUPABASE_SERVICE_ROLE_KEY: '',
      BASELINKER_MOCK: 'true',
      BASELINKER_STATUS_PAID: '',
      RESEND_MOCK: 'true',
      SHOP_BASE_URL: 'http://localhost:3008',
      SHOP_MODE: '',
      P24_MODE: 'mock',
      P24_CRC_KEY: process.env.P24_CRC_KEY ?? 'mock-crc-key-dev',
      P24_MERCHANT_ID: process.env.P24_MERCHANT_ID ?? '',
      P24_POS_ID: process.env.P24_POS_ID ?? '',
      P24_NOTIFY_ALLOWED_IPS: '',
    },
  },
})
