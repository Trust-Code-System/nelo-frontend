import { describe, expect, it } from 'vitest';
import {
  parsePaymentReturnHint,
  paystackAttemptState,
  paystackAuthorizationUrl,
} from './paystack';

describe('Paystack checkout boundary', () => {
  it('accepts only the fixed Paystack checkout origin', () => {
    expect(paystackAuthorizationUrl('https://checkout.paystack.com/abc')).toBe(
      'https://checkout.paystack.com/abc',
    );
    expect(paystackAuthorizationUrl('https://checkout.paystack.com.evil.test/abc')).toBeNull();
    expect(paystackAuthorizationUrl('http://checkout.paystack.com/abc')).toBeNull();
    expect(paystackAuthorizationUrl('https://checkout.paystack.com:444/abc')).toBeNull();
  });

  it('rejects malformed return hints', () => {
    expect(
      parsePaymentReturnHint(
        JSON.stringify({
          market: 'ng',
          orderCode: 'T123',
          reference: `nelo-${'a'.repeat(36)}`,
        }),
      ),
    ).toEqual({ market: 'ng', orderCode: 'T123', reference: `nelo-${'a'.repeat(36)}` });
    expect(parsePaymentReturnHint('{')).toBeNull();
    expect(
      parsePaymentReturnHint(
        JSON.stringify({ market: 'ng', orderCode: 'T123', reference: 'attacker-value' }),
      ),
    ).toBeNull();
  });

  it('treats only settled as paid and stops on terminal failures', () => {
    expect(paystackAttemptState('settled')).toEqual({ paid: true, terminal: true });
    expect(paystackAttemptState('awaiting_payment')).toEqual({ paid: false, terminal: false });
    expect(paystackAttemptState('review_required')).toEqual({ paid: false, terminal: true });
  });
});
