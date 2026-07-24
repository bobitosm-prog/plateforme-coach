import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  analyzeInpDiagnosticMatrix,
  INP_DIAGNOSTIC_EXPERIMENTS,
  type InpDiagnosticMatrix,
} from '../../lib/performance/inp-diagnostic'

function experiment(duration: number, presentationDelay: number, resources: string[] = []) {
  return {
    journeys: {
      clientMobile: {
        runs: [{
          vitals: {
            inp: duration,
            interactions: [{
              eventType: 'click',
              step: 'client:training',
              duration,
              inputDelay: 1,
              processingDuration: 5,
              presentationDelay,
              associatedResources: resources.map(resourceCode => ({
                kind: 'javascript',
                resourceCode,
                transferSize: 1,
              })),
            }],
          },
        }],
      },
    },
  }
}

function matrix(): InpDiagnosticMatrix {
  return {
    schemaVersion: 1,
    buildId: 'synthetic-build',
    experiments: {
      'A1-canonical-cold': experiment(48, 42, ['/chunks/a.js']),
      'A2-canonical-cold': experiment(48, 42, ['/chunks/a.js']),
      'A3-canonical-cold': experiment(48, 42, ['/chunks/a.js']),
      'B-preloaded-chunks': experiment(48, 42),
      'C-cache-hot': experiment(32, 26),
      'D-images-blocked': experiment(48, 42, ['/chunks/a.js']),
      'E-tracing': experiment(48, 42, ['/chunks/a.js']),
    },
  }
}

describe('INP causal diagnostic', () => {
  it('classifies the bounded cold-render evidence without mutating inputs', () => {
    const input = matrix()
    const before = structuredClone(input)
    const result = analyzeInpDiagnosticMatrix(input)

    expect(result.verdict).toBe('render_presentation_regression')
    expect(result.canonicalInp).toEqual([48, 48, 48])
    expect(result.training['C-cache-hot'].duration).toBe(32)
    expect(input).toEqual(before)
  })

  it('stays inconclusive when the cache-hot control does not improve', () => {
    const input = matrix()
    input.experiments['C-cache-hot'] = experiment(48, 42)
    expect(analyzeInpDiagnosticMatrix(input).verdict).toBe('inconclusive')
  })

  it('classifies variance only from three predeclared canonical controls', () => {
    const input = matrix()
    input.experiments['A1-canonical-cold'] = experiment(64, 58, ['/chunks/a.js'])
    expect(analyzeInpDiagnosticMatrix(input).verdict).toBe('environment_variance')
  })

  it('requires every predeclared experiment and finite measurements', () => {
    const input = matrix()
    delete (input.experiments as Partial<InpDiagnosticMatrix['experiments']>)['E-tracing']
    expect(() => analyzeInpDiagnosticMatrix(input)).toThrow('MISSING_DIAGNOSTIC_EXPERIMENT')

    const invalid = matrix()
    invalid.experiments['A1-canonical-cold'].journeys.clientMobile.runs[0]!.vitals.inp = Number.NaN
    expect(() => analyzeInpDiagnosticMatrix(invalid)).toThrow('CANONICAL_INP_UNAVAILABLE')
    expect(INP_DIAGNOSTIC_EXPERIMENTS).toHaveLength(7)
  })

  it('classifies the committed expurgated causal matrix', () => {
    const input = JSON.parse(
      readFileSync('perf/diagnostics/phase-8-inp-causal-matrix.json', 'utf8'),
    ) as InpDiagnosticMatrix
    const result = analyzeInpDiagnosticMatrix(input)

    expect(result.buildId).toBe('liZGGbdmUy5CIamKf7QPu')
    expect(result.canonicalInp).toEqual([48, 32, 48])
    expect(result.verdict).toBe('environment_variance')
  })
})
