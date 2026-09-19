import { MARKETS, type Market } from '@/lib/vendure/channels';

/**
 * Absolute URLs for canonical tags, OpenGraph and the sitemap.
 *
 * `NELO_SITE_URL` is read server-side only. It is not a `NEXT_PUBLIC_` variable: nothing in
 * the browser needs it, and every public env var is one more thing to audit.
 *
 * The fallback is localhost rather than a guess at the production domain. A canonical tag
 * pointing at the wrong host is worse than one pointing at an obviously local address — the
 * first quietly hands your ranking to a domain you do not control, the second is caught the
 * first time anyone looks.
 */
export function siteUrl(): string {
  const raw = process.env.NELO_SITE_URL ?? 'http://localhost:4310';
  return raw.replace(/\/+$/, '');
}

export function absolute(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * The `alternates` block for a page that exists in both markets.
 *
 * `canonical` is the market's own URL — the two markets are genuinely different pages, with
 * different currencies and different eligibility, so neither should claim to be the other.
 * `languages` then declares them as alternates of each other so a crawler can serve the
 * right one instead of picking.
 *
 * `x-default` points at the Nigerian market, because that is the default the proxy resolves
 * an unprefixed URL to and the house is in Lagos.
 */
export function marketAlternates(market: Market, pathWithinMarket: string) {
  const suffix = pathWithinMarket === '' || pathWithinMarket === '/' ? '' : pathWithinMarket;
  const languages: Record<string, string> = {};
  for (const candidate of MARKETS) {
    languages[hreflangFor(candidate)] = absolute(`/${candidate}${suffix}`);
  }
  languages['x-default'] = absolute(`/ng${suffix}`);

  return {
    canonical: absolute(`/${market}${suffix}`),
    languages,
  };
}

/** Both markets are English. What differs is the region, which is what hreflang encodes. */
export function hreflangFor(market: Market): string {
  return market === 'ng' ? 'en-NG' : 'en';
}
