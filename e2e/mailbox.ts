import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The development mailbox.
 *
 * Vendure's EmailPlugin in `devMode` writes each email to a JSON file instead of sending it.
 * That is the only way to get at a verification or reset token without a real mailbox, so it
 * is how the account round-trip journey completes.
 *
 * It is a HARNESS dependency and is treated as one: a journey that needs it skips with a
 * stated reason when the directory is not there, exactly like the catalogue guard. CI has no
 * Vendure and therefore no mailbox.
 */

const MAILBOX = join(process.cwd(), '..', 'vendure-dev', 'static', 'email', 'test-emails');

export const NO_MAILBOX =
  'needs the ../vendure-dev development mailbox — start the Vendure dev server';

export function mailboxIsAvailable(): boolean {
  return existsSync(MAILBOX);
}

type DevEmail = { recipient: string; subject: string; body: string; date: string };

/**
 * The newest email to an address, or null.
 *
 * Emails are written by the WORKER, not the server, so there is a gap between the mutation
 * returning and the file appearing. Rather than sleeping a fixed amount, this polls for a
 * bounded time — a fixed sleep is either flaky or slow, and usually both.
 */
export async function waitForEmail(
  recipient: string,
  options: { subjectMatches?: RegExp; timeoutMs?: number } = {},
): Promise<DevEmail | null> {
  const deadline = Date.now() + (options.timeoutMs ?? 15_000);

  while (Date.now() < deadline) {
    const match = newestEmail(recipient, options.subjectMatches);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
}

function newestEmail(recipient: string, subjectMatches?: RegExp): DevEmail | null {
  if (!existsSync(MAILBOX)) return null;

  // Filenames are prefixed with an ISO timestamp, so a lexical sort is a chronological one.
  const files = readdirSync(MAILBOX)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .reverse();

  for (const name of files) {
    let email: DevEmail;
    try {
      email = JSON.parse(readFileSync(join(MAILBOX, name), 'utf8')) as DevEmail;
    } catch {
      // A file caught mid-write is not a failure; the next poll will read it whole.
      continue;
    }
    if (email.recipient !== recipient) continue;
    if (subjectMatches && !subjectMatches.test(email.subject)) continue;
    return email;
  }
  return null;
}

/**
 * Pulls a token out of an emailed link.
 *
 * The backend's development templates still point at `http://localhost:8080/verify` and
 * `/password-reset` — placeholders, not the storefront's routes. That mismatch is recorded in
 * the README as an open item for the backend team; here the token is simply extracted from
 * whatever URL the template used, so the journey does not depend on the placeholder being
 * fixed first.
 */
export function tokenFromEmail(email: DevEmail): string | null {
  const match = /[?&]token=([^"'&\s<]+)/.exec(email.body);
  return match?.[1] ?? null;
}
