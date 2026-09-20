import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { ProductGrid } from '@/features/catalogue/ProductGrid';
import { Hero } from '@/features/home/Hero';
import {
  CollectionPreview,
  CommissionSplit,
  Filmstrip,
  ReadoutRail,
  Thesis,
  Ticker,
} from '@/features/home/Editorial';
import { HomeExperience } from '@/features/home/HomeExperience';
import { CurtainIntro } from '@/features/home/CurtainIntro';
import { Magnetic } from '@/features/home/Magnetic';
import { SearchCatalogueDocument } from '@/lib/vendure/generated/graphql';
import { isMarket } from '@/lib/vendure/channels';
import { catalogueQuery } from '@/lib/vendure/transport';
import { marketAlternates } from '@/lib/seo/site';
import { jsonLdScript, organisationJsonLd } from '@/lib/seo/structured-data';
import type { SearchCatalogueQuery } from '@/lib/vendure/generated/graphql';

const VENDURE_SAMPLE_PRODUCT = /laptop|tablet|mouse|monitor|ram|keyboard|phone|camera/i;

/** Keep Vendure's starter technology catalogue out of the fashion campaign. */
function isSampleCatalogue(items: readonly SearchCatalogueQuery['search']['items'][number][]) {
  if (items.length === 0) return false;
  return items.filter((item) => VENDURE_SAMPLE_PRODUCT.test(item.productName)).length >= items.length / 2;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ market: string }>;
}): Promise<Metadata> {
  const { market } = await params;
  if (!isMarket(market)) return {};
  return {
    description:
      'Nigerian luxury womenswear, cut in Lagos. Ready to wear in UK 6 to 30, plus bespoke and bridal commissions from measurements we keep.',
    // The two markets are different pages - different currency, different eligibility - so
    // each is its own canonical and they declare each other as alternates.
    alternates: marketAlternates(market, ''),
  };
}

/**
 * Market home.
 *
 * Reads the catalogue from Vendure through the anonymous, cacheable path - no session is
 * attached, so the response is safe to share between visitors. Prices come from the
 * Channel; nothing is converted here.
 *
 * Composition follows design/mockups/home.html, approved 2026-09-15: campaign hero, the
 * measurement argument, ready-to-wear, then the commissions. One <main> holds all of it -
 * the mockup opened three, which would have given the page three main landmarks. Bands
 * that bleed (the readout rail, the thesis, the pinned lookbook, the ticker) are direct
 * children of <main>;
 * everything measured sits inside a .shell.
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
  // the other is an outage. The campaign above is authored, so it survives either.
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

  const items = search?.items ?? [];
  const campaignItems = isSampleCatalogue(items) ? [] : items;

  return (
    <HomeExperience>
      <CurtainIntro />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(organisationJsonLd(market)) }}
      />

      {/* One delegated island for every magnetic action on the page. */}
      <Magnetic />

      <SiteHeader market={market} announcement="Statement femininity for the modern woman" />

      <main>
        <Hero market={market} items={campaignItems} />

        <ReadoutRail />
        <Thesis market={market} />

        <div className="shell">
          <section
            style={{ paddingBlock: 'var(--s9)' }}
            aria-labelledby="rtw-title"
            data-motion-reveal
          >
            <div className="shead">
              <div>
                <span className="lab lock-on">Ready to wear</span>
                <h2 id="rtw-title" data-motion-words>Linear Summer 26</h2>
              </div>
              <Link
                className="lab"
                href={`/${market}/collections`}
                style={{ color: 'var(--action)' }}
              >
                All collections →
              </Link>
            </div>

            {search ? (
              campaignItems.length > 0 ? (
                <ProductGrid items={campaignItems} market={market} />
              ) : (
                <CollectionPreview market={market} />
              )
            ) : (
              <div className="empty">
                <span className="lab">Temporarily unavailable</span>
                <h3>We cannot load the collection right now</h3>
                <p>
                  This is our side, not yours. The atelier is still open - bespoke and bridal
                  enquiries are unaffected.
                </p>
                <Link className="btn-q" href={`/${market}/atelier`}>
                  Visit the atelier
                </Link>
              </div>
            )}
          </section>
        </div>

        <Filmstrip />
        <Ticker />

        <div className="shell">
          <CommissionSplit market={market} />
        </div>
      </main>

      <SiteFooter market={market} />
    </HomeExperience>
  );
}
