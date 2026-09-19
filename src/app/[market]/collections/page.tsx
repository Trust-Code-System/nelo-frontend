import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { marketAlternates } from '@/lib/seo/site';
import { assetPreview } from '@/lib/vendure/assets';
import { isMarket } from '@/lib/vendure/channels';
import { CollectionsDocument, type CollectionsQuery } from '@/lib/vendure/generated/graphql';
import { catalogueQuery } from '@/lib/vendure/transport';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ market: string }>;
}): Promise<Metadata> {
  const { market } = await params;
  if (!isMarket(market)) return {};
  return {
    title: 'Collections',
    description:
      'Every Nelo Woman collection, cut in Lagos in UK 6 to 30. Ready to wear, plus bespoke and bridal by commission.',
    alternates: marketAlternates(market, '/collections'),
  };
}

/** All collections. Top-level only — child collections belong inside their parent. */
export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  let collections: CollectionsQuery['collections']['items'] = [];
  let unreachable = false;
  try {
    const { data } = await catalogueQuery(CollectionsDocument, {}, market);
    // Vendure nests every collection under a synthetic root; only top-level ones belong here.
    collections = data.collections.items.filter(
      (item) => !item.parent || item.parent.slug === '__root_collection__',
    );
  } catch {
    unreachable = true;
  }

  return (
    <>
      <SiteHeader market={market} announcement="Complimentary shipping within Nigeria over ₦150,000" />

      <main className="shell">
        <div className="phead">
          <div>
            <span className="lab">Shop</span>
            <h1>Collections</h1>
          </div>
          {!unreachable ? (
            <span className="count">
              {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
            </span>
          ) : null}
        </div>

        <section style={{ paddingBlock: 'var(--s7)' }}>
          {unreachable ? (
            <div className="empty">
              <span className="lab">Temporarily unavailable</span>
              <h2>We cannot load the collections right now</h2>
              <p>This is our side, not yours. The atelier is unaffected.</p>
              <Link className="btn-q" href={`/${market}/atelier`}>
                Visit the atelier
              </Link>
            </div>
          ) : (
            <div className="grid g4">
              {collections.map((collection) => (
                <Link
                  className="card"
                  key={collection.id}
                  href={`/${market}/collections/${collection.slug}`}
                >
                  <figure>
                    <div className="ph framed">
                      {collection.featuredAsset ? (
                        <Image
                          src={assetPreview(collection.featuredAsset.preview, {
                            width: 700,
                            height: 933,
                          })}
                          // Deliberately empty. The collection's name is the link text
                          // directly beneath, so alt text would make a screen reader read
                          // the same words twice — the image is decorative here even though
                          // it is the visual point of the card.
                          alt=""
                          width={700}
                          height={933}
                          sizes="(max-width: 760px) 50vw, 25vw"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : null}
                    </div>
                    <figcaption>
                      <div className="meta">
                        <h2>{collection.name}</h2>
                      </div>
                    </figcaption>
                  </figure>
                </Link>
              ))}
            </div>
          )}
        </section>

      </main>

      <SiteFooter market={market} />
    </>
  );
}
