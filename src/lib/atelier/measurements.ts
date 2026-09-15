/**
 * Measurement handling.
 *
 * The backend stores DECIMAL MILLIMETRES TO TWO PLACES. Not integers.
 * A quarter inch is 6.35 mm — rounding it to 6 mm destroys approved precision, and mapping
 * these values to GraphQL `Int` would do the same.
 *
 * So the frontend never converts-and-submits a number. It captures the typed decimal as a
 * STRING plus an explicit unit and lets backend normalisation stay authoritative. The
 * conversion helpers below exist for DISPLAY only.
 *
 * Nothing in this module may be written to a URL, localStorage, analytics, session replay,
 * or any public cache.
 */

export const MEASUREMENT_CODES = [
  'bust',
  'waist',
  'hip',
  'height',
  'shoulderWidth',
  'sleeveLength',
  'inseam',
] as const;

export type MeasurementCode = (typeof MEASUREMENT_CODES)[number];

export type MeasurementUnit = 'inch' | 'centimetre';

/** What the customer typed, preserved verbatim. This is what gets submitted. */
export type MeasurementInput = {
  code: MeasurementCode;
  /** Decimal string exactly as entered — "23.25", never a float. */
  value: string;
  unit: MeasurementUnit;
};

/** What the backend returns. `null` means NOT CONFIRMED — it does not mean zero. */
export type MeasurementValue = {
  code: MeasurementCode;
  millimetres: string | null;
};

export const LABELS: Readonly<Record<MeasurementCode, string>> = {
  bust: 'Bust',
  waist: 'Waist',
  hip: 'Hip',
  height: 'Height',
  shoulderWidth: 'Shoulder',
  sleeveLength: 'Sleeve',
  inseam: 'Inseam',
};

export const GUIDANCE: Readonly<Record<MeasurementCode, string>> = {
  bust: 'Around the fullest part, tape level under the arms.',
  waist: 'The narrowest part of the torso, usually just above the navel.',
  hip: 'Around the fullest part of the hips and seat.',
  height: 'Without shoes, heels together, standing straight.',
  shoulderWidth: 'Across the back, from shoulder point to shoulder point.',
  sleeveLength: 'From shoulder point to wrist bone, arm slightly bent.',
  inseam: 'From the crotch seam to the ankle bone.',
};

const MM_PER_INCH = 25.4;
const MM_PER_CM = 10;

/**
 * Converts using exact integer arithmetic, never floating point.
 *
 * A float round-trip loses the contract: `0.5005 * 10` is 5.004999999999999 in IEEE754,
 * which rounds half-up to 5.00 instead of the correct 5.01. Since these values ARE decimals
 * — that is the whole point of the backend storing decimal millimetres — the conversion is
 * done on the digits with BigInt and only rendered as a string.
 *
 * 1 inch = 25.4 mm is applied as the exact rational 254/10; 1 cm = 10 mm as 10/1.
 * Rounding is half-up to two decimal places, matching backend normalisation.
 */
export function toMillimetres(value: string, unit: MeasurementUnit): string | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return null;

  const whole = match[1] ?? '';
  const fraction = match[2] ?? '';
  const digits = BigInt(whole + fraction);
  if (digits === 0n) return null;

  // value === digits / 10^scale
  let numerator: bigint;
  let scale = fraction.length;
  if (unit === 'inch') {
    numerator = digits * 254n;
    scale += 1;
  } else {
    numerator = digits * BigInt(MM_PER_CM);
  }
  return toFixed2(numerator, scale);
}

/** Renders `numerator / 10^scale` with exactly two decimals, rounding half-up. */
function toFixed2(numerator: bigint, scale: number): string {
  let hundredths: bigint;
  if (scale <= 2) {
    hundredths = numerator * 10n ** BigInt(2 - scale);
  } else {
    const divisor = 10n ** BigInt(scale - 2);
    const quotient = numerator / divisor;
    const remainder = numerator % divisor;
    // half-up, not banker's rounding
    hundredths = remainder * 2n >= divisor ? quotient + 1n : quotient;
  }
  const units = hundredths / 100n;
  const cents = hundredths % 100n;
  return `${units.toString()}.${cents.toString().padStart(2, '0')}`;
}

/**
 * Display only — converts stored millimetres back into the customer's unit.
 * Float division is acceptable here because the result is immediately rendered to two
 * decimals and is never submitted. The stored value remains authoritative.
 */
export function fromMillimetres(mm: string, unit: MeasurementUnit): string {
  const parsed = Number(mm);
  if (!Number.isFinite(parsed)) return '';
  return (parsed / (unit === 'inch' ? MM_PER_INCH : MM_PER_CM)).toFixed(2);
}

/**
 * Accepts a plain decimal only. Rejects empty, non-finite and non-positive values.
 * Returns null rather than throwing so the caller can distinguish "not entered" from
 * "entered and invalid" using `validate` below.
 */
export function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export type ValidationResult =
  | { state: 'empty' }
  | { state: 'invalid'; reason: string }
  | { state: 'implausible'; reason: string; millimetres: string }
  | { state: 'ok'; millimetres: string };

/**
 * Plausible ranges are GUIDANCE, not frontend authority. An out-of-range value is offered
 * for correction or staff review — it is never silently clamped, and the backend remains
 * the validator.
 */
const PLAUSIBLE_MM: Readonly<Record<MeasurementCode, readonly [number, number]>> = {
  bust: [600, 1800],
  waist: [500, 1700],
  hip: [600, 1900],
  height: [1300, 2100],
  shoulderWidth: [280, 650],
  sleeveLength: [400, 850],
  inseam: [550, 1000],
};

export function validate(code: MeasurementCode, value: string, unit: MeasurementUnit): ValidationResult {
  if (value.trim() === '') return { state: 'empty' };

  const parsed = parseDecimal(value);
  if (parsed === null) {
    return {
      state: 'invalid',
      reason: 'Enter a number, using a decimal point for part inches — 23.25, not 23¼.',
    };
  }

  const mm = toMillimetres(value, unit);
  if (mm === null) return { state: 'invalid', reason: 'That value could not be read.' };

  const [min, max] = PLAUSIBLE_MM[code];
  const asNumber = Number(mm);
  if (asNumber < min || asNumber > max) {
    return {
      state: 'implausible',
      millimetres: mm,
      reason: `That is outside the range we usually see for ${LABELS[code].toLowerCase()}. Check it, or send it to the atelier to review.`,
    };
  }
  return { state: 'ok', millimetres: mm };
}

/** Display helper: "863.60 mm" / "34.00 in". Never rounds away the stored precision. */
export function display(mm: string | null, unit: MeasurementUnit | 'millimetre'): string {
  if (mm === null) return 'Not confirmed';
  if (unit === 'millimetre') return `${Number(mm).toFixed(2)} mm`;
  return `${fromMillimetres(mm, unit)} ${unit === 'inch' ? 'in' : 'cm'}`;
}
