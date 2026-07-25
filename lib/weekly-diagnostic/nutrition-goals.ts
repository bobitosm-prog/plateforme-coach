export type WeeklyDiagnosticNutritionGoalMetric =
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fat'

export type WeeklyDiagnosticNutritionGoal =
  | { readonly status: 'known'; readonly value: number }
  | { readonly status: 'absent' | 'invalid'; readonly value: null }

export interface WeeklyDiagnosticNutritionGoalIssue {
  readonly code: 'goal_absent' | 'goal_invalid'
  readonly metric: WeeklyDiagnosticNutritionGoalMetric
}

export interface WeeklyDiagnosticNutritionGoals {
  readonly status: 'complete' | 'partial' | 'unavailable' | 'invalid'
  readonly goals: Readonly<Record<
    WeeklyDiagnosticNutritionGoalMetric,
    WeeklyDiagnosticNutritionGoal
  >>
  readonly issues: readonly WeeklyDiagnosticNutritionGoalIssue[]
}

export interface WeeklyDiagnosticNutritionGoalSource {
  readonly calorie_goal?: unknown
  readonly protein_goal?: unknown
  readonly carbs_goal?: unknown
  readonly fat_goal?: unknown
}

const FIELDS: Readonly<Record<
  WeeklyDiagnosticNutritionGoalMetric,
  keyof WeeklyDiagnosticNutritionGoalSource
>> = {
  calories: 'calorie_goal',
  protein: 'protein_goal',
  carbs: 'carbs_goal',
  fat: 'fat_goal',
}

const LABELS: Readonly<Record<WeeklyDiagnosticNutritionGoalMetric, string>> = {
  calories: 'calories',
  protein: 'protéines',
  carbs: 'glucides',
  fat: 'lipides',
}

const METRICS = Object.keys(FIELDS) as WeeklyDiagnosticNutritionGoalMetric[]

function readGoal(value: unknown): WeeklyDiagnosticNutritionGoal {
  if (value === null || value === undefined) {
    return { status: 'absent', value: null }
  }
  if (typeof value === 'string') {
    if (value.trim() === '') return { status: 'absent', value: null }
    const numeric = Number(value)
    return Number.isFinite(numeric) && numeric > 0
      ? { status: 'known', value: numeric }
      : { status: 'invalid', value: null }
  }
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? { status: 'known', value }
    : { status: 'invalid', value: null }
}

export function resolveWeeklyDiagnosticNutritionGoals(
  source: WeeklyDiagnosticNutritionGoalSource,
): WeeklyDiagnosticNutritionGoals {
  const goals = Object.fromEntries(METRICS.map(metric => [
    metric,
    readGoal(source[FIELDS[metric]]),
  ])) as unknown as WeeklyDiagnosticNutritionGoals['goals']

  const issues = METRICS.flatMap(metric => {
    const goal = goals[metric]
    if (goal.status === 'known') return []
    return [{
      code: goal.status === 'absent' ? 'goal_absent' : 'goal_invalid',
      metric,
    } satisfies WeeklyDiagnosticNutritionGoalIssue]
  })
  const known = METRICS.filter(metric => goals[metric].status === 'known').length
  const invalid = issues.filter(issue => issue.code === 'goal_invalid').length

  return {
    status: known === METRICS.length
      ? 'complete'
      : known > 0
        ? 'partial'
        : invalid > 0
          ? 'invalid'
          : 'unavailable',
    goals,
    issues,
  }
}

export function weeklyDiagnosticNutritionGoalFlags(
  result: WeeklyDiagnosticNutritionGoals,
): string[] {
  return result.issues.map(issue => (
    `Objectif ${LABELS[issue.metric]} ${
      issue.code === 'goal_absent' ? 'non défini' : 'invalide'
    } — diagnostic Nutrition partiel`
  ))
}
