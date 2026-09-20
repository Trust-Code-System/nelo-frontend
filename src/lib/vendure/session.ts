import 'server-only';
import { cookies } from 'next/headers';

/**
 * Storefront session transport. There is no auth database here.
 *
 * Vendure is the authentication authority. This cookie carries ONLY the opaque Vendure
 * bearer session token - no account profile, no measurements, no cart JSON. A Vendure
 * session token is not a frontend-issued JWT, and a Channel token is not authentication.
 *
 * Never place this value in localStorage, a URL, analytics, client props, logs, or any
 * NEXT_PUBLIC_* variable.
 */

const COOKIE = 'nelo_vendure_session';

/** Vendure returns a new/rotated token in this response header. */
export const AUTH_TOKEN_HEADER = 'vendure-auth-token';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  // Host-only scope: no `domain`, so the cookie is not shared with sibling subdomains.
  maxAge: 60 * 60 * 24 * 30,
} as const;

export async function readSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE)?.value;
}

/**
 * Persist a session token.
 *
 * MUST be called from a Server Action or Route Handler. Next.js does not allow cookie
 * writes during Server Component rendering, and a server-side fetch does not automatically
 * install upstream cookies in the browser - so an ordinary product page render must not
 * create a session it cannot persist.
 */
export async function writeSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, token, cookieOptions);
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * Serialises first-session creation.
 *
 * Two concurrent "add to bag" clicks on a fresh visit can otherwise each establish their
 * own Vendure session and orphan one of the carts. Requests are per-process, so this guards
 * the common case; it is not a distributed lock. The authoritative fix is to establish the
 * session once, before dependent requests fan out.
 */
let firstSessionInFlight: Promise<void> | null = null;

export async function withSerialisedFirstSession<T>(
  hasSession: boolean,
  run: () => Promise<T>,
): Promise<T> {
  if (hasSession) return run();
  if (firstSessionInFlight) await firstSessionInFlight;

  let release!: () => void;
  firstSessionInFlight = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    return await run();
  } finally {
    release();
    firstSessionInFlight = null;
  }
}
