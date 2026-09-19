import { absolute } from './site';
import { assetUrl } from '@/lib/vendure/assets';
import { channelFor, type Market } from '@/lib/vendure/channels';
import type { ProductBySlugQuery, SearchCatalogueQuery } from '@/lib/vendure/generated/graphql';

/**
 * JSON-LD.
 *
 * Every figure in here comes from Vendure. Nothing is derived, converted or rounded on the
 * way out: structured data that disagrees with the page is a manual penalty waiting to
 * happen, and a price in JSON-LD that does not match the price a customer is charged is the
 * fastest way to earn one.
 *
 * `priceCurrency` is the Channel's currency, read from the market configuration rather than
 * guessed. Availability comes from Vendure's `stockLevel`, and a variant Vendure calls
 * out-of-stock is declared out of stock here too — even though the atelier can still cut it,
 * because `InStock` in schema.org means "can be shipped now" and that would be a lie.
 */

type Product = NonNullable<ProductBySlugQuery['product']>;
type SearchResult = SearchCatalogueQuery['search'];

const ORGANISATION = {
  '@type': 'Organization',
  name: 'Nelo Woman',
  url: absolute('/'),
} as const;

/** Plain text for a description field: HTML from Vendure would be rendered literally. */
function plainText(html: string, max = 320): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function productJsonLd(product: Product, market: Market): Record<string, unknown> {
  const { currency } = channelFor(market);
  const url = absolute(`/${market}/products/${product.slug}`);
  const images = [
    ...(product.featuredAsset ? [assetUrl(product.featuredAsset.preview)] : []),
    ...product.assets.map((asset) => assetUrl(asset.preview)),
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.description ? { description: plainText(product.description) } : {}),
    // De-duplicated: the featured asset is usually also in `assets`, and repeating it adds
    // nothing but bytes.
    image: [...new Set(images)],
    url,
    brand: { '@type': 'Brand', name: 'Nelo Woman' },
    // One offer per variant. A single aggregate offer would hide that a size is out of stock.
    offers: product.variants.map((variant) => ({
      '@type': 'Offer',
      // Vendure's own SKU. Nothing is synthesised.
      sku: variant.sku,
      name: variant.name,
      url,
      priceCurrency: variant.currencyCode ?? currency,
      // Integer minor units to a decimal string. NGN kobo and USD cents are both 100 to the
      // major unit, and this is a formatting step, never a conversion.
      price: (variant.priceWithTax / 100).toFixed(2),
      availability:
        variant.stockLevel === 'OUT_OF_STOCK'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: ORGANISATION,
    })),
  };
}

/**
 * A collection is an `ItemList`, not a `Product`.
 *
 * Only the products actually on the rendered page are listed. A list that claims 200 items
 * while showing 12 is a mismatch between the markup and the page, and the markup is what
 * gets penalised.
 */
export function collectionJsonLd({
  name,
  description,
  market,
  slug,
  search,
}: {
  name: string;
  description: string;
  market: Market;
  slug: string;
  search: SearchResult | null;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    ...(description ? { description: plainText(description) } : {}),
    url: absolute(`/${market}/collections/${slug}`),
    isPartOf: ORGANISATION,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: search?.items.length ?? 0,
      itemListElement: (search?.items ?? []).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absolute(`/${market}/products/${item.slug}`),
        name: item.productName,
      })),
    },
  };
}

export function breadcrumbJsonLd(
  crumbs: readonly { name: string; path: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

export function organisationJsonLd(market: Market): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: 'Nelo Woman',
    description:
      'Nigerian luxury womenswear, cut in Lagos. Ready to wear in UK 6 to 30, plus bespoke and bridal commissions.',
    url: absolute(`/${market}`),
    currenciesAccepted: channelFor(market).currency,
    address: { '@type': 'PostalAddress', addressLocality: 'Lagos', addressCountry: 'NG' },
  };
}

/**
 * Serialises JSON-LD for a `<script>` tag.
 *
 * `</script>` inside a JSON string would end the tag early and turn product copy into
 * markup, so `<` is escaped. `JSON.stringify` alone does not do this, and it is the one
 * genuine injection risk in shipping structured data built from catalogue text.
 */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
