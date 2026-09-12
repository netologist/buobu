import { test, expect } from '../fixtures/auth';

async function openNewNote(page: any) {
  const moreBtn = page.locator('button[title*="Actions for"]').first();
  await moreBtn.waitFor({ state: 'visible', timeout: 25_000 });
  await moreBtn.click();
  const addBtn = page.getByRole('button', { name: /add note/i });
  await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await addBtn.click();
}

test.describe('E2E-NOTES-01: Note Taking', { tag: '@local' }, () => {
  test.skip(
    process.env.NEXT_PUBLIC_LOCAL_MODE !== 'true' &&
      (!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD),
    'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — add to .env.local',
  );

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/notes');
    await page.waitForLoadState('domcontentloaded');
  });

  test('notes board renders', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL('/notes');
    await expect(page.locator('body')).not.toContainText(/error|crashed/i);
  });

  test('create note → editor opens', async ({ authenticatedPage: page }) => {
    await openNewNote(page);

    // Either a dialog or an inline editor should appear
    const editor = page.locator(
      '[contenteditable="true"], [class*="editor"], [class*="tiptap"], [role="textbox"]'
    ).first();
    await expect(editor).toBeVisible({ timeout: 10_000 });
  });

  test('type content → content is visible', async ({ authenticatedPage: page }) => {
    await openNewNote(page);

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
    await openNewNote(page);

    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10_000 });
    await editor.click();

    await editor.type('Bold text');
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+a' : 'Control+a');
    await page.keyboard.press(isMac ? 'Meta+b' : 'Control+b');

    // Check that bold markup was applied
    const boldEl = editor.locator('strong, b');
    await expect(boldEl).toBeVisible({ timeout: 5_000 });
  });

  test('delete note → confirmation → removed from list', async ({ authenticatedPage: page }) => {
    // Create a note first
    await openNewNote(page);

    const titleInput = page.getByPlaceholder('Note title...');
    await expect(titleInput).toBeVisible({ timeout: 10_000 });

    const noteTitle = `E2E Delete Note ${Date.now()}`;
    await titleInput.fill(noteTitle);

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.type('Note body to delete');

    // Click save in NoteEditor header
    const saveBtn = page.getByTitle('Save');
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();

    // Now that note is saved, Delete button appears in the NoteEditor header
    const deleteBtn = page.getByTitle('Delete');
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });

    // NoteEditor uses window.confirm("Delete this note?")
    page.once('dialog', (dlg) => dlg.accept());
    await deleteBtn.click();

    await expect(page.getByText(noteTitle)).not.toBeVisible({ timeout: 10_000 });
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
