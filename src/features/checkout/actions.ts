'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertMarket, type Market } from '@/lib/vendure/channels';
import { presentableMessage } from '@/lib/vendure/errors';
import {
  ActiveOrderForCheckoutDocument,
  AddPaymentToOrderDocument,
  ApplyCouponCodeDocument,
  RemoveCouponCodeDocument,
  SetCustomerForOrderDocument,
  SetOrderShippingAddressDocument,
  SetOrderShippingMethodDocument,
  TransitionOrderToStateDocument,
  type CreateAddressInput,
  type OrderDetailFragment,
} from '@/lib/vendure/generated/graphql';
import { writeSessionToken } from '@/lib/vendure/session';
import { vendureQuery } from '@/lib/vendure/transport';
import type { FormState } from '@/features/account/state';
import { DEV_PAYMENT_METHOD_CODE, devPaymentEnabled, internationalCheckoutEnabled } from './config';
import { PAID_STATES } from './states';

/**
 * Checkout Server Actions.
 *
 * Shared rules, applied by every action in this file:
 *
 *   1. No amount, price or total is ever sent. `addPaymentToOrder` deliberately has no
 *      amount argument — Vendure charges its own `totalWithTax`. Anything the browser could
 *      contribute to the figure would be an attack surface.
 *   2. Every union is branched on `__typename`. `setOrderShippingMethod` returning
 *      `IneligibleShippingMethodError` is HTTP 200 and would otherwise read as success.
 *   3. Nothing is retried after an ambiguous response. A mutation whose result cannot be
 *      classified is reported as unresolved and the order is re-read, never re-sent.
 *   4. The order is re-read from Vendure after each step, so what the review screen shows
 *      is the store's state and not an accumulation of local edits.
 */

const LIMITS = {
  emailAddress: 254,
  firstName: 80,
  lastName: 80,
  fullName: 120,
  streetLine1: 200,
  streetLine2: 200,
  city: 100,
  province: 100,
  postalCode: 24,
  phoneNumber: 40,
  countryCode: 2,
  couponCode: 64,
} as const;

function read(form: FormData, field: keyof typeof LIMITS): string {
  const value = form.get(field);
  return typeof value === 'string' ? value.trim().slice(0, LIMITS[field]) : '';
}

function fieldError(field: string, message: string): FormState {
  return { status: 'error', message, fieldErrors: { [field]: message } };
}

function failure(error: unknown): FormState {
  return { status: 'error', message: presentableMessage(error) };
}

/**
 * The international gate, enforced in the actions and not only in the UI.
 *
 * A hidden `market` field is client-supplied, so a gated market must be refused here too —
 * a checkout that is only disabled in the markup is not disabled.
 */
function gateCheck(market: Market): FormState | null {
  if (market === 'international' && !internationalCheckoutEnabled()) {
    return {
      status: 'error',
      message:
        'International checkout is not open yet. We have not confirmed that our payment provider can settle in US dollars, and we will not take an order we cannot charge correctly.',
    };
  }
  return null;
}

/** Details step — guests only. A signed-in customer already has one, and Vendure answers
 *  `AlreadyLoggedInError` if this is sent anyway. */
export async function setCheckoutCustomer(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const gated = gateCheck(market);
    if (gated) return gated;

    const emailAddress = read(form, 'emailAddress');
    const firstName = read(form, 'firstName');
    const lastName = read(form, 'lastName');
    const phoneNumber = read(form, 'phoneNumber');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      return fieldError('emailAddress', 'Enter an email address we can send the receipt to.');
    }
    if (firstName.length === 0) return fieldError('firstName', 'Enter your first name.');
    if (lastName.length === 0) return fieldError('lastName', 'Enter your last name.');

    const { data, authToken } = await vendureQuery(
      SetCustomerForOrderDocument,
      {
        input: {
          emailAddress,
          firstName,
          lastName,
          ...(phoneNumber ? { phoneNumber } : {}),
        },
      },
      { market },
    );
    if (authToken) await writeSessionToken(authToken);

    const result = data.setCustomerForOrder;
    if (result.__typename !== 'Order') {
      // AlreadyLoggedInError is not a customer-facing failure: it means the details step
      // should not have been shown. Re-rendering the page resolves it.
      if (result.__typename === 'AlreadyLoggedInError') {
        revalidatePath(`/${market}/checkout`);
        return { status: 'success', message: 'You are already signed in.' };
      }
      return { status: 'error', message: result.message };
    }

    revalidatePath(`/${market}/checkout`);
    return { status: 'success', message: 'Details saved.' };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Address step.
 *
 * Setting the address invalidates the shipping choice: Vendure recalculates eligibility
 * against the new destination, and a method chosen for Lagos may not be eligible for Kano.
 * So the previously selected method is NOT carried forward here — the next step re-reads
 * `eligibleShippingMethods` and the customer chooses again.
 */
export async function setCheckoutShippingAddress(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const gated = gateCheck(market);
    if (gated) return gated;

    const streetLine1 = read(form, 'streetLine1');
    const city = read(form, 'city');
    const countryCode = read(form, 'countryCode').toUpperCase();

    if (streetLine1.length === 0) {
      return fieldError('streetLine1', 'Enter the street address.');
    }
    if (city.length === 0) return fieldError('city', 'Enter the city.');
    if (!/^[A-Z]{2}$/.test(countryCode)) return fieldError('countryCode', 'Choose a country.');

    const optional: Partial<CreateAddressInput> = {};
    for (const field of ['fullName', 'streetLine2', 'province', 'postalCode', 'phoneNumber'] as const) {
      const value = read(form, field);
      if (value.length > 0) optional[field] = value;
    }

    const { data } = await vendureQuery(
      SetOrderShippingAddressDocument,
      { input: { streetLine1, city, countryCode, ...optional } },
      { market },
    );
    const result = data.setOrderShippingAddress;
    if (result.__typename !== 'Order') {
      return { status: 'error', message: result.message };
    }

    revalidatePath(`/${market}/checkout`);
    return { status: 'success', message: 'Delivery address saved.' };
  } catch (error) {
    return failure(error);
  }
}

/** Shipping step. The id is Vendure's, from `eligibleShippingMethods` — an id that is not
 *  eligible is refused there, which is the check that matters. */
export async function setCheckoutShippingMethod(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const gated = gateCheck(market);
    if (gated) return gated;

    const id = form.get('shippingMethodId');
    if (typeof id !== 'string' || id.trim() === '') {
      return fieldError('shippingMethodId', 'Choose a delivery method.');
    }

    const { data } = await vendureQuery(
      SetOrderShippingMethodDocument,
      { ids: [id] },
      { market },
    );
    const result = data.setOrderShippingMethod;
    if (result.__typename !== 'Order') {
      // IneligibleShippingMethodError lands here. It is not a transport failure and it is
      // certainly not a success — the customer has to pick something else.
      return { status: 'error', message: result.message };
    }

    revalidatePath(`/${market}/checkout`);
    return { status: 'success', message: 'Delivery method saved.' };
  } catch (error) {
    return failure(error);
  }
}

export async function applyCoupon(_previous: FormState, form: FormData): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const code = read(form, 'couponCode');
    if (code.length === 0) return fieldError('couponCode', 'Enter a code.');

    const { data } = await vendureQuery(ApplyCouponCodeDocument, { code }, { market });
    const result = data.applyCouponCode;

    if (result.__typename !== 'Order') {
      // Expired, invalid and limit-reached are three different messages and Vendure already
      // distinguishes them. Flattening them to "invalid code" would hide the one case the
      // customer can do something about.
      return fieldError('couponCode', result.message);
    }

    revalidatePath(`/${market}/checkout`);
    return { status: 'success', message: 'Code applied.' };
  } catch (error) {
    return failure(error);
  }
}

export async function removeCoupon(_previous: FormState, form: FormData): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const code = read(form, 'couponCode');
    if (code.length === 0) return { status: 'error', message: 'No code to remove.' };

    await vendureQuery(RemoveCouponCodeDocument, { code }, { market });
    revalidatePath(`/${market}/checkout`);
    return { status: 'success', message: 'Code removed.' };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Place the order against the DEVELOPMENT payment handler.
 *
 * This exists so the whole journey is testable before the Paystack contract does. It is
 * unreachable unless `NELO_DEV_PAYMENT=enabled`, it is checked again here rather than only
 * in the UI, and no money moves through it.
 *
 * The sequence is deliberate:
 *
 *   transition to ArrangingPayment → confirm the order really is in that state →
 *   addPaymentToOrder → confirm the returned state is actually a paid state →
 *   only then show a confirmation.
 *
 * `transitionOrderToState` is NULLABLE. A null result means the order was already in the
 * requested state, which is not the same as this call having moved it there — so the order
 * is re-read instead of the null being treated as either success or failure.
 */
export async function placeDevOrder(_previous: FormState, form: FormData): Promise<FormState> {
  let destination: string;
  try {
    const market = assertMarket(form.get('market'));
    const gated = gateCheck(market);
    if (gated) return gated;

    if (!devPaymentEnabled()) {
      return {
        status: 'error',
        message:
          'This storefront has no live payment path yet. The Paystack initialise operation does not exist on the backend, and the development handler is switched off here.',
      };
    }

    const transition = await vendureQuery(
      TransitionOrderToStateDocument,
      { state: 'ArrangingPayment' },
      { market },
    );
    const transitioned = transition.data.transitionOrderToState;

    if (transitioned && transitioned.__typename !== 'Order') {
      return { status: 'error', message: transitioned.message };
    }

    // Either the transition returned null (already there) or it returned an Order. Both are
    // re-verified against a fresh read: the state is what decides whether payment may be
    // attempted, and a stale belief about it is exactly what must not be acted on.
    const current = await readOrder(market);
    if (!current) {
      return { status: 'error', message: 'Your bag is empty, so there is nothing to pay for.' };
    }
    if (current.state !== 'ArrangingPayment') {
      return {
        status: 'error',
        message: `This order is in the ${current.state} state and cannot take a payment right now. Reload the page to see where it stands.`,
      };
    }

    const payment = await vendureQuery(
      AddPaymentToOrderDocument,
      {
        input: {
          method: DEV_PAYMENT_METHOD_CODE,
          // The dummy handler's switches, sent explicitly so the happy path is not an
          // accident of defaults. A real handler's metadata is the backend's contract.
          metadata: { shouldDecline: false, shouldError: false, shouldErrorOnSettle: false },
        },
      },
      { market },
    );
    const result = payment.data.addPaymentToOrder;

    if (result.__typename !== 'Order') {
      return { status: 'error', message: result.message };
    }

    // HTTP 200 and an Order back still is not proof of payment. Only a state Vendure counts
    // as paid produces a confirmation.
    if (!PAID_STATES.has(result.state)) {
      return {
        status: 'error',
        message: `Payment did not complete — the order is in the ${result.state} state. Nothing has been charged. Your bag is unchanged.`,
      };
    }

    revalidatePath(`/${market}`, 'layout');
    destination = `/${market}/checkout/confirmation/${encodeURIComponent(result.code)}`;
  } catch (error) {
    return failure(error);
  }

  redirect(destination);
}

async function readOrder(market: Market): Promise<OrderDetailFragment | null> {
  const { data } = await vendureQuery(ActiveOrderForCheckoutDocument, {}, { market });
  return data.activeOrder;
}
