import { expect, test } from '@playwright/test';
import { signInToAtelier } from './atelier-account';

// Real Shop API journeys. Use a dedicated verified test customer on staging.
test.describe('live Atelier integration', () => {
  test.beforeEach(async ({ page }) => { await signInToAtelier(page); });

  test('a measurement profile persists, survives an unchanged edit, and can be deleted', async ({ page }, testInfo) => {
    const name = `E2E fit ${testInfo.project.name} ${Date.now()}`;
    const form = page.getByRole('region', { name: 'Add a measurement profile', exact: true });
    await form.getByLabel('Name this profile', { exact: true }).fill(name);
    await form.getByLabel('Use as my default profile').uncheck();
    await form.getByLabel('Bust (in)', { exact: true }).fill('34.25');
    await form.getByLabel('Sleeve (in)', { exact: true }).fill('23.25');
    await form.getByRole('button', { name: 'Save profile', exact: true }).click();
    const saved = page.locator('article.garment').filter({ has: page.getByRole('heading', { name, exact: true }) });
    try {
      await expect(saved).toContainText('869.95 mm', { timeout: 15_000 });
      await page.reload();
      await expect(saved).toContainText('590.55 mm');
      await saved.getByText('Edit profile', { exact: true }).click();
      await expect(saved.getByLabel('Bust (in)', { exact: true })).toHaveValue('34.25');
      await saved.getByRole('button', { name: 'Save profile', exact: true }).click();
      await expect(saved.getByRole('status')).toContainText('is saved', { timeout: 15_000 });
      await page.reload();
      await expect(saved).toContainText('869.95 mm');
    } finally {
      if (await saved.count()) {
        await saved.getByText('Delete this profile', { exact: true }).click();
        await saved.getByRole('button', { name: 'Delete profile', exact: true }).click();
        await expect(saved).toHaveCount(0, { timeout: 15_000 });
      }
    }
  });

  test('a consultation request persists with Lagos time and can be cancelled', async ({ page }, testInfo) => {
    const date = new Date(Date.now() + 17 * 86_400_000).toISOString().slice(0, 10);
    const time = testInfo.project.name === 'mobile' ? '15:30' : '14:30';
    const dateLabel = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Lagos' }).format(new Date(`${date}T12:00:00+01:00`));
    await page.goto('/ng/atelier?context=bridal');
    await page.getByLabel('Preferred date', { exact: true }).fill(date);
    await page.getByLabel('Preferred time (Lagos, UTC+1)', { exact: true }).fill(time);
    await page.getByLabel('Anything else', { exact: true }).fill(`Frontend staging verification ${testInfo.project.name}`);
    await page.getByRole('button', { name: 'Request a consultation', exact: true }).click();
    // No automatic retry: a lost response could have created a request already.
    await expect(page.getByRole('status').filter({ hasText: 'Your request has reached' })).toBeVisible({ timeout: 15_000 });
    await page.goto('/ng/account/atelier');
    const requested = page.locator('.atelier-appointments > li').filter({ hasText: 'Awaiting confirmation' }).filter({ hasText: dateLabel }).filter({ hasText: time }).first();
    await expect(requested).toBeVisible();
    await requested.getByText('Cancel this appointment', { exact: true }).click();
    await requested.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
    await expect(requested).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator('.atelier-appointments > li').filter({ hasText: 'Cancelled' }).filter({ hasText: dateLabel }).filter({ hasText: time }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('the seeded demo commission publishes real progress and confirmed measurements', async ({ page }) => {
    const reference = demoSetting('E2E_COMMISSION_REFERENCE');
    await page.goto(`/ng/account/atelier/${encodeURIComponent(reference)}`);
    await expect(page.locator('main')).toContainText(reference);
    expect(await page.locator('.track-steps [aria-current="step"]').count()).toBeGreaterThan(1);
    await expect(page.getByRole('heading', { name: 'Confirmed measurements', exact: true })).toBeVisible();
    await expect(page.locator('.snap-grid dd').first()).toContainText('mm');
    await expect(page.locator('.fixture')).toHaveCount(0);
  });

  test('the seeded fulfilled order publishes a courier tracking number', async ({ page }) => {
    const code = demoSetting('E2E_FULFILLED_ORDER_CODE');
    const tracking = demoSetting('E2E_TRACKING_CODE');
    await page.goto(`/ng/account/orders/${encodeURIComponent(code)}`);
    await expect(page.locator('.shipment')).toContainText(tracking);
    await expect(page.locator('.shipment')).toContainText(/Shipped|Delivered/);
  });
});

function demoSetting(name: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.E2E_REQUIRE_BACKEND === '1') throw new Error(`The staging gate requires ${name} for the verified demo customer.`);
  test.skip(true, `Requires the seeded staging demo record in ${name}.`);
  return '';
}
