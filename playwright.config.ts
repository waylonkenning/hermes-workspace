import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3002',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'PORT=3002 pnpm dev',
    url: 'http://localhost:3002',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
