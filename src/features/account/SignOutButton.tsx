'use client';

import { useActionState } from 'react';
import { logout } from './actions';
import { IDLE } from './state';
import type { Market } from '@/lib/vendure/channels';

/**
 * Signing out is a state change, so it is a POST - never a link.
 *
 * A GET `/account/logout` can be triggered by any third-party image tag or prefetch, which
 * means a customer can be signed out by a page they merely visited.
 */
export function SignOutButton({ market, className = 'btn-q' }: { market: Market; className?: string }) {
  const [state, formAction, pending] = useActionState(logout, IDLE);

  return (
    <form action={formAction}>
      <input type="hidden" name="market" value={market} readOnly />
      <button className={className} type="submit" disabled={pending}>
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
      {state.status === 'error' ? (
        <p className="field-error" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
