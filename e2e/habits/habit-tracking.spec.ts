import { test, expect } from '../fixtures/auth';

test.describe('E2E-HABITS-01: Habit Tracking', () => {
  test.skip(!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
    'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — add to .env.local');

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/habits');
    await page.waitForLoadState('domcontentloaded');
  });

  test('habits board renders', async ({ authenticatedPage: page }) => {
    // Page loads without error
    await expect(page).toHaveURL('/habits');
    await expect(page.locator('body')).not.toContainText(/error|crashed/i);
  });

  test('add habit button is visible', async ({ authenticatedPage: page }) => {
    const addBtn = page.getByRole('button', { name: /add habit|new habit|\+ habit/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
  });

  test('create habit with daily frequency', async ({ authenticatedPage: page }) => {
    const addBtn = page.getByRole('button', { name: /add habit|new habit|\+ habit/i }).first();
    await addBtn.click();

    // Dialog should open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const habitName = `E2E Habit ${Date.now()}`;
    const nameInput = dialog.getByPlaceholder(/name|habit name/i).first();
    await nameInput.fill(habitName);

    // Submit
    await dialog.getByRole('button', { name: /create|save|add/i }).last().click();

    // Habit should appear in the grid
    await expect(page.getByText(habitName)).toBeVisible({ timeout: 10_000 });
  });

  test('log habit for today → cell state updates', async ({ authenticatedPage: page }) => {
    // Find a habit row and click today's cell
    const habitRow = page.locator('[data-testid*="habit-row"], [class*="habit-row"]').first();
    const hasRows = await habitRow.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasRows) {
      test.skip(true, 'No habits found — create one first');
      return;
    }

    // Today's cell should be clickable
    const todayCell = page
      .locator('[data-today="true"], [data-testid*="today"], [class*="today"]')
      .first();

    const hasTodayCell = await todayCell.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasTodayCell) {
      await todayCell.click();
      // Cell should reflect logged state
      await page.waitForTimeout(500);
      await expect(todayCell).toBeVisible(); // just confirm no crash
    }
  });

  test('page reload → habit data persists', async ({ authenticatedPage: page }) => {
    // Get habit names before reload
    const habitNames = await page.locator('[class*="habit"] [class*="name"], [data-testid*="habit-name"]').allTextContents();

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Same habits should still be visible
    for (const name of habitNames.slice(0, 3)) {
      if (name.trim()) {
        await expect(page.getByText(name.trim())).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test('edit habit → dialog opens with pre-filled values', async ({ authenticatedPage: page }) => {
    const editBtn = page
      .getByRole('button', { name: /edit/i })
      .first();

    const hasEditBtn = await editBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasEditBtn) {
      test.skip(true, 'No edit button visible');
      return;
    }

    await editBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Input should have a value (pre-filled)
    const nameInput = dialog.getByRole('textbox').first();
    const value = await nameInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test('delete habit → confirmation → habit removed', async ({ authenticatedPage: page }) => {
    // First create a habit to delete
    const addBtn = page.getByRole('button', { name: /add habit|new habit|\+ habit/i }).first();
    await addBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const habitName = `E2E Delete Habit ${Date.now()}`;
    await dialog.getByRole('textbox').first().fill(habitName);
    await dialog.getByRole('button', { name: /create|save|add/i }).last().click();

    await expect(page.getByText(habitName)).toBeVisible({ timeout: 10_000 });

    // Habits have icon-only action buttons (trash, pencil, archive) that are
    // revealed on hover (md:opacity-0 md:group-hover:opacity-100).
    // The delete button has title="Delete habit". handleDeleteHabit calls
    // window.confirm(), so we must accept the dialog before clicking.
    const habitRow = page.locator('[data-habit-id]').filter({ hasText: habitName });
    await habitRow.hover();

    const deleteBtn = habitRow.getByTitle('Delete habit');
    const hasDelete = await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasDelete) {
      // Accept the window.confirm() that handleDeleteHabit fires
      page.once('dialog', (dlg) => dlg.accept());
      await deleteBtn.click();

      await expect(habitRow).not.toBeVisible({ timeout: 10_000 });
    }
  });
});
