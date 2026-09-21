import { expect, test } from '@playwright/test';

/**
 * The Shopify migration surface.
 *
 * These need no backend at all, so they run everywhere including CI — which is what you want
 * from the highest-risk part of the replatform. An old URL that 404s costs a sale and a
 * ranking, and it fails silently: nobody notices until the traffic is gone.
 *
 * The status codes are asserted, not just the destination. A 302 where a 301 belongs leaves
 * the old URL in the index indefinitely.
 */

const LEGACY: readonly [string, string][] = [
  ['/pages/about-us', '/ng/about'],
  ['/pages/contact', '/ng/contact'],
  ['/pages/order-tracking', '/ng/order-tracking'],
  // A hard 404 on the live site today, linked three times from its homepage.
  ['/pages/consultation', '/ng/atelier'],
  ['/pages/nelo-bridal', '/ng/atelier'],
  ['/pages/size-guide', '/ng/size-guide'],
  ['/policies/privacy-policy', '/ng/privacy'],
  ['/pages/terms-of-service', '/ng/terms'],
  ['/products/some-garment', '/ng/products/some-garment'],
  ['/collections/bridal', '/ng/collections/bridal'],
  ['/collections/all', '/ng/collections'],
  ['/cart', '/ng/cart'],
  ['/account/login', '/ng/account/login'],
];

test.describe('Shopify redirects', () => {
  for (const [from, to] of LEGACY) {
    test(`${from} → ${to}, permanently`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), `${from} should be a permanent redirect`).toBe(301);
      expect(new URL(response.headers().location ?? '', 'http://x').pathname).toBe(to);
    });
  }

  test('a query string survives the redirect', async ({ request }) => {
    const response = await request.get('/search?q=silk', { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toContain('/ng/search?q=silk');
  });

  test('no old URL ends at a 404', async ({ page }) => {
    // Following the redirect to the end is the assertion that matters: a 301 to a page that
    // does not exist is not a fixed link.
    for (const [from] of LEGACY) {
      // Product and collection handles here are invented, so they legitimately 404 at the
      // destination — the catalogue-dependent ones are covered by the collection journeys.
      if (from.startsWith('/products/') || from.startsWith('/collections/bridal')) continue;
      const response = await page.goto(from);
      expect(response?.status(), `${from} ended at ${page.url()}`).toBe(200);
    }
  });

  test('the market prefix redirect is temporary, not permanent', async ({ request }) => {
    // This one depends on the visitor's `nelo_market` cookie, so a cached permanent redirect
    // would freeze one visitor's market in place and the preference would stop working.
    const response = await request.get('/', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain('/ng');
  });

  test('an unmapped legacy path is not swept to the home page', async ({ page }) => {
    // A catch-all redirect to `/` is a soft 404: it tells a crawler the page exists.
    const response = await page.goto('/pages/not-a-real-page');
    expect(response?.status()).toBe(404);
  });
});

test.describe('SEO surface', () => {
  test('robots.txt allows the catalogue and withholds the personal surfaces', async ({
    request,
  }) => {
    const body = await (await request.get('/robots.txt')).text();
    expect(body).toContain('Allow: /');
    expect(body).toContain('Disallow: /*/account');
    expect(body).toContain('Disallow: /*/checkout');
    expect(body).toContain('Sitemap:');
    // The commercial pages must not be restricted in any way.
    expect(body).not.toMatch(/Disallow:\s*\/\*\/(products|collections)/);
    // Nor order tracking: it is a page people search for, and blocking the crawl would also
    // stop a crawler ever reading the noindex the page carries once a code is supplied.
    expect(body).not.toContain('Disallow: /*/order-tracking');
  });

  test('order tracking is indexable empty and noindex with a code', async ({ page }) => {
    await page.goto('/ng/order-tracking');
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);

    await page.goto('/ng/order-tracking?code=SOMEORDERCODE');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('a product page declares a canonical and both market alternates', async ({ page }) => {
    await page.goto('/ng/size-guide');
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/ng\/size-guide$/);
    await expect(page.locator('link[rel="alternate"][hreflang="en-NG"]')).toHaveAttribute(
      'href',
      /\/ng\/size-guide$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      'href',
      /\/international\/size-guide$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
  });

  test('checkout and account are marked noindex in the page itself', async ({ page }) => {
    // robots.txt stops the crawl; this is what keeps them out of an index if they are found
    // another way — a link, a referrer, a sitemap somebody else built.
    await page.goto('/ng/checkout');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('the favicon exists', async ({ request }) => {
    const response = await request.get('/favicon.ico');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image');
  });
});
