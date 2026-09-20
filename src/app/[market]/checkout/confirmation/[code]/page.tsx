import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { PaymentStatusPoll } from '@/features/checkout/PaymentStatusPoll';
import { PAID_STATES } from '@/features/checkout/states';
import { OrderDetailView } from '@/features/orders/OrderDetailView';
import { isMarket } from '@/lib/vendure/channels';
import { OrderByCodeDocument, type OrderDetailFragment } from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export const metadata: Metadata = { title: 'Order confirmation', robots: { index: false } };

export const dynamic = 'force-dynamic';
export const fetchCache = 'only-no-store';

/**
 * After checkout.
 *
 * Read by code, because the order is no longer active - that is precisely what completing a
 * checkout means. A confirmation page built on `activeOrder` shows an empty bag here.
 *
 * There are two outcomes and they look different on purpose:
 *
 *   - Vendure reports a paid state → this is a receipt.
 *   - Anything else → this is a "confirming payment" screen with a bounded poll. It is not
 *     dressed up as a receipt, because a `reference` in a return URL is a hint from the
 *     browser and the only thing that counts is the backend's own record.
 */
export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string; code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market, code } = await params;
  if (!isMarket(market)) notFound();

  // A payment provider may append its own reference on return. It is read only so the screen
  // can acknowledge that the customer came back from somewhere - it is never matched against
  // anything, never stored, and never used to decide that an order is paid.
  const raw = await searchParams;
  const returnedFromProvider = Boolean(raw.reference ?? raw.trxref);

  let order: OrderDetailFragment | null = null;
  let reachable = true;
  try {
    const { data } = await vendureQuery(OrderByCodeDocument, { code }, { market });
    order = data.orderByCode;
  } catch {
    reachable = false;
  }

  const paid = Boolean(order && PAID_STATES.has(order.state));

  return (
    <>
      <SiteHeader
        market={market}
        announcement={paid ? 'Thank you - your order is with the atelier' : 'Confirming your order'}
      />

      <main className="shell">
        <div className="proj-head">
          <div>
            <span className="lab">{paid ? 'Order confirmed' : 'Order pending'}</span>
            <h1>{paid ? 'Thank you' : 'Confirming your payment'}</h1>
            <p className="masthead-copy">
              {paid
                ? 'Your order is with the atelier. We will keep you informed as it progresses.'
                : 'We are checking the payment status and will update this order shortly.'}
            </p>
          </div>
          <div className="proj-meta">
            <span className="num">{code}</span>
          </div>
        </div>

        <section className="section-gap">
          {!reachable ? (
            <div className="empty" style={{ textAlign: 'left', alignItems: 'flex-start' }}>
              <span className="lab">Temporarily unavailable</span>
              <h2>We cannot reach the store to confirm this</h2>
              <p>
                Your order code is <span className="num">{code}</span>. Keep it - nothing is
                lost, and we can look it up.
              </p>
            </div>
          ) : (
            <>
              {/* Rendered whenever the order is not confirmed paid, including when the
                  customer has just come back from a provider redirect. */}
              {!paid ? (
                <PaymentStatusPoll market={market} code={code} alreadyPaid={false} />
              ) : null}

              {paid && order ? (
                <>
                  <p className="lead">
                    We have your order and payment is recorded. A confirmation is on its way to{' '}
                    {order.customer?.emailAddress ?? 'your email address'}.
                  </p>
                  <OrderDetailView order={order} market={market} />
                  <div className="acts-row">
                    <Link className="btn-q" href={`/${market}/account/orders`}>
                      Your orders
                    </Link>
                    <Link className="btn-q" href={`/${market}`}>
                      Keep looking
                    </Link>
                  </div>
                </>
              ) : null}

              {returnedFromProvider && !paid ? (
                <p className="mnote">
                  You have just come back from our payment provider. The reference in that
                  link tells us you were there; it does not tell us you were charged, so we
                  are asking the store directly.
                </p>
              ) : null}
            </>
          )}
        </section>

      </main>

      <SiteFooter market={market} />
    </>
  );
}
