import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { login } from '@/features/account/actions';
import { AccountShell, AuthLayout } from '@/features/account/AccountShell';
import { ActionForm } from '@/features/account/ActionForm';
import { safeReturnPath } from '@/features/account/state';
import { isMarket } from '@/lib/vendure/channels';
import { getActiveCustomer } from '@/lib/vendure/customer';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * Sign in.
 *
 * The guest session is deliberately left in place: Vendure merges the anonymous order into
 * the customer's own when the session authenticates, and the action re-reads the result
 * rather than assuming which way the merge went.
 */
export default async function LoginPage({
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

  // Already signed in: there is nothing to do here, and showing an empty sign-in form to a
  // signed-in customer reads as if they had been signed out.
  const { customer } = await getActiveCustomer(market);
  if (customer) redirect(next);

  return (
    <AccountShell market={market} title="Sign in" eyebrow="Account" showNav={false}>
      <AuthLayout
        aside={
          <>
            <span className="lab">Do you need an account?</span>
            <h2>No. Not to buy.</h2>
            <ul>
              <li>Guest checkout is always available, in both markets.</li>
              <li>An account keeps your measurements between visits, so a garment cut for you stays cut for you.</li>
              <li>It also keeps your addresses and your order history in one place.</li>
            </ul>
          </>
        }
      >
        <ActionForm
          action={login}
          hidden={{ market, next }}
          fields={[
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              autoComplete: 'email',
              inputMode: 'email',
              required: true,
            },
            {
              name: 'password',
              label: 'Password',
              type: 'password',
              autoComplete: 'current-password',
              required: true,
            },
            { name: 'rememberMe', label: 'Keep me signed in on this device', type: 'checkbox' },
          ]}
          submitLabel="Sign in"
          pendingLabel="Signing in…"
        />

        <p className="mnote">
          <Link href={`/${market}/account/password`}>Forgotten your password?</Link>
        </p>
        <p className="mnote">
          No account yet?{' '}
          <Link href={`/${market}/account/register?next=${encodeURIComponent(next)}`}>
            Create one
          </Link>
          . You can also check out as a guest.
        </p>
      </AuthLayout>
    </AccountShell>
  );
}
