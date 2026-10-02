import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AccountShell, AccountUnavailable, SignInRequired } from '@/features/account/AccountShell';
import { ActionForm } from '@/features/account/ActionForm';
import { MeasurementProfileForm } from '@/features/atelier/MeasurementProfileForm';
import { deleteMeasurementProfile } from '@/features/atelier/actions';
import { atelierDate } from '@/features/atelier/presentation';
import { display, LABELS, MEASUREMENT_CODES } from '@/lib/atelier/measurements';
import { isMarket } from '@/lib/vendure/channels';
import { getActiveCustomer } from '@/lib/vendure/customer';
import { ActiveMeasurementProfilesDocument } from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export const metadata: Metadata = { title: 'Your measurements', robots: { index: false, follow: false } };

export default async function MeasurementsPage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params;
  if (!isMarket(market)) notFound();
  const identity = await getActiveCustomer(market);
  const shell = (children: React.ReactNode) => <AccountShell market={market} title="Your measurements" current="/measurements" standfirst="Keep precise profiles ready for fittings, alterations and future commissions.">{children}</AccountShell>;
  if (!identity.reachable) return shell(<AccountUnavailable market={market} />);
  if (!identity.customer) return shell(<SignInRequired market={market} returnTo={`/${market}/account/measurements`} reason="Sign in to manage your measurement profiles." />);
  let profiles;
  try { profiles = (await vendureQuery(ActiveMeasurementProfilesDocument, {}, { market })).data.activeMeasurementProfiles; }
  catch { return shell(<AccountUnavailable market={market} />); }
  return shell(<>
    <section aria-labelledby="saved-profiles"><div className="shead"><div><span className="lab">Saved</span><h2 id="saved-profiles">Your profiles</h2></div></div>
      {!profiles.length ? <div className="empty"><h3>No measurements saved yet</h3><p>Create your first profile below. Leave a field blank if you are unsure.</p></div> : profiles.map(profile => {
        const byCode = new Map(profile.measurements.map(m => [m.code as string, m.millimetres]));
        return <article className="garment" key={profile.id}>
          <div className="garment-head"><h3>{profile.name} {profile.isDefault ? <span className="pill soon">Default</span> : null}</h3><span className="eta">{profile.source === 'atelier' ? 'Measured by the atelier' : 'Self-measured'} · Updated {atelierDate(profile.updatedAt)}</span></div>
          <dl className="snap-grid">{MEASUREMENT_CODES.map(code => <div key={code}><dt>{LABELS[code]}</dt><dd>{display(byCode.get(code) ?? null, 'millimetre')}</dd></div>)}</dl>
          {profile.source === 'customer' ? <details><summary>Edit profile</summary><MeasurementProfileForm market={market} profile={profile} /></details> : <p className="mnote">Contact the atelier to update measurements taken at a fitting.</p>}
          {profile.source === 'customer' ? <details><summary>Delete this profile</summary><p className="mnote">This removes the saved profile. Confirmed measurements on existing commissions remain.</p>
            <ActionForm action={deleteMeasurementProfile} fields={[]} hidden={{ market, id: profile.id }} submitLabel="Delete profile" pendingLabel="Deleting…" submitClassName="btn-q" />
          </details> : null}
        </article>;
      })}
    </section>
    <section className="section-gap" aria-labelledby="new-profile"><div className="shead"><div><span className="lab">New</span><h2 id="new-profile">Add a measurement profile</h2></div></div><MeasurementProfileForm market={market} /></section>
  </>);
}
