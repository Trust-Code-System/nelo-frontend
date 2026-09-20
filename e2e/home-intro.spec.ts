import { expect, test } from '@playwright/test';

test.describe('home introduction', () => {
  test('is modal, focused, and brief when it plays', async ({ page }) => {
    await page.goto('/ng?intro=1');

    const intro = page.getByRole('dialog', { name: 'NELO Woman introduction' });
    const skip = page.getByRole('button', { name: 'Skip intro' });
    await expect(intro).toHaveAttribute('aria-modal', 'true');
    await expect(skip).toBeFocused();
    await expect(intro).toBeHidden({ timeout: 3_000 });
  });

  test('does not mount for reduced-motion visitors', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/ng?intro=1');

    await expect(page.getByRole('dialog', { name: 'NELO Woman introduction' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: /linear summer 26/i })).toBeVisible();
  });
});

test.describe('home without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('never covers the storefront with the intro', async ({ page }) => {
    await page.goto('/ng?intro=1');

    await expect(page.getByRole('dialog', { name: 'NELO Woman introduction' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: /linear summer 26/i })).toBeVisible();
  });
});
