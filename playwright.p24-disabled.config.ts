/**
 * Playwright config for fail-closed tests: server runs with P24_MODE unset
 * and P24_CRC_KEY empty to verify that mock surfaces return 404/5xx.
 *
 * Run with: npm run test:p24:disabled
 */
import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load local Supabase keys (never override with prod secrets)
dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true })

export default defineConfig({
  testDir: './tests/shop/p24',
  testMatch: 'p24-disabled.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- -p 3002',
    url: 'http://localhost:3002',
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      PORT: '3002',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      BASELINKER_MOCK: process.env.BASELINKER_MOCK ?? 'true',
      BASELINKER_STATUS_PAID: process.env.BASELINKER_STATUS_PAID ?? '',
      SHOP_BASE_URL: 'http://localhost:3002',
      // P24_MODE set to '' (not absent) — Playwright webServer env is additive over the
      // test-runner's process.env (which has P24_MODE=mock from dotenv). An explicit
      // empty string overrides it so getP24Mode() returns 'disabled'.
      P24_MODE: '',
      P24_CRC_KEY: '',   // empty CRC — tests the crcKey() guard
      P24_MERCHANT_ID: '',
      P24_POS_ID: '',
    },
  },
})
