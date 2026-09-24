import { beforeEach, describe, expect, it, vi } from 'vitest';
const { query, revalidate } = vi.hoisted(() => ({ query: vi.fn(), revalidate: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: revalidate }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/vendure/transport', () => ({ vendureQuery: query }));
vi.mock('@/lib/vendure/session', () => ({ clearSessionToken: vi.fn(), readSessionToken: vi.fn(), writeSessionToken: vi.fn() }));
import { requestEmailChange, confirmEmailChange } from './actions';
import { IDLE } from './state';
function form(values: Record<string, string>) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; }
beforeEach(() => vi.clearAllMocks());
describe('email change actions', () => {
  it('rejects an unknown market before calling the backend', async () => {
    const result = await requestEmailChange(IDLE, form({ market: 'other', email: 'new@example.test', password: 'password' }));
    expect(result.status).toBe('error'); expect(query).not.toHaveBeenCalled();
  });
  it('requires the current password', async () => {
    const result = await requestEmailChange(IDLE, form({ market: 'ng', email: 'new@example.test' }));
    expect(result.fieldErrors?.password).toBeTruthy(); expect(query).not.toHaveBeenCalled();
  });
  it('preserves password whitespace and waits for email confirmation', async () => {
    query.mockResolvedValue({ data: { requestUpdateCustomerEmailAddress: { __typename: 'Success', success: true } } });
    const result = await requestEmailChange(IDLE, form({ market: 'international', email: 'new@example.test', password: ' password ' }));
    expect(query.mock.calls[0]?.[1]).toEqual({ newEmailAddress: 'new@example.test', password: ' password ' });
    expect(query.mock.calls[0]?.[2]).toEqual({ market: 'international' });
    expect(result.status).toBe('success'); expect(revalidate).not.toHaveBeenCalled();
  });
  it('shows a union error instead of reporting that mail was sent', async () => {
    query.mockResolvedValue({ data: { requestUpdateCustomerEmailAddress: { __typename: 'InvalidCredentialsError', message: 'Invalid credentials' } } });
    expect((await requestEmailChange(IDLE, form({ market: 'ng', email: 'new@example.test', password: 'wrong' }))).status).toBe('error');
  });
  it('rejects a missing token without a mutation', async () => {
    expect((await confirmEmailChange(IDLE, form({ market: 'ng' }))).status).toBe('error');
    expect(query).not.toHaveBeenCalled();
  });
  it('does not revalidate after an expired token', async () => {
    query.mockResolvedValue({ data: { updateCustomerEmailAddress: { __typename: 'IdentifierChangeTokenExpiredError', message: 'Expired' } } });
    expect((await confirmEmailChange(IDLE, form({ market: 'ng', token: 'expired' }))).status).toBe('error');
    expect(revalidate).not.toHaveBeenCalled();
  });
  it('refreshes account data after successful confirmation', async () => {
    query.mockResolvedValue({ data: { updateCustomerEmailAddress: { __typename: 'Success', success: true } } });
    expect((await confirmEmailChange(IDLE, form({ market: 'ng', token: 'valid' }))).status).toBe('success');
    expect(revalidate).toHaveBeenCalledWith('/ng', 'layout');
  });
});
