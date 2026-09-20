import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import type { CSSProperties } from 'react';
import type { Market } from '@/lib/vendure/channels';

const MASTHEAD_IMAGES: Record<string, string> = {
  'Cut in Lagos, for the woman who dresses on purpose': '/editorial/live/traditional-consultation.webp',
  'Size guide': '/editorial/live/adele-02.webp',
  'Track an order': '/editorial/live/nova-02.webp',
  'Returns and alterations': '/editorial/live/reign-02.webp',
  'Talk to the atelier': '/editorial/live/bridal-consultation.webp',
  'Shipping and duties': '/editorial/live/bloom-02.webp',
};

/**
 * The shell every written page shares.
 *
 * A measured prose column rather than the full 1440px shell: 66 characters is where a line
 * of body text stops being comfortable, and a policy nobody can read is a policy nobody
 * follows. The optional aside carries the facts - times, limits, contacts - out of the prose
 * and into the spec-sheet grammar the rest of the site uses.
 */
export function ContentPage({
  market,
  eyebrow,
  title,
  standfirst,
  announcement = 'Cut in Lagos · shipped worldwide · sizes 6 to 30',
  aside,
  children,
}: {
  market: Market;
  eyebrow: string;
  title: string;
  standfirst?: string;
  announcement?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader market={market} announcement={announcement} />

      <main className="shell">
        <div
          className="phead phead--image"
          style={{
            '--masthead-image': `url("${MASTHEAD_IMAGES[title] ?? '/editorial/live/adele-02.webp'}")`,
          } as CSSProperties}
        >
          <div>
            <span className="lab">{eyebrow}</span>
            <h1>{title}</h1>
            {standfirst ? <p>{standfirst}</p> : null}
          </div>
        </div>

        <div className={aside ? 'contentgrid' : undefined} style={{ paddingTop: 'var(--s7)' }}>
          <article className="prose">{children}</article>
          {/* A div rather than an <aside>: see AccountShell. */}
          {aside ? <div className="aside">{aside}</div> : null}
        </div>

      </main>

      <SiteFooter market={market} />
    </>
  );
}
