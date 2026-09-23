import 'server-only';
import { cookies } from 'next/headers';
import type { Market } from '@/lib/vendure/channels';
import { parsePaymentReturnHint } from './paystack';

export const PAYSTACK_RETURN_COOKIE = 'nelo_paystack_return';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60,
} as const;

export async function writePaymentReturnHint(input: {
  market: Market;
  orderCode: string;
  reference: string;
}): Promise<void> {
  const store = await cookies();
  store.set(PAYSTACK_RETURN_COOKIE, JSON.stringify(input), cookieOptions);
}

export async function readPaymentReturnHint() {
  const store = await cookies();
  return parsePaymentReturnHint(store.get(PAYSTACK_RETURN_COOKIE)?.value);
}
