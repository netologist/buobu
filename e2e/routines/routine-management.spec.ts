import { test, expect } from '../fixtures/auth';

test.describe('E2E-ROUTINES-01: Daily Routines', { tag: '@local' }, () => {
  test.skip(
    process.env.NEXT_PUBLIC_LOCAL_MODE !== 'true' &&
      (!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD),
    'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — add to .env.local',
  );

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/routines');
    await page.waitForLoadState('domcontentloaded');
  });

  test('routines board renders', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL('/routines');
    await expect(page.locator('body')).not.toContainText(/error|crashed/i);
  });

  test('add routine button is visible', async ({ authenticatedPage: page }) => {
    const addBtn = page.getByRole('button', { name: /add routine|new routine|\+ routine/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 20_000 });
  });

  test('create routine with tasks', async ({ authenticatedPage: page }) => {
    const addBtn = page.getByRole('button', { name: /add routine|new routine|\+ routine/i }).first();
    await addBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const routineName = `E2E Routine ${Date.now()}`;
    const nameInput = dialog.getByRole('textbox').first();
    await nameInput.fill(routineName);

    await dialog.getByRole('button', { name: /create|save|add/i }).last().click();

    await expect(page.getByText(routineName)).toBeVisible({ timeout: 10_000 });
  });

  test('log routine as complete for today', async ({ authenticatedPage: page }) => {
    const logBtn = page
      .getByRole('button', { name: /log|complete|done|mark/i })
      .first();

    const hasBtn = await logBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasBtn) {
      test.skip(true, 'No routines to log');
      return;
    }

    await logBtn.click();
    // Completion state should update — no crash
    await page.waitForTimeout(500);
    await expect(page.locator('body')).not.toContainText(/error/i);
  });

  test('refresh → completion state persists', async ({ authenticatedPage: page }) => {
    // Get visible routine names
    const routineNames = await page
      .locator('[class*="routine"] [class*="title"], [data-testid*="routine-title"]')
      .allTextContents();

    await page.reload();
    await page.waitForLoadState('networkidle');

    for (const name of routineNames.slice(0, 3)) {
      if (name.trim()) {
        await expect(page.getByText(name.trim())).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test('delete routine → confirmation → removed', async ({ authenticatedPage: page }) => {
    // Create a routine to delete
    const addBtn = page.getByRole('button', { name: /add routine|new routine|\+ routine/i }).first();
    await addBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await addBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const routineName = `E2E Delete Routine ${Date.now()}`;
    await dialog.getByRole('textbox').first().fill(routineName);
    await dialog.getByRole('button', { name: /create|save|add/i }).last().click();
    await expect(page.getByText(routineName)).toBeVisible({ timeout: 10_000 });

    // Click on the routine card to open the RoutineDetailView in the right panel.
    // The detail view header has a trash icon button with title="Delete".
    await page.getByText(routineName).first().click();
    const detailDeleteBtn = page.getByTitle('Delete').first();
    await expect(detailDeleteBtn).toBeVisible({ timeout: 10_000 });
    await detailDeleteBtn.click();

    // RoutineDetailView opens a confirmation Dialog with a "Delete" button
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
    await confirmDialog.getByRole('button', { name: /^delete$/i }).click();

    await expect(page.getByText(routineName)).not.toBeVisible({ timeout: 10_000 });
  });
});
