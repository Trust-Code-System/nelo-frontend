/**
 * Checkout configuration gates.
 *
 * International checkout remains deliberately gated until the Paystack account is
 * confirmed to settle USD. Nigerian checkout uses the backend's concrete Paystack
 * contract and needs no frontend feature flag.
 */

/**
 * International checkout gate.
 *
 * A USD catalogue proves the Channel prices in USD. It does NOT prove the Paystack account
 * is able to accept USD. Until someone confirms that with the payment provider, taking an
 * international order would mean either failing at the payment step or - far worse -
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
