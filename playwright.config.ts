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
  ...(process.env.CI ? { workers: 1 } : {}),
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
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VENDURE_SHOP_API_URL: 'http://localhost:3000/shop-api',
      VENDURE_CHANNEL_TOKEN_NG: 'e2e-ng',
      VENDURE_CHANNEL_TOKEN_INTERNATIONAL: 'e2e-int',
    },
  },
});
