import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const SOURCE_ROOTS = ['app', 'lib'] as const
type TargetTable =
  | 'meal_plans'
  | 'client_meal_plans'
  | 'daily_food_logs'
  | 'meal_tracking'
  | 'saved_meals'

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(absolute)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [absolute] : []
  })
}

function relative(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join('/')
}

function executableReads(table: TargetTable): string[] {
  const marker = `.from('${table}')`
  const reads = new Set<string>()
  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(path.join(ROOT, root))) {
      const source = fs.readFileSync(file, 'utf8')
      let offset = source.indexOf(marker)
      while (offset !== -1) {
        const chain = source.slice(offset, offset + 900)
        const selectAt = chain.indexOf('.select(')
        const mutationAt = ['.insert(', '.update(', '.upsert(', '.delete(']
          .map(value => chain.indexOf(value))
          .filter(value => value !== -1)
          .sort((left, right) => left - right)[0]
        if (selectAt !== -1 && (mutationAt === undefined || selectAt < mutationAt)) {
          reads.add(relative(file))
        }
        offset = source.indexOf(marker, offset + marker.length)
      }
    }
  }
  return [...reads].sort()
}

describe('Nutrition read-only closure inventory', () => {
  it('keeps personal plan reads behind the Nutrition plan repository', () => {
    expect(executableReads('meal_plans')).toEqual([
      'lib/repositories/nutrition/plans.ts',
    ])
  })

  it('keeps the deployed assigned-plan readers explicit', () => {
    expect(executableReads('client_meal_plans')).toEqual([
      'lib/client-dashboard/nutrition-measurements-loader.ts',
      'lib/repositories/nutrition/plans.ts',
    ])
  })

  it('inventories every executable journal, tracking and saved-meal read', () => {
    expect(executableReads('daily_food_logs')).toEqual([
      'app/(dashboard)/page-desktop.tsx',
      'app/components/tabs/HomeTab.tsx',
      'app/hooks/nutrition/useNutritionJournal.ts',
      'lib/check-badges.ts',
      'lib/repositories/nutrition/journal.ts',
      'lib/weekly-diagnostic/generator.ts',
    ])
    expect(executableReads('meal_tracking')).toEqual([
      'app/coach/hooks/useCoachAnalytics.ts',
      'app/components/tabs/HomeTab.tsx',
      'app/hooks/nutrition/useNutritionPlans.ts',
      'lib/coaching/client-detail/nutrition.ts',
      'lib/repositories/nutrition/journal.ts',
    ])
    expect(executableReads('saved_meals')).toEqual([
      'app/components/tabs/NutritionTab.tsx',
      'lib/repositories/nutrition/recipes.ts',
    ])
  })

  it('does not treat mutation-returning selects as read-only consumers', () => {
    const nutritionMutation = fs.readFileSync(
      path.join(ROOT, 'lib/coaching/client-detail/nutrition.ts'),
      'utf8',
    )
    expect(nutritionMutation).toContain(
      "from('client_meal_plans').insert(input.payload as never).select('id').single()",
    )
    expect(executableReads('client_meal_plans')).not.toContain(
      'lib/coaching/client-detail/nutrition.ts',
    )
  })
})
