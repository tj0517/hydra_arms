import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { assertNotProd } from './scripts/lib/prodGuard';
import { TEST_SHIPPING_ENV } from './tests/shop/shippingEnv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true });
assertNotProd('npx playwright test --config playwright.order-link-no-secret.config.ts');
if (!process.env.P24_CRC_KEY) {
  throw new Error('P24_CRC_KEY must be set in .env.development.local to run this test suite')
}

// HA-2.19: dev server WITHOUT ORDER_LINK_SECRET (fails closed: mails without the link,
// status page/API refuse every token). SITE_URL is set, so "no link" is down to the
// missing secret alone. Must stay unset on the runner too: the spec checks it.
delete process.env.ORDER_LINK_SECRET

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/order-link-no-secret.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3006',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- -p 3006',
    url: 'http://localhost:3006',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
    env: {
      ...TEST_SHIPPING_ENV, // HA-2.02
      PORT: '3006',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      BASELINKER_MOCK: 'true',
      BASELINKER_STATUS_PAID: process.env.BASELINKER_STATUS_PAID ?? '',
      RESEND_MOCK: 'true',
      SITE_URL: 'http://localhost:3006',
      ORDER_LINK_SECRET: '',   // intentionally empty: tests fail-closed behaviour
      P24_MODE: 'mock',
      P24_NOTIFY_ALLOWED_IPS: '',
      P24_CRC_KEY: process.env.P24_CRC_KEY,
      P24_MERCHANT_ID: process.env.P24_MERCHANT_ID ?? '',
      P24_POS_ID: process.env.P24_POS_ID ?? '',
    },
  },
});
