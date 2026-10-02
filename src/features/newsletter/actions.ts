'use server';

import type { FormState } from '@/features/account/state';
import { assertMarket } from '@/lib/vendure/channels';

export async function subscribeNewsletter(_previous: FormState, form: FormData): Promise<FormState> {
  let market;
  try { market = assertMarket(form.get('market')); }
  catch { return { status: 'error', message: 'Choose a valid region and try again.' }; }
  const raw = form.get('email');
  const email = typeof raw === 'string' ? raw.trim() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Enter a valid email address.', fieldErrors: { email: 'Enter a valid email address.' } };
  }
  const endpoint = process.env.NELO_NEWSLETTER_WEBHOOK_URL;
  if (!endpoint) return { status: 'error', message: 'Newsletter sign-up is opening soon. Please try again later; your email has not been subscribed.' };
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:') throw new Error('Invalid newsletter endpoint');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.NELO_NEWSLETTER_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${process.env.NELO_NEWSLETTER_WEBHOOK_TOKEN}`;
    const response = await fetch(url, {
      method: 'POST', headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ email, market, consent: true, source: 'storefront-footer' }),
    });
    if (!response.ok) throw new Error('Newsletter rejected');
    return { status: 'success', message: 'Your sign-up request was received. Check your inbox for any confirmation required to join the list.' };
  } catch { return { status: 'error', message: 'We could not confirm your sign-up. Please try again later.' }; }
}
