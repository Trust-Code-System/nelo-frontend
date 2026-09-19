import { describe, expect, it } from 'vitest';
import { PAID_STATES, resolveStep, stepState } from './states';
import type { OrderDetailFragment } from '@/lib/vendure/generated/graphql';

/**
 * Checkout step derivation and the paid-state set.
 *
 * These two together decide whether a customer is shown a receipt, so they are worth testing
 * directly rather than only through a browser journey: the failure mode is not a broken page,
 * it is a confirmation for an order that was never paid.
 */

/** A minimal Order shaped like the real fragment. Only the fields the logic reads matter. */
function order(overrides: Partial<OrderDetailFragment> = {}): OrderDetailFragment {
  return {
    __typename: 'Order',
    id: '1',
    code: 'TESTCODE',
    state: 'AddingItems',
    active: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    orderPlacedAt: null,
    currencyCode: 'NGN',
    totalQuantity: 1,
    subTotalWithTax: 1000,
    shippingWithTax: 0,
    totalWithTax: 1000,
    couponCodes: [],
    discounts: [],
    lines: [],
    shippingAddress: null,
    billingAddress: null,
    shippingLines: [],
    payments: [],
    customer: null,
    ...overrides,
  } as OrderDetailFragment;
}

const address = {
  __typename: 'OrderAddress',
  fullName: 'Ada Okafor',
  company: null,
  streetLine1: '12 Glover Road',
  streetLine2: null,
  city: 'Lagos',
  province: 'Lagos',
  postalCode: null,
  country: 'Nigeria',
  countryCode: 'NG',
  phoneNumber: null,
} as NonNullable<OrderDetailFragment['shippingAddress']>;

const shippingLine = {
  __typename: 'ShippingLine',
  priceWithTax: 500,
  shippingMethod: {
    __typename: 'ShippingMethod',
    id: '1',
    code: 'standard',
    name: 'Standard Shipping',
    description: '',
  },
} as OrderDetailFragment['shippingLines'][number];

describe('stepState', () => {
  it('starts a guest at the details step', () => {
    const state = stepState(order(), false);
    expect(state.furthest).toBe('details');
    expect(state.completed.size).toBe(0);
  });

  it('collapses the details step for a signed-in customer', () => {
    // setCustomerForOrder answers AlreadyLoggedInError for a signed-in customer, so asking
    // for details again would be a step that cannot succeed.
    const state = stepState(order(), true);
    expect(state.completed.has('details')).toBe(true);
    expect(state.furthest).toBe('address');
  });

  it('treats a customer already on the order as the details step being done', () => {
    const state = stepState(
      order({
        customer: {
          __typename: 'Customer',
          id: '9',
          emailAddress: 'ada@example.com',
          firstName: 'Ada',
          lastName: 'Okafor',
        } as NonNullable<OrderDetailFragment['customer']>,
      }),
      false,
    );
    expect(state.furthest).toBe('address');
  });

  it('does not count an address before the details', () => {
    // Vendure will not accept an address on an order with no customer, so an order in this
    // shape is not "further along" — it is inconsistent, and the earlier step still applies.
    const state = stepState(order({ shippingAddress: address }), false);
    expect(state.furthest).toBe('details');
    expect(state.completed.has('address')).toBe(false);
  });

  it('reaches review only once customer, address and a shipping line all exist', () => {
    const complete = stepState(
      order({ shippingAddress: address, shippingLines: [shippingLine] }),
      true,
    );
    expect(complete.furthest).toBe('review');

    const noShipping = stepState(order({ shippingAddress: address }), true);
    expect(noShipping.furthest).toBe('shipping');
  });
});

describe('resolveStep', () => {
  const state = stepState(order({ shippingAddress: address }), true); // furthest: shipping

  it('allows going back to a step already passed', () => {
    expect(resolveStep('address', state)).toBe('address');
  });

  it('refuses to skip ahead of the order', () => {
    // Otherwise the review screen renders totals for an order with no delivery method.
    expect(resolveStep('review', state)).toBe('shipping');
  });

  it('ignores a step that is not a step', () => {
    expect(resolveStep('../../admin', state)).toBe('shipping');
    expect(resolveStep(undefined, state)).toBe('shipping');
    expect(resolveStep(42, state)).toBe('shipping');
  });
});

describe('PAID_STATES', () => {
  it('counts authorised as paid', () => {
    // The money is committed even though settlement has not run.
    expect(PAID_STATES.has('PaymentAuthorized')).toBe(true);
    expect(PAID_STATES.has('PaymentSettled')).toBe(true);
  });

  it('does not count the states a failed attempt leaves an order in', () => {
    expect(PAID_STATES.has('ArrangingPayment')).toBe(false);
    expect(PAID_STATES.has('AddingItems')).toBe(false);
    expect(PAID_STATES.has('Cancelled')).toBe(false);
    expect(PAID_STATES.has('ArrangingAdditionalPayment')).toBe(false);
  });

  it('does not count an unknown state as paid', () => {
    // A plugin or a backend change can introduce a state this storefront has never seen.
    // The safe default is "not paid" — no receipt for a state we cannot vouch for.
    expect(PAID_STATES.has('AwaitingFabric')).toBe(false);
    expect(PAID_STATES.has('')).toBe(false);
  });
});
