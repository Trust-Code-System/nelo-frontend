import { describe, expect, it } from 'vitest';
import { appointmentInput, measurementInput } from './validation';
import { measurementForInput, toMillimetres } from '@/lib/atelier/measurements';

function form(values: Record<string, string>) { const result = new FormData(); for (const [key, value] of Object.entries(values)) result.set(key, value); return result; }
const request = { purpose: 'consultation', context: 'bridal', locationMode: 'virtual', preferredDate: '2026-11-05', preferredTime: '14:30' };
const now = Date.parse('2026-10-02T00:00:00Z');
describe('appointment contract', () => {
  it('interprets the preferred time in Lagos independently of the browser timezone', () => {
    const result = appointmentInput(form(request), now);
    expect(result.input?.preferredAt).toBe('2026-11-05T14:30:00+01:00');
    expect(new Date(result.input!.preferredAt).toISOString()).toBe('2026-11-05T13:30:00.000Z');
  });
  it.each(['2026-02-31', '2026-10-01', '2028-01-01', 'nonsense'])('rejects invalid, past or out-of-window dates: %s', date => {
    expect(appointmentInput(form({ ...request, preferredDate: date }), now).errors?.preferredDate).toBeTruthy();
  });
  it('rejects unsupported context and oversized notes before submission', () => {
    expect(appointmentInput(form({ ...request, context: 'anything', notes: 'x'.repeat(1501) }), now).errors).toMatchObject({ context: expect.any(String), notes: expect.any(String) });
  });
  it('preserves occasion and piece as notes under the published API limit', () => {
    const result = appointmentInput(form({ ...request, piece: 'Ceremony gown', occasion: 'Wedding', neededBy: '2026-12-12', notes: 'Ivory silk' }), now);
    expect(result.input?.notes).toBe('Piece: Ceremony gown\nOccasion: Wedding\nNeeded by: 2026-12-12\nIvory silk');
  });
});
describe('measurement contract', () => {
  it('sends decimal strings in one explicit unit and omits blanks', () => {
    expect(measurementInput(form({ name: 'My fit', preferredDisplayUnit: 'inch', bust: '34.25', hip: '', makeDefault: 'on' })).input).toEqual({ name: 'My fit', preferredDisplayUnit: 'inch', values: [{ code: 'bust', value: '34.25' }], makeDefault: true });
  });
  it('rejects an empty profile, unsupported unit and fractional notation', () => {
    expect(measurementInput(form({ name: 'Fit', preferredDisplayUnit: 'inch' })).errors?.measurements).toBeTruthy();
    expect(measurementInput(form({ name: 'Fit', preferredDisplayUnit: 'mm', bust: '863' })).errors?.preferredDisplayUnit).toBeTruthy();
    expect(measurementInput(form({ name: 'Fit', preferredDisplayUnit: 'inch', bust: '34¼' })).errors?.bust).toBeTruthy();
  });
  it.each(['863.61', '590.55', '1701.09'])('preserves saved millimetres when an unchanged profile is resubmitted: %s', mm => {
    for (const unit of ['inch', 'centimetre'] as const) expect(toMillimetres(measurementForInput(mm, unit), unit)).toBe(mm);
  });
});
