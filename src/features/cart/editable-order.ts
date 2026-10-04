import 'server-only';
import type { Market } from '@/lib/vendure/channels';
import { ActiveOrderForCheckoutDocument, TransitionOrderToStateDocument } from '@/lib/vendure/generated/graphql';
import { VendureResultError } from '@/lib/vendure/errors';
import { vendureQuery } from '@/lib/vendure/transport';
import { writeSessionToken } from '@/lib/vendure/session';

/** Reopen only an unpaid checkout. Vendure remains the authority if payment wins a race. */
export async function ensureEditableOrder(market: Market): Promise<void> {
  const { data } = await vendureQuery(ActiveOrderForCheckoutDocument, {}, { market });
  const order = data.activeOrder;
  if (!order || order.state === 'AddingItems') return;
  if (order.state !== 'ArrangingPayment') {
    throw new VendureResultError('ORDER_NOT_EDITABLE', 'This order cannot be edited now. Refresh your bag to see its current status.', 'OrderStateTransitionError');
  }
  const response = await vendureQuery(TransitionOrderToStateDocument, { state: 'AddingItems' }, { market });
  if (response.authToken) await writeSessionToken(response.authToken);
  const result = response.data.transitionOrderToState;
  const fresh = await vendureQuery(ActiveOrderForCheckoutDocument, {}, { market });
  if (fresh.data.activeOrder?.id !== order.id || fresh.data.activeOrder.state !== 'AddingItems') {
    throw new VendureResultError('ORDER_NOT_EDITABLE', result && result.__typename !== 'Order' ? result.message : 'The order changed while you were editing it. Refresh your bag before trying again.', 'OrderStateTransitionError');
  }
}
