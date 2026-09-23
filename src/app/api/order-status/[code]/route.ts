import { NextResponse, type NextRequest } from 'next/server';
import { isPaystackReference, paystackAttemptState } from '@/features/checkout/paystack';
import { isMarket } from '@/lib/vendure/channels';
import { PaystackPaymentStatusDocument } from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

/**
 * Order payment status, for polling only.
 *
 * This is the ONE Route Handler in the storefront, and it exists for a reason that Server
 * Components cannot cover: after a hosted payment redirect the browser has to ask "has the
 * backend confirmed this yet?" repeatedly, without re-rendering the page each time. Server
 * Components still read Vendure directly and never call this.
 *
 * What it returns is deliberately almost nothing: an attempt status and two booleans. No
 * totals, no lines, no address, no customer. A polling endpoint is the easiest thing in a
 * storefront to point at somebody else's order code, so it must not be a way to read one.
 * Vendure's custom status query applies the active-session rule while an Order is pending
 * and the native Order-by-code rule after placement. A different session receives no data.
 */

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const market = request.nextUrl.searchParams.get('market');
  const reference = request.nextUrl.searchParams.get('reference');

  if (!isMarket(market)) {
    return NextResponse.json({ error: 'unknown market' }, { status: 400 });
  }
  // Vendure order codes are short and opaque. A long or empty value is not one.
  if (!code || code.length > 64) {
    return NextResponse.json({ error: 'unknown order' }, { status: 400 });
  }
  if (!isPaystackReference(reference)) {
    return NextResponse.json({ error: 'unknown payment' }, { status: 400 });
  }

  try {
    const { data } = await vendureQuery(
      PaystackPaymentStatusDocument,
      { orderCode: code, reference },
      { market },
    );
    const attempt = data.paystackPaymentStatus;
    const state = paystackAttemptState(attempt.status);

    return NextResponse.json(
      {
        known: true,
        state: attempt.status,
        paid: state.paid,
        terminal: state.terminal,
        errorCode: attempt.errorCode,
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
