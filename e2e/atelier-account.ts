import { expect, test, type Page } from '@playwright/test';

/** A real pre-verified test customer, supplied in the ignored env file. No fixture login. */
export async function signInToAtelier(page: Page) {
  const email = process.env.E2E_CUSTOMER_EMAIL;
  const password = process.env.E2E_CUSTOMER_PASSWORD;
  if (!email || !password) {
    if (process.env.E2E_REQUIRE_BACKEND === '1') throw new Error('The staging gate requires E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD for a pre-verified demo account.');
    test.skip(true, 'Requires a reachable nelo-commerce API and a pre-verified E2E customer.');
    return;
  }
  await page.goto('/ng/account/login?next=%2Fng%2Faccount%2Fmeasurements');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/ng\/account\/measurements/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Add a measurement profile', exact: true })).toBeVisible();
}
