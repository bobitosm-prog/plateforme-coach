import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const LOCAL_API_URL = 'http://127.0.0.1:55321'
export const LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres'
export const LOCAL_MAILPIT_URL = 'http://127.0.0.1:55324'
export const EXPECTED_PORTS = [55320, 55321, 55322, 55324, 55325, 55327]

export function assertLocalUrl(value, label = 'URL') {
  const url = new URL(value)
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error(`Refusing non-local ${label}: ${url.origin}`)
  }
  return url
}

/** @param {Record<string, string | undefined>} [environment] */
export function assertNoRemoteProject(environment = process.env) {
  const forbidden = ['SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_URL']
  const present = forbidden.filter(name => environment[name])
  if (present.length) throw new Error(`Refusing linked/remote Supabase context: ${present.join(', ')}`)
}

export function assertMigrationOrder(expected, applied) {
  if (expected.length !== applied.length) {
    throw new Error(`Migration count mismatch: expected ${expected.length}, applied ${applied.length}`)
  }
  const mismatch = expected.findIndex((name, index) => name !== applied[index])
  if (mismatch !== -1) {
    throw new Error(`Migration order mismatch at ${mismatch + 1}: expected ${expected[mismatch]}, applied ${applied[mismatch] || '<missing>'}`)
  }
}

export function acquireLock(lockPath, pid = process.pid) {
  try {
    const fd = openSync(lockPath, 'wx', 0o600)
    writeFileSync(fd, `${pid}\n`)
    closeSync(fd)
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    const owner = readFileSync(lockPath, 'utf8').trim() || 'unknown'
    throw new Error(`A canonical Supabase reset is already running (pid ${owner})`)
  }
  return () => {
    try { unlinkSync(lockPath) } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
}

export function localResetLockPath(root) {
  return resolve(root, '.supabase-local-reset.lock')
}
