import { expect, test } from '@playwright/test';
import { signInToAtelier } from './atelier-account';

test.describe('real measurement intake', () => {
  test.beforeEach(async ({ page }) => { await signInToAtelier(page); });
  test('decimal input carries one explicit profile unit and preserves a unit change', async ({ page }) => {
    const form = page.getByRole('region', { name: 'Add a measurement profile', exact: true });
    const sleeve = form.getByLabel('Sleeve (in)', { exact: true });
    await sleeve.fill('23.25');
    await form.getByLabel('Measurement unit', { exact: true }).selectOption('centimetre');
    await expect(form.getByLabel('Sleeve (cm)', { exact: true })).toHaveValue('59.055');
    await form.getByLabel('Measurement unit', { exact: true }).selectOption('inch');
    await expect(sleeve).toHaveValue('23.25');
  });
  test('invalid fractions have a programmatically associated error and no override', async ({ page }) => {
    const form = page.getByRole('region', { name: 'Add a measurement profile', exact: true });
    const bust = form.getByLabel('Bust (in)', { exact: true });
    await bust.fill('34¼');
    await expect(bust).toHaveAttribute('aria-invalid', 'true');
    const describedBy = await bust.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`[id="${describedBy}"]`)).toContainText('Enter a number');
    await expect(page.getByRole('button', { name: /override|force|accept anyway/i })).toHaveCount(0);
  });
  test('measurements stay out of URLs and browser persistence', async ({ page }) => {
    const form = page.getByRole('region', { name: 'Add a measurement profile', exact: true });
    await form.getByLabel('Bust (in)', { exact: true }).fill('34.25');
    expect(page.url()).not.toContain('34.25');
    const storage = await page.evaluate(() => JSON.stringify({ local: localStorage, session: sessionStorage, cookies: document.cookie }));
    expect(storage).not.toContain('34.25');
  });
});
