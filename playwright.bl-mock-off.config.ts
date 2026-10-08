/**
 * Playwright config for the bl-mock-counter red proof (HA-2.20).
 *
 * The server runs with BASELINKER_MOCK=false — the ONLY config in the repo that
 * does, so the env guard on /api/shop/dev/bl-mock-counter can be proven to
 * return 404.  BASELINKER_TOKEN is left empty: these tests never reach a real
 * BaseLinker call, they only hit the dev endpoint's guard.
 *
 * Run with: npm run test:bl-mock-off
 */
import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { assertNotProd } from './scripts/lib/prodGuard'

// Load local Supabase keys (never override with prod secrets)
dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true })
assertNotProd('npx playwright test --config playwright.bl-mock-off.config.ts')

export default defineConfig({
  testDir: './tests/shop',
  testMatch: 'bl-mock-off.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3005',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- -p 3005',
    url: 'http://localhost:3005',
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      PORT: '3005',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      // The point of this config — explicitly NOT 'true'.
      BASELINKER_MOCK: 'false',
      BASELINKER_TOKEN: '',
      BASELINKER_STATUS_PAID: process.env.BASELINKER_STATUS_PAID ?? '',
      RESEND_MOCK: 'true',
      SHOP_BASE_URL: 'http://localhost:3005',
      P24_MODE: 'mock',
      P24_CRC_KEY: process.env.P24_CRC_KEY ?? 'mock-crc-key-dev',
      P24_MERCHANT_ID: process.env.P24_MERCHANT_ID ?? '',
      P24_POS_ID: process.env.P24_POS_ID ?? '',
      P24_NOTIFY_ALLOWED_IPS: '',
    },
  },
})
