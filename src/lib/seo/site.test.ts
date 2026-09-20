import { afterEach, describe, expect, it, vi } from 'vitest';
import { siteUrl } from './site';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('siteUrl', () => {
  it('uses the Vercel production host when NELO_SITE_URL is present but empty', () => {
    vi.stubEnv('NELO_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'nelo-frontend.vercel.app');

    expect(siteUrl()).toBe('https://nelo-frontend.vercel.app');
  });

  it('prefers an explicitly configured canonical host and removes trailing slashes', () => {
    vi.stubEnv('NELO_SITE_URL', 'https://nelo.example///');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'nelo-frontend.vercel.app');

    expect(siteUrl()).toBe('https://nelo.example');
  });
});
