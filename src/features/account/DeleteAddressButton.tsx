'use client';

import { useActionState, useState } from 'react';
import { IDLE, type FormState } from './state';
import type { Market } from '@/lib/vendure/channels';

/**
 * Removing an address is not undoable, so it asks once.
 *
 * The confirmation is local state in this island rather than a dialog: a two-step button is
 * enough to stop a mis-click, and it needs no focus trap to get right. Without JavaScript
 * the form still posts — the first click submits directly, which is the correct fallback
 * for a control the customer deliberately pressed.
 */
export function DeleteAddressButton({
  market,
  id,
  action,
}: {
  market: Market;
  id: string;
  action: (state: FormState, form: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="addr-del">
      <input type="hidden" name="market" value={market} readOnly />
      <input type="hidden" name="id" value={id} readOnly />

      {confirming ? (
        <>
          <button className="btn-q btn-danger" type="submit" disabled={pending}>
            {pending ? 'Removing…' : 'Confirm removal'}
          </button>
          <button
            className="cart-remove lab"
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Keep it
          </button>
        </>
      ) : (
        <button
          className="cart-remove lab"
          type="submit"
          onClick={(event) => {
            event.preventDefault();
            setConfirming(true);
          }}
        >
          Remove
        </button>
      )}

      {state.status === 'error' ? (
        <p className="field-error" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
