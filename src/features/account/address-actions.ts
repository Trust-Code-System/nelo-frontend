'use server';

import { revalidatePath } from 'next/cache';
import { assertMarket } from '@/lib/vendure/channels';
import { presentableMessage } from '@/lib/vendure/errors';
import {
  CreateCustomerAddressDocument,
  DeleteCustomerAddressDocument,
  UpdateCustomerAddressDocument,
  type CreateAddressInput,
} from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';
import type { FormState } from './state';

/**
 * Address book mutations.
 *
 * `createCustomerAddress` and `updateCustomerAddress` are among the few Shop API mutations
 * that return a bare entity rather than a result union, so their business failures arrive as
 * top-level GraphQL errors. The transport decodes those as `VendureGraphQLError`, whose raw
 * message can carry internal detail - so it is deliberately NOT shown verbatim. What the
 * customer gets is the field-level validation this module performs plus a generic recovery.
 *
 * Nothing about an address is inferred from the market. The market picks the default
 * country and the field labels; the customer picks the address.
 */

const LIMITS = {
  fullName: 120,
  streetLine1: 200,
  streetLine2: 200,
  city: 100,
  province: 100,
  postalCode: 24,
  phoneNumber: 40,
  countryCode: 2,
} as const;

type Field = keyof typeof LIMITS;

function read(form: FormData, field: Field): string {
  const value = form.get(field);
  return typeof value === 'string' ? value.trim().slice(0, LIMITS[field]) : '';
}

/**
 * Builds the input Vendure expects, and refuses to send a blank optional field as an empty
 * string - an empty `province` is not the same as a province that was not given, and storing
 * "" would print an empty line on a shipping label.
 */
function readAddress(form: FormData): { input: CreateAddressInput } | { error: FormState } {
  const streetLine1 = read(form, 'streetLine1');
  const city = read(form, 'city');
  const countryCode = read(form, 'countryCode').toUpperCase();

  if (streetLine1.length === 0) {
    return { error: fieldError('streetLine1', 'Enter the street address.') };
  }
  if (city.length === 0) {
    return { error: fieldError('city', 'Enter the city.') };
  }
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { error: fieldError('countryCode', 'Choose a country.') };
  }

  const optional: Partial<CreateAddressInput> = {};
  for (const field of ['fullName', 'streetLine2', 'province', 'postalCode', 'phoneNumber'] as const) {
    const value = read(form, field);
    if (value.length > 0) optional[field] = value;
  }

  return {
    input: {
      streetLine1,
      city,
      countryCode,
      ...optional,
      defaultShippingAddress: form.get('defaultShippingAddress') === 'on',
      defaultBillingAddress: form.get('defaultBillingAddress') === 'on',
    },
  };
}

function fieldError(field: string, message: string): FormState {
  return { status: 'error', message, fieldErrors: { [field]: message } };
}

export async function createAddress(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const parsed = readAddress(form);
    if ('error' in parsed) return parsed.error;

    await vendureQuery(CreateCustomerAddressDocument, { input: parsed.input }, { market });
    revalidatePath(`/${market}/account/addresses`);
    revalidatePath(`/${market}/checkout`);
    return { status: 'success', message: 'Address saved.' };
  } catch (error) {
    return { status: 'error', message: presentableMessage(error) };
  }
}

export async function updateAddress(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const id = form.get('id');
    if (typeof id !== 'string' || id.trim() === '') {
      return { status: 'error', message: 'That address could not be identified.' };
    }
    const parsed = readAddress(form);
    if ('error' in parsed) return parsed.error;

    // Ownership is enforced by Vendure against the session, not by this id. Passing an id
    // that is not the caller's fails there - which is where it should fail.
    await vendureQuery(
      UpdateCustomerAddressDocument,
      { input: { id, ...parsed.input } },
      { market },
    );
    revalidatePath(`/${market}/account/addresses`);
    revalidatePath(`/${market}/checkout`);
    return { status: 'success', message: 'Address updated.' };
  } catch (error) {
    return { status: 'error', message: presentableMessage(error) };
  }
}

export async function deleteAddress(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const id = form.get('id');
    if (typeof id !== 'string' || id.trim() === '') {
      return { status: 'error', message: 'That address could not be identified.' };
    }

    const { data } = await vendureQuery(DeleteCustomerAddressDocument, { id }, { market });
    if (!data.deleteCustomerAddress.success) {
      return { status: 'error', message: 'That address could not be removed.' };
    }
    revalidatePath(`/${market}/account/addresses`);
    revalidatePath(`/${market}/checkout`);
    return { status: 'success', message: 'Address removed.' };
  } catch (error) {
    return { status: 'error', message: presentableMessage(error) };
  }
}
