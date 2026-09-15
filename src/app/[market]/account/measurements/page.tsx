import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { PROFILES } from '@/features/atelier/fixtures';
import { MeasurementFields } from '@/features/atelier/MeasurementFields';
import type { MeasurementProfile } from '@/features/atelier/types';
import { display, fromMillimetres, LABELS, MEASUREMENT_CODES } from '@/lib/atelier/measurements';
import { isMarket } from '@/lib/vendure/channels';

export const metadata: Metadata = { title: 'Your measurements' };

const LAGOS = 'Africa/Lagos';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: LAGOS }).format(
    new Date(iso),
  );
}

/**
 * Measurement profiles.
 *
 * Profiles are reusable and exactly one is the active default. A commission does not read
 * this page live — it holds its own confirmed snapshot — so editing here never changes a
 * garment already in production. That is stated on the page, because it is not obvious and
 * getting it wrong would be expensive.
 *
 * Nothing here goes into a URL, browser storage, analytics or a public cache.
 */
export default async function MeasurementsPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  const active = PROFILES.find((profile) => profile.isDefault) ?? PROFILES[0];

  // Prefill the editor from the active profile, converted to inches for entry.
  const initial = active
    ? Object.fromEntries(
        active.measurements
          .filter((measurement) => measurement.millimetres !== null)
          .map((measurement) => [
            measurement.code,
            { value: fromMillimetres(measurement.millimetres as string, 'inch'), unit: 'inch' },
          ]),
      )
    : {};

  return (
    <>
      <div className="fixture">
        <span className="lab">
          Fixture data — no Atelier Shop API exists yet. Nothing on this screen is live.
        </span>
      </div>
      <SiteHeader market={market} announcement="Your measurements — Nelo Atelier" />

      <main className="shell">
        <div className="proj-head">
          <div>
            <span className="lab">Account</span>
            <h1>Your measurements</h1>
          </div>
          <div className="proj-meta">
            <span>
              {PROFILES.length} {PROFILES.length === 1 ? 'profile' : 'profiles'}
            </span>
          </div>
        </div>

        <section className="section-gap">
          <div className="shead">
            <div>
              <span className="lab">Saved</span>
              <h2>Profiles</h2>
            </div>
          </div>

          {PROFILES.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}

          <p className="mnote">
            One profile is the default and is the one we reach for first. A commission keeps
            its own confirmed snapshot, so changing anything here will not alter a garment
            already being made.
          </p>
        </section>

        <section className="section-gap">
          <div className="shead">
            <div>
              <span className="lab">Edit</span>
              <h2>{active ? active.name : 'New profile'}</h2>
            </div>
          </div>

          <form className="aform" action="#">
            <div>
              <fieldset>
                <legend>Profile</legend>
                <label className="f" htmlFor="profile-name">
                  <span className="lab">Name this profile</span>
                  <input
                    id="profile-name"
                    name="name"
                    type="text"
                    defaultValue={active?.name ?? ''}
                    placeholder="My measurements"
                  />
                </label>
                <label className="opt" style={{ border: 'var(--rule)' }}>
                  <input
                    type="checkbox"
                    name="makeDefault"
                    defaultChecked={active?.isDefault ?? true}
                  />
                  <span>
                    <span className="t">Use this profile by default</span>
                    <span className="d">
                      We will cut to this one unless a commission confirms different figures.
                    </span>
                  </span>
                </label>
              </fieldset>

              <fieldset>
                <legend>Where we are with this</legend>
                <dl className="mlist">
                  <div className="spec">
                    <dt>Confirmed</dt>
                    <span className="led" />
                    <dd>{formatDate(active?.confirmedAt ?? null)}</dd>
                  </div>
                  <div className="spec">
                    <dt>By</dt>
                    <span className="led" />
                    <dd>{active?.confirmedLocation ?? 'Self-measured'}</dd>
                  </div>
                  <div className="spec">
                    <dt>Last edited</dt>
                    <span className="led" />
                    <dd>{formatDate(active?.updatedAt ?? null)}</dd>
                  </div>
                </dl>
                <p className="mnote">
                  Self-measured figures are a good start. We confirm them at your first fitting
                  before anything is cut.
                </p>
              </fieldset>
              <div className="aside">
                <span className="lab">Saving</span>
                <h3>Nothing leaves this page yet</h3>
                <p>
                  Your figures are never put in a web address, stored in your browser, or sent
                  to analytics. When saving is live they go straight to the atelier.
                </p>
                <button className="btn submit" type="button" disabled>
                  Save profile
                </button>
                <p className="mnote" style={{ textAlign: 'center' }}>
                  Disabled until the Atelier API exists
                </p>
              </div>
            </div>

            <div>
              <fieldset>
                <legend>Measurements</legend>
                <MeasurementFields initial={initial} />
              </fieldset>

            </div>
          </form>
        </section>

        <SiteFooter market={market} />
      </main>
    </>
  );
}

function ProfileCard({ profile }: { profile: MeasurementProfile }) {
  const byCode = new Map(profile.measurements.map((m) => [m.code, m.millimetres]));
  const confirmedCount = profile.measurements.filter((m) => m.millimetres !== null).length;

  return (
    <article className="garment">
      <div className="garment-head">
        <h3>
          {profile.name}
          {profile.isDefault ? (
            <span className="pill soon" style={{ marginLeft: 'var(--s3)' }}>
              Default
            </span>
          ) : null}
        </h3>
        <span className="eta">
          {confirmedCount} of {MEASUREMENT_CODES.length} confirmed ·{' '}
          {profile.confirmedAt
            ? `confirmed ${formatDate(profile.confirmedAt)}`
            : 'not yet confirmed by the atelier'}
        </span>
      </div>

      <dl className="snap-grid">
        {MEASUREMENT_CODES.map((code) => {
          const mm = byCode.get(code) ?? null;
          return (
            <div key={code} className={mm === null ? 'unset' : undefined}>
              <dt>{LABELS[code]}</dt>
              <dd>{display(mm, 'millimetre')}</dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}
