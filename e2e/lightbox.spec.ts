import { test, expect } from '@playwright/test';

test.describe('PhotoLightbox — keyboard & focus (dev harness)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/lightbox-demo');
    // Wait until the demo grid is rendered
    await expect(page.getByRole('heading', { name: /lightbox demo/i })).toBeVisible();
  });

  test('opens on click, focus lands on the image, closes on Escape and returns focus to the thumbnail', async ({ page }) => {
    const firstThumb = page.getByRole('button', { name: 'Alpha' });
    await firstThumb.focus();
    await firstThumb.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Focus moves to the image (tabindex=0) via onOpenAutoFocus
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).toBe('IMG');

    // Live region announces the current photo
    const live = dialog.locator('[role="status"][aria-live="polite"]');
    await expect(live).toContainText(/Alpha/);

    // Escape closes the dialog
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Focus returns to the originating thumbnail (Radix Dialog behavior)
    const returned = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(returned).toBe('Alpha');
  });

  test('ArrowRight / ArrowLeft navigate and update the live region', async ({ page }) => {
    await page.getByRole('button', { name: 'Alpha' }).click();
    const dialog = page.getByRole('dialog');
    const live = dialog.locator('[role="status"][aria-live="polite"]');
    await expect(live).toContainText(/Alpha/);

    await page.keyboard.press('ArrowRight');
    // Second photo has no title, live region falls back to "Photo 2 of 4"
    await expect(live).toContainText(/2\s*(of|\/)\s*4/i);

    await page.keyboard.press('ArrowRight');
    await expect(live).toContainText(/Gamma/);

    await page.keyboard.press('ArrowLeft');
    await expect(live).toContainText(/2\s*(of|\/)\s*4/i);
  });

  test('+ / − / 0 change and reset zoom', async ({ page }) => {
    await page.getByRole('button', { name: 'Alpha' }).click();
    const dialog = page.getByRole('dialog');
    const zoomReadout = dialog.locator('[aria-label="Zoom level"]');

    await expect(zoomReadout).toHaveText('100%');

    await page.keyboard.press('+');
    await expect(zoomReadout).toHaveText('150%');

    await page.keyboard.press('+');
    await expect(zoomReadout).toHaveText('200%');

    await page.keyboard.press('-');
    await expect(zoomReadout).toHaveText('150%');

    await page.keyboard.press('0');
    await expect(zoomReadout).toHaveText('100%');
  });

  test('Tab cycles through toolbar buttons without escaping the dialog (focus trap)', async ({ page }) => {
    await page.getByRole('button', { name: 'Alpha' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Tab a bunch and ensure focus never leaves the dialog
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        return !!dlg && dlg.contains(document.activeElement);
      });
      expect(inside).toBe(true);
    }
  });
});
