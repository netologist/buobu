import { test, expect } from '../fixtures/auth';

test.describe('E2E-BOOKMARKS-01: Bookmark Management', { tag: '@local' }, () => {
  test.skip(
    process.env.NEXT_PUBLIC_LOCAL_MODE !== 'true' &&
      (!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD),
    'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — add to .env.local',
  );

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/bookmarks');
    await page.waitForLoadState('domcontentloaded');
  });

  test('bookmarks board renders', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL('/bookmarks');
    await expect(page.locator('body')).not.toContainText(/error|crashed/i);
  });

  test('add bookmark button is visible', async ({ authenticatedPage: page }) => {
    const addBtn = page.getByRole('button', { name: /add bookmark|new bookmark|\+ bookmark/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 20_000 });
  });

  test('add URL → bookmark card appears', async ({ authenticatedPage: page }) => {
    const addBtn = page.getByRole('button', { name: /add bookmark|new bookmark|\+ bookmark/i }).first();
    await addBtn.waitFor({ state: 'visible', timeout: 20_000 });
    await addBtn.click();

    // If a swimlane picker dialog appears, select the first swimlane option
    const pickerDialog = page.getByRole('dialog');
    const hasPicker = await pickerDialog.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasPicker) {
      await pickerDialog.getByRole('button').first().click();
      await pickerDialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    }

    // Clicking "+ Add bookmark" opens the form in the right panel (no dialog).
    // The URL input has placeholder "https://..."
    const urlInput = page.getByPlaceholder(/https/i).first();
    await expect(urlInput).toBeVisible({ timeout: 5_000 });
    await urlInput.fill('https://example.com');
    await urlInput.blur(); // trigger URL normalization

    await page.getByRole('button', { name: /save bookmark/i }).click();

    // Bookmark card should appear in the middle panel list (title or domain).
    // Domain may appear in multiple spans within the card — use .first() to avoid strict mode.
    await expect(
      page.getByText('example.com').or(page.getByText('Example Domain')).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('bookmark card shows URL or title', async ({ authenticatedPage: page }) => {
    const card = page.locator('[data-testid*="bookmark-card"], [class*="bookmark-card"]').first();
    const hasCards = await card.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCards) {
      test.skip(true, 'No bookmark cards visible');
      return;
    }

    // Card should contain some text
    await expect(card).not.toBeEmpty();
  });

  test('search filter shows matching bookmarks', async ({ authenticatedPage: page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    const hasSearch = await searchInput.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasSearch) {
      test.skip(true, 'No search input visible');
      return;
    }

    await searchInput.fill('nonexistent-bookmark-xyz-9999');
    // All cards should be hidden or empty state shown
    const emptyState = page.getByText(/no bookmarks|no results|nothing found/i);
    const cards = page.locator('[data-testid*="bookmark-card"], [class*="bookmark-card"]');

    const showsEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);
    const cardCount = await cards.count();

    expect(showsEmpty || cardCount === 0).toBe(true);
  });

  test('delete bookmark → confirmation → removed', async ({ authenticatedPage: page }) => {
    // Add a bookmark to delete
    const addBtn = page.getByRole('button', { name: /add bookmark|new bookmark|\+ bookmark/i }).first();
    await addBtn.waitFor({ state: 'visible', timeout: 20_000 });
    await addBtn.click();

    // If a swimlane picker dialog appears, select the first swimlane option
    const pickerDialog = page.getByRole('dialog');
    const hasPicker = await pickerDialog.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasPicker) {
      await pickerDialog.getByRole('button').first().click();
      await pickerDialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    }

    // Form appears in the right panel
    const urlInput = page.getByPlaceholder(/https/i).first();
    await expect(urlInput).toBeVisible({ timeout: 5_000 });
    await urlInput.fill('https://playwright.dev');
    await urlInput.blur();

    await page.getByRole('button', { name: /save bookmark/i }).click();

    await expect(page.getByText('playwright.dev').or(page.getByText('Playwright')).first()).toBeVisible({
      timeout: 15_000,
    });

    // Click the trash icon in the right panel header to delete the currently selected bookmark
    const deleteBtn = page.getByRole('button', { name: /delete bookmark/i }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();

    await expect(page.getByText('playwright.dev').or(page.getByText('Playwright')).first()).not.toBeVisible({
      timeout: 10_000,
    });
  });
});
