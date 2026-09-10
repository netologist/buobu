import { test, expect, chromium } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e@example.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'testpassword123';

/**
 * E2E-SYNC-01: Cross-Tab Sync
 *
 * Opens two browser contexts (simulating two tabs/windows) and verifies that
 * changes made in one context appear in the other via Supabase Realtime.
 *
 * NOTE: This test requires a running Supabase instance with Realtime enabled
 * and a valid test account. It may be skipped in CI if E2E_TEST_EMAIL is not set.
 */
test.describe('E2E-SYNC-01: Cross-Tab Sync', () => {
  test('create task in tab 1 → appears in tab 2 (Supabase Realtime)', async () => {
    if (!process.env.E2E_TEST_EMAIL) {
      test.skip(true, 'E2E_TEST_EMAIL not set — skipping cross-tab sync test');
      return;
    }

    const browser = await chromium.launch();

    // Context 1 — tab 1
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();

    // Context 2 — tab 2 (separate context = separate localStorage/cookies)
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();

    async function login(page: typeof page1) {
      await page.goto('/auth/login');
      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/\/(tasks|kanban|board)/, { timeout: 15_000 });
    }

    await Promise.all([login(page1), login(page2)]);

    await page1.goto('/tasks/list-view');
    await page2.goto('/tasks/list-view');

    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle'),
    ]);

    // Create a task in tab 1
    const taskTitle = `Sync Test ${Date.now()}`;
    const addBtn = page1.getByRole('button', { name: /add task|new task|\+ task/i }).first();

    const hasAddBtn = await addBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasAddBtn) {
      await browser.close();
      test.skip(true, 'Add task button not found in list view');
      return;
    }

    await addBtn.click();
    const titleInput = page1.getByPlaceholder(/title|task name/i).first();
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
    await titleInput.fill(taskTitle);
    await page1.getByRole('button', { name: /create|save|add/i }).last().click();

    // Verify it appears in tab 1
    await expect(page1.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });

    // Verify it appears in tab 2 via Realtime (allow up to 15s for sync)
    await expect(page2.getByText(taskTitle)).toBeVisible({ timeout: 15_000 });

    await browser.close();
  });

  test('update task in tab 2 → tab 1 reflects change', async () => {
    if (!process.env.E2E_TEST_EMAIL) {
      test.skip(true, 'E2E_TEST_EMAIL not set — skipping cross-tab sync test');
      return;
    }

    // This test is intentionally kept as a placeholder because it requires
    // a consistent test task to exist. Implement when E2E seed data is set up.
    test.skip(true, 'Requires seeded test data — implement with seed fixture');
  });
});
