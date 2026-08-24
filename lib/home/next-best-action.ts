import type { HomeViewModel } from './home-dashboard-model'

export type NextBestActionType =
  | 'start_training'
  | 'complete_check_in'
  | 'open_nutrition'
  | 'open_diagnostic'
  | 'open_recovery'
  | 'open_program'
  | 'view_progress'

export interface NextBestAction {
  type: NextBestActionType
  priority: number
  reason:
    | 'scheduled_training'
    | 'missing_check_in'
    | 'nutrition_incomplete'
    | 'diagnostic_available'
    | 'rest_day'
    | 'missing_program'
    | 'day_on_track'
}

/** Pure, deterministic daily recommendation selector. */
export function resolveNextBestAction(model: HomeViewModel): NextBestAction {
  if (model.training.state === 'ready' && model.training.dayStatus === 'scheduled') {
    return { type: 'start_training', priority: 2, reason: 'scheduled_training' }
  }

  if (model.checkIn.state === 'empty' && !model.checkIn.completedToday) {
    return { type: 'complete_check_in', priority: 3, reason: 'missing_check_in' }
  }

  const nutritionKnown = model.nutrition.state === 'ready'
    && model.nutrition.caloriesConsumed != null
    && model.nutrition.caloriesTarget != null
  if (
    (nutritionKnown && model.nutrition.caloriesConsumed! < model.nutrition.caloriesTarget!)
    || (model.nutrition.state === 'empty' && model.nutrition.hasPlan)
  ) {
    return { type: 'open_nutrition', priority: 4, reason: 'nutrition_incomplete' }
  }

  if (model.diagnostic.state === 'ready' || (
    model.diagnostic.state === 'empty' && model.diagnostic.canGenerate
  )) {
    return { type: 'open_diagnostic', priority: 5, reason: 'diagnostic_available' }
  }

  if (model.training.state === 'ready' && model.training.dayStatus === 'rest') {
    return { type: 'open_recovery', priority: 7, reason: 'rest_day' }
  }

  if (!model.training.hasProgram) {
    return { type: 'open_program', priority: 8, reason: 'missing_program' }
  }

  return { type: 'view_progress', priority: 9, reason: 'day_on_track' }
}
