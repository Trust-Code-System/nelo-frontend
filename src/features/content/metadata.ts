import type { Metadata } from 'next';
import { marketAlternates } from '@/lib/seo/site';
import { isMarket } from '@/lib/vendure/channels';

/**
 * Metadata for a written page.
 *
 * Every route needs a canonical and both market alternates, not just the catalogue ones: a
 * shipping policy that exists at two URLs with no canonical between them is duplicate
 * content, and it is the kind of duplicate content that quietly drags the whole domain.
 *
 * Written as one helper so adding a page cannot accidentally ship without them.
 */
export async function contentMetadata(
  params: Promise<{ market: string }>,
  page: { path: string; title: string; description: string },
): Promise<Metadata> {
  const { market } = await params;
  if (!isMarket(market)) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: marketAlternates(market, page.path),
    openGraph: { title: page.title, description: page.description, type: 'article' },
  };
}
