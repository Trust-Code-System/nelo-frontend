/**
 * Three failure classes, decoded separately.
 *
 * The backend context is explicit: HTTP 200 alone is not success. A Vendure response can
 * be transport-ok, GraphQL-ok, and still carry a typed result union describing a business
 * failure (insufficient stock, ineligible shipping method, a rejected coupon).
 *
 * Never blindly retry a mutation after an ambiguous response.
 */

/** 1 — network / HTTP. Safe reads may be retried with a timeout; mutations may not. */
export class VendureTransportError extends Error {
  readonly retryableForReads = true;
  constructor(
    message: string,
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'VendureTransportError';
  }
}

/** 2 — GraphQL top-level `errors`. Usually our bug: a malformed document or bad variables.
 *  Not actionable by the customer; log it, show a generic recovery. */
export class VendureGraphQLError extends Error {
  readonly retryableForReads = false;
  constructor(
    message: string,
    readonly errors: readonly GraphQLErrorShape[],
  ) {
    super(message);
    this.name = 'VendureGraphQLError';
  }
}

export type GraphQLErrorShape = {
  message: string;
  path?: readonly (string | number)[];
  extensions?: Record<string, unknown>;
};

/** 3 — a typed result union from Vendure. This IS actionable: show the business message. */
export class VendureResultError extends Error {
  readonly retryableForReads = false;
  constructor(
    readonly errorCode: string,
    message: string,
    readonly typename: string,
  ) {
    super(message);
    this.name = 'VendureResultError';
  }
}

/**
 * Narrow a Vendure union result. Select `__typename` on every union member so this can
 * branch exhaustively — a result whose `__typename` is missing is a query bug, not a
 * reason to assume success.
 */
export type VendureResult<TSuccess extends { __typename?: string }> =
  | TSuccess
  | { __typename?: string; errorCode: string; message: string };

export function isErrorResult(
  result: { __typename?: string } & Record<string, unknown>,
): result is { __typename?: string; errorCode: string; message: string } {
  return typeof result.errorCode === 'string' && typeof result.message === 'string';
}

/** Throws a decoded business error, or returns the success member. */
export function unwrap<TSuccess extends { __typename?: string }>(
  result: VendureResult<TSuccess>,
): TSuccess {
  const candidate = result as { __typename?: string } & Record<string, unknown>;
  if (isErrorResult(candidate)) {
    throw new VendureResultError(
      candidate.errorCode,
      candidate.message,
      candidate.__typename ?? 'UnknownError',
    );
  }
  return result as TSuccess;
}

/** Customer-facing copy. Raw traces are never shown; business messages are. */
export function presentableMessage(error: unknown): string {
  if (error instanceof VendureResultError) return error.message;
  if (error instanceof VendureTransportError)
    return 'We could not reach the store. Check your connection and try again.';
  return 'Something went wrong on our side. Please try again.';
}
