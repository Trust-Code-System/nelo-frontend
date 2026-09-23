import { channelFor, type Market } from '@/lib/vendure/channels';
import { PAYSTACK_METHOD_CODE } from '@/features/checkout/paystack';

/**
 * Turning Vendure's order state into something a customer can read.
 *
 * Vendure's state machine is the authority and is never re-derived here - no inferring
 * "shipped" from a fulfilment count, no computing a payment state from a payment record.
 * This maps the state Vendure reports onto words, and nothing else.
 *
 * An unrecognised state falls through to the raw value rather than to a friendly guess. If
 * the backend adds a state - or a plugin introduces one - showing `AwaitingFabric` is
 * honest; showing "Processing" because the map had no entry is not.
 */

type StateCopy = { label: string; note: string };

const STATES: Readonly<Record<string, StateCopy>> = {
  AddingItems: {
    label: 'Not yet placed',
    note: 'This order is still a bag. Nothing has been charged.',
  },
  ArrangingPayment: {
    label: 'Awaiting payment',
    note: 'We are waiting for payment to complete.',
  },
  PaymentAuthorized: {
    label: 'Payment authorised',
    note: 'Payment is authorised. We start work once it settles.',
  },
  PaymentSettled: {
    label: 'Paid',
    note: 'Paid in full. In the atelier now.',
  },
  PartiallyShipped: {
    label: 'Partly shipped',
    note: 'Some pieces have left us; the rest are still being finished.',
  },
  Shipped: {
    label: 'Shipped',
    note: 'On its way to you.',
  },
  PartiallyDelivered: {
    label: 'Partly delivered',
    note: 'Some pieces have arrived. The rest are still travelling.',
  },
  Delivered: {
    label: 'Delivered',
    note: 'Delivered. Alterations are free within 30 days.',
  },
  Cancelled: {
    label: 'Cancelled',
    note: 'This order was cancelled.',
  },
  Modifying: {
    label: 'Being amended',
    note: 'We are amending this order. It will move on once that is done.',
  },
  ArrangingAdditionalPayment: {
    label: 'Awaiting a further payment',
    note: 'An amendment changed the total. A further payment is needed.',
  },
};

export function orderState(state: string): StateCopy {
  return STATES[state] ?? { label: state, note: '' };
}

/** Terminal enough that a customer should not expect it to change on its own. */
export function isSettledState(state: string): boolean {
  return state === 'Delivered' || state === 'Cancelled';
}

/**
 * Turning a Vendure PaymentMethod code into something a customer can read.
 *
 * Same rule as `orderState`: an unrecognised code falls through to itself rather than to a
 * friendly guess, because it is better to show a raw code once than to lie about what it
 * is.
 */
export function paymentMethodLabel(code: string): string {
  if (code === PAYSTACK_METHOD_CODE) return 'Paystack';
  return code;
}

/**
 * Turning a Vendure Payment's own state (Created/Authorized/Settled/Declined/Cancelled/
 * Error - a different state machine from the Order's) into the site's British spelling and
 * voice, matching `orderState` above. Unrecognised values fall through to themselves.
 */
const PAYMENT_STATES: Readonly<Record<string, string>> = {
  Created: 'Created',
  Authorized: 'Authorised',
  Settled: 'Paid',
  Declined: 'Declined',
  Cancelled: 'Cancelled',
  Error: 'Payment error',
};

export function paymentStateLabel(state: string): string {
  return PAYMENT_STATES[state] ?? state;
}

/**
 * Dates are rendered on the server with an explicit time zone.
 *
 * Without one, Node formats in the server's zone and an order placed at 00:30 in Lagos can
 * print as the previous day. Nigeria's market is fixed to Africa/Lagos; the international
 * market uses UTC, because guessing a customer's zone from a Channel would be worse than
 * being explicit about which clock the date belongs to.
 */
export function formatOrderDate(iso: string | null | undefined, market: Market): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(channelFor(market).locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: market === 'ng' ? 'Africa/Lagos' : 'UTC',
  }).format(date);
}

/** The zone the dates above are expressed in, so a screen can say so rather than leave it
 *  ambiguous. */
export function dateZoneLabel(market: Market): string {
  return market === 'ng' ? 'Times shown in Lagos (WAT).' : 'Times shown in UTC.';
}
