'use client';

import { useState } from 'react';
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
 * What the customer types is preserved verbatim and submitted as a decimal STRING with an
 * explicit unit. The millimetre figure shown beneath each row is a preview of what the
 * backend will store; it is never what gets sent, because backend normalisation stays
 * authoritative.
 *
 * Switching the display unit does NOT rewrite the typed value.
 */

type Row = { value: string; unit: MeasurementUnit };

const EMPTY: Row = { value: '', unit: 'inch' };

export type MeasurementInitial = Partial<Record<MeasurementCode, Row>>;

export function MeasurementFields({ initial }: { initial?: MeasurementInitial }) {
  const [rows, setRows] = useState<Record<MeasurementCode, Row>>(() =>
    Object.fromEntries(
      MEASUREMENT_CODES.map((code) => [code, { ...EMPTY, ...(initial?.[code] ?? {}) }]),
    ) as Record<MeasurementCode, Row>,
  );

  function update(code: MeasurementCode, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [code]: { ...prev[code], ...patch } }));
  }

  return (
    <>
      <div className="mset">
        {MEASUREMENT_CODES.map((code) => {
          const row = rows[code];
          const result = validate(code, row.value, row.unit);
          const describedBy = `${code}-out`;

          return (
            <div className="mm" key={code}>
              <label className="k" htmlFor={code}>
                {LABELS[code]}
              </label>
              <input
                id={code}
                name={code}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={row.value}
                placeholder="-"
                aria-describedby={describedBy}
                aria-invalid={result.state === 'invalid' || result.state === 'implausible'}
                onChange={(event) => update(code, { value: event.target.value })}
              />
              <select
                aria-label={`${LABELS[code]} unit`}
                value={row.unit}
                onChange={(event) =>
                  update(code, { unit: event.target.value as MeasurementUnit })
                }
              >
                <option value="inch">in</option>
                <option value="centimetre">cm</option>
              </select>

              <p className="mm-out" id={describedBy}>
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
              </p>
            </div>
          );
        })}
      </div>

      <p className="mnote">
        Enter quarter and eighth inches as decimals - 23.25, not 23¼. We record to 0.01 mm, so
        a quarter inch is stored as 6.35 mm and never rounded. Leave a field blank if you are
        not sure: blank means not confirmed, not zero.
      </p>
    </>
  );
}
