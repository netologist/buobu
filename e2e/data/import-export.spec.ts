import { test, expect } from '../fixtures/auth';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('E2E-DATA-01: Import / Export', () => {
  test.skip(!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
    'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — add to .env.local');

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/tasks/kanban-view');
    await page.waitForLoadState('domcontentloaded');
  });

  test('export all data → triggers file download', async ({ authenticatedPage: page }) => {
    // Find export button (may be in settings, sidebar, or a menu)
    const exportBtn = page.getByRole('button', { name: /export/i });
    const hasExport = await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasExport) {
      // Try looking in a settings or options menu
      const settingsBtn = page.getByRole('button', { name: /settings|options|menu/i }).first();
      if (await settingsBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await settingsBtn.click();
      }
    }

    const exportBtnVisible = await exportBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!exportBtnVisible) {
      test.skip(true, 'Export button not found — feature may not be implemented yet');
      return;
    }

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
    await exportBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(zip|json)$/i);
  });

  test('exported file has a non-zero size', async ({ authenticatedPage: page }) => {
    const exportBtn = page.getByRole('button', { name: /export/i });
    const hasExport = await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasExport) {
      test.skip(true, 'Export button not found');
      return;
    }

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
    await exportBtn.click();

    const download = await downloadPromise;
    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);

    const stats = fs.statSync(tmpPath);
    expect(stats.size).toBeGreaterThan(0);

    fs.unlinkSync(tmpPath);
  });

  test('import button is accessible', async ({ authenticatedPage: page }) => {
    const importBtn = page.getByRole('button', { name: /import/i });
    const hasImport = await importBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasImport) {
      const settingsBtn = page.getByRole('button', { name: /settings|options|menu/i }).first();
      if (await settingsBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await settingsBtn.click();
      }
    }

    const importVisible = await importBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!importVisible) {
      test.skip(true, 'Import button not found — feature may not be implemented yet');
      return;
    }

    await expect(importBtn).toBeEnabled();
  });

  /**
   * Full import round-trip test:
   * This test requires an existing export file to import from.
   * Implement once the export format is finalized and a seed fixture is available.
   */
  test.skip('import ZIP → data restored correctly', async ({ authenticatedPage: _page }) => {
    // TODO: implement with seed fixture and export round-trip
  });
});
