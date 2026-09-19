import { describe, expect, it } from 'vitest';
import { legacyRedirect } from './legacy-redirects';

/**
 * The redirect map is the highest commercial risk in the replatform, so it is the one piece
 * of routing logic with unit tests rather than only a browser journey: a 404 on an old URL
 * costs a sale and a ranking, and it fails silently.
 */

describe('legacyRedirect', () => {
  it('maps the pages the live site links, including the one that is already a 404', () => {
    // /pages/consultation is a hard 404 on the live Shopify site today and is linked three
    // times from its homepage, so it is the old URL most certainly receiving traffic.
    expect(legacyRedirect('/pages/consultation')).toBe('/ng/atelier');
    expect(legacyRedirect('/pages/nelo-bridal')).toBe('/ng/atelier');
    expect(legacyRedirect('/pages/about-us')).toBe('/ng/about');
    expect(legacyRedirect('/pages/contact')).toBe('/ng/contact');
    expect(legacyRedirect('/pages/order-tracking')).toBe('/ng/order-tracking');
  });

  it('carries a product or collection handle onto the market-prefixed path', () => {
    expect(legacyRedirect('/products/adele-set')).toBe('/ng/products/adele-set');
    expect(legacyRedirect('/collections/bridal')).toBe('/ng/collections/bridal');
  });

  it('collapses a product nested under a collection onto the product itself', () => {
    expect(legacyRedirect('/collections/bridal/products/bloom')).toBe('/ng/products/bloom');
  });

  it('is case-insensitive and tolerates a trailing slash', () => {
    expect(legacyRedirect('/Pages/About-Us/')).toBe('/ng/about');
    expect(legacyRedirect('/PRODUCTS/ADELE-SET')).toBe('/ng/products/adele-set');
  });

  it('preserves the query string', () => {
    expect(legacyRedirect('/search', '?q=silk')).toBe('/ng/search?q=silk');
    expect(legacyRedirect('/collections/bridal', '?page=2')).toBe('/ng/collections/bridal?page=2');
  });

  it('returns null rather than sweeping an unknown path to the home page', () => {
    // A catch-all redirect to `/` is a soft 404: it tells a crawler a page exists when it
    // does not, and strands the visitor somewhere they did not ask for.
    expect(legacyRedirect('/pages/not-a-real-page')).toBeNull();
    expect(legacyRedirect('/blogs/news/some-post')).toBeNull();
    expect(legacyRedirect('/')).toBeNull();
  });

  it('refuses a handle that is not one segment', () => {
    // Forwarding this would move the 404 to a different address rather than avoiding it.
    expect(legacyRedirect('/collections/a/b')).toBeNull();
    expect(legacyRedirect('/products/a/b/c')).toBeNull();
  });

  it('refuses handles with characters a Shopify handle cannot contain', () => {
    expect(legacyRedirect('/products/adele set')).toBeNull();
    expect(legacyRedirect('/products/../../etc/passwd')).toBeNull();
    expect(legacyRedirect('/products/%2e%2e')).toBeNull();
  });

  it('refuses a path that is not a path, or is absurdly long', () => {
    expect(legacyRedirect('https://evil.example/products/x')).toBeNull();
    expect(legacyRedirect(`/products/${'a'.repeat(600)}`)).toBeNull();
  });

  it('never returns a target outside the storefront', () => {
    // Every target must be a same-origin path. A redirect map is a natural place for an
    // open redirect to hide, so this asserts the shape rather than trusting the table.
    const probes = [
      '/pages/about-us',
      '/pages/consultation',
      '/products/x',
      '/collections/x',
      '/cart',
      '/search',
      '/account/login',
    ];
    for (const probe of probes) {
      const target = legacyRedirect(probe);
      expect(target).toMatch(/^\/[a-z]/);
      expect(target?.startsWith('//')).toBe(false);
    }
  });
});
