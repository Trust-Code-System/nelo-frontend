'use client';

import { useId, useState } from 'react';
import {
  GUIDANCE,
  LABELS,
  MEASUREMENT_CODES,
  validate,
  type MeasurementCode,
  type MeasurementUnit,
} from '@/lib/atelier/measurements';

/**
 * Measurement intake. A client island - the rest of the page is server-rendered.
 *
 * One unit for the whole profile, per `preferredDisplayUnit` on `UpsertMeasurementProfileInput`
 * - the backend converts every value with it. What the customer types is preserved verbatim
 * and submitted as a decimal STRING; the millimetre figure shown beneath each row is a preview
 * of what the backend will store, never what gets sent, because backend normalisation stays
 * authoritative.
 *
 * Switching the display unit does NOT rewrite a typed value - the unit and the values are
 * independent state.
 */

export type MeasurementInitial = Partial<Record<MeasurementCode, string>>;

export function MeasurementFields({
  initial,
  initialUnit = 'inch',
  serverErrors,
}: {
  initial?: MeasurementInitial;
  initialUnit?: MeasurementUnit;
  /** Field errors from a rejected submission (`MeasurementRangeError` / `MeasurementFormatError`).
   *  Authoritative over the local plausibility preview for the code they name. */
  serverErrors?: Partial<Record<MeasurementCode, string>>;
}) {
  const [unit, setUnit] = useState<MeasurementUnit>(initialUnit);
  const [values, setValues] = useState<Record<MeasurementCode, string>>(
    () =>
      Object.fromEntries(
        MEASUREMENT_CODES.map((code) => [code, initial?.[code] ?? '']),
      ) as Record<MeasurementCode, string>,
  );
  const scope = useId();

  return (
    <>
      <label className="f" htmlFor={`${scope}-unit`}>
        <span className="lab">Unit</span>
        <select
          id={`${scope}-unit`}
          name="preferredDisplayUnit"
          value={unit}
          onChange={(event) => setUnit(event.target.value as MeasurementUnit)}
        >
          <option value="inch">Inches</option>
          <option value="centimetre">Centimetres</option>
        </select>
      </label>

      <div className="mset">
        {MEASUREMENT_CODES.map((code) => {
          const value = values[code] ?? '';
          const result = validate(code, value, unit);
          const serverError = serverErrors?.[code];
          const inputId = `${scope}-${code}`;
          const describedBy = `${inputId}-out`;

          return (
            <div className="mm" key={code}>
              <label className="k" htmlFor={inputId}>
                {LABELS[code]}
              </label>
              <input
                id={inputId}
                name={code}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={value}
                placeholder="-"
                aria-describedby={describedBy}
                aria-invalid={
                  Boolean(serverError) ||
                  result.state === 'invalid' ||
                  result.state === 'implausible'
                }
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [code]: event.target.value }))
                }
              />

              <p className="mm-out" id={describedBy}>
                {serverError ? (
                  <span className="warn">{serverError}</span>
                ) : (
                  <>
                    {result.state === 'empty' && <span className="mmv">{GUIDANCE[code]}</span>}
                    {result.state === 'invalid' && <span className="warn">{result.reason}</span>}
                    {result.state === 'implausible' && (
                      <>
                        <span className="warn">{result.reason}</span>
                        <span className="mmv">{result.millimetres} mm</span>
                      </>
                    )}
                    {result.state === 'ok' && (
                      <>
                        <span className="mmv">{GUIDANCE[code]}</span>
                        <span className="mmv">{result.millimetres} mm</span>
                      </>
                    )}
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mnote">
        Enter quarter and eighth inches as decimals - 23.25, not 23¼. We record to 0.01 mm, so
        a quarter inch is stored as 6.35 mm and never rounded. Leave a field blank if you are
        not sure: blank means not measured, not zero.
      </p>
    </>
  );
}
