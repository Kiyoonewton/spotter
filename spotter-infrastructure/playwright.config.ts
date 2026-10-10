import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean((globalThis as { process?: { env?: { CI?: string } } }).process?.env?.CI);

const baseURL = process.env.E2E_BASE_URL;

if (!baseURL) {
  throw new Error(
    'E2E_BASE_URL is required — these tests target an already-running Docker stack through Nginx. ' +
      'Example: E2E_BASE_URL=http://<your-local-domain> yarn test:e2e',
  );
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? 'html' : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Intentionally no `webServer` block — these tests target the Docker
  // Compose stack, which must already be running. They never start Vite,
  // Express, or anything else themselves.

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
