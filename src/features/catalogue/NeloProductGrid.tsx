import Link from 'next/link';
import { EditorialImageSwap } from '@/components/EditorialImageSwap';
import { garmentTransitionName } from './ProductGrid';
import { productPrice, type NeloProduct } from './nelo';
import type { Market } from '@/lib/vendure/channels';

export function NeloProductGrid({
  products,
  market,
  priorityCount = 4,
}: {
  products: readonly NeloProduct[];
  market: Market;
  priorityCount?: number;
}) {
  return (
    <div className="nelo-product-grid">
      {products.map((product, index) => {
        const primary = product.images[0];
        const colourOption = product.options.find((option) => option.name.toLocaleLowerCase() === 'colour');
        const sizeOption = product.options.find((option) => option.name.toLocaleLowerCase() === 'size');
        const sizes = sizeOption?.values.filter((value) => /^\d+$/.test(value.trim())) ?? [];
        if (!primary) return null;
        return (
          <article className="nelo-product-card" key={product.id}>
            <Link href={`/${market}/products/${product.handle}`} data-cursor={product.title}>
              <div className="nelo-product-card__image">
                <EditorialImageSwap
                  primarySrc={primary.src}
                  secondarySrc={product.images[1]?.src}
                  alt={primary.alt || product.title}
                  sizes="(max-width: 680px) 50vw, (max-width: 1100px) 33vw, 25vw"
                  priority={index < priorityCount}
                  transitionName={garmentTransitionName(product.handle)}
                />
                {product.images.length > 1 ? (
                  <span className="nelo-product-card__view" aria-hidden="true">Second view</span>
                ) : null}
              </div>
              <div className="nelo-product-card__meta">
                <div>
                  <h2>{product.title}</h2>
                  <p>{product.productType || 'Ready to wear'}</p>
                  {colourOption || sizes.length ? (
                    <p className="nelo-product-card__options">
                      {colourOption ? `${new Set(colourOption.values.map((value) => value.toLocaleLowerCase())).size} colours` : null}
                      {colourOption && sizes.length ? ' · ' : null}
                      {sizes.length ? `Sizes ${sizes[0]} to ${sizes[sizes.length - 1]}` : null}
                    </p>
                  ) : null}
                </div>
                <span>{productPrice(product)}</span>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
