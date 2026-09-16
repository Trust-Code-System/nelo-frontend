import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { ProductGrid } from '@/features/catalogue/ProductGrid';
import { SearchCatalogueDocument } from '@/lib/vendure/generated/graphql';
import { isMarket } from '@/lib/vendure/channels';
import { catalogueQuery } from '@/lib/vendure/transport';
import type { SearchCatalogueQuery } from '@/lib/vendure/generated/graphql';

/**
 * Market home.
 *
 * Reads the catalogue from Vendure through the anonymous, cacheable path — no session is
 * attached, so the response is safe to share between visitors. Prices come from the
 * Channel; nothing is converted here.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  // A storefront whose backend is unreachable should say so, not render an empty grid that
  // reads as "we have nothing to sell". The distinction matters: one is a catalogue state,
  // the other is an outage.
  let search: SearchCatalogueQuery['search'] | null = null;
  try {
    const { data } = await catalogueQuery(
      SearchCatalogueDocument,
      { input: { take: 8, groupByProduct: true } },
      market,
    );
    search = data.search;
  } catch {
    search = null;
  }

  return (
    <>
      <SiteHeader market={market} announcement="Statement femininity for the modern woman" />

      <main className="shell">
        <div className="proj-head">
          <div>
            <span className="lab">Collection</span>
            <h1>Ready to Wear</h1>
          </div>
          <div className="proj-meta">
            <span>
              {search
                ? `${search.totalItems} ${search.totalItems === 1 ? 'garment' : 'garments'} · UK 6—30`
                : 'UK 6—30'}
            </span>
          </div>
        </div>

        <section style={{ paddingBlock: 'var(--s7)' }}>
          {search ? (
            <ProductGrid items={search.items} market={market} />
          ) : (
            <div className="empty">
              <span className="lab">Temporarily unavailable</span>
              <h3>We cannot load the collection right now</h3>
              <p>
                This is our side, not yours. The atelier is still open — bespoke and bridal
                enquiries are unaffected.
              </p>
              <a className="btn-q" href={`/${market}/atelier`}>
                Visit the atelier
              </a>
            </div>
          )}
        </section>

        <SiteFooter market={market} />
      </main>
    </>
  );
}
