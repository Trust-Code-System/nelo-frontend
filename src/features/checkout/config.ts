/**
 * Checkout configuration gates.
 *
 * Two of these exist because the backend contract is not finished, and both are single
 * flags rather than scattered conditionals so that turning either one on is a one-line,
 * reviewable change.
 */

/**
 * International checkout gate.
 *
 * A USD catalogue proves the Channel prices in USD. It does NOT prove the Paystack account
 * is able to accept USD. Until someone confirms that with the payment provider, taking an
 * international order would mean either failing at the payment step or — far worse —
 * charging the naira figure against a dollar price.
 *
 * So international checkout is gated by default. The catalogue, the bag and the atelier all
 * stay open; only payment is withheld, and the screen says why.
 *
 * Set `NELO_INTERNATIONAL_CHECKOUT=enabled` once the Paystack account is confirmed to settle
 * USD. Nothing else needs to change.
 */
export function internationalCheckoutEnabled(): boolean {
  return process.env.NELO_INTERNATIONAL_CHECKOUT === 'enabled';
}

/**
 * The development payment path.
 *
 * `../vendure-dev` runs Vendure's `dummy-payment-handler`, which authorises without taking
 * money. Wiring `addPaymentToOrder` to it is what makes the whole checkout testable today,
 * before the Paystack contract exists — but it must never be reachable in a deployment that
 * faces customers, so it is off unless explicitly switched on.
 *
 * Set `NELO_DEV_PAYMENT=enabled` in `.env.local` only. Every screen that can reach this path
 * carries a visible banner saying no money moves.
 */
export function devPaymentEnabled(): boolean {
  return process.env.NELO_DEV_PAYMENT === 'enabled';
}

/**
 * The PaymentMethod code of the dev handler, as provisioned by
 * `vendure-dev/setup-nelo-channels.mjs`. Vendure's sample data names it `standard-payment`.
 */
export const DEV_PAYMENT_METHOD_CODE = 'standard-payment';

/**
 * How a Paystack method is recognised in `eligiblePaymentMethods`.
 *
 * The production handler's code is the backend's to choose; this prefix is the frontend's
 * assumption and is written down here rather than buried in a comparison. Until the
 * initialise-payment operation exists (see contracts/paystack-shop-api.proposal.graphql)
 * such a method is shown as not yet connected instead of being offered.
 */
export const PAYSTACK_METHOD_PREFIX = 'paystack';

export function isPaystackMethod(code: string): boolean {
  return code.toLowerCase().startsWith(PAYSTACK_METHOD_PREFIX);
}
