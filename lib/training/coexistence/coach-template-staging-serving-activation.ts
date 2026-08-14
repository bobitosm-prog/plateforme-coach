import {
  COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
  COACH_TEMPLATE_ROLLOUT_WARNING_RATE_THRESHOLD,
  COACH_TEMPLATE_STAGING_PROJECT_REF,
  COACH_TEMPLATE_TECHNICAL_STAGING_GO,
  type CoachTemplateTechnicalStagingGoDecision,
} from '@/lib/training/coexistence/coach-template-technical-staging-go-contract'
import {
  createCoachTemplateCanonicalServingValidationControl,
  type CoachTemplateCanonicalServingValidationControl,
} from '@/lib/training/coexistence/coach-template-serving-contract'

export const COACH_TEMPLATE_STAGING_SERVING_OPT_IN = 'canonical-when-identical' as const

type RuntimeEnvironment = {
  readonly NEXT_PUBLIC_COACH_TEMPLATE_STAGING_AUTHORITY?: string
  readonly NEXT_PUBLIC_COACH_TEMPLATE_STAGING_DEPLOYMENT?: string
  readonly NEXT_PUBLIC_COACH_TEMPLATE_STAGING_BRANCH?: string
  readonly NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN?: string
  readonly NEXT_PUBLIC_SUPABASE_URL?: string
}

export type CoachTemplateStagingServingActivationInput = {
  readonly applicationEnvironment?: string
  readonly deploymentEnvironment?: string
  readonly branch?: string
  readonly projectRef?: string
  readonly rolloutOptIn?: string
  readonly technicalDecision?: CoachTemplateTechnicalStagingGoDecision
}

export type CoachTemplateStagingServingActivation = {
  readonly mode: 'legacy-only' | 'canonical-when-identical'
  readonly control?: CoachTemplateCanonicalServingValidationControl
  readonly realCorpusStatus: typeof COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING
  readonly productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN'
  readonly rollback: 'REMOVE_STAGING_ROLLOUT_OPT_IN'
}

/**
 * Source-controlled attestation of the deterministic 3-run staging proof.
 * It authorizes staging serving only; real-corpus validation remains pending.
 */
export const COACH_TEMPLATE_VALIDATED_TECHNICAL_STAGING_GO: CoachTemplateTechnicalStagingGoDecision = Object.freeze({
  technicalStatus: COACH_TEMPLATE_TECHNICAL_STAGING_GO,
  realCorpusStatus: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
  productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
  reasons: [],
  evidence: Object.freeze({
    runCount: 3,
    totalObservations: 51,
    warningRate: 0,
    fullCorpusRepeatedThreeTimes: true,
    fixtureCleanupComplete: true,
  }),
})

const legacyOnly = (): CoachTemplateStagingServingActivation => ({
  mode: 'legacy-only',
  realCorpusStatus: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
  productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
  rollback: 'REMOVE_STAGING_ROLLOUT_OPT_IN',
})

const isValidTechnicalGo = (
  decision: CoachTemplateTechnicalStagingGoDecision | undefined,
): boolean => Boolean(
  decision === COACH_TEMPLATE_VALIDATED_TECHNICAL_STAGING_GO
  && decision.technicalStatus === COACH_TEMPLATE_TECHNICAL_STAGING_GO
  && decision.realCorpusStatus === COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING
  && decision.productionPromotion === 'PRODUCTION_PROMOTION_FORBIDDEN'
  && decision.reasons.length === 0
  && decision.evidence.runCount === 3
  && (decision.evidence.totalObservations >= 50
    || decision.evidence.fullCorpusRepeatedThreeTimes)
  && decision.evidence.warningRate <= COACH_TEMPLATE_ROLLOUT_WARNING_RATE_THRESHOLD
  && decision.evidence.fixtureCleanupComplete,
)

export function resolveCoachTemplateStagingServingActivation(
  input: CoachTemplateStagingServingActivationInput,
): CoachTemplateStagingServingActivation {
  const exactStagingTarget = input.applicationEnvironment === 'staging'
    && input.deploymentEnvironment === 'preview'
    && input.branch === 'phase-6-staging'
    && input.projectRef === COACH_TEMPLATE_STAGING_PROJECT_REF
  if (!exactStagingTarget
    || input.rolloutOptIn !== COACH_TEMPLATE_STAGING_SERVING_OPT_IN
    || !isValidTechnicalGo(input.technicalDecision)) {
    return legacyOnly()
  }
  return {
    mode: 'canonical-when-identical',
    control: createCoachTemplateCanonicalServingValidationControl(),
    realCorpusStatus: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
    productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
    rollback: 'REMOVE_STAGING_ROLLOUT_OPT_IN',
  }
}

function extractSupabaseProjectRef(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return undefined
    return /^([a-z0-9]{20})\.supabase\.co$/i.exec(url.hostname)?.[1]?.toLowerCase()
  } catch {
    return undefined
  }
}

export function resolveCoachTemplateStagingServingControl(
  environment: RuntimeEnvironment,
): CoachTemplateCanonicalServingValidationControl | undefined {
  return resolveCoachTemplateStagingServingActivation({
    applicationEnvironment: environment.NEXT_PUBLIC_COACH_TEMPLATE_STAGING_AUTHORITY,
    deploymentEnvironment: environment.NEXT_PUBLIC_COACH_TEMPLATE_STAGING_DEPLOYMENT,
    branch: environment.NEXT_PUBLIC_COACH_TEMPLATE_STAGING_BRANCH,
    projectRef: extractSupabaseProjectRef(environment.NEXT_PUBLIC_SUPABASE_URL),
    rolloutOptIn: environment.NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN,
    technicalDecision: COACH_TEMPLATE_VALIDATED_TECHNICAL_STAGING_GO,
  }).control
}

export function resolveCoachTemplateStagingServingRuntimeControl():
CoachTemplateCanonicalServingValidationControl | undefined {
  return resolveCoachTemplateStagingServingControl({
    NEXT_PUBLIC_COACH_TEMPLATE_STAGING_AUTHORITY:
      process.env.NEXT_PUBLIC_COACH_TEMPLATE_STAGING_AUTHORITY,
    NEXT_PUBLIC_COACH_TEMPLATE_STAGING_DEPLOYMENT:
      process.env.NEXT_PUBLIC_COACH_TEMPLATE_STAGING_DEPLOYMENT,
    NEXT_PUBLIC_COACH_TEMPLATE_STAGING_BRANCH:
      process.env.NEXT_PUBLIC_COACH_TEMPLATE_STAGING_BRANCH,
    NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN:
      process.env.NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  })
}
