import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPage } from '@/features/content/ContentPage';
import { contentMetadata } from '@/features/content/metadata';
import { STORE_CONTACT } from '@/lib/contact';
import { isMarket } from '@/lib/vendure/channels';

export function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  return contentMetadata(params, {
    path: '/privacy',
    title: 'Privacy policy',
    description:
      'How Nelo Woman collects, uses and keeps the information you give us when you shop, enquire or join the house list.',
  });
}

export default async function PrivacyPage({
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
      title="Privacy policy"
      standfirst="We collect what we need to make, ship and look after your clothes. We do not sell it."
      announcement="Last updated 21 September 2026"
      aside={
        <>
          <span className="lab">At a glance</span>
          <h2>Who to write</h2>
          <ul>
            <li><a href={`mailto:${STORE_CONTACT.email}`}>{STORE_CONTACT.email}</a></li>
            <li>{STORE_CONTACT.streetAddress}, {STORE_CONTACT.area}</li>
            <li>{STORE_CONTACT.city}, {STORE_CONTACT.country}</li>
            <li>
              <Link href={`/${market}/terms`}>Terms of service</Link>
            </li>
          </ul>
        </>
      }
    >
      <h2>What we collect</h2>
      <p>
        When you create an account, place an order, book a fitting or write to us, we keep the
        details needed to do that work: name, email, phone, delivery and billing addresses,
        payment confirmation from our processor, and the contents of your order. If you send
        measurements for a cut-to-measure or atelier piece, those measurements stay on your
        order and your account. They are never put in a URL, a public page or a marketing list.
      </p>
      <p>
        The site also records ordinary technical facts: the pages you visit, your browser, and
        an IP address used to keep the store secure and to remember your market (Nigeria or
        worldwide).
      </p>

      <h2>How we use it</h2>
      <p>
        We use this information to take payment, cut and ship your order, run your account,
        answer a message, and send the house notes you asked for. We may also use it to
        prevent fraud, keep the store working, and meet a legal duty. Promotional email is
        only sent if you join the list, and every note has a way to leave.
      </p>

      <h2>Who we share it with</h2>
      <p>
        Orders pass through the store, our payment partner and the carrier who delivers the
        parcel. We do not sell your information, and we do not share measurements with anyone
        outside the atelier that is making the garment. If a court or regulator lawfully asks
        for a record, we will provide what the law requires and nothing more.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account and order records are kept for as long as the account exists and for as long
        as tax and consumer law in Nigeria require. You can ask us to close an account or
        delete a mailing-list entry; we will keep only what we must retain for a completed
        order or a legal obligation.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask to see, correct or delete the personal information we hold, or to stop
        promotional mail. Write to{' '}
        <a href={`mailto:${STORE_CONTACT.email}`}>{STORE_CONTACT.email}</a> from the address
        on the account. We will need to confirm it is you before we change or remove a
        record.
      </p>

      <h2>Children</h2>
      <p>
        This store is for adults. We do not knowingly collect information from children.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the date at the top of the page will change with it. The
        version on this site is the one that applies.
      </p>
    </ContentPage>
  );
}
