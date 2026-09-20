import Link from 'next/link';
import { EditorialImageSwap } from '@/components/EditorialImageSwap';
import { FEATURED_LOOKS } from '@/features/home/campaign';
import { priceLabel, type SearchItem } from './price';
import type { Market } from '@/lib/vendure/channels';
import { assetPreview } from '@/lib/vendure/assets';

/**
 * How many card images are fetched eagerly with a preload.
 *
 * Two, not four. The grid is four-up on desktop and two-up on a phone, and the Largest
 * Contentful Paint is almost always the first card - so two covers a phone's entire first
 * row and still wins the desktop LCP. Preloading all four would spend a mobile visitor's
 * bandwidth on images below the fold, which on this audience's connections is the wrong
 * trade: most of Nelo's traffic is mobile.
 *
 * Without this, Next reports the first card image as an unoptimised LCP on every grid.
 */
const EAGER_CARDS = 2;

/**
 * Shared-element name for a garment photograph.
 *
 * The PDP builds the same name for its hero image, which is what lets the browser morph
 * the card into it on navigation instead of cross-fading two unrelated pictures. Slug is
 * the identity because it is the only product key both surfaces hold.
 */
export function garmentTransitionName(slug: string): string {
  return `garment-${slug}`;
}

function editorialLookFor(item: SearchItem) {
  const identity = `${item.slug} ${item.productName}`.toLowerCase();
  return FEATURED_LOOKS.find((look) =>
    identity.includes(look.slug.toLowerCase()),
  );
}

export function ProductGrid({
  items,
  market,
}: {
  items: readonly SearchItem[];
  market: Market;
}) {
  if (items.length === 0) {
    return (
      <div className="empty">
        <span className="lab">Nothing here yet</span>
        <h2>No garments match</h2>
        <p>Try a different size or category, or see everything in the collection.</p>
        <Link className="btn-q" href={`/${market}`}>
          View everything
        </Link>
      </div>
    );
  }

  return (
    // `riseset` staggers the cards in on scroll. It is a CSS scroll-driven animation, so
    // the grid stays a server component and costs no JavaScript.
    <div className="grid g4 riseset">
      {items.map((item, index) => (
        <Link className="card" key={item.productId} href={`/${market}/products/${item.slug}`}>
          <figure>
            <div className="ph framed">
              {item.productAsset || editorialLookFor(item) ? (
                // Named so this photograph survives the navigation to the PDP as one
                // object. Only the geometry animates - see the ::view-transition rules in
                // globals.css - because it is the same garment, not a replacement.
                <EditorialImageSwap
                  primarySrc={
                    item.productAsset
                      ? assetPreview(item.productAsset.preview, { width: 700, height: 933 })
                      : editorialLookFor(item)!.src
                  }
                  secondarySrc={editorialLookFor(item)?.alternateSrc}
                  alt={item.productName}
                  priority={index < EAGER_CARDS}
                  sizes="(max-width: 760px) 50vw, 25vw"
                  transitionName={garmentTransitionName(item.slug)}
                />
              ) : null}
            </div>
            <figcaption>
              <div className="meta">
                <h2>{item.productName}</h2>
                <span className="price num">{priceLabel(item.priceWithTax, market)}</span>
              </div>
              <div className="strip">
                <span>UK 6-30</span>
                <span>{item.inStock ? 'Ready to ship' : 'Cut to measure'}</span>
              </div>
            </figcaption>
          </figure>
        </Link>
      ))}
    </div>
  );
}
