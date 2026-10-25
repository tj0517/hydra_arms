/**
 * Playwright config for the verification-mode red proof (HA-2.08).
 *
 * SHOP_MODE=verification together with P24_MODE=production — a misconfiguration that must
 * refuse checkout before any order or payment row exists. All P24 credentials are EMPTY
 * here on purpose: even with the guard removed, no request carrying a real key can leave
 * this server. BASELINKER_MOCK is always true.
 *
 * Run with: npm run test:verification:p24-prod   (needs: npm run db:start; port 3008 free)
 */
import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { assertNotProd } from './scripts/lib/prodGuard'
import { TEST_SHIPPING_ENV } from './tests/shop/shippingEnv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true })
assertNotProd('npx playwright test --config playwright.verification-p24-prod.config.ts')

const PORT = '3008'

export default defineConfig({
  testDir: './tests/shop/verification-server',
  testMatch: 'p24-production.spec.ts',
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
      BASELINKER_STATUS_PAID: process.env.BASELINKER_STATUS_PAID || '12345',
      RESEND_MOCK: 'true',
      SITE_URL: `http://localhost:${PORT}`,
      ORDER_LINK_SECRET: 'fake-order-link-secret-for-playwright-only',
      SHOP_MODE: 'verification',
      P24_MODE: 'production',
      P24_NOTIFY_ALLOWED_IPS: '',
      P24_CRC_KEY: 'fake-crc-key-for-playwright-only',
      P24_MERCHANT_ID: '',
      P24_POS_ID: '',
      P24_API_KEY: '',
    },
  },
})
