import { expect, test, type Page } from '@playwright/test';
import { catalogueIsLive, NO_CATALOGUE } from './backend';
import { mailboxIsAvailable, NO_MAILBOX, tokenFromEmail, waitForEmail } from './mailbox';

/**
 * Acceptance case from the backend context:
 *   "Fractional measurement input preserves canonical precision, rejected ranges do not
 *    gain customer overrides, and unconfirmed snapshots are explicit."
 *
 * The unit tests cover the arithmetic. These cover the journey - that the precision actually
 * survives the round trip through the form a customer uses.
 *
 * Every Atelier operation is signed-in only, so - unlike the old fixture page - these fields
 * are not reachable at all without an account. The precision-preview assertions therefore run
 * inside the signed-in round trip, alongside the harness guards `account.spec.ts` already
 * established for a journey that needs a reachable Vendure and the development mailbox.
 */

const PASSWORD = 'correct-horse-battery-staple';

function freshEmail(): string {
  return `nelo.e2e.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** The output element is found via aria-describedby, because a field's id is scoped per form
 *  instance (useId), not a fixed string like `bust-out`. */
async function outputFor(page: Page, label: string) {
  const field = page.getByLabel(label, { exact: true });
  const describedBy = await field.getAttribute('aria-describedby');
  return page.locator(`#${describedBy}`);
}

async function registerAndVerify(page: Page, first: string, last: string): Promise<string> {
  const email = freshEmail();
  await page.goto('/ng/account/register');
  await page.getByLabel('First name').fill(first);
  await page.getByLabel('Last name').fill(last);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page.getByText(/check your email/i)).toBeVisible();

  const verification = await waitForEmail(email, { subjectMatches: /verify/i });
  const token = verification ? tokenFromEmail(verification) : null;
  expect(token, 'no token in the verification email').not.toBeNull();
  await page.goto(`/ng/account/verify?token=${encodeURIComponent(token ?? '')}`);
  await page.getByRole('button', { name: /verify and sign in/i }).click();
  await expect(page).toHaveURL(/\/ng\/account$/);
  return email;
}

/** The "Add a profile" disclosure is open by default only while the customer has none yet -
 *  true for every fresh registration this file does, but checked rather than assumed. */
async function openAddProfileForm(page: Page) {
  await page.goto('/ng/account/measurements');
  const addForm = page.locator('details.addr-add');
  if (!(await addForm.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await addForm.locator('summary').click();
  }
}

test.describe('measurements, without a backend', () => {
  test('a guest never sees measurement fields', async ({ page }) => {
    // Without a backend the page cannot distinguish "no customer" from "unreachable" - the
    // definitive sign-in redirect is asserted in the round trip below, where Vendure can
    // actually answer "no customer". This only proves a guest is never shown the form itself.
    test.skip(await catalogueIsLive(), 'this asserts the no-backend-agnostic signed-out shape');
    await page.goto('/ng/account/measurements');
    await expect(page.getByLabel('Bust', { exact: true })).toHaveCount(0);
  });
});

test.describe('measurement round trip', () => {
  // Serial: each journey registers a customer against the harness's SQLite database and reads
  // the shared development mailbox, exactly like account.spec.ts's round trip.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async () => {
    test.skip(!(await catalogueIsLive()), NO_CATALOGUE);
    test.skip(!mailboxIsAvailable(), NO_MAILBOX);
  });
  test.slow();

  test('a guest is sent to sign in, not shown the form', async ({ page }) => {
    await page.goto('/ng/account/measurements');
    await expect(page.getByRole('link', { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByLabel('Bust', { exact: true })).toHaveCount(0);
  });

  test('a quarter inch reaches the customer as 6.35 mm, not 6', async ({ page }) => {
    await registerAndVerify(page, 'Amara', 'Nwosu');
    await openAddProfileForm(page);

    await page.getByLabel('Bust', { exact: true }).fill('0.25');
    await expect(await outputFor(page, 'Bust')).toContainText('6.35 mm');
    await expect(await outputFor(page, 'Bust')).not.toContainText('6.00 mm');
  });

  test('eighth and quarter inches convert without drift', async ({ page }) => {
    await registerAndVerify(page, 'Bimpe', 'Alade');
    await openAddProfileForm(page);

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
      await expect(await outputFor(page, label)).toContainText(expected);
    }
  });

  test('changing the display unit does not rewrite what was typed', async ({ page }) => {
    await registerAndVerify(page, 'Chiamaka', 'Bello');
    await openAddProfileForm(page);

    const bust = page.getByLabel('Bust', { exact: true });
    await bust.fill('34');
    await expect(await outputFor(page, 'Bust')).toContainText('863.60 mm');

    await page.locator('details.addr-add').getByLabel('Unit').selectOption('centimetre');

    // The typed value is the customer's; only its interpretation changed.
    await expect(bust).toHaveValue('34');
    await expect(await outputFor(page, 'Bust')).toContainText('340.00 mm');
  });

  test('a decimal string is required - fraction glyphs are refused, not guessed at', async ({
    page,
  }) => {
    await registerAndVerify(page, 'Funke', 'Adeyemi');
    await openAddProfileForm(page);

    await page.getByLabel('Waist', { exact: true }).fill('23¼');
    await expect(await outputFor(page, 'Waist')).toContainText('Enter a number');
    await expect(page.getByLabel('Waist', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  });

  test('an out-of-range value is flagged but NOT clamped', async ({ page }) => {
    await registerAndVerify(page, 'Ijeoma', 'Chukwu');
    await openAddProfileForm(page);

    const height = page.getByLabel('Height', { exact: true });
    await height.fill('12');

    await expect(await outputFor(page, 'Height')).toContainText('outside the range');
    // The customer's value survives - the frontend has no authority to overwrite it.
    await expect(height).toHaveValue('12');
    // And it still reports the millimetres it would be, rather than hiding them.
    await expect(await outputFor(page, 'Height')).toContainText('304.80 mm');
  });

  test('the form offers correction or review, never a silent override', async ({ page }) => {
    await registerAndVerify(page, 'Kemi', 'Fashola');
    await openAddProfileForm(page);
    await page.getByLabel('Hip', { exact: true }).fill('400');

    const out = await outputFor(page, 'Hip');
    await expect(out).toContainText('Check it, or send it to the atelier to review');
    await expect(
      page.getByRole('button', { name: /override|force|accept anyway/i }),
    ).toHaveCount(0);
  });

  test('a profile in inches reaches the backend as canonical millimetres, and a second profile in centimetres becomes the only default', async ({
    page,
  }) => {
    await registerAndVerify(page, 'Zainab', 'Suleiman');
    await page.goto('/ng/account/measurements');

    // --- first profile: inches, made the default. A brand new customer has no profiles yet,
    // so the "Add a profile" disclosure is already open - no click needed to reveal it.
    const addForm = page.locator('details.addr-add');
    await addForm.getByLabel('Name this profile').fill('My measurements');
    await addForm.getByLabel('Bust', { exact: true }).fill('34');
    await addForm.getByLabel(/use this profile by default/i).check();
    await addForm.getByRole('button', { name: /save profile/i }).click();
    await expect(page.getByText('Profile saved.')).toBeVisible();

    await page.reload();
    const firstCard = page.locator('article.garment').filter({ hasText: 'My measurements' });
    // 34 inches is stored and returned as exactly 863.60 mm - the acceptance figure.
    await expect(firstCard).toContainText('863.60 mm');
    await expect(firstCard.locator('.pill', { hasText: 'Default' })).toBeVisible();

    // --- second profile: centimetres, also made the default. Now that a profile exists the
    // disclosure defaults to closed, so it needs an explicit open.
    await addForm.locator('summary').click();
    await addForm.getByLabel('Name this profile').fill('Second profile');
    await addForm.getByLabel('Unit').selectOption('centimetre');
    await addForm.getByLabel('Waist', { exact: true }).fill('71.20');
    await addForm.getByLabel(/use this profile by default/i).check();
    await addForm.getByRole('button', { name: /save profile/i }).click();
    await expect(page.getByText('Profile saved.')).toBeVisible();

    await page.reload();
    const secondCard = page.locator('article.garment').filter({ hasText: 'Second profile' });
    await expect(secondCard).toContainText('711.20 mm');
    await expect(secondCard.locator('.pill', { hasText: 'Default' })).toBeVisible();
    // Only one profile is ever the default.
    await expect(firstCard.locator('.pill', { hasText: 'Default' })).toHaveCount(0);
  });
});
