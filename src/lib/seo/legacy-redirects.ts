import { DEFAULT_MARKET } from '@/lib/vendure/channels';

/**
 * The Shopify redirect map.
 *
 * This is the single largest risk in the replatform - larger than anything in the redesign.
 * Every URL the old store had is in somebody's search index, somebody's bookmarks and
 * somebody's WhatsApp message, and a 404 there is a lost sale plus a lost ranking that takes
 * months to earn back.
 *
 * Two decisions are worth stating, because they look like mistakes otherwise:
 *
 * 1. **Legacy URLs resolve to the DEFAULT market, not to the visitor's preferred one.**
 *    A 301 is permanent: browsers and crawlers cache it and stop asking. A 301 whose target
 *    depends on a cookie would therefore be cached with one visitor's market baked in, and
 *    the preference would silently stop working. So these targets are deterministic, and a
 *    visitor who wants the other market uses the switcher in the header - which is a
 *    navigation, visible in the address bar, exactly as the market rules require.
 *
 * 2. **An unmapped legacy path is NOT swept to the home page.** Redirecting everything
 *    unknown to `/` is a soft 404: it tells a crawler the page exists when it does not, and
 *    it strands a visitor somewhere they did not ask for. Unmapped paths fall through to the
 *    ordinary market resolution and 404 honestly if there is nothing there.
 *
 * `/pages/consultation` is in this map even though it is a hard 404 on the live site today.
 * It is linked three times from the current homepage, so it is the one old URL guaranteed to
 * be receiving traffic already - and it now lands somewhere real.
 */

/** Exact old path → new path. Compared after lowercasing and stripping a trailing slash. */
const EXACT: Readonly<Record<string, string>> = {
  '/pages/about-us': `/${DEFAULT_MARKET}/about`,
  '/pages/about': `/${DEFAULT_MARKET}/about`,
  '/pages/contact': `/${DEFAULT_MARKET}/contact`,
  '/pages/contact-us': `/${DEFAULT_MARKET}/contact`,
  '/pages/order-tracking': `/${DEFAULT_MARKET}/order-tracking`,
  '/pages/track-your-order': `/${DEFAULT_MARKET}/order-tracking`,
  '/pages/shipping': `/${DEFAULT_MARKET}/shipping`,
  '/pages/shipping-policy': `/${DEFAULT_MARKET}/shipping`,
  '/pages/returns': `/${DEFAULT_MARKET}/returns`,
  '/pages/refund-policy': `/${DEFAULT_MARKET}/returns`,
  '/pages/size-guide': `/${DEFAULT_MARKET}/size-guide`,
  '/pages/size-chart': `/${DEFAULT_MARKET}/size-guide`,

  // The atelier absorbs three old pages: bridal, bespoke and the consultation booking page.
  // They are one surface now because they are one process.
  '/pages/nelo-bridal': `/${DEFAULT_MARKET}/atelier`,
  '/pages/bridal': `/${DEFAULT_MARKET}/atelier`,
  '/pages/bespoke': `/${DEFAULT_MARKET}/atelier`,
  '/pages/consultation': `/${DEFAULT_MARKET}/atelier`,
  '/pages/book-a-consultation': `/${DEFAULT_MARKET}/atelier`,

  // Shopify's own fixed routes.
  '/collections/all': `/${DEFAULT_MARKET}/collections`,
  '/collections': `/${DEFAULT_MARKET}/collections`,
  '/cart': `/${DEFAULT_MARKET}/cart`,
  '/search': `/${DEFAULT_MARKET}/search`,
  '/account': `/${DEFAULT_MARKET}/account`,
  '/account/login': `/${DEFAULT_MARKET}/account/login`,
  '/account/register': `/${DEFAULT_MARKET}/account/register`,
  '/account/addresses': `/${DEFAULT_MARKET}/account/addresses`,
  '/account/orders': `/${DEFAULT_MARKET}/account/orders`,
};

/**
 * Old path prefix → new path prefix, for the two shapes that carry a handle.
 *
 * Shopify also serves a product nested under a collection - `/collections/x/products/y` -
 * and that collapses to the product, because the product page is the canonical one either
 * way and the collection adds nothing to it.
 */
const PREFIXES: readonly { from: string; to: string }[] = [
  { from: '/products/', to: `/${DEFAULT_MARKET}/products/` },
  { from: '/collections/', to: `/${DEFAULT_MARKET}/collections/` },
];

/** A Shopify handle: lowercase letters, digits and hyphens. Anything else is not one. */
const HANDLE = /^[a-z0-9][a-z0-9-]{0,120}$/;

/**
 * Resolves a legacy path, or null when there is nothing to redirect to.
 *
 * `search` is carried through when present so `/search?q=silk` keeps its query and
 * `/collections/x?page=2` keeps its paging.
 */
export function legacyRedirect(pathname: string, search = ''): string | null {
  const normalised = normalise(pathname);
  if (!normalised) return null;

  const exact = EXACT[normalised];
  if (exact) return exact + search;

  // A product nested under a collection resolves to the product itself.
  const nested = /^\/collections\/[a-z0-9-]+\/products\/([a-z0-9-]+)$/.exec(normalised);
  if (nested?.[1] && HANDLE.test(nested[1])) {
    return `/${DEFAULT_MARKET}/products/${nested[1]}${search}`;
  }

  for (const { from, to } of PREFIXES) {
    if (!normalised.startsWith(from)) continue;
    const handle = normalised.slice(from.length);
    // One segment only. `/collections/a/b` is not a collection handle, and forwarding it
    // would create a URL that 404s at a different address instead of at this one.
    if (HANDLE.test(handle)) return to + handle + search;
  }

  return null;
}

function normalise(pathname: string): string | null {
  if (!pathname.startsWith('/') || pathname.length > 512) return null;
  const lower = pathname.toLowerCase();
  // A trailing slash is the same resource. `/` itself is not a legacy path.
  const trimmed = lower.length > 1 && lower.endsWith('/') ? lower.slice(0, -1) : lower;
  return trimmed === '/' ? null : trimmed;
}

/** Everything the map can send a visitor to, for the sitemap and for the tests. */
export const LEGACY_TARGETS: readonly string[] = [...new Set(Object.values(EXACT))];
