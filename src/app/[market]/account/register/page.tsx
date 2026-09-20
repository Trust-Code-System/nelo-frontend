import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { register } from '@/features/account/actions';
import { AccountShell, AuthLayout } from '@/features/account/AccountShell';
import { ActionForm } from '@/features/account/ActionForm';
import { safeReturnPath } from '@/features/account/state';
import { isMarket } from '@/lib/vendure/channels';
import { getActiveCustomer } from '@/lib/vendure/customer';

export const metadata: Metadata = { title: 'Create an account' };

/**
 * Registration.
 *
 * Registering does not sign anyone in. Vendure issues a verification token and emails it;
 * the account works once that link is followed. The form is replaced by that instruction on
 * success rather than redirecting to an account page the customer cannot yet see.
 */
export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  const raw = await searchParams;
  const next = safeReturnPath(Array.isArray(raw.next) ? raw.next[0] : raw.next, market);

  const { customer } = await getActiveCustomer(market);
  if (customer) redirect(next);

  return (
    <AccountShell market={market} title="Create an account" eyebrow="Account" showNav={false} variant="auth">
      <AuthLayout
        market={market}
        mode="register"
        title="Create your profile"
        intro="A private place for your fit, your wardrobe and every NELO order."
        aside={
          <>
            <span className="lab">What we do with this</span>
            <h2>Only what the garment needs</h2>
            <ul>
              <li>Your name and address are used to make and deliver what you order.</li>
              <li>Measurements are never put in a URL, never given to analytics, and never
                cached publicly.</li>
              <li>We confirm your email address before the account works, so nobody can
                register one in your name.</li>
            </ul>
          </>
        }
      >
        <p className="lead">
          An account keeps your measurements and addresses between visits, so a garment cut
          for you stays cut for you. You never need one to buy.
        </p>

        <ActionForm
          action={register}
          hidden={{ market }}
          replaceOnSuccess
          fields={[
            { name: 'firstName', label: 'First name', autoComplete: 'given-name', required: true },
            { name: 'lastName', label: 'Last name', autoComplete: 'family-name', required: true },
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              autoComplete: 'email',
              inputMode: 'email',
              required: true,
            },
            {
              name: 'phoneNumber',
              label: 'Phone (optional)',
              type: 'tel',
              autoComplete: 'tel',
              inputMode: 'tel',
              help: 'Used only for delivery and fitting arrangements.',
            },
            {
              name: 'password',
              label: 'Password',
              type: 'password',
              autoComplete: 'new-password',
              required: true,
              help: 'At least 8 characters.',
            },
          ]}
          submitLabel="Create account"
          pendingLabel="Creating…"
        />

        <p className="mnote">
          Already have an account?{' '}
          <Link href={`/${market}/account/login?next=${encodeURIComponent(next)}`}>Sign in</Link>.
        </p>
      </AuthLayout>
    </AccountShell>
  );
}
