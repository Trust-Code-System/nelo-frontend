import { expect, test } from '@playwright/test';
import { catalogueIsLive, NO_CATALOGUE } from './backend';
import { mailboxIsAvailable, NO_MAILBOX, tokenFromEmail, waitForEmail } from './mailbox';

/**
 * Customer accounts.
 *
 * The acceptance criterion in the brief is a round trip: register → verify → login → logout.
 * That needs a reachable Vendure (for the mutations) and the development mailbox (for the
 * verification token), so it is guarded on both and skipped with a stated reason otherwise.
 *
 * The journeys that need no backend at all — the shape of the forms, the signed-out state,
 * and the open-redirect rejection — run everywhere, including CI.
 */

const PASSWORD = 'correct-horse-battery-staple';

function freshEmail(): string {
  return `nelo.e2e.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

test.describe('account, without a backend', () => {
  test('the account page offers a way back in rather than redirecting', async ({ page }) => {
    // A session that has expired must become a recoverable sign-in state, never a silent
    // re-authentication and never a bounce to a login page that loses the destination.
    const response = await page.goto('/ng/account');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/ng\/account$/);
    await expect(page.getByRole('link', { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByText(/your bag is not affected/i)).toBeVisible();
  });

  test('signing out is a POST, never a link', async ({ page }) => {
    // A GET that ends a session can be fired by any third-party page that embeds the URL.
    await page.goto('/ng/account/logout');
    await expect(page.locator('a[href*="logout"]')).toHaveCount(0);
  });

  test('a sign-in destination outside the market is discarded', async ({ page }) => {
    await page.goto('/ng/account/login?next=https://evil.example/');
    // The value is refused at render: the form must not carry it forward at all.
    await expect(page.locator('input[name="next"]')).toHaveValue('/ng/account');
  });

  test('the registration form asks only for what the account needs', async ({ page }) => {
    await page.goto('/ng/account/register');
    await expect(page.getByLabel('First name')).toBeVisible();
    await expect(page.getByLabel('Last name')).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    // No measurements at registration. They belong to a profile, not to a signup form.
    await expect(page.getByLabel(/bust|waist|hip/i)).toHaveCount(0);
  });

  test('a signed-out password page offers a reset rather than a change', async ({ page }) => {
    await page.goto('/ng/account/password');
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
    // No current-password field: there is nobody signed in to know it.
    await expect(page.getByLabel(/current password/i)).toHaveCount(0);
  });
});

test.describe('account round trip', () => {
  // Serial, not parallel. These journeys each register a customer against the harness's
  // SQLite database and read the shared development mailbox directory; six workers writing
  // at once makes SQLite report 'database is locked' and turns a real pass into a flake.
  // That is a property of the harness, not of the storefront.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async () => {
    test.skip(!(await catalogueIsLive()), NO_CATALOGUE);
    test.skip(!mailboxIsAvailable(), NO_MAILBOX);
  });

  test('register, verify, sign in, sign out', async ({ page }) => {
    const email = freshEmail();

    // --- register. Success is NOT a signed-in state, and the page must not claim it is.
    await page.goto('/ng/account/register');
    await page.getByLabel('First name').fill('Ada');
    await page.getByLabel('Last name').fill('Okafor');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/check your email/i)).toBeVisible();

    // --- sign in before verifying: Vendure answers NotVerifiedError, which is HTTP 200 with
    // no session. Treating that as success is the trap this asserts against.
    await page.goto('/ng/account/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page.getByText(/has not been verified/i)).toBeVisible();
    await expect(page).toHaveURL(/\/ng\/account\/login/);

    // --- verify, from the token in the emailed link.
    const email1 = await waitForEmail(email, { subjectMatches: /verify/i });
    expect(email1, 'no verification email reached the development mailbox').not.toBeNull();
    const token = email1 ? tokenFromEmail(email1) : null;
    expect(token, 'no token in the verification email').not.toBeNull();

    await page.goto(`/ng/account/verify?token=${encodeURIComponent(token ?? '')}`);
    await page.getByRole('button', { name: /verify and sign in/i }).click();

    // Vendure signs the customer in as part of verifying.
    await expect(page).toHaveURL(/\/ng\/account$/);
    await expect(page.getByRole('heading', { name: 'Ada Okafor' })).toBeVisible();
    await expect(page.getByText(email).first()).toBeVisible();

    // --- sign out, then confirm the session really is gone.
    await page.getByRole('button', { name: /^sign out$/i }).click();
    await expect(page).toHaveURL(/\/ng\/?$/);

    await page.goto('/ng/account');
    await expect(page.getByRole('link', { name: /^sign in$/i })).toBeVisible();

    // --- sign in again, now verified.
    await page.goto('/ng/account/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/ng\/account$/);
    await expect(page.getByRole('heading', { name: 'Ada Okafor' })).toBeVisible();
  });

  test('a reset request answers identically whether or not the account exists', async ({
    page,
  }) => {
    // Vendure returns success for an unknown address on purpose. The storefront must not
    // undo that by answering differently — a different message is an account oracle.
    await page.goto('/ng/account/password');
    await page.getByLabel('Email', { exact: true }).fill(`definitely-not-a-customer.${Date.now()}@example.com`);
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/if that address has an account/i)).toBeVisible();
  });

  test('wrong credentials produce a business message, not a trace', async ({ page }) => {
    await page.goto('/ng/account/login');
    await page.getByLabel('Email', { exact: true }).fill(freshEmail());
    await page.getByLabel('Password', { exact: true }).fill('not-the-password');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    // No stack, no GraphQL noise, no upstream URL.
    await expect(alert).not.toContainText(/graphql|vendure|localhost|at Object/i);
  });

  test('an address added in the account is offered at checkout', async ({ page }) => {
    const email = freshEmail();

    // Register and verify first — an address book needs a customer.
    await page.goto('/ng/account/register');
    await page.getByLabel('First name').fill('Ngozi');
    await page.getByLabel('Last name').fill('Balogun');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/check your email/i)).toBeVisible();

    const verification = await waitForEmail(email, { subjectMatches: /verify/i });
    const token = verification ? tokenFromEmail(verification) : null;
    expect(token).not.toBeNull();
    await page.goto(`/ng/account/verify?token=${encodeURIComponent(token ?? '')}`);
    await page.getByRole('button', { name: /verify and sign in/i }).click();
    await expect(page).toHaveURL(/\/ng\/account$/);

    // Add an address in the Nigerian shape.
    await page.goto('/ng/account/addresses');
    await page.getByLabel('Full name').fill('Ngozi Balogun');
    await page.getByLabel('Street address').fill('4 Bourdillon Road');
    await page.getByLabel(/landmark/i).fill('Ikoyi');
    await page.getByLabel('City or town').fill('Lagos');
    await page.getByLabel('State', { exact: true }).fill('Lagos');
    await page.getByLabel(/default delivery address/i).check();
    await page.getByRole('button', { name: /save address/i }).click();

    await expect(page.getByText('4 Bourdillon Road')).toBeVisible();
    // The chip, specifically: the add form also has a 'default delivery address'
    // checkbox, and matching that would prove nothing about what was saved.
    await expect(page.locator('.chip', { hasText: 'Default delivery' })).toBeVisible();

    // The acceptance criterion: that address is what checkout offers.
    await page.goto('/ng');
    await page.locator('.card').first().click();
    await page.getByRole('button', { name: /add to bag/i }).click();
    await expect(page.getByText(/added to your bag/i)).toBeVisible();

    await page.goto('/ng/checkout');
    // Signed in, so the details step is skipped entirely.
    await expect(page.getByRole('heading', { name: 'Delivery address' })).toBeVisible();
    await expect(page.getByLabel('Street address')).toHaveValue('4 Bourdillon Road');
  });

  test('a placed order appears in history and its detail page renders by code', async ({
    page,
  }) => {
    const email = freshEmail();

    await page.goto('/ng/account/register');
    await page.getByLabel('First name').fill('Chidinma');
    await page.getByLabel('Last name').fill('Eze');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/check your email/i)).toBeVisible();

    const verification = await waitForEmail(email, { subjectMatches: /verify/i });
    const token = verification ? tokenFromEmail(verification) : null;
    await page.goto(`/ng/account/verify?token=${encodeURIComponent(token ?? '')}`);
    await page.getByRole('button', { name: /verify and sign in/i }).click();
    await expect(page).toHaveURL(/\/ng\/account$/);

    // No orders yet — and the empty state says so rather than looking broken.
    await page.goto('/ng/account/orders');
    await expect(page.getByRole('heading', { name: /no orders on this account/i })).toBeVisible();

    await page.goto('/ng');
    await page.locator('.card').first().click();
    await page.getByRole('button', { name: /add to bag/i }).click();
    await expect(page.getByText(/added to your bag/i)).toBeVisible();

    await page.goto('/ng/checkout');
    await page.getByLabel('Street address').fill('4 Bourdillon Road');
    await page.getByLabel('City or town').fill('Lagos');
    await page.getByRole('button', { name: /continue to delivery method/i }).click();
    await page.locator('.opt input[name="shippingMethodId"]').first().check();
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.getByRole('button', { name: /^place order/i }).click();
    await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible();

    const code = (await page.locator('.proj-meta .num').first().innerText()).trim();

    // History, then the detail page — which reads by code, after activeOrder is cleared.
    await page.goto('/ng/account/orders');
    await expect(page.getByRole('link', { name: code })).toBeVisible();
    await page.getByRole('link', { name: code }).click();
    await expect(page).toHaveURL(new RegExp(`/ng/account/orders/${code}`));
    await expect(page.getByRole('heading', { name: `Order ${code}` })).toBeVisible();
    await expect(page.getByText('4 Bourdillon Road')).toBeVisible();
  });
});
