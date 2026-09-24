'use client';

import { useActionState, useState } from 'react';
import { IDLE, type FormState } from '@/features/account/state';
import type { Market } from '@/lib/vendure/channels';

/**
 * Cancelling is not undoable, so it asks once - the same two-step pattern as removing an
 * address. `isCancellable` is a server decision the page already checked before rendering
 * this button; the backend enforces the same rule again, and `ILLEGAL_OPERATION` here means
 * the state changed since the page was rendered (the atelier acted first, or a second click).
 */
export function CancelAppointmentButton({
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
            {pending ? 'Cancelling…' : 'Confirm cancellation'}
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
          Cancel
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
