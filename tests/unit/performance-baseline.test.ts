import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { classifyLocalRequest, stableJson, summarizeNumbers, summarizeRequests } from '../../lib/performance/baseline'

describe('performance baseline contracts', () => {
  it('classifies local request boundaries and excludes static assets from application totals', () => {
    const samples = [
      ['http://127.0.0.1:55321/auth/v1/token', 'fetch'],
      ['http://127.0.0.1:55321/rest/v1/profiles', 'fetch'],
      ['ws://127.0.0.1:55321/realtime/v1/websocket', 'websocket'],
      ['http://127.0.0.1:3211/api/vitals', 'fetch'],
      ['http://127.0.0.1:3211/', 'document'],
      ['http://127.0.0.1:3211/_next/static/chunk.js', 'script'],
      ['http://127.0.0.1:3211/_next/static/app.css', 'stylesheet'],
      ['http://127.0.0.1:3211/_next/static/font.woff2', 'font'],
      ['http://127.0.0.1:3211/photo.webp', 'image'],
    ] as const
    const classified = samples.map(([url, type]) => ({ category: classifyLocalRequest(url, type), resourceType: type }))
    expect(classified.map(sample => sample.category)).toEqual(['auth', 'postgrest', 'realtime', 'next-api', 'document', 'javascript', 'css', 'font', 'image-media'])
    expect(summarizeRequests(classified)).toMatchObject({ total: 9, application: 5 })
  })

  it('summarizes three raw values without mutating them', () => {
    const values = Object.freeze([30, 10, 20])
    expect(summarizeNumbers(values)).toEqual({ values: [30, 10, 20], min: 10, median: 20, max: 30 })
    expect(values).toEqual([30, 10, 20])
  })

  it('serializes object keys deterministically', () => {
    expect(stableJson({ z: 1, a: { d: 2, b: 1 } })).toBe('{\n  "a": {\n    "b": 1,\n    "d": 2\n  },\n  "z": 1\n}\n')
  })

  it.each(['phase-8-baseline-run-1.json', 'phase-8-baseline-run-2.json'])('validates the sanitized production artifact %s', file => {
    const source = readFileSync(`perf/baseline/${file}`, 'utf8')
    const artifact = JSON.parse(source) as {
      environment: { buildId: string; network: string }
      bundle: { globalDeduplicated: { totals: { rawBytes: number; gzipBytes: number } } }
      journeys: Record<string, { runs: Array<{ vitals: { lcp: number; inp: number; cls: number }; requests: { total: number; application: number } }> }>
    }
    expect(artifact.environment.buildId).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(artifact.environment.network).toContain('localhost-only')
    expect(artifact.bundle.globalDeduplicated.totals.rawBytes).toBeGreaterThan(artifact.bundle.globalDeduplicated.totals.gzipBytes)
    expect(Object.keys(artifact.journeys)).toEqual(['clientMobile', 'coachDesktop'].sort())
    for (const journey of Object.values(artifact.journeys)) {
      expect(journey.runs).toHaveLength(3)
      for (const run of journey.runs) {
        expect(run.vitals).toMatchObject({ lcp: expect.any(Number), inp: expect.any(Number), cls: expect.any(Number) })
        expect(run.requests.total).toBeGreaterThanOrEqual(run.requests.application)
      }
    }
    expect(source).not.toMatch(/eyJ[A-Za-z0-9_-]+\.|service[_-]?role|@[A-Za-z0-9.-]+\.(?:com|ch)|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
  })
})
