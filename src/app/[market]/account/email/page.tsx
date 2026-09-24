import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AccountShell, AccountUnavailable, SignInRequired } from '@/features/account/AccountShell';
import { ActionForm } from '@/features/account/ActionForm';
import { requestEmailChange } from '@/features/account/actions';
import { isMarket } from '@/lib/vendure/channels';
import { getActiveCustomer } from '@/lib/vendure/customer';

export const metadata: Metadata = { title: 'Change your email', robots: { index: false } };

export default async function EmailPage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params;
  if (!isMarket(market)) notFound();
  const result = await getActiveCustomer(market);
  return (
    <AccountShell market={market} title="Change your email" current="/email" showNav={Boolean(result.customer)}>
      {!result.reachable ? <AccountUnavailable market={market} /> : !result.customer ?
        <SignInRequired market={market} returnTo={`/${market}/account/email`} /> :
        <div className="authwrap">
          <p className="lead">Your current email is {result.customer.emailAddress}. We will send a confirmation link to your new address.</p>
          <ActionForm action={requestEmailChange} hidden={{ market }} replaceOnSuccess
            fields={[
              { name: 'email', label: 'New email address', type: 'email', autoComplete: 'email', required: true },
              { name: 'password', label: 'Current password', type: 'password', autoComplete: 'current-password', required: true },
            ]} submitLabel="Send confirmation link" pendingLabel="Sending…" />
        </div>}
    </AccountShell>
  );
}
