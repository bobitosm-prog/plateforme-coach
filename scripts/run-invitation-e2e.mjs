import { spawn } from 'node:child_process'
import { config as loadEnv } from 'dotenv'
import { createInterface } from 'node:readline'
import { readFileSync, writeFileSync } from 'node:fs'

loadEnv({ path: '.env.e2e.local', quiet: true })

const appUrl = 'http://127.0.0.1:3210'
const tsconfigPath = new URL('../tsconfig.json', import.meta.url)
const originalTsconfig = readFileSync(tsconfigPath, 'utf8')
const supabaseUrl = process.env.API_URL || ''
for (const value of [appUrl, supabaseUrl]) {
  const url = new URL(value)
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('E2E services must target localhost')
}
if (!process.env.ANON_KEY || !process.env.SERVICE_ROLE_KEY) throw new Error('Run npm run supabase:local:reset first')

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', code => resolve(code ?? 1))
  })
}

function forwardRedacted(stream, target) {
  const lines = createInterface({ input: stream })
  lines.on('line', line => target.write(`${line.replace(/[A-Za-z0-9_-]{43}/g, '[REDACTED_TOKEN]')}\n`))
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(appUrl)
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error('Local Next.js E2E server did not become ready')
}

const server = spawn('./node_modules/.bin/next', ['dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3210'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
  env: {
    ...process.env,
    MOOVX_E2E: '1',
    NEXT_PUBLIC_APP_URL: appUrl,
    NEXT_PUBLIC_SITE_URL: appUrl,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SERVICE_ROLE_KEY,
    MOOVX_E2E_LOCAL_SMTP: '1',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '55325',
  },
})
forwardRedacted(server.stdout, process.stdout)
forwardRedacted(server.stderr, process.stderr)

let exitCode = 1
try {
  await waitForServer()
  const playwright = spawn('./node_modules/.bin/playwright', ['test', 'e2e/coach-invitation.spec.ts'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  })
  forwardRedacted(playwright.stdout, process.stdout)
  forwardRedacted(playwright.stderr, process.stderr)
  exitCode = await waitForExit(playwright)
} finally {
  try { process.kill(-server.pid, 'SIGTERM') } catch {}
  await Promise.race([waitForExit(server), new Promise(resolve => setTimeout(resolve, 5_000))])
  try { process.kill(-server.pid, 'SIGKILL') } catch {}
  writeFileSync(tsconfigPath, originalTsconfig)
}

process.exitCode = exitCode
