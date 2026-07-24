import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const domain = readFileSync('lib/coaching/client-detail/nutrition.ts', 'utf8')
const repository = readFileSync('lib/repositories/nutrition/plans.ts', 'utf8')
const controller = readFileSync('app/client/[id]/hooks/useClientDetailController.ts', 'utf8')
const ai = readFileSync('app/client/[id]/hooks/useClientDetailAi.ts', 'utf8')
const view = readFileSync('app/client/[id]/components/ClientNutrition.tsx', 'utf8')
const loadBoundary = domain.slice(
  domain.indexOf('export async function loadClientDetailNutrition'),
  domain.indexOf('export async function loadClientDetailWeeklyTracking'),
)

describe('client detail Nutrition double-read wiring', () => {
  it('routes both plan reads through their canonical repositories and readers', () => {
    expect(domain).toContain('createNutritionPlanRepository(client)')
    expect(domain).toContain('createClientDetailAssignedPlanReader(repository)')
    expect(domain).toContain('createActivePersonalMealPlanReader(repository)')
    expect(domain).toContain('assignedReader.load(scope)')
    expect(domain).toContain('personalReader.load(scope.clientUserId)')
    expect(loadBoundary).not.toMatch(/from\(['"](?:client_meal_plans|meal_plans)['"]\).*select/)
  })

  it('keeps tracking as the third bounded read and preserves request count', () => {
    expect(domain).toContain("from('meal_tracking').select('date,meal_type,is_completed')")
    expect(domain).toContain(".eq('is_completed' as never, true).limit(200)")
    const promiseBlock = domain.slice(
      domain.indexOf('const [assigned, active, tracking] = await Promise.all(['),
      domain.indexOf('])', domain.indexOf('const [assigned, active, tracking]')),
    )
    expect(promiseBlock).toContain('assignedReader.load(scope)')
    expect(promiseBlock).toContain('personalReader.load(scope.clientUserId)')
    expect(promiseBlock).toContain("client.from('meal_tracking')")
  })

  it('keeps the deployed assigned-plan targets in the read-only projection', () => {
    expect(repository).toContain(
      "CLIENT_DETAIL_ASSIGNED_MEAL_PLAN_PROJECTION = 'id,client_id,coach_id,calorie_target,protein_target,carb_target,fat_target,plan,created_at,updated_at'",
    )
    expect(repository).toContain(
      '.select(CLIENT_DETAIL_ASSIGNED_MEAL_PLAN_PROJECTION)',
    )
  })

  it('keeps non-plan Nutrition reads on their distinct freshness contracts', () => {
    expect(domain.match(/from\('meal_tracking'\)/g)).toHaveLength(2)
    expect(controller).toContain(
      "from('food_items').select('id,name').eq('source', 'fitness').in('id', pLiked).limit(200)",
    )
    expect(ai).toContain(
      "from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat')",
    )
    expect(ai).toContain(
      "from('custom_foods').select('name, brand, calories_per_100g, proteins_per_100g, carbs_per_100g, fats_per_100g, scan_count')",
    )
  })

  it('keeps stale-response invalidation and public rendering contracts', () => {
    expect(controller).toContain('const generation = ++detailLoadGenerationRef.current')
    expect(controller).toContain('if (generation !== detailLoadGenerationRef.current) return')
    expect(controller).toContain('detailLoadGenerationRef.current += 1')
    expect(controller).toContain('setClientActivePlan(nutritionData?.activePlan ?? null)')
    expect(view).toContain('clientActivePlan?.plan_data')
    expect(view).toContain('parseMealPlan(clientActivePlan.plan_data)')
  })

  it('does not change or add a Nutrition write', () => {
    expect(domain.match(/from\('client_meal_plans'\)\.(?:update|insert)/g)).toHaveLength(2)
    expect(domain).toContain(".eq('coach_id', scope.coachUserId).eq('client_id', scope.clientUserId)")
    expect(domain).toContain("client.rpc('update_active_client_profile'")
    expect(domain).not.toMatch(/from\('meal_plans'\)\.(?:insert|update|upsert|delete)/)
  })

  it('contains no legacy plan SQL aliases, wildcard, client construction, or loose any', () => {
    expect(loadBoundary).not.toMatch(/select\([^)]*(?:plan_data|is_active)/)
    expect(loadBoundary).not.toMatch(/plan\s*\?\?\s*plan_data|active\s*\?\?\s*is_active/)
    expect(domain).not.toMatch(/select\(['"]\*['"]|\bcreateClient\(|service_role|:\s*any\b/)
  })
})
