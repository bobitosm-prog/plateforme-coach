import { spawn } from 'node:child_process'
import { config as loadEnv } from 'dotenv'
import { createInterface } from 'node:readline'
import { readFileSync, writeFileSync } from 'node:fs'

loadEnv({ path: '.env.e2e.local', quiet: true })
const args = process.argv.slice(2)
const withStripe = args.includes('--stripe')
const specs = args.filter(value => value !== '--stripe')
const appUrl = 'http://127.0.0.1:3210'
const stripeUrl = 'http://127.0.0.1:55326/'
const supabaseUrl = process.env.API_URL || ''
const tsconfigPath = new URL('../tsconfig.json', import.meta.url)
const originalTsconfig = readFileSync(tsconfigPath, 'utf8')

for (const value of [appUrl, supabaseUrl, ...(withStripe ? [stripeUrl] : [])]) {
  if (!['127.0.0.1', 'localhost'].includes(new URL(value).hostname)) throw new Error('E2E services must target localhost')
}
if (!process.env.ANON_KEY || !process.env.SERVICE_ROLE_KEY) throw new Error('Run npm run supabase:local:reset first')

const children = []
const wait = child => new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 1)) })
function output(stream, target) {
  createInterface({ input: stream }).on('line', line => target.write(`${line.replace(/[A-Za-z0-9_-]{43}/g, '[REDACTED_TOKEN]')}\n`))
}
function start(command, commandArgs, env = process.env) {
  const child = spawn(command, commandArgs, { stdio: ['ignore', 'pipe', 'pipe'], detached: true, env })
  children.push(child); output(child.stdout, process.stdout); output(child.stderr, process.stderr); return child
}
async function ready(url) {
  for (let i = 0; i < 120; i += 1) { try { if ((await fetch(url)).ok) return } catch {}; await new Promise(r => setTimeout(r, 500)) }
  throw new Error(`Local service unavailable: ${new URL(url).origin}`)
}

let code = 1
try {
  if (withStripe) { start(process.execPath, ['scripts/fake-stripe-server.mjs']); await ready(`${stripeUrl}__requests`) }
  const env = {
    ...process.env, MOOVX_E2E: '1', NEXT_PUBLIC_APP_URL: appUrl, NEXT_PUBLIC_SITE_URL: appUrl,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SERVICE_ROLE_KEY, MOOVX_E2E_LOCAL_SMTP: '1', SMTP_HOST: '127.0.0.1', SMTP_PORT: '55325',
    ...(withStripe ? { STRIPE_E2E_BASE_URL: stripeUrl, STRIPE_SECRET_KEY: 'sk_test_local_only', NEXT_PUBLIC_PRICE_CLIENT_MONTHLY: 'price_local_client_monthly' } : {}),
  }
  start('./node_modules/.bin/next', ['dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3210'], env)
  await ready(appUrl)
  const playwright = start('./node_modules/.bin/playwright', ['test', ...(specs.length ? specs : ['e2e'])])
  code = await wait(playwright)
} finally {
  for (const child of children.reverse()) { try { process.kill(-child.pid, 'SIGTERM') } catch {} }
  await new Promise(resolve => setTimeout(resolve, 500))
  for (const child of children) { try { process.kill(-child.pid, 'SIGKILL') } catch {} }
  writeFileSync(tsconfigPath, originalTsconfig)
}
process.exitCode = code
