import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AccountUnavailable, SignInRequired } from '@/features/account/AccountShell';
import { AtelierRequestForm } from '@/features/atelier/AtelierRequestForm';
import { PROJECT_STAGES } from '@/features/atelier/fixtures';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getActiveCustomer } from '@/lib/vendure/customer';
import { isMarket } from '@/lib/vendure/channels';

export const metadata: Metadata = {
  title: 'The Atelier',
  description: 'Commission a bespoke or bridal garment from the Nelo atelier in Lagos.',
};

// Every Atelier operation is session-carrying and must never be cached or shared.
export const fetchCache = 'only-no-store';

/**
 * Bespoke and bridal intake.
 *
 * Booking is a request, not a reservation: the customer sends one preferred time and the
 * atelier confirms or reschedules it - there is no availability query and nothing is held.
 * Every Atelier operation refuses a guest, so the form itself is gated on sign-in rather than
 * disabled; a guest is sent to sign in or register, with this page as the return destination.
 *
 * What is deliberately absent: no price, no quantity, no add-to-cart, and no measurements -
 * `RequestAppointmentInput` carries neither. A commission is not a cart, and measurements live
 * on the account measurements page, not on a one-off request.
 */
export default async function AtelierPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();
  const query = await searchParams;
  const value = (key: string) => {
    const item = query[key];
    return (Array.isArray(item) ? item[0] : item)?.trim().slice(0, 120) ?? '';
  };
  const requestedPiece = value('piece');
  const requestedColour = value('colour');
  const requestedSize = value('size');

  const activeCustomer = await getActiveCustomer(market);

  return (
    <>
      <SiteHeader
        market={market}
        announcement="Consultations at the Lagos atelier, at your address, or by video"
      />

      <main className="shell">
        <section className="ahero ahero--atelier">
          <div className="atelier-hero__copy">
            <span className="lab">The Atelier</span>
            <h1>
              Commission
              <span className="atelier-hero__break">a garment</span>
            </h1>
            <p>
              Bespoke and bridal begin with a conversation, not a checkout. Tell us what you
              need and we will propose a plan, a schedule and a price before anything is agreed.
            </p>
            <a className="atelier-hero__action" href="#commission-form">
              Begin your consultation <span aria-hidden="true">↓</span>
            </a>
            <dl className="atelier-hero__facts">
              <div><dt>Services</dt><dd>Bespoke · Bridal</dd></div>
              <div><dt>Fittings</dt><dd>Lagos · At home · Video</dd></div>
              <div><dt>Reply</dt><dd>Within 2 working days</dd></div>
            </dl>
          </div>
          <span className="atelier-hero__edition num" aria-hidden="true">ATELIER / BY APPOINTMENT</span>
        </section>

        <section className="life">
          <span className="lab">How a commission runs</span>
          <ol className="steps">
            {PROJECT_STAGES.map((stage) => (
              <li key={stage.key} className={stage.current ? 'now' : undefined}>
                <span className="n">{stage.index}</span>
                <div className="t">{stage.label}</div>
              </li>
            ))}
          </ol>
        </section>

        {!activeCustomer.reachable ? (
          <AccountUnavailable market={market} />
        ) : !activeCustomer.customer ? (
          <SignInRequired
            market={market}
            returnTo={`/${market}/atelier`}
            reason="Sign in to request a consultation. Every Atelier appointment is tied to an account, so we know it's you when we confirm it."
          />
        ) : (
          <AtelierRequestForm
            market={market}
            requestedPiece={requestedPiece}
            requestedColour={requestedColour}
            requestedSize={requestedSize}
          />
        )}
      </main>

      <SiteFooter market={market} />
    </>
  );
}
