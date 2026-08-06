import { describe, expect, it, vi } from 'vitest'
import {
  EXPECTED_MIGRATION_COUNT,
  PRIMARY_PROJECT_ID,
  assertIsolatedTarget,
  assertSafeSupabaseArgs,
  canonicalMigrationInventory,
  compareRebuildProofs,
  publicRebuildReport,
  withGuaranteedCleanup,
} from '../../scripts/verify-empty-database-rebuild.mjs'

const ports = { shadow: 60320, api: 60321, db: 60322, studio: 60323, mailpit: 60324, smtp: 60325, analytics: 60327, pooler: 60329, site: 60300, e2e: 60310 }
const proof = {
  projectId: 'moovx-empty-db-test-run-1', databasePort: 60322, volume: 'supabase_db_moovx-empty-db-test-run-1',
  migrations: ['a.sql', 'b.sql'], migrationCount: 2, fingerprint: 'a'.repeat(32),
  assertionsPassed: true, clean: true, cleanupComplete: true, durationMs: 1,
}

describe('empty database rebuild contract', () => {
  it('matches the 149 canonical migrations and the versioned staging manifest', () => {
    expect(canonicalMigrationInventory()).toHaveLength(EXPECTED_MIGRATION_COUNT)
  })

  it('refuses the primary project, its ports, and non-dedicated temporary roots', () => {
    expect(() => assertIsolatedTarget({ projectId: PRIMARY_PROJECT_ID, ports, temporaryRoot: '/tmp/moovx-empty-db-test' })).toThrow(/primary.*project/i)
    expect(() => assertIsolatedTarget({ projectId: 'moovx-empty-db-test', ports: { ...ports, db: 55322 }, temporaryRoot: '/tmp/moovx-empty-db-test' })).toThrow(/primary.*ports/i)
    expect(() => assertIsolatedTarget({ projectId: 'moovx-empty-db-test', ports, temporaryRoot: process.cwd() })).toThrow(/temporary/i)
  })

  it('refuses linked Supabase commands', () => {
    expect(() => assertSafeSupabaseArgs(['db', 'reset', '--linked'])).toThrow(/--linked/)
  })

  it('detects count, order, fingerprint, assertion, and cleanliness differences', () => {
    expect(compareRebuildProofs(proof, { ...proof, projectId: 'moovx-empty-db-test-run-2' })).toBe(true)
    expect(() => compareRebuildProofs(proof, { ...proof, migrationCount: 1 })).toThrow(/counts/)
    expect(() => compareRebuildProofs(proof, { ...proof, migrations: ['b.sql', 'a.sql'] })).toThrow(/order/)
    expect(() => compareRebuildProofs(proof, { ...proof, fingerprint: 'b'.repeat(32) })).toThrow(/fingerprints/)
    expect(() => compareRebuildProofs(proof, { ...proof, assertionsPassed: false })).toThrow(/assertions/)
    expect(() => compareRebuildProofs(proof, { ...proof, clean: false })).toThrow(/residual/)
  })

  it('always cleans up after success and failure', async () => {
    const cleanup = vi.fn()
    await expect(withGuaranteedCleanup(async () => 'ok', cleanup)).resolves.toBe('ok')
    expect(cleanup).toHaveBeenCalledTimes(1)
    cleanup.mockClear()
    await expect(withGuaranteedCleanup(async () => { throw new Error('migration failed') }, cleanup)).rejects.toThrow('migration failed')
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('exposes only an allowlisted, redacted proof shape', () => {
    const report = publicRebuildReport([proof, { ...proof, projectId: 'moovx-empty-db-test-run-2' }])
    const serialized = JSON.stringify(report)
    expect(report).toMatchObject({ migrationCount: 2, fingerprintsIdentical: true, remoteAccess: false })
    expect(serialized).not.toMatch(/key|token|authorization|postgresql:\/\/|https?:\/\//i)
  })
})
