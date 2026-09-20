'use client';

import { useActionState, useId } from 'react';
import { IDLE, type FormState } from './state';

/**
 * The one form island the account and checkout surfaces share.
 *
 * Fields are passed as data rather than as children so this can stay a single small client
 * component: a render prop would not survive the Server/Client boundary, and one bespoke
 * island per form would ship the same thirty lines six times.
 *
 * It is a real `<form action={…}>` bound to a Server Action, so it posts and works before -
 * and if - the JavaScript for this island arrives. `useActionState` adds the pending state
 * and the returned message; it is not what makes the form function.
 */

export type FieldSpec = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'checkbox' | 'select';
  autoComplete?: string;
  required?: boolean;
  /** Shown under the input, always - guidance, not an error. */
  help?: string;
  defaultValue?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  /** Required for `select`. Values are sent verbatim, so the action still validates them. */
  options?: readonly { value: string; label: string }[];
  /** Puts this field in the same row as the next one. City and state belong side by side;
   *  a street address does not. */
  half?: boolean;
};

export function ActionForm({
  action,
  fields,
  hidden,
  submitLabel,
  pendingLabel,
  /** Rendered above the submit button: a "forgot your password?" link, a consent note. */
  footer,
  /** Replaces the form with the success message once the action reports one. Used where
   *  re-submitting makes no sense - registering, or asking for a reset link. */
  replaceOnSuccess = false,
  submitClassName = 'btn submit',
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  fields: readonly FieldSpec[];
  hidden?: Readonly<Record<string, string>>;
  submitLabel: string;
  pendingLabel?: string;
  footer?: React.ReactNode;
  replaceOnSuccess?: boolean;
  submitClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  // The address book renders this form several times on one page - once to add, once per
  // saved address to edit. Unprefixed ids would collide, and a duplicate id silently breaks
  // both the label association and every aria-describedby that points at it.
  const scope = useId();

  if (replaceOnSuccess && state.status === 'success') {
    return (
      <p className="notice notice-ok" role="status">
        {state.message}
      </p>
    );
  }

  // Consecutive `half` fields are grouped into one row. Anything else stands alone, so a
  // single trailing half-field simply takes the full width rather than leaving a gap.
  const rows: FieldSpec[][] = [];
  for (const field of fields) {
    const last = rows[rows.length - 1];
    if (field.half && last && last.length === 1 && last[0]?.half) last.push(field);
    else rows.push([field]);
  }

  return (
    <form action={formAction} noValidate>
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} readOnly />
      ))}

      {/* A failure that is not tied to one field. `role="alert"` so it is announced when it
          appears rather than only being visible. */}
      {state.status === 'error' && !state.fieldErrors ? (
        <p className="notice notice-error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === 'success' && !replaceOnSuccess ? (
        <p className="notice notice-ok" role="status">
          {state.message}
        </p>
      ) : null}

      {rows.map((row) =>
        row.length === 2 ? (
          <div className="fpair" key={row[0]?.name}>
            {row.map((field) => (
              <Field
                key={field.name}
                field={field}
                scope={scope}
                error={state.fieldErrors?.[field.name]}
              />
            ))}
          </div>
        ) : (
          <Field
            key={row[0]?.name}
            field={row[0] as FieldSpec}
            scope={scope}
            error={state.fieldErrors?.[(row[0] as FieldSpec).name]}
          />
        ),
      )}

      {footer}

      <button className={submitClassName} type="submit" disabled={pending}>
        {pending ? (pendingLabel ?? 'Working…') : submitLabel}
      </button>
    </form>
  );
}

function Field({
  field,
  scope,
  error,
}: {
  field: FieldSpec;
  scope: string;
  error?: string | undefined;
}) {
  const inputId = `${scope}-${field.name}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const describedBy = [field.help ? helpId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  if (field.type === 'checkbox') {
    return (
      <label className="check">
        <input type="checkbox" name={field.name} defaultChecked={field.defaultValue === 'on'} />
        <span>{field.label}</span>
      </label>
    );
  }

  // The help and error text sit OUTSIDE the label, not inside it. Nesting them made them
  // part of the control's accessible name - "Password At least 8 characters." - which is
  // both wrong for a screen reader and the reason an exact label lookup could not find the
  // field. They are associated through aria-describedby instead, which is what describes a
  // control without renaming it.
  return (
    <div className="f">
      <label htmlFor={inputId}>
        <span className="lab">{field.label}</span>
      </label>

      {field.type === 'select' ? (
        <select
          id={inputId}
          name={field.name}
          defaultValue={field.defaultValue}
          autoComplete={field.autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          name={field.name}
          type={field.type ?? 'text'}
          autoComplete={field.autoComplete}
          inputMode={field.inputMode}
          defaultValue={field.defaultValue}
          required={field.required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
        />
      )}

      {field.help ? (
        <span className="mnote" id={helpId}>
          {field.help}
        </span>
      ) : null}
      {error ? (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
