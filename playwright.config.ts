import { defineConfig, devices } from '@playwright/test';

// Next 16 refuses a second dev server in the same directory, so tests reuse the one the
// developer already has running. CI has none, so Playwright starts it there.
const PORT = Number(process.env.E2E_PORT ?? 4310);
const baseURL = `http://localhost:${PORT}`;

/**
 * Critical journeys.
 *
 * These run against a real server. Where a journey depends on the Vendure Shop API it is
 * not written yet — a test that asserts fixture behaviour and calls it a checkout test
 * would be worse than no test at all.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /**
   * CI runs one worker against a production build. Locally the suite runs against the DEV
   * server, which compiles each route on first request — so six workers all asking for a
   * route nobody has opened yet routinely blow a 30-second navigation timeout. Three workers
   * and a longer per-test budget is the difference between a flaky local gate and a slow one,
   * and a flaky gate is worse.
   *
   * It also keeps concurrent order writes down to three. The harness is SQLite, which has one
   * writer; that is a property of the harness, not of the storefront.
   */
  workers: process.env.CI ? 1 : 3,
  timeout: process.env.CI ? 30_000 : 60_000,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // CI exercises the production build; locally the dev server is what you already have.
    command: process.env.CI
      ? `npm run build && npm run start -- --port ${PORT}`
      : `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VENDURE_SHOP_API_URL: 'http://localhost:3000/shop-api',
      // Locally these are overridden by .env.local, which holds the harness's real tokens.
      // In CI there is no Vendure at all, so the value only has to exist.
      VENDURE_CHANNEL_TOKEN_NG: process.env.VENDURE_CHANNEL_TOKEN_NG ?? 'e2e-ng',
      VENDURE_CHANNEL_TOKEN_INTERNATIONAL:
        process.env.VENDURE_CHANNEL_TOKEN_INTERNATIONAL ?? 'e2e-int',
      NELO_SITE_URL: baseURL,
      // The checkout journey has to reach a payment handler to be a checkout journey. This
      // is Vendure's development handler and takes no money; the Paystack path does not
      // exist yet. See src/features/checkout/config.ts.
      NELO_DEV_PAYMENT: 'enabled',
    },
  },
});
