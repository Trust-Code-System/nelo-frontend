import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeNewsletter } from './actions';
import { IDLE } from '@/features/account/state';
function form(email: string, market = 'ng') { const result = new FormData(); result.set('email', email); result.set('market', market); return result; }
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); vi.stubEnv('NELO_NEWSLETTER_WEBHOOK_URL', 'https://provider.example.test/subscribe'); vi.stubEnv('NELO_NEWSLETTER_WEBHOOK_TOKEN', 'test-token'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('newsletter POST action', () => {
  it('rejects invalid addresses and markets without sending anything', async () => {
    expect((await subscribeNewsletter(IDLE, form('not-an-email'))).status).toBe('error');
    expect((await subscribeNewsletter(IDLE, form('a@example.test', 'other'))).status).toBe('error');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('places the address only in the POST body and waits for provider acknowledgement', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    expect((await subscribeNewsletter(IDLE, form('a@example.test'))).status).toBe('success');
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(String(url)).not.toContain('a@example.test');
    expect(options.method).toBe('POST'); expect(options.cache).toBe('no-store');
    expect(JSON.parse(options.body)).toEqual({ email: 'a@example.test', market: 'ng', consent: true, source: 'storefront-footer' });
  });
  it('does not claim a subscription when no provider is configured', async () => {
    vi.stubEnv('NELO_NEWSLETTER_WEBHOOK_URL', '');
    const result = await subscribeNewsletter(IDLE, form('a@example.test'));
    expect(result.status).toBe('error'); expect(result.message).toContain('has not been subscribed'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('never turns a provider failure into success', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    expect((await subscribeNewsletter(IDLE, form('a@example.test'))).status).toBe('error');
    fetchMock.mockRejectedValue(new Error('provider secret details'));
    expect((await subscribeNewsletter(IDLE, form('a@example.test'))).message).not.toContain('secret');
  });
});
