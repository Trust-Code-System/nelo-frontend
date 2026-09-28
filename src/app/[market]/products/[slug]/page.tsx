import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DirectLinkMark } from '@/components/DirectLinkMark';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { ProductGallery, type GalleryImage } from '@/features/catalogue/ProductGallery';
import { garmentTransitionName, ProductGrid } from '@/features/catalogue/ProductGrid';
import { NeloProductProfile } from '@/features/catalogue/NeloProductProfile';
import { findNeloProduct } from '@/features/catalogue/nelo';
import { VariantSelector } from '@/features/catalogue/VariantSelector';
import { marketAlternates } from '@/lib/seo/site';
import { breadcrumbJsonLd, jsonLdScript, productJsonLd } from '@/lib/seo/structured-data';
import { assetPreview, assetUrl } from '@/lib/vendure/assets';
import { formatMoney, isMarket, type Market } from '@/lib/vendure/channels';
import {
  ProductBySlugDocument,
  SearchCatalogueDocument,
  type ProductBySlugQuery,
  type SearchCatalogueQuery,
} from '@/lib/vendure/generated/graphql';
import { catalogueQuery } from '@/lib/vendure/transport';

type Product = NonNullable<ProductBySlugQuery['product']>;

const loadProduct = cache(async (slug: string, market: Market): Promise<Product | null> => {
  const { data } = await catalogueQuery(ProductBySlugDocument, { slug }, market);
  return data.product;
});

async function loadRecommendations(
  currentSlug: string,
  market: Market,
): Promise<SearchCatalogueQuery['search']['items']> {
  try {
    const { data } = await catalogueQuery(
      SearchCatalogueDocument,
      { input: { groupByProduct: true, take: 8, skip: 0 } },
      market,
    );
    return data.search.items.filter((item) => item.slug !== currentSlug).slice(0, 4);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ market: string; slug: string }>;
}): Promise<Metadata> {
  const { market, slug } = await params;
  if (!isMarket(market)) return {};
  const product = await loadProduct(slug, market);
  const neloProduct = !product ? findNeloProduct(slug) : null;
  if (neloProduct) {
    return {
      title: neloProduct.title,
      description:
        neloProduct.description ||
        `${neloProduct.title}, designed and cut in Lagos by NELO Woman.`,
      alternates: marketAlternates(market, `/products/${slug}`),
      openGraph: {
        title: neloProduct.title,
        description:
          neloProduct.description || `${neloProduct.title}, designed and cut in Lagos.`,
        type: 'website',
        images: neloProduct.images[0] ? [{ url: neloProduct.images[0].src }] : [],
      },
    };
  }
  if (!product) return {};

  const description = product.description
    ? product.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
    : `${product.name} - cut in Lagos, UK 6 to 30.`;
  const image = product.featuredAsset ?? product.assets[0];

  return {
    title: product.name,
    description,
    // Each market's product page is its own canonical: same garment, different currency and
    // different shipping. They declare each other as alternates rather than one claiming to
    // be the other.
    alternates: marketAlternates(market, `/products/${slug}`),
    openGraph: {
      title: product.name,
      description,
      type: 'website',
      ...(image ? { images: [{ url: assetUrl(image.preview) }] } : {}),
    },
  };
}

/**
 * Product detail.
 *
 * Composition follows the commerce grammar: media, then identity and price, then variants,
 * then one primary action, then the detail. There is exactly one CTA on this page.
 *
 * Vendure products use the bag; legacy editorial products retain their Atelier flow.
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ market: string; slug: string }>;
}) {
  const { market, slug } = await params;
  if (!isMarket(market)) notFound();

  const [product, recommendations] = await Promise.all([
    loadProduct(slug, market),
    loadRecommendations(slug, market),
  ]);
  if (!product) {
    const neloProduct = findNeloProduct(slug);
    if (neloProduct) return <NeloProductProfile product={neloProduct} market={market} />;
    notFound();
  }

  // Formatted on the server: the client island receives strings, not currency logic.
  const prices = Object.fromEntries(
    product.variants.map((variant) => [variant.id, formatMoney(variant.priceWithTax, market)]),
  );

  // Sources are built here so the island never touches asset URL normalisation, and the
  // featured asset leads without appearing twice.
  const ordered = product.featuredAsset
    ? [product.featuredAsset, ...product.assets.filter((a) => a.id !== product.featuredAsset?.id)]
    : product.assets;
  const images: GalleryImage[] = ordered.map((asset) => ({
    id: asset.id,
    src: assetPreview(asset.preview, { width: 1200, height: 1500 }),
    thumb: assetPreview(asset.preview, { width: 300, height: 300 }),
  }));


  return (
    <>
      {/* Structured data is emitted from the same objects the page renders, so the two
          cannot disagree about a price or about availability. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product, market)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: 'Nelo Woman', path: `/${market}` },
              { name: 'Shop', path: `/${market}/shop` },
              { name: product.name, path: `/${market}/products/${product.slug}` },
            ]),
          ),
        }}
      />

      <SiteHeader market={market} announcement="Complimentary shipping within Nigeria over ₦150,000" />

      <main className="shell">
        <nav className="crumb" aria-label="Breadcrumb">
          <Link href={`/${market}`}>Nelo</Link> /{' '}
          <Link href={`/${market}/shop`}>Shop</Link> / {product.name}
        </nav>

        <div className="pdp">
          <div className="gallery">
            <ProductGallery
              images={images}
              productName={product.name}
              // Pairs with the card the visitor clicked, so the photograph morphs into
              // place instead of the page cutting to a new one.
              transitionName={garmentTransitionName(slug)}
            />
          </div>

          <div className="panel">
            <span className="lab">Ready to Wear</span>
            <h1>{product.name}</h1>
            <div className="pricerow">
              <span className="p">
                {product.variants[0] ? prices[product.variants[0].id] : ''}
              </span>
              <span className="t">
                {product.variants[0]?.currencyCode}
              </span>
            </div>

            <VariantSelector product={product} market={market} prices={prices} />

            {product.description ? (
              <details open>
                <summary>Details</summary>
                <div
                  className="body"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </details>
            ) : null}
            <details>
              <summary>Size and fit</summary>
              <div className="body">
                Choose from the available options above. Unavailable options cannot be added to your bag.{' '}
                <Link href={`/${market}/size-guide`}>The size guide</Link> shows where each
                measurement is taken.
              </div>
            </details>
            <details>
              <summary>Delivery &amp; returns</summary>
              <div className="body">
                Lagos 2-3 days. Rest of Nigeria 4-6 days. International 7-12 days, duties
                included at checkout. Cut-to-measure pieces are returnable for alteration,
                not refund. <Link href={`/${market}/shipping`}>Shipping</Link> ·{' '}
                <Link href={`/${market}/returns`}>Returns</Link>
              </div>
            </details>
          </div>
        </div>

        {recommendations.length > 0 ? (
          <section className="recommendations" aria-labelledby="recommendations-title">
            <div className="recommendations__head">
              <div>
                <span className="lab">Selected for you</span>
                <h2 id="recommendations-title">You may also like</h2>
              </div>
              <Link href={`/${market}/shop`}>View the full shop <DirectLinkMark /></Link>
            </div>
            <ProductGrid items={recommendations} market={market} />
          </section>
        ) : null}

      </main>

      <SiteFooter market={market} />
    </>
  );
}
