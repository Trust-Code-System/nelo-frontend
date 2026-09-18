import { expect, test } from '@playwright/test';

/**
 * Acceptance cases from the backend context:
 *   "Keyboard/screen-reader forms, useful loading/error states, and no sensitive data in
 *    logs/analytics/client storage."
 *   "Never put body measurements in URLs, browser persistence, third-party analytics or
 *    public caches."
 *
 * These are the cases most likely to regress silently, because nothing looks wrong when
 * they break.
 */

const INTAKE = '/ng/atelier';
const PROFILE = '/ng/account/measurements';

test.describe('measurements never leak', () => {
  test('typed measurements do not reach the URL', async ({ page }) => {
    await page.goto(INTAKE);
    await page.getByLabel('Bust', { exact: true }).fill('34.25');
    await page.getByLabel('Waist', { exact: true }).fill('28.5');

    expect(page.url()).not.toContain('34.25');
    expect(page.url()).not.toContain('28.5');
    expect(page.url()).not.toContain('bust');
  });

  test('typed measurements do not reach browser storage', async ({ page }) => {
    await page.goto(INTAKE);
    await page.getByLabel('Bust', { exact: true }).fill('34.25');
    await page.getByLabel('Hip', { exact: true }).fill('38.75');

    const stored = await page.evaluate(() => ({
      local: JSON.stringify(window.localStorage),
      session: JSON.stringify(window.sessionStorage),
      cookies: document.cookie,
    }));

    for (const bucket of Object.values(stored)) {
      expect(bucket).not.toContain('34.25');
      expect(bucket).not.toContain('38.75');
      expect(bucket).not.toContain('863');
    }
  });

  test('account pages are not cacheable by a shared cache', async ({ page }) => {
    const response = await page.goto(PROFILE);
    const cacheControl = response?.headers()['cache-control'] ?? '';
    expect(cacheControl).not.toMatch(/\bpublic\b/);
    expect(cacheControl).toMatch(/no-store|private|no-cache/);
  });
});

test.describe('fixture screens are never presented as live', () => {
  for (const path of [INTAKE, PROFILE, '/ng/account/atelier/NW-BR-0416']) {
    test(`${path} carries the fixture banner and cannot submit`, async ({ page }) => {
      await page.goto(path);

      await expect(page.getByText(/no Atelier Shop API exists yet/i)).toBeVisible();

      // Every submit-shaped control is disabled: guessing an operation name is worse than
      // shipping nothing.
      const submits = page.getByRole('button', {
        name: /request a consultation|save profile|message the atelier|accept proposal/i,
      });
      const count = await submits.count();
      for (let index = 0; index < count; index += 1) {
        await expect(submits.nth(index)).toBeDisabled();
      }
    });
  }
});

test.describe('forms are usable by keyboard and screen reader', () => {
  test('every measurement input has a programmatic label', async ({ page }) => {
    await page.goto(INTAKE);

    for (const label of ['Bust', 'Waist', 'Hip', 'Height', 'Shoulder', 'Sleeve', 'Inseam']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
      await expect(page.getByLabel(`${label} unit`)).toBeVisible();
    }
  });

  test('validation messages are associated with their field, not just coloured', async ({
    page,
  }) => {
    await page.goto(INTAKE);
    const bust = page.getByLabel('Bust', { exact: true });

    await bust.fill('nonsense');
    const describedBy = await bust.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toContainText('Enter a number');
    await expect(bust).toHaveAttribute('aria-invalid', 'true');
  });

  test('a measurement field is reachable and editable by keyboard alone', async ({ page }) => {
    await page.goto(INTAKE);

    const bust = page.getByLabel('Bust', { exact: true });
    await bust.focus();
    await expect(bust).toBeFocused();
    await page.keyboard.type('36.5');
    await expect(page.locator('#bust-out')).toContainText('927.10 mm');
  });

  test('the stage track is read-only — no customer control transitions a stage', async ({
    page,
  }) => {
    await page.goto('/ng/account/atelier/NW-BR-0416');

    const track = page.locator('.track-steps').first();
    await expect(track).toBeVisible();
    await expect(track.getByRole('button')).toHaveCount(0);
    await expect(track.getByRole('link')).toHaveCount(0);
  });

  test('the current stage is exposed to assistive technology, not only by colour', async ({
    page,
  }) => {
    await page.goto('/ng/account/atelier/NW-BR-0416');
    await expect(page.locator('.track-steps li[aria-current="step"]').first()).toBeVisible();
  });
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'disclosure only exists below 860px');

  test('the menu opens, navigates, and reports its state', async ({ page }) => {
    await page.goto('/ng');

    const button = page.getByRole('button', { name: /^menu$/i });
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
    await page.getByRole('button', { name: /^menu$/i }).click();
    await page.getByRole('link', { name: /INT/ }).click();
    await expect(page).toHaveURL(/\/international/);
  });
});

test.describe('the menu panel is actually hidden when closed', () => {
  test.skip(({ isMobile }) => !isMobile, 'disclosure only exists below 860px');

  test('its links are not reachable until it is opened', async ({ page }) => {
    await page.goto('/ng');

    // `hidden` alone does not hide an element that sets its own `display`, so assert on
    // visibility rather than on the attribute.
    const measurements = page.getByRole('link', { name: 'Your measurements' });
    await expect(measurements).toBeHidden();

    await page.getByRole('button', { name: /^menu$/i }).click();
    await expect(measurements).toBeVisible();
  });
});
