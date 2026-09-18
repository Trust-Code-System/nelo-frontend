/**
 * Backend availability.
 *
 * Some journeys need a reachable Vendure with a seeded catalogue; most do not. CI has no
 * Vendure, so those journeys are SKIPPED with a stated reason rather than deleted or
 * quietly passing. A skipped test that says why is honest; a test that asserts fixture
 * behaviour and calls itself a catalogue test is not.
 *
 * Run them locally by starting ../vendure-dev first.
 */

let cached: boolean | null = null;

export async function catalogueIsLive(): Promise<boolean> {
  if (cached !== null) return cached;

  const url = process.env.VENDURE_SHOP_API_URL ?? 'http://localhost:3000/shop-api';
  const token = process.env.VENDURE_CHANNEL_TOKEN_NG ?? '';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'vendure-token': token },
      body: JSON.stringify({
        query: '{ search(input: { take: 1, groupByProduct: true }) { totalItems } }',
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      cached = false;
      return cached;
    }
    const body = (await response.json()) as {
      data?: { search?: { totalItems?: number } };
    };
    // A reachable API with an empty catalogue is still not enough to browse.
    cached = (body.data?.search?.totalItems ?? 0) > 0;
  } catch {
    cached = false;
  }
  return cached;
}

export const NO_CATALOGUE =
  'needs a reachable Vendure with a seeded catalogue — start ../vendure-dev';
