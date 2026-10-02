'use client';

import { useActionState, useId, useState } from 'react';
import { IDLE } from '@/features/account/state';
import { measurementForInput, GUIDANCE, LABELS, MEASUREMENT_CODES, validate, type MeasurementUnit } from '@/lib/atelier/measurements';
import type { AtelierProfileFragment } from '@/lib/vendure/generated/graphql';
import type { Market } from '@/lib/vendure/channels';
import { saveMeasurementProfile } from './actions';

export function MeasurementProfileForm({ market, profile }: { market: Market; profile?: AtelierProfileFragment }) {
  const scope = useId();
  const [state, action, pending] = useActionState(saveMeasurementProfile, IDLE);
  const [unit, setUnit] = useState<MeasurementUnit>(profile?.preferredDisplayUnit === 'centimetre' ? 'centimetre' : 'inch');
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(profile?.measurements.map(m => [m.code, measurementForInput(m.millimetres, unit)]) ?? []));
  function changeUnit(next: MeasurementUnit) {
    // Convert only valid values using exact decimal helpers. Invalid drafts remain visible.
    setValues(previous => Object.fromEntries(MEASUREMENT_CODES.map(code => {
      const value = previous[code] ?? '';
      const result = validate(code, value, unit);
      return [code, result.state === 'ok' || result.state === 'implausible' ? measurementForInput(result.millimetres, next) : value];
    })));
    setUnit(next);
  }
  if (!profile && state.status === 'success') return <div className="notice notice-ok atelier-feedback" role="status">
    <p>{state.message}</p><a className="btn-q" href={`/${market}/account/measurements`}>Add another profile</a>
  </div>;
  return <form action={action} className="aform" aria-busy={pending}>
    <input type="hidden" name="market" value={market} />
    {profile ? <input type="hidden" name="id" value={profile.id} /> : null}
    {state.status !== 'idle' ? <div className={`notice atelier-feedback ${state.status === 'success' ? 'notice-ok' : 'notice-error'}`} role={state.status === 'error' ? 'alert' : 'status'}>
      {state.message}{state.fieldErrors?.measurements ? <p>{state.fieldErrors.measurements}</p> : null}
    </div> : null}
    <div>
      <fieldset><legend>Profile</legend>
        <label className="f" htmlFor={`${scope}-name`}><span className="lab">Name this profile</span>
          <input id={`${scope}-name`} name="name" type="text" defaultValue={profile?.name ?? ''} maxLength={80} required aria-invalid={Boolean(state.fieldErrors?.name)} aria-describedby={state.fieldErrors?.name ? `${scope}-name-error` : undefined} />
        </label>
        {state.fieldErrors?.name ? <p className="field-error" id={`${scope}-name-error`}>{state.fieldErrors.name}</p> : null}
        <label className="f" htmlFor={`${scope}-unit`}><span className="lab">Measurement unit</span>
          <select id={`${scope}-unit`} name="preferredDisplayUnit" value={unit} onChange={event => changeUnit(event.target.value as MeasurementUnit)}><option value="inch">Inches</option><option value="centimetre">Centimetres</option></select>
        </label>
        <label className="check"><input type="checkbox" name="makeDefault" defaultChecked={profile?.isDefault ?? true} /><span>Use as my default profile</span></label>
      </fieldset>
      <div className="aside"><h2>Save for your next fitting</h2><p>Self-measured figures are a starting point. The atelier confirms your fit before cutting. Editing this profile does not change an existing commission.</p>
        <button className="btn submit" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save profile'}</button>
      </div>
    </div>
    <fieldset><legend>Measurements</legend>
      <div className="profile-measurements">
        {MEASUREMENT_CODES.map(code => {
          const value = values[code] ?? '';
          const result = validate(code, value, unit);
          const error = state.fieldErrors?.[code] ?? (result.state === 'invalid' || result.state === 'implausible' ? result.reason : undefined);
          return <div className="f" key={code}>
            <label htmlFor={`${scope}-${code}`}><span className="lab">{LABELS[code]} ({unit === 'inch' ? 'in' : 'cm'})</span></label>
            <input id={`${scope}-${code}`} name={code} type="text" inputMode="decimal" autoComplete="off" value={value} maxLength={20} onChange={event => setValues(previous => ({ ...previous, [code]: event.target.value }))} aria-invalid={Boolean(error)} aria-describedby={`${scope}-${code}-help`} />
            <p className={error ? 'field-error' : 'mnote'} id={`${scope}-${code}-help`}>{error ?? GUIDANCE[code]}</p>
          </div>;
        })}
      </div>
      <p className="mnote">Use decimals, such as 23.25. Leave uncertain fields blank. The atelier records measurements precisely to 0.01 mm.</p>
    </fieldset>
  </form>;
}
