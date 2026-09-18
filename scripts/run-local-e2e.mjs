import { spawnSync } from 'node:child_process'
import { config as loadEnv } from 'dotenv'
import { createInterface } from 'node:readline'
import { readFileSync, writeFileSync } from 'node:fs'
import { assertLocalE2eUrl, assertTemporaryPortsClosed, redactE2eOutput } from './e2e-local-contract.mjs'
import { readyOwnedService, startOwnedProcess, stopOwnedProcesses, waitOwnedTest } from './e2e-process-lifecycle.mjs'

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
const ports = [3210, ...(withStripe ? [55326] : []), ...(withPush ? [55328, 55329] : []), ...(withAnthropic ? [55330] : [])]
function output(stream, target) {
  createInterface({ input: stream }).on('line', line => target.write(`${redactE2eOutput(line)}\n`))
}
function start(command, commandArgs, env = process.env) {
  const owned = startOwnedProcess(command, commandArgs, { stdio: ['ignore', 'pipe', 'pipe'], env })
  children.push(owned); output(owned.child.stdout, process.stdout); output(owned.child.stderr, process.stderr); return owned
}

// Standalone runners also enforce this boundary, including after a failed journey.
await assertTemporaryPortsClosed(ports)
let code = 1
try {
  if (withStripe) { await readyOwnedService(start(process.execPath, ['scripts/fake-stripe-server.mjs']), `${stripeUrl}__requests`) }
  if (withAnthropic) { await readyOwnedService(start(process.execPath, ['scripts/fake-anthropic-server.mjs']), `${anthropicUrl}__requests`) }
  let vapid = null
  if (withPush) {
    const webpush = (await import('web-push')).default
    vapid = webpush.generateVAPIDKeys()
    await readyOwnedService(start(process.execPath, ['scripts/fake-push-server.mjs']), `${pushControlUrl}__deliveries`)
  }
  const env = {
    ...process.env, MOOVX_E2E: '1', NEXT_PUBLIC_APP_URL: appUrl, NEXT_PUBLIC_SITE_URL: appUrl,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SERVICE_ROLE_KEY, MOOVX_E2E_LOCAL_SMTP: '1', SMTP_HOST: '127.0.0.1', SMTP_PORT: '55325',
    DEFAULT_COACH_EMAIL: 'default-coach@moovx.example.test',
    ...(withStripe ? { STRIPE_E2E_BASE_URL: stripeUrl, STRIPE_SECRET_KEY: 'sk_test_local_only', NEXT_PUBLIC_PRICE_CLIENT_MONTHLY: 'price_local_client_monthly', STRIPE_PLATFORM_WEBHOOK_SECRET: 'whsec_platform_e2e_local', STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_connect_e2e_local', STRIPE_WEBHOOK_EXPECTED_LIVEMODE: 'false' } : {}),
    ...(withPush ? { NODE_TLS_REJECT_UNAUTHORIZED: '0', NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, VAPID_SUBJECT: 'mailto:e2e@localhost' } : {}),
    ...(withAnthropic ? { ANTHROPIC_API_KEY: 'local-e2e-key', ANTHROPIC_E2E_MESSAGES_URL: `${anthropicUrl}v1/messages` } : {}),
  }
  await readyOwnedService(start('./node_modules/.bin/next', ['dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3210'], env), appUrl)
  const services = [...children]
  const playwright = start('./node_modules/.bin/playwright', ['test', '--workers=1', ...(specs.length ? specs : ['e2e'])], env)
  code = await waitOwnedTest(playwright, services)
} finally {
  try { await stopOwnedProcesses(children, ports) }
  finally { writeFileSync(tsconfigPath, originalTsconfig) }
}
process.exitCode = code
