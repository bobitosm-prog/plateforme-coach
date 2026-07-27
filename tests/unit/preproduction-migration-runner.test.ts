import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createMigrationDryRunPlan } from '../../scripts/preproduction/apply-migrations.mjs'

const manifest = {
  schemaVersion: 1,
  environment: 'staging',
  supabase: {
    organizationId: 'mlasmyrpaaqnhuuhuzma',
    projectName: 'moovx-staging',
    projectRef: 'cycbnnojcymjnaqomlyj',
    region: 'eu-central-2',
    size: 'nano',
    status: 'ACTIVE_HEALTHY',
  },
}

describe('Phase 6 preproduction migration runner', () => {
  it('builds a lexical plan for the exact linked staging target', () => {
    const plan = createMigrationDryRunPlan({
      manifest,
      environment: {
        MOOVX_ENVIRONMENT: 'staging',
        SUPABASE_STAGING_PROJECT_REF: 'cycbnnojcymjnaqomlyj',
      },
      repositoryRoot: process.cwd(),
      linkedProjectRef: 'cycbnnojcymjnaqomlyj',
    })

    expect(plan.target.projectRef).toBe('cycbnnojcymjnaqomlyj')
    expect(plan.order).toBe('lexical-filename')
    expect(plan.separateSeedIncluded).toBe(false)
    expect(plan.seedsIncluded).toBe(false)
    expect(plan.versionedReferenceDataMigrations)
      .toEqual(['20260317010000_seed_exercises_catalog.sql'])
    expect(plan.rolesIncluded).toBe(false)
    expect(plan.migrations.map(migration => migration.file)).toEqual(
      [...plan.migrations.map(migration => migration.file)].sort(),
    )
    expect(plan.cron.historicalReplayPrecondition).toBe('pg_cron-absent')
    expect(plan.cron.jobsCreatedByDryRun).toBe(0)
    expect(plan.cron.jobsCreatedByEnvironmentScopedMigration).toBe(0)
    expect(plan.cron.environmentScopedMigration)
      .toBe('20260725190000_configure_environment_scoped_cron.sql')
  })

  it('reports duplicate logical versions and refuses to call the plan acceptable', () => {
    const plan = createMigrationDryRunPlan({
      manifest,
      environment: { MOOVX_ENVIRONMENT: 'staging' },
      repositoryRoot: process.cwd(),
      linkedProjectRef: 'cycbnnojcymjnaqomlyj',
    })

    expect(plan.acceptableForApply).toBe(false)
    expect(plan.versioning.collisions).toHaveLength(17)
    expect(plan.versioning.collisionFileCount).toBe(73)
    expect(plan.versioning.nonStandardVersionFiles).toHaveLength(84)
    expect(plan.blockingIssues).toEqual([
      {
        kind: 'logical_version_collisions',
        groupCount: 17,
        fileCount: 73,
      },
      {
        kind: 'versioned_reference_data_requires_authorization',
        files: ['20260317010000_seed_exercises_catalog.sql'],
      },
    ])
  })

  it('refuses a linked target different from the manifest', () => {
    expect(() => createMigrationDryRunPlan({
      manifest,
      environment: { MOOVX_ENVIRONMENT: 'staging' },
      repositoryRoot: process.cwd(),
      linkedProjectRef: 'njlzossopgknanhkzcbk',
    })).toThrow(/does not match/)
  })

  it('contains no database mutation command in the operator runner', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'scripts/preproduction/apply-migrations.mjs'),
      'utf8',
    )
    expect(source).not.toMatch(/\b(?:psql|db push|db reset)\b/)
    expect(source).toContain('Only --dry-run is supported')
  })
})
