import Link from 'next/link';
import type { SearchCatalogueQuery } from '@/lib/vendure/generated/graphql';
import {
  buildHref,
  toggleFacetHref,
  type CatalogueParams,
} from '@/features/catalogue/search-params';

type FacetValueResult = SearchCatalogueQuery['search']['facetValues'][number];

/**
 * Facet rail.
 *
 * Every control is a link, so this stays a Server Component — no filter state reaches the
 * browser, and a filtered view can be shared or bookmarked. Counts come from Vendure's own
 * facet aggregation rather than being counted here.
 */
export function FilterRail({
  facetValues,
  params,
  basePath,
  total,
}: {
  facetValues: readonly FacetValueResult[];
  params: CatalogueParams;
  basePath: string;
  total: number;
}) {
  // Group by facet so values within one facet read as alternatives.
  const groups = new Map<string, { name: string; values: FacetValueResult[] }>();
  for (const entry of facetValues) {
    const facet = entry.facetValue.facet;
    const group = groups.get(facet.id) ?? { name: facet.name, values: [] };
    group.values.push(entry);
    groups.set(facet.id, group);
  }

  const anyFilter = params.facets.length > 0 || params.inStockOnly;

  // A nav, not an <aside>: a complementary landmark nested inside <main> is flagged, nested
  // navs are not, and a filter rail is exactly the kind of thing a screen-reader user wants
  // to jump straight to.
  return (
    <nav className="rail" aria-label="Filter and refine">
      <div className="fset">
        <h2>Make</h2>
        <ul>
          <li aria-current={params.inStockOnly ? 'true' : undefined}>
            <Link
              href={buildHref(basePath, {
                ...params,
                inStockOnly: !params.inStockOnly,
                page: 1,
              })}
            >
              Ready to ship
            </Link>
            <span>{params.inStockOnly ? 'on' : ''}</span>
          </li>
        </ul>
        <p className="fnote">
          Every style is made in every size. Filtering narrows what is ready to ship, not
          what can be made.
        </p>
      </div>

      {[...groups.entries()].map(([facetId, group]) => (
        <div className="fset" key={facetId}>
          <h2>{group.name}</h2>
          <ul>
            {group.values.map((entry) => {
              const selected = params.facets.includes(entry.facetValue.id);
              return (
                <li key={entry.facetValue.id} aria-current={selected ? 'true' : undefined}>
                  <Link href={toggleFacetHref(basePath, params, entry.facetValue.id)}>
                    {entry.facetValue.name}
                  </Link>
                  <span>{entry.count}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {anyFilter ? (
        <div className="fset">
          <Link
            className="btn-q"
            href={buildHref(basePath, {
              ...params,
              facets: [],
              inStockOnly: false,
              page: 1,
            })}
          >
            Clear filters
          </Link>
          <p className="fnote">
            {total} {total === 1 ? 'garment' : 'garments'} match
          </p>
        </div>
      ) : null}
    </nav>
  );
}
