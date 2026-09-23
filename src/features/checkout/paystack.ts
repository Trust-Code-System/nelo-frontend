import { isMarket, type Market } from '@/lib/vendure/channels';

export const PAYSTACK_METHOD_CODE = 'paystack';
export const PAYSTACK_CHECKOUT_ORIGIN = 'https://checkout.paystack.com';

export type PaymentReturnHint = {
  market: Market;
  orderCode: string;
  reference: string;
};

export function paystackAuthorizationUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      url.origin !== PAYSTACK_CHECKOUT_ORIGIN ||
      url.username ||
      url.password ||
      url.hash
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function isPaystackReference(value: unknown): value is string {
  return typeof value === 'string' && /^nelo-[0-9a-f]{36}$/.test(value);
}

export function parsePaymentReturnHint(value: string | undefined): PaymentReturnHint | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<PaymentReturnHint>;
    if (
      !isMarket(parsed.market) ||
      typeof parsed.orderCode !== 'string' ||
      parsed.orderCode.length === 0 ||
      parsed.orderCode.length > 64 ||
      !isPaystackReference(parsed.reference)
    ) {
      return null;
    }
    return {
      market: parsed.market,
      orderCode: parsed.orderCode,
      reference: parsed.reference,
    };
  } catch {
    return null;
  }
}

export function paystackAttemptState(status: string): { paid: boolean; terminal: boolean } {
  return {
    paid: status === 'settled',
    terminal: ['settled', 'failed', 'review_required', 'expired'].includes(status),
  };
}

export function paystackErrorMessage(errorCode: string | null): string {
  switch (errorCode) {
    case 'provider_timeout':
      return 'Paystack took too long to respond. Nothing has been charged; please try again.';
    case 'provider_unavailable':
      return 'Paystack is temporarily unavailable. Nothing has been charged; please try again.';
    case 'authorization_expired':
      return 'This payment link expired before we received confirmation. Do not pay again; contact us with your order code.';
    case 'payment_review_required':
      return 'We could not confirm this payment automatically. Do not pay again; contact us with your order code.';
    default:
      return 'We could not start payment. Nothing has been charged; please try again.';
  }
}
