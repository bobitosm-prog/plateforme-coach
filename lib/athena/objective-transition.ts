export type CanonicalObjective = 'cut' | 'mass' | 'maintain'

export type PlanRegenerationRequest = {
  version: 1
  reason: 'objective_change'
  objective: CanonicalObjective
  requested_at: string
}

type UnknownRecord = Record<string, unknown>

const PRIMARY_GOAL_BY_OBJECTIVE: Partial<Record<CanonicalObjective, string>> = {
  cut: 'lose_weight',
  mass: 'gain_muscle',
}

const MAINTENANCE_GOALS = new Set(['improve_condition', 'get_back_shape'])

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
}

export function buildObjectiveTransitionAnswers(
  currentAnswers: unknown,
  objective: CanonicalObjective,
  requestedAt: string,
  requestPlanRegeneration = true,
): UnknownRecord {
  const next = { ...asRecord(currentAnswers) }
  const primaryGoal = PRIMARY_GOAL_BY_OBJECTIVE[objective]

  next.athena_contract_version = 1
  if (primaryGoal) next.primary_goal_id = primaryGoal
  else if (!MAINTENANCE_GOALS.has(String(next.primary_goal_id ?? ''))) delete next.primary_goal_id

  if (requestPlanRegeneration) {
    next.plan_regeneration_request = {
      version: 1,
      reason: 'objective_change',
      objective,
      requested_at: requestedAt,
    } satisfies PlanRegenerationRequest
  } else {
    delete next.plan_regeneration_request
  }

  return next
}

export function readPlanRegenerationRequest(value: unknown): PlanRegenerationRequest | null {
  const request = asRecord(asRecord(value).plan_regeneration_request)
  if (
    request.version !== 1
    || request.reason !== 'objective_change'
    || !['cut', 'mass', 'maintain'].includes(String(request.objective))
    || typeof request.requested_at !== 'string'
    || !Number.isFinite(Date.parse(request.requested_at))
  ) return null

  return request as PlanRegenerationRequest
}

export function clearPlanRegenerationRequest(value: unknown): UnknownRecord {
  const next = { ...asRecord(value) }
  delete next.plan_regeneration_request
  return next
}
