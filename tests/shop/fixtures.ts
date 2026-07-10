/**
 * Shared helpers for shop tests.
 */
import type { Page } from '@playwright/test';

/**
 * Dismiss the cookie banner and skip the loading screen via addInitScript.
 * Must be called BEFORE page.goto().
 */
export async function dismissCookies(page: Page) {
  await page.addInitScript(() => {
    // Pre-set cookie consent in localStorage
    const key = 'hydra_cookie_consent';
    const val = JSON.stringify({ necessary: true, analytics: true, marketing: true });
    try { localStorage.setItem(key, val); } catch (_) {}

    // Mark as cookies-ok immediately on html element
    document.documentElement.setAttribute('data-cookies-ok', '1');

    // Override innerWidth so LoadingScreen thinks it's mobile and skips instantly
    // (LoadingScreen skips when window.innerWidth < 768)
    Object.defineProperty(window, 'innerWidth', { get: () => 480, configurable: true });
  });
}

/**
 * Force-hide the cookie banner and loading screen after React has hydrated.
 * Call this AFTER waitForSelector / page is interactive.
 */
export async function hideBanner(page: Page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-cookies-ok', '1');

    // Hide cookie banner
    const banner = document.querySelector('.cookies-banner') as HTMLElement | null;
    if (banner) { banner.style.display = 'none'; banner.style.pointerEvents = 'none'; }

    // Hide loading screen
    const ls = document.querySelector('.ls') as HTMLElement | null;
    if (ls) { ls.style.display = 'none'; ls.style.pointerEvents = 'none'; }

    // Notify app that loading is done
    document.documentElement.classList.remove('loading-active');
    try { window.dispatchEvent(new Event('loadingDone')); } catch (_) {}
  });
}
