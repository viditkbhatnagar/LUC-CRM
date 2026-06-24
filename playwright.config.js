import { defineConfig } from '@playwright/test';

// E2E against the PRODUCTION build (Express serves API + built SPA) on :4600,
// pointed at the seeded Atlas luc_crm_dev. Build the client + seed before running.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4600',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'NODE_ENV=production PORT=4600 node --env-file=server/.env server/src/index.js',
    url: 'http://localhost:4600/api/health',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
