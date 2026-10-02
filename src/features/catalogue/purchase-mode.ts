import type { SearchCatalogueQuery } from '@/lib/vendure/generated/graphql';

/** Commission policy must come from the published catalogue, never from stock status. */
export function commissionFacetIds(facets: SearchCatalogueQuery['search']['facetValues']): string[] {
  return facets.filter(({ facetValue }) => facetValue.facet.code === 'purchase-mode' && facetValue.code === 'commission').map(({ facetValue }) => facetValue.id);
}
