'use client';

import { useActionState } from 'react';
import { placeDevOrder } from './actions';
import { IDLE } from '@/features/account/state';
import type { Market } from '@/lib/vendure/channels';

/**
 * The one primary action on the review step.
 *
 * Note what is NOT here: no amount, no currency, no total. The button posts a market and
 * nothing else, and Vendure charges the order's own `totalWithTax`. There is deliberately no
 * field a browser could put a number in.
 *
 * `payable` is display only - it is the string the server formatted from the order it just
 * read, so the customer can see what they are agreeing to.
 */
export function PlaceOrder({
  market,
  payable,
  devPath,
}: {
  market: Market;
  payable: string;
  /** True when this button routes through Vendure's development payment handler. */
  devPath: boolean;
}) {
  const [state, formAction, pending] = useActionState(placeDevOrder, IDLE);

  return (
    <form action={formAction}>
      <input type="hidden" name="market" value={market} readOnly />

      {state.status === 'error' ? (
        <p className="notice notice-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button className="btn submit" type="submit" disabled={pending}>
        {pending ? 'Placing your order…' : `Place order - ${payable}`}
      </button>

      {devPath ? (
        <p className="mnote">
          Development payment handler. No money moves and no card is asked for. The Paystack
          path is not built yet - see contracts/paystack-shop-api.proposal.graphql.
        </p>
      ) : null}
    </form>
  );
}
