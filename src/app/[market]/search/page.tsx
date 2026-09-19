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
import { isMarket, type Market } from '@/lib/vendure/channels';
import { SearchCatalogueDocument, type SearchCatalogueQuery } from '@/lib/vendure/generated/graphql';
import { catalogueQuery } from '@/lib/vendure/transport';

export const metadata: Metadata = {
  title: 'Search',
  // A results page is not a landing page. Indexing them produces thin duplicates of the
  // collection pages and dilutes the ones that matter.
  robots: { index: false, follow: true },
};

/**
 * Search.
 *
 * Vendure's `search` with a `term`, through the same anonymous cacheable path as the rest of
 * the catalogue — a search for "silk" is not personal, carries no session, and is safe to
 * share between visitors.
 *
 * The query lives in the URL, so the form is a plain GET form and the whole page stays a
 * Server Component. No debounce, no client state, no keystroke-by-keystroke requests at the
 * store.
 *
 * Results depend on Vendure's search index, which the WORKER builds. With the server running
 * and the worker not, this returns nothing for everything — which is why the empty state
 * distinguishes "no matches" from "nothing asked".
 */
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  const raw = await searchParams;
  const catalogueParams = parseParams(raw);
  const term = catalogueParams.term;
  const basePath = `/${market}/search`;

  let search: SearchCatalogueQuery['search'] | null = null;
  let unreachable = false;

  if (term) {
    try {
      const { data } = await catalogueQuery(
        SearchCatalogueDocument,
        { input: toSearchInput(catalogueParams) },
        market,
      );
      search = data.search;
    } catch {
      unreachable = true;
    }
  }

  const total = search?.totalItems ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <SiteHeader market={market} announcement="Every style is made in every size, 6 to 30" />

      <main className="shell">
        <div className="phead">
          <div>
            <span className="lab">Search</span>
            <h1>{term ? `“${term}”` : 'Search'}</h1>
            {term ? (
              <p>
                {total} {total === 1 ? 'garment' : 'garments'} match. Searching covers names,
                descriptions and categories.
              </p>
            ) : (
              <p>Search by name, fabric, occasion or category.</p>
            )}
          </div>
          <SearchForm market={market} term={term} />
        </div>

        {unreachable ? (
          <div className="empty" style={{ marginTop: 'var(--s8)' }}>
            <span className="lab">Temporarily unavailable</span>
            <h2>We cannot search right now</h2>
            <p>This is our side, not yours. Try again in a moment.</p>
            <Link className="btn-q" href={`/${market}/collections`}>
              Browse the collections
            </Link>
          </div>
        ) : !term ? (
          /* "Type something" is a different state from "nothing matched", and conflating
             them is how a store tells a visitor it has no stock when they have not asked
             it anything. */
          <div className="empty" style={{ marginTop: 'var(--s8)' }}>
            <span className="lab">Nothing searched yet</span>
            <h2>What are you looking for?</h2>
            <p>
              Try a name, a fabric, or an occasion. Or browse the collections — every style is
              cut in every size from 6 to 30.
            </p>
            <Link className="btn-q" href={`/${market}/collections`}>
              Browse the collections
            </Link>
          </div>
        ) : (
          <div className="layout">
            <FilterSheet
              activeCount={
                catalogueParams.facets.length + (catalogueParams.inStockOnly ? 1 : 0)
              }
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

              {total === 0 ? (
                <div className="empty">
                  <span className="lab">No matches</span>
                  <h2>Nothing matches “{term}”</h2>
                  <p>
                    Nothing in the collection matches that. The atelier can still cut
                    something to your description.
                  </p>
                  <div className="acts-row">
                    <Link className="btn-q" href={`/${market}/collections`}>
                      Browse everything
                    </Link>
                    <Link className="btn-q" href={`/${market}/atelier`}>
                      Ask the atelier
                    </Link>
                  </div>
                </div>
              ) : (
                <ProductGrid items={search?.items ?? []} market={market} />
              )}

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
        )}

      </main>

      <SiteFooter market={market} />
    </>
  );
}

/**
 * A plain GET form.
 *
 * Submitting navigates, which puts the term in the URL where it belongs: shareable,
 * bookmarkable, and back-button correct. It needs no JavaScript to work at all.
 */
function SearchForm({ market, term }: { market: Market; term: string | null }) {
  return (
    <form className="searchform" action={`/${market}/search`} method="get" role="search">
      <label className="sr" htmlFor="site-search">
        Search the collection
      </label>
      <input
        id="site-search"
        type="search"
        name="q"
        defaultValue={term ?? ''}
        placeholder="Silk, bridal, midi…"
        maxLength={100}
        autoComplete="off"
      />
      <button className="btn-q" type="submit">
        Search
      </button>
    </form>
  );
}
