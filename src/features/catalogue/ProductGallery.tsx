'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

/**
 * Product gallery.
 *
 * Fashion is an image-first category, so this is a real control rather than four decorative
 * squares: the thumbnails select, and the selected one is the large image.
 *
 * Accessibility and performance notes, both deliberate:
 *
 *   - The thumbnails are a `radiogroup`, because that is what they are — one of several,
 *     exactly one selected. Arrow keys move between them by default with roving tabindex,
 *     which is what a keyboard user expects from a picker.
 *   - The first image keeps `priority`, and it is the only one that does. It is the largest
 *     contentful paint on this page; the others are lazy, so adding a gallery costs nothing
 *     at first render.
 *   - Sources are pre-built on the server with `assetPreview()` so the Windows backslash
 *     normalisation is applied once, in the one place that owns it.
 */

export type GalleryImage = {
  id: string;
  /** Large source, server-built. */
  src: string;
  /** Thumbnail source, server-built. */
  thumb: string;
};

export function ProductGallery({
  images,
  productName,
}: {
  images: readonly GalleryImage[];
  productName: string;
}) {
  const [index, setIndex] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const active = images[index] ?? images[0];

  /** Arrow keys must move the focus as well as the selection: with a roving tabindex the
   *  previously focused thumbnail becomes unfocusable, so leaving focus behind would strand
   *  a keyboard user outside the group. */
  function move(to: number) {
    setIndex(to);
    buttons.current[to]?.focus();
  }

  if (!active) {
    return <div className="main framed" aria-hidden="true" />;
  }

  return (
    <>
      <div className="main framed">
        <Image
          // Keyed on the image so React swaps the element rather than mutating the src of the
          // one that is already decoded — without this the previous photograph lingers for a
          // frame while the new one loads.
          key={active.id}
          src={active.src}
          alt={
            index === 0
              ? productName
              : `${productName} — view ${index + 1} of ${images.length}`
          }
          width={1200}
          height={1500}
          priority={index === 0}
          sizes="(max-width: 980px) 100vw, 55vw"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {images.length > 1 ? (
        <div className="thumbs" role="radiogroup" aria-label={`${productName} images`}>
          {images.map((image, position) => (
            <button
              key={image.id}
              ref={(node) => {
                buttons.current[position] = node;
              }}
              type="button"
              role="radio"
              aria-checked={position === index}
              aria-label={`View ${position + 1} of ${images.length}`}
              // Roving tabindex: the group is one tab stop, and arrow keys move within it.
              tabIndex={position === index ? 0 : -1}
              onClick={() => setIndex(position)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  move((position + 1) % images.length);
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  move((position - 1 + images.length) % images.length);
                }
              }}
            >
              <Image
                src={image.thumb}
                alt=""
                width={300}
                height={300}
                loading="lazy"
                sizes="12vw"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
