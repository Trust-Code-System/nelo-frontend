import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPage } from '@/features/content/ContentPage';
import { contentMetadata } from '@/features/content/metadata';
import { isMarket } from '@/lib/vendure/channels';

export function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  return contentMetadata(params, {
    path: '/returns',
    title: 'Returns',
    description:
      'Nelo Woman returns, exchanges and free alterations within 30 days - and why a cut-to-measure piece is altered rather than refunded.',
  });
}

export default async function ReturnsPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  return (
    <ContentPage
      market={market}
      eyebrow="Care"
      title="Returns and alterations"
      standfirst="Free alterations within 30 days of delivery. Stock pieces can be returned; pieces cut for your body are altered until they are right."
      aside={
        <>
          <span className="lab">At a glance</span>
          <h2>The rules</h2>
          <ul>
            <li>Alterations - free, within 30 days of delivery</li>
            <li>Ready-to-ship pieces - returnable within 14 days, unworn</li>
            <li>Cut to measure - altered, not refunded</li>
            <li>Bespoke and bridal - altered to fit, at fitting stage</li>
            <li>Faulty or wrong item - our cost, always</li>
          </ul>
        </>
      }
    >
      <h2>Alterations come first</h2>
      <p>
        Most of what people return is a fit problem, and a fit problem is something an atelier
        can actually solve. So alterations are free for 30 days after delivery: tell us what
        is wrong, and we adjust the garment rather than taking it back and selling you a
        different size of the same mistake.
      </p>

      <h2>Ready-to-ship pieces</h2>
      <p>
        A piece that shipped from stock can be returned within 14 days of delivery, unworn,
        with its tags on. Once we have it back and it checks out, we refund what you paid for
        it by the way you paid. Delivery is not refunded unless the piece was faulty or we
        sent the wrong thing.
      </p>

      <h2>Pieces cut to measure</h2>
      <p>
        A garment cut to your measurements was made for one person, and there is no second
        customer for it. Those pieces are altered rather than refunded - as many times as it
        takes to fit, within 30 days. This is stated on the product page before you buy, and
        it is the honest trade for having something made to your body.
      </p>

      <h2>Bespoke and bridal</h2>
      <p>
        A commission is a scheduled process with fittings built into it, and its terms are
        agreed in the proposal before anything is cut. Fit is corrected at fitting stage,
        which is what the fittings are for. Deposits and charge schedules are set out by the
        atelier on your commission - the storefront never calculates them for you.
      </p>

      <h2>If something is wrong with the garment</h2>
      <p>
        If a piece is faulty or not what you ordered, that is ours to fix at our cost,
        whichever category it falls in, and the 14-day and 30-day windows do not apply.{' '}
        <Link href={`/${market}/contact`}>Tell us</Link> with your order code and we will
        arrange collection.
      </p>

      <h2>Starting a return</h2>
      <p>
        <Link href={`/${market}/contact`}>Message the atelier</Link> with your order code and
        say which pieces and why. We will send collection or return instructions - please do
        not post anything back before we have, because an unannounced parcel is hard to match
        to an order.
      </p>
    </ContentPage>
  );
}
