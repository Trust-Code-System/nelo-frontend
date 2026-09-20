import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DirectLinkMark } from '@/components/DirectLinkMark';
import { ContentPage } from '@/features/content/ContentPage';
import { contentMetadata } from '@/features/content/metadata';
import { STORE_CONTACT } from '@/lib/contact';
import { isMarket } from '@/lib/vendure/channels';

export function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  return contentMetadata(params, {
    path: '/contact',
    title: 'Contact',
    description:
      'Reach the Nelo Woman atelier in Lagos about an order, a commission, an alteration or a fitting.',
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  return (
    <ContentPage
      market={market}
      eyebrow="Contact"
      title="Talk to the atelier"
      standfirst="One inbox, read by the people who actually make the clothes."
      announcement="Consultations at the Lagos atelier, at your address, or by video"
      aside={
        <>
          <span className="lab">Direct</span>
          <h2>Contact details</h2>
          <ul>
            <li><a href={`mailto:${STORE_CONTACT.email}`}>{STORE_CONTACT.email}</a></li>
            <li><a href={`tel:${STORE_CONTACT.phoneHref}`}>{STORE_CONTACT.phoneDisplay}</a></li>
            <li>{STORE_CONTACT.streetAddress}, {STORE_CONTACT.area}, {STORE_CONTACT.city}</li>
            <li>Consultations: in the atelier, at your address, or by video</li>
            <li>Order questions: have your order code ready</li>
          </ul>
        </>
      }
    >
      <h2>Visit the Lagos store</h2>
      <address className="contact-details">
        <strong>{STORE_CONTACT.name}</strong>
        <span>{STORE_CONTACT.streetAddress}</span>
        <span>{STORE_CONTACT.area}, {STORE_CONTACT.city}, {STORE_CONTACT.country}</span>
        <a href={`tel:${STORE_CONTACT.phoneHref}`}>{STORE_CONTACT.phoneDisplay}</a>
        <a href={`mailto:${STORE_CONTACT.email}`}>{STORE_CONTACT.email}</a>
        <a href={STORE_CONTACT.instagram} rel="noreferrer" target="_blank">
          Follow @nelowoman on Instagram <DirectLinkMark />
        </a>
      </address>

      <h2>About an order</h2>
      <p>
        Have your order code ready - it is on your confirmation email and at the top of the
        order in <Link href={`/${market}/account/orders`}>your account</Link>. If you checked
        out as a guest, the code is all we need.
      </p>
      <p>
        You can also <Link href={`/${market}/order-tracking`}>look an order up by code</Link>{' '}
        without signing in.
      </p>

      <h2>About a commission</h2>
      <p>
        Bespoke and bridal start with a conversation rather than a checkout. Tell us the
        occasion, the date you need it by, and anything you already know about what you want;
        we will come back with a plan, a schedule and a price before anything is agreed.
      </p>
      <p>
        <Link href={`/${market}/atelier`}>Start a commission</Link>.
      </p>

      <h2>Alterations and returns</h2>
      <p>
        Alterations are free within 30 days of delivery. Cut-to-measure pieces are returnable
        for alteration rather than refund - <Link href={`/${market}/returns`}>returns</Link>{' '}
        explains where the line is and why.
      </p>

      <h2>Press and stockists</h2>
      <p>
        Send the publication or shop, the territory, and your timeline, and we will point you
        at the right person.
      </p>
    </ContentPage>
  );
}
