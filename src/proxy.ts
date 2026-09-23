import { NextResponse, type NextRequest } from 'next/server';
import { legacyRedirect } from '@/lib/seo/legacy-redirects';
import { DEFAULT_MARKET, isMarket } from '@/lib/vendure/channels';

/**
 * Next 16 renamed the `middleware` convention to `proxy`.
 *
 * Two jobs, in this order:
 *
 * 1. **Shopify legacy URLs → 301.** Permanent, because they are permanent: the old store is
 *    gone and every one of those URLs is in a search index. The targets are deterministic
 *    (see lib/seo/legacy-redirects) precisely because a 301 is cached forever.
 *
 * 2. **Add the market segment when one is absent → 307.** Deliberately TEMPORARY, and the
 *    difference matters: this target depends on the visitor's `nelo_market` cookie, so a
 *    permanent redirect would be cached with one market baked in and the preference would
 *    stop working from then on. A 307 keeps the decision live on every request.
 *
 * What this never does is resolve or change a market that is already present. Geographic
 * detection may *suggest* a market to a first-time visitor; per the backend context it must
 * never silently change one, and it must never alter a checkout in flight. So a request that
 * already names a market passes through untouched - including an invalid one, which the
 * [market] layout turns into a 404 rather than a redirect to the default Channel.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, first] = pathname.split('/');

  // The backend has one fixed Paystack callback URL without a market segment. Its Route
  // Handler restores the market from the short-lived HttpOnly checkout hint, so rewriting
  // it here would bypass the handler and land on a non-existent market route.
  if (pathname === '/checkout/payment-return') return NextResponse.next();

  if (isMarket(first)) return NextResponse.next();

  // Legacy first: `/collections/bridal` is both a Shopify URL and an unprefixed path, and it
  // must get the permanent redirect rather than the temporary market one.
  const legacy = legacyRedirect(pathname, search);
  if (legacy) {
    const target = request.nextUrl.clone();
    const [targetPath, targetSearch = ''] = legacy.split('?');
    target.pathname = targetPath ?? legacy;
    target.search = targetSearch ? `?${targetSearch}` : '';
    return NextResponse.redirect(target, 301);
  }

  const preferred = request.cookies.get('nelo_market')?.value;
  const market = isMarket(preferred) ? preferred : DEFAULT_MARKET;

  const url = request.nextUrl.clone();
  url.pathname = `/${market}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
};
