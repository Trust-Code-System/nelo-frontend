import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { NeloProductGrid } from '@/features/catalogue/NeloProductGrid';
import { ShopToolbar } from '@/features/catalogue/ShopToolbar';
import { NELO_PRODUCTS, type NeloProduct } from '@/features/catalogue/nelo';
import { marketAlternates } from '@/lib/seo/site';
import { isMarket } from '@/lib/vendure/channels';

type Sort = 'featured' | 'name' | 'price-low' | 'price-high';
type ShopQuery = { sort?: string; colour?: string; size?: string };

const FEATURED_ORDER = ['adele', 'bloom', 'reign', 'nova'];

function sortProducts(products: readonly NeloProduct[], sort: Sort) {
  return [...products].sort((a, b) => {
    if (sort === 'name') return a.title.localeCompare(b.title);
    if (sort === 'price-low') return Number(a.variants[0]?.price ?? 0) - Number(b.variants[0]?.price ?? 0);
    if (sort === 'price-high') return Number(b.variants[0]?.price ?? 0) - Number(a.variants[0]?.price ?? 0);
    const aFeatured = FEATURED_ORDER.indexOf(a.handle);
    const bFeatured = FEATURED_ORDER.indexOf(b.handle);
    if (aFeatured >= 0 || bFeatured >= 0) {
      if (aFeatured < 0) return 1;
      if (bFeatured < 0) return -1;
      return aFeatured - bFeatured;
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

function optionValues(name: string) {
  const values = NELO_PRODUCTS.flatMap((product) =>
    product.options
      .filter((option) => option.name.toLocaleLowerCase() === name)
      .flatMap((option) => option.values),
  );
  return [...new Map(values.map((value) => [value.trim().toLocaleLowerCase(), value.trim()])).values()];
}

function hasOption(product: NeloProduct, name: string, value: string) {
  return product.options.some(
    (option) =>
      option.name.toLocaleLowerCase() === name &&
      option.values.some((candidate) => candidate.trim().toLocaleLowerCase() === value.toLocaleLowerCase()),
  );
}

function shopHref(market: string, query: ShopQuery, change: Partial<ShopQuery>) {
  const next = { ...query, ...change };
  const params = new URLSearchParams();
  if (next.colour) params.set('colour', next.colour);
  if (next.size) params.set('size', next.size);
  if (next.sort && next.sort !== 'featured') params.set('sort', next.sort);
  const suffix = params.toString();
  return `/${market}/shop${suffix ? `?${suffix}` : ''}`;
}

export async function generateMetadata({ params }: { params: Promise<{ market: string }> }): Promise<Metadata> {
  const { market } = await params;
  if (!isMarket(market)) return {};
  return {
    title: 'Shop all',
    description: 'Shop the complete NELO Woman catalogue with original campaign images, colours and sizes.',
    alternates: marketAlternates(market, '/shop'),
  };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<ShopQuery>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();
  const query = await searchParams;
  const sort: Sort = ['name', 'price-low', 'price-high'].includes(query.sort ?? '')
    ? (query.sort as Sort)
    : 'featured';
  const colours = optionValues('colour').sort((a, b) => a.localeCompare(b));
  const sizes = optionValues('size')
    .filter((value) => /^\d+$/.test(value))
    .sort((a, b) => Number(a) - Number(b));

  const products = sortProducts(
    NELO_PRODUCTS.filter(
      (product) =>
        (!query.colour || hasOption(product, 'colour', query.colour)) &&
        (!query.size || hasOption(product, 'size', query.size)),
    ),
    sort,
  );
  const activeFilters = Number(Boolean(query.colour)) + Number(Boolean(query.size));

  return (
    <>
      <SiteHeader market={market} announcement="Statement femininity, cut in Lagos" />
      <main className="shell shop-page">
        <header className="shop-index-intro">
          <div className="shop-index-intro__copy">
            <span className="lab">The complete house edit</span>
            <h1 data-motion-words><span>Shop</span> <em>all</em></h1>
            <p>
              Seventy seven pieces, original campaign views, and every published colour and size.
              Hover or focus a portrait to see another angle.
            </p>
            <div className="shop-index-intro__meta">
              <span><strong>{NELO_PRODUCTS.length}</strong> pieces</span>
              <span><strong>{colours.length}</strong> colours</span>
              <span><strong>6 to 32</strong> size range</span>
            </div>
          </div>
          <div className="shop-index-intro__film" aria-hidden="true" data-motion-clip>
            <Image src="/editorial/live/adele-02.webp" alt="" width={864} height={1080} priority />
            <Image src="/editorial/live/bloom-02.webp" alt="" width={864} height={1080} priority />
            <Image src="/editorial/live/reign-02.webp" alt="" width={864} height={1080} priority />
          </div>
          <span className="shop-index-intro__edition num">NL / INDEX 01</span>
        </header>

        <ShopToolbar
          colourLabel={`Colour${query.colour ? ` · ${query.colour}` : ''}`}
          sizeLabel={`Size${query.size ? ` · ${query.size}` : ''}`}
          sortLabel={`Sort · ${sort === 'featured' ? 'Featured' : sort.replace('-', ' ')}`}
          colourOptions={[
            { label: 'All colours', href: shopHref(market, query, { colour: '' }), active: !query.colour },
            ...colours.map((colour) => ({
              label: colour,
              href: shopHref(market, query, { colour }),
              active: query.colour?.toLocaleLowerCase() === colour.toLocaleLowerCase(),
            })),
          ]}
          sizeOptions={[
            { label: 'All', href: shopHref(market, query, { size: '' }), active: !query.size },
            ...sizes.map((size) => ({
              label: size,
              href: shopHref(market, query, { size }),
              active: query.size === size,
            })),
          ]}
          sortOptions={([
            ['featured', 'Featured'],
            ['name', 'Name'],
            ['price-low', 'Price, low to high'],
            ['price-high', 'Price, high to low'],
          ] as const).map(([value, label]) => ({
            label,
            href: shopHref(market, query, { sort: value }),
            active: sort === value,
          }))}
          resultCount={products.length}
          activeFilters={activeFilters}
          clearHref={`/${market}/shop`}
        />

        {products.length ? (
          <NeloProductGrid products={products} market={market} />
        ) : (
          <section className="shop-empty">
            <span className="lab">No exact match</span>
            <h2>Try another colour or size.</h2>
            <Link className="btn" href={`/${market}/shop`}>Reset the edit</Link>
          </section>
        )}

        <section className="shop-service" aria-labelledby="shop-service-title" data-motion-reveal>
          <span className="lab">Need a different finish?</span>
          <h2 id="shop-service-title">The atelier begins with your measurements.</h2>
          <p>Commission a new piece, adjust an existing style, or prepare for a fitting in Lagos.</p>
          <Link className="btn" href={`/${market}/atelier`}>Begin a commission</Link>
        </section>
      </main>
      <SiteFooter market={market} />
    </>
  );
}
