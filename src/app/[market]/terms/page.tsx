import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPage } from '@/features/content/ContentPage';
import { contentMetadata } from '@/features/content/metadata';
import { STORE_CONTACT } from '@/lib/contact';
import { isMarket } from '@/lib/vendure/channels';

export function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  return contentMetadata(params, {
    path: '/terms',
    title: 'Terms of service',
    description:
      'The terms on which you browse, order from and commission Nelo Woman: payment, made-to-measure pieces, delivery and the atelier.',
  });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  return (
    <ContentPage
      market={market}
      eyebrow="Legal"
      title="Terms of service"
      standfirst="These terms govern the store, your orders, and any commission you begin with the atelier."
      announcement="Last updated 21 September 2026"
      aside={
        <>
          <span className="lab">Also read</span>
          <h2>House rules</h2>
          <ul>
            <li><Link href={`/${market}/privacy`}>Privacy policy</Link></li>
            <li><Link href={`/${market}/shipping`}>Shipping</Link></li>
            <li><Link href={`/${market}/returns`}>Returns</Link></li>
            <li><Link href={`/${market}/size-guide`}>Size guide</Link></li>
          </ul>
        </>
      }
    >
      <h2>Using the store</h2>
      <p>
        Nelo Woman is operated from Lagos, Nigeria. By browsing or placing an order you
        agree to these terms, to our{' '}
        <Link href={`/${market}/privacy`}>privacy policy</Link>, and to the shipping and
        returns pages linked from the footer. If you do not agree, do not use the site.
      </p>

      <h2>Accounts</h2>
      <p>
        An account is yours to keep accurate. You are responsible for the email and password
        that open it. Tell us at{' '}
        <a href={`mailto:${STORE_CONTACT.email}`}>{STORE_CONTACT.email}</a> if you think
        someone else has used it.
      </p>

      <h2>Orders and payment</h2>
      <p>
        A price on a product page is an invitation to order, not a binding offer until we
        accept the order and take payment. Payment is taken at checkout in the currency of
        the market you are shopping in: naira in Nigeria, US dollars worldwide. We never
        convert a price in your browser. If an item cannot be fulfilled we will refund what
        you paid for it.
      </p>

      <h2>Made to measure and commissions</h2>
      <p>
        A garment cut to your measurements, and any bespoke or bridal commission, is made
        for one person. Its terms, fittings and deposits are set out before anything is
        cut. Those pieces are altered rather than refunded, as explained on{' '}
        <Link href={`/${market}/returns`}>returns</Link>. Measurements you enter are used
        only to make that garment.
      </p>

      <h2>Delivery</h2>
      <p>
        Dispatch times and duties are on the{' '}
        <Link href={`/${market}/shipping`}>shipping</Link> page. Delivery is priced by the
        store at checkout for the address you give. International orders may attract import
        duty in the destination country.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The photographs, words, marks and garment designs on this site belong to Nelo Woman.
        You may not copy them for another commercial use. Personal, non-commercial viewing
        of the store is what the site is for.
      </p>

      <h2>Liability</h2>
      <p>
        We are responsible for the garments we sell and for sending what you ordered. We
        are not responsible for delays caused by a carrier, a customs authority, or an
        event outside our control. Nothing in these terms limits any right you have under
        the consumer laws that apply to you.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The date at the top of the page is the date they took
        effect. An order is governed by the terms that were on this page when you paid.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria. If a
        dispute cannot be resolved by writing to the atelier, the courts of Lagos have
        jurisdiction, without limiting any mandatory consumer protection that applies where
        you live.
      </p>

      <h2>Contact</h2>
      <p>
        Nelo Woman, {STORE_CONTACT.streetAddress}, {STORE_CONTACT.area}, {STORE_CONTACT.city},{' '}
        {STORE_CONTACT.country}. {STORE_CONTACT.email}. {STORE_CONTACT.phoneDisplay}.
      </p>
    </ContentPage>
  );
}
