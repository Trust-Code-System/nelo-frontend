import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { changePassword, requestPasswordReset } from '@/features/account/actions';
import { AccountShell } from '@/features/account/AccountShell';
import { ActionForm } from '@/features/account/ActionForm';
import { isMarket } from '@/lib/vendure/channels';
import { getActiveCustomer } from '@/lib/vendure/customer';

export const metadata: Metadata = { title: 'Password' };

/**
 * One route, two jobs, decided by whether there is a customer.
 *
 * Signed in: change the password, which requires the current one — a session alone must not
 * be enough to take an account over.
 * Signed out: request a reset link. The confirmation is identical whether or not the address
 * is registered, because a different answer would let anyone test which emails have accounts.
 */
export default async function PasswordPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  const { customer } = await getActiveCustomer(market);

  if (customer) {
    return (
      <AccountShell market={market} title="Change your password" current="/password">
        <div className="authwrap">
          <ActionForm
            action={changePassword}
            hidden={{ market }}
            fields={[
              {
                name: 'currentPassword',
                label: 'Current password',
                type: 'password',
                autoComplete: 'current-password',
                required: true,
              },
              {
                name: 'newPassword',
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
            submitLabel="Change password"
            pendingLabel="Changing…"
          />
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell market={market} title="Reset your password" showNav={false}>
      <div className="authwrap">
        <p className="lead">
          Tell us the address on your account and we will send a link that lets you set a new
          password.
        </p>
        <ActionForm
          action={requestPasswordReset}
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
          submitLabel="Send reset link"
          pendingLabel="Sending…"
        />
        <p className="mnote">
          Remembered it? <Link href={`/${market}/account/login`}>Sign in</Link>.
        </p>
      </div>
    </AccountShell>
  );
}
