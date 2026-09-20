import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { NeloProductGrid } from '@/features/catalogue/NeloProductGrid';
import { searchNeloProducts } from '@/features/catalogue/nelo';
import { isMarket, type Market } from '@/lib/vendure/channels';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();
  const raw = await searchParams;
  const value = raw.q;
  const term = (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100) ?? '';
  const products = term ? searchNeloProducts(term) : [];

  return (
    <>
      <SiteHeader market={market} announcement="Find your next NELO piece" />
      <main className="shell search-page">
        <header className="phead phead--search">
          <div>
            <span className="lab">Full catalogue search</span>
            <h1>{term ? `Results for “${term}”` : 'Find your piece'}</h1>
            <p>
              Search the full NELO archive by garment, colour, size or occasion.
              {term ? ` ${products.length} ${products.length === 1 ? 'piece matches' : 'pieces match'}.` : ''}
            </p>
          </div>
        </header>

        <SearchForm market={market} term={term} />

        {!term ? (
          <section className="search-prompts" aria-label="Suggested searches">
            <span className="lab">Start with</span>
            <div>
              {['Dress', 'Set', 'Black', 'Bridal', 'Size 18'].map((suggestion) => (
                <Link key={suggestion} href={`/${market}/search?q=${encodeURIComponent(suggestion)}`}>
                  {suggestion}
                </Link>
              ))}
            </div>
          </section>
        ) : products.length > 0 ? (
          <section className="search-results" aria-label={`Search results for ${term}`}>
            <NeloProductGrid products={products} market={market} />
          </section>
        ) : (
          <div className="empty search-empty">
            <span className="lab">No exact match</span>
            <h2>Try a broader description</h2>
            <p>Try a colour, a silhouette, or browse every piece in the house archive.</p>
            <div className="acts-row">
              <Link className="btn-q" href={`/${market}/shop`}>Shop all</Link>
              <Link className="btn-q" href={`/${market}/atelier`}>Ask the atelier</Link>
            </div>
          </div>
        )}
      </main>
      <SiteFooter market={market} />
    </>
  );
}

function SearchForm({ market, term }: { market: Market; term: string }) {
  return (
    <form className="searchform searchform--full" action={`/${market}/search`} method="get" role="search">
      <label className="sr" htmlFor="full-site-search">Search the NELO collection</label>
      <input
        id="full-site-search"
        type="search"
        name="q"
        defaultValue={term}
        placeholder="Dress, black, bridal, size 18"
        maxLength={100}
        autoComplete="off"
      />
      <button className="btn" type="submit">Search</button>
    </form>
  );
}
