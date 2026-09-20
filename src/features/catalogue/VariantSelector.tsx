'use client';

import { useMemo, useState, useTransition } from 'react';
import { addToCart } from '@/features/cart/actions';
import type { ProductBySlugQuery } from '@/lib/vendure/generated/graphql';
import type { Market } from '@/lib/vendure/channels';

type Product = NonNullable<ProductBySlugQuery['product']>;
type Variant = Product['variants'][number];

/**
 * Variant selection and add-to-bag.
 *
 * Options are presented as a scale rather than a dropdown - the 6 to 30 range is a brand
 * asset, and hiding it in a select throws that away. Unavailable sizes are struck through
 * rather than removed, because "we make this in your size, just not in stock today" is a
 * different message from "we do not make this in your size".
 *
 * Stock is Vendure's word, not ours: `stockLevel` decides what is strikethrough.
 */
export function VariantSelector({
  product,
  market,
  prices,
  children,
}: {
  product: Product;
  market: Market;
  /** Pre-formatted per variant. Formatting stays on the server so currency rules - and the
   *  Channel they come from - never need to reach the browser. */
  prices: Record<string, string>;
  /** Rendered between the options and the CTA: what a garment will be cut to is context
   *  for the decision, so it must appear before the decision, not after it. */
  children?: React.ReactNode;
}) {
  const optionGroups = product.optionGroups;

  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const first = product.variants[0];
    if (!first) return {};
    return Object.fromEntries(first.options.map((option) => [option.groupId, option.code]));
  });

  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; message: string } | null>(
    null,
  );

  const selectedVariant = useMemo(
    () =>
      product.variants.find((variant) =>
        variant.options.every((option) => selection[option.groupId] === option.code),
      ) ?? null,
    [product.variants, selection],
  );

  /** A combination is offered only if some variant actually exists for it. */
  function variantFor(groupId: string, code: string): Variant | undefined {
    const candidate = { ...selection, [groupId]: code };
    return product.variants.find((variant) =>
      variant.options.every((option) => candidate[option.groupId] === option.code),
    );
  }

  function submit() {
    if (!selectedVariant) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await addToCart(market, selectedVariant.id, 1);
      setFeedback(
        result.ok
          ? { tone: 'ok', message: 'Added to your bag.' }
          : { tone: 'error', message: result.message },
      );
    });
  }

  return (
    <>
      {optionGroups.map((group) => (
        <div className="blk" key={group.id}>
          <span className="lab">
            <b>{group.name}</b>
            <span>
              {product.variants.some((v) => v.options.some((o) => o.groupId === group.id))
                ? `${group.options.length} options`
                : ''}
            </span>
          </span>
          <div className="scale" role="group" aria-label={group.name}>
            {group.options.map((option) => {
              const variant = variantFor(group.id, option.code);
              const unavailable = !variant;
              const outOfStock = variant?.stockLevel === 'OUT_OF_STOCK';
              const selected = selection[group.id] === option.code;

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={unavailable || outOfStock}
                  onClick={() =>
                    setSelection((prev) => ({ ...prev, [group.id]: option.code }))
                  }
                >
                  {option.name}
                </button>
              );
            })}
          </div>
          <p className="mnote">
            Struck options are not in stock to ship. Every size can still be cut to measure.
          </p>
        </div>
      ))}

      {children}

      <div className="buy">
        <button
          className="btn"
          type="button"
          onClick={submit}
          disabled={!selectedVariant || pending}
          style={{ width: '100%', textAlign: 'center', padding: 'var(--s4)' }}
        >
          {pending
            ? 'Adding…'
            : selectedVariant
              ? `Add to bag - ${prices[selectedVariant.id] ?? ''}`
              : 'Select a size'}
        </button>

        <p className="note" aria-live="polite">
          {feedback ? (
            <span style={{ color: feedback.tone === 'error' ? 'var(--action)' : 'var(--ink)' }}>
              {feedback.message}
            </span>
          ) : (
            <>
              Cut to measure · dispatched in 10-14 days
              <br />
              Free alterations within 30 days of delivery
            </>
          )}
        </p>
      </div>
    </>
  );
}
