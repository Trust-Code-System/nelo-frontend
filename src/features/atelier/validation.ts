import { MEASUREMENT_CODES, validate } from '@/lib/atelier/measurements';
import type { RequestAppointmentInput, UpsertMeasurementProfileInput } from '@/lib/vendure/generated/graphql';

export function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

type Validation<T> = { input: T; errors?: never } | { errors: Record<string, string>; input?: never };

export function appointmentInput(form: FormData, now = Date.now()): Validation<RequestAppointmentInput> {
  const purpose = text(form, 'purpose');
  const context = text(form, 'context');
  const locationMode = text(form, 'locationMode');
  const date = text(form, 'preferredDate');
  const time = text(form, 'preferredTime');
  const errors: Record<string, string> = {};
  if (purpose !== 'consultation' && purpose !== 'fitting') errors.purpose = 'Choose a consultation or fitting.';
  if (context !== 'bespoke' && context !== 'bridal' && context !== 'readyToWear') errors.context = 'Choose the type of garment.';
  if (locationMode !== 'inStore' && locationMode !== 'customerLocation' && locationMode !== 'virtual') errors.locationMode = 'Choose where to meet.';
  // Lagos has no daylight-saving offset. Date and time are interpreted here, never in
  // the browser's timezone. Reject calendar rollover such as 31 February.
  const preferredAt = `${date}T${time}:00+01:00`;
  const instant = new Date(preferredAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    || !Number.isFinite(instant.getTime())
    || new Date(instant.getTime() + 3_600_000).toISOString().slice(0, 16) !== `${date}T${time}`
    || instant.getTime() <= now || instant.getTime() > now + 366 * 86_400_000) {
    errors.preferredDate = 'Choose a future date and time within the next year (Lagos time).';
  }
  const notes = text(form, 'notes');
  const occasion = text(form, 'occasion');
  const neededBy = text(form, 'neededBy');
  const piece = text(form, 'piece');
  const colour = text(form, 'colour');
  const size = text(form, 'size');
  if (notes.length > 1500) errors.notes = 'Keep your notes to 1,500 characters.';
  if (occasion.length > 120) errors.occasion = 'Keep the occasion to 120 characters.';
  if (piece.length > 120) errors.piece = 'The selected piece is too long.';
  if (colour.length > 40 || size.length > 40) errors.piece = 'Please check the colour and size reference.';
  if (neededBy && (!/^\d{4}-\d{2}-\d{2}$/.test(neededBy)
    || !Number.isFinite(Date.parse(neededBy)) || new Date(neededBy).toISOString().slice(0, 10) !== neededBy)) {
    errors.neededBy = 'Enter a valid date for your occasion.';
  }
  if (Object.keys(errors).length) return { errors };
  // The published contract has one notes field; do not invent occasion/custom inputs.
  const combined = [piece && `Piece: ${piece}`, colour && `Colour: ${colour}`, size && `Size: ${size}`, occasion && `Occasion: ${occasion}`, neededBy && `Needed by: ${neededBy}`, notes].filter(Boolean).join('\n');
  return { input: {
    purpose: purpose as RequestAppointmentInput['purpose'],
    context: context as RequestAppointmentInput['context'],
    locationMode: locationMode as RequestAppointmentInput['locationMode'],
    preferredAt,
    notes: combined || null,
  } };
}

export function measurementInput(form: FormData): Validation<UpsertMeasurementProfileInput> {
  const name = text(form, 'name');
  const unit = text(form, 'preferredDisplayUnit');
  const id = text(form, 'id');
  const errors: Record<string, string> = {};
  if (!name || name.length > 80) errors.name = 'Name your profile using up to 80 characters.';
  if (unit !== 'inch' && unit !== 'centimetre') errors.preferredDisplayUnit = 'Choose inches or centimetres.';
  if (id.length > 100) errors.id = 'This profile could not be identified.';
  const values: UpsertMeasurementProfileInput['values'] = [];
  for (const code of MEASUREMENT_CODES) {
    const value = text(form, code);
    if (!value) continue;
    if (unit !== 'inch' && unit !== 'centimetre') continue;
    const result = validate(code, value, unit);
    if (result.state === 'invalid' || result.state === 'implausible') errors[code] = result.reason;
    else values.push({ code: code as UpsertMeasurementProfileInput['values'][number]['code'], value });
  }
  if (!values.length && !Object.keys(errors).length) errors.measurements = 'Enter at least one measurement. Leave uncertain measurements blank.';
  if (Object.keys(errors).length) return { errors };
  return { input: { ...(id ? { id } : {}), name,
    preferredDisplayUnit: unit as UpsertMeasurementProfileInput['preferredDisplayUnit'],
    values, makeDefault: form.get('makeDefault') === 'on' } };
}
