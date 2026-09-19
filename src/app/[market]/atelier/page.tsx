import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { MeasurementFields } from '@/features/atelier/MeasurementFields';
import { PROJECT_STAGES } from '@/features/atelier/fixtures';
import { isMarket } from '@/lib/vendure/channels';

export const metadata: Metadata = {
  title: 'The Atelier',
  description: 'Commission a bespoke or bridal garment from the Nelo atelier in Lagos.',
};

/**
 * Bespoke and bridal intake.
 *
 * FIXTURE SCREEN. No Atelier Shop API exists, so nothing here submits anywhere. The banner
 * is not decoration: the backend context requires prototypes to be visibly isolated rather
 * than presented as live, and forbids guessing production mutation names.
 *
 * Note what is deliberately absent: no price, no quantity, no add-to-cart. A commission is
 * not a cart, and its operational status is not payment status.
 */
export default async function AtelierPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  return (
    <>
      <div className="fixture">
        <span className="lab">
          Fixture data — no Atelier Shop API exists yet. Nothing on this screen is live.
        </span>
      </div>
      <SiteHeader
        market={market}
        announcement="Consultations at the Lagos atelier, at your address, or by video"
      />

      <main className="shell">
        <section className="ahero">
          <div>
            <span className="lab">The Atelier</span>
            <h1>Commission a garment</h1>
            <p>
              Bespoke and bridal begin with a conversation, not a checkout. Tell us what you
              need and we will propose a plan, a schedule and a price before anything is agreed.
            </p>
          </div>
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

        <form className="aform" action="#" aria-describedby="not-live">
          <div>
            <fieldset>
              <legend>What are you commissioning</legend>
              <div className="opts">
                <label className="opt">
                  <input type="radio" name="context" value="bespoke" defaultChecked />
                  <span>
                    <span className="t">Bespoke</span>
                    <span className="d">A garment designed with you and cut from nothing.</span>
                  </span>
                </label>
                <label className="opt">
                  <input type="radio" name="context" value="bridal" />
                  <span>
                    <span className="t">Bridal</span>
                    <span className="d">Four to nine months, typically three fittings.</span>
                  </span>
                </label>
                <label className="opt">
                  <input type="radio" name="context" value="readyToWear" />
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
                  <input type="radio" name="purpose" value="consultation" defaultChecked />
                  <span>
                    <span className="t">Consultation</span>
                    <span className="d">First meeting. No measurements taken.</span>
                  </span>
                </label>
                <label className="opt">
                  <input type="radio" name="purpose" value="fitting" />
                  <span>
                    <span className="t">Fitting</span>
                    <span className="d">For a commission already under way.</span>
                  </span>
                </label>
              </div>

              <label className="f" htmlFor="where">
                <span className="lab">Where</span>
                <select id="where" name="locationMode" defaultValue="inStore">
                  <option value="inStore">Lagos atelier — Victoria Island</option>
                  <option value="customerLocation">My address</option>
                  <option value="virtual">Video call</option>
                </select>
              </label>
              <label className="f" htmlFor="preferred">
                <span className="lab">Preferred date</span>
                <input id="preferred" name="preferredAt" type="date" />
              </label>
              <p className="mnote">
                All times West Africa Standard Time (Africa/Lagos, UTC+1). Availability is
                confirmed by the atelier — requesting does not reserve a slot.
              </p>
            </fieldset>

            <fieldset>
              <legend>About the piece</legend>
              <label className="f" htmlFor="occasion">
                <span className="lab">Occasion</span>
                <input
                  id="occasion"
                  name="occasion"
                  type="text"
                  placeholder="Reception, gala, wedding…"
                />
              </label>
              <label className="f" htmlFor="neededBy">
                <span className="lab">Date you need it</span>
                <input id="neededBy" name="neededBy" type="date" />
              </label>
              <label className="f" htmlFor="notes">
                <span className="lab">Anything else</span>
                <textarea
                  id="notes"
                  name="notes"
                  rows={5}
                  placeholder="References, fabrics, colours, silhouettes you have in mind."
                />
              </label>
            </fieldset>
          </div>

          <div>
            <fieldset>
              <legend>Measurements — optional at this stage</legend>
              <MeasurementFields />
            </fieldset>

            <div className="aside">
              <span className="lab">Next</span>
              <h2>We reply within two working days</h2>
              <p>
                You will receive a written proposal with a schedule and a price. Nothing is
                charged, and no date is held, until you accept it.
              </p>
              <button className="btn submit" type="button" disabled>
                Request a consultation
              </button>
              <p className="mnote" id="not-live" style={{ textAlign: 'center' }}>
                Disabled until the Atelier API exists — this form does not submit
              </p>
            </div>
          </div>
        </form>

        <SiteFooter market={market} />
      </main>
    </>
  );
}
