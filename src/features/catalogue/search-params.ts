import type { SearchInput, SortOrder } from '@/lib/vendure/generated/graphql';

/**
 * Filters, sort and pagination live in the URL.
 *
 * That is deliberate: a filtered view is shareable, survives a refresh, and the back button
 * behaves. It also keeps this state out of the client bundle entirely - the grid stays a
 * Server Component and only the controls are links.
 */

export const PAGE_SIZE = 12;

export type CatalogueParams = {
  /** Facet value ids. Values within a facet are OR-ed; separate facets are AND-ed. */
  facets: string[];
  sort: 'newest' | 'price-asc' | 'price-desc' | 'name';
  page: number;
  inStockOnly: boolean;
  term: string | null;
};

export function parseParams(
  raw: Record<string, string | string[] | undefined>,
): CatalogueParams {
  const facetRaw = raw.f;
  const facets = (Array.isArray(facetRaw) ? facetRaw : facetRaw ? [facetRaw] : [])
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    // Ids are opaque strings, but an id is never empty and never contains a comma.
    .filter((value) => value.length > 0 && value.length < 64);

  const sortRaw = Array.isArray(raw.sort) ? raw.sort[0] : raw.sort;
  const sort: CatalogueParams['sort'] =
    sortRaw === 'price-asc' || sortRaw === 'price-desc' || sortRaw === 'name'
      ? sortRaw
      : 'newest';

  const pageRaw = Number(Array.isArray(raw.page) ? raw.page[0] : raw.page);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw < 1000 ? pageRaw : 1;

  const stockRaw = Array.isArray(raw.stock) ? raw.stock[0] : raw.stock;
  const termRaw = Array.isArray(raw.q) ? raw.q[0] : raw.q;

  return {
    facets,
    sort,
    page,
    inStockOnly: stockRaw === 'ready',
    term: termRaw && termRaw.trim().length > 0 ? termRaw.trim().slice(0, 100) : null,
  };
}

/** Builds the Vendure SearchInput. Facets AND across groups, OR within one. */
export function toSearchInput(
  params: CatalogueParams,
  options: { collectionSlug?: string } = {},
): SearchInput {
  const input: SearchInput = {
    groupByProduct: true,
    take: PAGE_SIZE,
    skip: (params.page - 1) * PAGE_SIZE,
  };

  if (options.collectionSlug) input.collectionSlug = options.collectionSlug;
  if (params.term) input.term = params.term;
  if (params.inStockOnly) input.inStock = true;
  if (params.facets.length > 0) {
    input.facetValueFilters = params.facets.map((id) => ({ or: [id] }));
  }

  const asc: SortOrder = 'ASC';
  const desc: SortOrder = 'DESC';
  if (params.sort === 'price-asc') input.sort = { price: asc };
  else if (params.sort === 'price-desc') input.sort = { price: desc };
  else if (params.sort === 'name') input.sort = { name: asc };

  return input;
}

/** A link that toggles one facet, preserving everything else and resetting to page 1. */
export function toggleFacetHref(
  basePath: string,
  params: CatalogueParams,
  facetId: string,
): string {
  const next = params.facets.includes(facetId)
    ? params.facets.filter((id) => id !== facetId)
    : [...params.facets, facetId];
  return buildHref(basePath, { ...params, facets: next, page: 1 });
}

export function buildHref(basePath: string, params: CatalogueParams): string {
  const search = new URLSearchParams();
  if (params.facets.length > 0) search.set('f', params.facets.join(','));
  if (params.sort !== 'newest') search.set('sort', params.sort);
  if (params.page > 1) search.set('page', String(params.page));
  if (params.inStockOnly) search.set('stock', 'ready');
  if (params.term) search.set('q', params.term);
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export const SORT_LABELS: Readonly<Record<CatalogueParams['sort'], string>> = {
  newest: 'Newest',
  'price-asc': 'Price, low to high',
  'price-desc': 'Price, high to low',
  name: 'Name',
};
