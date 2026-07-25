import { describe, expect, it } from 'vitest'
import { buildWeeklyDiagnosticInvocation } from '@/lib/ai/prompts/diagnostic'
import {
  resolveWeeklyDiagnosticNutritionGoals,
  weeklyDiagnosticNutritionGoalFlags,
} from '@/lib/weekly-diagnostic/nutrition-goals'

const validGoals = {
  calorie_goal: 1900,
  protein_goal: 140,
  carbs_goal: 220,
  fat_goal: 60,
}

describe('C08 weekly-diagnostic Nutrition goal resolver', () => {
  it('resolves four valid positive targets', () => {
    expect(resolveWeeklyDiagnosticNutritionGoals(validGoals)).toEqual({
      status: 'complete',
      goals: {
        calories: { status: 'known', value: 1900 },
        protein: { status: 'known', value: 140 },
        carbs: { status: 'known', value: 220 },
        fat: { status: 'known', value: 60 },
      },
      issues: [],
    })
  })

  it('converts non-empty numeric strings for legacy compatibility', () => {
    expect(resolveWeeklyDiagnosticNutritionGoals({
      calorie_goal: '1900',
      protein_goal: '140.5',
      carbs_goal: '220',
      fat_goal: '60',
    })).toMatchObject({
      status: 'complete',
      goals: {
        calories: { status: 'known', value: 1900 },
        protein: { status: 'known', value: 140.5 },
        carbs: { status: 'known', value: 220 },
        fat: { status: 'known', value: 60 },
      },
    })
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['absent', Symbol.for('absent')],
    ['empty string', ''],
  ] as const)('keeps one %s target absent while preserving the others', (_, value) => {
    const source: Record<string, unknown> = { ...validGoals }
    if (value === Symbol.for('absent')) delete source.protein_goal
    else source.protein_goal = value
    expect(resolveWeeklyDiagnosticNutritionGoals(source)).toMatchObject({
      status: 'partial',
      goals: {
        calories: { status: 'known', value: 1900 },
        protein: { status: 'absent', value: null },
        carbs: { status: 'known', value: 220 },
        fat: { status: 'known', value: 60 },
      },
      issues: [{ code: 'goal_absent', metric: 'protein' }],
    })
  })

  it('distinguishes several absent targets and a fully unavailable profile', () => {
    expect(resolveWeeklyDiagnosticNutritionGoals({
      calorie_goal: 1900,
      protein_goal: null,
      carbs_goal: undefined,
      fat_goal: '',
    })).toMatchObject({
      status: 'partial',
      goals: {
        calories: { status: 'known', value: 1900 },
        protein: { status: 'absent', value: null },
        carbs: { status: 'absent', value: null },
        fat: { status: 'absent', value: null },
      },
    })
    expect(resolveWeeklyDiagnosticNutritionGoals({})).toMatchObject({
      status: 'unavailable',
    })
  })

  it.each([
    ['real zero', 0],
    ['negative', -1],
    ['invalid string', 'invalid'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['boolean', true],
  ])('keeps a %s target invalid and never turns it into zero', (_, value) => {
    expect(resolveWeeklyDiagnosticNutritionGoals({
      ...validGoals,
      calorie_goal: value,
    })).toMatchObject({
      status: 'partial',
      goals: {
        calories: { status: 'invalid', value: null },
      },
      issues: [{ code: 'goal_invalid', metric: 'calories' }],
    })
  })

  it('marks an all-invalid source invalid', () => {
    expect(resolveWeeklyDiagnosticNutritionGoals({
      calorie_goal: 0,
      protein_goal: -1,
      carbs_goal: Number.NaN,
      fat_goal: Number.POSITIVE_INFINITY,
    })).toMatchObject({ status: 'invalid' })
  })

  it('builds explicit flags without affecting known targets', () => {
    const goals = resolveWeeklyDiagnosticNutritionGoals({
      calorie_goal: 1900,
      protein_goal: null,
      carbs_goal: 'invalid',
      fat_goal: 60,
    })
    expect(weeklyDiagnosticNutritionGoalFlags(goals)).toEqual([
      'Objectif protéines non défini — diagnostic Nutrition partiel',
      'Objectif glucides invalide — diagnostic Nutrition partiel',
    ])
    expect(weeklyDiagnosticNutritionGoalFlags(
      resolveWeeklyDiagnosticNutritionGoals(validGoals),
    )).toEqual([])
  })
})

describe('C08 weekly-diagnostic prompt semantics', () => {
  const promptInput = {
    profile: {
      objective: 'perdre',
      tdee: 2200,
      calorie_goal: 1900,
      protein_goal: 140,
      fitness_level: 'intermédiaire',
      fitness_score: 70,
      current_weight: 75,
    },
    sessionsPlanned: 4,
    sessionsDone: 3,
    adherencePct: 75,
    trainingVolumeTotal: 12345,
    calorieAvgReal: 1850,
    calorieAvgTarget: 1900,
    proteinGoal: 140,
    proteinAvgG: 130,
    proteinCompliancePct: 92.5,
    daysLogged: 6,
    weightDeltaKg: -0.4,
    coherenceFlags: [] as string[],
    previousDiagnostic: null,
  }

  it('keeps the historical prompt byte-identical for valid targets', () => {
    const prompt = buildWeeklyDiagnosticInvocation(promptInput).messages[0]?.content
    expect(prompt).toContain('Calorie goal: 1900 kcal')
    expect(prompt).toContain('Protein goal: 140 g')
    expect(prompt).toContain('Target: 1900 kcal/jour')
    expect(prompt).toContain('Écart moyen: -50 kcal/jour')
    expect(prompt).toContain('Protéines moyennes: 130g (compliance: 93%)')
  })

  it('renders unavailable comparisons explicitly without a false zero', () => {
    const prompt = buildWeeklyDiagnosticInvocation({
      ...promptInput,
      profile: {
        ...promptInput.profile,
        calorie_goal: null,
        protein_goal: null,
      },
      calorieAvgTarget: null,
      proteinGoal: null,
      proteinCompliancePct: null,
      coherenceFlags: [
        'Objectif calories non défini — diagnostic Nutrition partiel',
        'Objectif protéines non défini — diagnostic Nutrition partiel',
      ],
    }).messages[0]?.content
    expect(prompt).toContain('Calorie goal: ? kcal')
    expect(prompt).toContain('Protein goal: ? g')
    expect(prompt).toContain('Target: ? kcal/jour')
    expect(prompt).toContain('Écart moyen: ? kcal/jour')
    expect(prompt).toContain('Protéines moyennes: 130g (compliance: ?%)')
    expect(prompt).not.toContain('Target: 0 kcal/jour')
  })
})
