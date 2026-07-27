import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildCandidatePlan,
  buildMutationClassification,
} from '../../scripts/preproduction/staging-mutation-classification.mjs'

const manifest = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'scripts/preproduction/staging-migration-manifest.json'),
    'utf8',
  ),
)
type ClassifiedMigration = {
  historicalName: string
  category: string
  operations: string[]
  sensitiveSignals: string[]
  containsUnallowlistedProductionUrl: boolean
}

type Classification = {
  migrationCount: number
  totals: Record<string, number>
  migrations: ClassifiedMigration[]
}

const classification = buildMutationClassification({
  migrationManifest: manifest,
  repositoryRoot: process.cwd(),
}) as Classification

describe('Phase 6 staging mutation classification', () => {
  it('classifies all 53 blocked mutations exactly once', () => {
    expect(classification.migrationCount).toBe(53)
    expect(classification.totals).toEqual({
      A: 6,
      B: 4,
      C: 36,
      D: 6,
      E: 1,
      F: 0,
    })
    expect(new Set(
      classification.migrations.map(migration => migration.historicalName),
    ).size).toBe(53)
  })

  it('pins every source, staging version, order and SHA to the migration manifest', () => {
    for (const migration of classification.migrations) {
      const source = manifest.migrations.find(
        (candidate: { historicalName: string }) =>
          candidate.historicalName === migration.historicalName,
      )
      expect(migration).toEqual(expect.objectContaining({
        sourcePath: source.sourcePath,
        stagingVersion: source.stagingVersion,
        sourceSha256: source.sourceSha256,
        absoluteOrder: source.absoluteOrder,
      }))
    }
  })

  it('never authorizes personal or destructive mutations in A/B/C', () => {
    const authorized = classification.migrations.filter(migration =>
      ['A', 'B', 'C'].includes(migration.category),
    )
    expect(authorized.filter(migration =>
      migration.operations.includes('delete_from'),
    )).toEqual([])
    expect(authorized.filter(migration =>
      migration.sensitiveSignals.some(signal =>
        /email|phone|hardcoded_user_uuid|payment|stripe/.test(signal),
      ),
    )).toEqual([])
  })

  it('keeps every production URL outside the classified authorization', () => {
    expect(classification.migrations.filter(
      migration => migration.containsUnallowlistedProductionUrl,
    )).toEqual([])
  })

  it('keeps the canonical exercise catalog separately authorized', () => {
    const catalog = manifest.migrations.find(
      (migration: { historicalName: string }) =>
        migration.historicalName ===
        '20260317010000_seed_exercises_catalog.sql',
    )
    expect(catalog).toEqual(expect.objectContaining({
      authorization: 'reference_data_authorized',
      allowed: true,
    }))
    expect(classification.migrations).not.toContainEqual(
      expect.objectContaining({ historicalName: catalog.historicalName }),
    )
  })

  it.each([
    ['strict', 131, 11],
    ['compatibility', 135, 7],
  ] as const)('builds the %s plan without collisions or order drift', (
    planName,
    included,
    excluded,
  ) => {
    const plan = buildCandidatePlan({
      migrationManifest: manifest,
      classification,
      plan: planName,
    })
    expect(plan).toEqual(expect.objectContaining({
      includedMigrationCount: included,
      excludedMigrationCount: excluded,
      uniqueStagingVersionCount: included,
      collisions: 0,
      historicalOrderPreserved: true,
      acceptableForSupabaseDryRun: false,
      probableFinalSchema: 'incomplete',
    }))
    expect(plan.forbiddenIncluded).toEqual([])
    expect(plan.dependencyBreaks).toHaveLength(3)
  })

  it('builds the authorized final plan with only the five explicit exclusions', () => {
    const plan = buildCandidatePlan({
      migrationManifest: manifest,
      classification,
      plan: 'final',
    })
    expect(plan).toEqual(expect.objectContaining({
      includedHistoricalMigrationCount: 137,
      overlayMigrationCount: 1,
      includedMigrationCount: 138,
      excludedMigrationCount: 5,
      uniqueStagingVersionCount: 138,
      collisions: 0,
      historicalOrderPreserved: true,
      acceptableForSupabaseDryRun: true,
      probableFinalSchema: 'complete',
      dependencyBreaks: [],
      forbiddenIncluded: [],
    }))
    expect(plan.excludedMigrations).toEqual([
      '20260419_cleanup_empty_programs.sql',
      '20260419_invited_by_coach.sql',
      '20260530033322_backfill_next_diagnostic_at_orphans.sql',
      '20260530034000_backfill_week_start_sunday_to_monday.sql',
      '20260530044500_backfill_full_name_capitalize.sql',
    ])
    expect(plan.overlays).toEqual([
      expect.objectContaining({
        stagingName:
          '20260419000010_invited_by_coach_schema_only.sql',
        replacesHistoricalMutation: '20260419_invited_by_coach.sql',
      }),
    ])
  })

  it('proves every final exclusion is data-only and has no schema identity', () => {
    const plan = buildCandidatePlan({
      migrationManifest: manifest,
      classification,
      plan: 'final',
    })
    const schemaOverlayReplacements = new Set(
      plan.overlays.map((overlay: { replacesHistoricalMutation: string }) =>
        overlay.replacesHistoricalMutation,
      ),
    )
    for (const file of plan.excludedMigrations) {
      const source = readFileSync(
        resolve(process.cwd(), 'supabase/migrations', file),
        'utf8',
      )
      if (!schemaOverlayReplacements.has(file)) {
        expect(source).not.toMatch(
          /\b(?:CREATE|ALTER|DROP)\s+(?:TABLE|TYPE|FUNCTION|POLICY|INDEX|TRIGGER|VIEW)\b/i,
        )
      }
    }
  })

  it('pins the staging-only overlay and contains no personal mutation', () => {
    const overlayPath = resolve(
      process.cwd(),
      'scripts/preproduction/overlays/20260419000010_invited_by_coach_schema_only.sql',
    )
    const source = readFileSync(overlayPath, 'utf8')
    expect(source).toContain(
      'ADD COLUMN IF NOT EXISTS invited_by_coach boolean DEFAULT false',
    )
    const executable = source.replace(/^--.*$/gm, '')
    expect(executable).not.toMatch(/\bUPDATE\b|@|markoo|profiles/i)
  })

  it('fails closed when a classification changes', () => {
    const copy = structuredClone(classification)
    const destructive = copy.migrations.find(
      migration => migration.historicalName ===
        '20260701200000_dedup_exercises_db.sql',
    )
    expect(destructive).toBeDefined()
    if (destructive) destructive.category = 'C'
    expect(() => buildCandidatePlan({
      migrationManifest: manifest,
      classification: copy,
      plan: 'strict',
    })).toThrow(/Classification drift/)
  })
})
