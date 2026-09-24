import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { assertNotProd } from './scripts/lib/prodGuard';

dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true });
assertNotProd('npx playwright test --config playwright.p24-no-baseurl.config.ts');
if (!process.env.P24_CRC_KEY) {
  throw new Error('P24_CRC_KEY must be set in .env.development.local to run this test suite')
}

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/p24-no-baseurl.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- -p 3003',
    url: 'http://localhost:3003',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
    env: {
      PORT: '3003',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      BASELINKER_MOCK: 'true',
      BASELINKER_STATUS_PAID: process.env.BASELINKER_STATUS_PAID ?? '',
      SHOP_BASE_URL: '',  // intentionally empty: tests fail-closed behaviour
      P24_MODE: 'mock',
      P24_CRC_KEY: process.env.P24_CRC_KEY,
      P24_MERCHANT_ID: process.env.P24_MERCHANT_ID ?? '',
      P24_POS_ID: process.env.P24_POS_ID ?? '',
    },
  },
});
