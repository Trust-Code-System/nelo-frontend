'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { adjustCartLine, removeCartLine } from '@/features/cart/actions';
import { assetPreview } from '@/lib/vendure/assets';
import type { Market } from '@/lib/vendure/channels';
import type { CartFragment } from '@/lib/vendure/generated/graphql';

/**
 * Cart lines.
 *
 * Quantity changes go straight to Vendure and the authoritative cart comes back. There is
 * no optimistic total: the browser's arithmetic is never checkout authority, and a line that
 * fails to adjust must not leave a total that looks right.
 */
export function CartLines({
  cart: initialCart,
  market,
  prices,
}: {
  cart: CartFragment;
  market: Market;
  /** Server-formatted, keyed by line id, plus `__subTotal` / `__shipping` / `__total`. */
  prices: Record<string, string>;
}) {
  const [cart, setCart] = useState(initialCart);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mutate(run: () => Promise<{ ok: boolean; cart?: CartFragment | null; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (result.ok && result.cart) setCart(result.cart);
      else if (!result.ok) setError(result.message ?? 'That did not work.');
    });
  }

  if (cart.lines.length === 0) {
    return (
      <div className="empty">
        <span className="lab">Your bag</span>
        <h2>Nothing in your bag yet</h2>
        <p>Pieces you add will wait here while you keep looking.</p>
        <Link className="btn-q" href={`/${market}`}>
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      {error ? (
        <p className="cart-error" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="cart-lines">
        {cart.lines.map((line) => (
          <li key={line.id}>
            <div className="ph framed">
              {line.featuredAsset ? (
                <Image
                  src={assetPreview(line.featuredAsset.preview, { width: 200, height: 260 })}
                  alt={line.productVariant.name}
                  width={200}
                  height={260}
                  sizes="120px"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
            </div>

            <div className="cart-detail">
              <Link href={`/${market}/products/${line.productVariant.product.slug}`}>
                <h2>{line.productVariant.name}</h2>
              </Link>
              <p className="lab">{line.productVariant.sku}</p>
              {line.productVariant.options.length > 0 ? (
                <p className="lab">
                  {line.productVariant.options.map((option) => option.name).join(' · ')}
                </p>
              ) : null}
            </div>

            <div className="cart-qty">
              <div className="stepper" role="group" aria-label={`Quantity for ${line.productVariant.name}`}>
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={pending || line.quantity <= 1}
                  onClick={() => mutate(() => adjustCartLine(market, line.id, line.quantity - 1))}
                >
                  −
                </button>
                <span className="num" aria-live="polite">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={pending}
                  onClick={() => mutate(() => adjustCartLine(market, line.id, line.quantity + 1))}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="cart-remove lab"
                disabled={pending}
                onClick={() => mutate(() => removeCartLine(market, line.id))}
              >
                Remove
              </button>
            </div>

            <div className="cart-price num">{prices[line.id] ?? ''}</div>
          </li>
        ))}
      </ul>

      <dl className="cart-totals">
        <div className="spec">
          <dt>Subtotal</dt>
          <dd>{prices.__subTotal}</dd>
        </div>
        <div className="spec">
          <dt>Shipping</dt>
          <dd>{prices.__shipping}</dd>
        </div>
        <div className="spec total">
          <dt>Total</dt>
          <dd>{prices.__total}</dd>
        </div>
      </dl>

      <p className="mnote">
        Totals are calculated by the store, not in your browser. Shipping is confirmed at
        checkout once we know where it is going.
      </p>
    </>
  );
}
