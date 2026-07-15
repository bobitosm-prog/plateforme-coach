import { spawn, spawnSync } from 'node:child_process'
import { config as loadEnv } from 'dotenv'
import { createInterface } from 'node:readline'
import { readFileSync, writeFileSync } from 'node:fs'
import { assertLocalE2eUrl, redactE2eOutput } from './e2e-local-contract.mjs'

const contract = spawnSync(process.execPath, ['scripts/supabase-local.mjs', 'ensure'], { stdio: 'inherit' })
if (contract.status !== 0) throw new Error('Canonical local Supabase contract is unavailable; run npm run supabase:local:reset')
loadEnv({ path: '.env.e2e.local', quiet: true, override: true })
const args = process.argv.slice(2)
const withStripe = args.includes('--stripe')
const withPush = args.includes('--push')
const withAnthropic = args.includes('--anthropic')
const specs = args.filter(value => !['--stripe', '--push', '--anthropic'].includes(value))
const appUrl = 'http://127.0.0.1:3210'
const stripeUrl = 'http://127.0.0.1:55326/'
const pushControlUrl = 'http://127.0.0.1:55329/'
const anthropicUrl = 'http://127.0.0.1:55330/'
const supabaseUrl = process.env.API_URL || ''
const tsconfigPath = new URL('../tsconfig.json', import.meta.url)
const originalTsconfig = readFileSync(tsconfigPath, 'utf8')

for (const value of [appUrl, supabaseUrl, ...(withStripe ? [stripeUrl] : []), ...(withPush ? [pushControlUrl] : []), ...(withAnthropic ? [anthropicUrl] : [])]) assertLocalE2eUrl(value)
if (!process.env.ANON_KEY || !process.env.SERVICE_ROLE_KEY) throw new Error('Run npm run supabase:local:reset first')

const children = []
const wait = child => new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 1)) })
function output(stream, target) {
  createInterface({ input: stream }).on('line', line => target.write(`${redactE2eOutput(line)}\n`))
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
  if (withAnthropic) { start(process.execPath, ['scripts/fake-anthropic-server.mjs']); await ready(`${anthropicUrl}__requests`) }
  let vapid = null
  if (withPush) {
    const webpush = (await import('web-push')).default
    vapid = webpush.generateVAPIDKeys()
    start(process.execPath, ['scripts/fake-push-server.mjs']); await ready(`${pushControlUrl}__deliveries`)
  }
  const env = {
    ...process.env, MOOVX_E2E: '1', NEXT_PUBLIC_APP_URL: appUrl, NEXT_PUBLIC_SITE_URL: appUrl,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SERVICE_ROLE_KEY, MOOVX_E2E_LOCAL_SMTP: '1', SMTP_HOST: '127.0.0.1', SMTP_PORT: '55325',
    DEFAULT_COACH_EMAIL: 'default-coach@moovx.example.test',
    ...(withStripe ? { STRIPE_E2E_BASE_URL: stripeUrl, STRIPE_SECRET_KEY: 'sk_test_local_only', NEXT_PUBLIC_PRICE_CLIENT_MONTHLY: 'price_local_client_monthly' } : {}),
    ...(withPush ? { NODE_TLS_REJECT_UNAUTHORIZED: '0', NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, VAPID_SUBJECT: 'mailto:e2e@localhost' } : {}),
    ...(withAnthropic ? { ANTHROPIC_API_KEY: 'local-e2e-key', ANTHROPIC_E2E_MESSAGES_URL: `${anthropicUrl}v1/messages` } : {}),
  }
  start('./node_modules/.bin/next', ['dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3210'], env)
  await ready(appUrl)
  const playwright = start('./node_modules/.bin/playwright', ['test', '--workers=1', ...(specs.length ? specs : ['e2e'])], env)
  code = await wait(playwright)
} finally {
  for (const child of children.reverse()) { try { process.kill(-child.pid, 'SIGTERM') } catch {} }
  await new Promise(resolve => setTimeout(resolve, 500))
  for (const child of children) { try { process.kill(-child.pid, 'SIGKILL') } catch {} }
  writeFileSync(tsconfigPath, originalTsconfig)
}
process.exitCode = code
