import { expect, test } from '@playwright/test';

test.describe('customer privacy and real-data boundaries', () => {
  for (const route of ['/ng/atelier', '/ng/account/measurements', '/ng/account/atelier/unknown']) {
    test(route + ' does not show fictional customer data', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.fixture')).toHaveCount(0);
      await expect(page.getByText('NW-BR-0416', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /accept proposal|message the atelier/i })).toHaveCount(0);
    });
  }
  test('private account responses cannot be shared by a cache', async ({ page }) => {
    const response = await page.goto('/ng/account/measurements');
    const cacheControl = response?.headers()['cache-control'] ?? '';
    expect(cacheControl).not.toMatch(/\bpublic\b/);
    expect(cacheControl).toMatch(/no-store|private|no-cache/);
  });
  test('newsletter drafts do not leak into URLs or browser storage', async ({ page }) => {
    await page.goto('/ng/contact');
    const form = page.locator('.footer-newsletter');
    await form.getByLabel('Email address', { exact: true }).fill('privacy@example.test');
    expect(page.url()).not.toContain('privacy@example.test');
    const storage = await page.evaluate(() => JSON.stringify({ local: localStorage, session: sessionStorage, cookies: document.cookie }));
    expect(storage).not.toContain('privacy@example.test');
    await expect(form.locator('form')).not.toHaveAttribute('method', 'get');
  });
});
test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'disclosure only exists below 860px');

  test('the menu opens, navigates, and reports its state', async ({ page }) => {
    await page.goto('/ng');

    const button = page.getByRole('button', { name: /^menu$/i });
    await expect(button).toHaveAttribute('data-ready', 'true');
    await expect(button).toHaveAttribute('aria-expanded', 'false');

    await button.click();
    await expect(page.getByRole('button', { name: /^close$/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await page.getByRole('link', { name: 'Atelier', exact: true }).click();
    await expect(page).toHaveURL(/\/ng\/atelier/);
  });

  test('Escape closes the menu and returns focus to the button', async ({ page }) => {
    await page.goto('/ng');

    const button = page.getByRole('button', { name: /^menu$/i });
    await expect(button).toHaveAttribute('data-ready', 'true');
    await button.click();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('button', { name: /^menu$/i })).toBeFocused();
    await expect(page.getByRole('button', { name: /^menu$/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  test('the market can be switched on a phone', async ({ page }) => {
    await page.goto('/ng');
    const menu = page.getByRole('button', { name: /^menu$/i });
    await expect(menu).toHaveAttribute('data-ready', 'true');
    await menu.click();
    await page.locator('.menu-panel-markets').getByRole('link', { name: /Worldwide/ }).click();
    await expect(page).toHaveURL(/\/international/);
  });
});

test.describe('the menu panel is actually hidden when closed', () => {
  test.skip(({ isMobile }) => !isMobile, 'disclosure only exists below 860px');

  test('its links are not reachable until it is opened', async ({ page }) => {
    await page.goto('/ng');

    // `hidden` alone does not hide an element that sets its own `display`, so assert on
    // visibility rather than on the attribute.
    const account = page.getByRole('link', { name: 'Your account' });
    await expect(account).toBeHidden();

    const menu = page.getByRole('button', { name: /^menu$/i });
    await expect(menu).toHaveAttribute('data-ready', 'true');
    await menu.click();
    await expect(account).toBeVisible();
  });
});
