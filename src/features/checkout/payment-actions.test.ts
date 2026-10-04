import { beforeEach, expect, it, vi } from 'vitest';
const { query, redirect } = vi.hoisted(() => ({ query: vi.fn(), redirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/vendure/transport', () => ({ vendureQuery: query }));
vi.mock('@/lib/vendure/session', () => ({ writeSessionToken: vi.fn() }));
vi.mock('./payment-return', () => ({ writePaymentReturnHint: vi.fn() }));
import { startPaystackPayment } from './actions';
import { ActiveOrderForCheckoutDocument, InitializePaystackPaymentDocument, TransitionOrderToStateDocument } from '@/lib/vendure/generated/graphql';
import { IDLE } from '@/features/account/state';
const form = () => { const f = new FormData(); f.set('market', 'ng'); return f; };
const order = { id: 'order', code: 'TEST', state: 'ArrangingPayment' };
beforeEach(() => vi.resetAllMocks());
it('retries payment from ArrangingPayment without transitioning to the same state', async () => {
  query.mockResolvedValueOnce({ data: { activeOrder: order } }).mockResolvedValueOnce({ data: { activeOrder: order } })
    .mockResolvedValueOnce({ data: { initializePaystackPayment: { status: 'initializing', reference: 'nelo_test_reference123' } } });
  await startPaystackPayment(IDLE, form());
  expect(query.mock.calls.map(call => call[0])).toEqual([ActiveOrderForCheckoutDocument, ActiveOrderForCheckoutDocument, InitializePaystackPaymentDocument]);
  expect(query.mock.calls.some(call => call[0] === TransitionOrderToStateDocument)).toBe(false);
});
it('does not initialize payment for a settled order', async () => {
  query.mockResolvedValueOnce({ data: { activeOrder: { ...order, state: 'PaymentSettled' } } });
  const result = await startPaystackPayment(IDLE, form());
  expect(result.status).toBe('error'); expect(query).toHaveBeenCalledTimes(1);
});
