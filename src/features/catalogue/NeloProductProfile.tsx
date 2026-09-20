import Link from 'next/link';
import { DirectLinkMark } from '@/components/DirectLinkMark';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { ProductGallery, type GalleryImage } from './ProductGallery';
import { garmentTransitionName } from './ProductGrid';
import { NeloProductGrid } from './NeloProductGrid';
import { NeloVariantPicker } from './NeloVariantPicker';
import { productPrice, relatedNeloProducts, type NeloProduct } from './nelo';
import type { Market } from '@/lib/vendure/channels';

export function NeloProductProfile({ product, market }: { product: NeloProduct; market: Market }) {
  const images: GalleryImage[] = product.images.map((image) => ({
    id: image.id,
    src: image.src,
    thumb: image.src,
  }));
  const recommendations = relatedNeloProducts(product);

  return (
    <>
      <SiteHeader market={market} announcement="Statement femininity, cut in Lagos" />
      <main className="shell">
        <nav className="crumb" aria-label="Breadcrumb">
          <Link href={`/${market}`}>Nelo</Link> /{' '}
          <Link href={`/${market}/shop`}>Shop</Link> / {product.title}
        </nav>

        <div className="pdp nelo-profile">
          {/* No reveal attribute on the gallery: the garment ViewTransition is
              its entrance, and page-enter covers direct loads. */}
          <div className="gallery">
            <ProductGallery
              images={images}
              productName={product.title}
              transitionName={garmentTransitionName(product.handle)}
            />
          </div>

          <div className="panel nelo-profile__panel" data-motion-stagger>
            <span className="lab">{product.productType || 'Ready to wear'}</span>
            <h1>{product.title}</h1>
            <div className="pricerow">
              <span className="p">{productPrice(product)}</span>
              <span className="t">NGN, live store price</span>
            </div>

            {product.description ? <p className="nelo-profile__intro">{product.description}</p> : null}
            <NeloVariantPicker product={product} market={market} />

            <details open>
              <summary>Made by NELO</summary>
              <div className="body">
                Designed and cut in Lagos. Each option shown above comes from the current NELO
                catalogue, including its live colour and size availability.
              </div>
            </details>
            <details>
              <summary>Size and fit</summary>
              <div className="body">
                NELO pieces are available across an extended size range. Choose the option that
                feels closest, then use the size guide or begin a fitting with the atelier for a
                more exact finish.
              </div>
            </details>
            <details>
              <summary>Delivery and returns</summary>
              <div className="body">
                Delivery timing and return eligibility are confirmed in the official live store
                before payment. <Link href={`/${market}/shipping`}>Read delivery details</Link> or{' '}
                <Link href={`/${market}/returns`}>view returns</Link>.
              </div>
            </details>
          </div>
        </div>

        <section className="recommendations" aria-labelledby="recommendations-title" data-motion-reveal>
          <div className="recommendations__head">
            <div>
              <span className="lab">The next look</span>
              <h2 id="recommendations-title">You may also like</h2>
            </div>
            <Link href={`/${market}/shop`}>View all pieces <DirectLinkMark /></Link>
          </div>
          <NeloProductGrid products={recommendations} market={market} priorityCount={0} />
        </section>
      </main>
      <SiteFooter market={market} />
    </>
  );
}
