'use client';

import { useActionState } from 'react';
import { setCheckoutShippingMethod } from './actions';
import { IDLE } from '@/features/account/state';
import type { Market } from '@/lib/vendure/channels';

/**
 * Delivery method.
 *
 * The options are Vendure's `eligibleShippingMethods` for this order as it stands - not a
 * list this storefront keeps. Eligibility is recalculated by Vendure against the address and
 * the contents, so an option that was there before the address changed may be gone now, and
 * that is correct rather than a bug to paper over.
 *
 * Prices arrive pre-formatted from the server: the island never sees a currency rule.
 */
export function ShippingChoice({
  market,
  methods,
  selectedId,
}: {
  market: Market;
  methods: readonly { id: string; name: string; description: string; price: string }[];
  selectedId?: string | undefined;
}) {
  const [state, formAction, pending] = useActionState(setCheckoutShippingMethod, IDLE);

  if (methods.length === 0) {
    return (
      <div className="empty">
        <span className="lab">Nothing eligible</span>
        <h2>No delivery method covers this address yet</h2>
        <p>
          That usually means we do not ship to this destination, or the bag is outside the
          limits of our couriers. Try a different address, or ask us and we will arrange it
          directly.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="market" value={market} readOnly />

      {state.status === 'error' ? (
        <p className="notice notice-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <fieldset>
        <legend>Choose a delivery method</legend>
        <div className="opts">
          {methods.map((method, index) => (
            <label className="opt" key={method.id}>
              <input
                type="radio"
                name="shippingMethodId"
                value={method.id}
                defaultChecked={selectedId ? selectedId === method.id : index === 0}
              />
              <span>
                <span className="t">
                  {method.name} - <span className="num">{method.price}</span>
                </span>
                {method.description ? <span className="d">{method.description}</span> : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button className="btn submit" type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Continue to review'}
      </button>
    </form>
  );
}
