import { describe, expect, it } from 'vitest';
import {
  display,
  fromMillimetres,
  MEASUREMENT_CODES,
  parseDecimal,
  toMillimetres,
  validate,
} from './measurements';

/**
 * These tests exist to protect one thing: the backend stores decimal millimetres to two
 * places, and a quarter inch is 6.35 mm. Any change that rounds to whole millimetres, or
 * routes a value through an integer, breaks the approved contract silently - the UI would
 * still look correct.
 */

describe('toMillimetres', () => {
  it('keeps quarter-inch precision - the case the contract is written around', () => {
    expect(toMillimetres('0.25', 'inch')).toBe('6.35');
  });

  it('converts whole inches exactly', () => {
    expect(toMillimetres('34', 'inch')).toBe('863.60');
    expect(toMillimetres('28', 'inch')).toBe('711.20');
    expect(toMillimetres('38', 'inch')).toBe('965.20');
    expect(toMillimetres('66', 'inch')).toBe('1676.40');
  });

  it('converts eighth and quarter inches without drift', () => {
    expect(toMillimetres('23.25', 'inch')).toBe('590.55');
    expect(toMillimetres('15.50', 'inch')).toBe('393.70');
    expect(toMillimetres('31.125', 'inch')).toBe('790.58');
  });

  it('converts centimetres', () => {
    expect(toMillimetres('86.36', 'centimetre')).toBe('863.60');
    expect(toMillimetres('0.635', 'centimetre')).toBe('6.35');
  });

  it('always returns two decimal places, never a bare integer', () => {
    const mm = toMillimetres('1', 'centimetre');
    expect(mm).toBe('10.00');
    expect(mm).toMatch(/\.\d{2}$/);
  });

  it('rounds half-up to two decimals, matching backend normalisation', () => {
    // 3.001 in = 76.2254 mm -> 76.23
    expect(toMillimetres('3.001', 'inch')).toBe('76.23');
    // 0.5005 cm = 5.005 mm -> 5.01 (half-up, not banker's rounding)
    expect(toMillimetres('0.5005', 'centimetre')).toBe('5.01');
  });

  it('returns null for values it cannot read', () => {
    expect(toMillimetres('', 'inch')).toBeNull();
    expect(toMillimetres('abc', 'inch')).toBeNull();
    expect(toMillimetres('0', 'inch')).toBeNull();
    expect(toMillimetres('-5', 'inch')).toBeNull();
  });
});

describe('parseDecimal', () => {
  it('rejects fraction glyphs and mixed notation - the customer must type a decimal', () => {
    expect(parseDecimal('23¼')).toBeNull();
    expect(parseDecimal('23 1/4')).toBeNull();
    expect(parseDecimal('23,25')).toBeNull();
  });

  it('rejects non-finite and non-positive input', () => {
    expect(parseDecimal('Infinity')).toBeNull();
    expect(parseDecimal('NaN')).toBeNull();
    expect(parseDecimal('0')).toBeNull();
    expect(parseDecimal('0.0')).toBeNull();
  });

  it('accepts a plain decimal with surrounding whitespace', () => {
    expect(parseDecimal('  23.25 ')).toBe(23.25);
  });
});

describe('round-tripping', () => {
  it('survives inch -> mm -> inch', () => {
    const mm = toMillimetres('23.25', 'inch');
    expect(mm).not.toBeNull();
    expect(fromMillimetres(mm as string, 'inch')).toBe('23.25');
  });

  it('preserves the typed value when the display unit changes', () => {
    // Switching units must not mutate what was captured; it only re-renders it.
    const mm = toMillimetres('34.00', 'inch') as string;
    expect(fromMillimetres(mm, 'centimetre')).toBe('86.36');
    expect(fromMillimetres(mm, 'inch')).toBe('34.00');
  });
});

describe('validate', () => {
  it('distinguishes empty from invalid', () => {
    expect(validate('bust', '', 'inch')).toEqual({ state: 'empty' });
    expect(validate('bust', 'abc', 'inch').state).toBe('invalid');
  });

  it('accepts a plausible value and reports its millimetres', () => {
    expect(validate('bust', '34', 'inch')).toEqual({ state: 'ok', millimetres: '863.60' });
  });

  it('flags an implausible value WITHOUT clamping it', () => {
    const result = validate('height', '12', 'inch');
    expect(result.state).toBe('implausible');
    if (result.state === 'implausible') {
      // The out-of-range value is preserved and offered for correction.
      expect(result.millimetres).toBe('304.80');
    }
  });

  it('treats ranges as guidance, not authority - every code has a range', () => {
    for (const code of MEASUREMENT_CODES) {
      expect(validate(code, '1000', 'inch').state).toBe('implausible');
    }
  });
});

describe('display', () => {
  it('renders null as "Not confirmed", never as zero', () => {
    expect(display(null, 'millimetre')).toBe('Not confirmed');
    expect(display(null, 'inch')).toBe('Not confirmed');
  });

  it('shows two decimals with the unit', () => {
    expect(display('863.60', 'millimetre')).toBe('863.60 mm');
    expect(display('863.60', 'inch')).toBe('34.00 in');
    expect(display('863.60', 'centimetre')).toBe('86.36 cm');
  });

  it('does not confuse a zero-valued string with an absent value', () => {
    // "0.00" is a stored value (however unlikely); null is absence. They must differ.
    expect(display('0.00', 'millimetre')).toBe('0.00 mm');
  });
});
