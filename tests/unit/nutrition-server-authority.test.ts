import { describe, expect, it, vi } from 'vitest'
import { applySavedNutritionAuthority } from '@/lib/nutrition/server-authority'
import { athenaNutritionRequestSchema } from '@/lib/athena/nutrition-input'
const targets = { calorie_goal: 2003, protein_goal: 123, carbs_goal: 268, fat_goal: 52 }
const input = athenaNutritionRequestSchema.parse({ ...targets, persist_generated_plan: true })
function client(data: unknown, error: unknown = null) {
  return { from: () => ({ select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data, error }) }) }) }) } as never
}
describe('server nutrition authority', () => {
  it('cannot remove saved allergies by sending an empty list', async () => {
    const result = await applySavedNutritionAuthority(client({ ...targets, allergies: ['tree_nuts'] }), 'owner', input)
    expect(result).toMatchObject({ ok: true, params: { allergies: ['tree_nuts'] } })
  })
  it('merges additional exclusions and keeps the saved diet', async () => {
    const result = await applySavedNutritionAuthority(client({ ...targets, dietary_type: 'vegan', allergies: ['soy'], meal_preferences: { disliked_foods: ['Tomate'], dietary_restrictions: 'saved' } }), 'owner', { ...input, allergies: ['peanuts'], dietary_restrictions: 'extra' })
    expect(result).toMatchObject({ ok: true, params: { dietary_type: 'vegan', allergies: ['soy', 'peanuts'], disliked_foods: ['Tomate'], dietary_restrictions: 'saved; extra' } })
  })
  it.each(['unknown allergy', ''])('refuses an unhandled allergy instead of silently generating: %s', async allergy => {
    expect(await applySavedNutritionAuthority(client({ ...targets, allergies: [allergy] }), 'owner', input)).toEqual({ ok: false, status: 422 })
  })
  it('rejects unsaved targets without silently recalculating them', async () => {
    expect(await applySavedNutritionAuthority(client({ ...targets, calorie_goal: 2300 }), 'owner', input)).toEqual({ ok: false, status: 409 })
  })
  it('fails closed on an unreadable profile', async () => {
    expect(await applySavedNutritionAuthority(client(null, { message: 'offline' }), 'owner', input)).toEqual({ ok: false, status: 503 })
  })
})
