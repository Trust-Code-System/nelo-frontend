import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccountShell } from '@/features/account/AccountShell';
import { ActionForm } from '@/features/account/ActionForm';
import { confirmEmailChange } from '@/features/account/actions';
import { isMarket } from '@/lib/vendure/channels';

export const metadata: Metadata = { title: 'Confirm your new email', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function ConfirmEmailPage({ params, searchParams }: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();
  const raw = (await searchParams).token;
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? '';
  return (
    <AccountShell market={market} title="Confirm your new email" showNav={false}>
      <div className="authwrap">
        {token ? <>
          <p className="lead">Confirm that you want to use this email address for your account.</p>
          <ActionForm action={confirmEmailChange} hidden={{ market, token }} fields={[]}
            replaceOnSuccess submitLabel="Confirm email change" pendingLabel="Confirming…" />
        </> : <>
          <h2>This confirmation link is incomplete</h2>
          <p>Open the full link in your latest email, or request a new one from your account.</p>
        </>}
        <p className="mnote"><Link href={`/${market}/account/email`}>Request a new link</Link></p>
        <p className="mnote"><Link href={`/${market}/account/login`}>Sign in</Link></p>
      </div>
    </AccountShell>
  );
}
