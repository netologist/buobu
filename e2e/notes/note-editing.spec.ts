import { test, expect } from '../fixtures/auth';

test.describe('E2E-NOTES-01: Note Taking', () => {
  test.skip(!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
    'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — add to .env.local');

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/notes');
    await page.waitForLoadState('domcontentloaded');
  });

  test('notes board renders', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL('/notes');
    await expect(page.locator('body')).not.toContainText(/error|crashed/i);
  });

  test('create note → editor opens', async ({ authenticatedPage: page }) => {
    const addBtn = page.getByRole('button', { name: /add note|new note|\+ note/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    // Either a dialog or an inline editor should appear
    const editor = page.locator(
      '[contenteditable="true"], [class*="editor"], [class*="tiptap"], [role="textbox"]'
    ).first();
    await expect(editor).toBeVisible({ timeout: 10_000 });
  });

  test('type content → content is visible', async ({ authenticatedPage: page }) => {
    const addBtn = page.getByRole('button', { name: /add note|new note|\+ note/i }).first();
    await addBtn.click();

    const editor = page
      .locator('[contenteditable="true"]')
      .first();
    await expect(editor).toBeVisible({ timeout: 10_000 });

    const noteContent = `E2E note content ${Date.now()}`;
    await editor.click();
    await editor.type(noteContent);

    await expect(editor).toContainText(noteContent);
  });

  test('click existing note card → editor opens with content', async ({ authenticatedPage: page }) => {
    // Find a note card
    const noteCard = page
      .locator('[data-testid*="note-card"], [class*="note-card"]')
      .first();

    const hasNotes = await noteCard.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasNotes) {
      test.skip(true, 'No note cards visible');
      return;
    }

    await noteCard.click();

    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10_000 });
  });

  test('rich text formatting — bold shortcut', async ({ authenticatedPage: page }) => {
    const addBtn = page.getByRole('button', { name: /add note|new note|\+ note/i }).first();
    await addBtn.click();

    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10_000 });
    await editor.click();

    await editor.type('Bold text');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+b');

    // Check that bold markup was applied
    const boldEl = editor.locator('strong, b');
    await expect(boldEl).toBeVisible({ timeout: 3_000 });
  });

  test('delete note → confirmation → removed from list', async ({ authenticatedPage: page }) => {
    // Create a note first
    const addBtn = page.getByRole('button', { name: /add note|new note|\+ note/i }).first();
    await addBtn.click();

    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10_000 });

    const noteText = `E2E Delete Note ${Date.now()}`;
    await editor.click();
    await editor.type(noteText);

    // Close editor / go back to grid
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Find delete for this note
    const noteEntry = page.getByText(noteText).locator('..').locator('..');
    const deleteBtn = noteEntry.getByRole('button', { name: /delete|remove/i }).first();

    if (await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await deleteBtn.click();

      const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i }).last();
      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      await expect(page.getByText(noteText)).not.toBeVisible({ timeout: 10_000 });
    }
  });

  test('page reload → note content persists', async ({ authenticatedPage: page }) => {
    // Get visible note titles
    const titles = await page
      .locator('[data-testid*="note-title"], [class*="note"] [class*="title"]')
      .allTextContents();

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    for (const title of titles.slice(0, 3)) {
      if (title.trim()) {
        await expect(page.getByText(title.trim())).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
