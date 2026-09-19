import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { FilterRail } from '@/features/catalogue/FilterRail';
import { FilterSheet } from '@/features/catalogue/FilterSheet';
import { ProductGrid } from '@/features/catalogue/ProductGrid';
import {
  buildHref,
  PAGE_SIZE,
  parseParams,
  SORT_LABELS,
  toSearchInput,
} from '@/features/catalogue/search-params';
import { marketAlternates } from '@/lib/seo/site';
import { breadcrumbJsonLd, collectionJsonLd, jsonLdScript } from '@/lib/seo/structured-data';
import { isMarket, type Market } from '@/lib/vendure/channels';
import {
  CollectionBySlugDocument,
  SearchCatalogueDocument,
  type SearchCatalogueQuery,
} from '@/lib/vendure/generated/graphql';
import { catalogueQuery } from '@/lib/vendure/transport';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ market: string; slug: string }>;
}): Promise<Metadata> {
  const { market, slug } = await params;
  if (!isMarket(market)) return {};
  try {
    const { data } = await catalogueQuery(CollectionBySlugDocument, { slug }, market);
    if (!data.collection) return {};
    const description =
      data.collection.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) ||
      `${data.collection.name} — cut in Lagos, UK 6 to 30.`;
    return {
      title: data.collection.name,
      description,
      alternates: marketAlternates(market, `/collections/${slug}`),
      openGraph: { title: data.collection.name, description, type: 'website' },
    };
  } catch {
    return {};
  }
}

/**
 * Collection.
 *
 * Filters, sort and pagination are URL state, so the whole page stays server-rendered and a
 * filtered view is shareable. Vendure's search supplies both the results and the facet
 * counts — nothing is aggregated here.
 */
export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market, slug } = await params;
  if (!isMarket(market)) notFound();

  const catalogueParams = parseParams(await searchParams);
  const basePath = `/${market}/collections/${slug}`;

  let collection: { name: string; description: string } | null = null;
  let search: SearchCatalogueQuery['search'] | null = null;

  try {
    // Independent reads, so fetch them together.
    const [collectionResult, searchResult] = await Promise.all([
      catalogueQuery(CollectionBySlugDocument, { slug }, market),
      catalogueQuery(
        SearchCatalogueDocument,
        { input: toSearchInput(catalogueParams, { collectionSlug: slug }) },
        market,
      ),
    ]);
    collection = collectionResult.data.collection;
    search = searchResult.data.search;
  } catch {
    collection = null;
    search = null;
  }

  if (!collection && !search) {
    return <Unavailable market={market} />;
  }
  if (!collection) notFound();

  const total = search?.totalItems ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {/* Built from the same objects the grid renders, so the item list can never claim
          products the page is not showing. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            collectionJsonLd({
              name: collection.name,
              description: collection.description,
              market,
              slug,
              search,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: 'Nelo Woman', path: `/${market}` },
              { name: 'Collections', path: `/${market}/collections` },
              { name: collection.name, path: `/${market}/collections/${slug}` },
            ]),
          ),
        }}
      />

      <SiteHeader market={market} announcement="Complimentary shipping within Nigeria over ₦150,000" />

      <main className="shell">
        <div className="phead">
          <div>
            <span className="lab">Collection</span>
            <h1>{collection.name}</h1>
            {collection.description ? <p>{collection.description}</p> : null}
          </div>
          <span className="count">
            {total} {total === 1 ? 'garment' : 'garments'} · UK 6—30
          </span>
        </div>

        <div className="layout">
          <FilterSheet
            activeCount={catalogueParams.facets.length + (catalogueParams.inStockOnly ? 1 : 0)}
            total={total}
          >
            <FilterRail
              facetValues={search?.facetValues ?? []}
              params={catalogueParams}
              basePath={basePath}
              total={total}
            />
          </FilterSheet>

          <div>
            <div className="bar">
              <div className="chips">
                {catalogueParams.inStockOnly ? (
                  <span className="chip">
                    <b>Ready to ship</b>
                  </span>
                ) : null}
                {catalogueParams.facets.length > 0 ? (
                  <span className="chip">
                    <b>
                      {catalogueParams.facets.length}{' '}
                      {catalogueParams.facets.length === 1 ? 'filter' : 'filters'}
                    </b>
                  </span>
                ) : null}
              </div>
              <nav className="sorts" aria-label="Sort">
                {(Object.keys(SORT_LABELS) as (keyof typeof SORT_LABELS)[]).map((option) => (
                  <Link
                    key={option}
                    href={buildHref(basePath, { ...catalogueParams, sort: option, page: 1 })}
                    aria-current={catalogueParams.sort === option ? 'true' : undefined}
                  >
                    {SORT_LABELS[option]}
                  </Link>
                ))}
              </nav>
            </div>

            <ProductGrid items={search?.items ?? []} market={market} />

            {lastPage > 1 ? (
              <nav className="pager" aria-label="Pages">
                {catalogueParams.page > 1 ? (
                  <Link
                    href={buildHref(basePath, {
                      ...catalogueParams,
                      page: catalogueParams.page - 1,
                    })}
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span aria-disabled="true">← Previous</span>
                )}
                <span className="num">
                  Page {catalogueParams.page} of {lastPage}
                </span>
                {catalogueParams.page < lastPage ? (
                  <Link
                    href={buildHref(basePath, {
                      ...catalogueParams,
                      page: catalogueParams.page + 1,
                    })}
                  >
                    Next →
                  </Link>
                ) : (
                  <span aria-disabled="true">Next →</span>
                )}
              </nav>
            ) : null}
          </div>
        </div>

        <SiteFooter market={market} />
      </main>
    </>
  );
}

function Unavailable({ market }: { market: Market }) {
  return (
    <>
      <SiteHeader market={market} announcement="Complimentary shipping within Nigeria over ₦150,000" />
      <main className="shell">
        <div className="empty" style={{ marginTop: 'var(--s9)' }}>
          <span className="lab">Temporarily unavailable</span>
          <h2>We cannot load this collection right now</h2>
          <p>This is our side, not yours. The atelier is unaffected.</p>
          <Link className="btn-q" href={`/${market}/atelier`}>
            Visit the atelier
          </Link>
        </div>
        <SiteFooter market={market} />
      </main>
    </>
  );
}
