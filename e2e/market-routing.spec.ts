import { expect, test, type Page } from '@playwright/test';

/** Below 860px the inline nav is replaced by a disclosure, so open it first. */
async function openNavIfMobile(page: Page) {
  const menu = page.getByRole('button', { name: /^menu$/i });
  if (!(await menu.isVisible())) return;
  await expect(menu).toHaveAttribute('data-ready', 'true');
  await menu.click();
}

/**
 * Acceptance case from the backend context:
 *   "Cross-Channel isolation; NGN/USD prices and market-switch behaviour are correct."
 *
 * The cart half of that case needs the Shop API and is not written. What IS testable now is
 * the rule those cases depend on: market comes from the URL, never from geo, and an unknown
 * market fails rather than falling back to Vendure's default Channel.
 */

test.describe('market resolution', () => {
  test('the root adds a market segment', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/ng\/?$/);
  });

  test('both markets serve', async ({ page }) => {
    for (const market of ['ng', 'international']) {
      const response = await page.goto(`/${market}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('an unknown market is a 404, not a redirect to the default Channel', async ({ page }) => {
    const response = await page.goto('/zz');
    expect(response?.status()).toBe(404);
    // Critically: it must NOT have quietly become /ng.
    await expect(page).toHaveURL(/\/zz$/);
  });

  test('an unknown path inside a valid market is still a 404', async ({ page }) => {
    const response = await page.goto('/ng/nonsense');
    expect(response?.status()).toBe(404);
  });

  test('the chosen market is carried through internal links', async ({ page, isMobile }) => {
    await page.goto('/international');
    const atelier = isMobile
      ? page.locator('.menu-panel-nav').getByRole('link', { name: 'Atelier', exact: true })
      : page.locator('.nav-links').getByRole('link', { name: 'Atelier', exact: true });
    if (isMobile) await openNavIfMobile(page);
    await atelier.click();
    await expect(page).toHaveURL(/\/international\/atelier/);
  });

  test('switching market is a navigation, not hidden client state', async ({ page, isMobile }) => {
    await page.goto('/ng/atelier');
    if (isMobile) {
      await openNavIfMobile(page);
      await expect(
        page.locator('.menu-panel-markets').getByRole('link', { name: /Worldwide/ }),
      ).toHaveAttribute('href', '/international');
      return;
    }
    // The desktop switcher keeps the links in a disclosure. Opening it must reveal a real
    // navigation, not a client-only currency toggle.
    const switcher = page.locator('.market-switcher');
    await switcher.getByRole('button', { name: 'Nigeria' }).click();
    await expect(switcher.getByRole('link', { name: 'Worldwide' })).toHaveAttribute(
      'href',
      '/international',
    );
  });
});

test.describe('currency', () => {
  test('NGN renders in the Nigerian market', async ({ page }) => {
    await page.goto('/ng/account/atelier/NW-BR-0416');
    await expect(page.getByText('₦450,000').first()).toBeVisible();
  });

  test('the same commission renders USD in the international market', async ({ page }) => {
    await page.goto('/international/account/atelier/NW-BR-0416');
    // Same minor units, formatted for the market. No frontend FX conversion happens:
    // real prices come from the Channel, which is why this is a formatting assertion only.
    await expect(page.getByText('$450,000').first()).toBeVisible();
    await expect(page.getByText('₦450,000')).toHaveCount(0);
  });
});
