import type { SearchCatalogueQuery } from '@/lib/vendure/generated/graphql';
import { buildHref, type CatalogueParams } from './search-params';

/** Single selection per group, retaining the other group's selection. */
export function shopFacetOptions(
  facets: SearchCatalogueQuery['search']['facetValues'],
  codes: string[],
  params: CatalogueParams,
  basePath: string,
) {
  const values = facets.filter(({ facetValue }) => codes.includes(facetValue.facet.code.toLowerCase()));
  if (!values.length) return [];
  const ids = new Set(values.map(({ facetValue }) => facetValue.id));
  const others = params.facets.filter((id) => !ids.has(id));
  return [
    { label: 'All', href: buildHref(basePath, { ...params, facets: others, page: 1 }), active: !params.facets.some((id) => ids.has(id)) },
    ...values.sort((a, b) => a.facetValue.name.localeCompare(b.facetValue.name, undefined, { numeric: true })).map(({ facetValue }) => ({
      label: facetValue.name,
      href: buildHref(basePath, { ...params, facets: [...others, facetValue.id], page: 1 }),
      active: params.facets.includes(facetValue.id),
    })),
  ];
}
