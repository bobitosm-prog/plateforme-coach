// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { draftFood } from '@/lib/nutrition/meal-draft'
import { mealDraftKey, readMealDraft, writeMealDraft, type StoredMealDraft } from '@/lib/nutrition/meal-draft-storage'
const make = (userId='A'):StoredMealDraft => ({version:1,userId,date:'2026-09-23',mealType:'diner',submitted:false,foods:[draftFood({name:'Synthetic',qty:100,kcal:100,prot:10,carb:10,fat:1})]})
beforeEach(()=>localStorage.clear())
it('isolates owner, date and meal and rejects foreign records',()=>{
  const draft=make(),key=mealDraftKey('A',draft.date,draft.mealType)
  const raw=writeMealDraft(localStorage,key,null,draft)
  expect(localStorage.getItem(mealDraftKey('B',draft.date,draft.mealType))).toBeNull()
  expect(localStorage.getItem(mealDraftKey('A','2026-09-24',draft.mealType))).toBeNull()
  expect(localStorage.getItem(mealDraftKey('A',draft.date,'dejeuner'))).toBeNull()
  expect(()=>readMealDraft(raw,'B',draft.date,draft.mealType)).toThrow()
  expect(readMealDraft(raw,'A',draft.date,draft.mealType)?.foods[0].id).toBe(draft.foods[0].id)
})
it('rejects stale writes and stale deletion without changing a newer draft',()=>{
  const draft=make(),key=mealDraftKey('A',draft.date,draft.mealType)
  const first=writeMealDraft(localStorage,key,null,draft)
  const next=writeMealDraft(localStorage,key,first,{...draft,submitted:true})
  expect(()=>writeMealDraft(localStorage,key,first,null)).toThrow('MEAL_DRAFT_CONFLICT')
  expect(()=>writeMealDraft(localStorage,key,first,draft)).toThrow('MEAL_DRAFT_CONFLICT')
  expect(localStorage.getItem(key)).toBe(next)
})
it('preserves an empty quantity but never accepts it as a submitted payload',()=>{
  const draft=make();draft.foods[0].quantity=NaN
  const raw=JSON.stringify(draft)
  expect(readMealDraft(raw,'A',draft.date,draft.mealType)?.foods[0].quantity).toBeNaN()
  expect(()=>readMealDraft(JSON.stringify({...draft,submitted:true}),'A',draft.date,draft.mealType)).toThrow()
})
it('rejects duplicate IDs, broken JSON and invalid nutrients',()=>{
  const draft=make()
  expect(()=>readMealDraft('{','A',draft.date,draft.mealType)).toThrow()
  expect(()=>readMealDraft(JSON.stringify({...draft,foods:[draft.foods[0],draft.foods[0]]}),'A',draft.date,draft.mealType)).toThrow()
  draft.foods[0].protein=-1
  expect(()=>readMealDraft(JSON.stringify(draft),'A',draft.date,draft.mealType)).toThrow()
})
