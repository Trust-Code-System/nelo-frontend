import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { StageTrack } from '@/components/StageTrack';
import { fixtureProject } from '@/features/atelier/fixtures';
import {
  ITEM_STAGE_LABELS,
  ITEM_STAGE_ORDER,
  PROJECT_STAGE_LABELS,
  PROJECT_STAGE_ORDER,
  type AtelierAppointment,
  type ChargeScheduleEntry,
} from '@/features/atelier/types';
import { display, LABELS } from '@/lib/atelier/measurements';
import { formatMoney, isMarket, type Market } from '@/lib/vendure/channels';

export const metadata: Metadata = { title: 'Your commission' };

/** Appointment times are transmitted with an offset and displayed in the atelier's zone. */
const LAGOS = 'Africa/Lagos';

function formatDateTime(iso: string | null): string {
  if (!iso) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: LAGOS,
  }).format(new Date(iso));
}

function formatDate(iso: string | null): string {
  if (!iso) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: LAGOS }).format(
    new Date(iso),
  );
}

const PURPOSE_LABEL = { consultation: 'Consultation', fitting: 'Fitting' } as const;
const LOCATION_LABEL = {
  inStore: 'At the atelier',
  customerLocation: 'At your address',
  virtual: 'Video call',
} as const;

/**
 * Garment tracker.
 *
 * Two levels on purpose: a BespokeProject stage above per-garment BespokeItem production
 * stages, because garments in one commission move at different speeds.
 *
 * What this screen does NOT do:
 *  - transition any stage (staff production control)
 *  - compute a balance, total or amount outstanding — the backend publishes the charge
 *    schedule and we render it
 *  - assume one project equals one Order
 *  - show a staff actor id or an override reason
 */
export default async function CommissionPage({
  params,
}: {
  params: Promise<{ market: string; reference: string }>;
}) {
  const { market, reference } = await params;
  if (!isMarket(market)) notFound();

  const project = fixtureProject(decodeURIComponent(reference));
  if (!project) notFound();

  const outstanding = project.chargeSchedule?.filter((entry) => !entry.isSettled) ?? [];

  return (
    <>
      <div className="fixture">
        <span className="lab">
          Fixture data — no Atelier Shop API exists yet. Nothing on this screen is live.
        </span>
      </div>
      <SiteHeader market={market} announcement="Your commission — Nelo Atelier" />

      <main className="shell">
        <div className="proj-head">
          <div>
            <span className="lab">
              {project.context === 'bridal' ? 'Bridal commission' : 'Bespoke commission'} ·{' '}
              {project.reference}
            </span>
            <h1>{project.items.length === 1 ? 'Your garment' : 'Your garments'}</h1>
          </div>
          <div className="proj-meta">
            <span>Opened {formatDate(project.createdAt)}</span>
            <span>
              {project.items.length} {project.items.length === 1 ? 'garment' : 'garments'}
            </span>
          </div>
        </div>

        <section style={{ paddingBlock: 'var(--s6)' }}>
          <StageTrack
            order={PROJECT_STAGE_ORDER}
            labels={PROJECT_STAGE_LABELS}
            current={project.stage}
            caption="Commission"
          />
        </section>

        <section className="section-gap">
          <div className="shead">
            <div>
              <span className="lab">Production</span>
              <h2>Each garment, separately</h2>
            </div>
          </div>

          {project.items.map((item) => (
            <article className="garment" key={item.id}>
              <div className="garment-head">
                <h2>{item.name}</h2>
                <span className="eta">Estimated ready {formatDate(item.estimatedReadyAt)}</span>
              </div>

              <StageTrack
                order={ITEM_STAGE_ORDER}
                labels={ITEM_STAGE_LABELS}
                current={item.stage}
              />

              <div className="snap">
                <span className="lab">
                  Cut to these measurements · confirmed {formatDate(item.confirmedAt)}
                </span>
                <dl className="snap-grid">
                  {item.confirmedMeasurements.map((measurement) => (
                    <div
                      key={measurement.code}
                      className={measurement.millimetres === null ? 'unset' : undefined}
                    >
                      <dt>{LABELS[measurement.code]}</dt>
                      <dd>{display(measurement.millimetres, 'millimetre')}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mnote">
                  This is a snapshot taken when the garment was confirmed. Updating your
                  measurement profile will not change a garment already in production — ask the
                  atelier if something needs to be altered.
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="section-gap">
          <div className="shead">
            <div>
              <span className="lab">Appointments</span>
              <h2>Fittings and consultations</h2>
            </div>
          </div>
          <AppointmentTable appointments={project.appointments} />
        </section>

        {project.chargeSchedule ? (
          <section className="section-gap">
            <div className="shead">
              <div>
                <span className="lab">Charges</span>
                <h2>Your payment schedule</h2>
              </div>
            </div>
            <ChargeTable schedule={project.chargeSchedule} market={market} />
            <p className="mnote">
              {outstanding.length === 0
                ? 'Nothing outstanding. This schedule is set by the atelier.'
                : `${outstanding.length} payment${outstanding.length === 1 ? '' : 's'} still to come. The atelier will invoice each one — amounts are set by them, not calculated here.`}
            </p>
            {project.relatedOrderCodes.length > 0 ? (
              <p className="mnote">
                Related orders:{' '}
                {project.relatedOrderCodes.map((code, index) => (
                  <span key={code}>
                    {index > 0 ? ' · ' : ''}
                    {code}
                  </span>
                ))}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Only backend-permitted actions are offered. There is no stage control here. */}
        <div className="acts-row">
          {project.permittedActions.includes('requestAppointment') ? (
            <a className="btn" href={`/${market}/atelier`}>
              Request a fitting
            </a>
          ) : null}
          {project.permittedActions.includes('messageAtelier') ? (
            <button className="btn-q" type="button" disabled>
              Message the atelier
            </button>
          ) : null}
          {project.permittedActions.includes('acceptProposal') ? (
            <button className="btn" type="button" disabled>
              Accept proposal
            </button>
          ) : null}
        </div>
        <p className="mnote">Actions are disabled until the Atelier API exists.</p>

      </main>

      <SiteFooter market={market} />
    </>
  );
}

function AppointmentTable({ appointments }: { appointments: AtelierAppointment[] }) {
  if (appointments.length === 0) {
    return <p className="mnote">No appointments yet.</p>;
  }
  return (
    <table className="rows">
      <thead>
        <tr>
          <th scope="col">When</th>
          <th scope="col">Purpose</th>
          <th scope="col">Where</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {appointments.map((appointment) => (
          <tr key={appointment.id}>
            <td data-label="When">{formatDateTime(appointment.scheduledAt)}</td>
            <td data-label="Purpose">{PURPOSE_LABEL[appointment.purpose]}</td>
            <td data-label="Where">{appointment.location ?? LOCATION_LABEL[appointment.locationMode]}</td>
            <td data-label="Status">
              <span
                className={`pill ${appointment.status === 'confirmed' ? 'soon' : 'settled'}`}
              >
                {appointment.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChargeTable({
  schedule,
  market,
}: {
  schedule: ChargeScheduleEntry[];
  market: Market;
}) {
  return (
    <table className="rows">
      <thead>
        <tr>
          <th scope="col">Charge</th>
          <th scope="col">Due</th>
          <th scope="col">Status</th>
          <th scope="col" className="num">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {schedule.map((entry) => (
          <tr key={entry.label}>
            <td data-label="Charge">
              {entry.label}
              {entry.orderCode ? (
                <span className="mnote" style={{ marginLeft: 'var(--s2)' }}>
                  {entry.orderCode}
                </span>
              ) : null}
            </td>
            <td data-label="Due">{formatDate(entry.dueAt)}</td>
            <td data-label="Status">
              <span className={`pill ${entry.isSettled ? 'settled' : 'due'}`}>
                {entry.isSettled ? 'Paid' : 'Due'}
              </span>
            </td>
            <td className="num" data-label="Amount">{formatMoney(entry.amountMinorUnits, market)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
