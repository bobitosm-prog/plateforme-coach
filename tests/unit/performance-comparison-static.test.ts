import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const files = [
  'lib/performance/comparison/types.ts',
  'lib/performance/comparison/validation.ts',
  'lib/performance/comparison/compare.ts',
  'lib/performance/comparison/index.ts',
]
const source = files.map(path => readFileSync(path, 'utf8')).join('\n')
const cli = readFileSync('scripts/compare-performance-runs.ts', 'utf8')
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }

describe('performance comparison architecture', () => {
  it('keeps the comparator pure and independent from runtime frameworks', () => {
    for (const forbidden of ["from 'react", "from 'next/", "from '@supabase", "from '@playwright", "from 'node:child_process", 'fetch(']) {
      expect(source).not.toContain(forbidden)
    }
  })

  it('pins exactly two immutable before and two explicit after runs', () => {
    expect(cli).toContain("'perf/baseline/phase-8-baseline-run-1.json'")
    expect(cli).toContain("'perf/baseline/phase-8-baseline-run-2.json'")
    expect(cli).toContain("'perf/baseline/phase-8-after-validation-run-1.json'")
    expect(cli).toContain("'perf/baseline/phase-8-after-validation-run-2.json'")
    expect(packageJson.scripts['perf:compare']).toBe('node scripts/compare-performance-runs.ts')
  })

  it('exposes the required reusable API and discriminated states', () => {
    expect(source).toContain('validateComparisonArtifact')
    expect(source).toContain('compareMetricSeries')
    expect(source).toContain('comparePerformanceRuns')
    expect(source).toContain("status: 'comparable'")
    expect(source).toContain("status: 'unavailable'")
    expect(source).toContain("status: 'invalid'")
  })
})
