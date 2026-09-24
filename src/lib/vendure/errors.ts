/**
 * Three failure classes, decoded separately.
 *
 * The backend context is explicit: HTTP 200 alone is not success. A Vendure response can
 * be transport-ok, GraphQL-ok, and still carry a typed result union describing a business
 * failure (insufficient stock, ineligible shipping method, a rejected coupon).
 *
 * Never blindly retry a mutation after an ambiguous response.
 */

/** 1 - network / HTTP. Safe reads may be retried with a timeout; mutations may not. */
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

/** 2 - GraphQL top-level `errors`. Usually our bug: a malformed document or bad variables.
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

/** 3 - a typed result union from Vendure. This IS actionable: show the business message. */
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
 * branch exhaustively - a result whose `__typename` is missing is a query bug, not a
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
  if (error instanceof VendureGraphQLError) {
    const code = vendureErrorCode(error);
    // USER_INPUT_ERROR and ILLEGAL_OPERATION carry a message written for the customer
    // (e.g. "This appointment can no longer be cancelled"). FORBIDDEN never reaches here
    // with detail attached - callers decode it themselves, because what it means (sign in,
    // or a record that is not theirs) depends on which operation threw it.
    if (code === 'USER_INPUT_ERROR' || code === 'ILLEGAL_OPERATION') {
      return error.errors[0]?.message ?? 'Something went wrong on our side. Please try again.';
    }
  }
  if (error instanceof VendureTransportError)
    return 'We could not reach the store. Check your connection and try again.';
  return 'Something went wrong on our side. Please try again.';
}

/**
 * Decodes the `extensions.code` of a top-level GraphQL error - distinct from `errorCode` on a
 * typed result union member. Vendure throws `ForbiddenError`, `UserInputError` and
 * `IllegalOperationError` as real GraphQL errors, not as union results, so they arrive here as
 * a `VendureGraphQLError` rather than from `unwrap`.
 *
 * The three codes the Atelier Shop API actually throws:
 *  - FORBIDDEN: not signed in, or a record that is not the caller's. The backend deliberately
 *    does not say which - callers must not either.
 *  - USER_INPUT_ERROR: a presentable, customer-facing message.
 *  - ILLEGAL_OPERATION: the state changed underneath the request (e.g. a second cancel).
 *    The caller should refetch and re-render, not just show the message.
 */
export type VendureErrorCode = 'FORBIDDEN' | 'USER_INPUT_ERROR' | 'ILLEGAL_OPERATION';

export function vendureErrorCode(error: unknown): VendureErrorCode | undefined {
  if (!(error instanceof VendureGraphQLError)) return undefined;
  const code = error.errors[0]?.extensions?.code;
  return code === 'FORBIDDEN' || code === 'USER_INPUT_ERROR' || code === 'ILLEGAL_OPERATION'
    ? code
    : undefined;
}
