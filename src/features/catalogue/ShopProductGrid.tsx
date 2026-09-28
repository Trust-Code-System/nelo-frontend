import Link from 'next/link';
import { EditorialImageSwap } from '@/components/EditorialImageSwap';
import { assetPreview } from '@/lib/vendure/assets';
import type { Market } from '@/lib/vendure/channels';
import { garmentTransitionName } from './ProductGrid';
import { priceLabel, type SearchItem } from './price';

export function ShopProductGrid({ items, market }: { items: readonly SearchItem[]; market: Market }) {
  return (
    <div className="nelo-product-grid">
      {items.map((item, index) => (
        <article className="nelo-product-card" key={item.productId}>
          <Link href={`/${market}/products/${item.slug}`} data-cursor={item.productName}>
            <div className="nelo-product-card__image">
              {item.productAsset ? (
                <EditorialImageSwap
                  primarySrc={assetPreview(item.productAsset.preview, { width: 700, height: 933 })}
                  alt={item.productName}
                  sizes="(max-width: 680px) 50vw, (max-width: 1100px) 33vw, 25vw"
                  priority={index < 2}
                  transitionName={garmentTransitionName(item.slug)}
                />
              ) : <span>Image coming soon</span>}
            </div>
            <div className="nelo-product-card__meta">
              <div><h2>{item.productName}</h2><p>{item.inStock ? 'Available' : 'Out of stock'}</p></div>
              <span>{priceLabel(item.priceWithTax, market)}</span>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}
