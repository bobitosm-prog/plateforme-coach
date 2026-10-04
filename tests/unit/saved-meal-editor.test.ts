import { describe, expect, it } from 'vitest'
import { prepareSavedFood, resizeSavedFood, savedMealTotals, validSavedMeal } from '@/lib/nutrition/saved-meal-editor'
describe('saved meal quantity editing', () => {
  it('keeps nutrients through intermediate empty and tiny quantities and after reopening', () => {
    let food = prepareSavedFood({ name: 'Oats', quantity: 100, calories: 379, protein: 13, carbs: 67, fat: 7 })
    for (const amount of ['', '0', '1', '5', '55']) food = resizeSavedFood(food, amount) as any
    expect(food.calories).toBeCloseTo(208.45)
    expect(food.protein).toBeCloseTo(7.15)
    const reopened = prepareSavedFood(JSON.parse(JSON.stringify(food)))
    expect(resizeSavedFood(reopened, '100').protein).toBe(13)
  })
  it('supports legacy plural nutrients and stores actual database column names', () => {
    const food = prepareSavedFood({quantity_g: 150, calories: 232.5, proteins: 19.5, carbs: 1.5, fats: 16.5})
    expect(resizeSavedFood(food, '100').protein).toBe(13)
    expect(savedMealTotals([food])).toEqual({total_calories:232.5,total_proteins:19.5,total_carbs:1.5,total_fats:16.5})
  })
  it('rejects empty names, meals, non-positive and non-finite quantities', () => {
    const food = prepareSavedFood({quantity:100,calories:50,protein:5})
    const meal = {name:'Breakfast',meal_type:'petit_dejeuner',foods:[food]}
    expect(validSavedMeal(meal)).toBe(true)
    for (const quantity of ['', 0, -1, Infinity, 10001]) expect(validSavedMeal({...meal,foods:[{...food,quantity_g:quantity}]})).toBe(false)
    expect(validSavedMeal({...meal,name:' '})).toBe(false)
    expect(validSavedMeal({...meal,foods:[]})).toBe(false)
  })
})
