import Image from 'next/image';
import { ViewTransition } from 'react';

type EditorialImageSwapProps = {
  primarySrc: string;
  secondarySrc?: string | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  transitionName?: string;
};

/**
 * Two views of the same garment in one stable frame.
 *
 * The second photograph is decorative to assistive technology because it does
 * not add a second product or meaning. CSS owns the pointer and focus crossfade,
 * so the interaction stays immediate and costs no client JavaScript.
 */
export function EditorialImageSwap({
  primarySrc,
  secondarySrc,
  alt,
  sizes,
  priority = false,
  transitionName,
}: EditorialImageSwapProps) {
  const primary = (
    <Image
      className="image-swap__image image-swap__image--primary"
      src={primarySrc}
      alt={alt}
      width={900}
      height={1125}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      sizes={sizes}
    />
  );

  return (
    <span className={`image-swap${secondarySrc ? ' image-swap--active' : ''}`}>
      {transitionName ? <ViewTransition name={transitionName}>{primary}</ViewTransition> : primary}
      {secondarySrc ? (
        <Image
          className="image-swap__image image-swap__image--secondary"
          src={secondarySrc}
          alt=""
          width={900}
          height={1125}
          loading="lazy"
          sizes={sizes}
        />
      ) : null}
    </span>
  );
}
