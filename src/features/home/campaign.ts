/**
 * Authored editorial content for the market home.
 *
 * This is deliberately NOT derived from Vendure. A campaign is written - a lead
 * image chosen by the house, a title, a standfirst - and deriving it from
 * whatever the catalogue happens to return first would make the front page an
 * accident of sort order. The same reasoning already governs
 * `src/features/content/size-chart.ts`.
 *
 * It lives in the repo rather than a CMS for the same reason the size chart
 * does: there is no CMS yet. When one arrives this module is the seam - the
 * shape below is what it has to return.
 *
 * The imagery is the house's own campaign and catalogue photography, captured
 * from the current nelowoman.com storefront into public/editorial/live. It is
 * not routed through the Vendure asset helpers because the development backend
 * still contains its technology fixture catalogue.
 */

export type Campaign = {
  /** Shown above the headline. Kept short; it sits in mono at 11px. */
  eyebrow: string;
  /** Rendered as two masked lines, so it is authored as two. */
  titleLines: readonly [string, string];
  /** The emphasised fragment of line two, set in italic. Optional. */
  titleAccent?: string;
  standfirst: string;
  lead: { src: string; alt: string };
  leadSecondary: { src: string; alt: string };
  /** Frames for the pinned horizontal lookbook. Order is the reading order. */
  film: readonly { src: string; alt: string; caption: string }[];
  /** Facts for the readout rail. Mono, tabular, no prose. */
  readout: readonly { k: string; v: string }[];
};

export const CAMPAIGN: Campaign = {
  eyebrow: 'Collection 04 · Now live',
  titleLines: ['Linear', 'Summer'],
  titleAccent: '26',
  standfirst:
    'Fourteen looks cut in Lagos. Every one of them made to a measurement, not to a guess.',
  lead: {
    src: '/editorial/live/linear-tokyo-2400.jpg',
    alt: 'A model in a turquoise sculpted mini dress against a deep red studio backdrop.',
  },
  leadSecondary: {
    src: '/editorial/live/linear-santorini-2400.jpg',
    alt: 'A model in a fluid printed dress against the Linear Summer 26 red studio backdrop.',
  },
  film: [
    {
      src: '/editorial/live/linear-santorini.webp',
      alt: 'A model in a soft blue sculpted dress from the Linear Summer 26 collection.',
      caption: 'Santorini',
    },
    {
      src: '/editorial/live/adele-02.webp',
      alt: 'The Adele Set in black and white, photographed full length.',
      caption: 'Adele Set',
    },
    {
      src: '/editorial/live/bloom-02.webp',
      alt: 'The Bloom gown in pale blush, photographed on a red studio floor.',
      caption: 'Bloom',
    },
    {
      src: '/editorial/live/reign-02.webp',
      alt: 'The Reign look in deep violet, photographed against red.',
      caption: 'Reign',
    },
    {
      src: '/editorial/live/nova-02.webp',
      alt: 'The Nova Set in black, photographed against a neutral studio backdrop.',
      caption: 'Nova Set',
    },
    {
      src: '/editorial/live/dewdrop.webp',
      alt: 'The Dewdrop bridal gown in an evening interior.',
      caption: 'Dewdrop',
    },
    {
      src: '/editorial/live/ifenkili.webp',
      alt: 'The Ifenkili bridal look with a sculptural silver headpiece.',
      caption: 'Ifenkili',
    },
  ],
  readout: [
    { k: 'Season', v: 'SS26' },
    { k: 'Looks', v: '14' },
    { k: 'Size range', v: 'UK 6-30' },
    { k: 'Precision', v: '0.01 mm' },
    { k: 'Atelier', v: 'Lagos, NG' },
  ],
};

/** The four current ready-to-wear looks presented on the live Nelo storefront. */
export const FEATURED_LOOKS = [
  {
    src: '/editorial/live/adele-01.webp',
    alt: 'A close portrait of the Adele Set with its white sculpted neckline.',
    alternateSrc: '/editorial/live/adele-02.webp',
    alternateAlt: 'The Adele Set shown full length in black and white.',
    caption: 'Adele Set',
    slug: 'adele',
  },
  {
    src: '/editorial/live/bloom-01.webp',
    alt: 'The Bloom gown in pale blush, moving across a red studio set.',
    alternateSrc: '/editorial/live/bloom-02.webp',
    alternateAlt: 'The Bloom gown shown from a second angle on the red studio set.',
    caption: 'Bloom',
    slug: 'bloom',
  },
  {
    src: '/editorial/live/reign-01.webp',
    alt: 'The Reign look in deep violet against a red studio set.',
    alternateSrc: '/editorial/live/reign-02.webp',
    alternateAlt: 'The Reign look shown in motion from a second angle.',
    caption: 'Reign',
    slug: 'reign',
  },
  {
    src: '/editorial/live/nova-01.webp',
    alt: 'The Nova Set in black with circular cut-out detailing.',
    alternateSrc: '/editorial/live/nova-02.webp',
    alternateAlt: 'The Nova Set shown full length from a second angle.',
    caption: 'Nova Set',
    slug: 'nova',
  },
] as const;

/**
 * The eight garment stages, in order, as the Atelier plugin models them.
 *
 * Mirrors the BespokeItem stage enum in the backend contract. Shown on the
 * commission panel so a visitor can see the process is enumerable before being
 * asked to commit to it. Kept as plain labels: this is marketing copy for the
 * stages, not the source of truth for their codes.
 */
export const GARMENT_STAGES = [
  'Design',
  'Materials',
  'Cutting',
  'Sewing',
  'Fitting',
  'Quality control',
  'Ready',
  'Delivered',
] as const;

/**
 * The bridal journey, as the house runs it.
 *
 * Bridal is a BespokeProject with a longer lead time and fixed fitting points, so
 * it gets milestones rather than the per-garment stages above. Both commission
 * panels then read as the same kind of thing - an enumerable process - which is
 * the argument the page is making about commissioning in the first place.
 */
export const BRIDAL_STAGES = [
  'Consultation',
  'Design and proposal',
  'Toile and first fitting',
  'Construction',
  'Second and final fittings',
  'Delivery',
] as const;

/**
 * The ticker. Facts only, in the house's own terms.
 *
 * Decorative repetition of things stated elsewhere on the page, so the rendered
 * strip is aria-hidden - a screen reader should not hear the size range four
 * times because the marquee needs a duplicate to loop seamlessly.
 */
export const TICKER = [
  'Cut in Lagos',
  'UK 6 to 30',
  'Measured to 0.01 mm',
  'Bespoke and bridal',
  'Shipped worldwide',
] as const;
