import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean((globalThis as { process?: { env?: { CI?: string } } }).process?.env?.CI);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  failOnFlakyTests: isCI,
  reporter: isCI ? 'html' : 'list',

  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    // CI serves prebuilt assets so cold Vite transforms cannot delay hydration.
    command: isCI
      ? 'yarn build && yarn preview --host 127.0.0.1 --port 5173'
      : 'yarn dev --host 127.0.0.1',
    timeout: 120_000,
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !isCI,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
