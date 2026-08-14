import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const contract = readFileSync(
  resolve(root, 'docs/WEEKLY_DIAGNOSTIC_PERFORMANCE_BASELINE.md'),
  'utf8',
)
const service = readFileSync(resolve(root, 'app/api/weekly-diagnostic/service.ts'), 'utf8')
const generator = readFileSync(resolve(root, 'lib/weekly-diagnostic/generator.ts'), 'utf8')

const eventKeys = [
  'request_id',
  'result',
  'reason',
  'server_total_ms',
  'source_reads_ms',
  'analysis_ms',
  'ai_provider_ms',
  'persistence_ms',
  'application_overhead_ms',
] as const

describe('weekly diagnostic performance baseline contract', () => {
  it('pins the exact existing redacted event schema and opaque HTTP correlation', () => {
    for (const key of eventKeys) {
      expect(contract).toContain(key)
      expect(`${service}\n${generator}`).toContain(key)
    }
    expect(contract).toContain('WEEKLY_DIAGNOSTIC_REQUEST')
    expect(contract).toContain('POST /api/weekly-diagnostic')
    expect(contract).toContain('égalité stricte de')
    expect(contract).toContain('clé de corrélation opaque temporaire')
  })

  it('requires bounded finite durations and exact phase decomposition', () => {
    expect(contract).toContain('86 400 000 ms')
    expect(contract).toContain('classified_ms <= server_total_ms')
    expect(contract).toMatch(
      /server_total_ms =\s+source_reads_ms\s+\+ analysis_ms\s+\+ ai_provider_ms\s+\+ persistence_ms\s+\+ application_overhead_ms/,
    )
    expect(contract).toContain('nombres finis')
    expect(contract).toMatch(/supérieurs ou égaux à\s+zéro/)
    expect(service).toContain('const MAX_DURATION_MS = 86_400_000')
  })

  it('defines nearest-rank aggregation without mixing incomplete result cohorts', () => {
    for (const percentile of ['ceil(0,50 × n)', 'ceil(0,95 × n)', 'ceil(0,99 × n)']) {
      expect(contract).toContain(percentile)
    }
    expect(contract).toContain('UNAVAILABLE_INSUFFICIENT_SAMPLE')
    expect(contract).toContain('result=success/reason=COMPLETED')
    expect(contract).toContain('ne sont jamais mélangées aux succès complets')
  })

  it('defines an immutable non-production baseline and reproducible comparison', () => {
    expect(contract).toContain('14 jours UTC consécutifs')
    expect(contract).toContain('50 lignes')
    expect(contract).toContain('au moins 100 lignes')
    expect(contract).toContain('SHA-256')
    expect(contract).toContain("Une baseline acceptée n'est jamais réécrite")
    expect(contract).toContain('Aucune collecte ou comparaison Production')
    expect(contract).toContain('BASELINE_NOT_CAPTURED')
  })

  it('keeps numeric regression thresholds explicitly proposed and non-binding', () => {
    expect(contract.match(/PROPOSITION_NON_VALIDÉE/g)?.length).toBeGreaterThanOrEqual(3)
    expect(contract).toMatch(/ni\s+un budget, ni un seuil d'arrêt/)
    for (const phase of [
      'server_total_ms',
      'source_reads_ms',
      'persistence_ms',
      'ai_provider_ms',
      'application_overhead_ms',
      "taux d'erreur",
    ]) expect(contract).toContain(phase)
    expect(contract).toContain('VALIDATED_REGRESSION_THRESHOLD')
  })

  it('fails closed on pairing, duplication, decomposition and distribution anomalies', () => {
    for (const anomaly of [
      'INCOMPLETE_EVENT',
      'DUPLICATE_PERFORMANCE_REQUEST_ID',
      'DUPLICATE_HTTP_REQUEST_ID',
      'PHASE_EXCEEDS_TOTAL',
      'DURATION_DECOMPOSITION_MISMATCH',
      'HTTP_WITHOUT_PERFORMANCE',
      'PERFORMANCE_WITHOUT_HTTP',
      'RESULT_REASON_MISMATCH',
      'UNEXPECTED_DISTRIBUTION_CHANGE',
      'COMPARISON_INTEGRITY_FAILED',
    ]) expect(contract).toContain(anomaly)
  })

  it('forbids personal or business data in aggregates and application storage', () => {
    expect(contract).toContain('Aucun agrégat ne contient')
    expect(contract).toContain('donnée personnelle')
    expect(contract).toContain('ne sont jamais écrits en base')
    expect(contract).toContain("sans conserver l'export brut")
  })
})
