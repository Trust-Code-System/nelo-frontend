import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPage } from '@/features/content/ContentPage';
import { contentMetadata } from '@/features/content/metadata';
import { isMarket } from '@/lib/vendure/channels';

export function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  return contentMetadata(params, {
    path: '/shipping',
    title: 'Shipping',
    description:
      'How Nelo Woman ships from Lagos: times within Nigeria and internationally, duties, and what happens while a piece is being made.',
  });
}

export default async function ShippingPage({
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
      title="Shipping and duties"
      standfirst="Everything is made and dispatched from Lagos. Delivery is priced by the store at checkout, against the address you give it."
      aside={
        <>
          <span className="lab">Indicative times</span>
          <h2>From dispatch</h2>
          <ul>
            <li>Lagos — 2 to 3 days</li>
            <li>Rest of Nigeria — 4 to 6 days</li>
            <li>International — 7 to 12 days</li>
            <li>Cut to measure — add 10 to 14 days before dispatch</li>
          </ul>
        </>
      }
    >
      <h2>What the price at checkout means</h2>
      <p>
        Delivery is priced by the store, for your bag and your address, at the delivery step
        of <Link href={`/${market}/checkout`}>checkout</Link>. It is not estimated in your
        browser and it is not a flat rate we hope covers it. If no method covers an address,
        checkout says so rather than quoting one that will fail.
      </p>

      <h2>In stock versus cut to measure</h2>
      <p>
        A piece shown as ready to ship leaves us within one working day. A piece cut to
        measure — either because your size is not in stock or because you asked for it — takes
        10 to 14 days in the atelier before the delivery times alongside start. The product
        page tells you which you are buying before you add it to your bag.
      </p>

      <h2>Duties and taxes</h2>
      <p>
        Prices in each market come from the store for that market: naira in Nigeria, US
        dollars internationally. We never convert a price in your browser, so you are never
        shown a figure the store would not charge.
      </p>
      <p>
        International orders may attract import duty in the destination country. Where we can
        collect it at checkout we do, and it appears in the total before you pay. Where we
        cannot, it is charged by the carrier on delivery and is the recipient&rsquo;s — that is
        set by your country, not by us.
      </p>

      <h2>Tracking</h2>
      <p>
        Every order has a code. Its current state is on{' '}
        <Link href={`/${market}/account/orders`}>your orders</Link>, or through{' '}
        <Link href={`/${market}/order-tracking`}>track an order</Link> if you checked out as a
        guest. The state shown is the store&rsquo;s own record, so it is never ahead of reality.
      </p>

      <h2>Bespoke and bridal</h2>
      <p>
        A commission is scheduled rather than dispatched: fittings, a ready date, and delivery
        or collection arranged with you. That schedule is published by the atelier on your
        commission, and we do not guess at it here.
      </p>
    </ContentPage>
  );
}
