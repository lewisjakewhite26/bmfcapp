import { defineConfig, devices } from '@playwright/test'

const e2ePort = process.env.CI ? 4173 : 5173
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile-ios-layout\.spec\.ts/,
    },
    {
      name: 'iphone-17-pro',
      testMatch: /mobile-ios-layout\.spec\.ts/,
      use: {
        browserName: 'chromium',
        ...devices['iPhone 17 Pro'],
      },
    },
    {
      name: 'iphone-17-pro-webkit',
      testMatch: /mobile-ios-layout\.spec\.ts/,
      use: { ...devices['iPhone 17 Pro'] },
    },
  ],
  webServer: {
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url: e2eBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      VITE_E2E: 'true',
    },
  },
})
