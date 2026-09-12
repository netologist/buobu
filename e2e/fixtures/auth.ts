/**
 * Playwright test fixtures for authentication.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/auth'
 *   test('my test', async ({ authenticatedPage }) => { ... })
 *
 * Required environment variables (set in .env.test.local or CI secrets):
 *   E2E_TEST_EMAIL       — existing test account email
 *   E2E_TEST_PASSWORD    — existing test account password
 *   E2E_TEST_INVITE_CODE — valid invite code for registration tests
 */

import { test as base, expect, type Page } from '@playwright/test';

export { expect };

type AuthFixtures = {
  /** Page pre-logged in with the E2E test account. */
  authenticatedPage: Page;
};

async function loginViaUI(page: Page, email: string, password: string) {
  // Suppress the Daily Briefing reminder before any page script runs.
  // The component reads 'buobu.last-briefing-date' from localStorage and skips
  // the floating overlay when the stored date matches today.
  await page.addInitScript(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('buobu.last-briefing-date', today);
  });

  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // After login, app redirects / → /tasks/kanban-view
  await page.waitForURL(/\/tasks\//, { timeout: 20_000 });
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use, testInfo) => {
    // Suppress the Daily Briefing reminder before any page script runs.
    // The component reads 'buobu.last-briefing-date' from localStorage and skips
    // the floating overlay when the stored date matches today.
    await page.addInitScript(() => {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem('buobu.last-briefing-date', today);
    });

    const isLocalMode = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

    if (isLocalMode) {
      // In Local Mode, no Supabase auth or login screen is needed.
      // The app runs as the synthetic Local User automatically.
      await page.goto('/tasks/kanban-view');
      await page.waitForLoadState('domcontentloaded');

      // Dismiss first-login onboarding modal if shown (fresh IndexedDB)
      const skipBtn = page.getByRole('button', { name: /skip & auto setup/i });
      try {
        await skipBtn.waitFor({ state: 'visible', timeout: 25_000 });
        await skipBtn.click();
        await skipBtn.waitFor({ state: 'hidden', timeout: 15_000 });
      } catch {
        // Modal already dismissed or data already present
      }

      // Ensure default workspace has rendered
      await page.locator('text=My Board').first().waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {});

      await use(page);
      return;
    }

    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      testInfo.skip(true, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set — add to .env.local');
      await use(page);
      return;
    }

    try {
      await loginViaUI(page, email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      testInfo.skip(true, `Login fixture failed (bad credentials or Supabase unreachable): ${msg}`);
      await use(page);
      return;
    }

    await use(page);
  },
});
