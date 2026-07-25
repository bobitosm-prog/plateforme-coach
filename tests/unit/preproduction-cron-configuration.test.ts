import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertCronRunnerContainsNoSecret,
  createCronConfigurationPlan,
} from '../../scripts/preproduction/cron-configuration.mjs'

const previewUrl = 'https://moovx-phase-6-staging.vercel.app'

function staging(overrides = {}) {
  return createCronConfigurationPlan({
    environment: 'staging',
    baseUrl: previewUrl,
    expectedPreviewBaseUrl: previewUrl,
    cronSecretPresent: true,
    ...overrides,
  })
}

describe('Phase 6 environment-scoped cron configuration', () => {
  it('preserves the explicit production endpoints and schedules', () => {
    const plan = createCronConfigurationPlan({
      environment: 'production',
      baseUrl: 'https://app.moovx.ch',
      cronSecretPresent: true,
    })
    expect(plan.jobs).toEqual([
      expect.objectContaining({ name: 'weekly-diagnostic-auto', schedule: '0 18 * * *', url: 'https://app.moovx.ch/api/weekly-diagnostic/cron' }),
      expect.objectContaining({ name: 'training-regen-auto', schedule: '0 17 * * *', url: 'https://app.moovx.ch/api/training-regen/cron' }),
      expect.objectContaining({ name: 'streak-reminder-summer', schedule: '0 16 * * *', url: 'https://app.moovx.ch/api/streak-reminder/cron' }),
      expect.objectContaining({ name: 'streak-reminder-winter', schedule: '0 17 * * *', url: 'https://app.moovx.ch/api/streak-reminder/cron' }),
    ])
  })

  it('builds staging endpoints only from the exact Preview alias', () => {
    const plan = staging()
    expect(plan.jobs).toHaveLength(4)
    expect(plan.jobs.every(job => job.url.startsWith(`${previewUrl}/api/`))).toBe(true)
    expect(JSON.stringify(plan)).not.toContain('app.moovx.ch')
    expect(JSON.stringify(plan)).not.toContain('moovx.ch')
  })

  it.each([
    ['unknown environment', { environment: 'preview' }],
    ['missing environment', { environment: '' }],
    ['missing URL', { baseUrl: '' }],
    ['missing expected alias', { expectedPreviewBaseUrl: '' }],
    ['production URL in staging', { baseUrl: 'https://app.moovx.ch', expectedPreviewBaseUrl: 'https://app.moovx.ch' }],
    ['public MoovX URL in staging', { baseUrl: 'https://preview.moovx.ch', expectedPreviewBaseUrl: 'https://preview.moovx.ch' }],
    ['local URL', { baseUrl: 'https://localhost', expectedPreviewBaseUrl: 'https://localhost' }],
    ['HTTP URL', { baseUrl: 'http://moovx-phase-6-staging.vercel.app' }],
    ['non-Vercel alias', { baseUrl: 'https://staging.example.com', expectedPreviewBaseUrl: 'https://staging.example.com' }],
    ['alias mismatch', { baseUrl: previewUrl, expectedPreviewBaseUrl: 'https://another-preview.vercel.app' }],
    ['missing secret', { cronSecretPresent: false }],
  ])('refuses %s', (_label, overrides) => {
    expect(() => staging(overrides)).toThrow()
  })

  it('keeps the SQL operation idempotent and replaces every historical job', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20260725190000_configure_environment_scoped_cron.sql'),
      'utf8',
    )
    for (const job of [
      'weekly-diagnostic-auto',
      'training-regen-auto',
      'streak-reminder-summer',
      'streak-reminder-winter',
    ]) {
      expect(migration).toContain(`'${job}'`)
    }
    expect(migration).toContain('cron.unschedule(job_name)')
    expect(migration.match(/PERFORM cron\.schedule\(/g)).toHaveLength(4)
    expect(migration).toContain('ON CONFLICT (singleton) DO UPDATE')
    expect(migration).toContain('vault.update_secret')
  })

  it('does not mutate cron jobs when the corrective migration is merely applied', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20260725190000_configure_environment_scoped_cron.sql'),
      'utf8',
    )
    const outsideFunction = migration.slice(0, migration.indexOf('CREATE OR REPLACE FUNCTION private.configure_moovx_cron'))
    expect(outsideFunction).not.toContain('cron.schedule')
    expect(outsideFunction).not.toContain('cron.unschedule')
  })

  it('keeps secrets out of versioned cron runner files', () => {
    assertCronRunnerContainsNoSecret(resolve(process.cwd(), 'scripts/preproduction/configure-cron-jobs.sql'))
    assertCronRunnerContainsNoSecret(resolve(process.cwd(), 'supabase/migrations/20260725190000_configure_environment_scoped_cron.sql'))
  })

  it('configures extensions and jobs in one fail-closed transaction', () => {
    const runner = readFileSync(
      resolve(process.cwd(), 'scripts/preproduction/configure-cron-jobs.sql'),
      'utf8',
    )
    expect(runner).toContain('BEGIN;')
    expect(runner).toContain('CREATE EXTENSION IF NOT EXISTS pg_cron;')
    expect(runner).toContain('private.configure_moovx_cron')
    expect(runner).toContain('COMMIT;')
    expect(runner.indexOf('BEGIN;')).toBeLessThan(runner.indexOf('CREATE EXTENSION'))
    expect(runner.indexOf('CREATE EXTENSION')).toBeLessThan(runner.indexOf('private.configure_moovx_cron'))
  })
})
