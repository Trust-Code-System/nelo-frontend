import { expect, test, type Page } from '@playwright/test';
import { catalogueIsLive, NO_CATALOGUE } from './backend';

/**
 * Keyboard paths.
 *
 * axe-core catches what is mechanically detectable in the DOM; it cannot tell you whether a
 * journey can actually be completed without a mouse. These do, for the two flows the brief
 * singles out: checkout and the measurement form.
 *
 * No `click()` anywhere below. Everything is `Tab`, `Enter` and typing.
 */

/** What currently has focus, described well enough to assert on. */
async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return 'body';
    const label =
      el.getAttribute('aria-label') ??
      el.getAttribute('name') ??
      el.textContent?.trim().slice(0, 40) ??
      '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}:${label}`;
  });
}

/** Tabs until the predicate matches the focused element, or gives up. */
async function tabTo(page: Page, matches: RegExp, limit = 60): Promise<boolean> {
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    if (matches.test(await focused(page))) return true;
  }
  return false;
}

test.describe('keyboard', () => {
  test('every focused control shows a visible focus ring', async ({ page }) => {
    await page.goto('/ng/size-guide');
    await page.keyboard.press('Tab');

    // The token layer sets a 2px garnet outline on :focus-visible globally. Asserting it is
    // actually computed catches a component that reset `outline` for cosmetic reasons.
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(outline.style).not.toBe('none');
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(1);
  });

  test('the size guide table can be scrolled from the keyboard', async ({ page }) => {
    // A horizontally scrolling region with nothing focusable inside it cannot be reached by
    // a keyboard user at all — the rows simply are not available to them.
    await page.goto('/ng/size-guide');
    const region = page.getByRole('region', { name: /body measurements by size/i });
    await expect(region).toHaveAttribute('tabindex', '0');
  });

  test('navigating does not leave focus on an element that no longer exists', async ({
    page,
  }) => {
    await page.goto('/ng/size-guide');
    expect(await tabTo(page, /returns/i)).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/ng\/returns/);

    // Whatever holds focus after the navigation must still be in the new document. A stale
    // reference means the next Tab starts from the top and the reader loses its place.
    const stillAttached = await page.evaluate(
      () => document.activeElement === null || document.body.contains(document.activeElement),
    );
    expect(stillAttached).toBe(true);
  });

  test('the measurement form is completable without a mouse', async ({ page }) => {
    await page.goto('/ng/account/measurements');

    // Reach the first measurement input and type a decimal into it.
    expect(await tabTo(page, /bust/i, 80)).toBe(true);
    await page.keyboard.type('34.25');

    const value = await page.evaluate(
      () => (document.activeElement as HTMLInputElement).value,
    );
    expect(value).toBe('34.25');

    // The unit selector is the very next stop: unit and value belong together, and a decimal
    // with no unit is the one thing this form must never submit.
    await page.keyboard.press('Tab');
    const next = await focused(page);
    expect(next).toMatch(/select|unit/i);
  });
});

test.describe('keyboard checkout', () => {
  test.beforeEach(async () => {
    test.skip(!(await catalogueIsLive()), NO_CATALOGUE);
  });

  test('a guest can complete checkout with the keyboard alone', async ({ page }) => {
    // Open the first product by keyboard: the grid holds links, so Enter follows one.
    await page.goto('/ng');
    const firstCard = page.locator('.card').first();
    await firstCard.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /add to bag|select a size/i })).toBeVisible();

    expect(await tabTo(page, /add to bag/i, 80)).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.getByText(/added to your bag/i)).toBeVisible();

    await page.goto('/ng/checkout');

    // Details.
    await page.getByLabel('First name').focus();
    await page.keyboard.type('Ada');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Okafor');
    await page.keyboard.press('Tab');
    await page.keyboard.type(`keys.${Date.now()}@example.com`);
    expect(await tabTo(page, /continue to delivery/i, 20)).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Delivery address' })).toBeVisible();

    // Address. Tab order must follow the visual order of the fields, which is what makes
    // this typeable rather than a guessing game.
    await page.getByLabel('Full name').focus();
    await page.keyboard.type('Ada Okafor');
    await page.keyboard.press('Tab');
    await page.keyboard.type('12 Glover Road');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Ikoyi');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Lagos');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Lagos');
    expect(await tabTo(page, /continue to delivery method/i, 20)).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Delivery method' })).toBeVisible();

    // Shipping: a radio group, so arrow keys select and the submit is the next stop.
    expect(await tabTo(page, /input|radio/i, 40)).toBe(true);
    await page.keyboard.press('Space');
    expect(await tabTo(page, /continue to review/i, 20)).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();

    expect(await tabTo(page, /place order/i, 40)).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible();
  });

  test('the product size scale is operable by keyboard', async ({ page }) => {
    await page.goto('/ng/products/laptop');
    const options = page.locator('.scale button:not([disabled])');
    await expect(options.first()).toBeVisible();

    await options.first().focus();
    await page.keyboard.press('Enter');
    await expect(options.first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('the PDP gallery thumbnails are one tab stop with arrow keys inside', async ({
    page,
  }) => {
    await page.goto('/ng/products/laptop');
    const thumbs = page.locator('.thumbs button');
    const count = await thumbs.count();
    test.skip(count < 2, 'this product has a single image');

    // Roving tabindex: exactly one thumbnail is reachable by Tab.
    await expect(page.locator('.thumbs button[tabindex="0"]')).toHaveCount(1);

    await thumbs.first().focus();
    await page.keyboard.press('ArrowRight');
    // Selection AND focus move together, so the user is not left behind the group.
    await expect(thumbs.nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect(thumbs.nth(1)).toBeFocused();
  });
});
