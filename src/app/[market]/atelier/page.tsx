import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { CoutureDatePicker } from '@/features/atelier/CoutureDatePicker';
import { AtelierForm, AtelierSubmit } from '@/features/atelier/AtelierForm';
import { requestAppointment } from '@/features/atelier/actions';
import { PROJECT_STAGE_ORDER, PROJECT_STAGE_LABELS } from '@/features/atelier/presentation';
import { AccountUnavailable, SignInRequired } from '@/features/account/AccountShell';
import { getActiveCustomer } from '@/lib/vendure/customer';
import { isMarket } from '@/lib/vendure/channels';

export const metadata: Metadata = {
  title: 'The Atelier',
  description: 'Commission a bespoke or bridal garment from the Nelo atelier in Lagos.',
};

/** Request-only booking. The atelier confirms availability; this never reserves a slot. */
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
  const identity = await getActiveCustomer(market);
  const requestedContext = value('context');
  const selectedContext = requestedContext === 'bridal' || requestedContext === 'bespoke' ? requestedContext : requestedPiece ? 'readyToWear' : 'bespoke';
  const returnQuery = new URLSearchParams({ context: selectedContext });
  if (value('purpose') === 'fitting') returnQuery.set('purpose', 'fitting');
  if (requestedPiece) returnQuery.set('piece', requestedPiece);
  if (requestedColour) returnQuery.set('colour', requestedColour);
  if (requestedSize) returnQuery.set('size', requestedSize);
  const returnTo = `/${market}/atelier?${returnQuery}#commission-form`;

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
            {PROJECT_STAGE_ORDER.map((stage, index) => (
              <li key={stage}>
                <span className="n">{String(index + 1).padStart(2, '0')}</span>
                <div className="t">{PROJECT_STAGE_LABELS[stage]}</div>
              </li>
            ))}
          </ol>
        </section>

        <section id="commission-form" aria-label="Request an atelier appointment">
        {!identity.reachable ? <AccountUnavailable market={market} /> : !identity.customer ? <SignInRequired market={market} returnTo={returnTo} reason="Sign in to request your consultation or fitting." /> : (
        <AtelierForm className="aform" action={requestAppointment} replaceOnSuccess>
          <input type="hidden" name="market" value={market} />
          <div>
            <fieldset>
              <legend>What are you commissioning</legend>
              <div className="opts">
                <label className="opt">
                  <input type="radio" name="context" value="bespoke" defaultChecked={selectedContext === 'bespoke'} />
                  <span>
                    <span className="t">Bespoke</span>
                    <span className="d">A garment designed with you and cut from nothing.</span>
                  </span>
                </label>
                <label className="opt">
                  <input type="radio" name="context" value="bridal" defaultChecked={selectedContext === 'bridal'} />
                  <span>
                    <span className="t">Bridal</span>
                    <span className="d">Four to nine months, typically three fittings.</span>
                  </span>
                </label>
                <label className="opt">
                  <input type="radio" name="context" value="readyToWear" defaultChecked={selectedContext === 'readyToWear'} />
                  <span>
                    <span className="t">Ready to wear, altered</span>
                    <span className="d">An existing style recut to your measurements.</span>
                  </span>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Appointment</legend>
              <div className="opts" style={{ marginBottom: 'var(--s4)' }}>
                <label className="opt">
                  <input type="radio" name="purpose" value="consultation" defaultChecked={value('purpose') !== 'fitting'} />
                  <span>
                    <span className="t">Consultation</span>
                    <span className="d">First meeting. No measurements taken.</span>
                  </span>
                </label>
                <label className="opt">
                  <input type="radio" name="purpose" value="fitting" defaultChecked={value('purpose') === 'fitting'} />
                  <span>
                    <span className="t">Fitting</span>
                    <span className="d">For a commission already under way.</span>
                  </span>
                </label>
              </div>

              <label className="f" htmlFor="where">
                <span className="lab">Where</span>
                <select id="where" name="locationMode" defaultValue="inStore">
                  <option value="inStore">Lagos atelier - Victoria Island</option>
                  <option value="customerLocation">My address</option>
                  <option value="virtual">Video call</option>
                </select>
              </label>
              <label className="f" htmlFor="preferred-date"><span className="lab">Preferred date</span>
                <input id="preferred-date" name="preferredDate" type="date" required />
              </label>
              <label className="f" htmlFor="preferred-time"><span className="lab">Preferred time (Lagos, UTC+1)</span>
                <input id="preferred-time" name="preferredTime" type="time" required />
              </label>
              <p className="mnote">
                All times West Africa Standard Time (Africa/Lagos, UTC+1). Availability is
                confirmed by the atelier - requesting does not reserve a slot.
              </p>
            </fieldset>

            <fieldset>
              <legend>About the piece</legend>
              {requestedPiece ? (
                <div className="atelier-piece-ref">
                  <span className="lab">Selected from the shop</span>
                  <strong>{requestedPiece}</strong>
                  <p>
                    {[requestedColour, requestedSize ? `Size ${requestedSize}` : '']
                      .filter(Boolean)
                      .join(' · ') || 'Your selected shop configuration'}
                  </p>
                  <input type="hidden" name="piece" value={requestedPiece} />
                  <input type="hidden" name="colour" value={requestedColour} />
                  <input type="hidden" name="size" value={requestedSize} />
                </div>
              ) : null}
              <label className="f" htmlFor="occasion">
                <span className="lab">Occasion</span>
                <input
                  id="occasion"
                  name="occasion"
                  type="text"
                  maxLength={120}
                  placeholder="Reception, gala, wedding…"
                />
              </label>
              <CoutureDatePicker id="neededBy" name="neededBy" label="Date you need it" />
              <label className="f" htmlFor="notes">
                <span className="lab">Anything else</span>
                <textarea
                  id="notes"
                  name="notes"
                  rows={5}
                  maxLength={1500}
                  placeholder="References, fabrics, colours, silhouettes you have in mind."
                />
              </label>
            </fieldset>
          </div>

          <div>
            <div className="aside">
              <span className="lab">Your fit</span>
              <h2>Keep your measurements together</h2>
              <p>Measurements are optional before your first consultation. Save them privately in your account when you are ready.</p>
              <Link className="btn-q" href={`/${market}/account/measurements`}>Manage measurements</Link>
            </div>

            <div className="aside">
              <span className="lab">Next</span>
              <h2>A conversation comes first</h2>
              <p>
                You will receive a written proposal with a schedule and a price. Nothing is
                charged, and no date is held, until you accept it.
              </p>
              <AtelierSubmit pendingLabel="Sending request…">
                Request a consultation
              </AtelierSubmit>
              <p className="mnote">A request is not a confirmed appointment. The atelier will contact you to agree the time.</p>
              <Link href={`/${market}/account/atelier`}>View appointments and commissions</Link>
            </div>
          </div>
        </AtelierForm>)}
        </section>

      </main>

      <SiteFooter market={market} />
    </>
  );
}
