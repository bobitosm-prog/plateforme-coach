import { describe, expect, it } from 'vitest'
import { FITNESS_FOODS } from '../../lib/fitness-food-database'
import {
  buildDailyFoodLogSnapshot,
  mapFitnessFoodsToSearchCatalog,
  searchFoodSearchCatalog,
  selectInitialFoodSearchCatalog,
  type FoodSearchCatalogItem,
} from '../../lib/nutrition/fitness-food-search-fallback'

const categorize = (name: string) => name.toLocaleLowerCase('fr').includes('poulet')
  ? 'proteines'
  : 'autres'

const remoteFood: FoodSearchCatalogItem = {
  id: 'remote-food-id',
  nom: 'Aliment distant',
  calories: 100,
  proteines: 10,
  glucides: 5,
  lipides: 2,
  source: 'fitness',
  cat: 'autres',
}

describe('FoodSearch fitness fallback', () => {
  it('preserves a non-empty remote catalog without adding local foods', () => {
    const remoteFoods = [remoteFood]

    const selected = selectInitialFoodSearchCatalog({
      remoteFoods,
      readError: null,
      categorize,
    })

    expect(selected).toBe(remoteFoods)
    expect(selected).toEqual([remoteFood])
    expect(selected.some(food => food.source === 'fitness-local')).toBe(false)
  })

  it('uses all curated fitness foods when the remote catalog is empty', () => {
    const selected = selectInitialFoodSearchCatalog({
      remoteFoods: [],
      readError: null,
      categorize,
    })

    expect(selected).toHaveLength(FITNESS_FOODS.length)
    expect(selected.every(food => food.source === 'fitness-local')).toBe(true)
    expect(new Set(selected.map(food => food.id)).size).toBe(selected.length)
  })

  it('uses the local fallback when reading food_items fails', () => {
    const selected = selectInitialFoodSearchCatalog({
      remoteFoods: [remoteFood],
      readError: new Error('food_items unavailable'),
      categorize,
    })

    expect(selected).toHaveLength(FITNESS_FOODS.length)
    expect(selected.some(food => food.id === remoteFood.id)).toBe(false)
  })

  it('finds both curated chicken foods with the local search', () => {
    const foods = mapFitnessFoodsToSearchCatalog(categorize)
    const matches = searchFoodSearchCatalog(foods, 'poulet')
    const riceMatches = searchFoodSearchCatalog(foods, 'riz basmati')

    expect(matches.map(food => food.nom)).toEqual(expect.arrayContaining([
      'Blanc de poulet cuit',
      'Cuisse de poulet cuite sans peau',
    ]))
    expect(riceMatches.map(food => food.nom)).toContain('Riz basmati cuit')
  })

  it('maps the cooked chicken breast macros exactly', () => {
    const chicken = mapFitnessFoodsToSearchCatalog(categorize)
      .find(food => food.nom === 'Blanc de poulet cuit')

    expect(chicken).toEqual({
      id: 'fitness-local:blanc-de-poulet-cuit',
      nom: 'Blanc de poulet cuit',
      calories: 165,
      proteines: 31,
      glucides: 0,
      lipides: 3.6,
      source: 'fitness-local',
      cat: 'proteines',
    })
  })

  it('builds a journal snapshot with custom_name and without food_id', () => {
    const chicken = mapFitnessFoodsToSearchCatalog(categorize)
      .find(food => food.nom === 'Blanc de poulet cuit')

    expect(chicken).toBeDefined()
    const snapshot = buildDailyFoodLogSnapshot({
      food: chicken!,
      quantity: 150,
      userId: 'client-id',
      date: '2026-07-30',
      mealType: 'dejeuner',
    })

    expect(snapshot).toEqual({
      user_id: 'client-id',
      date: '2026-07-30',
      meal_type: 'dejeuner',
      custom_name: 'Blanc de poulet cuit',
      quantity_g: 150,
      calories: 248,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
    })
    expect(snapshot).not.toHaveProperty('food_id')
  })
})
