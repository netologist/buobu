import { test, expect } from '@playwright/test';

test.describe('E2E-AUTH-01: Registration Flow', { tag: '@cloud' }, () => {
  test.skip(
    process.env.NEXT_PUBLIC_LOCAL_MODE === 'true',
    'Cloud-only test — skipped in Local Mode',
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('valid invite code + email/password → account created, redirected to app', async ({ page }) => {
    if (!process.env.E2E_TEST_INVITE_CODE) {
      test.skip(true, 'E2E_TEST_INVITE_CODE not set — configure env var to run registration test');
      return;
    }
    const uniqueEmail = `e2e+${Date.now()}@example.com`;

    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/invite code/i).fill(process.env.E2E_TEST_INVITE_CODE);
    await page.getByLabel(/^password$/i).fill('TestPassword123!');
    await page.getByLabel(/confirm password/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/tasks\//, { timeout: 15_000 });
  });

  test('invalid invite code → error message shown', async ({ page }) => {
    // INVALIDCODE999 passes client-side regex but will fail Supabase validation
    if (!process.env.E2E_TEST_EMAIL) {
      test.skip(true, 'E2E_TEST_EMAIL not set — Supabase required to validate invite code');
      return;
    }
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/invite code/i).fill('INVALIDCODE999');
    await page.getByLabel(/^password$/i).fill('TestPassword123!');
    await page.getByLabel(/confirm password/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /create account/i }).click();

    // Use div[class*="destructive"] to avoid strict-mode violation from input aria classes
    await expect(page.locator('div[class*="destructive"]')).toBeVisible({ timeout: 10_000 });
  });

  test('invite code too short → client-side validation error', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/invite code/i).fill('AB1');
    await page.getByLabel(/^password$/i).fill('TestPassword123!');
    await page.getByLabel(/confirm password/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.locator('div[class*="destructive"]')).toContainText(/6.20 characters/i);
  });

  test('passwords do not match → validation error', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/invite code/i).fill('VALIDCODE01');
    await page.getByLabel(/^password$/i).fill('TestPassword123!');
    await page.getByLabel(/confirm password/i).fill('DifferentPassword!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.locator('div[class*="destructive"]')).toContainText(/do not match/i);
  });

  test('weak password (< 8 chars) → validation error', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/invite code/i).fill('VALIDCODE01');
    await page.getByLabel(/^password$/i).fill('short');
    await page.getByLabel(/confirm password/i).fill('short');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.locator('div[class*="destructive"]')).toContainText(/at least 8 characters/i);
  });

  test('email format validation → browser prevents submit', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('not-an-email');

    // HTML5 validation prevents form submission — input should be invalid
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test('sign in link navigates to login page', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/auth/login');
  });
});
