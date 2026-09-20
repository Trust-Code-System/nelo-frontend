import { expect, test, type Page } from '@playwright/test';
import { catalogueIsLive, NO_CATALOGUE } from './backend';

/**
 * Guest checkout, end to end.
 *
 * This is the journey the brief calls the acceptance criterion: a guest completes an order
 * against the harness using Vendure's development payment handler, and the order then
 * appears when read back by code.
 *
 * It needs a reachable Vendure with a seeded catalogue AND shipping and payment methods
 * assigned to the `nelo-ng` Channel — `vendure-dev/setup-nelo-channels.mjs` does that. CI has
 * no Vendure, so these are skipped there with a stated reason rather than asserting fixture
 * behaviour and calling itself a checkout test.
 */

/** Adds the first in-stock garment to the bag, leaving the browser on the bag page. */
async function addSomethingToBag(page: Page) {
  await page.goto('/ng/collections/electronics');
  await page.locator('.card').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const addToBag = page.getByRole('button', { name: /add to bag/i });
  await expect(addToBag).toBeEnabled();
  await addToBag.click();
  await expect(page.getByText(/added to your bag/i)).toBeVisible();

  await page.goto('/ng/cart');
  await expect(page.locator('.cart-lines li')).toHaveCount(1);
}

test.describe('checkout', () => {
  test.beforeEach(async () => {
    test.skip(!(await catalogueIsLive()), NO_CATALOGUE);
  });

  // A full checkout walks four steps plus a confirmation, on a dev server that compiles each
  // route the first time it is asked for. See the note in account.spec.ts.
  test.slow();

  test('an empty bag cannot be checked out', async ({ page }) => {
    await page.goto('/ng/checkout');
    await expect(page.getByRole('heading', { name: /nothing to check out/i })).toBeVisible();
  });

  test('a guest completes an order and it is readable by code afterwards', async ({ page }) => {
    await addSomethingToBag(page);

    await page.getByRole('link', { name: /^checkout$/i }).click();
    await expect(page).toHaveURL(/\/ng\/checkout/);

    // Step 1 — details. A guest sees this; a signed-in customer would not.
    await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
    await page.getByLabel('First name').fill('Ada');
    await page.getByLabel('Last name').fill('Okafor');
    await page.getByLabel('Email', { exact: true }).fill(`ada.${Date.now()}@example.com`);
    await page.getByRole('button', { name: /continue to delivery$/i }).click();

    // Step 2 — address, shaped for Nigeria: a landmark field, an optional postcode.
    await expect(page.getByRole('heading', { name: 'Delivery address' })).toBeVisible();
    await page.getByLabel('Full name').fill('Ada Okafor');
    await page.getByLabel('Street address').fill('12 Glover Road');
    await page.getByLabel(/landmark/i).fill('Ikoyi, opposite the polo club');
    await page.getByLabel('City or town').fill('Lagos');
    await page.getByLabel('State', { exact: true }).fill('Lagos');
    await page.getByLabel('Phone').fill('+2348012345678');
    await page.getByRole('button', { name: /continue to delivery method/i }).click();

    // Step 3 — shipping, from Vendure's eligible methods rather than a hardcoded list.
    await expect(page.getByRole('heading', { name: 'Delivery method' })).toBeVisible();
    const methods = page.locator('.opt input[name="shippingMethodId"]');
    await expect(methods.first()).toBeVisible();
    await methods.first().check();
    await page.getByRole('button', { name: /continue to review/i }).click();

    // Step 4 — review. The button carries the store's total, and the form that submits it
    // has no amount field at all.
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
    const place = page.getByRole('button', { name: /^place order/i });
    await expect(place).toBeVisible();
    await expect(page.getByText(/development payment handler/i)).toBeVisible();

    await place.click();

    // Confirmation, read by code — `activeOrder` is null by now, which is exactly why.
    await expect(page).toHaveURL(/\/ng\/checkout\/confirmation\//);
    await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible();

    const code = (await page.locator('.proj-meta .num').first().innerText()).trim();
    expect(code).not.toHaveLength(0);

    // The same order, read again by code on a different route.
    await page.goto(`/ng/order-tracking?code=${encodeURIComponent(code)}`);
    await expect(page.getByText(code).first()).toBeVisible();
    await expect(page.getByText(/payment authorised|paid/i).first()).toBeVisible();

    // And the bag is empty, because the order is no longer active.
    await page.goto('/ng/cart');
    await expect(page.getByRole('heading', { name: /nothing in your bag/i })).toBeVisible();
  });

  test('a step cannot be skipped ahead of the order', async ({ page }) => {
    await addSomethingToBag(page);

    // Asking for review on an order with no customer and no address must land on the first
    // incomplete step instead — otherwise the review screen renders a half-built order.
    await page.goto('/ng/checkout?step=review');
    await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Review' })).toHaveCount(0);
  });

  test('the total shown is the store’s, and the page says so', async ({ page }) => {
    await addSomethingToBag(page);
    await page.goto('/ng/checkout');

    await expect(page.getByText(/every figure here is calculated by the store/i)).toBeVisible();
    // No input anywhere in checkout may carry a price, a total or an amount.
    await expect(page.locator('input[name*="total" i], input[name*="amount" i], input[name*="price" i]')).toHaveCount(0);
  });
});

/**
 * Deliberately NOT guarded on the catalogue.
 *
 * The gate is checked before the page reads anything from Vendure, which is the whole point —
 * an order that cannot be paid for should not start collecting an address. So this runs in
 * CI, where there is no backend at all, and it is the only coverage the gate gets there.
 */
test.describe('international checkout gate', () => {
  test('is closed, and explains itself rather than 404ing', async ({ page }) => {
    const response = await page.goto('/international/checkout');
    // The market exists and the catalogue is real; only payment is withheld.
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: /international checkout is not open/i }),
    ).toBeVisible();
    await expect(page.getByText(/settle in dollars/i)).toBeVisible();
  });

  test('the Nigerian market is not gated', async ({ page }) => {
    // With no backend this renders "we cannot reach the store", which is also not the gate.
    // Either way the assertion holds: the gate must never appear in the ng market.
    await page.goto('/ng/checkout');
    await expect(
      page.getByRole('heading', { name: /international checkout is not open/i }),
    ).toHaveCount(0);
  });
});
