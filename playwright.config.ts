import { defineConfig, devices } from '@playwright/test'

const appUrl = process.env.MOOVX_E2E_APP_URL || 'http://127.0.0.1:3210'
const parsedAppUrl = new URL(appUrl)

if (!['127.0.0.1', 'localhost'].includes(parsedAppUrl.hostname)) {
  throw new Error('MOOVX_E2E_APP_URL must target localhost')
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: appUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev:webpack -- --hostname 127.0.0.1 --port 3210',
    url: appUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      MOOVX_E2E: '1',
      NEXT_PUBLIC_APP_URL: appUrl,
      NEXT_PUBLIC_SITE_URL: appUrl,
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-local-placeholder',
      SUPABASE_SERVICE_ROLE_KEY: 'e2e-local-placeholder',
      SMTP_USER: '',
      SMTP_PASS: '',
    },
  },
})
