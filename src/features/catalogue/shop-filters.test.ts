import { describe, expect, it } from 'vitest';
import { shopFacetOptions } from './shop-filters';
import { parseParams, toSearchInput } from './search-params';
const facets = ['red', 'blue'].map((id) => ({ count: 1, facetValue: { id, name: id, code: id, facet: { id: 'colour', name: 'Colour', code: 'colour' } } }));
describe('live shop filtering', () => {
  it('replaces colour while keeping size, sort and market, and resets pagination', () => {
    const options = shopFacetOptions(facets, ['colour'], parseParams({ f: 'red,size-12', sort: 'price-desc', page: '3' }), '/international/shop');
    const href = options.find((o) => o.label === 'blue')!.href;
    expect(href).toContain('/international/shop');
    const raw = Object.fromEntries(new URL(href, 'https://example.test').searchParams);
    expect(toSearchInput(parseParams(raw))).toEqual({ groupByProduct: true, take: 12, skip: 0, facetValueFilters: [{ or: ['size-12'] }, { or: ['blue'] }], sort: { price: 'DESC' } });
    expect(options[0]?.href).toBe('/international/shop?f=size-12&sort=price-desc');
  });
  it('does not invent options for an unconfigured facet', () => {
    expect(shopFacetOptions([], ['size'], parseParams({}), '/ng/shop')).toEqual([]);
  });
  it('uses server pagination and rejects invalid page input', () => {
    expect(toSearchInput(parseParams({ page: '2' })).skip).toBe(12);
    expect(toSearchInput(parseParams({ page: '-1' })).skip).toBe(0);
  });
});
