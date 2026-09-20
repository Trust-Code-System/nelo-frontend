'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertMarket, type Market } from '@/lib/vendure/channels';
import { presentableMessage } from '@/lib/vendure/errors';
import {
  ActiveOrderDocument,
  LoginDocument,
  LogoutDocument,
  RefreshCustomerVerificationDocument,
  RegisterCustomerAccountDocument,
  RequestPasswordResetDocument,
  ResetPasswordDocument,
  UpdateCustomerPasswordDocument,
  VerifyCustomerAccountDocument,
} from '@/lib/vendure/generated/graphql';
import {
  clearSessionToken,
  readSessionToken,
  writeSessionToken,
} from '@/lib/vendure/session';
import { vendureQuery } from '@/lib/vendure/transport';
import { safeReturnPath, type FormState } from './state';

/**
 * Account Server Actions.
 *
 * Vendure is the authority for every one of these. No auth library, no password hashing
 * here, no local user record - the storefront's entire share of authentication is holding
 * an opaque session token in an HttpOnly cookie and knowing which mutation to call.
 *
 * Two things every action here does:
 *
 *   - Validates its own inputs. A Server Action is a reachable POST endpoint; the form in
 *     front of it is not a check.
 *   - Branches the result union on `__typename`. `login` returning `NotVerifiedError` is
 *     HTTP 200 with no GraphQL errors and no session, and treating that as success would
 *     leave a customer looking at a signed-out account page with no explanation.
 */

const EMAIL_MAX = 254;
const PASSWORD_MAX = 200;

function readString(form: FormData, name: string, max: number): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** Secrets are read verbatim. Trimming a password silently changes it, so a password whose
 *  first character is a space would be accepted at registration and rejected at sign-in. */
function readSecret(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.slice(0, PASSWORD_MAX) : '';
}

/** Deliberately permissive. Vendure owns address validity; this only rejects the obviously
 *  unusable so the customer is told before a round trip. */
function looksLikeEmail(value: string): boolean {
  return value.length > 2 && value.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function fieldError(field: string, message: string): FormState {
  return { status: 'error', message, fieldErrors: { [field]: message } };
}

function unexpected(error: unknown): FormState {
  return { status: 'error', message: presentableMessage(error) };
}

/**
 * Sign in.
 *
 * The existing guest session token is deliberately still attached when this runs: Vendure
 * applies its own OrderMergeStrategy when an anonymous session authenticates, and stripping
 * the session first would throw away the guest's cart instead of merging it.
 *
 * What the merge actually produced is then re-read rather than assumed. The configured
 * strategy may merge, may keep the existing customer order, or may discard the guest lines -
 * that is the backend's decision, and the storefront's job is to display the result.
 */
export async function login(_previous: FormState, form: FormData): Promise<FormState> {
  let destination: string;
  try {
    const market = assertMarket(form.get('market'));
    const email = readString(form, 'email', EMAIL_MAX);
    const password = readSecret(form, 'password');
    const rememberMe = form.get('rememberMe') === 'on';
    destination = safeReturnPath(form.get('next'), market);

    if (!looksLikeEmail(email)) return fieldError('email', 'Enter the email address on your account.');
    if (password.length === 0) return fieldError('password', 'Enter your password.');

    const { data, authToken } = await vendureQuery(
      LoginDocument,
      { email, password, rememberMe },
      { market },
    );
    const result = data.login;

    if (result.__typename !== 'CurrentUser') {
      // InvalidCredentialsError is deliberately not made more specific than Vendure made it:
      // saying which half was wrong tells an attacker which addresses have accounts.
      if (result.__typename === 'NotVerifiedError') {
        return {
          status: 'error',
          message:
            'This account has not been verified yet. Check your email for the verification link, or request a new one.',
        };
      }
      return { status: 'error', message: result.message };
    }

    if (authToken) await writeSessionToken(authToken);

    // Re-read rather than assume. The cart the customer ends up with is whatever Vendure's
    // merge strategy produced, and the header count and bag page must agree with it.
    try {
      await vendureQuery(ActiveOrderDocument, {}, { market });
    } catch {
      // A failed refetch is not a failed sign-in. The next render reads it again.
    }

    revalidatePath(`/${market}`, 'layout');
  } catch (error) {
    return unexpected(error);
  }

  // Outside the try: redirect() signals by throwing, and catching it here would turn a
  // successful sign-in into "something went wrong".
  redirect(destination);
}

/**
 * Sign out.
 *
 * Both halves are required and in this order: Vendure invalidates the session server-side,
 * then the cookie goes. Clearing only the cookie would leave a live session token that was
 * never revoked; calling only the mutation would leave the browser presenting a dead token
 * on every request.
 */
export async function logout(_previous: FormState, form: FormData): Promise<FormState> {
  let market: Market;
  try {
    market = assertMarket(form.get('market'));
    try {
      await vendureQuery(LogoutDocument, {}, { market });
    } finally {
      // Even if Vendure could not be reached, the local session must not survive a sign-out
      // the customer asked for.
      await clearSessionToken();
    }
    revalidatePath(`/${market}`, 'layout');
  } catch (error) {
    return unexpected(error);
  }
  redirect(`/${market}`);
}

/**
 * Register.
 *
 * Success here does NOT mean signed in. With verification enabled - Vendure's default, and
 * what the harness runs - the customer must follow the emailed token to
 * `verifyCustomerAccount` first. Showing "welcome back" at this point would be a lie the
 * next page load would expose.
 */
export async function register(_previous: FormState, form: FormData): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const email = readString(form, 'email', EMAIL_MAX);
    const password = readSecret(form, 'password');
    const firstName = readString(form, 'firstName', 80);
    const lastName = readString(form, 'lastName', 80);
    const phoneNumber = readString(form, 'phoneNumber', 40);

    if (!looksLikeEmail(email)) return fieldError('email', 'Enter a valid email address.');
    if (firstName.length === 0) return fieldError('firstName', 'Enter your first name.');
    if (lastName.length === 0) return fieldError('lastName', 'Enter your last name.');
    if (password.length < 8) {
      return fieldError('password', 'Use at least 8 characters. Vendure enforces the rest.');
    }

    const { data } = await vendureQuery(
      RegisterCustomerAccountDocument,
      {
        input: {
          emailAddress: email,
          firstName,
          lastName,
          password,
          ...(phoneNumber ? { phoneNumber } : {}),
        },
      },
      { market },
    );
    const result = data.registerCustomerAccount;

    if (result.__typename !== 'Success') {
      return { status: 'error', message: result.message };
    }

    return {
      status: 'success',
      message:
        'Check your email. We have sent a link that confirms the address belongs to you - your account is ready once you follow it.',
    };
  } catch (error) {
    return unexpected(error);
  }
}

/** Re-sends the verification email. Answers identically whether or not the address is
 *  registered, so it cannot be used to discover which ones are. */
export async function resendVerification(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const email = readString(form, 'email', EMAIL_MAX);
    if (!looksLikeEmail(email)) return fieldError('email', 'Enter a valid email address.');

    await vendureQuery(RefreshCustomerVerificationDocument, { email }, { market });
    return {
      status: 'success',
      message: 'If that address has an account awaiting verification, a new link is on its way.',
    };
  } catch (error) {
    return unexpected(error);
  }
}

/**
 * Verify an account from the emailed token.
 *
 * Vendure signs the customer in as part of this, so the returned session token is captured
 * exactly as it is on login.
 */
export async function verifyAccount(_previous: FormState, form: FormData): Promise<FormState> {
  let market: Market;
  try {
    market = assertMarket(form.get('market'));
    const token = readString(form, 'token', 512);
    const password = readSecret(form, 'password');
    if (token.length === 0) {
      return { status: 'error', message: 'This verification link is incomplete.' };
    }

    const { data, authToken } = await vendureQuery(
      VerifyCustomerAccountDocument,
      { token, ...(password ? { password } : {}) },
      { market },
    );
    const result = data.verifyCustomerAccount;

    if (result.__typename !== 'CurrentUser') {
      return { status: 'error', message: result.message };
    }
    if (authToken) await writeSessionToken(authToken);
    revalidatePath(`/${market}`, 'layout');
  } catch (error) {
    return unexpected(error);
  }
  redirect(`/${market}/account`);
}

/**
 * Start a password reset.
 *
 * Vendure's `requestPasswordReset` is nullable and returns success for an unknown address on
 * purpose. The message below is the same either way for the same reason - the response must
 * not reveal which addresses have accounts.
 */
export async function requestPasswordReset(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const email = readString(form, 'email', EMAIL_MAX);
    if (!looksLikeEmail(email)) return fieldError('email', 'Enter a valid email address.');

    const { data } = await vendureQuery(RequestPasswordResetDocument, { email }, { market });
    const result = data.requestPasswordReset;

    // A typed error here is a configuration problem (no native auth strategy), not something
    // the customer did. It still has to be shown rather than swallowed into a false success.
    if (result && result.__typename !== 'Success') {
      return { status: 'error', message: result.message };
    }

    return {
      status: 'success',
      message: 'If that address has an account, a reset link is on its way to it.',
    };
  } catch (error) {
    return unexpected(error);
  }
}

/** Completes a reset from the emailed token. Vendure signs the customer in on success. */
export async function resetPassword(_previous: FormState, form: FormData): Promise<FormState> {
  let market: Market;
  try {
    market = assertMarket(form.get('market'));
    const token = readString(form, 'token', 512);
    const password = readSecret(form, 'password');
    const confirm = readSecret(form, 'confirmPassword');

    if (token.length === 0) {
      return { status: 'error', message: 'This reset link is incomplete. Request a new one.' };
    }
    if (password.length < 8) {
      return fieldError('password', 'Use at least 8 characters.');
    }
    if (password !== confirm) {
      return fieldError('confirmPassword', 'The two passwords do not match.');
    }

    const { data, authToken } = await vendureQuery(
      ResetPasswordDocument,
      { token, password },
      { market },
    );
    const result = data.resetPassword;

    if (result.__typename !== 'CurrentUser') {
      return { status: 'error', message: result.message };
    }
    if (authToken) await writeSessionToken(authToken);
    revalidatePath(`/${market}`, 'layout');
  } catch (error) {
    return unexpected(error);
  }
  redirect(`/${market}/account`);
}

/** Changes the password of a signed-in customer. Requires the current one - Vendure checks
 *  it, and a session alone is not enough to take over an account. */
export async function changePassword(_previous: FormState, form: FormData): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const currentPassword = readSecret(form, 'currentPassword');
    const newPassword = readSecret(form, 'newPassword');
    const confirm = readSecret(form, 'confirmPassword');

    if (currentPassword.length === 0) {
      return fieldError('currentPassword', 'Enter your current password.');
    }
    if (newPassword.length < 8) return fieldError('newPassword', 'Use at least 8 characters.');
    if (newPassword !== confirm) {
      return fieldError('confirmPassword', 'The two passwords do not match.');
    }

    const { data } = await vendureQuery(
      UpdateCustomerPasswordDocument,
      { currentPassword, newPassword },
      { market },
    );
    const result = data.updateCustomerPassword;

    if (result.__typename !== 'Success') {
      return { status: 'error', message: result.message };
    }
    return { status: 'success', message: 'Your password has been changed.' };
  } catch (error) {
    return unexpected(error);
  }
}

/** Sign-in state for a Server Component that only needs the boolean. Kept here so the
 *  account pages do not each re-implement it. */
export async function hasSessionCookie(): Promise<boolean> {
  return Boolean(await readSessionToken());
}
