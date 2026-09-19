import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AccountShell,
  AccountUnavailable,
  SignInRequired,
} from '@/features/account/AccountShell';
import { SignOutButton } from '@/features/account/SignOutButton';
import { isMarket } from '@/lib/vendure/channels';
import { getActiveCustomer } from '@/lib/vendure/customer';

export const metadata: Metadata = { title: 'Your account' };

/**
 * Account overview.
 *
 * Identity comes from `activeCustomer` and nothing else. There is no local profile to fall
 * back on, which is the point: if Vendure says there is no customer for this session, there
 * is no customer, and the page says so rather than showing a stale name.
 */
export default async function AccountPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  const result = await getActiveCustomer(market);

  if (!result.reachable) {
    return (
      <AccountShell market={market} title="Your account" showNav={false}>
        <AccountUnavailable market={market} />
      </AccountShell>
    );
  }

  if (!result.customer) {
    return (
      <AccountShell market={market} title="Your account" showNav={false}>
        <SignInRequired
          market={market}
          returnTo={`/${market}/account`}
          reason="Sign in to see your orders, addresses and measurements."
        />
      </AccountShell>
    );
  }

  const customer = result.customer;

  return (
    <AccountShell
      market={market}
      title={`${customer.firstName} ${customer.lastName}`}
      current=""
      meta={<span>{customer.emailAddress}</span>}
    >
      <dl className="cart-totals" style={{ marginLeft: 0, maxWidth: '34rem' }}>
        <div className="spec">
          <dt>Name</dt>
          <dd>
            {customer.firstName} {customer.lastName}
          </dd>
        </div>
        <div className="spec">
          <dt>Email</dt>
          <dd>{customer.emailAddress}</dd>
        </div>
        <div className="spec">
          <dt>Phone</dt>
          {/* Vendure returns an empty string, not null, for a customer who gave no phone
              number — so `??` never fires and the row rendered blank. A missing value has
              to say it is missing. */}
          <dd>{customer.phoneNumber || 'Not given'}</dd>
        </div>
      </dl>

      <div className="acts-row">
        <Link className="btn-q" href={`/${market}/account/orders`}>
          Your orders
        </Link>
        <Link className="btn-q" href={`/${market}/account/addresses`}>
          Your addresses
        </Link>
        <SignOutButton market={market} />
      </div>
    </AccountShell>
  );
}
