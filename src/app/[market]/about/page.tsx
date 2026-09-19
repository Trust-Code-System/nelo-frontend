import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPage } from '@/features/content/ContentPage';
import { contentMetadata } from '@/features/content/metadata';
import { isMarket } from '@/lib/vendure/channels';

export function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  return contentMetadata(params, {
    path: '/about',
    title: 'About',
    description:
      'Nelo Woman is cut in Lagos for the woman who dresses on purpose. Ready to wear in UK 6 to 30, and bespoke from measurements we record to the hundredth of a millimetre.',
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  return (
    <ContentPage
      market={market}
      eyebrow="About"
      title="Cut in Lagos, for the woman who dresses on purpose"
      standfirst="Nelo Woman makes statement femininity wearable: ready to wear in UK 6 to 30, and bespoke and bridal commissioned from measurements we keep."
      aside={
        <>
          <span className="lab">The house, in facts</span>
          <h2>Nelo Woman</h2>
          <ul>
            <li>Founded and based in Lagos, Nigeria</li>
            <li>Ready to wear: UK 6 to 30, every style</li>
            <li>Bespoke and bridal by commission</li>
            <li>Measurements recorded to 0.01 mm</li>
            <li>Two markets: Nigeria in naira, international in US dollars</li>
          </ul>
        </>
      }
    >
      <h2>Every style, in every size</h2>
      <p>
        Most labels publish a size range and then quietly stop cutting above a certain point.
        We do not. Every style in the collection is made in UK 6 to 30, and the size scale on
        each product page shows the whole range rather than hiding it inside a dropdown. When
        a size is not in stock to ship, it can still be cut to measure — those are different
        statements and we keep them separate.
      </p>

      <h2>Measurements, kept properly</h2>
      <p>
        A garment that fits is arithmetic before it is anything else. We record seven points —
        bust, waist, hip, height, shoulder, sleeve and inseam — as decimals in millimetres,
        because a quarter of an inch is 6.35&nbsp;mm and rounding it to 6 throws away work
        somebody did with a tape measure. Your measurements belong to your account, not to a
        single order, so a second commission starts from what we already know.
      </p>
      <p>
        <Link href={`/${market}/size-guide`}>The size guide</Link> shows where each point is
        taken and what we do with it.
      </p>

      <h2>Ready to wear and the atelier</h2>
      <p>
        Ready to wear is a catalogue: you choose a size, you add it to your bag, you check
        out. The atelier is not. A bespoke or bridal garment begins with a conversation, a
        proposal and a schedule, and it has no add-to-bag button anywhere on this site —
        because a commission is not a cart, and pretending otherwise is how a gown ends up
        listed at zero.
      </p>
      <p>
        <Link href={`/${market}/atelier`}>Commission something</Link>, or{' '}
        <Link href={`/${market}/contact`}>ask us first</Link>.
      </p>

      <h2>How we ship</h2>
      <p>
        We ship from Lagos to anywhere. Prices are set per market by the store, in naira for
        Nigeria and US dollars internationally — we never convert a price in your browser, so
        what you see is what the store charges.{' '}
        <Link href={`/${market}/shipping`}>Shipping and duties</Link> has the detail.
      </p>
    </ContentPage>
  );
}
