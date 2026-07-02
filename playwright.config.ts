import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'off',
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Sandbox ships Chromium 1194; pin executablePath so we don't need `playwright install`.
        launchOptions: { executablePath: '/chromium-1194/chrome-linux/chrome' },
      },
    },
  ],
  // Dev server is expected to already be running on :8080 in the sandbox.
});
