import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  NUTRITION_LOAD_CLIENTS,
  NUTRITION_LOAD_DAYS,
  NUTRITION_LOAD_LOGS_PER_DAY,
  NUTRITION_LOAD_OPERATION,
  NUTRITION_LOAD_PROFILE,
  NUTRITION_LOAD_RETRIES,
  NUTRITION_LOAD_TARGET,
  NUTRITION_LOAD_TIMEOUT_MS,
  NUTRITION_LOAD_WATER_ROWS_PER_CLIENT,
  assertNutritionFixtureCardinality,
  assertNutritionLoadContract,
} from '../../scripts/performance/nutrition-targeted-load-contract.mjs'

const runner = readFileSync(resolve('scripts/performance/run-targeted-nutrition-load.mjs'), 'utf8')
const workflow = readFileSync(resolve('.github/workflows/ci.yml'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { scripts: Record<string, string> }

function validOptions(overrides: Record<string, unknown> = {}) {
  return {
    supabaseUrl: 'http://127.0.0.1:55321',
    env: {},
    target: NUTRITION_LOAD_TARGET,
    operation: NUTRITION_LOAD_OPERATION,
    timeoutMs: NUTRITION_LOAD_TIMEOUT_MS,
    retries: NUTRITION_LOAD_RETRIES,
    profile: NUTRITION_LOAD_PROFILE,
    ...overrides,
  }
}

describe('targeted Nutrition load contract', () => {
  it('keeps the original bounded five-minute profile', () => {
    expect(NUTRITION_LOAD_PROFILE).toEqual([
      { name: 'warm-up', durationSeconds: 30, startVus: 1, endVus: 1, startRps: 1, endRps: 1 },
      { name: 'low', durationSeconds: 60, startVus: 2, endVus: 2, startRps: 2, endRps: 2 },
      { name: 'ramp', durationSeconds: 60, startVus: 2, endVus: 5, startRps: 2, endRps: 5 },
      { name: 'plateau', durationSeconds: 120, startVus: 5, endVus: 5, startRps: 5, endRps: 5 },
      { name: 'cooldown', durationSeconds: 30, startVus: 1, endVus: 1, startRps: 1, endRps: 1 },
    ])
    expect(NUTRITION_LOAD_TIMEOUT_MS).toBe(5_000)
    expect(NUTRITION_LOAD_RETRIES).toBe(0)
  })

  it('allowlists only the direct Nutrition read-model operation', () => {
    expect(assertNutritionLoadContract(validOptions()).supabaseUrl.hostname).toBe('127.0.0.1')
    expect(() => assertNutritionLoadContract(validOptions({ target: '/api/nutrition' })))
      .toThrow('NUTRITION_LOAD_TARGET_NOT_ALLOWLISTED')
    expect(() => assertNutritionLoadContract(validOptions({ operation: 'WRITE' })))
      .toThrow('NUTRITION_LOAD_OPERATION_NOT_ALLOWED')
  })

  it('refuses Production, distant Supabase and URL credentials', () => {
    expect(() => assertNutritionLoadContract(validOptions({ env: { VERCEL_ENV: 'production' } })))
      .toThrow('PRODUCTION_ENVIRONMENT_REFUSED')
    expect(() => assertNutritionLoadContract(validOptions({ supabaseUrl: 'https://project.supabase.co' })))
      .toThrow('SUPABASE_URL_DISTANT_URL_REFUSED')
    expect(() => assertNutritionLoadContract(validOptions({ supabaseUrl: 'http://user:pass@127.0.0.1:55321' })))
      .toThrow('SUPABASE_URL_CREDENTIALS_IN_URL_REFUSED')
  })

  it('refuses remote project credentials and real providers', () => {
    expect(() => assertNutritionLoadContract(validOptions({ env: { SUPABASE_PROJECT_REF: 'remote' } })))
      .toThrow('SUPABASE_PROJECT_REF_REFUSED')
    expect(() => assertNutritionLoadContract(validOptions({ env: { SUPABASE_ACCESS_TOKEN: 'present' } })))
      .toThrow('SUPABASE_ACCESS_TOKEN_REFUSED')
    expect(() => assertNutritionLoadContract(validOptions({ env: { STRIPE_SECRET_KEY: 'sk_live_redacted' } })))
      .toThrow('STRIPE_LIVE_REFUSED')
    expect(() => assertNutritionLoadContract(validOptions({ env: { ANTHROPIC_API_KEY: 'sk-ant-redacted' } })))
      .toThrow('ANTHROPIC_REAL_REFUSED')
    expect(() => assertNutritionLoadContract(validOptions({ env: { VAPID_PRIVATE_KEY: 'present' } })))
      .toThrow('PUSH_REAL_REFUSED')
    expect(() => assertNutritionLoadContract(validOptions({ env: { SMTP_HOST: 'smtp.example.test' } })))
      .toThrow('SMTP_DISTANT_REFUSED')
  })

  it('locks fixture cardinalities to five clients, 1,240 logs and 40 water rows', () => {
    expect(NUTRITION_LOAD_CLIENTS).toBe(5)
    expect(NUTRITION_LOAD_DAYS).toBe(31)
    expect(NUTRITION_LOAD_LOGS_PER_DAY).toBe(8)
    expect(NUTRITION_LOAD_WATER_ROWS_PER_CLIENT).toBe(8)
    expect(() => assertNutritionFixtureCardinality({ clients: 5, logs: 1_240, water: 40 })).not.toThrow()
    expect(() => assertNutritionFixtureCardinality({ clients: 5, logs: 1_239, water: 40 }))
      .toThrow('NUTRITION_LOAD_LOG_COUNT_INVALID')
  })

  it('uses authenticated clients during measurement and service role only around fixtures', () => {
    const issueRead = runner.slice(runner.indexOf('async function issueRead'), runner.indexOf('function sleep'))
    expect(issueRead).toContain('readNutritionJournalCycle({')
    expect(issueRead).toContain('client,')
    expect(issueRead).not.toMatch(/admin|serviceRoleKey/)
    expect(runner).toContain('authenticatedClients.push(await createAuthenticatedClient')
  })

  it('has signal-safe scoped cleanup and out-of-scope count verification', () => {
    expect(runner).toContain("process.once('SIGINT', handleSigint)")
    expect(runner).toContain("process.once('SIGTERM', handleSigterm)")
    expect(runner).toContain("from('water_intake').delete().in('user_id', fixtureIds)")
    expect(runner).toContain("from('daily_food_logs').delete().in('user_id', fixtureIds)")
    expect(runner).toContain("from('profiles').delete().in('id', fixtureIds)")
    expect(runner).toContain('admin.auth.admin.deleteUser(id)')
    expect(runner).toContain('OUT_OF_SCOPE_COUNT_CHANGED')
  })

  it('allows only one smoke argument and exactly one smoke read', () => {
    expect(runner).toContain("argument !== '--smoke'")
    expect(runner).toContain('NUTRITION_LOAD_SMOKE_REQUESTS !== 1')
    for (const option of ['--rate', '--rps', '--duration', '--concurrency', '--target', '--operation', '--url']) {
      expect(runner).not.toContain(option)
    }
  })

  it('keeps the dedicated command local and outside CI', () => {
    expect(packageJson.scripts['perf:load:nutrition'])
      .toBe('node scripts/performance/run-targeted-nutrition-load.mjs')
    expect(workflow).not.toContain('perf:load:nutrition')
  })
})
