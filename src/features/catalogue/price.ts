import { formatMoney, type Market } from '@/lib/vendure/channels';
import type { SearchCatalogueQuery } from '@/lib/vendure/generated/graphql';

export type SearchItem = SearchCatalogueQuery['search']['items'][number];

/**
 * Price display for a search result.
 *
 * Vendure returns either a single price or a range across variants, and the union
 * must be handled - a product whose variants differ in price has no single price
 * to show. Minor units are formatted for the market's currency; nothing is
 * converted here.
 *
 * Extracted from ProductGrid so the home page's look index shows prices the same
 * way the grid does. Two renderings of the same money would be a defect.
 */
export function priceLabel(price: SearchItem['priceWithTax'], market: Market): string {
  if (price.__typename === 'SinglePrice') return formatMoney(price.value, market);
  if (price.__typename === 'PriceRange') {
    return price.min === price.max
      ? formatMoney(price.min, market)
      : `${formatMoney(price.min, market)} - ${formatMoney(price.max, market)}`;
  }
  return '';
}
