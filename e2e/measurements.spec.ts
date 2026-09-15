import { expect, test, type Page } from '@playwright/test';

/** The output element is found via aria-describedby, because a field's id is its canonical
 *  measurement code (sleeveLength), not its visible label (Sleeve). */
async function outputFor(page: Page, label: string) {
  const field = page.getByLabel(label, { exact: true });
  const describedBy = await field.getAttribute('aria-describedby');
  return page.locator(`#${describedBy}`);
}

/**
 * Acceptance case from the backend context:
 *   "Fractional measurement input preserves canonical precision, rejected ranges do not
 *    gain customer overrides, and unconfirmed snapshots are explicit."
 *
 * The unit tests cover the arithmetic. These cover the journey — that the precision
 * actually survives the round trip through the form a customer uses.
 */

const INTAKE = '/ng/atelier';
const PROFILE = '/ng/account/measurements';

test.describe('measurement precision', () => {
  test('a quarter inch reaches the customer as 6.35 mm, not 6', async ({ page }) => {
    await page.goto(INTAKE);

    await page.getByLabel('Bust', { exact: true }).fill('0.25');
    await expect(page.locator('#bust-out')).toContainText('6.35 mm');
    await expect(page.locator('#bust-out')).not.toContainText('6.00 mm');
  });

  test('eighth and quarter inches convert without drift', async ({ page }) => {
    await page.goto(INTAKE);

    const cases: [string, string, string][] = [
      ['Bust', '34', '863.60 mm'],
      ['Waist', '28', '711.20 mm'],
      ['Sleeve', '23.25', '590.55 mm'],
      ['Shoulder', '15.50', '393.70 mm'],
    ];

    for (const [label, typed] of cases) {
      await page.getByLabel(label, { exact: true }).fill(typed);
    }
    for (const [label, , expected] of cases) {
      const id = await page.getByLabel(label, { exact: true }).getAttribute('id');
      await expect(page.locator(`#${id}-out`)).toContainText(expected);
    }
  });

  test('changing the display unit does not rewrite what was typed', async ({ page }) => {
    await page.goto(INTAKE);

    const bust = page.getByLabel('Bust', { exact: true });
    await bust.fill('34');
    await expect(page.locator('#bust-out')).toContainText('863.60 mm');

    await page.getByLabel('Bust unit').selectOption('centimetre');

    // The typed value is the customer's; only its interpretation changed.
    await expect(bust).toHaveValue('34');
    await expect(page.locator('#bust-out')).toContainText('340.00 mm');
  });

  test('a decimal string is required — fraction glyphs are refused, not guessed at', async ({
    page,
  }) => {
    await page.goto(INTAKE);

    await page.getByLabel('Waist', { exact: true }).fill('23¼');
    await expect(page.locator('#waist-out')).toContainText('Enter a number');
    await expect(page.getByLabel('Waist', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});

test.describe('range rejection', () => {
  test('an out-of-range value is flagged but NOT clamped', async ({ page }) => {
    await page.goto(INTAKE);

    const height = page.getByLabel('Height', { exact: true });
    await height.fill('12');

    await expect(page.locator('#height-out')).toContainText('outside the range');
    // The customer's value survives — the frontend has no authority to overwrite it.
    await expect(height).toHaveValue('12');
    // And it still reports the millimetres it would be, rather than hiding them.
    await expect(page.locator('#height-out')).toContainText('304.80 mm');
  });

  test('the form offers correction or review, never a silent override', async ({ page }) => {
    await page.goto(INTAKE);
    await page.getByLabel('Hip', { exact: true }).fill('400');

    const out = page.locator('#hip-out');
    await expect(out).toContainText('Check it, or send it to the atelier to review');
    // No control exists to force an out-of-range value through.
    await expect(page.getByRole('button', { name: /override|force|accept anyway/i })).toHaveCount(
      0,
    );
  });
});

test.describe('unconfirmed values are explicit', () => {
  test('an unset measurement reads "Not confirmed", never zero', async ({ page }) => {
    await page.goto(PROFILE);

    const selfMeasured = page.locator('article.garment').filter({ hasText: 'Self-measured' });
    await expect(selfMeasured).toContainText('Not confirmed');
    await expect(selfMeasured).not.toContainText('0.00 mm');
  });

  test('a profile says how many of the seven are confirmed, and by whom', async ({ page }) => {
    await page.goto(PROFILE);

    await expect(page.locator('article.garment').first()).toContainText('6 of 7 confirmed');
    await expect(
      page.locator('article.garment').filter({ hasText: 'Self-measured' }),
    ).toContainText('not yet confirmed by the atelier');
  });

  test('stored millimetres round-trip back into inches for editing', async ({ page }) => {
    await page.goto(PROFILE);

    // 863.60 mm was stored; it must prefill as 34.00 in and convert straight back.
    await expect(page.getByLabel('Bust', { exact: true })).toHaveValue('34.00');
    await expect(page.locator('#bust-out')).toContainText('863.60 mm');
    await expect(page.getByLabel('Sleeve', { exact: true })).toHaveValue('23.25');
    await expect(await outputFor(page, 'Sleeve')).toContainText('590.55 mm');
  });
});
