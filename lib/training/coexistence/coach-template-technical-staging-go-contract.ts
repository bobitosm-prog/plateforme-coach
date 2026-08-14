import type { CoachTemplateStagingAssessmentReport } from '@/lib/training/coexistence/coach-template-staging-assessment-runner'

export const COACH_TEMPLATE_TECHNICAL_STAGING_GO = 'TECHNICAL_STAGING_GO' as const
export const COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING = 'REAL_CORPUS_VALIDATION_PENDING' as const
export const COACH_TEMPLATE_REAL_CORPUS_VALIDATED = 'REAL_CORPUS_VALIDATED' as const
export const COACH_TEMPLATE_ROLLOUT_WARNING_RATE_THRESHOLD = 0.05
export const COACH_TEMPLATE_TECHNICAL_FIXTURE_SIZE = 17

const STAGING_PROJECT_REF = 'cycbnnojcymjnaqomlyj'
const PRODUCTION_PROJECT_REF = 'njlzossopgknanhkzcbk'

export type CoachTemplateTechnicalStagingTarget = {
  readonly applicationEnvironment: string
  readonly deploymentEnvironment: string
  readonly branch: string
  readonly projectRef: string
}

export type CoachTemplateFixtureCleanupProof = {
  readonly beforeCreate: number
  readonly afterCreate: number
  readonly afterCleanup: number
}

export type CoachTemplateTechnicalStagingGoReason =
  | 'STAGING_TARGET_REJECTED'
  | 'RUN_COUNT_NOT_THREE'
  | 'RUN_IDS_NOT_DISTINCT'
  | 'RUN_NOT_COMPLETE'
  | 'REPORT_COUNTERS_INCONSISTENT'
  | 'BASELINE_INSUFFICIENT'
  | 'CANONICAL_ELIGIBLE_MISSING'
  | 'CRITICAL_MISMATCH_PRESENT'
  | 'UNSUPPORTED_PRESENT'
  | 'PRESENTATION_MISMATCH_PRESENT'
  | 'ADAPTATION_ERROR_PRESENT'
  | 'OBSERVER_ERROR_PRESENT'
  | 'WARNING_RATE_ABOVE_THRESHOLD'
  | 'FIXTURE_CLEANUP_PROOF_INVALID'

export type CoachTemplateTechnicalStagingGoDecision = {
  readonly technicalStatus: typeof COACH_TEMPLATE_TECHNICAL_STAGING_GO | 'TECHNICAL_STAGING_NO_GO'
  readonly realCorpusStatus: typeof COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING
  readonly productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN'
  readonly reasons: readonly CoachTemplateTechnicalStagingGoReason[]
  readonly evidence: {
    readonly runCount: number
    readonly totalObservations: number
    readonly warningRate: number
    readonly fullCorpusRepeatedThreeTimes: boolean
    readonly fixtureCleanupComplete: boolean
  }
}

export type CoachTemplateRealCorpusValidationDecision = {
  readonly status:
    | typeof COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING
    | typeof COACH_TEMPLATE_REAL_CORPUS_VALIDATED
  readonly nextAction:
    | 'WAIT_FOR_ORGANIC_TEMPLATE'
    | 'RUN_READ_ONLY_ASSESSMENT'
    | 'REMEDIATE_AND_RERUN_READ_ONLY_ASSESSMENT'
    | 'NONE'
  readonly productionPromotion:
    | 'PRODUCTION_PROMOTION_FORBIDDEN'
    | 'PRODUCTION_PROMOTION_NOT_AUTHORIZED_BY_THIS_CONTRACT'
  readonly reasons: readonly CoachTemplateTechnicalStagingGoReason[]
}

const isExactStagingTarget = (target: CoachTemplateTechnicalStagingTarget): boolean => (
  target.applicationEnvironment === 'staging'
  && target.deploymentEnvironment === 'preview'
  && target.branch === 'phase-6-staging'
  && target.projectRef !== PRODUCTION_PROJECT_REF
  && target.projectRef === STAGING_PROJECT_REF
)

const categoryTotal = (report: CoachTemplateStagingAssessmentReport): number => (
  report.canonical_eligible
  + report.warning
  + report.critical_mismatch
  + report.unsupported
  + report.presentation_mismatch
  + report.adaptation_error
)

const isNonNegativeInteger = (value: number): boolean => Number.isInteger(value) && value >= 0

function assessmentReasons(
  reports: readonly CoachTemplateStagingAssessmentReport[],
  corpusSize: number,
): CoachTemplateTechnicalStagingGoReason[] {
  const reasons: CoachTemplateTechnicalStagingGoReason[] = []
  if (reports.length !== 3) reasons.push('RUN_COUNT_NOT_THREE')
  if (new Set(reports.map(report => report.assessment_run_id)).size !== reports.length
    || reports.some(report => report.assessment_run_id.length === 0)) reasons.push('RUN_IDS_NOT_DISTINCT')
  if (reports.some(report => !report.terminal_page_reached || report.page_count < 1)) reasons.push('RUN_NOT_COMPLETE')
  const countersInconsistent = reports.some(report => {
    const counts = [
      report.page_count,
      report.total_line_count,
      report.canonical_eligible,
      report.warning,
      report.critical_mismatch,
      report.unsupported,
      report.presentation_mismatch,
      report.adaptation_error,
      report.observer_error,
    ]
    const expectedWarningRate = report.total_line_count === 0 ? 0 : report.warning / report.total_line_count
    return counts.some(value => !isNonNegativeInteger(value))
      || categoryTotal(report) !== report.total_line_count
      || Math.abs(report.warning_rate - expectedWarningRate) > Number.EPSILON
  })
  if (countersInconsistent) reasons.push('REPORT_COUNTERS_INCONSISTENT')

  const totalObservations = reports.reduce((total, report) => total + report.total_line_count, 0)
  const fullCorpusRepeated = reports.length === 3
    && isNonNegativeInteger(corpusSize)
    && corpusSize > 0
    && reports.every(report => report.total_line_count === corpusSize)
  if (totalObservations < 50 && !fullCorpusRepeated) reasons.push('BASELINE_INSUFFICIENT')
  if (reports.some(report => report.canonical_eligible < 1)) reasons.push('CANONICAL_ELIGIBLE_MISSING')
  if (reports.some(report => report.critical_mismatch > 0)) reasons.push('CRITICAL_MISMATCH_PRESENT')
  if (reports.some(report => report.unsupported > 0)) reasons.push('UNSUPPORTED_PRESENT')
  if (reports.some(report => report.presentation_mismatch > 0)) reasons.push('PRESENTATION_MISMATCH_PRESENT')
  if (reports.some(report => report.adaptation_error > 0)) reasons.push('ADAPTATION_ERROR_PRESENT')
  if (reports.some(report => report.observer_error > 0)) reasons.push('OBSERVER_ERROR_PRESENT')
  const warningCount = reports.reduce((total, report) => total + report.warning, 0)
  const warningRate = totalObservations === 0 ? 0 : warningCount / totalObservations
  if (warningRate > COACH_TEMPLATE_ROLLOUT_WARNING_RATE_THRESHOLD) {
    reasons.push('WARNING_RATE_ABOVE_THRESHOLD')
  }
  return reasons
}

export function evaluateCoachTemplateTechnicalStagingGo(input: {
  readonly target: CoachTemplateTechnicalStagingTarget
  readonly reports: readonly CoachTemplateStagingAssessmentReport[]
  readonly fixtureCleanupProof: CoachTemplateFixtureCleanupProof
}): CoachTemplateTechnicalStagingGoDecision {
  const reasons = assessmentReasons(input.reports, COACH_TEMPLATE_TECHNICAL_FIXTURE_SIZE)
  if (!isExactStagingTarget(input.target)) reasons.unshift('STAGING_TARGET_REJECTED')
  const fixtureCleanupComplete = input.fixtureCleanupProof.beforeCreate === 0
    && input.fixtureCleanupProof.afterCreate === COACH_TEMPLATE_TECHNICAL_FIXTURE_SIZE
    && input.fixtureCleanupProof.afterCleanup === 0
  if (!fixtureCleanupComplete) reasons.push('FIXTURE_CLEANUP_PROOF_INVALID')
  const totalObservations = input.reports.reduce((total, report) => total + report.total_line_count, 0)
  const warningCount = input.reports.reduce((total, report) => total + report.warning, 0)
  return {
    technicalStatus: reasons.length === 0 ? COACH_TEMPLATE_TECHNICAL_STAGING_GO : 'TECHNICAL_STAGING_NO_GO',
    realCorpusStatus: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
    productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
    reasons,
    evidence: {
      runCount: input.reports.length,
      totalObservations,
      warningRate: totalObservations === 0 ? 0 : warningCount / totalObservations,
      fullCorpusRepeatedThreeTimes: input.reports.length === 3
        && input.reports.every(report => report.total_line_count === COACH_TEMPLATE_TECHNICAL_FIXTURE_SIZE),
      fixtureCleanupComplete,
    },
  }
}

export function evaluateCoachTemplateRealCorpusValidation(input: {
  readonly target: CoachTemplateTechnicalStagingTarget
  readonly nonFixtureTemplateCount: number
  readonly reports?: readonly CoachTemplateStagingAssessmentReport[]
}): CoachTemplateRealCorpusValidationDecision {
  if (!isExactStagingTarget(input.target) || !isNonNegativeInteger(input.nonFixtureTemplateCount)) {
    return {
      status: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
      nextAction: 'WAIT_FOR_ORGANIC_TEMPLATE',
      productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
      reasons: ['STAGING_TARGET_REJECTED'],
    }
  }
  if (input.nonFixtureTemplateCount === 0) {
    return {
      status: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
      nextAction: 'WAIT_FOR_ORGANIC_TEMPLATE',
      productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
      reasons: [],
    }
  }
  if (!input.reports) {
    return {
      status: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
      nextAction: 'RUN_READ_ONLY_ASSESSMENT',
      productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
      reasons: [],
    }
  }
  const reasons = assessmentReasons(input.reports, input.nonFixtureTemplateCount)
  if (reasons.length > 0) {
    return {
      status: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
      nextAction: 'REMEDIATE_AND_RERUN_READ_ONLY_ASSESSMENT',
      productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
      reasons,
    }
  }
  return {
    status: COACH_TEMPLATE_REAL_CORPUS_VALIDATED,
    nextAction: 'NONE',
    productionPromotion: 'PRODUCTION_PROMOTION_NOT_AUTHORIZED_BY_THIS_CONTRACT',
    reasons: [],
  }
}
