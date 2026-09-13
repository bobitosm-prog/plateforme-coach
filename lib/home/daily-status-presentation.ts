import type { HomeViewModel } from './home-dashboard-model'
import type { RecoveryStatus, RecoveryZone } from './recovery-model'

export type DailyStatusDomain = 'training' | 'nutrition' | 'recovery'

export type DailyTrainingStatus =
  | 'scheduled'
  | 'completed'
  | 'rest'
  | 'empty'
  | 'loading'
  | 'error'

export type DailyNutritionStatus =
  | 'ready'
  | 'incomplete'
  | 'empty'
  | 'loading'
  | 'error'

export type DailyRecoveryStatus = RecoveryStatus | 'unavailable' | 'loading' | 'error'

export type DailyStatusTone = 'neutral' | 'positive' | 'attention' | 'critical' | 'error' | 'loading'

export type DailyStatusSummary =
  | 'error'
  | 'loading'
  | 'protect_recovery'
  | 'training_planned'
  | 'nutrition_incomplete'
  | 'on_track'

export type DailyTrainingAction =
  | 'start_session'
  | 'open_session'
  | 'open_program'
  | 'start_free_session'
  | null

export interface DailyRecoveryCounts {
  leave_alone: number
  recovering: number
  probably_ready: number
}

export interface DailyStatusPresentation {
  summary: DailyStatusSummary
  initialDomain: DailyStatusDomain
  training: {
    status: DailyTrainingStatus
    tone: DailyStatusTone
    action: DailyTrainingAction
    exerciseCount: number | null
    weeklyCompleted: number
    weeklyPlanned: number
  }
  nutrition: {
    status: DailyNutritionStatus
    tone: DailyStatusTone
  }
  recovery: {
    status: DailyRecoveryStatus
    tone: DailyStatusTone
    counts: DailyRecoveryCounts
    priorityZones: readonly RecoveryZone[]
  }
}

const RECOVERY_PRIORITY: Record<Exclude<RecoveryStatus, 'unknown'>, number> = {
  leave_alone: 0,
  recovering: 1,
  probably_ready: 2,
}

export function resolveDailyTrainingStatus(
  training: HomeViewModel['training'],
): DailyTrainingStatus {
  if (training.state === 'loading') return 'loading'
  if (training.state === 'error') return 'error'
  if (training.dayStatus === 'completed') return 'completed'
  if (training.dayStatus === 'rest') return 'rest'
  if (training.dayStatus === 'scheduled') return 'scheduled'
  return 'empty'
}

export function resolveDailyNutritionStatus(
  nutrition: HomeViewModel['nutrition'],
): DailyNutritionStatus {
  if (nutrition.state === 'loading' || nutrition.state === 'error' || nutrition.state === 'empty') {
    return nutrition.state
  }
  return nutrition.caloriesConsumed == null || nutrition.caloriesTarget == null
    ? 'incomplete'
    : 'ready'
}

export function resolveDailyRecoveryStatus(
  recovery: HomeViewModel['recovery'],
): DailyRecoveryStatus {
  if (recovery.state === 'loading') return 'loading'
  if (recovery.state === 'error') return 'error'
  return recovery.status ?? 'unavailable'
}

function trainingTone(status: DailyTrainingStatus): DailyStatusTone {
  if (status === 'error') return 'error'
  if (status === 'loading') return 'loading'
  if (status === 'completed') return 'positive'
  if (status === 'scheduled') return 'attention'
  return 'neutral'
}

function nutritionTone(status: DailyNutritionStatus): DailyStatusTone {
  if (status === 'error') return 'error'
  if (status === 'loading') return 'loading'
  if (status === 'ready') return 'positive'
  if (status === 'incomplete' || status === 'empty') return 'attention'
  return 'neutral'
}

function recoveryTone(status: DailyRecoveryStatus): DailyStatusTone {
  if (status === 'error') return 'error'
  if (status === 'loading') return 'loading'
  if (status === 'leave_alone') return 'critical'
  if (status === 'recovering') return 'attention'
  if (status === 'probably_ready') return 'positive'
  return 'neutral'
}

function trainingAction(
  training: HomeViewModel['training'],
  status: DailyTrainingStatus,
): DailyTrainingAction {
  if (status === 'scheduled') return 'start_session'
  if (status === 'completed') return training.session ? 'open_session' : null
  if (status === 'rest') return training.hasProgram ? 'open_program' : null
  if (status === 'empty') return training.hasProgram ? 'open_program' : 'start_free_session'
  if (status === 'error') return 'open_program'
  return null
}

export function deriveDailyStatusPresentation(
  model: Pick<HomeViewModel, 'training' | 'nutrition' | 'recovery'>,
): DailyStatusPresentation {
  const trainingStatus = resolveDailyTrainingStatus(model.training)
  const nutritionStatus = resolveDailyNutritionStatus(model.nutrition)
  const recoveryStatus = resolveDailyRecoveryStatus(model.recovery)
  const counts: DailyRecoveryCounts = {
    leave_alone: 0,
    recovering: 0,
    probably_ready: 0,
  }

  for (const zone of model.recovery.zones) counts[zone.status] += 1

  const priorityZones = [...model.recovery.zones]
    .sort((left, right) => RECOVERY_PRIORITY[left.status] - RECOVERY_PRIORITY[right.status])
    .map(zone => zone.zone)
    .filter((zone, index, zones) => zones.indexOf(zone) === index)
    .slice(0, 3)

  const hasError = [model.training.state, model.nutrition.state, model.recovery.state].includes('error')
  const hasLoading = [model.training.state, model.nutrition.state, model.recovery.state].includes('loading')
  const nutritionIncomplete = nutritionStatus === 'empty' || nutritionStatus === 'incomplete'

  const summary: DailyStatusSummary = hasError
    ? 'error'
    : hasLoading
      ? 'loading'
      : recoveryStatus === 'leave_alone'
        ? 'protect_recovery'
        : trainingStatus === 'scheduled'
          ? 'training_planned'
          : nutritionIncomplete
            ? 'nutrition_incomplete'
            : 'on_track'

  const initialDomain: DailyStatusDomain = recoveryStatus === 'leave_alone'
    ? 'recovery'
    : trainingStatus === 'scheduled'
      ? 'training'
      : nutritionIncomplete
        ? 'nutrition'
        : 'training'

  return {
    summary,
    initialDomain,
    training: {
      status: trainingStatus,
      tone: trainingTone(trainingStatus),
      action: trainingAction(model.training, trainingStatus),
      exerciseCount: model.training.session ? model.training.session.exercises.length : null,
      weeklyCompleted: model.training.weeklySummary.completed,
      weeklyPlanned: model.training.weeklySummary.planned,
    },
    nutrition: {
      status: nutritionStatus,
      tone: nutritionTone(nutritionStatus),
    },
    recovery: {
      status: recoveryStatus,
      tone: recoveryTone(recoveryStatus),
      counts,
      priorityZones,
    },
  }
}
