import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DirectLinkMark } from '@/components/DirectLinkMark';
import { HouseNotes } from '@/components/HouseNotes';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { CollectionsExperience } from '@/features/collections/CollectionsExperience';
import { marketAlternates } from '@/lib/seo/site';
import { isMarket } from '@/lib/vendure/channels';
import { CollectionsDocument, type CollectionsQuery } from '@/lib/vendure/generated/graphql';
import { catalogueQuery } from '@/lib/vendure/transport';
import { assetPreview } from '@/lib/vendure/assets';


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

  let collections: CollectionsQuery['collections']['items'] | null = null;
  try { collections = (await catalogueQuery(CollectionsDocument, {}, market)).data.collections.items; }
  catch { collections = null; }

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
            <Link href={`/${market}/shop`}>Go straight to the shop <DirectLinkMark /></Link>
          </div>
          <div className="collections-intro__film" aria-hidden="true">
            <figure><Image src="/editorial/live/linear-tokyo-2400.jpg" alt="" fill sizes="20vw" priority /></figure>
            <figure><Image src="/editorial/live/adele-02.webp" alt="" fill sizes="20vw" priority /></figure>
            <figure><Image src="/editorial/live/bloom-02.webp" alt="" fill sizes="20vw" priority /></figure>
          </div>
          <span className="collections-intro__edition num">NELO / COLLECTIONS</span>
        </header>

        <div className="collections-index" aria-hidden="true">
          <span className="lab">The collection</span>
          <span className="num">{collections ? `${collections.length} collections / Lagos` : 'Lagos'}</span>
        </div>

        <div className="collections-grid">
          {collections?.map((collection, index) => (
            <article className={`collection-story ${index === 0 ? 'collection-story--lead' : ''}`} key={collection.id}>
              <Link href={`/${market}/collections/${collection.slug}`}>
                <div className="collection-story__image">
                  <Image
                    src={collection.featuredAsset ? assetPreview(collection.featuredAsset.preview, { width: 1200, height: 1500 }) : '/editorial/live/linear-tokyo-2400.jpg'}
                    alt={collection.name}
                    fill
                    sizes={index === 0 ? '(max-width: 760px) 100vw, 66vw' : '(max-width: 760px) 100vw, 40vw'}
                  />
                  <span className="collection-story__number num">{String(index + 1).padStart(2, '0')}</span>
                  <span className="collection-story__action">Explore <DirectLinkMark /></span>
                </div>
                <div className="collection-story__copy">
                  <span className="lab">Collection {String(index + 1).padStart(2, '0')}</span>
                  <h2>{collection.name}</h2>
                  <p>{collection.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || 'Explore the pieces selected for this collection.'}</p>
                  <span className="collection-story__text-link">Enter the chapter <DirectLinkMark /></span>
                </div>
              </Link>
            </article>
          ))}
        </div>
        {collections === null ? <section className="empty"><h2>We cannot load the collections right now</h2><p>Please try again shortly.</p><Link className="btn-q" href={`/${market}/collections`}>Try again</Link></section> : !collections.length ? <section className="empty"><h2>New collections are on their way</h2><p>Browse the shop or begin a conversation with the atelier.</p><Link className="btn-q" href={`/${market}/atelier?context=bridal`}>Explore bridal commissions</Link></section> : null}

        <section className="collections-coda">
          <span className="lab">The complete wardrobe</span>
          <h2>Every chapter, in one index.</h2>
          <Link className="btn" href={`/${market}/shop`}>Shop all pieces</Link>
        </section>

        <HouseNotes market={market} />
      </main>
      <SiteFooter market={market} />
    </CollectionsExperience>
  );
}
