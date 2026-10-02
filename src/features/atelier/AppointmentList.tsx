import { ActionForm } from '@/features/account/ActionForm';
import type { CustomerAppointmentFragment } from '@/lib/vendure/generated/graphql';
import type { Market } from '@/lib/vendure/channels';
import { cancelAppointment } from './actions';
import { APPOINTMENT_STATUS_LABELS, atelierDate, LOCATION_LABELS, PURPOSE_LABELS } from './presentation';

export function AppointmentList({ appointments, market }: { appointments: readonly CustomerAppointmentFragment[]; market: Market }) {
  if (!appointments.length) return <p className="mnote">No appointments yet. Request a consultation to begin.</p>;
  return <ul className="atelier-appointments">{appointments.map(appointment => <li className="garment" key={appointment.id}>
    <div className="garment-head"><h3>{PURPOSE_LABELS[appointment.purpose]}</h3><span className="pill">{APPOINTMENT_STATUS_LABELS[appointment.status]}</span></div>
    <dl className="ordmeta"><div className="spec"><dt>{appointment.status === 'requested' ? 'Preferred time' : 'Time'}</dt><dd>{atelierDate(appointment.startsAt, true)} (Lagos, UTC+1)</dd></div>
      <div className="spec"><dt>Where</dt><dd>{appointment.locationDetails || LOCATION_LABELS[appointment.locationMode]}</dd></div></dl>
    {appointment.status === 'requested' ? <p className="mnote">The atelier has received your request and will confirm availability.</p> : null}
    {appointment.isCancellable ? <details><summary>Cancel this appointment</summary><p className="mnote">Cancel this request or confirmed appointment with the atelier.</p><ActionForm action={cancelAppointment} fields={[]} hidden={{ market, id: appointment.id }} submitLabel="Confirm cancellation" pendingLabel="Cancelling…" submitClassName="btn-q" /></details> : null}
  </li>)}</ul>;
}
