import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  acquireE2eLock,
  assertOnlyConfiguredLocalOrigins,
  assertLocalE2eUrl,
  assertLocalSupabaseConfig,
  CRITICAL_E2E_TARGET_MATRIX,
  getIntegratedCriticalE2eScenarios,
  redactE2eOutput,
  validateCriticalE2eTargetMatrix,
} from '../../scripts/e2e-local-contract.mjs'

const localSupabaseConfig = (overrides: { siteUrl?: string, redirects?: string[] } = {}) => `
port = 55321
port = 55322
port = 55324
smtp_port = 55325
site_url = "${overrides.siteUrl || 'http://127.0.0.1:3000'}"
additional_redirect_urls = ${JSON.stringify(overrides.redirects || [
  'http://127.0.0.1:3000/**',
  'http://localhost:3000/**',
  'http://127.0.0.1:3210/auth/callback',
  'http://127.0.0.1:3210/join',
])}
`

describe('critical E2E local contract', () => {
  it('requires the local development site and both exact E2E redirects', () => {
    expect(() => assertLocalSupabaseConfig(localSupabaseConfig())).not.toThrow()
    expect(() => assertLocalSupabaseConfig(localSupabaseConfig({ siteUrl: 'http://127.0.0.1:3210' }))).toThrow('site_url = "http://127.0.0.1:3000"')
    expect(() => assertLocalSupabaseConfig(localSupabaseConfig({ redirects: ['http://127.0.0.1:3210/join'] }))).toThrow('3210/auth/callback')
    expect(() => assertLocalSupabaseConfig(localSupabaseConfig({ redirects: ['http://127.0.0.1:3210/auth/callback'] }))).toThrow('3210/join')
    expect(() => assertLocalSupabaseConfig(localSupabaseConfig({ redirects: ['http://remote.example/auth/callback', 'http://127.0.0.1:3210/auth/callback', 'http://127.0.0.1:3210/join'] }))).toThrow('Refusing non-local URL')
    expect(() => assertLocalSupabaseConfig(localSupabaseConfig({ siteUrl: 'https://remote.example' }))).toThrow('Refusing non-local URL')
  })

  it('accepts localhost and rejects remote origins', () => {
    expect(assertLocalE2eUrl('http://127.0.0.1:3210').hostname).toBe('127.0.0.1')
    expect(assertLocalE2eUrl('https://localhost:55328').hostname).toBe('localhost')
    expect(() => assertLocalE2eUrl('https://example.com')).toThrow('Refusing non-local')
  })

  it('restricts browser origins to configured local protocol and ports', () => {
    expect(() => assertOnlyConfiguredLocalOrigins(
      ['http://127.0.0.1:3210', 'http://localhost:55321'],
      ['http://127.0.0.1:3210', 'http://127.0.0.1:55321'],
    )).not.toThrow()
    expect(() => assertOnlyConfiguredLocalOrigins(
      ['http://127.0.0.1:56321'],
      ['http://localhost:56321'],
    )).not.toThrow()
    expect(() => assertOnlyConfiguredLocalOrigins(
      ['http://127.0.0.1:55322'],
      ['http://127.0.0.1:55321'],
    )).toThrow('unconfigured local E2E origin')
    expect(() => assertOnlyConfiguredLocalOrigins(
      ['https://project.supabase.co'],
      ['http://127.0.0.1:55321'],
    )).toThrow('Refusing non-local')
    expect(() => assertOnlyConfiguredLocalOrigins(
      ['https://app.moovx.ch'],
      ['http://127.0.0.1:55321'],
    )).toThrow('Refusing non-local')
  })

  it('redacts credentials and sensitive conversational fields', () => {
    const jwt = `eyJ${'a'.repeat(20)}.${'b'.repeat(20)}.${'c'.repeat(20)}`
    const output = redactE2eOutput(`authorization=Bearer-secret cookie=session-secret invitation_token=invite ${jwt} {"prompt":"private profile"}`)
    expect(output).not.toContain('Bearer-secret')
    expect(output).not.toContain('session-secret')
    expect(output).not.toContain('private profile')
    expect(output).not.toContain(jwt)
  })

  it('refuses two concurrent suites and releases the lock', () => {
    const directory = mkdtempSync(join(tmpdir(), 'moovx-critical-e2e-'))
    const lock = join(directory, 'suite.lock')
    try {
      const release = acquireE2eLock(lock, 'critical E2E suite', 123)
      expect(() => acquireE2eLock(lock, 'critical E2E suite', 456)).toThrow('pid 123')
      release()
      const releaseAgain = acquireE2eLock(lock, 'critical E2E suite', 456)
      releaseAgain()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('keeps the canonical suite sequential and complete', () => {
    const script = readFileSync(new URL('../../scripts/run-critical-e2e.mjs', import.meta.url), 'utf8')
    const localRunner = readFileSync(new URL('../../scripts/run-local-e2e.mjs', import.meta.url), 'utf8')
    expect(script).toContain('getIntegratedCriticalE2eScenarios()')
    expect(localRunner).toContain("'--workers=1'")
    expect(script).toContain("['scripts/supabase-local.mjs', 'reset']")
  })

  it('defines 15 unique target journeys and integrates only the qualified twelve', () => {
    expect(validateCriticalE2eTargetMatrix()).toBe(CRITICAL_E2E_TARGET_MATRIX)
    expect(new Set(CRITICAL_E2E_TARGET_MATRIX.map(journey => journey.name)).size).toBe(15)

    const integrated = getIntegratedCriticalE2eScenarios()
    expect(integrated.map(journey => journey.spec)).toEqual([
      'e2e/coach-invitation.spec.ts',
      'e2e/platform-checkout.spec.ts',
      'e2e/coach-checkout.spec.ts',
      'e2e/push-notification.spec.ts',
      'e2e/chat-ai.spec.ts',
      'e2e/auth-registration-flow.spec.ts',
      'e2e/coach-client-client.spec.ts',
      'e2e/coach-client-coach.spec.ts',
      'e2e/default-coach-assignment.spec.ts',
      'e2e/platform-webhook-runtime.spec.ts',
      'e2e/training-workout-cycle.spec.ts',
      'e2e/nutrition-daily-journal.spec.ts',
    ])
    expect(integrated).toHaveLength(12)
    expect(CRITICAL_E2E_TARGET_MATRIX.filter(journey => !journey.integrated)).toHaveLength(3)
    expect(CRITICAL_E2E_TARGET_MATRIX.find(journey => journey.spec === 'e2e/platform-webhook-runtime.spec.ts')).toMatchObject({
      name: 'Webhook Platform signé, rejeu et idempotence',
      flags: ['--stripe'],
      integrated: true,
    })
    expect(CRITICAL_E2E_TARGET_MATRIX.find(journey => journey.name === 'Cycle d’une séance Training')).toMatchObject({
      spec: 'e2e/training-workout-cycle.spec.ts',
      integrated: true,
    })
    expect(CRITICAL_E2E_TARGET_MATRIX.find(journey => journey.name === 'Journal nutritionnel quotidien')).toMatchObject({
      spec: 'e2e/nutrition-daily-journal.spec.ts',
      integrated: true,
    })
    expect(CRITICAL_E2E_TARGET_MATRIX.find(journey => journey.name === 'Suivi de progression')).toMatchObject({
      spec: null,
      integrated: false,
    })
    expect(CRITICAL_E2E_TARGET_MATRIX.every(journey => (
      !/performance|perf\//i.test(`${journey.name} ${journey.spec || ''}`)
    ))).toBe(true)
  })

  it('rejects malformed matrices before executing the canonical suite', () => {
    expect(() => validateCriticalE2eTargetMatrix(CRITICAL_E2E_TARGET_MATRIX.slice(0, 14))).toThrow('exactly 15')
    const duplicate = CRITICAL_E2E_TARGET_MATRIX.map((journey, index) => (
      index === 14 ? { ...journey, name: CRITICAL_E2E_TARGET_MATRIX[0].name } : journey
    ))
    expect(() => validateCriticalE2eTargetMatrix(duplicate)).toThrow('duplicate journey names')
  })
})
