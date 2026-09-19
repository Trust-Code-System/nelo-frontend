/**
 * Shared shape for every account form.
 *
 * Kept out of the `'use server'` module deliberately: a file marked `'use server'` may only
 * export async functions, so the types the client islands import have to live here.
 */

export type FormState = {
  status: 'idle' | 'error' | 'success';
  /** A business message the customer can act on. Never a stack or an upstream trace. */
  message?: string;
  /** Keyed by input name, so an error lands next to the field that caused it. */
  fieldErrors?: Record<string, string>;
};

export const IDLE: FormState = { status: 'idle' };

/**
 * A post-sign-in destination is caller-supplied, so it is an open-redirect vector.
 *
 * Only a path inside this market is accepted: no scheme, no host, no protocol-relative
 * `//evil.example`, no backslash (which some browsers normalise to `/`). Anything else
 * falls back to the account home rather than being "cleaned up" — a redirect that has to be
 * repaired is one that should not be followed.
 */
export function safeReturnPath(raw: unknown, market: string): string {
  const fallback = `/${market}/account`;
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return fallback;
  if (!raw.startsWith(`/${market}/`) && raw !== `/${market}`) return fallback;
  if (raw.includes('//') || raw.includes('\\') || raw.includes(':')) return fallback;
  return raw;
}
