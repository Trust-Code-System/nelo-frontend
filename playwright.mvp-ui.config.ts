import { defineConfig, devices } from '@playwright/test';

// Deliberate UI-only contract suite; it does not provide live Vendure/Paystack evidence.
export default defineConfig({
  testDir: './e2e', testMatch: 'mvp-ui.spec.ts', workers: 1, timeout: 60000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4311', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: 'node e2e/fixtures/atelier-shop-api.mjs', url: 'http://127.0.0.1:4321', reuseExistingServer: false },
    { command: 'npm run dev -- --port 4311', url: 'http://localhost:4311/ng/atelier', reuseExistingServer: false, timeout: 120000, env: {
      NELO_BUILD_DIR: '.next-mvp-ui',
      VENDURE_SHOP_API_URL: 'http://127.0.0.1:4321/shop-api', VENDURE_CHANNEL_TOKEN_NG: 'ui-ng', VENDURE_CHANNEL_TOKEN_INTERNATIONAL: 'ui-international', NELO_SITE_URL: 'http://localhost:4311', NELO_NEWSLETTER_WEBHOOK_URL: '',
    } },
  ],
});
