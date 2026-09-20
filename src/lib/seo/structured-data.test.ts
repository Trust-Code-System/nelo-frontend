import { describe, expect, it } from 'vitest';
import { jsonLdScript, productJsonLd } from './structured-data';
import type { ProductBySlugQuery } from '@/lib/vendure/generated/graphql';

type Product = NonNullable<ProductBySlugQuery['product']>;

function product(overrides: Partial<Product> = {}): Product {
  return {
    __typename: 'Product',
    id: '1',
    name: 'Adele Set',
    slug: 'adele-set',
    description: '<p>A two-piece in <strong>silk</strong> crepe.</p>',
    assets: [],
    featuredAsset: null,
    optionGroups: [],
    facetValues: [],
    variants: [
      {
        __typename: 'ProductVariant',
        id: 'v1',
        name: 'Adele Set 12',
        sku: 'NW-AD-12',
        priceWithTax: 18562000,
        currencyCode: 'NGN',
        stockLevel: 'IN_STOCK',
        assets: [],
        options: [],
      },
      {
        __typename: 'ProductVariant',
        id: 'v2',
        name: 'Adele Set 30',
        sku: 'NW-AD-30',
        priceWithTax: 18562000,
        currencyCode: 'NGN',
        stockLevel: 'OUT_OF_STOCK',
        assets: [],
        options: [],
      },
    ],
    ...overrides,
  } as Product;
}

describe('productJsonLd', () => {
  it('formats integer minor units as a decimal without converting anything', () => {
    const data = productJsonLd(product(), 'ng');
    const offers = data.offers as { price: string; priceCurrency: string }[];
    // 18,562,000 kobo is ₦185,620.00. A currency conversion here would be a defect.
    expect(offers[0]?.price).toBe('185620.00');
    expect(offers[0]?.priceCurrency).toBe('NGN');
  });

  it('declares one offer per variant so an out-of-stock size is visible', () => {
    const offers = productJsonLd(product(), 'ng').offers as { availability: string }[];
    expect(offers).toHaveLength(2);
    expect(offers[0]?.availability).toBe('https://schema.org/InStock');
    // The atelier can still cut this size, but schema.org InStock means "shippable now",
    // and claiming it would be a lie to a shopping feed.
    expect(offers[1]?.availability).toBe('https://schema.org/OutOfStock');
  });

  it('strips markup out of the description', () => {
    const data = productJsonLd(product(), 'ng');
    expect(data.description).toBe('A two-piece in silk crepe.');
  });

  it('uses the variant currency rather than the market default when they differ', () => {
    // The Channel is the authority on currency. If Vendure says USD, JSON-LD says USD.
    const data = productJsonLd(
      product({
        variants: [
          {
            ...product().variants[0],
            currencyCode: 'USD',
            priceWithTax: 42000,
          },
        ] as Product['variants'],
      }),
      'ng',
    );
    const offers = data.offers as { price: string; priceCurrency: string }[];
    expect(offers[0]?.priceCurrency).toBe('USD');
    expect(offers[0]?.price).toBe('420.00');
  });
});

describe('jsonLdScript', () => {
  it('escapes < so catalogue copy cannot close the script tag', () => {
    // The product NAME is what matters here. Descriptions go through plainText, which strips
    // markup on the way out - but a name, a variant name and an SKU are emitted verbatim
    // from Vendure, so this escape is the only thing between catalogue text and a closed
    // script tag.
    const escaped = jsonLdScript(
      productJsonLd(product({ name: 'Adele </script><img onerror=alert(1)> Set' }), 'ng'),
    );
    expect(escaped).not.toContain('</script>');
    expect(escaped).not.toContain('<img');
    expect(escaped).toContain('\\u003c');
  });

  it('strips markup out of a description before escaping ever applies', () => {
    // Two separate defences, asserted separately: a change to either must not silently come
    // to depend on the other.
    const data = productJsonLd(
      product({ description: 'Silk </script><img onerror=alert(1)>' }),
      'ng',
    );
    expect(data.description).toBe('Silk');
  });

  it('still parses as JSON after escaping', () => {
    const parsed = JSON.parse(jsonLdScript(productJsonLd(product(), 'ng'))) as {
      '@type': string;
    };
    expect(parsed['@type']).toBe('Product');
  });
});
