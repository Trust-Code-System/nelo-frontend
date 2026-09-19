import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resetPassword } from '@/features/account/actions';
import { AccountShell } from '@/features/account/AccountShell';
import { ActionForm } from '@/features/account/ActionForm';
import { isMarket } from '@/lib/vendure/channels';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };

/**
 * Completes a password reset.
 *
 * The token stays in a hidden field rather than being re-read from the URL by the action:
 * the reset is a POST, and nothing about the new password ever travels in a query string.
 */
export default async function ResetPasswordPage({
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
      <AccountShell market={market} title="Choose a new password" showNav={false}>
        <div className="empty">
          <span className="lab">Link incomplete</span>
          <h2>This reset link is missing its token</h2>
          <p>Ask for a new link and use the most recent email — older links stop working.</p>
          <Link className="btn-q" href={`/${market}/account/password`}>
            Request a new link
          </Link>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell market={market} title="Choose a new password" showNav={false}>
      <div className="authwrap">
        <ActionForm
          action={resetPassword}
          hidden={{ market, token }}
          fields={[
            {
              name: 'password',
              label: 'New password',
              type: 'password',
              autoComplete: 'new-password',
              required: true,
              help: 'At least 8 characters.',
            },
            {
              name: 'confirmPassword',
              label: 'Confirm new password',
              type: 'password',
              autoComplete: 'new-password',
              required: true,
            },
          ]}
          submitLabel="Set new password"
          pendingLabel="Saving…"
        />
      </div>
    </AccountShell>
  );
}
