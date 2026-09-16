import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against the production build served by the Node server,
 * on a dedicated port and data directory so they never touch real data.
 * Chrome/Chromium is the only supported browser (spec, grill decision G15).
 */
const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm serve',
    url: `${BASE_URL}/api/health`,
    env: {
      PORT: String(PORT),
      FEEDLY_DATA_DIR: '.playwright-cache/data',
      LOG_LEVEL: 'silent',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
