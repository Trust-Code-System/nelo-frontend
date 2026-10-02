import { expect, test } from '@playwright/test';
import { catalogueIsLive, NO_CATALOGUE } from './backend';

test.describe('NELO commerce archive', () => {
  test('shop lists live products and opens the ordinary purchase page', async ({ page }) => {
    test.skip(!(await catalogueIsLive()), NO_CATALOGUE);
    await page.goto('/ng/shop');
    const cards = page.locator('.nelo-product-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeLessThanOrEqual(12);
    const ordinary = cards.filter({ hasNotText: 'By consultation' }).first();
    await expect(ordinary).toBeVisible();
    const title = await ordinary.locator('h2').innerText();
    await ordinary.getByRole('link').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByRole('button', { name: /add to bag|out of stock|select a size/i })).toBeVisible();
    await expect(page.locator('.nelo-variant-picker')).toHaveCount(0);
  });

  test('shop and collections are separate destinations', async ({ page }) => {
    await page.goto('/ng/collections');
    await expect(page.getByRole('heading', { level: 1, name: 'Collections' })).toBeVisible();
    for (const href of await page.locator('.collection-story a').evaluateAll(links => links.map(link => link.getAttribute('href')))) expect(href).toMatch(/^\/ng\/collections\//);
    await expect(page.locator('.nelo-product-card')).toHaveCount(0);

    const shopLink = page.getByRole('link', { name: /go straight to the shop/i });
    await expect(shopLink).toHaveAttribute('href', '/ng/shop');
    await shopLink.click();
    await expect(page).toHaveURL(/\/ng\/shop/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Shop all' })).toBeVisible();
  });

  test('unknown published products do not silently become an atelier purchase', async ({ page }) => {
    test.skip(!(await catalogueIsLive()), NO_CATALOGUE);
    const response = await page.goto('/ng/products/not-a-published-product');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('link', { name: 'Order this piece', exact: true })).toHaveCount(0);
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
    test.skip(!(await catalogueIsLive()), NO_CATALOGUE);
    await page.goto('/ng/shop');
    const configured = await page.getByRole('button', { name: /^colour/i }).count() > 0 && await page.getByRole('button', { name: /^size/i }).count() > 0;
    if (!configured && process.env.E2E_REQUIRE_BACKEND === '1') throw new Error('The staging catalogue gate requires published colour and size facets.');
    test.skip(!configured, 'Colour and size facets are not configured');
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
