import { expect, test, type Page } from '@playwright/test';
import { catalogueIsLive, NO_CATALOGUE } from './backend';
import { mailboxIsAvailable, NO_MAILBOX, tokenFromEmail, waitForEmail } from './mailbox';

/**
 * Consultation requests and appointment cancellation - the real Atelier Shop API.
 *
 * Booking is a request, not a reservation: there is no availability query and nothing is
 * held. Every operation refuses a guest, so - like the measurement journeys - these need a
 * reachable Vendure and the development mailbox to register and verify a customer first.
 */

const PASSWORD = 'correct-horse-battery-staple';

function freshEmail(): string {
  return `nelo.e2e.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
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

/**
 * Opens the "Preferred date" popover and picks a date comfortably in the future - far enough
 * that a slow CI run cannot cross it into the past, close enough that it never needs more than
 * a handful of "Next month" clicks. Selection is by `data-calendar-date` (the picker's own ISO
 * value), never by the day button's formatted label text, which is locale day-then-month and
 * not reliably distinguishable from the year by position alone.
 */
async function pickFutureDate(page: Page, fieldLabel: string, daysAhead = 14) {
  const today = new Date();
  const target = new Date();
  target.setDate(target.getDate() + daysAhead);
  const iso = target.toISOString().slice(0, 10);
  const monthsAhead =
    (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());

  await page.getByLabel(fieldLabel).click();
  for (let i = 0; i < monthsAhead; i += 1) {
    await page.getByRole('button', { name: 'Next month' }).click();
  }
  await page.locator(`[data-calendar-date="${iso}"]`).click();
}

test.describe('atelier, without a backend', () => {
  test('the request form is never shown to a guest', async ({ page }) => {
    // As in measurements.spec.ts: without a backend this cannot distinguish "no customer"
    // from "unreachable", so it only proves the form itself stays hidden either way. The
    // definitive sign-in redirect is asserted in the round trip below.
    test.skip(await catalogueIsLive(), 'this asserts the no-backend-agnostic signed-out shape');
    await page.goto('/ng/atelier');
    await expect(page.getByRole('button', { name: /request a consultation/i })).toHaveCount(0);
  });
});

test.describe('atelier round trip', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async () => {
    test.skip(!(await catalogueIsLive()), NO_CATALOGUE);
    test.skip(!mailboxIsAvailable(), NO_MAILBOX);
  });
  test.slow();

  test('a guest is sent to sign in, not shown the form', async ({ page }) => {
    await page.goto('/ng/atelier');
    await expect(page.getByRole('link', { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /request a consultation/i })).toHaveCount(0);
  });

  test('a signed-in customer requests a consultation, and it appears in their appointments', async ({
    page,
  }) => {
    await registerAndVerify(page, 'Halima', 'Yusuf');

    await page.goto('/ng/atelier');
    await page.getByLabel('Consultation').check();
    await pickFutureDate(page, 'Preferred date');
    await page.getByLabel('Preferred time').fill('11:00');
    await page.getByLabel('Anything else').fill('Looking to commission a bridal set.');
    await page.getByRole('button', { name: /request a consultation/i }).click();

    await expect(page.getByText(/request sent/i)).toBeVisible();

    // The Admin list is the reliable place to find requests, but the customer's own list must
    // show it too, as `requested`, with their own preferred time - not yet an agreed one.
    await page.goto('/ng/account/appointments');
    const row = page.locator('tbody tr').first();
    await expect(row).toContainText('Consultation');
    await expect(row).toContainText('Requested');
  });

  test('a requested appointment can be cancelled, and a cancelled one offers no cancel action', async ({
    page,
  }) => {
    await registerAndVerify(page, 'Temi', 'Oduya');

    await page.goto('/ng/atelier');
    await page.getByLabel('Fitting').check();
    await pickFutureDate(page, 'Preferred date');
    await page.getByLabel('Preferred time').fill('14:30');
    await page.getByRole('button', { name: /request a consultation/i }).click();
    await expect(page.getByText(/request sent/i)).toBeVisible();

    await page.goto('/ng/account/appointments');
    const row = page.locator('tbody tr').first();
    await expect(row).toContainText('Requested');

    await row.getByRole('button', { name: 'Cancel', exact: true }).click();
    await row.getByRole('button', { name: /confirm cancellation/i }).click();
    await expect(page.getByText('Appointment cancelled.')).toBeVisible();

    await page.reload();
    const cancelledRow = page.locator('tbody tr').first();
    await expect(cancelledRow).toContainText('Cancelled');
    await expect(cancelledRow.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);
  });

  test('a customer with three open requests is refused a fourth', async ({ page }) => {
    await registerAndVerify(page, 'Ronke', 'Adisa');

    for (let i = 0; i < 3; i += 1) {
      await page.goto('/ng/atelier');
      await page.getByLabel('Consultation').check();
      await pickFutureDate(page, 'Preferred date', 14 + i);
      await page.getByLabel('Preferred time').fill('09:00');
      await page.getByRole('button', { name: /request a consultation/i }).click();
      await expect(page.getByText(/request sent/i)).toBeVisible();
    }

    await page.goto('/ng/atelier');
    await page.getByLabel('Consultation').check();
    await pickFutureDate(page, 'Preferred date', 17);
    await page.getByLabel('Preferred time').fill('09:00');
    await page.getByRole('button', { name: /request a consultation/i }).click();

    await expect(page.getByText(/already have 3 requests awaiting confirmation/i)).toBeVisible();
  });
});
