import Image from 'next/image';
import Link from 'next/link';
import type { SearchCatalogueQuery } from '@/lib/vendure/generated/graphql';
import { formatMoney, type Market } from '@/lib/vendure/channels';
import { assetPreview } from '@/lib/vendure/assets';

type SearchItem = SearchCatalogueQuery['search']['items'][number];

/**
 * Price display.
 *
 * Vendure returns either a single price or a range across variants, and the union must be
 * handled — a product whose variants differ in price has no single price to show. Minor
 * units are formatted for the market's currency; nothing is converted here.
 */
function priceLabel(price: SearchItem['priceWithTax'], market: Market): string {
  if (price.__typename === 'SinglePrice') return formatMoney(price.value, market);
  if (price.__typename === 'PriceRange') {
    return price.min === price.max
      ? formatMoney(price.min, market)
      : `${formatMoney(price.min, market)} — ${formatMoney(price.max, market)}`;
  }
  return '';
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
        <h3>No garments match</h3>
        <p>Try a different size or category, or see everything in the collection.</p>
        <Link className="btn-q" href={`/${market}`}>
          View everything
        </Link>
      </div>
    );
  }

  return (
    <div className="grid g4">
      {items.map((item) => (
        <Link className="card" key={item.productId} href={`/${market}/products/${item.slug}`}>
          <figure>
            <div className="ph framed">
              {item.productAsset ? (
                <Image
                  src={assetPreview(item.productAsset.preview, { width: 700, height: 933 })}
                  alt={item.productName}
                  width={700}
                  height={933}
                  sizes="(max-width: 760px) 50vw, 25vw"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
            </div>
            <figcaption>
              <div className="meta">
                <h3>{item.productName}</h3>
                <span className="price num">{priceLabel(item.priceWithTax, market)}</span>
              </div>
              <div className="strip">
                <span>UK 6—30</span>
                <span>{item.inStock ? 'Ready to ship' : 'Cut to measure'}</span>
              </div>
            </figcaption>
          </figure>
        </Link>
      ))}
    </div>
  );
}
