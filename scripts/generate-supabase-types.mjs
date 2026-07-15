import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { assertLocalUrl, assertNoRemoteProject, LOCAL_API_URL, LOCAL_DB_URL } from './supabase-local-contract.mjs'

const root = resolve(import.meta.dirname, '..')
const supabaseCli = resolve(root, 'node_modules/.bin/supabase')
const target = resolve(root, 'lib/supabase/database.types.ts')
const header = `// GENERATED FILE — DO NOT EDIT MANUALLY.\n// Source: canonical local Supabase schema (public), rebuilt from versioned migrations.\n// Regenerate with: npm run supabase:types:generate\n\n`

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    env: {
      ...process.env,
      SUPABASE_TELEMETRY_DISABLED: '1',
    },
    maxBuffer: 20 * 1024 * 1024,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    if (capture) process.stderr.write(result.stderr || result.stdout || '')
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`)
  }
  return result.stdout || ''
}

function assertLocalContract() {
  assertNoRemoteProject(process.env)
  assertLocalUrl(LOCAL_API_URL, 'Supabase API URL')
  assertLocalUrl(LOCAL_DB_URL, 'Supabase database URL')
  run(process.execPath, ['scripts/supabase-local.mjs', 'ensure'])
}

function generate() {
  const generated = run(supabaseCli, ['gen', 'types', '--local', '--schema', 'public'], { capture: true })
  if (!generated.includes('export type Database =')) throw new Error('Supabase CLI returned an invalid TypeScript contract')
  return `${header}${generated.replace(/\r\n/g, '\n').trimEnd()}\n`
}

assertLocalContract()
const action = process.argv[2]

if (action === 'generate') {
  writeFileSync(target, generate())
  console.log(`Generated ${target.replace(`${root}/`, '')} from the canonical local schema`)
} else if (action === 'check') {
  const directory = mkdtempSync(join(tmpdir(), 'moovx-supabase-types-'))
  const temporary = join(directory, 'database.types.ts')
  try {
    writeFileSync(temporary, generate())
    const expected = readFileSync(target, 'utf8')
    const actual = readFileSync(temporary, 'utf8')
    if (actual !== expected) {
      throw new Error('Generated Supabase types are stale; run npm run supabase:types:generate')
    }
    console.log('Generated Supabase types match the canonical local schema')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
} else {
  throw new Error('Expected one of: generate, check')
}
