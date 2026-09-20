import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resendVerification, verifyAccount } from '@/features/account/actions';
import { AccountShell } from '@/features/account/AccountShell';
import { ActionForm } from '@/features/account/ActionForm';
import { isMarket } from '@/lib/vendure/channels';

export const metadata: Metadata = { title: 'Verify your account', robots: { index: false } };

/**
 * Email verification.
 *
 * The token arrives in the URL, but verifying is a state change, so it happens on an
 * explicit POST rather than on page load. A GET that consumes a token can be triggered by a
 * link preview, a corporate mail scanner or a prefetch - all of which would burn the token
 * before the customer ever clicked it.
 */
export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  const raw = await searchParams;
  const token = (Array.isArray(raw.token) ? raw.token[0] : raw.token) ?? '';

  if (!token) {
    return (
      <AccountShell market={market} title="Verify your account" showNav={false}>
        <div className="authwrap">
          <p className="lead">
            This page needs the link from the email we sent you. If the link has expired, ask
            for a new one.
          </p>
          <ActionForm
            action={resendVerification}
            hidden={{ market }}
            replaceOnSuccess
            fields={[
              {
                name: 'email',
                label: 'Email',
                type: 'email',
                autoComplete: 'email',
                inputMode: 'email',
                required: true,
              },
            ]}
            submitLabel="Send a new link"
            pendingLabel="Sending…"
          />
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell market={market} title="Verify your account" showNav={false}>
      <div className="authwrap">
        <p className="lead">
          One step left. Confirming below proves the address is yours and signs you in.
        </p>
        <ActionForm
          action={verifyAccount}
          hidden={{ market, token }}
          fields={[
            {
              name: 'password',
              label: 'Choose a password (only if you have not set one)',
              type: 'password',
              autoComplete: 'new-password',
              help: 'Leave this empty if you chose a password when you registered.',
            },
          ]}
          submitLabel="Verify and sign in"
          pendingLabel="Verifying…"
        />
        <p className="mnote">
          Link expired? <Link href={`/${market}/account/verify`}>Request a new one</Link>.
        </p>
      </div>
    </AccountShell>
  );
}
