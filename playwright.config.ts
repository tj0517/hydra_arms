import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { assertNotProd } from './scripts/lib/prodGuard';

// Load local dev env first (.env.development.local — local Supabase stack, BASELINKER_MOCK=true).
// override: true ensures these win over anything already in process.env so the dev server
// started by webServer below cannot accidentally pick up prod keys from .env.local.
dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true });
assertNotProd('npx playwright test');
if (!process.env.P24_CRC_KEY) {
  throw new Error('P24_CRC_KEY must be set in .env.development.local to run shop tests (see .env.development.local.example)')
}

export default defineConfig({
  testDir: './tests',
  // Specs that need a webServer with different env live in their own configs.
  testIgnore: [
    '**/p24-disabled.spec.ts',
    '**/p24-no-baseurl.spec.ts',
    '**/notify-ip-api.spec.ts',   // playwright.p24-notify-ip.config.ts (HA-2.20)
    '**/bl-mock-off.spec.ts',     // playwright.bl-mock-off.config.ts  (HA-2.20)
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  workers: process.env.CI ? 2 : 2,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- -p 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
    // Explicitly forward local Supabase vars so the Next.js dev server uses the
    // local stack even if .env.local (with prod keys) is present in the project root.
    env: {
      PORT: '3001',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      BASELINKER_MOCK: process.env.BASELINKER_MOCK ?? 'true',
      BASELINKER_STATUS_PAID: process.env.BASELINKER_STATUS_PAID ?? '',
      RESEND_MOCK: 'true',
      SHOP_BASE_URL: 'http://localhost:3001',
      P24_MODE: process.env.P24_MODE ?? 'mock',
      // Empty (not absent): webServer env is additive over the test-runner's
      // process.env, so an explicit '' guarantees the notify IP filter is OFF
      // here and the mock-pay -> notify path keeps working (HA-2.20).
      P24_NOTIFY_ALLOWED_IPS: '',
      P24_CRC_KEY: process.env.P24_CRC_KEY,
      P24_MERCHANT_ID: process.env.P24_MERCHANT_ID ?? '',
      P24_POS_ID: process.env.P24_POS_ID ?? '',
    },
  },
});
