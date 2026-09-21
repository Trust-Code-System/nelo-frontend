import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DirectLinkMark } from '@/components/DirectLinkMark';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { contentMetadata } from '@/features/content/metadata';
import { isMarket } from '@/lib/vendure/channels';

const CHAPTERS = [
  {
    number: '01',
    title: 'Size guide',
    note: 'UK 6 to 30, the seven recorded points, and how to choose a size or cut to measure.',
    href: '/size-guide',
  },
  {
    number: '02',
    title: 'Shipping',
    note: 'Dispatch from Lagos, times in Nigeria and worldwide, and what duties may apply.',
    href: '/shipping',
  },
  {
    number: '03',
    title: 'Returns',
    note: 'Free alterations within 30 days. Ready-to-ship pieces can come back; made-to-measure is fitted, not refunded.',
    href: '/returns',
  },
  {
    number: '04',
    title: 'Track an order',
    note: 'Look up a confirmation code without signing in, or open the order from your account.',
    href: '/order-tracking',
  },
] as const;

export function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  return contentMetadata(params, {
    path: '/client-care',
    title: 'Client care',
    description:
      'Size guide, shipping, returns and order tracking for Nelo Woman — the care pages in one place.',
  });
}

export default async function ClientCarePage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  return (
    <>
      <SiteHeader market={market} announcement="Size, shipping, returns and tracking" />
      <main className="shell care-page">
        <header className="care-intro">
          <span className="lab">Client care</span>
          <h1>Everything after the order.</h1>
          <p>
            Fit, dispatch, alterations and tracking live here — the same pages that used to sit
            only as a list in the footer, now as a house of their own.
          </p>
        </header>

        <nav className="care-index" aria-label="Client care">
          {CHAPTERS.map((chapter) => (
            <Link key={chapter.href} href={`/${market}${chapter.href}`}>
              <span className="num">{chapter.number}</span>
              <strong>{chapter.title}</strong>
              <small>{chapter.note}</small>
              <span>
                Open <DirectLinkMark />
              </span>
            </Link>
          ))}
        </nav>
      </main>
      <SiteFooter market={market} />
    </>
  );
}
