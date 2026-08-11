import { describe, expect, it, vi } from 'vitest'
import {
  correlateTargetedLoadSamples,
  createBoundedResourceSampler,
  createTargetedLoadServerCollector,
  parseTargetedLoadServerEvent,
} from '../../scripts/performance/targeted-load-observability.mjs'

function serverEvent(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    timestamp: '2026-08-11T12:00:00.000Z',
    event: 'FEEDBACK_READ_REQUEST',
    operation: 'GET /api/feedback/mine',
    outcome: 'success',
    status: 200,
    request_id: 'load-test.000001',
    duration_ms: 20,
    ...overrides,
  })
}

describe('targeted load local observability', () => {
  it('accepts only the allowlisted structured route event', () => {
    expect(parseTargetedLoadServerEvent(serverEvent())).toEqual({
      timestamp: '2026-08-11T12:00:00.000Z',
      event: 'FEEDBACK_READ_REQUEST',
      operation: 'GET /api/feedback/mine',
      outcome: 'success',
      requestId: 'load-test.000001',
      durationMs: 20,
      status: 200,
    })
    expect(parseTargetedLoadServerEvent('not json')).toBeNull()
    expect(parseTargetedLoadServerEvent(serverEvent({ operation: 'GET /api/admin' }))).toBeNull()
    expect(parseTargetedLoadServerEvent(serverEvent({ request_id: 'short' }))).toBeNull()
  })

  it('never retains sensitive or unknown server fields', () => {
    const parsed = parseTargetedLoadServerEvent(serverEvent({
      cookie: 'session=private',
      authorization: 'Bearer private',
      context: { password: 'private', service_role: 'private' },
    }))
    expect(JSON.stringify(parsed)).not.toMatch(/session|Bearer|password|service_role|private/)
    expect(parsed).not.toHaveProperty('context')
  })

  it('stops an in-memory bounded collector without creating log files', () => {
    const collector = createTargetedLoadServerCollector({ maxEvents: 1 })
    expect(collector.ingest(serverEvent())).toBe(true)
    expect(() => collector.ingest(serverEvent({ request_id: 'load-test.000002' }))).toThrow(
      'TARGETED_LOAD_SERVER_EVENT_LIMIT_EXCEEDED',
    )
    collector.stop()
    expect(collector.isActive()).toBe(false)
    expect(collector.ingest(serverEvent({ request_id: 'load-test.000003' }))).toBe(false)
    expect(collector.snapshot()).toHaveLength(1)
  })

  it('correlates client/server latency and keeps descriptive slow-request evidence', () => {
    const samples = [
      { timestamp: '2026-08-11T12:00:00.100Z', phase: 'low', requestId: 'load-test.000001', status: 200, durationMs: 25 },
      { timestamp: '2026-08-11T12:00:00.200Z', phase: 'plateau', requestId: 'load-test.000002', status: 200, durationMs: 80 },
    ]
    const events = [
      parseTargetedLoadServerEvent(serverEvent()),
      parseTargetedLoadServerEvent(serverEvent({ request_id: 'load-test.000002', duration_ms: 50 })),
    ].filter((event): event is NonNullable<typeof event> => event !== null)

    const report = correlateTargetedLoadSamples(samples, events)
    expect(report).toMatchObject({
      complete: true,
      attempted: 2,
      correlated: 2,
      client: { p50Ms: 25, p95Ms: 80, p99Ms: 80 },
      server: { p50Ms: 20, p95Ms: 50, p99Ms: 50 },
      overhead: { p50Ms: 5, p95Ms: 30, p99Ms: 30 },
    })
    expect(report.topSlowest[0]).toMatchObject({
      phase: 'plateau',
      requestId: 'load-test.000002',
      clientDurationMs: 80,
      serverDurationMs: 50,
      overheadMs: 30,
    })
    expect(report.byPhase.plateau.server.p95Ms).toBe(50)
  })

  it('reports missing correlations instead of manufacturing server measurements', () => {
    const report = correlateTargetedLoadSamples([
      { timestamp: '2026-08-11T12:00:00.100Z', phase: 'low', requestId: 'load-test.000099', status: 200, durationMs: 25 },
    ], [])
    expect(report.complete).toBe(false)
    expect(report.correlated).toBe(0)
    expect(report.server.p95Ms).toBeNull()
    expect(report.missingRequestIds).toEqual(['load-test.000099'])
  })

  it('stops bounded resource sampling on every orchestrator cleanup path', async () => {
    const sample = vi.fn().mockResolvedValue({ observedAt: 'now', next: { rssBytes: 1 } })
    const sampler = createBoundedResourceSampler({
      sample,
      intervalMs: 1_000,
      maxSamples: 2,
    })
    await sampler.start()
    await sampler.stop()
    expect(sampler.isActive()).toBe(false)
    expect(sample).toHaveBeenCalledOnce()
    expect(sampler.snapshot()).toHaveLength(1)
  })
})
