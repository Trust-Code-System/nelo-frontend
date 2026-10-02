import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.stubGlobal('React', React);
vi.mock('@/lib/vendure/transport', () => ({ catalogueQuery: query }));
vi.mock('@/components/SiteHeader', () => ({ SiteHeader: () => null }));
vi.mock('@/components/SiteFooter', () => ({ SiteFooter: () => null }));
vi.mock('@/features/catalogue/VariantSelector', () => ({ VariantSelector: () => <button>Add to bag</button> }));
vi.mock('@/features/catalogue/ProductGallery', () => ({ ProductGallery: () => null }));
import ProductPage, { generateMetadata } from '@/app/[market]/products/[slug]/page';
import ShopPage from '@/app/[market]/shop/page';
beforeEach(() => { query.mockReset(); process.env.NELO_SITE_URL = 'https://example.test'; });
const params = () => Promise.resolve({ market: 'ng', slug: 'adele' });
const product = { id: 'live', name: 'Live Adele', slug: 'adele', description: '', featuredAsset: null, assets: [], optionGroups: [], variants: [] };
function setup(value: typeof product | null) {
  query.mockImplementation(async (_doc, variables) => variables.input ? { data: { search: { totalItems: 0, items: [], facetValues: [] } } } : { data: { product: value } });
}
function treeText(node: React.ReactNode): string {
  if (Array.isArray(node)) return node.map(treeText).join(' ');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return treeText(node.props.children);
  return typeof node === 'string' ? node : '';
}
describe('catalogue page boundaries', () => {
  it('uses the real bag and metadata when Vendure and an editorial product share a slug', async () => {
    setup(product);
    const html = renderToStaticMarkup(await ProductPage({ params: params() }));
    expect(html).toContain('Live Adele'); expect(html).toContain('Add to bag');
    expect(html).not.toContain('Atelier profile'); expect(html).not.toContain('Fixture profile');
    expect((await generateMetadata({ params: params() })).title).toBe('Live Adele');
  });
  it('returns not found when Vendure confirms the product is absent, even for a Shopify slug', async () => {
    setup(null);
    await expect(ProductPage({ params: params() })).rejects.toThrow('404');
    expect((await generateMetadata({ params: params() })).title).toBeUndefined();
  });
  it('routes an explicitly commissioned bridal piece to a consultation without a bag or price', async () => {
    setup({ ...product, facetValues: [
      { code: 'commission', facet: { code: 'purchase-mode' } },
      { code: 'bridal', facet: { code: 'category' } },
    ] } as typeof product);
    const html = renderToStaticMarkup(await ProductPage({ params: params() }));
    expect(html).toContain('Request a consultation');
    expect(html).toContain('context=bridal');
    expect(html).not.toContain('Add to bag');
    expect(html).not.toContain('class="pricerow"');
  });
  it('does not switch an ordinary purchase to Atelier during an API outage', async () => {
    query.mockRejectedValue(new Error('API unavailable'));
    await expect(ProductPage({ params: params() })).rejects.toThrow('API unavailable');
  });
  it('sends pagination, filtering and sorting to the selected channel', async () => {
    setup(null);
    await ShopPage({ params: Promise.resolve({ market: 'international' }), searchParams: Promise.resolve({ f: 'blue,size-12', sort: 'price-asc', page: '2' }) });
    expect(query).toHaveBeenCalledWith(expect.anything(), { input: { groupByProduct: true, take: 12, skip: 12, facetValueFilters: [{ or: ['blue'] }, { or: ['size-12'] }], sort: { price: 'ASC' } } }, 'international');
  });
  it('distinguishes an empty catalogue from an unavailable API', async () => {
    setup(null);
    const input = () => ({ params: Promise.resolve({ market: 'ng' }), searchParams: Promise.resolve({}) });
    expect(treeText(await ShopPage(input()))).toContain('The collection is coming soon');
    query.mockRejectedValue(new Error('private upstream detail'));
    const text = treeText(await ShopPage(input()));
    expect(text).toContain('We cannot load the shop right now');
    expect(text).not.toContain('private upstream detail');
    expect(text).not.toContain('The collection is coming soon');
  });
});
