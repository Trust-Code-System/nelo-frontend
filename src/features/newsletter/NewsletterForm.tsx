'use client';

import { useActionState, useId } from 'react';
import { IDLE } from '@/features/account/state';
import { DirectLinkMark } from '@/components/DirectLinkMark';
import type { Market } from '@/lib/vendure/channels';
import { subscribeNewsletter } from './actions';

export function NewsletterForm({ market }: { market: Market }) {
  const id = useId();
  const [state, action, pending] = useActionState(subscribeNewsletter, IDLE);
  if (state.status === 'success') return <p className="newsletter-feedback" role="status">{state.message}</p>;
  return <div className="newsletter-signup">
    <form action={action} aria-busy={pending}>
      <input type="hidden" name="market" value={market} />
      <label className="sr" htmlFor={id}>Email address</label>
      <input id={id} type="email" name="email" placeholder="Email address" autoComplete="email" required maxLength={254} aria-invalid={Boolean(state.fieldErrors?.email)} aria-describedby={state.status === 'error' ? `${id}-feedback` : undefined} />
      <button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Join the list'} <DirectLinkMark /></button>
    </form>
    {state.status === 'error' ? <p className="newsletter-feedback" id={`${id}-feedback`} role="alert">{state.message}</p> : null}
  </div>;
}
