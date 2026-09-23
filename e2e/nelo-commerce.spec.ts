import { expect, test } from '@playwright/test';

test.describe('NELO commerce archive', () => {
  test('shop opens with the four current signatures and the complete catalogue', async ({ page }) => {
    await page.goto('/ng/shop');
    await expect(page.locator('.nelo-product-card')).toHaveCount(77);
    await expect(page.locator('.nelo-product-card h2').nth(0)).toHaveText('ADELE SET');
    await expect(page.locator('.nelo-product-card h2').nth(1)).toHaveText('Bloom');
    await expect(page.locator('.nelo-product-card h2').nth(2)).toHaveText('Reign');
    await expect(page.locator('.nelo-product-card h2').nth(3)).toHaveText('NOVA SET');
  });

  test('shop and collections are separate destinations', async ({ page }) => {
    await page.goto('/ng/collections');
    await expect(page.getByRole('heading', { level: 1, name: 'Collections' })).toBeVisible();
    await expect(page.locator('.collection-story')).toHaveCount(4);
    await expect(page.locator('.nelo-product-card')).toHaveCount(0);

    const shopLink = page.getByRole('link', { name: /go straight to the shop/i });
    await expect(shopLink).toHaveAttribute('href', '/ng/shop');
    await shopLink.click();
    await expect(page).toHaveURL(/\/ng\/shop/, { timeout: 15_000 });
    await expect(page.locator('.nelo-product-card')).toHaveCount(77);
  });

  test('each imported piece has a gallery and real order options', async ({ page }) => {
    await page.goto('/ng/products/adele');
    await expect(page.getByRole('heading', { level: 1, name: 'ADELE SET' })).toBeVisible();
    await expect(page.locator('.thumbs button')).toHaveCount(5);
    await expect(page.getByRole('button', { name: /^teal$/i })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /^30$/ })).toBeVisible();
    const picker = page.locator('.nelo-variant-picker');
    await expect(picker).toHaveAttribute('data-ready', 'true');
    const bust = picker.getByRole('button', { name: 'Bust', exact: true });
    await expect(bust).toBeVisible();
    await expect(picker.getByRole('button', { name: 'Waist', exact: true })).toBeVisible();
    await expect(picker.getByRole('button', { name: 'Hips', exact: true })).toBeVisible();
    await expect(picker.getByRole('button', { name: 'Height', exact: true })).toBeVisible();
    await bust.scrollIntoViewIfNeeded();
    await bust.click();
    await expect(bust).toHaveAttribute('aria-expanded', 'true');
    await picker.getByRole('option', { name: /^34 in/ }).click();
    const orderLink = page.getByRole('link', { name: /order this piece/i });
    await expect(orderLink).toHaveAttribute(
      'href',
      /\/ng\/atelier\?.*piece=ADELE\+SET.*bust=34/,
    );
    await expect(
      page.locator('a[href*="://nelowoman.com"], a[href*="://www.nelowoman.com"]'),
    ).toHaveCount(0);
    await orderLink.click();
    await expect(page).toHaveURL(/\/ng\/atelier\?.*piece=ADELE\+SET.*bust=34/);
    await expect(page.getByText('Selected from the shop')).toBeVisible();
    await expect(page.getByLabel('Bust', { exact: true })).toHaveValue('34');
  });

  test('the landing campaign exposes manual slide controls', async ({ page }) => {
    await page.goto('/ng');
    await page.waitForTimeout(2_200);
    const controls = page.locator('.campaign-rotator__controls button');
    await expect(controls).toHaveCount(14);
    await controls.nth(1).click();
    await expect(controls.nth(1)).toHaveAttribute('aria-current', 'true');
  });

  test('the header retreats on downward scroll and returns when scrolling up', async ({ page }) => {
    await page.goto('/ng/shop');
    const header = page.locator('.site-header-stack');
    await expect(header).toHaveAttribute('data-ready', 'true');
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(header).toHaveAttribute('data-hidden', 'true');
    await page.evaluate(() => window.scrollTo(0, 280));
    await expect(header).toHaveAttribute('data-hidden', 'false');
  });

  test('shop disclosures are mutually exclusive', async ({ page }) => {
    await page.goto('/ng/shop');
    const colour = page.getByRole('button', { name: /^colour/i });
    const size = page.getByRole('button', { name: /^size/i });
    const sort = page.getByRole('button', { name: /^sort/i });

    await colour.click();
    await expect(colour).toHaveAttribute('aria-expanded', 'true');
    await size.click();
    await expect(colour).toHaveAttribute('aria-expanded', 'false');
    await expect(size).toHaveAttribute('aria-expanded', 'true');
    await sort.click();
    await expect(size).toHaveAttribute('aria-expanded', 'false');
    await expect(sort).toHaveAttribute('aria-expanded', 'true');
  });

  test('bag opens as a drawer before the full page', async ({ page }) => {
    await page.goto('/ng/shop');
    const bag = page.getByRole('button', { name: /^bag$/i });
    await bag.click();

    await expect(page).toHaveURL(/\/ng\/shop/);
    await expect(bag).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('dialog', { name: /^bag/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /view full bag/i })).toHaveAttribute('href', '/ng/cart');

    await page.keyboard.press('Escape');
    await expect(bag).toHaveAttribute('aria-expanded', 'false');
    await expect(bag).toBeFocused();
  });

  test('desktop header uses one readable region selector', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) <= 860, 'desktop region selector only');
    await page.goto('/ng/shop');
    const region = page.getByRole('button', { name: /nigeria/i });
    await region.click();
    await expect(region).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.market-switcher__panel').getByRole('link', { name: /worldwide.*us dollar/i })).toBeVisible();
    await expect(page.getByText(/^NG ₦$|^INT \$$/)).toHaveCount(0);
  });

  test('the menu opens as a motion-ready disclosure on mobile', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1000) > 860, 'mobile navigation only');
    await page.goto('/ng');
    await page.waitForTimeout(2_200);
    const menu = page.locator('.menu');
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: /shop all/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
  });
});
