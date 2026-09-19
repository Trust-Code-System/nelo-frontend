import { expect, test } from '@playwright/test';
import { catalogueIsLive, NO_CATALOGUE } from './backend';

/**
 * Collection browsing.
 *
 * Filters, sort and pagination are URL state by design, so these assert on the address bar
 * as much as the page: a filtered view that cannot be shared or bookmarked is a bug, not a
 * styling choice.
 */

const COLLECTION = '/ng/collections/electronics';

// These journeys read the real catalogue. Without one they are skipped, loudly.
test.beforeEach(async () => {
  test.skip(!(await catalogueIsLive()), NO_CATALOGUE);
});

/**
 * Below 1000px the facet rail is a sheet rather than a column, so it has to be opened before
 * anything in it can be clicked. The rail markup is identical either way — only its
 * presentation changes — which is why every assertion after this point is the same.
 */
async function openFiltersIfSheet(page: import('@playwright/test').Page) {
  const trigger = page.getByRole('button', { name: /^filter/i });
  if (!(await trigger.isVisible())) return;
  // Idempotent: applying a filter is a client-side navigation, so the sheet is still open
  // afterwards — which is what you want when choosing several filters in a row. Clicking
  // the trigger again would be a no-op the scrim swallows.
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
}

test.describe('collection page', () => {
  test('renders a collection with its product count', async ({ page }) => {
    const response = await page.goto(COLLECTION);
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/electronics/i);
    await expect(page.getByText(/garments · UK 6—30/)).toBeVisible();
    await expect(page.locator('.card').first()).toBeVisible();
  });

  test('an unknown collection is a 404, not an empty grid', async ({ page }) => {
    const response = await page.goto('/ng/collections/not-a-collection');
    expect(response?.status()).toBe(404);
  });

  test('sort is carried in the URL so a sorted view can be shared', async ({ page }) => {
    await page.goto(COLLECTION);
    await page.getByRole('link', { name: 'Price, low to high' }).click();

    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page.getByRole('link', { name: 'Price, low to high' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('a sorted URL opened directly produces the same state', async ({ page }) => {
    await page.goto(`${COLLECTION}?sort=price-desc`);
    await expect(page.getByRole('link', { name: 'Price, high to low' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('the in-stock filter round-trips through the URL', async ({ page }) => {
    await page.goto(COLLECTION);

    await openFiltersIfSheet(page);

    // Scoped to the rail: a product card is itself a link whose accessible name contains
    // "Ready to ship", so an unscoped locator matches the whole grid.
    const rail = page.locator('.rail');
    await rail.getByRole('link', { name: 'Ready to ship' }).click();

    await expect(page).toHaveURL(/stock=ready/);
    await expect(page.locator('.chips').getByText('Ready to ship')).toBeVisible();

    // And it can be cleared again, without having to reopen the sheet: applying a filter
    // navigates but leaves the sheet where it was, so a second choice is one tap away.
    await openFiltersIfSheet(page);
    await rail.getByRole('link', { name: 'Clear filters' }).click();
    await expect(page).not.toHaveURL(/stock=ready/);
  });

  test('pagination moves through pages and stops at the ends', async ({ page }) => {
    await page.goto(COLLECTION);

    const pager = page.locator('.pager');
    if ((await pager.count()) === 0) test.skip(true, 'collection fits on one page');

    // Previous is inert on page 1 rather than missing, so the control does not jump.
    await expect(pager.locator('[aria-disabled="true"]').first()).toBeVisible();

    await pager.getByRole('link', { name: /Next/ }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(pager.getByText(/Page 2 of/)).toBeVisible();
  });

  test('the collections index links into a collection', async ({ page }) => {
    await page.goto('/ng/collections');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/collections/i);

    await page.locator('.card').first().click();
    await expect(page).toHaveURL(/\/ng\/collections\/[a-z0-9-]+/);
  });
});

test.describe('catalogue is public, cart is not', () => {
  test('a collection may be cached; the cart never is', async ({ page }) => {
    const collection = await page.goto(COLLECTION);
    const cart = await page.goto('/ng/cart');

    // The cart carries session state and must not be shared by any cache.
    const cartCacheControl = cart?.headers()['cache-control'] ?? '';
    expect(cartCacheControl).toMatch(/no-store|private|no-cache/);
    expect(cartCacheControl).not.toMatch(/\bpublic\b/);

    // The collection page is anonymous; assert only that it rendered.
    expect(collection?.status()).toBe(200);
  });
});
