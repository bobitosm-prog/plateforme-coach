import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const hook = readFileSync('app/coach/hooks/useCoachAnalytics.ts', 'utf8')
const component = readFileSync('app/coach/components/CoachAnalytics.tsx', 'utf8')
const dashboardDomain = readFileSync('lib/coaching/dashboard/index.ts', 'utf8')

describe('C10 coach Analytics meal adherence static contract', () => {
  it('keeps the grouped read projection, scope and lower bound unchanged', () => {
    expect(hook).toContain("from('meal_tracking')")
    expect(hook).toContain(".select('user_id, date, is_completed')")
    expect(hook).toContain(".in('user_id', clientIds)")
    expect(hook).toContain(".gte('date', fetch7d)")
    expect(hook.match(/from\('meal_tracking'\)/g)).toHaveLength(1)
  })

  it('routes transport and aggregation through the C10 read model', () => {
    expect(dashboardDomain).toContain("export * from './meal-adherence'")
    expect(hook).toContain('settleCoachMealTrackingRead')
    expect(hook).toContain('aggregateCoachMealAdherence')
    expect(hook).toContain(".catch(error => ({ data: null, error }))")
    expect(hook).not.toContain('(mealsRes.data || [])')
  })

  it('guards stale requests and clears confirmed Nutrition state on coach change', () => {
    expect(hook).toContain('coachAnalyticsRequest')
    expect(hook).toContain('isCurrentCoachAnalyticsResponse')
    expect(hook).toContain('confirmedMealAdherence')
    expect(hook).toContain('confirmedMealAdherence.current = null')
  })

  it('renders non-calculable adherence without a false percent', () => {
    expect(component).toContain("c.mealAdherence7d === null ? '—'")
  })

  it('does not introduce a Nutrition mutation', () => {
    expect(hook).not.toMatch(/from\('meal_tracking'\)[\s\S]{0,240}\.(?:insert|update|upsert|delete)\(/)
  })
})
