import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

test.describe('E2E-AUTH-02: Login / Logout Flow', () => {
  test('valid credentials → login succeeds, redirected to board', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip(true, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set');
      return;
    }
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/tasks\//, { timeout: 15_000 });
  });

  test('invalid credentials → error message shown', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Use div[class*="destructive"] to avoid strict-mode violation from input aria classes
    await expect(page.locator('div[class*="destructive"]')).toBeVisible({ timeout: 15_000 });
  });

  test('unauthenticated access to /habits → redirected to /auth/login', async ({ page }) => {
    await page.goto('/habits');
    await expect(page).toHaveURL('/auth/login', { timeout: 10_000 });
  });

  test('unauthenticated access to /notes → redirected to /auth/login', async ({ page }) => {
    await page.goto('/notes');
    await expect(page).toHaveURL('/auth/login', { timeout: 10_000 });
  });

  test('session persistence: refresh page stays logged in', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip(true, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set');
      return;
    }
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/tasks\//, { timeout: 15_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/tasks\//, { timeout: 10_000 });
  });

  test('logout → session cleared, redirected to landing', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip(true, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set');
      return;
    }
    // Login first
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/tasks\//, { timeout: 15_000 });

    // Open user dropdown (avatar button has title set to user email)
    await page.getByTitle(TEST_EMAIL!).click();
    // Log out is a dropdown menu item, not a button
    await page.getByRole('menuitem', { name: /log out/i }).click();

    // Should redirect to the public landing page or login
    await expect(page).toHaveURL(/\/auth\/login$|\/$/, { timeout: 10_000 });
  });

  test('sign up link navigates to register page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL('/auth/register');
  });
});
