import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const spec = readFileSync('e2e/performance-baseline.spec.ts', 'utf8')
const runner = readFileSync('scripts/run-performance-baseline.ts', 'utf8')
const model = readFileSync('lib/performance/inp-diagnostic.ts', 'utf8')

describe('INP diagnostic architecture', () => {
  it('keeps diagnostics opt-in and predeclares all causal controls', () => {
    expect(spec).toContain("process.env.MOOVX_DIAGNOSTIC_CLIENT_ONLY === '1'")
    expect(runner).toContain("'A1-canonical-cold'")
    expect(runner).toContain("'A2-canonical-cold'")
    expect(runner).toContain("'A3-canonical-cold'")
    expect(runner).toContain("'B-preloaded-chunks'")
    expect(runner).toContain("'C-cache-hot'")
    expect(runner).toContain("'D-images-blocked'")
    expect(runner).toContain("'E-tracing'")
  })

  it('keeps the pure analyzer outside runtime frameworks', () => {
    for (const forbidden of ['react', 'next/', '@supabase', 'playwright', 'window.', 'document.']) {
      expect(model).not.toContain(forbidden)
    }
  })

  it('cleans the temporary trace and does not rewrite normative baselines', () => {
    expect(runner).toContain('rmSync(traceOutputPath')
    expect(runner).not.toContain('phase-8-after-run-1.json')
    expect(runner).not.toContain('phase-8-after-run-2.json')
  })
})
