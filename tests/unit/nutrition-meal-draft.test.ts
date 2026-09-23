import { describe, expect, it, vi } from 'vitest'
import { draftFood, draftNutrients, mealDraftRows, persistMealDraft } from '@/lib/nutrition/meal-draft'

const food = { name: 'Synthetic rice', qty: 200, kcal: 260, prot: 5.4, carb: 56, fat: 0.6 }
describe('meal draft calculations and persistence', () => {
  it('uses the actual portion base, not an assumed 100 g', () => {
    const draft = draftFood(food)
    expect(draftNutrients({...draft, quantity: 100})).toEqual({calories:130,protein:2.7,carbs:28,fat:0.3})
    expect(draftNutrients({...draft, quantity: 200})).toEqual({calories:260,protein:5.4,carbs:56,fat:0.6})
  })
  it('accepts photo, journal and saved meal formats without changing macros', () => {
    for (const item of [
      {name:'Rice',quantity_g:200,calories:260,proteins:5.4,carbs:56,fats:0.6},
      {custom_name:'Rice',quantity_g:200,calories:260,protein:5.4,carbs:56,fat:0.6},
      {name:'Rice',quantity:200,calories:260,proteins:5.4,carbs:56,fats:0.6},
    ]) expect(draftNutrients(draftFood(item))).toEqual({calories:260,protein:5.4,carbs:56,fat:0.6})
  })
  it('rejects incomplete, negative and invalid quantities instead of inventing zero nutrients', () => {
    for (const bad of [{...food,qty:0},{...food,qty:NaN},{...food,kcal:-1},{name:'Unknown'}]) expect(()=>draftFood(bad)).toThrow()
    expect(()=>mealDraftRows([{...draftFood(food),quantity:NaN}],'owner','2026-09-20','diner')).toThrow()
    expect(()=>mealDraftRows([draftFood(food)],'','2026-09-20','diner')).toThrow()
  })
  it('preserves the chosen date and meal in one bulk write with stable retry IDs', async () => {
    const rows=mealDraftRows([draftFood(food),draftFood(food)],'owner','2026-09-20','diner')
    const upsert=vi.fn().mockResolvedValueOnce({error:{message:'network'}}).mockResolvedValue({error:null})
    const db={from:vi.fn(()=>({upsert}))}
    await expect(persistMealDraft(db,rows)).rejects.toThrow('MEAL_SAVE_FAILED')
    await persistMealDraft(db,rows)
    expect(upsert).toHaveBeenCalledTimes(2)
    expect(upsert.mock.calls[0]).toEqual(upsert.mock.calls[1])
    expect(upsert.mock.calls[0][1]).toEqual({onConflict:'id',ignoreDuplicates:true})
    expect(rows.every(row=>row.date==='2026-09-20'&&row.meal_type==='diner'&&row.user_id==='owner')).toBe(true)
  })
})
