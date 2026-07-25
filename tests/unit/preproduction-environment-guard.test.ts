import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertMigrationSourcesSafe,
  assertPreCreateEnvironment,
  findForbiddenMigrationReferences,
  readManifestForPreCreate,
} from '../../scripts/preproduction/environment-guard.mjs'

const safeManifest = {
  schemaVersion: 1,
  environment: 'staging',
  supabase: {
    organizationId: 'mlasmyrpaaqnhuuhuzma',
    projectName: 'moovx-staging',
    region: 'eu-central-1',
    size: 'nano',
    projectRef: null,
  },
}

const safeEnvironment = {
  MOOVX_ENVIRONMENT: 'staging',
}

describe('Phase 6 preproduction environment guard', () => {
  it('accepts only the explicit pre-create staging target', () => {
    expect(assertPreCreateEnvironment({
      manifest: safeManifest,
      environment: safeEnvironment,
    })).toEqual({
      environment: 'staging',
      organizationId: 'mlasmyrpaaqnhuuhuzma',
      projectName: 'moovx-staging',
      region: 'eu-central-1',
      size: 'nano',
      productionProjectExcluded: true,
      productionVariablesLoaded: false,
    })
  })

  it.each([
    ['production environment', { MOOVX_ENVIRONMENT: 'production' }],
    ['production Vercel environment', { MOOVX_ENVIRONMENT: 'staging', VERCEL_ENV: 'production' }],
    ['production Supabase ref', { MOOVX_ENVIRONMENT: 'staging', SUPABASE_PROJECT_REF: 'njlzossopgknanhkzcbk' }],
    ['production Supabase URL', { MOOVX_ENVIRONMENT: 'staging', NEXT_PUBLIC_SUPABASE_URL: 'https://njlzossopgknanhkzcbk.supabase.co' }],
    ['production application host', { MOOVX_ENVIRONMENT: 'staging', NEXT_PUBLIC_APP_URL: 'https://app.moovx.ch' }],
    ['Stripe live key', { MOOVX_ENVIRONMENT: 'staging', STRIPE_SECRET_KEY: 'sk_live_' }],
  ])('refuses %s', (_label, environment) => {
    expect(() => assertPreCreateEnvironment({
      manifest: safeManifest,
      environment,
    })).toThrow()
  })

  it.each([
    ['wrong organization', { ...safeManifest.supabase, organizationId: 'another-organization' }],
    ['wrong project name', { ...safeManifest.supabase, projectName: 'moovx-production' }],
    ['wrong region', { ...safeManifest.supabase, region: 'us-east-1' }],
    ['paid compute size', { ...safeManifest.supabase, size: 'micro' }],
    ['an existing project ref', { ...safeManifest.supabase, projectRef: 'stagingref123' }],
  ])('refuses a manifest with %s', (_label, supabase) => {
    expect(() => assertPreCreateEnvironment({
      manifest: { ...safeManifest, supabase },
      environment: safeEnvironment,
    })).toThrow()
  })

  it('accepts the existing Free Zurich region as the only alternate region', () => {
    expect(() => assertPreCreateEnvironment({
      manifest: {
        ...safeManifest,
        supabase: {
          ...safeManifest.supabase,
          region: 'eu-central-2',
        },
      },
      environment: safeEnvironment,
    })).not.toThrow()
  })

  it('refuses secrets embedded in the manifest', () => {
    expect(() => assertPreCreateEnvironment({
      manifest: {
        ...safeManifest,
        supabase: {
          ...safeManifest.supabase,
          dbPassword: 'never-store-this',
        },
      },
      environment: safeEnvironment,
    })).toThrow(/Secret-like field/)
  })

  it('requires an absolute, private manifest outside the repository', () => {
    expect(() => readManifestForPreCreate('manifest.json', process.cwd())).toThrow(/absolute/)

    const directory = mkdtempSync(join(tmpdir(), 'moovx-staging-guard-'))
    const manifestPath = join(directory, 'manifest.json')
    writeFileSync(manifestPath, JSON.stringify(safeManifest), { mode: 0o600 })
    expect(readManifestForPreCreate(manifestPath, process.cwd())).toEqual(safeManifest)

    chmodSync(manifestPath, 0o644)
    expect(() => readManifestForPreCreate(manifestPath, process.cwd())).toThrow(/permissions/)
  })

  it('accepts migration sources without production references', () => {
    const directory = mkdtempSync(join(tmpdir(), 'moovx-staging-migrations-safe-'))
    writeFileSync(join(directory, '001_safe.sql'), 'select current_date;\n')
    expect(findForbiddenMigrationReferences(directory)).toEqual([])
    expect(assertMigrationSourcesSafe(directory)).toEqual({
      allowedImmutableProductionReferences: 0,
      requiresPgCronAbsentDuringHistoricalReplay: false,
    })
  })

  it('refuses production hosts and refs in migration sources', () => {
    const directory = mkdtempSync(join(tmpdir(), 'moovx-staging-migrations-unsafe-'))
    writeFileSync(join(directory, '001_unsafe.sql'), [
      "select 'https://app.moovx.ch/api/cron';",
      "select 'njlzossopgknanhkzcbk';",
      '',
    ].join('\n'))

    expect(findForbiddenMigrationReferences(directory)).toEqual([
      { file: join(directory, '001_unsafe.sql'), line: 1 },
      { file: join(directory, '001_unsafe.sql'), line: 2 },
    ])
    expect(() => assertMigrationSourcesSafe(directory)).toThrow(/Production references forbidden/)
  })

  it('accepts only the pinned repository cron references', () => {
    expect(assertMigrationSourcesSafe(resolve(process.cwd(), 'supabase/migrations'))).toEqual({
      allowedImmutableProductionReferences: 6,
      requiresPgCronAbsentDuringHistoricalReplay: true,
    })
  })
})
