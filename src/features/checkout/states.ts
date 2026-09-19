import type { OrderDetailFragment } from '@/lib/vendure/generated/graphql';

/**
 * Checkout step derivation.
 *
 * The step is computed from the order Vendure returns, not held as client state. That is
 * what makes the back button, a refresh and a shared link all behave: there is one source of
 * truth for how far a checkout has got, and it is the order.
 */

export const STEPS = ['details', 'address', 'shipping', 'review'] as const;
export type Step = (typeof STEPS)[number];

export const STEP_LABELS: Readonly<Record<Step, string>> = {
  details: 'Your details',
  address: 'Delivery address',
  shipping: 'Delivery method',
  review: 'Review',
};

export function isStep(value: unknown): value is Step {
  return typeof value === 'string' && (STEPS as readonly string[]).includes(value);
}

/**
 * Order states Vendure considers paid.
 *
 * Kept as a set rather than a string comparison so that adding one is a deliberate edit.
 * `PaymentAuthorized` counts: the money is committed even though settlement has not run.
 * Everything else — including `ArrangingPayment`, which is where a failed attempt leaves an
 * order — does not.
 */
export const PAID_STATES: ReadonlySet<string> = new Set([
  'PaymentAuthorized',
  'PaymentSettled',
  'PartiallyShipped',
  'Shipped',
  'PartiallyDelivered',
  'Delivered',
]);

export type StepState = {
  /** Steps the order has already satisfied, in order. */
  completed: ReadonlySet<Step>;
  /** The furthest step the customer may open. */
  furthest: Step;
};

/**
 * Which steps are done.
 *
 * `signedIn` collapses the details step: a signed-in customer's identity is already on the
 * order as far as Vendure is concerned, and `setCustomerForOrder` answers
 * `AlreadyLoggedInError` if asked again.
 */
export function stepState(order: OrderDetailFragment, signedIn: boolean): StepState {
  const completed = new Set<Step>();

  if (signedIn || Boolean(order.customer?.emailAddress)) completed.add('details');
  if (completed.has('details') && Boolean(order.shippingAddress?.streetLine1)) {
    completed.add('address');
  }
  if (completed.has('address') && order.shippingLines.length > 0) completed.add('shipping');

  const furthest: Step = !completed.has('details')
    ? 'details'
    : !completed.has('address')
      ? 'address'
      : !completed.has('shipping')
        ? 'shipping'
        : 'review';

  return { completed, furthest };
}

/**
 * The step to render.
 *
 * A requested step is honoured only if the order has already got that far — otherwise the
 * customer would be looking at a review screen for an order with no address. Going back is
 * always allowed; skipping forward is not.
 */
export function resolveStep(requested: unknown, state: StepState): Step {
  if (!isStep(requested)) return state.furthest;
  return STEPS.indexOf(requested) <= STEPS.indexOf(state.furthest)
    ? requested
    : state.furthest;
}
