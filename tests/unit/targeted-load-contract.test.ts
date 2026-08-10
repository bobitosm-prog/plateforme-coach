import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  TARGETED_LOAD_MAX_DURATION_SECONDS,
  TARGETED_LOAD_PROFILE,
  TARGETED_LOAD_RETRIES,
  TARGETED_LOAD_SMOKE_PROFILE,
  TARGETED_LOAD_TIMEOUT_MS,
  assertPreviousCleanupConfirmed,
  assertSafeRedirect,
  assertTargetedLoadContract,
  sanitizeLoadRecord,
  validateTargetedLoadProfile,
} from '../../scripts/performance/targeted-load-contract.mjs'

const root = process.cwd()
const runner = readFileSync(resolve(root, 'scripts/performance/run-targeted-load.mjs'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
const documentation = readFileSync(resolve(root, 'docs/PHASE_9_TARGETED_LOAD_TEST.md'), 'utf8')
const workflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8')

function validOptions(overrides: Record<string, unknown> = {}) {
  return {
    appUrl: 'http://127.0.0.1:3000',
    supabaseUrl: 'http://127.0.0.1:55321',
    env: {},
    route: '/api/feedback/mine',
    method: 'GET',
    timeoutMs: 5_000,
    retries: 0,
    profile: TARGETED_LOAD_PROFILE,
    ...overrides,
  }
}

describe('targeted local load contract', () => {
  it('accepts only the canonical local route and complete profile', () => {
    expect(assertTargetedLoadContract(validOptions()).appUrl.hostname).toBe('127.0.0.1')
    expect(validateTargetedLoadProfile(TARGETED_LOAD_PROFILE)).toEqual({ totalDurationSeconds: 300 })
    expect(TARGETED_LOAD_MAX_DURATION_SECONDS).toBe(300)
    expect(TARGETED_LOAD_PROFILE).toEqual([
      { name: 'warm-up', durationSeconds: 30, startVus: 1, endVus: 1, startRps: 1, endRps: 1 },
      { name: 'low', durationSeconds: 60, startVus: 2, endVus: 2, startRps: 2, endRps: 2 },
      { name: 'ramp', durationSeconds: 60, startVus: 2, endVus: 5, startRps: 2, endRps: 5 },
      { name: 'plateau', durationSeconds: 120, startVus: 5, endVus: 5, startRps: 5, endRps: 5 },
      { name: 'cooldown', durationSeconds: 30, startVus: 1, endVus: 1, startRps: 1, endRps: 1 },
    ])
  })

  it('refuses Production and remote Supabase credentials', () => {
    expect(() => assertTargetedLoadContract(validOptions({ env: { VERCEL_ENV: 'production' } }))).toThrow('PRODUCTION_ENVIRONMENT_REFUSED')
    expect(() => assertTargetedLoadContract(validOptions({ env: { SUPABASE_PROJECT_REF: 'remote' } }))).toThrow('SUPABASE_PROJECT_REF_REFUSED')
    expect(() => assertTargetedLoadContract(validOptions({ env: { SUPABASE_ACCESS_TOKEN: 'present' } }))).toThrow('SUPABASE_ACCESS_TOKEN_REFUSED')
  })

  it('refuses distant application and Supabase origins', () => {
    expect(() => assertTargetedLoadContract(validOptions({ appUrl: 'https://preview.example.test' }))).toThrow('APP_URL_DISTANT_URL_REFUSED')
    expect(() => assertTargetedLoadContract(validOptions({ supabaseUrl: 'https://project.supabase.co' }))).toThrow('SUPABASE_URL_DISTANT_URL_REFUSED')
    expect(() => assertTargetedLoadContract(validOptions({ env: { SUPABASE_DB_URL: 'postgresql://db.example.test/postgres' } }))).toThrow('SUPABASE_DB_URL_DISTANT_URL_REFUSED')
    expect(() => assertTargetedLoadContract(validOptions({ env: { SUPABASE_URL: 'https://project.supabase.co' } }))).toThrow('SUPABASE_URL_ENV_DISTANT_URL_REFUSED')
  })

  it('refuses credentials embedded in configured target URLs', () => {
    expect(() => assertTargetedLoadContract(validOptions({ appUrl: 'http://user:pass@127.0.0.1:3000' }))).toThrow('APP_URL_CREDENTIALS_IN_URL_REFUSED')
    expect(() => assertTargetedLoadContract(validOptions({ supabaseUrl: 'http://user:pass@127.0.0.1:55321' }))).toThrow('SUPABASE_URL_CREDENTIALS_IN_URL_REFUSED')
  })

  it('refuses non-allowlisted routes and non-GET methods', () => {
    expect(() => assertTargetedLoadContract(validOptions({ route: '/api/ai-quota' }))).toThrow('LOAD_ROUTE_NOT_ALLOWLISTED')
    expect(() => assertTargetedLoadContract(validOptions({ method: 'POST' }))).toThrow('LOAD_METHOD_NOT_ALLOWED')
  })

  it('refuses concurrency and throughput above five', () => {
    expect(() => validateTargetedLoadProfile([{ name: 'unsafe', durationSeconds: 1, startVus: 6, endVus: 6, startRps: 1, endRps: 1 }])).toThrow('LOAD_CONCURRENCY_LIMIT_EXCEEDED')
    expect(() => validateTargetedLoadProfile([{ name: 'unsafe', durationSeconds: 1, startVus: 1, endVus: 1, startRps: 6, endRps: 6 }])).toThrow('LOAD_RATE_LIMIT_EXCEEDED')
  })

  it('fixes the timeout at five seconds and retries at zero', () => {
    expect(TARGETED_LOAD_TIMEOUT_MS).toBe(5_000)
    expect(TARGETED_LOAD_RETRIES).toBe(0)
    expect(() => assertTargetedLoadContract(validOptions({ timeoutMs: 5_001 }))).toThrow('LOAD_TIMEOUT_MUST_BE_5000_MS')
    expect(() => assertTargetedLoadContract(validOptions({ retries: 1 }))).toThrow('LOAD_RETRIES_MUST_BE_ZERO')
  })

  it('rejects unsafe provider and remote SMTP configuration', () => {
    expect(() => assertTargetedLoadContract(validOptions({ env: { STRIPE_SECRET_KEY: 'sk_live_redacted' } }))).toThrow('STRIPE_LIVE_REFUSED')
    expect(() => assertTargetedLoadContract(validOptions({ env: { ANTHROPIC_API_KEY: 'sk-ant-redacted' } }))).toThrow('ANTHROPIC_REAL_REFUSED')
    expect(() => assertTargetedLoadContract(validOptions({ env: { VAPID_PRIVATE_KEY: 'present' } }))).toThrow('PUSH_REAL_REFUSED')
    expect(() => assertTargetedLoadContract(validOptions({ env: { SMTP_HOST: 'smtp.example.test' } }))).toThrow('SMTP_DISTANT_REFUSED')
  })

  it('requires confirmation after every previous cleanup', () => {
    expect(() => assertPreviousCleanupConfirmed(null)).not.toThrow()
    expect(() => assertPreviousCleanupConfirmed({ cleanupConfirmed: true })).not.toThrow()
    expect(() => assertPreviousCleanupConfirmed({ cleanupConfirmed: false })).toThrow('PREVIOUS_LOAD_CLEANUP_UNCONFIRMED')
  })

  it('refuses redirects outside the configured origin', () => {
    expect(() => assertSafeRedirect('http://127.0.0.1:3000', 'https://example.test/login')).toThrow('DISTANT_REDIRECT_REFUSED')
    expect(() => assertSafeRedirect('http://127.0.0.1:3000', '/login')).toThrow('UNEXPECTED_LOAD_REDIRECT')
  })

  it('redacts secrets recursively while keeping metrics', () => {
    const sanitized = sanitizeLoadRecord({
      status: 200,
      cookie: 'session=value',
      nested: { authorization: 'Bearer private', value: 'Bearer secret' },
    })
    expect(sanitized).toEqual({
      status: 200,
      cookie: '[REDACTED]',
      nested: { authorization: '[REDACTED]', value: '[REDACTED]' },
    })
  })

  it('keeps the smoke mode below every safety maximum', () => {
    expect(validateTargetedLoadProfile(TARGETED_LOAD_SMOKE_PROFILE)).toEqual({ totalDurationSeconds: 2 })
    expect(TARGETED_LOAD_SMOKE_PROFILE[0]).toMatchObject({ startVus: 1, endVus: 1, startRps: 1, endRps: 1 })
  })

  it('prepares exactly five clients and twenty reports with signal-safe cleanup', () => {
    expect(runner).toContain('const CLIENT_COUNT = 5')
    expect(runner).toContain('const REPORTS_PER_CLIENT = 20')
    expect(runner).toContain("process.once('SIGINT', handleSigint)")
    expect(runner).toContain("process.once('SIGTERM', handleSigterm)")
    expect(runner).toContain(".from('bug_reports').delete().eq('page_url', fixtureMarker)")
    expect(runner).toContain(".from('profiles').delete().in('id', fixtureIds)")
    expect(runner).toContain('admin.auth.admin.deleteUser(id)')
    expect(runner).toContain('OUT_OF_SCOPE_COUNT_CHANGED')
  })

  it('has no CLI escape hatch for rate, duration, concurrency, route or method', () => {
    expect(runner).toContain("argument !== '--smoke'")
    for (const option of ['--rate', '--rps', '--duration', '--concurrency', '--route', '--method', '--url']) {
      expect(runner).not.toContain(option)
    }
  })

  it('exposes a local-only npm command outside CI', () => {
    expect(packageJson.scripts['perf:load:targeted']).toBe('node scripts/performance/run-targeted-load.mjs')
    expect(workflow).not.toContain('perf:load:targeted')
    expect(documentation).toContain('GET /api/feedback/mine')
    expect(documentation).toMatch(/aucun seuil de performance\s+définitif/)
  })
})
