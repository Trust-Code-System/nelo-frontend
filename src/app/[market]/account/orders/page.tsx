import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AccountShell,
  AccountUnavailable,
  SignInRequired,
} from '@/features/account/AccountShell';
import { dateZoneLabel, formatOrderDate, orderState } from '@/features/orders/presentation';
import { formatMoney, isMarket } from '@/lib/vendure/channels';
import { CustomerOrdersDocument, type CustomerOrdersQuery } from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export const metadata: Metadata = { title: 'Your orders' };

type OrderRow = NonNullable<CustomerOrdersQuery['activeCustomer']>['orders']['items'][number];

const PAGE_SIZE = 20;

/**
 * Order history.
 *
 * Read from `activeCustomer.orders`, sorted newest first by Vendure. Orders still in
 * `AddingItems` are filtered out: that state is a bag, not an order, and listing it here
 * would show a customer an "order" they never placed.
 */
export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  const raw = await searchParams;
  const pageRaw = Number(Array.isArray(raw.page) ? raw.page[0] : raw.page);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw < 1000 ? pageRaw : 1;

  let orders: OrderRow[] | null = null;
  let total = 0;
  let signedIn = false;
  let reachable = true;

  try {
    const { data } = await vendureQuery(
      CustomerOrdersDocument,
      {
        options: {
          take: PAGE_SIZE,
          skip: (page - 1) * PAGE_SIZE,
          sort: { orderPlacedAt: 'DESC' },
          // A bag is not an order. Vendure keeps the active order in the same collection,
          // so it is excluded here rather than in the render.
          filter: { active: { eq: false } },
        },
      },
      { market },
    );
    signedIn = Boolean(data.activeCustomer);
    orders = data.activeCustomer?.orders.items ?? [];
    total = data.activeCustomer?.orders.totalItems ?? 0;
  } catch {
    reachable = false;
  }

  if (!reachable) {
    return (
      <AccountShell market={market} title="Your orders" showNav={false}>
        <AccountUnavailable market={market} />
      </AccountShell>
    );
  }

  if (!signedIn) {
    return (
      <AccountShell market={market} title="Your orders" showNav={false}>
        <SignInRequired
          market={market}
          returnTo={`/${market}/account/orders`}
          reason="Sign in to see your order history."
        />
      </AccountShell>
    );
  }

  const list = orders ?? [];
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AccountShell
      market={market}
      title="Your orders"
      current="/orders"
      meta={
        <span>
          {total} {total === 1 ? 'order' : 'orders'}
        </span>
      }
    >
      {list.length === 0 ? (
        <div className="empty">
          <span className="lab">Nothing yet</span>
          <h2>No orders on this account</h2>
          <p>
            Anything you order will appear here with its state, and stay here after it is
            delivered.
          </p>
          <Link className="btn-q" href={`/${market}`}>
            View the collection
          </Link>
        </div>
      ) : (
        <>
          <table className="rows">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Placed</th>
                <th scope="col">State</th>
                <th scope="col">Items</th>
                <th scope="col" className="num">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((order) => {
                const state = orderState(order.state);
                return (
                  <tr key={order.id}>
                    <td data-label="Order">
                      <Link className="ordcode num" href={`/${market}/account/orders/${order.code}`}>
                        {order.code}
                      </Link>
                    </td>
                    <td data-label="Placed" className="num">
                      {formatOrderDate(order.orderPlacedAt ?? order.createdAt, market)}
                    </td>
                    <td data-label="State">
                      <span className="pill">{state.label}</span>
                    </td>
                    <td data-label="Items" className="num">
                      {order.totalQuantity}
                    </td>
                    <td data-label="Total" className="num">
                      {formatMoney(order.totalWithTax, market)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mnote">{dateZoneLabel(market)}</p>

          {lastPage > 1 ? (
            <nav className="pager" aria-label="Pages">
              {page > 1 ? (
                <Link href={`/${market}/account/orders?page=${page - 1}`}>← Newer</Link>
              ) : (
                <span aria-disabled="true">← Newer</span>
              )}
              <span className="num">
                Page {page} of {lastPage}
              </span>
              {page < lastPage ? (
                <Link href={`/${market}/account/orders?page=${page + 1}`}>Older →</Link>
              ) : (
                <span aria-disabled="true">Older →</span>
              )}
            </nav>
          ) : null}
        </>
      )}
    </AccountShell>
  );
}
