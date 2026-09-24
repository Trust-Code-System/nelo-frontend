'use client';

import { useActionState } from 'react';
import { requestAppointment } from './atelier-actions';
import { CoutureDatePicker } from './CoutureDatePicker';
import { IDLE } from '@/features/account/state';
import type { Market } from '@/lib/vendure/channels';

/**
 * The consultation request form - a real Server Action, gated on sign-in by the page above.
 *
 * `RequestAppointmentInput` carries no measurements and no project reference: booking is a
 * request, not a reservation, and everything about the piece the customer came to discuss goes
 * into `notes` (2,000 characters), which is the only freeform field the backend accepts.
 */
export function AtelierRequestForm({
  market,
  requestedPiece,
  requestedColour,
  requestedSize,
}: {
  market: Market;
  requestedPiece: string;
  requestedColour: string;
  requestedSize: string;
}) {
  const [state, formAction, pending] = useActionState(requestAppointment, IDLE);

  if (state.status === 'success') {
    return (
      <div className="aside" id="commission-form">
        <span className="lab">Sent</span>
        <h2>Thank you</h2>
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form id="commission-form" action={formAction} aria-describedby="not-live">
      <input type="hidden" name="market" value={market} readOnly />
      <div>
        <fieldset>
          <legend>What are you commissioning</legend>
          <div className="opts">
            <label className="opt">
              <input type="radio" name="context" value="bespoke" defaultChecked={!requestedPiece} />
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
              <input type="radio" name="context" value="readyToWear" defaultChecked={Boolean(requestedPiece)} />
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
              <option value="inStore">Lagos atelier - Victoria Island</option>
              <option value="customerLocation">My address</option>
              <option value="virtual">Video call</option>
            </select>
          </label>

          <CoutureDatePicker id="preferred" name="preferredDate" label="Preferred date" />
          <label className="f" htmlFor="preferredTime">
            <span className="lab">Preferred time</span>
            <input id="preferredTime" name="preferredTime" type="time" defaultValue="11:00" required />
          </label>
          {state.fieldErrors?.preferredAt ? (
            <span className="field-error">{state.fieldErrors.preferredAt}</span>
          ) : null}
          <p className="mnote">
            All times West Africa Standard Time (Africa/Lagos, UTC+1). This is a request, not a
            reservation - the atelier confirms or proposes a different time.
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
            <input id="occasion" name="occasion" type="text" placeholder="Reception, gala, wedding…" />
          </label>
          <CoutureDatePicker id="neededBy" name="neededBy" label="Date you need it" />
          <label className="f" htmlFor="notes">
            <span className="lab">Anything else</span>
            <textarea
              id="notes"
              name="notes"
              rows={5}
              maxLength={2000}
              placeholder="References, fabrics, colours, silhouettes you have in mind."
            />
          </label>
        </fieldset>
      </div>

      <div>
        <div className="aside">
          <span className="lab">Next</span>
          <h2>We reply within two working days</h2>
          <p>
            You will receive a proposed schedule and confirmation of your time and location.
            Nothing is charged, and no date is held, until the atelier confirms it.
          </p>

          {state.status === 'error' && !state.fieldErrors ? (
            <p className="notice notice-error" role="alert">
              {state.message}
            </p>
          ) : null}

          <button className="btn submit" type="submit" disabled={pending}>
            {pending ? 'Sending…' : 'Request a consultation'}
          </button>
          <p className="mnote" id="not-live" style={{ textAlign: 'center' }}>
            Requesting does not reserve a slot - the atelier confirms or proposes another time.
          </p>
        </div>
      </div>
    </form>
  );
}
