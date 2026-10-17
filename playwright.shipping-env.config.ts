/**
 * Playwright config for the shipping price-list fail-closed red proof (HA-2.02).
 *
 * The server runs with a BROKEN price list: SHIPPING_PRICE_DHL missing,
 * FREE_SHIPPING_THRESHOLD not a number. Every parcel checkout must be refused
 * before any order row exists; personal pickup needs no price and still works.
 *
 * Run with: npm run test:shipping-env
 */
import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { assertNotProd } from './scripts/lib/prodGuard'
import { TEST_SHIPPING_ENV } from './tests/shop/shippingEnv'

// Load local Supabase keys (never override with prod secrets)
dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true })
assertNotProd('npx playwright test --config playwright.shipping-env.config.ts')

export default defineConfig({
  testDir: './tests/shop/shipping-env',
  testMatch: 'shipping-env.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3007',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- -p 3007',
    url: 'http://localhost:3007',
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      ...TEST_SHIPPING_ENV,
      // The point of this config: a broken price list (empty = missing, 'abc' = invalid).
      SHIPPING_PRICE_DHL: '',
      FREE_SHIPPING_THRESHOLD: 'abc',
      PORT: '3007',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      BASELINKER_MOCK: 'true',
      BASELINKER_STATUS_PAID: '',
      RESEND_MOCK: 'true',
      SHOP_BASE_URL: 'http://localhost:3007',
      SHOP_MODE: '',
      P24_MODE: 'mock',
      P24_CRC_KEY: process.env.P24_CRC_KEY ?? 'mock-crc-key-dev',
      P24_MERCHANT_ID: process.env.P24_MERCHANT_ID ?? '',
      P24_POS_ID: process.env.P24_POS_ID ?? '',
      P24_NOTIFY_ALLOWED_IPS: '',
    },
  },
})
