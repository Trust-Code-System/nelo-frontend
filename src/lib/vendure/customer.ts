import 'server-only';
import { ActiveCustomerDocument, type CustomerIdentityFragment } from './generated/graphql';
import type { Market } from './channels';
import { vendureQuery } from './transport';

/**
 * Who is signed in, according to Vendure.
 *
 * There is no local notion of "logged in". The cookie holds an opaque Vendure session token
 * and this query is the only thing that says whether it still corresponds to a customer -
 * which is why an expired session shows up here as `null` rather than as an error.
 *
 * `reachable: false` is a third state and is kept distinct on purpose. "We could not ask"
 * must not render as "you are signed out", because signing a customer out because of a
 * transport blip is a silent re-authentication, and the brief forbids exactly that.
 */
export type ActiveCustomer =
  | { customer: CustomerIdentityFragment; reachable: true }
  | { customer: null; reachable: true }
  | { customer: null; reachable: false };

export async function getActiveCustomer(market: Market): Promise<ActiveCustomer> {
  try {
    const { data } = await vendureQuery(ActiveCustomerDocument, {}, { market });
    return data.activeCustomer
      ? { customer: data.activeCustomer, reachable: true }
      : { customer: null, reachable: true };
  } catch {
    return { customer: null, reachable: false };
  }
}
