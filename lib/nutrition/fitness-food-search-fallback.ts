import { FITNESS_FOODS, type FitnessFood } from '../fitness-food-database'

export interface FoodSearchCatalogItem {
  id: string
  nom: string
  calories: number
  proteines: number
  glucides: number
  lipides: number
  source: string
  cat: string
}

export interface DailyFoodLogSnapshot {
  user_id: string
  date: string
  meal_type: string
  custom_name: string
  quantity_g: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

type CategorizeFood = (name: string) => string

function slugifyFitnessFoodName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function mapFitnessFoodsToSearchCatalog(
  categorize: CategorizeFood,
  foods: readonly FitnessFood[] = FITNESS_FOODS,
): FoodSearchCatalogItem[] {
  return foods.map(food => ({
    id: `fitness-local:${slugifyFitnessFoodName(food.name)}`,
    nom: food.name,
    calories: food.kcal,
    proteines: food.prot,
    glucides: food.carb,
    lipides: food.fat,
    source: 'fitness-local',
    cat: categorize(food.name),
  }))
}

export function selectInitialFoodSearchCatalog({
  remoteFoods,
  readError,
  categorize,
}: {
  remoteFoods: FoodSearchCatalogItem[]
  readError: unknown
  categorize: CategorizeFood
}): FoodSearchCatalogItem[] {
  if (!readError && remoteFoods.length > 0) return remoteFoods
  return mapFitnessFoodsToSearchCatalog(categorize)
}

export function searchFoodSearchCatalog(
  foods: readonly FoodSearchCatalogItem[],
  query: string,
): FoodSearchCatalogItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('fr')
  if (!normalizedQuery) return [...foods]
  return foods.filter(food => food.nom.toLocaleLowerCase('fr').includes(normalizedQuery))
}

export function buildDailyFoodLogSnapshot({
  food,
  quantity,
  userId,
  date,
  mealType,
}: {
  food: FoodSearchCatalogItem
  quantity: number
  userId: string
  date: string
  mealType: string
}): DailyFoodLogSnapshot {
  return {
    user_id: userId,
    date,
    meal_type: mealType,
    custom_name: food.nom,
    quantity_g: quantity,
    calories: Math.round((food.calories * quantity) / 100),
    protein: Math.round(((food.proteines * quantity) / 100) * 10) / 10,
    carbs: Math.round(((food.glucides * quantity) / 100) * 10) / 10,
    fat: Math.round(((food.lipides * quantity) / 100) * 10) / 10,
  }
}
