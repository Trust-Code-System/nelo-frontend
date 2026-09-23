import { NextResponse, type NextRequest } from 'next/server';
import {
  PAYSTACK_RETURN_COOKIE,
  readPaymentReturnHint,
} from '@/features/checkout/payment-return';

export const dynamic = 'force-dynamic';

/**
 * Browser return target configured by the backend.
 *
 * The provider's query parameters and our short-lived cookie are navigation hints only.
 * They never mark an order paid; the confirmation screen asks Vendure for the attempt and
 * Vendure enforces session ownership before returning it.
 */
export async function GET(request: NextRequest) {
  const hint = await readPaymentReturnHint();

  if (!hint) {
    return NextResponse.redirect(new URL('/ng/checkout?payment=return-missing', request.url));
  }

  const destination = new URL(
    `/${hint.market}/checkout/confirmation/${encodeURIComponent(hint.orderCode)}`,
    request.url,
  );
  destination.searchParams.set('reference', hint.reference);

  const response = NextResponse.redirect(destination);
  response.cookies.delete(PAYSTACK_RETURN_COOKIE);
  return response;
}
