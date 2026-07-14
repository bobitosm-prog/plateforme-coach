import { spawnSync } from 'node:child_process'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const root = new URL('../', import.meta.url)
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env })
  if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}`)
}

run(process.execPath, ['scripts/supabase-local.mjs', 'ensure'])
loadEnv({ path: new URL('../.env.e2e.local', import.meta.url), quiet: true, override: true })
const apiUrl = process.env.API_URL || ''
const anonKey = process.env.ANON_KEY || ''
const serviceKey = process.env.SERVICE_ROLE_KEY || ''
const url = new URL(apiUrl)
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !anonKey || !serviceKey) throw new Error('RLS integration requires canonical local Supabase credentials')

run('psql', ['postgresql://postgres:postgres@127.0.0.1:55322/postgres', '-X', '-v', 'ON_ERROR_STOP=1', '-f', 'tests/integration/rls-matrix.sql'])

const admin = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const email = `rls-postgrest-${process.pid}@moovx.example.test`
const password = `Local-RLS-${process.pid}-Only!`
let userId = ''
try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'client' } })
  if (created.error || !created.data.user) throw created.error || new Error('PostgREST fixture Auth creation failed')
  userId = created.data.user.id
  const prepared = await admin.from('profiles').upsert({ id: userId, email, role: 'client', full_name: 'PostgREST RLS Fixture' })
  if (prepared.error) throw prepared.error
  const browser = createClient(apiUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const signed = await browser.auth.signInWithPassword({ email, password })
  if (signed.error || !signed.data.session) throw signed.error || new Error('PostgREST fixture login failed')
  const response = await fetch(`${apiUrl}/rest/v1/profiles?id=eq.${userId}&select=id,email`, {
    headers: { apikey: anonKey, authorization: `Bearer ${signed.data.session.access_token}` },
  })
  if (!response.ok) throw new Error(`PostgREST profile check returned ${response.status}`)
  const rows = await response.json()
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.id !== userId) throw new Error('PostgREST JWT → authenticated → auth.uid wiring failed')
  console.log('RLS_POSTGREST_OK [profiles/authenticated/select-own]')
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId)
}
