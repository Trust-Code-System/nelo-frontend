import { notFound } from 'next/navigation';
import { isMarket, MARKETS, type Market } from '@/lib/vendure/channels';

/**
 * Market boundary.
 *
 * An unrecognised segment is a 404 - never a silent redirect to the default Channel.
 * Geographic detection may suggest a market elsewhere; it never resolves one here.
 */

export function generateStaticParams(): { market: Market }[] {
  return MARKETS.map((market) => ({ market }));
}

export default async function MarketLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  // Next 16: route params are async and must be awaited.
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  return <>{children}</>;
}
