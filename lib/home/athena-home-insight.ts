import type { HomeViewModel } from './home-dashboard-model'

export type AthenaHomeInsightReason =
  | 'loading'
  | 'safe_fallback'
  | 'training_recovery_ready'
  | 'training_recovery_warning'
  | 'rest_day'
  | 'nutrition_incomplete'
  | 'check_in_missing'
  | 'progression_available'
  | 'generic_fallback'

export interface AthenaHomeInsight {
  type: 'loading' | 'insight' | 'fallback'
  title: 'athena'
  message: AthenaHomeInsightReason
  priority: number
  reason: AthenaHomeInsightReason
}

function insight(
  reason: AthenaHomeInsightReason,
  priority: number,
  type: AthenaHomeInsight['type'] = 'insight',
): AthenaHomeInsight {
  return { type, title: 'athena', message: reason, priority, reason }
}

/** Pure, deterministic selector. It never performs I/O or infers medical state. */
export function resolveAthenaHomeInsight(model: HomeViewModel): AthenaHomeInsight {
  const relevantStates = [
    model.training.state,
    model.recovery.state,
    model.nutrition.state,
    model.checkIn.state,
    model.progression.state,
  ]

  if (relevantStates.includes('error')) {
    return insight('safe_fallback', 0, 'fallback')
  }

  if (model.training.state === 'loading' || model.recovery.state === 'loading') {
    return insight('loading', 0, 'loading')
  }

  const scheduled = model.training.state === 'ready'
    && model.training.dayStatus === 'scheduled'
  if (scheduled && model.recovery.state === 'ready' && model.recovery.status === 'ready') {
    return insight('training_recovery_ready', 1)
  }

  if (
    scheduled
    && model.recovery.state === 'ready'
    && (model.recovery.status === 'watch' || model.recovery.status === 'recover')
  ) {
    return insight('training_recovery_warning', 2)
  }

  if (model.training.state === 'ready' && model.training.dayStatus === 'rest') {
    return insight('rest_day', 3)
  }

  const nutritionIsReliablyIncomplete = model.nutrition.state === 'ready'
    && model.nutrition.caloriesConsumed != null
    && model.nutrition.caloriesTarget != null
    && model.nutrition.caloriesTarget > 0
    && model.nutrition.caloriesConsumed / model.nutrition.caloriesTarget < 0.75
  if (nutritionIsReliablyIncomplete) {
    return insight('nutrition_incomplete', 4)
  }

  if (model.checkIn.state === 'empty' && !model.checkIn.completedToday) {
    return insight('check_in_missing', 5)
  }

  if (model.progression.state === 'ready') {
    return insight('progression_available', 6)
  }

  return insight('generic_fallback', 7, 'fallback')
}
