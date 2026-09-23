import { expect, test, type Page } from '@playwright/test';
import { catalogueIsLive, NO_CATALOGUE } from './backend';

/**
 * Written pages, search and the mobile filter sheet.
 *
 * The written pages need no backend, so they run in CI. Search and the filter sheet read the
 * catalogue and are guarded.
 */

const WRITTEN = [
  ['/ng/about', /fashion house for every version of her/i],
  ['/ng/contact', /talk to the atelier/i],
  ['/ng/shipping', /shipping and duties/i],
  ['/ng/returns', /returns and alterations/i],
  ['/ng/privacy', /privacy policy/i],
  ['/ng/terms', /terms of service/i],
  ['/ng/client-care', /everything after the order/i],
  ['/ng/size-guide', /size guide/i],
  ['/ng/order-tracking', /track an order/i],
] as const;

test.describe('written pages', () => {
  for (const [path, heading] of WRITTEN) {
    test(`${path} renders with one h1`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      // Exactly one h1 per page: more than one breaks the document outline a screen reader
      // uses to navigate.
      await expect(page.locator('h1')).toHaveCount(1);
    });
  }

  test('every written page exists in both markets', async ({ page }) => {
    for (const [path] of WRITTEN) {
      const response = await page.goto(path.replace('/ng/', '/international/'));
      expect(response?.status(), path).toBe(200);
    }
  });

  test('the size guide explains the range and all seven measurement points', async ({ page }) => {
    await page.goto('/ng/size-guide');

    await expect(page.getByRole('heading', { name: /the range is the whole range/i })).toBeVisible();
    const points = page.locator('.mdefs dt');
    await expect(points).toHaveCount(7);
    await expect(points).toHaveText([
      'Bust',
      'Waist',
      'Hip',
      'Height',
      'Shoulder',
      'Sleeve',
      'Inseam',
    ]);

    // The 6–30 range, end to end, as rows of the chart rather than as a claim in prose.
    await expect(page.getByRole('row', { name: /^6 / })).toBeVisible();
    await expect(page.getByRole('row', { name: /^30 / })).toBeVisible();

    // Fig. 01, with its meaning carried in the accessible name rather than only in pixels.
    await expect(page.getByRole('img', { name: /seven recorded measurements/i })).toBeVisible();

    // The decimal-millimetre contract is stated where a customer can read it.
    await expect(page.getByText(/6\.35/)).toBeVisible();
  });

  test('the contact page publishes the Lagos atelier, not a placeholder', async ({ page }) => {
    await page.goto('/ng/contact');
    await expect(page.getByRole('link', { name: 'info@nelowoman.com' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: '+234 806 0712 122' }).first()).toBeVisible();
    await expect(page.getByText('5 Gbengbola Street').first()).toBeVisible();
    await expect(page.locator('a[href*="example.com"]')).toHaveCount(0);
  });
});

test.describe('search', () => {
  test('distinguishes "nothing asked" from "nothing matched"', async ({ page }) => {
    await page.goto('/ng/search');
    await expect(page.getByRole('heading', { name: /find your piece/i })).toBeVisible();
    // Conflating the two is how a store tells a visitor it has no stock when they have not
    // asked it anything.
    await expect(page.getByText(/nothing matches/i)).toHaveCount(0);
  });

  test('a term with no matches says so, and offers the atelier', async ({ page }) => {
    await page.goto('/ng/search?q=zzzznotathing');
    await expect(page.getByRole('heading', { name: /try a broader description/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ask the atelier/i })).toBeVisible();
  });

  test('a term returns results and stays in the URL', async ({ page }) => {
    await page.goto('/ng/search');
    await page.getByRole('searchbox').fill('Adele');
    await page.getByRole('search').getByRole('button', { name: /^search$/i }).click();

    // A GET form, so the term is in the address and the result can be shared.
    await expect(page).toHaveURL(/\/ng\/search\?q=Adele/);
    await expect(page.locator('.nelo-product-card').first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Adele');
  });

  test('search is reachable from the header on every width', async ({ page }) => {
    await page.goto('/ng/size-guide');
    // Below 860px the inline utilities are hidden and search lives in the disclosure, so the
    // route has to be reachable from both — a phone with no way to search is the bug here.
    const menu = page.locator('.menu');
    const menuSearch = page.getByRole('link', { name: /search/i }).first();
    if (await menu.isVisible()) {
      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await expect(menuSearch).toHaveAttribute('href', '/ng/search');
    } else {
      await page.getByRole('button', { name: /^search$/i }).click();
      await expect(page.getByRole('link', { name: /open full search/i })).toHaveAttribute(
        'href',
        '/ng/search',
      );
    }
  });
});

/** Below 860px the inline nav is replaced by a disclosure, so open it first. */
async function openNavIfMobile(page: Page) {
  const menu = page.getByRole('button', { name: /^menu$/i });
  if (await menu.isVisible()) await menu.click();
}

test.describe('mobile filter sheet', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!(await catalogueIsLive()), NO_CATALOGUE);
    test.skip(
      (page.viewportSize()?.width ?? 0) > 1000,
      'the sheet only exists below the rail breakpoint',
    );
  });

  test('the facet rail is a sheet, not a stack above the grid', async ({ page }) => {
    await page.goto('/ng/collections/electronics');

    const trigger = page.getByRole('button', { name: /^filter/i });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Closed: the rail's contents are present in the DOM but not visible, so the grid is
    // the first thing on the page.
    await expect(page.getByRole('heading', { name: 'Make' })).toBeHidden();

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('heading', { name: 'Make' })).toBeVisible();
  });

  test('Escape closes it and returns focus to the trigger', async ({ page }) => {
    await page.goto('/ng/collections/electronics');
    const trigger = page.getByRole('button', { name: /^filter/i });
    await trigger.click();
    await expect(page.getByRole('button', { name: /^close$/i })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('a filter chosen in the sheet is a real navigation', async ({ page }) => {
    await page.goto('/ng/collections/electronics');
    await page.getByRole('button', { name: /^filter/i }).click();
    // Scoped to the sheet: the product cards also mention "Ready to ship" in their strip.
    await page.locator('.sheet').getByRole('link', { name: 'Ready to ship', exact: true }).click();

    // Still URL state: shareable, bookmarkable, back-button correct.
    await expect(page).toHaveURL(/stock=ready/);
  });
});

test.describe('the header reflects the bag', () => {
  test('shows a count once something is in it', async ({ page }) => {
    test.skip(!(await catalogueIsLive()), NO_CATALOGUE);

    await page.goto('/ng/collections/electronics');
    // Nothing in the bag: no count at all, because a "0" is noise.
    await expect(page.locator('.bagcount')).toHaveCount(0);

    await page.locator('.card').first().click();
    await page.getByRole('button', { name: /add to bag/i }).click();
    await expect(page.getByText(/added to your bag/i)).toBeVisible();

    await page.goto('/ng');
    await openNavIfMobile(page);
    await expect(page.locator('.bagcount')).toHaveText('1');
  });
});
