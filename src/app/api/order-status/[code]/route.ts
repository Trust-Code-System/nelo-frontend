import { NextResponse, type NextRequest } from 'next/server';
import { PAID_STATES } from '@/features/checkout/states';
import { isMarket } from '@/lib/vendure/channels';
import { OrderByCodeDocument } from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

/**
 * Order payment status, for polling only.
 *
 * This is the ONE Route Handler in the storefront, and it exists for a reason that Server
 * Components cannot cover: after a hosted payment redirect the browser has to ask "has the
 * backend confirmed this yet?" repeatedly, without re-rendering the page each time. Server
 * Components still read Vendure directly and never call this.
 *
 * What it returns is deliberately almost nothing: a state string and two booleans. No
 * totals, no lines, no address, no customer. A polling endpoint is the easiest thing in a
 * storefront to point at somebody else's order code, so it must not be a way to read one.
 * Vendure's own rules still apply on top - a customer sees their own orders, and a guest
 * order only within two hours - so an order that is not the caller's comes back as unknown.
 *
 * The `reference` a payment provider puts in a return URL never reaches this: the code in
 * the path is the storefront's own order code, and only the state Vendure reports counts.
 */

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const market = request.nextUrl.searchParams.get('market');

  if (!isMarket(market)) {
    return NextResponse.json({ error: 'unknown market' }, { status: 400 });
  }
  // Vendure order codes are short and opaque. A long or empty value is not one.
  if (!code || code.length > 64) {
    return NextResponse.json({ error: 'unknown order' }, { status: 400 });
  }

  try {
    const { data } = await vendureQuery(OrderByCodeDocument, { code }, { market });
    const order = data.orderByCode;

    if (!order) {
      return NextResponse.json(
        { known: false, paid: false, state: null },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      {
        known: true,
        state: order.state,
        paid: PAID_STATES.has(order.state),
        // Terminal for polling purposes: no amount of waiting will change a cancelled order.
        terminal: PAID_STATES.has(order.state) || order.state === 'Cancelled',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    // Deliberately not 500 with detail. The poller treats this as "ask again", and the
    // upstream reason belongs in the server log, not in a response body.
    return NextResponse.json(
      { known: false, paid: false, state: null, retry: true },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
