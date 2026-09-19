import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './state';

/**
 * The post-sign-in destination is caller-supplied, which makes it an open-redirect vector:
 * a sign-in link with `?next=https://evil.example` that sends a customer there straight after
 * they type their password is a credible phishing chain. So every rejection below is a
 * deliberate case rather than a defensive habit.
 */

describe('safeReturnPath', () => {
  it('accepts a path inside the market', () => {
    expect(safeReturnPath('/ng/account/orders', 'ng')).toBe('/ng/account/orders');
    expect(safeReturnPath('/ng', 'ng')).toBe('/ng');
    expect(safeReturnPath('/international/checkout', 'international')).toBe(
      '/international/checkout',
    );
  });

  it('rejects another market, rather than rewriting it', () => {
    // Silently moving someone between markets would change the currency they are about to
    // be charged in. It falls back instead.
    expect(safeReturnPath('/international/cart', 'ng')).toBe('/ng/account');
  });

  it('rejects an absolute URL', () => {
    expect(safeReturnPath('https://evil.example/ng', 'ng')).toBe('/ng/account');
    expect(safeReturnPath('http://localhost:4310/ng', 'ng')).toBe('/ng/account');
  });

  it('rejects a protocol-relative URL', () => {
    // `//evil.example` is a host, not a path, and browsers treat it as one.
    expect(safeReturnPath('//evil.example', 'ng')).toBe('/ng/account');
    expect(safeReturnPath('/ng//evil.example', 'ng')).toBe('/ng/account');
  });

  it('rejects a backslash, which some browsers normalise to a slash', () => {
    expect(safeReturnPath('/\\evil.example', 'ng')).toBe('/ng/account');
    expect(safeReturnPath('/ng\\..\\admin', 'ng')).toBe('/ng/account');
  });

  it('rejects a scheme hidden mid-string', () => {
    expect(safeReturnPath('/ng/javascript:alert(1)', 'ng')).toBe('/ng/account');
    expect(safeReturnPath('javascript:alert(1)', 'ng')).toBe('/ng/account');
  });

  it('rejects anything that is not a usable string', () => {
    expect(safeReturnPath(undefined, 'ng')).toBe('/ng/account');
    expect(safeReturnPath(null, 'ng')).toBe('/ng/account');
    expect(safeReturnPath(42, 'ng')).toBe('/ng/account');
    expect(safeReturnPath('', 'ng')).toBe('/ng/account');
    expect(safeReturnPath(`/ng/${'a'.repeat(600)}`, 'ng')).toBe('/ng/account');
  });
});
