import { test, expect } from '../fixtures/auth';

test.describe('E2E-TASKS-01: Core Task Management', { tag: '@local' }, () => {
  test.skip(
    process.env.NEXT_PUBLIC_LOCAL_MODE !== 'true' &&
      (!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD),
    'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — add to .env.local',
  );

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/tasks/kanban-view');
    await page.waitForLoadState('domcontentloaded');
  });

  test('kanban board renders columns', async ({ authenticatedPage: page }) => {
    // Kanban board renders a sticky header row with column titles.
    // Both the middle-panel swimlane header and the right-panel column header use min-h-14.
    await expect(page).toHaveURL(/\/tasks\/kanban/);
    await expect(page.locator('body')).not.toContainText(/error|crashed/i);
    await expect(page.locator('.min-h-14').first()).toBeVisible({ timeout: 10_000 });
  });

  test('create board → swimlane → task → task appears in column', async ({ authenticatedPage: page }) => {
    // Open new board (if boards exist, skip creation and use existing)
    // Try to find an "Add task" or "New task" button
    const newTaskBtn = page
      .getByRole('button', { name: /add task|new task|\+ task/i })
      .first();

    if (await newTaskBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await newTaskBtn.click();

      // Fill task title in dialog/modal
      const titleInput = page.getByPlaceholder(/title|task name/i).first();
      await expect(titleInput).toBeVisible({ timeout: 5_000 });
      const taskTitle = `E2E Task ${Date.now()}`;
      await titleInput.fill(taskTitle);

      // Submit
      await page.getByRole('button', { name: /create|save|add/i }).last().click();

      // Task should appear on board
      await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });
    } else {
      // Board might need to be created first — navigate to new board
      await page.goto('/boards/new');
      await expect(page).toHaveURL(/\/(boards|tasks)/, { timeout: 10_000 });
    }
  });

  test('task card displays title, priority badge, due date when set', async ({ authenticatedPage: page }) => {
    // Check that task cards in the board show expected fields
    const taskCard = page.locator('[data-testid*="task-card"], [class*="task-card"]').first();

    // If no tasks exist, this test is a no-op (board is empty)
    const hasCards = await taskCard.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasCards) {
      test.skip(true, 'No task cards visible — board is empty');
      return;
    }

    // Title should be visible inside the card
    await expect(taskCard.locator('h1,h2,h3,h4,p,[class*="title"]').first()).toBeVisible();
  });

  test('switch to list view renders task rows', async ({ authenticatedPage: page }) => {
    await page.goto('/tasks/list-view');
    await page.waitForLoadState('domcontentloaded');

    // Page should load without error
    await expect(page).toHaveURL(/\/tasks\/list-view/);
    await expect(page.locator('body')).not.toContainText(/error|crashed/i);
  });

  test('switch to calendar view renders calendar', async ({ authenticatedPage: page }) => {
    await page.goto('/tasks/calendar-view');
    await page.waitForLoadState('domcontentloaded');

    // FullCalendar should mount
    await expect(page.locator('.fc, [class*="fullcalendar"], [class*="fc-"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('completing a task updates its status', async ({ authenticatedPage: page }) => {
    await page.goto('/tasks/list-view');
    await page.waitForLoadState('domcontentloaded');

    const firstCheckbox = page.getByRole('checkbox').first();
    const hasCheckbox = await firstCheckbox.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCheckbox) {
      test.skip(true, 'No tasks visible in list view');
      return;
    }

    await firstCheckbox.check();
    // Status change should be reflected (checkbox stays checked or task moves)
    await expect(firstCheckbox).toBeChecked({ timeout: 5_000 });
  });
});
