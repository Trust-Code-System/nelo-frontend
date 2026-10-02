import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { ShopProductGrid } from '@/features/catalogue/ShopProductGrid';
import { commissionFacetIds } from '@/features/catalogue/purchase-mode';
import { ShopToolbar } from '@/features/catalogue/ShopToolbar';
import { buildHref, PAGE_SIZE, parseParams, toSearchInput, SORT_LABELS } from '@/features/catalogue/search-params';
import { shopFacetOptions } from '@/features/catalogue/shop-filters';
import { SearchCatalogueDocument, type SearchCatalogueQuery } from '@/lib/vendure/generated/graphql';
import { catalogueQuery } from '@/lib/vendure/transport';
import { marketAlternates } from '@/lib/seo/site';
import { isMarket } from '@/lib/vendure/channels';

export async function generateMetadata({ params }: { params: Promise<{ market: string }> }): Promise<Metadata> {
  const { market } = await params;
  if (!isMarket(market)) return {};
  return {
    title: 'Shop all',
    description: 'Shop the complete NELO Woman catalogue with original campaign images, colours and sizes.',
    alternates: marketAlternates(market, '/shop'),
  };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();
  const query = parseParams(await searchParams);
  const basePath = `/${market}/shop`;
  let search: SearchCatalogueQuery['search'] | null = null;
  let facets: SearchCatalogueQuery['search']['facetValues'] = [];
  try {
    const [results, options] = await Promise.all([
      catalogueQuery(SearchCatalogueDocument, { input: toSearchInput(query) }, market),
      catalogueQuery(SearchCatalogueDocument, { input: { groupByProduct: true, take: 0 } }, market),
    ]);
    search = results.data.search;
    facets = options.data.search.facetValues;
  } catch {
    search = null;
  }
  const colours = shopFacetOptions(facets, ['colour', 'color'], query, basePath);
  const sizes = shopFacetOptions(facets, ['size'], query, basePath);
  const lastPage = Math.max(1, Math.ceil((search?.totalItems ?? 0) / PAGE_SIZE));

  return (
    <>
      <SiteHeader market={market} announcement="Statement femininity, cut in Lagos" />
      <main className="shell shop-page">
        <header className="shop-index-intro">
          <div className="shop-index-intro__copy">
            <span className="lab">The complete house edit</span>
            <h1 data-motion-words><span>Shop</span> <em>all</em></h1>
            <p>
              Explore the current collection. Choose a piece to see its available options and add it to your bag.
            </p>
            {search ? <div className="shop-index-intro__meta">
              <span><strong>{search.totalItems}</strong> matching pieces</span>
            </div> : null}
          </div>
          <div className="shop-index-intro__film" aria-hidden="true" data-motion-clip>
            <Image src="/editorial/live/adele-02.webp" alt="" width={864} height={1080} priority />
            <Image src="/editorial/live/bloom-02.webp" alt="" width={864} height={1080} priority />
            <Image src="/editorial/live/reign-02.webp" alt="" width={864} height={1080} priority />
          </div>
          <span className="shop-index-intro__edition num">NL / INDEX 01</span>
        </header>

        {search ? <>
          <ShopToolbar
            colourLabel="Colour"
            sizeLabel="Size"
            sortLabel={`Sort · ${query.sort === 'newest' ? 'Default' : SORT_LABELS[query.sort]}`}
            colourOptions={colours}
            sizeOptions={sizes}
            sortOptions={Object.entries(SORT_LABELS).map(([value, label]) => ({
              label: value === 'newest' ? 'Default' : label,
              href: buildHref(basePath, { ...query, sort: value as typeof query.sort, page: 1 }),
              active: query.sort === value,
            }))}
            resultCount={search.totalItems}
            activeFilters={query.facets.length}
            clearHref={basePath}
          />
          {search.items.length ? <ShopProductGrid items={search.items} market={market} commissionIds={commissionFacetIds(facets)} /> : (
            <section className="shop-empty">
              <span className="lab">No matching pieces</span>
              <h2>{query.facets.length || query.page > 1 || query.term ? 'Try another selection.' : 'The collection is coming soon.'}</h2>
              <Link className="btn" href={basePath}>View all pieces</Link>
            </section>
          )}
          {lastPage > 1 || query.page > 1 ? (
            <nav className="pager" aria-label="Shop pages">
              {query.page > 1 ? <Link href={buildHref(basePath, { ...query, page: Math.min(query.page - 1, lastPage) })}>← Previous</Link> : <span aria-disabled="true">← Previous</span>}
              <span className="num">{query.page <= lastPage ? `Page ${query.page} of ${lastPage}` : 'Page unavailable'}</span>
              {query.page < lastPage ? <Link href={buildHref(basePath, { ...query, page: query.page + 1 })}>Next →</Link> : <span aria-disabled="true">Next →</span>}
            </nav>
          ) : null}
        </> : (
          <section className="shop-empty">
            <h2>We cannot load the shop right now.</h2>
            <p>Please try again shortly.</p>
            <Link className="btn" href={buildHref(basePath, query)}>Try again</Link>
          </section>
        )}

        <section className="shop-service" aria-labelledby="shop-service-title" data-motion-reveal>
          <span className="lab">Need a different finish?</span>
          <h2 id="shop-service-title">The atelier begins with your measurements.</h2>
          <p>Commission a new piece, adjust an existing style, or prepare for a fitting in Lagos.</p>
          <Link className="btn" href={`/${market}/atelier`}>Begin a commission</Link>
        </section>
      </main>
      <SiteFooter market={market} />
    </>
  );
}
