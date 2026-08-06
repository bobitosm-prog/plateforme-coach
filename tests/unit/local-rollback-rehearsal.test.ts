import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MAX_ROLLBACK_DURATION_MS,
  PRIMARY_LOCAL_PORTS,
  REHEARSAL_EVENTS,
  assertDistinctArtifacts,
  assertLocalRehearsalUrl,
  assertPublicRehearsalReport,
  assertRehearsalConfig,
  assertSafeRehearsalArgs,
  createArtifactPlan,
  runLocalRollbackRehearsal,
} from '../../scripts/preproduction/run-local-rollback-rehearsal.mjs'

const scriptPath = resolve(
  process.cwd(),
  'scripts/preproduction/run-local-rollback-rehearsal.mjs',
)
const startedAt = '2026-08-06T20:00:00.000Z'
const completedAt = '2026-08-06T20:00:01.000Z'

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    environment: 'local',
    branch: 'phase-6-staging',
    rehearsalLabel: 'unit-rehearsal',
    incidentSha: '657313d',
    healthySha: '14d66de',
    port: 62310,
    stripeMode: 'test',
    productionAuthorized: false,
    approvals: { operator: true, approver: true, timer: true },
    schemaCompatibility: 'LOCAL_REBUILT_COMPATIBLE',
    migrationAlignmentVerdict: 'LOCAL_NOT_REQUIRED',
    requestedCommands: [],
    ...overrides,
  }
}

function fakeRuntime(options: Record<string, unknown> = {}) {
  let clock = 0
  let cleaned = false
  let incidentAlive = false
  const calls: string[] = []
  const advance = (name: string, fallback: number) => {
    clock += Number(options[name] ?? fallback)
  }
  const fail = (name: string) => {
    if (options.failAt === name) throw new Error(`SIMULATED_${name.toUpperCase()}_FAILURE`)
  }
  const runtime = {
    runnerPid: 9000,
    monotonicNow: () => clock,
    wallNow: (() => {
      const values = [startedAt, startedAt, completedAt]
      return () => values.shift() ?? completedAt
    })(),
    emitPlan: () => { calls.push('plan') },
    createTemporaryRoot: () => ({
      path: join(tmpdir(), 'moovx-rollback-unit-root'),
      id: 'moovx-rollback-unit-root',
    }),
    prepareArtifacts: (_root: unknown, incident: unknown, healthy: unknown) => {
      fail('prepare')
      calls.push('prepare')
      return { incident, healthy }
    },
    verifyArtifact: () => {
      fail('verify')
      calls.push('verify')
      return true
    },
    isPortOpen: async () => Boolean(options.portOpen),
    startService: (artifact: { kind: string }) => {
      fail(artifact.kind === 'incident' ? 'startIncident' : 'startHealthy')
      advance(artifact.kind === 'incident' ? 'startIncidentMs' : 'startHealthyMs', 2)
      calls.push(`start:${artifact.kind}`)
      if (artifact.kind === 'incident') incidentAlive = true
      return { pid: artifact.kind === 'incident' ? 9101 : 9102, kind: artifact.kind }
    },
    confirmIncident: async () => {
      fail('confirmIncident')
      advance('incidentConfirmationMs', 3)
      calls.push('confirmIncident')
      return true
    },
    stopService: async (handle: { kind: string }) => {
      fail(handle.kind === 'incident' ? 'stopIncident' : 'stopHealthy')
      advance('stopIncidentMs', handle.kind === 'incident' ? 2 : 0)
      calls.push(`stop:${handle.kind}`)
      if (handle.kind === 'incident') incidentAlive = false
    },
    isProcessAlive: () => incidentAlive,
    waitHealthy: async () => {
      fail('waitHealthy')
      advance('platformWaitMs', 4)
      calls.push('waitHealthy')
      return true
    },
    confirmServedSha: async () => {
      fail('confirmServedSha')
      advance('servedShaMs', 1)
      calls.push('confirmServedSha')
      return true
    },
    runSmokeTests: async () => {
      fail('smoke')
      advance('smokeMs', 5)
      calls.push('smoke')
      return {
        checks: [
          '/health',
          '/',
          '/sha',
          '/api/auth/health',
          '/api/rollback/read-only',
          '/api/media/private/health',
          '/api/billing/health',
        ],
        authMode: 'synthetic-local-no-fixture',
        criticalFiveHundreds: 0,
        syntheticDataCreated: 0,
      }
    },
    writeJournal: () => {
      fail('journal')
      advance('journalMs', 1)
      calls.push('journal')
      return true
    },
    cleanup: async ({ handles }: { handles: Array<{ kind: string }> }) => {
      calls.push('cleanup')
      for (const handle of handles) {
        if (handle.kind === 'incident') incidentAlive = false
      }
      cleaned = true
      if (options.cleanupFails) throw new Error('SIMULATED_CLEANUP_FAILURE')
      return true
    },
  }
  return {
    runtime,
    state: {
      calls,
      get cleaned() { return cleaned },
      get incidentAlive() { return incidentAlive },
    },
  }
}

function validPublicReport(overrides: Record<string, unknown> = {}) {
  return {
    rehearsalId: 'unit-rehearsal',
    environment: 'local-isolated',
    incidentSha: '657313d',
    healthySha: '14d66de',
    timings: {
      preflightMs: 1,
      incidentConfirmationMs: 2,
      rollbackActionMs: 3,
      platformWaitMs: 4,
      smokeTestsMs: 5,
      totalRollbackMs: 12,
    },
    startedAt,
    completedAt,
    events: [...REHEARSAL_EVENTS],
    ...overrides,
  }
}

describe('local rollback rehearsal', () => {
  it('completes the nominal rehearsal', async () => {
    const { runtime } = fakeRuntime()
    const report = await runLocalRollbackRehearsal(validConfig(), runtime)
    expect(report).toMatchObject({
      preflightDecision: 'READY',
      incidentConfirmed: true,
      rollbackSucceeded: true,
      servedShaConfirmed: true,
      smokeTestsPassed: true,
      underThirtyMinutes: true,
      cleanupComplete: true,
    })
  })

  it('stops when preflight is not READY', async () => {
    const { runtime, state } = fakeRuntime()
    await expect(runLocalRollbackRehearsal(validConfig({
      requestedCommands: ['git reset --hard HEAD^'],
    }), runtime)).rejects.toThrow('PREFLIGHT_NOT_READY:BLOCKED')
    expect(state.cleaned).toBe(true)
  })

  it('stops when the incident is not confirmed', async () => {
    const { runtime, state } = fakeRuntime({ failAt: 'confirmIncident' })
    await expect(runLocalRollbackRehearsal(validConfig(), runtime))
      .rejects.toThrow('SIMULATED_CONFIRMINCIDENT_FAILURE')
    expect(state.cleaned).toBe(true)
  })

  it('refuses identical artifact IDs', () => {
    const incident = createArtifactPlan('incident', '657313d')
    expect(() => assertDistinctArtifacts(incident, {
      ...createArtifactPlan('healthy', '14d66de'),
      artifactId: incident.artifactId,
    })).toThrow('ARTIFACT_ID_EQUAL')
  })

  it('refuses identical SHAs', () => {
    expect(() => assertRehearsalConfig(validConfig({ healthySha: '657313d' })))
      .toThrow('ARTIFACT_SHA_EQUAL')
  })

  it.each(PRIMARY_LOCAL_PORTS)('refuses primary port %i', port => {
    expect(() => assertRehearsalConfig(validConfig({ port })))
      .toThrow('PRIMARY_PORT_FORBIDDEN')
  })

  it('refuses a remote URL', () => {
    expect(() => assertLocalRehearsalUrl('https://example.invalid'))
      .toThrow('REMOTE_URL_FORBIDDEN')
  })

  it.each([
    [['--prod', '--input', '/tmp/rehearsal.json'], /--prod is forbidden/],
    [['--linked', '--input', '/tmp/rehearsal.json'], /--linked is forbidden/],
  ] as const)('refuses unsafe CLI argument %j', (args, expected) => {
    expect(() => assertSafeRehearsalArgs([...args])).toThrow(expected)
  })

  it('refuses Production environment', () => {
    expect(() => assertRehearsalConfig(validConfig({ environment: 'production' })))
      .toThrow('PRODUCTION_ENVIRONMENT_FORBIDDEN')
  })

  it('refuses Stripe live', () => {
    expect(() => assertRehearsalConfig(validConfig({ stripeMode: 'live' })))
      .toThrow('STRIPE_LIVE_FORBIDDEN')
  })

  it('refuses a non-temporary rehearsal root', async () => {
    const { runtime, state } = fakeRuntime()
    runtime.createTemporaryRoot = () => ({ path: process.cwd(), id: 'workspace' })
    await expect(runLocalRollbackRehearsal(validConfig(), runtime))
      .rejects.toThrow('NON_TEMPORARY_ROOT_FORBIDDEN')
    expect(state.cleaned).toBe(true)
  })

  it.each([
    ['startIncident', 'SIMULATED_STARTINCIDENT_FAILURE'],
    ['stopIncident', 'SIMULATED_STOPINCIDENT_FAILURE'],
    ['startHealthy', 'SIMULATED_STARTHEALTHY_FAILURE'],
    ['confirmServedSha', 'SIMULATED_CONFIRMSERVEDSHA_FAILURE'],
    ['smoke', 'SIMULATED_SMOKE_FAILURE'],
  ])('cleans up after %s failure', async (failAt, message) => {
    const { runtime, state } = fakeRuntime({ failAt })
    await expect(runLocalRollbackRehearsal(validConfig(), runtime)).rejects.toThrow(message)
    expect(state.cleaned).toBe(true)
    expect(state.incidentAlive).toBe(false)
  })

  it('fails when total duration reaches thirty minutes', async () => {
    const { runtime, state } = fakeRuntime({ smokeMs: MAX_ROLLBACK_DURATION_MS })
    await expect(runLocalRollbackRehearsal(validConfig(), runtime))
      .rejects.toThrow('ROLLBACK_DURATION_TARGET_MISSED')
    expect(state.cleaned).toBe(true)
  })

  it('refuses an incomplete smoke-test contract', async () => {
    const { runtime, state } = fakeRuntime()
    runtime.runSmokeTests = async () => ({
      checks: ['/health'],
      authMode: 'synthetic-local-no-fixture',
      criticalFiveHundreds: 0,
      syntheticDataCreated: 0,
    })
    await expect(runLocalRollbackRehearsal(validConfig(), runtime))
      .rejects.toThrow('REQUIRED_SMOKE_TESTS_INCOMPLETE')
    expect(state.cleaned).toBe(true)
  })

  it('rejects a negative duration', () => {
    expect(() => assertPublicRehearsalReport(validPublicReport({
      timings: { ...validPublicReport().timings, rollbackActionMs: -1 },
    }))).toThrow('INVALID_REHEARSAL_DURATION')
  })

  it('cleans up after success', async () => {
    const { runtime, state } = fakeRuntime()
    await runLocalRollbackRehearsal(validConfig(), runtime)
    expect(state.cleaned).toBe(true)
    expect(state.calls.at(-1)).toBe('cleanup')
  })

  it('cleans up after journal failure', async () => {
    const { runtime, state } = fakeRuntime({ failAt: 'journal' })
    await expect(runLocalRollbackRehearsal(validConfig(), runtime))
      .rejects.toThrow('SIMULATED_JOURNAL_FAILURE')
    expect(state.cleaned).toBe(true)
  })

  it('leaves no incident process after rollback', async () => {
    const { runtime, state } = fakeRuntime()
    const report = await runLocalRollbackRehearsal(validConfig(), runtime)
    expect(report.incidentProcessStopped).toBe(true)
    expect(state.incidentAlive).toBe(false)
  })

  it('rejects secrets and personal paths in the public report', () => {
    expect(() => assertPublicRehearsalReport(validPublicReport({
      unexpected: 'token=synthetic-sensitive-value',
    }))).toThrow('REPORT_SECRET_DETECTED')
    expect(() => assertPublicRehearsalReport(validPublicReport({
      unexpected: '/Users/operator/private',
    }))).toThrow('REPORT_PERSONAL_PATH_DETECTED')
  })

  it('keeps a stable event order', async () => {
    const { runtime } = fakeRuntime()
    const report = await runLocalRollbackRehearsal(validConfig(), runtime)
    expect(report.events).toEqual(REHEARSAL_EVENTS)
  })

  it('has no remote network client', () => {
    const source = readFileSync(scriptPath, 'utf8')
    expect(source).not.toMatch(/node:(?:https|tls)/)
    expect(source).not.toMatch(/https:\/\//)
    expect(source).toContain("const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])")
    expect(source).toContain('assertLocalRehearsalUrl(target.href)')
  })

  it('does not load dotenv or implicit environment files', () => {
    const source = readFileSync(scriptPath, 'utf8')
    expect(source).not.toMatch(/dotenv|readFileSync\([^)]*\.env/)
  })

  it('does not read process.env for secrets', () => {
    const source = readFileSync(scriptPath, 'utf8')
    expect(source).not.toMatch(/process\.env/)
  })

  it('uses a monotonic clock for durations', () => {
    const source = readFileSync(scriptPath, 'utf8')
    expect(source).toContain("from 'node:perf_hooks'")
    expect(source).toContain('monotonicNow: () => performance.now()')
  })

  it('returns no personal path in a nominal report', async () => {
    const { runtime } = fakeRuntime()
    const report = await runLocalRollbackRehearsal(validConfig(), runtime)
    expect(JSON.stringify(report)).not.toMatch(/\/(?:Users|home)\//)
  })

  it('produces deterministic immutable artifact identities', () => {
    const first = createArtifactPlan('healthy', '14d66de')
    const second = createArtifactPlan('healthy', '14d66de')
    const incident = createArtifactPlan('incident', '657313d')
    expect(first).toEqual(second)
    expect(first.artifactId).not.toBe(incident.artifactId)
    expect(first.inventoryHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('refuses an already occupied rehearsal port', async () => {
    const { runtime, state } = fakeRuntime({ portOpen: true })
    await expect(runLocalRollbackRehearsal(validConfig(), runtime))
      .rejects.toThrow('REHEARSAL_PORT_IN_USE')
    expect(state.cleaned).toBe(true)
  })

  it('fails when cleanup itself cannot be confirmed', async () => {
    const { runtime } = fakeRuntime({ cleanupFails: true })
    await expect(runLocalRollbackRehearsal(validConfig(), runtime))
      .rejects.toThrow('SIMULATED_CLEANUP_FAILURE')
  })
})
