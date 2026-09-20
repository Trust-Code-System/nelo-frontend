import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccountShell, AccountUnavailable } from '@/features/account/AccountShell';
import { OrderDetailView } from '@/features/orders/OrderDetailView';
import { isMarket } from '@/lib/vendure/channels';
import { OrderByCodeDocument, type OrderDetailFragment } from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return { title: `Order ${code}`, robots: { index: false } };
}

/**
 * One order.
 *
 * Read by CODE through `orderByCode`, never through `activeOrder`. That is the whole point:
 * once payment completes the order stops being active, so a detail page built on
 * `activeOrder` would go blank at the exact moment the customer most wants to look at it.
 *
 * Vendure enforces who may read what - a signed-in customer's own orders, and a guest order
 * only within two hours of placing it. An order that is not the caller's simply comes back
 * null, which is a 404 here rather than a message that confirms the code exists.
 */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ market: string; code: string }>;
}) {
  const { market, code } = await params;
  if (!isMarket(market)) notFound();

  let order: OrderDetailFragment | null = null;
  let reachable = true;

  try {
    const { data } = await vendureQuery(OrderByCodeDocument, { code }, { market });
    order = data.orderByCode;
  } catch {
    reachable = false;
  }

  if (!reachable) {
    return (
      <AccountShell market={market} title={`Order ${code}`} showNav={false}>
        <AccountUnavailable market={market} />
      </AccountShell>
    );
  }

  if (!order) notFound();

  return (
    <AccountShell
      market={market}
      title={`Order ${order.code}`}
      eyebrow="Order"
      current="/orders"
      meta={
        <span>
          {order.totalQuantity} {order.totalQuantity === 1 ? 'item' : 'items'}
        </span>
      }
    >
      <OrderDetailView order={order} market={market} />

      <div className="acts-row">
        <Link className="btn-q" href={`/${market}/account/orders`}>
          All orders
        </Link>
        <Link className="btn-q" href={`/${market}/contact`}>
          Ask about this order
        </Link>
      </div>
    </AccountShell>
  );
}
