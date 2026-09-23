import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('market proxy payment callback', () => {
  it('leaves the fixed Paystack callback path unprefixed', () => {
    const response = proxy(
      new NextRequest('https://store.example/checkout/payment-return?reference=test'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('still adds a market to ordinary unprefixed paths', () => {
    const response = proxy(new NextRequest('https://store.example/about'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://store.example/ng/about');
  });
});
