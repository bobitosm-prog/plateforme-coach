import {
  isNutritionPlanDisplaySafe,
  presentNutritionPlanForLegacyUi,
  readClientMealPlanRow,
  type NutritionPlanEnvelopeV1,
  type NutritionPlanWarningCode,
} from '@/lib/nutrition/plan-envelope'
import type { ClientDetailAssignedMealPlanRow } from '@/lib/repositories/nutrition/plans'
import type { RepositoryErrorKind, RepositoryResult } from '@/lib/repositories/result'

import type { ClientDetailScope, LegacyAssignedMealPlan } from './types'

export interface ClientDetailAssignedPlanPort {
  findLatestAssignedPlanForCoachClient(
    coachUserId: string,
    clientUserId: string,
  ): Promise<RepositoryResult<ClientDetailAssignedMealPlanRow>>
}

export type ClientDetailAssignedPlanReadResult =
  | {
    readonly status: 'ready'
    readonly plan: LegacyAssignedMealPlan
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
        | 'invalid_document'
        | 'unsupported_legacy'
        | 'incomplete_ui_projection'
        | 'repository_failure'
      readonly repositoryKind?: RepositoryErrorKind
    }
  }

function targetValue(
  envelope: NutritionPlanEnvelopeV1,
  key: keyof NutritionPlanEnvelopeV1['targets'],
  deployedValue: number | null,
): number | null {
  const target = envelope.targets[key]
  return target.status === 'known' ? target.value : deployedValue
}

function hasInvalidDeployedTargets(row: ClientDetailAssignedMealPlanRow): boolean {
  return [
    row.calorie_target,
    row.protein_target,
    row.carb_target,
    row.fat_target,
  ].some(value =>
    value !== null && (!Number.isFinite(value) || value < 0))
}

function isReadablePlan(
  result: ReturnType<typeof readClientMealPlanRow>,
): result is Extract<
  ReturnType<typeof readClientMealPlanRow>,
  { readonly status: 'canonical' | 'legacy_converted' }
> {
  return result.status === 'canonical' || result.status === 'legacy_converted'
}

export function createClientDetailAssignedPlanReader(port: ClientDetailAssignedPlanPort) {
  return {
    async load(scope: ClientDetailScope): Promise<ClientDetailAssignedPlanReadResult> {
      const result = await port.findLatestAssignedPlanForCoachClient(
        scope.coachUserId,
        scope.clientUserId,
      )
      if (!result.ok) {
        if (result.kind === 'not_found') return { status: 'absent' }
        return {
          status: 'failure',
          error: { code: 'repository_failure', repositoryKind: result.error.kind },
        }
      }

      const read = readClientMealPlanRow(result.data)
      if (read.status === 'conflict') {
        return { status: 'conflict', error: { code: 'document_conflict' } }
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
        read.authority.clientId !== scope.clientUserId ||
        read.authority.coachId !== scope.coachUserId ||
        hasInvalidDeployedTargets(result.data) ||
        !isNutritionPlanDisplaySafe(read.envelope)
      ) {
        return { status: 'invalid', error: { code: 'incomplete_ui_projection' } }
      }

      const plan = read.status === 'legacy_converted'
        ? result.data.plan
        : presentNutritionPlanForLegacyUi(read.envelope)
      if (plan === null) {
        return { status: 'invalid', error: { code: 'incomplete_ui_projection' } }
      }

      return {
        status: 'ready',
        plan: {
          id: read.authority.id,
          calorie_target: targetValue(read.envelope, 'energyKcal', result.data.calorie_target),
          protein_target: targetValue(read.envelope, 'proteinG', result.data.protein_target),
          carb_target: targetValue(read.envelope, 'carbsG', result.data.carb_target),
          fat_target: targetValue(read.envelope, 'fatG', result.data.fat_target),
          plan,
        },
        envelope: read.envelope,
        source: read.status,
        warnings: read.warnings,
      }
    },
  }
}
