import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPage } from '@/features/content/ContentPage';
import { contentMetadata } from '@/features/content/metadata';
import { isMarket } from '@/lib/vendure/channels';

export function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  return contentMetadata(params, {
    path: '/contact',
    title: 'Contact',
    description:
      'Reach the Nelo Woman atelier in Lagos about an order, a commission, an alteration or a fitting.',
  });
}

/**
 * Contact.
 *
 * The real email address, phone number and street address are deliberately absent. They are
 * Nelo's to supply, and a plausible-looking placeholder on a published page is worse than an
 * obvious gap — somebody will try to use it. The gap is marked so it cannot ship unnoticed.
 */
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
          <h2>Details to confirm</h2>
          <ul>
            <li>
              Email, phone and the atelier address are not published here yet — see the note
              on this page.
            </li>
            <li>Consultations: in the atelier, at your address, or by video</li>
            <li>Order questions: have your order code ready</li>
          </ul>
        </>
      }
    >
      <p className="notice notice-error">
        This page is missing its real contact details. The email address, phone number,
        opening hours and the atelier&rsquo;s street address have to come from Nelo. They are
        left blank on purpose rather than filled with something that looks right.
      </p>

      <h2>About an order</h2>
      <p>
        Have your order code ready — it is on your confirmation email and at the top of the
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
        for alteration rather than refund — <Link href={`/${market}/returns`}>returns</Link>{' '}
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
