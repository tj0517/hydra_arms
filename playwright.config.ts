import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { assertNotProd } from './scripts/lib/prodGuard';

// Load local dev env first (.env.development.local — local Supabase stack, BASELINKER_MOCK=true).
// override: true ensures these win over anything already in process.env so the dev server
// started by webServer below cannot accidentally pick up prod keys from .env.local.
dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true });
assertNotProd('npx playwright test');

export default defineConfig({
  testDir: './tests',
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
      P24_MODE: process.env.P24_MODE ?? 'mock',
      P24_CRC_KEY: process.env.P24_CRC_KEY ?? '',
      P24_MERCHANT_ID: process.env.P24_MERCHANT_ID ?? '',
      P24_POS_ID: process.env.P24_POS_ID ?? '',
    },
  },
});
