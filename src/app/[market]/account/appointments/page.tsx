import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AccountShell,
  AccountUnavailable,
  SignInRequired,
} from '@/features/account/AccountShell';
import { cancelAppointment } from '@/features/atelier/atelier-actions';
import { CancelAppointmentButton } from '@/features/atelier/CancelAppointmentButton';
import { isMarket } from '@/lib/vendure/channels';
import { vendureErrorCode } from '@/lib/vendure/errors';
import {
  AtelierAppointmentsDocument,
  type AtelierAppointmentFieldsFragment,
} from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export const metadata: Metadata = { title: 'Your appointments' };

const PAGE_SIZE = 20;
const LAGOS = 'Africa/Lagos';

const PURPOSE_LABEL = { consultation: 'Consultation', fitting: 'Fitting' } as const;
const LOCATION_LABEL = {
  inStore: 'At the atelier',
  customerLocation: 'At your address',
  virtual: 'Video call',
} as const;
const STATUS_LABEL = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  noShow: 'No-show',
} as const;

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: LAGOS,
  }).format(new Date(iso));
}

/**
 * Appointments - requests, upcoming and past, with cancel.
 *
 * `isCancellable` is the backend's own decision, published on every row; it is never inferred
 * from the date on the client. A confirmed appointment shows the atelier's agreed time and
 * location; a requested one shows the customer's own preferred slot, because that is all that
 * exists yet - requesting does not reserve anything.
 */
export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  const raw = await searchParams;
  const pageRaw = Number(Array.isArray(raw.page) ? raw.page[0] : raw.page);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw < 1000 ? pageRaw : 1;

  let items: AtelierAppointmentFieldsFragment[] = [];
  let totalItems = 0;
  let signedIn = true;
  let reachable = true;

  try {
    const { data } = await vendureQuery(
      AtelierAppointmentsDocument,
      { options: { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE } },
      { market },
    );
    items = data.atelierAppointments.items;
    totalItems = data.atelierAppointments.totalItems;
  } catch (error) {
    if (vendureErrorCode(error) === 'FORBIDDEN') signedIn = false;
    else reachable = false;
  }

  if (!reachable) {
    return (
      <AccountShell market={market} title="Your appointments" showNav={false}>
        <AccountUnavailable market={market} />
      </AccountShell>
    );
  }

  if (!signedIn) {
    return (
      <AccountShell market={market} title="Your appointments" showNav={false}>
        <SignInRequired
          market={market}
          returnTo={`/${market}/account/appointments`}
          reason="Sign in to see your consultations and fittings."
        />
      </AccountShell>
    );
  }

  const lastPage = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  return (
    <AccountShell
      market={market}
      title="Your appointments"
      current="/appointments"
      meta={
        <span>
          {totalItems} {totalItems === 1 ? 'appointment' : 'appointments'}
        </span>
      }
    >
      {items.length === 0 ? (
        <div className="empty">
          <span className="lab">Nothing yet</span>
          <h2>No appointments requested</h2>
          <p>Request a consultation or fitting and it will appear here.</p>
          <Link className="btn-q" href={`/${market}/atelier`}>
            Request a consultation
          </Link>
        </div>
      ) : (
        <>
          <table className="rows">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Purpose</th>
                <th scope="col">Where</th>
                <th scope="col">Status</th>
                <th scope="col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((appointment) => (
                <tr key={appointment.id}>
                  <td data-label="When">{formatDateTime(appointment.startsAt)}</td>
                  <td data-label="Purpose">{PURPOSE_LABEL[appointment.purpose]}</td>
                  <td data-label="Where">
                    {appointment.locationDetails ?? LOCATION_LABEL[appointment.locationMode]}
                  </td>
                  <td data-label="Status">
                    <span
                      className={`pill ${appointment.status === 'confirmed' ? 'soon' : appointment.status === 'cancelled' ? 'due' : 'settled'}`}
                    >
                      {STATUS_LABEL[appointment.status]}
                    </span>
                  </td>
                  <td data-label="Actions">
                    {appointment.isCancellable ? (
                      <CancelAppointmentButton market={market} id={appointment.id} action={cancelAppointment} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mnote">
            Times are shown in West Africa Standard Time (Africa/Lagos, UTC+1). While a request
            is awaiting confirmation, the time shown is your preferred slot, not a reservation.
          </p>

          {lastPage > 1 ? (
            <nav className="pager" aria-label="Pages">
              {page > 1 ? (
                <Link href={`/${market}/account/appointments?page=${page - 1}`}>← Newer</Link>
              ) : (
                <span aria-disabled="true">← Newer</span>
              )}
              <span className="num">
                Page {page} of {lastPage}
              </span>
              {page < lastPage ? (
                <Link href={`/${market}/account/appointments?page=${page + 1}`}>Older →</Link>
              ) : (
                <span aria-disabled="true">Older →</span>
              )}
            </nav>
          ) : null}
        </>
      )}
    </AccountShell>
  );
}
