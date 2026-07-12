import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.e2e.local', quiet: true })

const appUrl = process.env.MOOVX_E2E_APP_URL || 'http://127.0.0.1:3210'
const parsedAppUrl = new URL(appUrl)
const supabaseUrl = process.env.API_URL || ''
const parsedSupabaseUrl = new URL(supabaseUrl)

if (![parsedAppUrl, parsedSupabaseUrl].every(url => ['127.0.0.1', 'localhost'].includes(url.hostname))) {
  throw new Error('E2E application and Supabase URLs must target localhost')
}
if (!process.env.ANON_KEY || !process.env.SERVICE_ROLE_KEY) throw new Error('Local Supabase keys are unavailable; run npm run supabase:local:reset')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: appUrl,
    trace: 'off',
    screenshot: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
