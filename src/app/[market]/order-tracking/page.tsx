import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPage } from '@/features/content/ContentPage';
import { contentMetadata } from '@/features/content/metadata';
import { OrderDetailView } from '@/features/orders/OrderDetailView';
import { orderState } from '@/features/orders/presentation';
import { isMarket, type Market } from '@/lib/vendure/channels';
import { OrderByCodeDocument, type OrderDetailFragment } from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

/**
 * Indexable empty, noindex with a code.
 *
 * The bare page is a landing page people search for and it is linked from the footer, so it
 * should be indexed. A URL carrying somebody's order code should not be — not because it
 * leaks anything (Vendure decides who may read an order) but because there is no reason for
 * one customer's lookup to end up in a search index.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [metadata, raw] = await Promise.all([
    contentMetadata(params, {
      path: '/order-tracking',
      title: 'Track an order',
      description:
        'Look up a Nelo Woman order by its code. The state shown is the store’s own record.',
    }),
    searchParams,
  ]);

  return raw.code ? { ...metadata, robots: { index: false, follow: true } } : metadata;
}

// Reads a session-bearing query, so nothing here may be cached or prerendered.
export const dynamic = 'force-dynamic';
export const fetchCache = 'only-no-store';

/**
 * Track an order.
 *
 * `orderByCode` with no account required — which is exactly the case the live Shopify site
 * had a page for and the account pages do not cover.
 *
 * Vendure's own rule is the access control, and it is worth stating plainly on the page
 * rather than surprising someone: a signed-in customer can read their own orders forever, and
 * a guest can read an order for two hours after placing it. After that the code alone is not
 * enough, and the honest answer is to ask us — not to build a lookup that would let anyone
 * enumerate order codes.
 */
export default async function OrderTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  const raw = await searchParams;
  const codeRaw = Array.isArray(raw.code) ? raw.code[0] : raw.code;
  // Vendure order codes are short and opaque. Anything long is not one, and trimming the
  // input at 64 keeps a pasted email signature from becoming a query.
  const code = codeRaw?.trim().slice(0, 64) ?? '';

  let order: OrderDetailFragment | null = null;
  let reachable = true;
  if (code) {
    try {
      const { data } = await vendureQuery(OrderByCodeDocument, { code }, { market });
      order = data.orderByCode;
    } catch {
      reachable = false;
    }
  }

  return (
    <ContentPage
      market={market}
      eyebrow="Care"
      title="Track an order"
      standfirst="Enter the code from your confirmation. What you see is the store’s own record of the order, not an estimate."
      aside={
        <>
          <span className="lab">Who can see what</span>
          <h2>Access</h2>
          <ul>
            <li>Signed in — every order on your account, always</li>
            <li>Guest — the order you just placed, for two hours</li>
            <li>After that, ask us and we will look it up</li>
          </ul>
        </>
      }
    >
      <TrackForm market={market} code={code} />

      {!code ? (
        <p className="mnote">
          Your code is in the subject line of your confirmation email and at the top of the
          order page. It looks like <span className="num">A1B2C3D4E5F6G7H8</span>.
        </p>
      ) : !reachable ? (
        <div className="notice notice-error" role="alert">
          We could not reach the store to look that up. Nothing is wrong with your order —
          try again in a moment.
        </div>
      ) : !order ? (
        <div className="empty" style={{ textAlign: 'left', alignItems: 'flex-start' }}>
          <span className="lab">Not found</span>
          <h2>We cannot show you that order from here</h2>
          <p>
            Either the code does not match an order, or it does but this browser is not
            allowed to read it — a guest order can only be opened for two hours after it is
            placed.
          </p>
          <div className="acts-row">
            <Link className="btn-q" href={`/${market}/account/login`}>
              Sign in
            </Link>
            <Link className="btn-q" href={`/${market}/contact`}>
              Ask us to look it up
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="notice notice-ok" role="status">
            {orderState(order.state).label}
            {orderState(order.state).note ? ` — ${orderState(order.state).note}` : ''}
          </div>
          <OrderDetailView order={order} market={market} />
        </>
      )}
    </ContentPage>
  );
}

/** A GET form: the code goes in the URL so the lookup can be reloaded and shared with us. */
function TrackForm({ market, code }: { market: Market; code: string }) {
  return (
    <form className="searchform" action={`/${market}/order-tracking`} method="get">
      <label className="sr" htmlFor="order-code">
        Order code
      </label>
      <input
        id="order-code"
        type="text"
        name="code"
        defaultValue={code}
        placeholder="Order code"
        maxLength={64}
        autoComplete="off"
        spellCheck={false}
      />
      <button className="btn-q" type="submit">
        Look it up
      </button>
    </form>
  );
}
