import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { VariantSelector } from '@/features/catalogue/VariantSelector';
import { assetPreview } from '@/lib/vendure/assets';
import { formatMoney, isMarket, type Market } from '@/lib/vendure/channels';
import { ProductBySlugDocument, type ProductBySlugQuery } from '@/lib/vendure/generated/graphql';
import { catalogueQuery } from '@/lib/vendure/transport';
import { display, LABELS } from '@/lib/atelier/measurements';
import { PROFILES } from '@/features/atelier/fixtures';

type Product = NonNullable<ProductBySlugQuery['product']>;

async function loadProduct(slug: string, market: Market): Promise<Product | null> {
  try {
    const { data } = await catalogueQuery(ProductBySlugDocument, { slug }, market);
    return data.product;
  } catch {
    return null;
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
  return product ? { title: product.name, description: product.description } : {};
}

/**
 * Product detail.
 *
 * Composition follows the commerce grammar: media, then identity and price, then variants,
 * then one primary action, then the detail. There is exactly one CTA on this page.
 *
 * The measurement panel is the differentiator and is still FIXTURE-backed — there is no
 * Atelier API to read a real profile from, so it is labelled as such rather than implied to
 * be the customer's own data.
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ market: string; slug: string }>;
}) {
  const { market, slug } = await params;
  if (!isMarket(market)) notFound();

  const product = await loadProduct(slug, market);
  if (!product) notFound();

  // Formatted on the server: the client island receives strings, not currency logic.
  const prices = Object.fromEntries(
    product.variants.map((variant) => [variant.id, formatMoney(variant.priceWithTax, market)]),
  );

  const gallery = product.assets.length > 0 ? product.assets : [];
  const hero = product.featuredAsset ?? gallery[0] ?? null;
  const profile = PROFILES.find((p) => p.isDefault) ?? PROFILES[0];

  return (
    <>
      <SiteHeader market={market} announcement="Complimentary shipping within Nigeria over ₦150,000" />

      <main className="shell">
        <p className="crumb">
          <Link href={`/${market}`}>Nelo</Link> / <Link href={`/${market}`}>Ready to Wear</Link> /{' '}
          {product.name}
        </p>

        <div className="pdp">
          <div className="gallery">
            <div className="main framed">
              {hero ? (
                <Image
                  src={assetPreview(hero.preview, { width: 1200, height: 1500 })}
                  alt={product.name}
                  width={1200}
                  height={1500}
                  priority
                  sizes="(max-width: 980px) 100vw, 55vw"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
            </div>
            {gallery.length > 1 ? (
              <div className="thumbs">
                {gallery.slice(0, 4).map((asset, index) => (
                  <button key={asset.id} type="button" aria-pressed={index === 0}>
                    <Image
                      src={assetPreview(asset.preview, { width: 300, height: 300 })}
                      alt={`${product.name} — view ${index + 1}`}
                      width={300}
                      height={300}
                      sizes="12vw"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="panel">
            <span className="lab">Ready to Wear</span>
            <h1>{product.name}</h1>
            <div className="pricerow">
              <span className="p">
                {product.variants[0] ? prices[product.variants[0].id] : ''}
              </span>
              <span className="t">
                {product.variants[0]?.currencyCode} · duties included
              </span>
            </div>

            <VariantSelector product={product} market={market} prices={prices}>
              <section className="fit">
                <div className="fit-h">
                  <span className="lab" style={{ color: 'var(--ink)' }}>
                    <b>Cut to your measurements</b>
                  </span>
                  <Link href={`/${market}/account/measurements`}>Edit profile</Link>
                </div>
                <dl className="mgrid">
                  {(profile?.measurements ?? []).map((measurement) => (
                    <div
                      className={`mrow${measurement.millimetres === null ? ' unset' : ''}`}
                      key={measurement.code}
                    >
                      <dt>{LABELS[measurement.code]}</dt>
                      <dd>{display(measurement.millimetres, 'millimetre')}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mnote">
                  Fixture profile — the Atelier API does not exist yet, so these are not your
                  real measurements.
                </p>
              </section>
            </VariantSelector>

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
              <summary>Delivery &amp; returns</summary>
              <div className="body">
                Lagos 2—3 days. Rest of Nigeria 4—6 days. International 7—12 days, duties
                included at checkout. Cut-to-measure pieces are returnable for alteration,
                not refund.
              </div>
            </details>
          </div>
        </div>

        <SiteFooter market={market} />
      </main>
    </>
  );
}
