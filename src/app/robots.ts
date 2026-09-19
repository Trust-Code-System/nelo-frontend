import type { MetadataRoute } from 'next';
import { absolute } from '@/lib/seo/site';

/**
 * robots.txt
 *
 * Disallows the surfaces that are either personal or infinite, and nothing else:
 *
 *   - The per-market account and checkout paths are one customer's data. They also carry
 *     `robots: { index: false }` in their own metadata, which is what actually keeps them out
 *     of an index — this file only stops the crawl.
 *   - The search path is an unbounded URL space that generates thin duplicates of the
 *     collection pages and spends crawl budget that should go to products.
 *   - Order tracking takes a code in the query string. There is nothing there to index.
 *   - The api path is the order-status poller. There is nothing there for a crawler.
 *
 * Collections and products are deliberately NOT restricted in any way. They are the whole
 * commercial point of the migration.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/*/account',
          '/*/account/',
          '/*/checkout',
          '/*/checkout/',
          '/*/search',
          '/*/order-tracking',
        ],
      },
    ],
    sitemap: absolute('/sitemap.xml'),
    host: absolute('/'),
  };
}
