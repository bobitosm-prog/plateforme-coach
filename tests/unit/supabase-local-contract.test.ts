import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { acquireLock, assertLocalUrl, assertMigrationOrder, assertNoRemoteProject } from '../../scripts/supabase-local-contract.mjs'

describe('canonical local Supabase reset contract', () => {
  it('accepts localhost and refuses remote URLs', () => {
    expect(assertLocalUrl('http://127.0.0.1:55321').hostname).toBe('127.0.0.1')
    expect(() => assertLocalUrl('https://project.supabase.co')).toThrow(/non-local/)
  })

  it('refuses linked or remote CLI context', () => {
    expect(() => assertNoRemoteProject({})).not.toThrow()
    expect(() => assertNoRemoteProject({ SUPABASE_ACCESS_TOKEN: 'redacted' })).toThrow(/remote/)
  })

  it('detects missing, pending, or reordered migrations', () => {
    expect(() => assertMigrationOrder(['a.sql', 'b.sql'], ['a.sql', 'b.sql'])).not.toThrow()
    expect(() => assertMigrationOrder(['a.sql', 'b.sql'], ['a.sql'])).toThrow(/count/)
    expect(() => assertMigrationOrder(['a.sql', 'b.sql'], ['b.sql', 'a.sql'])).toThrow(/order/)
  })

  it('serializes resets and releases its lock', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'moovx-reset-')), 'reset.lock')
    const release = acquireLock(path, 123)
    expect(readFileSync(path, 'utf8')).toBe('123\n')
    expect(() => acquireLock(path, 456)).toThrow(/already running/)
    release()
    const releaseAgain = acquireLock(path, 456)
    releaseAgain()
  })
})
