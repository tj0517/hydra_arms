/**
 * Playwright config for the verification-mode path (HA-2.08).
 *
 * The server runs with SHOP_MODE=verification and P24_MODE=mock — the only config in the repo
 * that does. It proves: banner on every page, the full cart → checkout → mock payment →
 * confirmation path, and that an order paid in verification mode never reaches BaseLinker.
 * No production P24 keys are set, and BASELINKER_MOCK is always true.
 *
 * Run with: npm run test:verification   (needs: npm run db:start; port 3007 free)
 */
import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { assertNotProd } from './scripts/lib/prodGuard'
import { TEST_SHIPPING_ENV } from './tests/shop/shippingEnv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true })
assertNotProd('npx playwright test --config playwright.verification.config.ts')
if (!process.env.P24_CRC_KEY) {
  throw new Error('P24_CRC_KEY must be set in .env.development.local to run shop tests (see .env.development.local.example)')
}
process.env.ORDER_LINK_SECRET = 'fake-order-link-secret-for-playwright-only'

const PORT = '3007'

export default defineConfig({
  testDir: './tests/shop/verification-server',
  testMatch: 'flow.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      ...TEST_SHIPPING_ENV, // HA-2.02
      PORT,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      BASELINKER_MOCK: 'true',
      // Must be non-zero, or markOrderPaid skips the BL push for an unrelated reason and the
      // "counter stays 0" proof would pass vacuously.
      BASELINKER_STATUS_PAID: process.env.BASELINKER_STATUS_PAID || '12345',
      RESEND_MOCK: 'true',
      SITE_URL: `http://localhost:${PORT}`,
      ORDER_LINK_SECRET: process.env.ORDER_LINK_SECRET,
      SHOP_MODE: 'verification',
      P24_MODE: 'mock',
      P24_NOTIFY_ALLOWED_IPS: '',
      P24_CRC_KEY: process.env.P24_CRC_KEY,
      P24_MERCHANT_ID: process.env.P24_MERCHANT_ID ?? '',
      P24_POS_ID: process.env.P24_POS_ID ?? '',
      P24_API_KEY: '',
    },
  },
})
