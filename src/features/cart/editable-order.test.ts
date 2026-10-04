import { beforeEach, expect, it, vi } from 'vitest';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/vendure/transport', () => ({ vendureQuery: query }));
vi.mock('@/lib/vendure/session', () => ({ writeSessionToken: vi.fn() }));
import { ensureEditableOrder } from './editable-order';
import { TransitionOrderToStateDocument } from '@/lib/vendure/generated/graphql';
beforeEach(() => vi.resetAllMocks());
it('leaves a new or already editable cart alone', async () => {
  for (const activeOrder of [null, { id: 'order', state: 'AddingItems' }]) {
    query.mockResolvedValueOnce({ data: { activeOrder } });
    await ensureEditableOrder('ng');
  }
  expect(query).toHaveBeenCalledTimes(2);
});
it('reopens an unpaid checkout and verifies the same order before editing', async () => {
  query.mockResolvedValueOnce({ data: { activeOrder: { id: 'order', state: 'ArrangingPayment' } } })
    .mockResolvedValueOnce({ data: { transitionOrderToState: { __typename: 'Order', id: 'order', state: 'AddingItems' } } })
    .mockResolvedValueOnce({ data: { activeOrder: { id: 'order', state: 'AddingItems' } } });
  await ensureEditableOrder('ng');
  expect(query).toHaveBeenNthCalledWith(2, TransitionOrderToStateDocument, { state: 'AddingItems' }, { market: 'ng' });
});
it('refuses a paid order without attempting a transition', async () => {
  query.mockResolvedValueOnce({ data: { activeOrder: { id: 'order', state: 'PaymentSettled' } } });
  await expect(ensureEditableOrder('ng')).rejects.toThrow('cannot be edited');
  expect(query).toHaveBeenCalledTimes(1);
});
it('refuses to edit if settlement wins the race', async () => {
  query.mockResolvedValueOnce({ data: { activeOrder: { id: 'order', state: 'ArrangingPayment' } } })
    .mockResolvedValueOnce({ data: { transitionOrderToState: { __typename: 'OrderStateTransitionError', message: 'Payment settled' } } })
    .mockResolvedValueOnce({ data: { activeOrder: null } });
  await expect(ensureEditableOrder('ng')).rejects.toThrow('Payment settled');
});
it('does not retry an uncertain transition', async () => {
  query.mockResolvedValueOnce({ data: { activeOrder: { id: 'order', state: 'ArrangingPayment' } } }).mockRejectedValueOnce(new Error('Disconnected'));
  await expect(ensureEditableOrder('ng')).rejects.toThrow('Disconnected');
  expect(query).toHaveBeenCalledTimes(2);
});
