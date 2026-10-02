import { beforeEach, describe, expect, it, vi } from 'vitest';
const { query, identity, revalidate, session } = vi.hoisted(() => ({ query: vi.fn(), identity: vi.fn(), revalidate: vi.fn(), session: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: revalidate }));
vi.mock('@/lib/vendure/transport', () => ({ vendureQuery: query }));
vi.mock('@/lib/vendure/customer', () => ({ getActiveCustomer: identity }));
vi.mock('@/lib/vendure/session', () => ({ writeSessionToken: session }));
import { cancelAppointment, requestAppointment, saveMeasurementProfile } from './actions';
import { IDLE } from '@/features/account/state';
function form(values: Record<string, string>) { const result = new FormData(); for (const [key, value] of Object.entries(values)) result.set(key, value); return result; }
const request = () => ({ market: 'ng', purpose: 'consultation', context: 'bridal', locationMode: 'virtual', preferredDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), preferredTime: '14:30' });
beforeEach(() => { vi.clearAllMocks(); identity.mockResolvedValue({ reachable: true, customer: { id: 'customer' } }); });
describe('Atelier server boundary', () => {
  it('checks authentication even when the form is bypassed', async () => {
    identity.mockResolvedValue({ reachable: true, customer: null });
    expect((await requestAppointment(IDLE, form(request()))).message).toContain('Sign in');
    expect(query).not.toHaveBeenCalled();
  });
  it('does not send an unknown channel or an unavailable account to a mutation', async () => {
    await requestAppointment(IDLE, form({ ...request(), market: 'other' }));
    identity.mockResolvedValue({ reachable: false, customer: null });
    await requestAppointment(IDLE, form(request()));
    expect(query).not.toHaveBeenCalled();
  });
  it('reports an open-request limit as failure rather than a booked slot', async () => {
    query.mockResolvedValue({ data: { requestAppointment: { __typename: 'AppointmentRequestLimitError', message: 'Three requests are awaiting confirmation' } } });
    expect((await requestAppointment(IDLE, form(request()))).status).toBe('error');
    expect(revalidate).not.toHaveBeenCalled();
  });
  it('preserves the session and displays request-only success', async () => {
    query.mockResolvedValue({ authToken: 'rotated', data: { requestAppointment: { __typename: 'AtelierAppointment', id: 'a', status: 'requested' } } });
    const result = await requestAppointment(IDLE, form(request()));
    expect(result.status).toBe('success'); expect(result.message).toContain('awaiting confirmation');
    expect(session).toHaveBeenCalledWith('rotated');
    expect(query.mock.calls[0]?.[2]).toEqual({ market: 'ng' });
  });
  it('does not retry a lost appointment response and asks the customer to check appointments', async () => {
    query.mockRejectedValue(new Error('internal sensitive error'));
    const result = await requestAppointment(IDLE, form(request()));
    expect(query).toHaveBeenCalledTimes(1); expect(result.message).toContain('Check Account');
    expect(result.message).not.toContain('internal');
  });
  it('associates backend measurement validation with its field', async () => {
    query.mockResolvedValue({ data: { upsertMeasurementProfile: { __typename: 'MeasurementRangeError', code: 'bust', message: 'Please check bust' } } });
    expect((await saveMeasurementProfile(IDLE, form({ market: 'ng', name: 'Fit', preferredDisplayUnit: 'inch', bust: '34.25' }))).fieldErrors).toEqual({ bust: 'Please check bust' });
    expect(revalidate).not.toHaveBeenCalled();
  });
  it('does not claim a cancellation unless the backend returns cancelled', async () => {
    query.mockResolvedValue({ data: { cancelAppointment: { status: 'confirmed' } } });
    expect((await cancelAppointment(IDLE, form({ market: 'ng', id: 'a' }))).status).toBe('error');
    expect(revalidate).not.toHaveBeenCalled();
  });
});
