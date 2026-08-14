import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { CoachTemplateStagingAssessmentReport } from '../../lib/training/coexistence/coach-template-staging-assessment-runner'
import {
  COACH_TEMPLATE_REAL_CORPUS_VALIDATED,
  COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
  COACH_TEMPLATE_ROLLOUT_WARNING_RATE_THRESHOLD,
  COACH_TEMPLATE_TECHNICAL_STAGING_GO,
  evaluateCoachTemplateRealCorpusValidation,
  evaluateCoachTemplateTechnicalStagingGo,
} from '../../lib/training/coexistence/coach-template-technical-staging-go-contract'

const target = {
  applicationEnvironment: 'staging',
  deploymentEnvironment: 'preview',
  branch: 'phase-6-staging',
  projectRef: 'cycbnnojcymjnaqomlyj',
}

const report = (
  run: number,
  overrides: Partial<CoachTemplateStagingAssessmentReport> = {},
): CoachTemplateStagingAssessmentReport => ({
  assessment_run_id: `opaque-run-${run}`,
  page_count: 1,
  total_line_count: 17,
  canonical_eligible: 17,
  warning: 0,
  critical_mismatch: 0,
  unsupported: 0,
  presentation_mismatch: 0,
  adaptation_error: 0,
  observer_error: 0,
  warning_rate: 0,
  terminal_page_reached: true,
  ...overrides,
})

const successfulReports = () => [report(1), report(2), report(3)]
const cleanupProof = { beforeCreate: 0, afterCreate: 17, afterCleanup: 0 }

describe('coach-template technical staging GO contract', () => {
  it('recognizes the validated 3-run/51-observation fixture proof only as a technical staging GO', () => {
    const decision = evaluateCoachTemplateTechnicalStagingGo({
      target,
      reports: successfulReports(),
      fixtureCleanupProof: cleanupProof,
    })
    expect(decision).toEqual({
      technicalStatus: COACH_TEMPLATE_TECHNICAL_STAGING_GO,
      realCorpusStatus: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
      productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
      reasons: [],
      evidence: {
        runCount: 3,
        totalObservations: 51,
        warningRate: 0,
        fullCorpusRepeatedThreeTimes: true,
        fixtureCleanupComplete: true,
      },
    })
  })

  it('requires the exact staging target and exact 0 -> 17 -> 0 cleanup proof', () => {
    const production = evaluateCoachTemplateTechnicalStagingGo({
      target: { ...target, deploymentEnvironment: 'production', projectRef: 'njlzossopgknanhkzcbk' },
      reports: successfulReports(),
      fixtureCleanupProof: cleanupProof,
    })
    expect(production.technicalStatus).toBe('TECHNICAL_STAGING_NO_GO')
    expect(production.realCorpusStatus).toBe(COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING)
    expect(production.productionPromotion).toBe('PRODUCTION_PROMOTION_FORBIDDEN')
    expect(production.reasons).toContain('STAGING_TARGET_REJECTED')

    for (const proof of [
      { beforeCreate: 1, afterCreate: 17, afterCleanup: 0 },
      { beforeCreate: 0, afterCreate: 16, afterCleanup: 0 },
      { beforeCreate: 0, afterCreate: 17, afterCleanup: 1 },
    ]) {
      expect(evaluateCoachTemplateTechnicalStagingGo({
        target,
        reports: successfulReports(),
        fixtureCleanupProof: proof,
      }).reasons).toContain('FIXTURE_CLEANUP_PROOF_INVALID')
    }
  })

  it.each([
    ['three runs', successfulReports().slice(0, 2), 'RUN_COUNT_NOT_THREE'],
    ['distinct run ids', successfulReports().map(item => ({ ...item, assessment_run_id: 'same' })), 'RUN_IDS_NOT_DISTINCT'],
    ['complete runs', successfulReports().map(item => ({ ...item, terminal_page_reached: false })), 'RUN_NOT_COMPLETE'],
    ['eligible line per run', successfulReports().map(item => ({ ...item, canonical_eligible: 0, unsupported: 17 })), 'CANONICAL_ELIGIBLE_MISSING'],
    ['zero critical mismatch', successfulReports().map(item => ({ ...item, canonical_eligible: 16, critical_mismatch: 1 })), 'CRITICAL_MISMATCH_PRESENT'],
    ['zero unsupported', successfulReports().map(item => ({ ...item, canonical_eligible: 16, unsupported: 1 })), 'UNSUPPORTED_PRESENT'],
    ['zero presentation mismatch', successfulReports().map(item => ({ ...item, canonical_eligible: 16, presentation_mismatch: 1 })), 'PRESENTATION_MISMATCH_PRESENT'],
    ['zero adaptation error', successfulReports().map(item => ({ ...item, canonical_eligible: 16, adaptation_error: 1 })), 'ADAPTATION_ERROR_PRESENT'],
    ['zero observer error', successfulReports().map(item => ({ ...item, observer_error: 1 })), 'OBSERVER_ERROR_PRESENT'],
  ] as const)('rejects technical GO without %s', (_label, reports, expectedReason) => {
    const decision = evaluateCoachTemplateTechnicalStagingGo({ target, reports, fixtureCleanupProof: cleanupProof })
    expect(decision.technicalStatus).toBe('TECHNICAL_STAGING_NO_GO')
    expect(decision.reasons).toContain(expectedReason)
  })

  it('accepts at least 50 observations or three repetitions of the complete smaller corpus', () => {
    const smallCorpus = [1, 2, 3].map(run => report(run, {
      total_line_count: 2,
      canonical_eligible: 2,
    }))
    const realDecision = evaluateCoachTemplateRealCorpusValidation({
      target,
      nonFixtureTemplateCount: 2,
      reports: smallCorpus,
    })
    expect(realDecision.status).toBe(COACH_TEMPLATE_REAL_CORPUS_VALIDATED)
    expect(realDecision.productionPromotion).toBe('PRODUCTION_PROMOTION_NOT_AUTHORIZED_BY_THIS_CONTRACT')

    const incomplete = smallCorpus.map(item => ({ ...item, total_line_count: 1, canonical_eligible: 1 }))
    expect(evaluateCoachTemplateRealCorpusValidation({
      target,
      nonFixtureTemplateCount: 2,
      reports: incomplete,
    }).reasons).toContain('BASELINE_INSUFFICIENT')
  })

  it('enforces the existing five-percent warning threshold', () => {
    expect(COACH_TEMPLATE_ROLLOUT_WARNING_RATE_THRESHOLD).toBe(0.05)
    const warningsAboveThreshold = successfulReports().map(item => ({
      ...item,
      canonical_eligible: 16,
      warning: 1,
      warning_rate: 1 / 17,
    }))
    const decision = evaluateCoachTemplateTechnicalStagingGo({
      target,
      reports: warningsAboveThreshold,
      fixtureCleanupProof: cleanupProof,
    })
    expect(decision.reasons).toContain('WARNING_RATE_ABOVE_THRESHOLD')
  })

  it('keeps real validation pending until an organic template is assessed successfully', () => {
    expect(evaluateCoachTemplateRealCorpusValidation({
      target,
      nonFixtureTemplateCount: 0,
    })).toEqual({
      status: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
      nextAction: 'WAIT_FOR_ORGANIC_TEMPLATE',
      productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
      reasons: [],
    })
    expect(evaluateCoachTemplateRealCorpusValidation({
      target,
      nonFixtureTemplateCount: 1,
    })).toMatchObject({
      status: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
      nextAction: 'RUN_READ_ONLY_ASSESSMENT',
      productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
    })
    const failed = [1, 2, 3].map(run => report(run, {
      total_line_count: 1,
      canonical_eligible: 0,
      unsupported: 1,
    }))
    expect(evaluateCoachTemplateRealCorpusValidation({
      target,
      nonFixtureTemplateCount: 1,
      reports: failed,
    })).toMatchObject({
      status: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
      nextAction: 'REMEDIATE_AND_RERUN_READ_ONLY_ASSESSMENT',
      productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
    })
  })

  it('has no database, environment, UI or runtime activation boundary', () => {
    const source = readFileSync(
      'lib/training/coexistence/coach-template-technical-staging-go-contract.ts',
      'utf8',
    )
    const repository = readFileSync('lib/repositories/training/program.ts', 'utf8')
    const hook = readFileSync('app/coach/hooks/useCoachProgramPagination.ts', 'utf8')
    expect(source).not.toMatch(/\bfetch\(|createClient|\b(?:client|supabase)\.from\(|process\.env|VERCEL_ENV/)
    expect(source).not.toMatch(/coach_id|user_id|program_name|payload|cursor|email/i)
    expect(repository).not.toContain('coach-template-technical-staging-go-contract')
    expect(hook).not.toContain('coach-template-technical-staging-go-contract')
  })
})
