import type { MetadataRoute } from 'next';
import { absolute, hreflangFor } from '@/lib/seo/site';
import { MARKETS, type Market } from '@/lib/vendure/channels';
import { SitemapCatalogueDocument } from '@/lib/vendure/generated/graphql';
import { catalogueQuery } from '@/lib/vendure/transport';

/**
 * sitemap.xml
 *
 * Market-aware: every URL exists once per market, and each entry declares the other market
 * as an alternate so a crawler is told the two are the same page in different regions rather than
 * left to guess or to treat one as duplicate content.
 *
 * Read through the anonymous cacheable path. A sitemap contains nothing personal, carries no
 * session, and is the clearest example of a read that should be shared between requests.
 *
 * Account, checkout and search are absent on purpose: they are either one customer's data or
 * an unbounded URL space, and both belong out of a sitemap.
 */

// One hour. The catalogue changes on a human timescale, and the fetch underneath is cached
// by `catalogueQuery` anyway.
export const revalidate = 3600;

/** Vendure's Shop API caps a list query, so the products are paged rather than asked for in
 *  one impossible request. The ceiling stops a runaway loop if a backend ever reports a
 *  totalItems it will not serve. */
const PAGE = 100;
const MAX_PRODUCTS = 5000;

/** Written pages, in the order they matter commercially. */
const STATIC_PATHS = [
  { path: '', priority: 1, changeFrequency: 'daily' as const },
  { path: '/collections', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/shop', priority: 1, changeFrequency: 'daily' as const },
  { path: '/atelier', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/client-care', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/size-guide', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/shipping', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/returns', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
  // Indexable while empty: people search for "track my order" by name. The page carries
  // `noindex` only once a code is in the query string.
  { path: '/order-tracking', priority: 0.5, changeFrequency: 'monthly' as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  for (const path of STATIC_PATHS) {
    for (const market of MARKETS) {
      entries.push({
        url: absolute(`/${market}${path.path}`),
        lastModified: now,
        changeFrequency: path.changeFrequency,
        priority: path.priority,
        alternates: { languages: languagesFor(path.path) },
      });
    }
  }

  // The catalogue is read once and reused for both markets: the same products are assigned
  // to both Channels, so querying twice would double the load to produce the same slugs.
  const catalogue = await readCatalogue('ng');

  for (const collection of catalogue.collections) {
    for (const market of MARKETS) {
      entries.push({
        url: absolute(`/${market}/collections/${collection.slug}`),
        lastModified: collection.updatedAt ? new Date(collection.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: { languages: languagesFor(`/collections/${collection.slug}`) },
      });
    }
  }

  for (const product of catalogue.products) {
    for (const market of MARKETS) {
      entries.push({
        url: absolute(`/${market}/products/${product.slug}`),
        lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: { languages: languagesFor(`/products/${product.slug}`) },
      });
    }
  }

  return entries;
}

function languagesFor(pathWithinMarket: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const market of MARKETS) {
    languages[hreflangFor(market)] = absolute(`/${market}${pathWithinMarket}`);
  }
  languages['x-default'] = absolute(`/ng${pathWithinMarket}`);
  return languages;
}

type Entry = { slug: string; updatedAt: string | null };

/**
 * A sitemap that cannot reach the catalogue returns the written pages rather than nothing.
 *
 * Serving an empty sitemap is actively harmful: it tells a crawler the site has no products,
 * which is the opposite of a transient failure's meaning. A short sitemap says less; an empty
 * one says something false.
 */
async function readCatalogue(
  market: Market,
): Promise<{ products: Entry[]; collections: Entry[] }> {
  const products: Entry[] = [];
  let collections: Entry[] = [];

  try {
    let skip = 0;
    for (;;) {
      const { data } = await catalogueQuery(
        SitemapCatalogueDocument,
        { options: { take: PAGE, skip } },
        market,
        revalidate,
      );

      if (skip === 0) {
        collections = data.collections.items.map((item) => ({
          slug: item.slug,
          updatedAt: item.updatedAt,
        }));
      }

      const page = data.products.items;
      products.push(...page.map((item) => ({ slug: item.slug, updatedAt: item.updatedAt })));

      skip += page.length;
      if (page.length < PAGE || skip >= data.products.totalItems || skip >= MAX_PRODUCTS) break;
    }
  } catch {
    return { products, collections };
  }

  return { products, collections };
}
