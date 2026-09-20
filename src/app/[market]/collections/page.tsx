import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { CollectionsExperience } from '@/features/collections/CollectionsExperience';
import { marketAlternates } from '@/lib/seo/site';
import { isMarket } from '@/lib/vendure/channels';

const COLLECTIONS = [
  {
    number: '01',
    title: 'Linear Summer 26',
    note: 'The current line. Sculpted colour, long silhouettes and the precision of a Lagos cut.',
    image: '/editorial/live/linear-tokyo-2400.jpg',
    alt: 'A turquoise Linear Summer 26 look photographed against deep red.',
    href: '/shop',
    className: 'collection-story--lead',
  },
  {
    number: '02',
    title: 'The 7th Drop',
    note: 'An anniversary capsule built around presence, movement and occasion dressing.',
    image: '/catalogue/7th-anniversary-collection/01.jpg',
    alt: 'The 7th Drop anniversary campaign by NELO Woman.',
    href: '/products/7th-anniversary-collection',
    className: '',
  },
  {
    number: '03',
    title: 'House signatures',
    note: 'Adele, Bloom, Reign and Nova. Four silhouettes that define the house language.',
    image: '/editorial/live/adele-02.webp',
    alt: 'The Adele Set from the NELO Woman house signatures.',
    href: '/shop',
    className: '',
  },
  {
    number: '04',
    title: 'The ceremony edit',
    note: 'Bridal and occasion pieces that begin with a conversation, never a template.',
    image: '/catalogue/the-minimalist-bride/01.jpg',
    alt: 'The Minimalist Bride by NELO Woman.',
    href: '/products/the-minimalist-bride',
    className: 'collection-story--wide',
  },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ market: string }> }): Promise<Metadata> {
  const { market } = await params;
  if (!isMarket(market)) return {};
  return {
    title: 'Collections',
    description: 'Explore the NELO Woman campaign archive and current collection stories.',
    alternates: marketAlternates(market, '/collections'),
  };
}

export default async function CollectionsPage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  return (
    <CollectionsExperience>
      <SiteHeader market={market} announcement="The NELO Woman collection archive" />
      <main className="shell collections-page">
        <header className="collections-intro">
          <div className="collections-intro__copy">
            <span className="lab">Campaigns, chapters and house signatures</span>
            <h1>Collections</h1>
            <p>
              Shop is where every piece lives. Collections is where each chapter is given its world,
              its pace and its point of view.
            </p>
            <Link href={`/${market}/shop`}>Go straight to the shop <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="collections-intro__film" aria-hidden="true">
            <figure><Image src="/editorial/live/linear-tokyo-2400.jpg" alt="" fill sizes="20vw" priority /></figure>
            <figure><Image src="/editorial/live/adele-02.webp" alt="" fill sizes="20vw" priority /></figure>
            <figure><Image src="/editorial/live/bloom-02.webp" alt="" fill sizes="20vw" priority /></figure>
          </div>
          <span className="collections-intro__edition num">ARCHIVE / 01—04</span>
        </header>

        <div className="collections-index" aria-hidden="true">
          <span className="lab">The archive</span>
          <span className="num">04 chapters / Lagos</span>
        </div>

        <div className="collections-grid">
          {COLLECTIONS.map((collection) => (
            <article className={`collection-story ${collection.className}`} key={collection.title}>
              <Link href={`/${market}${collection.href}`}>
                <div className="collection-story__image">
                  <Image
                    src={collection.image}
                    alt={collection.alt}
                    fill
                    sizes={collection.className.includes('lead') ? '(max-width: 760px) 100vw, 66vw' : '(max-width: 760px) 100vw, 40vw'}
                  />
                  <span className="collection-story__number num">{collection.number}</span>
                  <span className="collection-story__action">Explore <span aria-hidden="true">↗</span></span>
                </div>
                <div className="collection-story__copy">
                  <span className="lab">Chapter {collection.number}</span>
                  <h2>{collection.title}</h2>
                  <p>{collection.note}</p>
                  <span className="collection-story__text-link">Enter the chapter <span aria-hidden="true">↗</span></span>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <section className="collections-coda">
          <span className="lab">The complete wardrobe</span>
          <h2>Every chapter, in one index.</h2>
          <Link className="btn" href={`/${market}/shop`}>Shop all 77 pieces</Link>
        </section>
      </main>
      <SiteFooter market={market} />
    </CollectionsExperience>
  );
}
