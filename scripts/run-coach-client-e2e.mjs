import { spawnSync } from 'node:child_process'
import { assertNoRemoteProject } from './supabase-local-contract.mjs'
import { assertLocalE2eUrl, assertTemporaryPortsClosed } from './e2e-local-contract.mjs'

assertNoRemoteProject()
assertLocalE2eUrl('http://127.0.0.1:54321', 'Supabase URL')
const requested = process.argv.slice(2)
const specs = requested.length ? requested : ['e2e/coach-client-coach.spec.ts', 'e2e/coach-client-client.spec.ts']
const run = spawnSync(process.execPath, ['scripts/run-local-e2e.mjs', ...specs], { stdio: 'inherit' })
await assertTemporaryPortsClosed()
process.exitCode = run.status ?? 1
