import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccountShell } from '@/features/account/AccountShell';
import { SignOutButton } from '@/features/account/SignOutButton';
import { isMarket } from '@/lib/vendure/channels';
import { getActiveCustomer } from '@/lib/vendure/customer';

export const metadata: Metadata = { title: 'Sign out', robots: { index: false } };

/**
 * Sign out.
 *
 * Visiting this URL does not sign anyone out — the button does, over POST. A GET that ends a
 * session can be fired by any third-party page that embeds the URL, so the route asks first.
 */
export default async function LogoutPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  const { customer } = await getActiveCustomer(market);

  if (!customer) {
    return (
      <AccountShell market={market} title="Signed out" showNav={false}>
        <div className="empty">
          <span className="lab">Signed out</span>
          <h2>You are not signed in</h2>
          <p>Nothing to do here. Your bag is unaffected.</p>
          <Link className="btn-q" href={`/${market}`}>
            Continue shopping
          </Link>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell market={market} title="Sign out" showNav={false}>
      <div className="authwrap">
        <p className="lead">
          Signing out ends this session on Vendure and clears the cookie in this browser.
          Anything in your bag stays with your account.
        </p>
        <div className="acts-row">
          <SignOutButton market={market} className="btn" />
          <Link className="btn-q" href={`/${market}/account`}>
            Stay signed in
          </Link>
        </div>
      </div>
    </AccountShell>
  );
}
