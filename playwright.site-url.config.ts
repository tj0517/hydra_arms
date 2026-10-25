/**
 * Playwright config for the SITE_URL tests (HA-2.21).
 *
 * One config, three server envs picked by SITE_URL_CASE, each on its own port so a
 * leftover server from another case is never reused:
 *   a     → SITE_URL=https://site-a.example.test
 *   b     → SITE_URL=https://site-b.example.test/   (trailing slash must be stripped)
 *   unset → SITE_URL=''                             (falls back to https://hydra-arms.com)
 * The spec reads the expected value from EXPECTED_SITE_URL.
 *
 * Run with: npm run test:site-url   (all three cases in a row)
 */
import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { assertNotProd } from './scripts/lib/prodGuard';
import { TEST_SHIPPING_ENV } from './tests/shop/shippingEnv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local'), override: true });
assertNotProd('npx playwright test --config playwright.site-url.config.ts');

const CASES = {
  a: { port: '3110', siteUrl: 'https://site-a.example.test', expected: 'https://site-a.example.test' },
  b: { port: '3111', siteUrl: 'https://site-b.example.test/', expected: 'https://site-b.example.test' },
  unset: { port: '3112', siteUrl: '', expected: 'https://hydra-arms.com' },
} as const;
const caseName = (process.env.SITE_URL_CASE ?? 'a') as keyof typeof CASES;
const c = CASES[caseName];
if (!c) throw new Error(`SITE_URL_CASE must be one of ${Object.keys(CASES).join(', ')}, got "${caseName}"`);

// "unset" is '' and not absent: `next dev` reads .env.development.local (SITE_URL=localhost)
// itself and only skips keys already in its env. siteUrl() treats '' and absent the same;
// the truly absent case is covered by the next build + next start curl in the HA-2.21 report.
process.env.EXPECTED_SITE_URL = c.expected;

export default defineConfig({
  testDir: './tests/shop/site-url',
  testMatch: 'site-url.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${c.port}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: `chromium-${caseName}`, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run dev -- -p ${c.port}`,
    url: `http://localhost:${c.port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...TEST_SHIPPING_ENV, // HA-2.02
      PORT: c.port,
      SITE_URL: c.siteUrl,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      BASELINKER_MOCK: 'true',
      RESEND_MOCK: 'true',
      P24_MODE: 'mock',
      SHOP_MODE: '',
      P24_NOTIFY_ALLOWED_IPS: '',
    },
  },
});
