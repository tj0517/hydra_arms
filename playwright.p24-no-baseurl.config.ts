import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { assertNotProd } from './scripts/lib/prodGuard';
import { TEST_SHIPPING_ENV } from './tests/shop/shippingEnv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true });
assertNotProd('npx playwright test --config playwright.p24-no-baseurl.config.ts');
if (!process.env.P24_CRC_KEY) {
  throw new Error('P24_CRC_KEY must be set in .env.development.local to run this test suite')
}
// Fake key (HA-2.19): the secret IS set here, so "no link" below is down to the empty SHOP_BASE_URL alone.
process.env.ORDER_LINK_SECRET = 'fake-order-link-secret-for-playwright-only'

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
      ...TEST_SHIPPING_ENV, // HA-2.02
      PORT: '3003',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      BASELINKER_MOCK: 'true',
      BASELINKER_STATUS_PAID: process.env.BASELINKER_STATUS_PAID ?? '',
      SHOP_BASE_URL: '',  // intentionally empty: tests fail-closed behaviour
      ORDER_LINK_SECRET: process.env.ORDER_LINK_SECRET,
      RESEND_MOCK: 'true',
      P24_MODE: 'mock',
      P24_NOTIFY_ALLOWED_IPS: '',   // filter off: this config tests the SHOP_BASE_URL guard (HA-2.20)
      P24_CRC_KEY: process.env.P24_CRC_KEY,
      P24_MERCHANT_ID: process.env.P24_MERCHANT_ID ?? '',
      P24_POS_ID: process.env.P24_POS_ID ?? '',
    },
  },
});
