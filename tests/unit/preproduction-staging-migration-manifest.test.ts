import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createStagingMigrationManifest,
  inventorySqlMutations,
} from '../../scripts/preproduction/staging-migration-manifest.mjs'
import {
  executeFinalSupabasePlan,
  verifyStagingMigrationManifest,
  withTemporaryStagingWorkdir,
} from '../../scripts/preproduction/materialize-staging-migrations.mjs'

const migrationsRoot = resolve(process.cwd(), 'supabase/migrations')
const manifestPath = resolve(
  process.cwd(),
  'scripts/preproduction/staging-migration-manifest.json',
)
type MigrationRecord = {
  sourceSha256: string
  historicalName: string
  historicalVersion: string
  stagingName: string
  stagingVersion: string
  collisionGroup: string | null
  authorization: string
  category: string
  allowed: boolean
  mutationInventory: {
    statements: Array<{
      operation: string
      target: string
      execution: string
    }>
  }
}

type StagingManifest = {
  sourceMigrationCount: number
  migrations: MigrationRecord[]
}

const manifest = JSON.parse(
  readFileSync(manifestPath, 'utf8'),
) as StagingManifest

describe('Phase 6 staging migration re-versioning manifest', () => {
  it('pins all sources, hashes, unique staging versions and historical order', () => {
    const result = verifyStagingMigrationManifest({ manifest, migrationsRoot })
    expect(result).toEqual(expect.objectContaining({
      status: 'ok',
      migrationCount: 149,
      shaCount: 149,
      uniqueStagingVersionCount: 149,
      reversionedMigrationCount: 73,
      resolvedCollisionGroupCount: 17,
      acceptableForSupabaseDryRun: false,
    }))
    expect(result.blockedMigrations).toHaveLength(53)
    expect(manifest.migrations.map((migration: { stagingName: string }) => migration.stagingName))
      .toEqual(
        [...manifest.migrations]
          .map((migration: { stagingName: string }) => migration.stagingName)
          .sort(),
      )
  })

  it('preserves every already unique historical version', () => {
    const groups = new Map<string, number>()
    for (const migration of manifest.migrations) {
      groups.set(
        migration.historicalVersion,
        (groups.get(migration.historicalVersion) ?? 0) + 1,
      )
    }
    for (const migration of manifest.migrations) {
      if (groups.get(migration.historicalVersion) === 1) {
        expect(migration.stagingVersion).toBe(migration.historicalVersion)
        expect(migration.stagingName).toBe(migration.historicalName)
      }
    }
  })

  it('keeps the Seedance jobs migration additive and closed by RLS', () => {
    const migration = manifest.migrations.find(
      item => item.historicalName === '20260718150000_seedance_jobs.sql',
    )
    expect(migration).toEqual(expect.objectContaining({
      category: 'schema',
      authorization: 'authorized_schema',
      allowed: true,
    }))
    expect(migration?.mutationInventory.statements).toEqual([])

    const source = readFileSync(
      resolve(migrationsRoot, '20260718150000_seedance_jobs.sql'),
      'utf8',
    )
    expect(source).toMatch(/create table if not exists public\.seedance_jobs/i)
    expect(source).toMatch(/alter table public\.seedance_jobs enable row level security/i)
    expect(source).toMatch(/create index if not exists seedance_jobs_task_id_idx/i)
    expect(source).toMatch(/create index if not exists seedance_jobs_created_at_idx/i)
    expect(source).not.toMatch(/\b(?:drop\s+(?:table|schema)|delete\s+from|update\s+\S+\s+set|insert\s+into)\b/i)
    expect(source).not.toMatch(/\bgrant\s+.*\b(?:public|anon|authenticated)\b/i)
    expect(source).not.toMatch(/create\s+policy/i)
  })

  it('expands colliding date-only versions by deterministic lexical rank', () => {
    const group = manifest.migrations.filter(
      (migration: { collisionGroup: string | null }) =>
        migration.collisionGroup === '20260327',
    )
    expect(group.map((migration: { stagingVersion: string }) => migration.stagingVersion))
      .toEqual(['20260327000001', '20260327000002', '20260327000003'])
  })

  it.each([
    ['SHA modified', (copy: StagingManifest) => { copy.migrations[0].sourceSha256 = '0'.repeat(64) }],
    ['migration missing', (copy: StagingManifest) => { copy.migrations.pop(); copy.sourceMigrationCount -= 1 }],
    ['migration additional', (copy: StagingManifest) => { copy.migrations.push({ ...copy.migrations[0], historicalName: 'extra.sql' }); copy.sourceMigrationCount += 1 }],
    ['order modified', (copy: StagingManifest) => { [copy.migrations[0], copy.migrations[1]] = [copy.migrations[1], copy.migrations[0]] }],
    ['artificial collision', (copy: StagingManifest) => { copy.migrations[1].stagingVersion = copy.migrations[0].stagingVersion }],
    ['unauthorized mutation hidden', (copy: StagingManifest) => {
      const migration = copy.migrations.find(item => !item.allowed)
      if (migration) migration.allowed = true
    }],
  ] satisfies Array<[string, (copy: StagingManifest) => void]>)(
    'refuses a manifest with %s',
    (_label, mutate) => {
    const copy = structuredClone(manifest)
    mutate(copy)
    expect(() => verifyStagingMigrationManifest({ manifest: copy, migrationsRoot }))
      .toThrow(/diverges|exactly 149|collision/)
    },
  )

  it('authorizes only the canonical exercise reference catalog', () => {
    const reference = manifest.migrations.filter(
      (migration: { authorization: string }) =>
        migration.authorization === 'reference_data_authorized',
    )
    expect(reference).toHaveLength(1)
    expect(reference[0]).toEqual(expect.objectContaining({
      historicalName: '20260317010000_seed_exercises_catalog.sql',
      category: 'reference_data',
      allowed: true,
    }))
    expect(reference[0].mutationInventory.statements).toEqual([
      expect.objectContaining({
        operation: 'insert_into',
        target: 'public.exercises_db',
        execution: 'migration',
      }),
    ])
  })

  it('keeps personal data out of the authorized reference catalog', () => {
    const source = readFileSync(
      resolve(migrationsRoot, '20260317010000_seed_exercises_catalog.sql'),
      'utf8',
    )
    expect(source.match(/\('[-0-9a-f]{36}'::uuid,/g)).toHaveLength(178)
    expect(source).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
    expect(source).not.toMatch(/\+\d{8,}/)
    expect(source).toContain('WHERE NOT EXISTS (SELECT 1 FROM public.exercises_db)')
  })

  it('distinguishes migration-time data writes from function definitions', () => {
    expect(inventorySqlMutations('UPDATE profiles SET role = null;').migrationTimeCount)
      .toBe(1)
    expect(inventorySqlMutations(`
      CREATE FUNCTION private.example() RETURNS void
      LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE profiles SET role = null;
      END
      $$;
    `)).toEqual(expect.objectContaining({
      migrationTimeCount: 0,
      definitionOnlyCount: 1,
    }))
  })

  it('materializes renamed copies and always removes its temporary workdir', () => {
    let observedRoot = ''
    expect(() => withTemporaryStagingWorkdir({
      repositoryRoot: process.cwd(),
      manifest,
      runDryRun(tempRoot: string) {
        observedRoot = tempRoot
        const files = readdirSync(join(tempRoot, 'supabase/migrations'))
          .filter(file => file.endsWith('.sql'))
          .sort()
        expect(files).toHaveLength(149)
        expect(files).toEqual(
          manifest.migrations.map((migration: { stagingName: string }) => migration.stagingName),
        )
        expect(
          readFileSync(join(tempRoot, 'supabase/config.toml'), 'utf8'),
        ).toContain('[db.migrations]\n# Historical files contain duplicate date-only version prefixes.')
        throw new Error('synthetic dry-run stop')
      },
    })).toThrow(/synthetic dry-run stop/)
    expect(observedRoot).not.toBe('')
    expect(existsSync(observedRoot)).toBe(false)
  })

  it('runs the final dry-run immediately before a single apply', () => {
    const calls: Array<{ root: string; dryRun: boolean }> = []
    const result = executeFinalSupabasePlan(
      '/tmp/moovx-staging-proof',
      (root: string, options: { dryRun: boolean }) => {
        calls.push({ root, dryRun: options.dryRun })
        return {
          exitCode: 0,
          output: options.dryRun ? 'dry-run' : 'apply',
          errorOutput: '',
        }
      },
    )

    expect(calls).toEqual([
      { root: '/tmp/moovx-staging-proof', dryRun: true },
      { root: '/tmp/moovx-staging-proof', dryRun: false },
    ])
    expect(result).toEqual({
      onErrorStop: true,
      executionCount: 1,
      dryRun: { exitCode: 0, output: 'dry-run', errorOutput: '' },
      apply: { exitCode: 0, output: 'apply', errorOutput: '' },
    })
  })

  it('does not apply when the immediate final dry-run fails', () => {
    const calls: boolean[] = []
    expect(() => executeFinalSupabasePlan(
      '/tmp/moovx-staging-proof',
      (_root: string, options: { dryRun: boolean }) => {
        calls.push(options.dryRun)
        throw new Error('dry-run refused')
      },
    )).toThrow(/dry-run refused/)
    expect(calls).toEqual([true])
  })

  it('detects a source mutation in an isolated migration root', () => {
    const root = mkdtempSync(join(tmpdir(), 'moovx-manifest-source-'))
    writeFileSync(join(root, '20260101000000_one.sql'), 'select 1;\n')
    const generated = createStagingMigrationManifest(root)
    expect(generated.migrations).toHaveLength(1)
    writeFileSync(join(root, '20260101000000_one.sql'), 'select 2;\n')
    expect(() => verifyStagingMigrationManifest({
      manifest: { ...generated, sourceMigrationCount: 149, migrations: Array(149).fill(generated.migrations[0]) },
      migrationsRoot: root,
    })).toThrow()
  })
})
