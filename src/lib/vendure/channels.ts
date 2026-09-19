/**
 * Market → Vendure Channel mapping.
 *
 * Per the backend context document: market resolves from an ALLOWLISTED route segment.
 * Geographic detection may *suggest* a market; it must never silently change one, and an
 * unknown market must fail explicitly rather than falling back to Vendure's default Channel.
 *
 * The channel codes below are defined constants in the backend repository. They are NOT
 * proof that the Channels have been provisioned — tokens must be verified per environment
 * before integration.
 */

export const MARKETS = ['ng', 'international'] as const;
export type Market = (typeof MARKETS)[number];

/** The product default. Used when no market segment is present, never as a silent fallback
 *  for an *invalid* one. */
export const DEFAULT_MARKET: Market = 'ng';

type ChannelConfig = {
  /** Vendure channel code, as defined in apps/commerce/src/config/channel-definitions.ts */
  readonly code: string;
  /** ISO 4217. Minor units are 100 per major unit for both NGN (kobo) and USD (cents). */
  readonly currency: 'NGN' | 'USD';
  readonly locale: string;
  /** Env var holding this channel's `vendure-token`. Routing identifier, not a secret that
   *  grants privileged access — and never a substitute for session authentication. */
  readonly tokenEnv: string;
};

export const CHANNELS: Readonly<Record<Market, ChannelConfig>> = {
  ng: {
    code: 'nelo-ng',
    currency: 'NGN',
    locale: 'en-NG',
    tokenEnv: 'VENDURE_CHANNEL_TOKEN_NG',
  },
  international: {
    code: 'nelo-international',
    currency: 'USD',
    locale: 'en-US',
    tokenEnv: 'VENDURE_CHANNEL_TOKEN_INTERNATIONAL',
  },
};

export function isMarket(value: unknown): value is Market {
  return typeof value === 'string' && (MARKETS as readonly string[]).includes(value);
}

/** Throws on an unknown market. Callers must not paper over this — an unrecognised segment
 *  is a 404, not a redirect to the default Channel. */
export function assertMarket(value: unknown): Market {
  if (!isMarket(value)) {
    throw new UnknownMarketError(String(value));
  }
  return value;
}

export class UnknownMarketError extends Error {
  constructor(readonly received: string) {
    super(`Unknown market segment: ${received}`);
    this.name = 'UnknownMarketError';
  }
}

export function channelFor(market: Market): ChannelConfig {
  return CHANNELS[market];
}

/** Server-only. Resolves the channel token from the environment, failing loudly if the
 *  Channel has not been provisioned for this deployment. */
export function channelToken(market: Market): string {
  const { tokenEnv } = CHANNELS[market];
  const token = process.env[tokenEnv];
  if (!token) {
    throw new Error(
      `${tokenEnv} is not set. The ${CHANNELS[market].code} Channel may not be provisioned ` +
        `in this environment — verify with the backend team before integrating.`,
    );
  }
  return token;
}

/**
 * Formats a Vendure integer minor-unit amount for display.
 *
 * Never used to convert between currencies — Channel pricing is backend-owned, and the
 * frontend must never produce a payable price by applying an exchange rate.
 *
 * Minor units are shown only when there are any. A fixed `maximumFractionDigits: 0` printed
 * $42.99 as "$43", which is a wrong price on a page — the kind of rounding that is invisible
 * on whole-naira pricing and actively misleading the first time a Channel carries cents.
 * Whole amounts still render clean, which is what the direction wants for NGN.
 */
export function formatMoney(minorUnits: number, market: Market): string {
  const { currency, locale } = CHANNELS[market];
  const hasMinorUnits = minorUnits % 100 !== 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasMinorUnits ? 2 : 0,
    maximumFractionDigits: hasMinorUnits ? 2 : 0,
  }).format(minorUnits / 100);
}
