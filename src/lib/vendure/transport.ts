import 'server-only';
import { print } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { channelToken, type Market } from './channels';
import {
  VendureGraphQLError,
  VendureTransportError,
  type GraphQLErrorShape,
} from './errors';
import { AUTH_TOKEN_HEADER, readSessionToken } from './session';

/**
 * The one narrow transport to Vendure's Shop API.
 *
 * Deliberately NOT a generic GraphQL proxy. There is no caller-selected upstream URL and
 * no forwarding of arbitrary browser headers. Every operation is named and schema-checked
 * at build time by codegen.
 *
 * Never connects to /admin-api, PostgreSQL, Redis, or internal NestJS services.
 */

function shopApiUrl(): string {
  const raw = process.env.VENDURE_SHOP_API_URL;
  if (!raw) throw new Error('VENDURE_SHOP_API_URL is not set.');

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`VENDURE_SHOP_API_URL is not a valid URL: ${raw}`);
  }
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('VENDURE_SHOP_API_URL must be https in production.');
  }
  return url.toString();
}

type RequestOptions = {
  market: Market;
  /** Default false. Only an anonymous read path may cache, and it never carries a session. */
  anonymous?: boolean;
  /** Seconds. Ignored unless `anonymous` is true. */
  revalidate?: number;
  signal?: AbortSignal;
};

export type VendureResponse<TData> = {
  data: TData;
  /** Present when Vendure created or rotated the session. Persist it in a Server Action or
   *  Route Handler - never during Server Component render. */
  authToken?: string;
};

export async function vendureRequest<TData, TVariables extends object = object>(
  document: string,
  variables: TVariables,
  operationName: string,
  options: RequestOptions,
): Promise<VendureResponse<TData>> {
  const { market, anonymous = false, revalidate, signal } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'vendure-token': channelToken(market),
  };

  // An anonymous read must never attach session credentials - that is what makes it
  // cacheable without leaking one customer's response to another.
  if (!anonymous) {
    const session = await readSessionToken();
    if (session) headers.Authorization = `Bearer ${session}`;
  }

  // Private by default. Cart, customer, addresses, measurements, appointments and any
  // authenticated response must never be cached or shared across users.
  const cacheInit: RequestInit = anonymous
    ? { next: { revalidate: revalidate ?? 300, tags: [`market:${market}`] } }
    : { cache: 'no-store' };

  // Built conditionally: under exactOptionalPropertyTypes an explicit `signal: undefined`
  // is not assignable to RequestInit.
  const init: RequestInit = {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: document, variables, operationName }),
    ...cacheInit,
  };
  if (signal) init.signal = signal;

  let response: Response;
  try {
    response = await fetch(shopApiUrl(), init);
  } catch (cause) {
    throw new VendureTransportError('Could not reach the Vendure Shop API.', undefined, cause);
  }

  if (!response.ok) {
    throw new VendureTransportError(
      `Vendure Shop API returned ${response.status} for ${operationName}.`,
      response.status,
    );
  }

  let body: { data?: TData; errors?: GraphQLErrorShape[] };
  try {
    body = (await response.json()) as typeof body;
  } catch (cause) {
    throw new VendureTransportError('Vendure returned a non-JSON response.', response.status, cause);
  }

  // HTTP 200 is not success.
  if (body.errors?.length) {
    throw new VendureGraphQLError(
      `GraphQL errors on ${operationName}: ${body.errors.map((e) => e.message).join('; ')}`,
      body.errors,
    );
  }
  if (!body.data) {
    throw new VendureGraphQLError(`No data returned for ${operationName}.`, []);
  }

  const authToken = response.headers.get(AUTH_TOKEN_HEADER) ?? undefined;
  return authToken ? { data: body.data, authToken } : { data: body.data };
}

/**
 * Catalogue reads: anonymous, cacheable, session-free.
 * Cache keys include market via the fetch URL + channel header and the `market:` tag.
 */
export function catalogueRequest<TData, TVariables extends object = object>(
  document: string,
  variables: TVariables,
  operationName: string,
  market: Market,
  revalidate = 300,
): Promise<VendureResponse<TData>> {
  return vendureRequest<TData, TVariables>(document, variables, operationName, {
    market,
    anonymous: true,
    revalidate,
  });
}


/** Reads the operation name off a generated document so callers never pass it twice. */
function operationNameOf(document: TypedDocumentNode<unknown, unknown>): string {
  for (const definition of document.definitions) {
    if (definition.kind === 'OperationDefinition' && definition.name) {
      return definition.name.value;
    }
  }
  return 'AnonymousOperation';
}

/**
 * Executes a generated, schema-validated document. Preferred over `vendureRequest` for
 * everything: the result type is inferred from the document, so a field the operation did
 * not select cannot be read by accident.
 */
export function vendureQuery<TData, TVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  options: RequestOptions,
): Promise<VendureResponse<TData>> {
  return vendureRequest<TData, TVariables & object>(
    print(document),
    variables as TVariables & object,
    operationNameOf(document as TypedDocumentNode<unknown, unknown>),
    options,
  );
}

/** Anonymous, cacheable catalogue read. Carries no session, so it is safe to share. */
export function catalogueQuery<TData, TVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  market: Market,
  revalidate = 300,
): Promise<VendureResponse<TData>> {
  return vendureQuery(document, variables, { market, anonymous: true, revalidate });
}
