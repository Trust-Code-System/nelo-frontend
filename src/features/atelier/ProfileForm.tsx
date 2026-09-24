'use client';

import { useActionState } from 'react';
import { IDLE, type FormState } from '@/features/account/state';
import type { Market } from '@/lib/vendure/channels';
import type { MeasurementCode, MeasurementUnit } from '@/lib/atelier/measurements';
import { MeasurementFields, type MeasurementInitial } from './MeasurementFields';

/**
 * Create or edit one measurement profile. `profileId` present means edit-in-place; omitted
 * means create. Both post to the same Server Action - `upsertMeasurementProfile` is one
 * mutation either way.
 */
export function ProfileForm({
  market,
  action,
  profileId,
  name,
  unit,
  initial,
  isDefault = false,
  submitLabel,
}: {
  market: Market;
  action: (state: FormState, form: FormData) => Promise<FormState>;
  profileId?: string;
  name?: string;
  unit?: MeasurementUnit;
  initial?: MeasurementInitial;
  isDefault?: boolean;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);

  return (
    <form action={formAction}>
      <input type="hidden" name="market" value={market} readOnly />
      {profileId ? <input type="hidden" name="id" value={profileId} readOnly /> : null}

      {state.status === 'error' && !state.fieldErrors ? (
        <p className="notice notice-error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === 'success' ? (
        <p className="notice notice-ok" role="status">
          {state.message}
        </p>
      ) : null}

      <label className="f" htmlFor={`${profileId ?? 'new'}-name`}>
        <span className="lab">Name this profile</span>
        <input
          id={`${profileId ?? 'new'}-name`}
          name="name"
          type="text"
          defaultValue={name ?? ''}
          placeholder="My measurements"
          required
        />
      </label>
      {state.fieldErrors?.name ? <span className="field-error">{state.fieldErrors.name}</span> : null}

      <label className="opt" style={{ border: 'var(--rule)' }}>
        <input type="checkbox" name="makeDefault" defaultChecked={isDefault} />
        <span>
          <span className="t">Use this profile by default</span>
          <span className="d">
            We will cut to this one unless a commission confirms different figures.
          </span>
        </span>
      </label>

      <MeasurementFields
        {...(initial ? { initial } : {})}
        {...(unit ? { initialUnit: unit } : {})}
        {...(state.fieldErrors
          ? { serverErrors: state.fieldErrors as Partial<Record<MeasurementCode, string>> }
          : {})}
      />

      <button className="btn submit" type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
