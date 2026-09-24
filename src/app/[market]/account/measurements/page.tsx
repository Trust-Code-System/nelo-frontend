import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  AccountShell,
  AccountUnavailable,
  SignInRequired,
} from '@/features/account/AccountShell';
import { DeleteAddressButton } from '@/features/account/DeleteAddressButton';
import { deleteMeasurementProfile, saveMeasurementProfile } from '@/features/atelier/measurement-actions';
import { ProfileForm } from '@/features/atelier/ProfileForm';
import { display, fromMillimetres, LABELS, MEASUREMENT_CODES } from '@/lib/atelier/measurements';
import { isMarket, type Market } from '@/lib/vendure/channels';
import { vendureErrorCode } from '@/lib/vendure/errors';
import {
  ActiveMeasurementProfilesDocument,
  type MeasurementProfileFieldsFragment,
} from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export const metadata: Metadata = { title: 'Your measurements' };

const LAGOS = 'Africa/Lagos';

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: LAGOS }).format(
    new Date(iso),
  );
}

/**
 * Measurement profiles - the real Atelier Shop API.
 *
 * Profiles are reusable and any number may exist; exactly one is the default. A commission
 * does not read this page live - it holds its own confirmed snapshot - so editing here never
 * changes a garment already in production.
 *
 * A profile the atelier measured (`source: atelier`) is read-only here: the backend refuses
 * both edit and delete, so neither control is offered.
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

  let profiles: MeasurementProfileFieldsFragment[] = [];
  let signedIn = true;
  let reachable = true;

  try {
    const { data } = await vendureQuery(ActiveMeasurementProfilesDocument, {}, { market });
    profiles = data.activeMeasurementProfiles;
  } catch (error) {
    // Every Atelier operation refuses a guest with FORBIDDEN - there is no separate probe.
    if (vendureErrorCode(error) === 'FORBIDDEN') signedIn = false;
    else reachable = false;
  }

  if (!reachable) {
    return (
      <AccountShell market={market} title="Your measurements" showNav={false}>
        <AccountUnavailable market={market} />
      </AccountShell>
    );
  }

  if (!signedIn) {
    return (
      <AccountShell market={market} title="Your measurements" showNav={false}>
        <SignInRequired
          market={market}
          returnTo={`/${market}/account/measurements`}
          reason="Sign in to manage your measurement profiles."
        />
      </AccountShell>
    );
  }

  return (
    <AccountShell
      market={market}
      title="Your measurements"
      current="/measurements"
      meta={
        <span>
          {profiles.length} {profiles.length === 1 ? 'profile' : 'profiles'}
        </span>
      }
    >
      {profiles.length === 0 ? (
        <p className="lead">No measurement profiles yet. Add one below.</p>
      ) : (
        profiles.map((profile) => (
          <ProfileCard key={profile.id} market={market} profile={profile} />
        ))
      )}

      <p className="mnote">
        One profile is the default and is the one we reach for first. A commission keeps its
        own confirmed snapshot, so changing anything here will not alter a garment already
        being made.
      </p>

      <details className="addr-add" open={profiles.length === 0}>
        <summary>Add a profile</summary>
        <div className="body">
          <ProfileForm market={market} action={saveMeasurementProfile} submitLabel="Save profile" />
        </div>
      </details>
    </AccountShell>
  );
}

function ProfileCard({
  market,
  profile,
}: {
  market: Market;
  profile: MeasurementProfileFieldsFragment;
}) {
  const byCode = new Map(profile.measurements.map((m) => [m.code, m.millimetres]));
  const measuredCount = profile.measurements.length;
  const initial = Object.fromEntries(
    profile.measurements.map((m) => [m.code, fromMillimetres(m.millimetres, profile.preferredDisplayUnit)]),
  );

  return (
    <article className="garment">
      <div className="garment-head">
        <h2>
          {profile.name}
          {profile.isDefault ? (
            <span className="pill soon" style={{ marginLeft: 'var(--s3)' }}>
              Default
            </span>
          ) : null}
          {profile.source === 'atelier' ? (
            <span className="pill settled" style={{ marginLeft: 'var(--s3)' }}>
              Measured by the atelier
            </span>
          ) : null}
        </h2>
        <span className="eta">
          {measuredCount} of {MEASUREMENT_CODES.length} measured
          {profile.measuredAt ? ` · measured ${formatDate(profile.measuredAt)}` : ''} · last
          edited {formatDate(profile.updatedAt)}
        </span>
      </div>

      <dl className="snap-grid">
        {MEASUREMENT_CODES.map((code) => (
          <div key={code} className={!byCode.has(code) ? 'unset' : undefined}>
            <dt>{LABELS[code]}</dt>
            <dd>{display(byCode.get(code) ?? null, 'millimetre')}</dd>
          </div>
        ))}
      </dl>

      {profile.source === 'customer' ? (
        <div className="addr-acts">
          <details>
            <summary>Edit</summary>
            <div className="body">
              <ProfileForm
                market={market}
                action={saveMeasurementProfile}
                profileId={profile.id}
                name={profile.name}
                unit={profile.preferredDisplayUnit}
                initial={initial}
                isDefault={profile.isDefault}
                submitLabel="Save changes"
              />
            </div>
          </details>
          <DeleteAddressButton market={market} id={profile.id} action={deleteMeasurementProfile} />
        </div>
      ) : (
        <p className="mnote">
          This profile was measured at the atelier and can&apos;t be edited or removed here.
        </p>
      )}
    </article>
  );
}
