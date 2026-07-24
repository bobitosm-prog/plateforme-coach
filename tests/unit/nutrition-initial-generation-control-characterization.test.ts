import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const hook = readFileSync('app/hooks/useInitialGeneration.ts', 'utf8')

const existenceBlock = hook.slice(
  hook.indexOf('// ── Step 0 : check existing data'),
  hook.indexOf('// If both already exist'),
)

describe('initial generation read-only control characterization', () => {
  it('delegates exactly one owner-scoped meal-plan control read', () => {
    expect(existenceBlock).toContain('createNutritionPlanRepository(supabase)')
    expect(existenceBlock).toContain('createActivePersonalMealPlanReader({')
    expect(existenceBlock.match(/personalPlanReader\.load\(userId as string\)/g)).toHaveLength(1)
    expect(existenceBlock).not.toContain("from('meal_plans')")
  })

  it('keeps the independent training control after the Nutrition read', () => {
    expect(existenceBlock.match(/from\('custom_programs'\)/g)).toHaveLength(1)
    expect(existenceBlock).toContain('settleInitialGenerationMealPlanControl(')
    expect(existenceBlock).toContain('hasProgram = (existingProg?.length ?? 0) > 0')
    expect(existenceBlock.indexOf('personalPlanReader.load(userId as string)'))
      .toBeLessThan(existenceBlock.indexOf("from('custom_programs')"))
  })

  it('keeps the first-load fallback and thrown-check behavior', () => {
    expect(existenceBlock).toContain('let hasMeal = false')
    expect(existenceBlock).toContain('createInitialGenerationMealPlanControl()')
    expect(existenceBlock).toContain('Continue — generate both as fallback')
  })

  it('runs once per mount and only neutralizes stale UI updates', () => {
    expect(hook).toContain('const startedRef = useRef(false)')
    expect(hook).toContain('if (startedRef.current) return')
    expect(hook).toContain('startedRef.current = true')
    expect(hook).toContain('return () => {\n      cancelled = true\n    }')
    expect(hook).toContain('if (!cancelled) setStep')
    expect(hook).not.toContain('AbortController')
  })

  it('keeps every Nutrition write outside the read-only control', () => {
    expect(hook.match(/from\('meal_plans'\)\.update/g)).toHaveLength(1)
    expect(hook.match(/from\('meal_plans'\)\.insert/g)).toHaveLength(1)
    expect(hook).toContain('plan_data: planData')
    expect(hook).toContain('is_active: true')
  })
})
