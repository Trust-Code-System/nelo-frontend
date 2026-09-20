import { describe, expect, it } from 'vitest';
import { assertMarket, formatMoney, isMarket, UnknownMarketError } from './channels';

/**
 * Market resolution and money formatting.
 *
 * Both are places where a small wrong answer is worse than a loud failure: a market that
 * silently falls back charges in the wrong currency, and a price that rounds shows a figure
 * the store will not charge.
 */

describe('markets', () => {
  it('accepts only the allowlisted segments', () => {
    expect(isMarket('ng')).toBe(true);
    expect(isMarket('international')).toBe(true);
    expect(isMarket('NG')).toBe(false);
    expect(isMarket('uk')).toBe(false);
    expect(isMarket('')).toBe(false);
    expect(isMarket(undefined)).toBe(false);
  });

  it('throws on an unknown market rather than falling back to the default Channel', () => {
    // A silent fallback would price a Kenyan visitor's order in naira without telling them.
    expect(() => assertMarket('zz')).toThrow(UnknownMarketError);
    expect(() => assertMarket(null)).toThrow(UnknownMarketError);
  });
});

describe('formatMoney', () => {
  it('shows whole amounts without decimals', () => {
    // ₦185,620.00 stored as kobo. NGN pricing is whole-naira in practice and the direction
    // wants it clean.
    expect(formatMoney(18562000, 'ng')).toBe('₦185,620');
  });

  it('shows minor units when there are any', () => {
    // A fixed maximumFractionDigits of 0 printed $42.99 as "$43" - a price the store would
    // not charge, displayed on the page.
    expect(formatMoney(4299, 'international')).toBe('$42.99');
    expect(formatMoney(18562050, 'international')).toBe('$185,620.50');
  });

  it('formats zero', () => {
    expect(formatMoney(0, 'ng')).toBe('₦0');
    expect(formatMoney(0, 'international')).toBe('$0');
  });

  it('formats the same integer differently per market without converting it', () => {
    // Identical minor units, two currencies. This is a FORMATTING difference and nothing
    // else: there is no exchange rate anywhere in the frontend, and a Channel's price is
    // the Channel's own.
    expect(formatMoney(45000000, 'ng')).toBe('₦450,000');
    expect(formatMoney(45000000, 'international')).toBe('$450,000');
  });
});
