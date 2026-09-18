'use server';

import { revalidatePath } from 'next/cache';
import {
  AddItemToOrderDocument,
  AdjustOrderLineDocument,
  RemoveOrderLineDocument,
  type CartFragment,
} from '@/lib/vendure/generated/graphql';
import { assertMarket, type Market } from '@/lib/vendure/channels';
import { presentableMessage, VendureResultError } from '@/lib/vendure/errors';
import { readSessionToken, withSerialisedFirstSession, writeSessionToken } from '@/lib/vendure/session';
import { vendureQuery } from '@/lib/vendure/transport';

/**
 * Cart mutations.
 *
 * Server Actions are reachable endpoints, so every one validates its own inputs rather than
 * trusting the caller. The backend still enforces ownership — this is defence in depth, not
 * the only check.
 *
 * Vendure's session token is captured here and nowhere else: a Server Action is one of the
 * two places Next allows a cookie write, and a server-side fetch does not install upstream
 * cookies in the browser by itself.
 */

export type CartResult =
  | { ok: true; cart: CartFragment | null }
  | { ok: false; message: string; errorCode?: string };

function parseQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
    throw new Error('Quantity must be a whole number between 0 and 99.');
  }
  return quantity;
}

function parseId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} is required.`);
  }
  return value;
}

/**
 * Unwraps a cart mutation result.
 *
 * Vendure returns a union: the Order on success, an ErrorResult otherwise. HTTP 200 says
 * nothing about which. InsufficientStockError is singled out because it is the one a
 * customer can act on — it carries how many are actually available.
 */
function unwrapCart(result: {
  __typename?: string;
  errorCode?: string;
  message?: string;
  quantityAvailable?: number;
}): CartFragment {
  if (result.__typename === 'Order') return result as unknown as CartFragment;

  if (result.__typename === 'InsufficientStockError') {
    const available = result.quantityAvailable ?? 0;
    throw new VendureResultError(
      result.errorCode ?? 'INSUFFICIENT_STOCK_ERROR',
      available > 0
        ? `Only ${available} left in that size. We can still cut one to measure.`
        : 'That size is not in stock to ship. We can still cut one to measure.',
      result.__typename,
    );
  }

  throw new VendureResultError(
    result.errorCode ?? 'UNKNOWN_ERROR',
    result.message ?? 'That did not work.',
    result.__typename ?? 'Unknown',
  );
}

export async function addToCart(
  marketInput: string,
  variantIdInput: string,
  quantityInput: number,
): Promise<CartResult> {
  try {
    const market = assertMarket(marketInput);
    const variantId = parseId(variantIdInput, 'Product variant');
    const quantity = parseQuantity(quantityInput);
    if (quantity < 1) throw new Error('Quantity must be at least 1.');

    const hasSession = Boolean(await readSessionToken());

    // Two concurrent first clicks would otherwise establish two sessions and orphan a cart.
    const response = await withSerialisedFirstSession(hasSession, () =>
      vendureQuery(AddItemToOrderDocument, { variantId, quantity }, { market }),
    );

    if (response.authToken) await writeSessionToken(response.authToken);
    const cart = unwrapCart(response.data.addItemToOrder);

    revalidatePath(`/${market}`, 'layout');
    return { ok: true, cart };
  } catch (error) {
    return failure(error);
  }
}

export async function adjustCartLine(
  marketInput: string,
  lineIdInput: string,
  quantityInput: number,
): Promise<CartResult> {
  try {
    const market = assertMarket(marketInput);
    const lineId = parseId(lineIdInput, 'Order line');
    const quantity = parseQuantity(quantityInput);

    const response = await vendureQuery(
      AdjustOrderLineDocument,
      { lineId, quantity },
      { market },
    );
    if (response.authToken) await writeSessionToken(response.authToken);
    const cart = unwrapCart(response.data.adjustOrderLine);

    revalidatePath(`/${market}`, 'layout');
    return { ok: true, cart };
  } catch (error) {
    return failure(error);
  }
}

export async function removeCartLine(
  marketInput: string,
  lineIdInput: string,
): Promise<CartResult> {
  try {
    const market = assertMarket(marketInput);
    const lineId = parseId(lineIdInput, 'Order line');

    const response = await vendureQuery(RemoveOrderLineDocument, { lineId }, { market });
    if (response.authToken) await writeSessionToken(response.authToken);
    const cart = unwrapCart(response.data.removeOrderLine);

    revalidatePath(`/${market}`, 'layout');
    return { ok: true, cart };
  } catch (error) {
    return failure(error);
  }
}

/** Business errors reach the customer; anything else is redacted to a generic message. */
function failure(error: unknown): CartResult {
  if (error instanceof VendureResultError) {
    return { ok: false, message: error.message, errorCode: error.errorCode };
  }
  if (error instanceof Error && !error.message.includes('Vendure')) {
    return { ok: false, message: error.message };
  }
  return { ok: false, message: presentableMessage(error) };
}

export type { Market };
