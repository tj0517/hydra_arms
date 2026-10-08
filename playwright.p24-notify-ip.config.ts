/**
 * Playwright config for the P24 notify IP-allowlist red proof (HA-2.20).
 *
 * The server runs in mock mode WITH P24_NOTIFY_ALLOWED_IPS set, which (decision
 * tj 2026-10-08) activates the filter in any mode.  Mock mode is deliberate:
 * processing a notify end-to-end in sandbox mode would need real P24 keys (O-09,
 * covered by HA-2.23), while the filter logic itself is mode-independent.
 *
 * The allowlist here uses RFC 5737 documentation addresses, never the real P24
 * ranges — the real list belongs in env only.
 *
 * Note: mock-pay → notify does NOT work in this config, by design.  That
 * server-to-server fetch sends no x-forwarded-for, so the active filter rejects
 * it.  The mock-pay path is proven in the default config, where the filter is off.
 *
 * Run with: npm run test:p24:notify-ip
 */
import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { assertNotProd } from './scripts/lib/prodGuard'

// Load local Supabase keys (never override with prod secrets)
dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true })
assertNotProd('npx playwright test --config playwright.p24-notify-ip.config.ts')

if (!process.env.P24_CRC_KEY) {
  throw new Error('P24_CRC_KEY must be set in .env.development.local (see .env.development.local.example)')
}

// Kept in sync with the ALLOWED_* / FOREIGN_IP constants in the spec.
const ALLOWLIST = '203.0.113.7, 198.51.100.0/24'

export default defineConfig({
  testDir: './tests/shop/p24',
  testMatch: 'notify-ip-api.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3004',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- -p 3004',
    url: 'http://localhost:3004',
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      PORT: '3004',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      BASELINKER_MOCK: 'true',
      BASELINKER_STATUS_PAID: process.env.BASELINKER_STATUS_PAID ?? '',
      RESEND_MOCK: 'true',
      SHOP_BASE_URL: 'http://localhost:3004',
      P24_MODE: 'mock',
      P24_CRC_KEY: process.env.P24_CRC_KEY,
      P24_MERCHANT_ID: process.env.P24_MERCHANT_ID ?? '',
      P24_POS_ID: process.env.P24_POS_ID ?? '',
      P24_NOTIFY_ALLOWED_IPS: ALLOWLIST,
    },
  },
})
