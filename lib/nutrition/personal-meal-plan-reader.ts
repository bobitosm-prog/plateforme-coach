import {
  isNutritionPlanDisplaySafe,
  presentNutritionPlanForLegacyUi,
  readMealPlanRow,
  type NutritionPlanEnvelopeV1,
  type NutritionPlanWarningCode,
} from '@/lib/nutrition/plan-envelope'
import type { PersonalMealPlanRow } from '@/lib/repositories/nutrition/plans'
import type { RepositoryErrorKind, RepositoryResult } from '@/lib/repositories/result'

export interface LegacyActiveMealPlan {
  id: string
  user_id: string
  plan_data: unknown
  is_active: boolean
  created_at: string
}

export interface ActivePersonalMealPlanPort {
  findActivePersonalPlanForOwner(ownerUserId: string): Promise<RepositoryResult<PersonalMealPlanRow>>
}

export type ActivePersonalMealPlanReadResult =
  | {
    readonly status: 'ready'
    readonly plan: LegacyActiveMealPlan
    readonly envelope: NutritionPlanEnvelopeV1
    readonly source: 'canonical' | 'legacy_converted'
    readonly warnings: readonly NutritionPlanWarningCode[]
  }
  | { readonly status: 'absent' }
  | {
    readonly status: 'conflict' | 'invalid' | 'legacy_unsupported' | 'failure'
    readonly error: {
      readonly code:
        | 'document_conflict'
        | 'activation_conflict'
        | 'invalid_document'
        | 'unsupported_legacy'
        | 'incomplete_ui_projection'
        | 'repository_failure'
      readonly repositoryKind?: RepositoryErrorKind
    }
  }

function isReadablePlan(
  result: ReturnType<typeof readMealPlanRow>,
): result is Extract<
  ReturnType<typeof readMealPlanRow>,
  { readonly status: 'canonical' | 'legacy_converted' }
> {
  return result.status === 'canonical' || result.status === 'legacy_converted'
}

export function createActivePersonalMealPlanReader(port: ActivePersonalMealPlanPort) {
  return {
    async load(ownerUserId: string): Promise<ActivePersonalMealPlanReadResult> {
      const result = await port.findActivePersonalPlanForOwner(ownerUserId)
      if (!result.ok) {
        if (result.kind === 'not_found') return { status: 'absent' }
        return {
          status: 'failure',
          error: { code: 'repository_failure', repositoryKind: result.error.kind },
        }
      }

      const read = readMealPlanRow(result.data)
      if (read.status === 'conflict') {
        return {
          status: 'conflict',
          error: {
            code: read.issue.code === 'activation_conflict'
              ? 'activation_conflict'
              : 'document_conflict',
          },
        }
      }
      if (read.status === 'invalid') {
        return { status: 'invalid', error: { code: 'invalid_document' } }
      }
      if (read.status === 'legacy_unsupported') {
        return { status: 'legacy_unsupported', error: { code: 'unsupported_legacy' } }
      }
      if (!isReadablePlan(read)) {
        return { status: 'invalid', error: { code: 'invalid_document' } }
      }
      if (
        read.authority.id === null ||
        read.authority.userId === null ||
        read.authority.createdAt === null ||
        read.authority.active !== true ||
        !isNutritionPlanDisplaySafe(read.envelope)
      ) {
        return { status: 'invalid', error: { code: 'incomplete_ui_projection' } }
      }

      const planData = read.status === 'legacy_converted'
        ? result.data.plan
        : presentNutritionPlanForLegacyUi(read.envelope)
      if (planData === null) {
        return { status: 'invalid', error: { code: 'incomplete_ui_projection' } }
      }
      return {
        status: 'ready',
        plan: {
          id: read.authority.id,
          user_id: read.authority.userId,
          plan_data: planData,
          is_active: true,
          created_at: read.authority.createdAt,
        },
        envelope: read.envelope,
        source: read.status,
        warnings: read.warnings,
      }
    },
  }
}

export type ActivePersonalMealPlanReader = ReturnType<typeof createActivePersonalMealPlanReader>
