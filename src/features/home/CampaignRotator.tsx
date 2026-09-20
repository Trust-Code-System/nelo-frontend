'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

/**
 * The procession is cut out from the studio backdrop (scripts/cutout-campaign.py)
 * and normalised onto transparent canvases, so the figures move across the plain
 * plaster ground like a runway lineup rather than a stack of photographs. Keep
 * every entry full-length - a portrait detail would read at the wrong scale.
 *
 * The cast mixes Linear Summer 26 with the polka capsule, interleaved so solid
 * and pattern alternate down the runway.
 */
const LOOKS = [
  {
    src: '/catalogue/cutouts/tokyo-01.webp',
    alt: 'The Tokyo mini dress in black, full length.',
    name: 'Tokyo',
  },
  {
    src: '/catalogue/cutouts/midnight-jewel-01.webp',
    alt: 'The Midnight Jewel gown in black and white polka dot with a red headwrap.',
    name: 'Midnight Jewel',
  },
  {
    src: '/catalogue/cutouts/santorini-01.webp',
    alt: 'The Santorini dress in full-length print.',
    name: 'Santorini',
  },
  {
    src: '/catalogue/cutouts/monaco-01.webp',
    alt: 'The Monaco polka dot dress with its matching headband.',
    name: 'Monaco',
  },
  {
    src: '/catalogue/cutouts/bloom-01.webp',
    alt: 'The Bloom gown in pale blush, full length.',
    name: 'Bloom / blush',
  },
  {
    src: '/catalogue/cutouts/adele-01.webp',
    alt: 'The Adele two-piece in black and white polka dot.',
    name: 'Adele',
  },
  {
    src: '/catalogue/cutouts/reign-01.webp',
    alt: 'The Reign gown in violet, full length.',
    name: 'Reign / violet',
  },
  {
    src: '/catalogue/cutouts/havana-01.webp',
    alt: 'The Havana dress in white polka dot, full length.',
    name: 'Havana',
  },
  {
    src: '/catalogue/cutouts/bloom-02.webp',
    alt: 'The Bloom gown in olive, full length.',
    name: 'Bloom / olive',
  },
  {
    src: '/catalogue/cutouts/majesty-01.webp',
    alt: 'The Majesty polka dot dress with a red headwrap.',
    name: 'Majesty',
  },
  {
    src: '/catalogue/cutouts/tokyo-03.webp',
    alt: 'The black Tokyo mini dress mid-stride.',
    name: 'Tokyo / stride',
  },
  {
    src: '/catalogue/cutouts/iris-01.webp',
    alt: 'The Iris polka dot dress, full length.',
    name: 'Iris',
  },
  {
    src: '/catalogue/cutouts/reign-02.webp',
    alt: 'The Reign gown in black, full length.',
    name: 'Reign / black',
  },
  {
    src: '/catalogue/cutouts/velora-01.webp',
    alt: 'The Velora polka dot gown, full length.',
    name: 'Velora',
  },
] as const;

type Slot = 'lead' | 'side' | 'rail' | 'edge' | 'near' | 'far' | 'hidden';

/**
 * One scene per look: the crowned look takes the lead, the next three queue at
 * the right wing (side, rail, edge), the two just-seen recede to the left
 * (near, far), and the rest of the cast waits offstage. Advancing the scene
 * walks every figure one slot along the runway - the CSS transitions do the
 * walking, so the choreography below is pure geometry.
 */
function slotsFor(active: number): readonly Slot[] {
  const total = LOOKS.length;
  const at = (offset: number) => (active + offset + total) % total;
  return LOOKS.map((_, index) => {
    if (index === at(0)) return 'lead';
    if (index === at(1)) return 'side';
    if (index === at(2)) return 'rail';
    if (index === at(3)) return 'edge';
    if (index === at(-1)) return 'near';
    if (index === at(-2)) return 'far';
    return 'hidden';
  });
}

export function CampaignRotator() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const scene = slotsFor(active);
  const leadLook = LOOKS[active] ?? LOOKS[0];

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % LOOKS.length);
    }, 4400);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="campaign-rotator"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="campaign-procession" aria-live="off">
        <div className="campaign-procession__horizon" aria-hidden="true" />
        {LOOKS.map((look, index) => {
          const slot = scene[index] ?? 'hidden';
          return (
            <figure className="campaign-look" data-slot={slot} key={look.src}>
              <Image
                src={look.src}
                alt={slot === 'lead' ? look.alt : ''}
                width={1000}
                height={1400}
                priority={index < 2}
                sizes="(max-width: 760px) 82vw, 30vw"
              />
            </figure>
          );
        })}
      </div>
      <div className="campaign-rotator__legend">
        <p className="campaign-rotator__name" aria-live="polite">
          {leadLook.name}
        </p>
        <div className="campaign-rotator__controls" aria-label="Campaign images">
          {LOOKS.map((look, index) => (
            <button
              key={look.src}
              type="button"
              aria-label={`Show ${look.name}`}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => setActive(index)}
            >
              <span />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
