import { expect, test } from '@playwright/test';

// UI contract tests only. The local double validates every document against the SDL.
test.beforeEach(async ({ context }, testInfo) => {
  await context.addCookies([{ name: 'nelo_vendure_session', value: `ui-${testInfo.project.name}-${testInfo.title.replace(/\W/g, '-')}`, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
});

test('booking posts a request with Lagos time and appears in the account', async ({ page }) => {
  await page.goto('/ng/atelier?context=bridal');
  await expect(page.locator('.fixture')).toHaveCount(0);
  await page.getByLabel('Preferred date', { exact: true }).fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  await page.getByLabel('Preferred time (Lagos, UTC+1)', { exact: true }).fill('14:30');
  await page.getByLabel('Anything else', { exact: true }).fill('Ivory silk');
  await page.getByRole('button', { name: 'Request a consultation', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Your request has reached' })).toBeVisible();
  expect(page.url()).not.toContain('Ivory');
  await page.goto('/ng/account/atelier');
  await expect(page.getByText('Awaiting confirmation', { exact: true })).toBeVisible();
  await expect(page.getByText(/14:30.*Lagos/).last()).toBeVisible();
});

test('measurement editing preserves precision and keeps values out of URLs and storage', async ({ page }) => {
  await page.goto('/ng/account/measurements');
  await page.getByText('Edit profile', { exact: true }).click();
  const edit = page.locator('article.garment').first();
  await expect(edit.getByLabel('Bust (in)', { exact: true })).toHaveValue('34.000394');
  await edit.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(edit.getByText('863.61 mm', { exact: true })).toBeVisible();
  const form = page.getByRole('region', { name: 'Add a measurement profile', exact: true });
  await form.getByLabel('Name this profile', { exact: true }).fill('New precise fit');
  await form.getByLabel('Bust (in)', { exact: true }).fill('34.25');
  await form.getByLabel('Sleeve (in)', { exact: true }).fill('23.25');
  await form.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: /New precise fit/ })).toBeVisible();
  await expect(page.getByText('590.55 mm', { exact: true })).toBeVisible();
  expect(page.url()).not.toContain('34.25');
  const storage = await page.evaluate(() => JSON.stringify({ local: window.localStorage, session: window.sessionStorage, cookies: document.cookie }));
  expect(storage).not.toContain('34.25'); expect(storage).not.toContain('23.25');
});

test('commission progress, snapshots and allowed cancellation use the published fields', async ({ page }) => {
  await page.goto('/ng/account/atelier/UI-BRIDAL-001');
  await expect(page.getByRole('heading', { name: 'Ceremony gown' })).toBeVisible();
  await expect(page.locator('.track-steps [aria-current="step"]').filter({ hasText: 'Awaiting materials' })).toBeVisible();
  await expect(page.getByText('863.61 mm', { exact: true })).toBeVisible();
  await expect(page.locator('.track-steps [aria-current="step"]')).toHaveCount(3);
  await expect(page.locator('.track-steps button')).toHaveCount(0);
  await page.getByText('Cancel this appointment', { exact: true }).click();
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
});

test('shipment state, tracking number and shipment quantities are displayed', async ({ page }) => {
  await page.goto('/ng/account/orders/UI-ORDER');
  await expect(page.getByText('UI-COURIER-123', { exact: true })).toBeVisible();
  await expect(page.locator('.shipment')).toContainText('Shipped');
  await expect(page.locator('.shipment')).toContainText('UI Adele × 1');
});

test('search and collection links use the same Shop API catalogue', async ({ page }) => {
  await page.goto('/ng/search?q=Adele');
  await expect(page.locator('.nelo-product-card')).toHaveCount(1);
  await page.locator('.nelo-product-card a').click();
  await expect(page.getByRole('heading', { name: 'UI Adele', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Add to bag/ })).toBeVisible();
  await page.goto('/ng/collections');
  await expect(page.locator('.collection-story a')).toHaveAttribute('href', '/ng/collections/ready-to-wear');
});

test('commission-only pieces show consultation in cards and product detail', async ({ page }) => {
  await page.goto('/ng/search?q=Ceremony');
  const card = page.locator('.nelo-product-card');
  await expect(card).toContainText('By consultation');
  await expect(card).not.toContainText('₦');
  await card.getByRole('link').click();
  await expect(page.getByRole('button', { name: /^Add to bag/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'Request a consultation', exact: true }).click();
  await expect(page).toHaveURL(/context=bridal/);
  await expect(page.locator('input[name="context"][value="bridal"]')).toBeChecked();
});

test('newsletter posts privately and never claims an unsaved subscription', async ({ page }) => {
  await page.goto('/ng/contact');
  const newsletter = page.locator('.footer-newsletter');
  await newsletter.getByLabel('Email address', { exact: true }).fill('private@example.test');
  const request = page.waitForRequest(value => value.method() === 'POST' && value.url().endsWith('/ng/contact'));
  await newsletter.getByRole('button', { name: 'Join the list' }).click();
  expect((await request).url()).not.toContain('private');
  await expect(newsletter.getByRole('alert')).toContainText('has not been subscribed');
  expect(page.url()).not.toContain('private');
});

test('guests see sign-in without fixture data', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/ng/atelier?context=bridal');
  await expect(page.getByRole('heading', { name: 'Sign in to request your consultation or fitting.' })).toBeVisible();
  await expect(page.locator('.fixture')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Request a consultation', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sign in', exact: true }).last()).toHaveAttribute('href', /next=.*context%3Dbridal/);
});

test('changed pages stay within the viewport at supported widths', async ({ page }, testInfo) => {
  for (const width of testInfo.project.name === 'mobile' ? [320, 393, 768] : [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/ng/atelier', '/ng/account/measurements', '/ng/account/atelier/UI-BRIDAL-001', '/ng/account/orders/UI-ORDER', '/ng/collections']) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} at ${width}px`).toBeLessThanOrEqual(1);
      if (width === 393 && route.includes('/account/atelier/')) await page.screenshot({ path: testInfo.outputPath('commission-mobile.png'), fullPage: true, caret: 'initial' });
      if (width === 1440 && route === '/ng/account/measurements') await page.screenshot({ path: testInfo.outputPath('measurements-desktop.png'), fullPage: true, caret: 'initial' });
    }
  }
});

test('an uncertain booking blocks resubmission and links to the saved request', async ({ page }) => {
  await page.goto('/ng/atelier');
  await page.getByLabel('Preferred date', { exact: true }).fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  await page.getByLabel('Preferred time (Lagos, UTC+1)', { exact: true }).fill('14:30');
  await page.getByLabel('Anything else', { exact: true }).fill('UI lost response');
  await page.getByRole('button', { name: 'Request a consultation', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Request an atelier appointment' }).getByRole('alert')).toContainText('could not confirm');
  await expect(page.getByRole('button', { name: 'Request a consultation', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Check your appointments and commissions', exact: true }).click();
  await expect(page.getByText('Awaiting confirmation', { exact: true })).toHaveCount(1);
});
