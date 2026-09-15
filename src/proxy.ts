import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_MARKET, isMarket } from '@/lib/vendure/channels';

/**
 * Next 16 renamed the `middleware` convention to `proxy`.
 *
 * Adds the market segment when one is absent. It does NOT resolve or change a market that
 * is already present.
 *
 * Geographic detection may *suggest* a market to a first-time visitor; per the backend
 * context it must never silently change one, and it must never alter a checkout in flight.
 * So: a request that already names a market passes through untouched — including an invalid
 * one, which the [market] layout turns into a 404 rather than a redirect.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first] = pathname.split('/');

  if (isMarket(first)) return NextResponse.next();

  const preferred = request.cookies.get('nelo_market')?.value;
  const market = isMarket(preferred) ? preferred : DEFAULT_MARKET;

  const url = request.nextUrl.clone();
  url.pathname = `/${market}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\..*).*)'],
};
