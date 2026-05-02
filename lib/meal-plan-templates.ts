type FoodItem = { name: string; qty: string; kcal: number; prot: number; carb: number; fat: number }
type Meal = { type: string; foods: FoodItem[] }
type DayMealData = { meals: Meal[] }
type WeekMealPlan = Record<string, DayMealData>

export type MealPlanTemplate = {
  id: 'cut' | 'maintain' | 'bulk'
  name: string
  description: string
  macros: {
    calorieTarget: number
    protTarget: number
    carbTarget: number
    fatTarget: number
  }
  plan: WeekMealPlan
}

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function makeDayPlan(meals: Meal[]): DayMealData {
  return { meals }
}

function makeWeek(meals: Meal[]): WeekMealPlan {
  const plan: WeekMealPlan = {}
  for (const d of DAYS) plan[d] = makeDayPlan(meals.map(m => ({ ...m, foods: m.foods.map(f => ({ ...f })) })))
  return plan
}

// ── CUT (sèche) — 1800 kcal ──
const cutMeals: Meal[] = [
  { type: 'Petit-déjeuner', foods: [
    { name: 'Flocons d\'avoine', qty: '50g', kcal: 190, prot: 7, carb: 32, fat: 4 },
    { name: 'Whey protéine', qty: '30g', kcal: 120, prot: 24, carb: 3, fat: 1 },
    { name: 'Banane', qty: '1 moyenne', kcal: 90, prot: 1, carb: 23, fat: 0 },
  ]},
  { type: 'Déjeuner', foods: [
    { name: 'Blanc de poulet', qty: '150g', kcal: 248, prot: 46, carb: 0, fat: 5 },
    { name: 'Riz basmati cuit', qty: '100g', kcal: 130, prot: 3, carb: 28, fat: 0 },
    { name: 'Brocolis', qty: '200g', kcal: 68, prot: 6, carb: 7, fat: 1 },
  ]},
  { type: 'Collation', foods: [
    { name: 'Amandes', qty: '25g', kcal: 145, prot: 5, carb: 3, fat: 13 },
    { name: 'Pomme', qty: '1 moyenne', kcal: 72, prot: 0, carb: 19, fat: 0 },
  ]},
  { type: 'Dîner', foods: [
    { name: 'Saumon', qty: '150g', kcal: 312, prot: 34, carb: 0, fat: 19 },
    { name: 'Patate douce', qty: '150g', kcal: 135, prot: 2, carb: 31, fat: 0 },
    { name: 'Salade verte + vinaigrette', qty: '100g', kcal: 45, prot: 1, carb: 3, fat: 3 },
  ]},
]

// ── MAINTAIN — 2200 kcal (+30%) ──
const maintainMeals: Meal[] = [
  { type: 'Petit-déjeuner', foods: [
    { name: 'Flocons d\'avoine', qty: '65g', kcal: 247, prot: 9, carb: 42, fat: 5 },
    { name: 'Whey protéine', qty: '30g', kcal: 120, prot: 24, carb: 3, fat: 1 },
    { name: 'Banane', qty: '1 moyenne', kcal: 90, prot: 1, carb: 23, fat: 0 },
    { name: 'Beurre de cacahuète', qty: '15g', kcal: 94, prot: 4, carb: 2, fat: 8 },
  ]},
  { type: 'Déjeuner', foods: [
    { name: 'Blanc de poulet', qty: '180g', kcal: 297, prot: 55, carb: 0, fat: 6 },
    { name: 'Riz basmati cuit', qty: '150g', kcal: 195, prot: 4, carb: 42, fat: 0 },
    { name: 'Brocolis', qty: '200g', kcal: 68, prot: 6, carb: 7, fat: 1 },
  ]},
  { type: 'Collation', foods: [
    { name: 'Amandes', qty: '30g', kcal: 174, prot: 6, carb: 3, fat: 15 },
    { name: 'Pomme', qty: '1 moyenne', kcal: 72, prot: 0, carb: 19, fat: 0 },
    { name: 'Yaourt grec 0%', qty: '150g', kcal: 87, prot: 15, carb: 6, fat: 0 },
  ]},
  { type: 'Dîner', foods: [
    { name: 'Saumon', qty: '180g', kcal: 374, prot: 41, carb: 0, fat: 23 },
    { name: 'Patate douce', qty: '200g', kcal: 180, prot: 3, carb: 42, fat: 0 },
    { name: 'Salade verte + vinaigrette', qty: '120g', kcal: 54, prot: 1, carb: 4, fat: 4 },
  ]},
]

// ── BULK (prise de masse) — 2800 kcal (+60%) ──
const bulkMeals: Meal[] = [
  { type: 'Petit-déjeuner', foods: [
    { name: 'Flocons d\'avoine', qty: '80g', kcal: 304, prot: 11, carb: 51, fat: 6 },
    { name: 'Whey protéine', qty: '40g', kcal: 160, prot: 32, carb: 4, fat: 2 },
    { name: 'Banane', qty: '1 grande', kcal: 110, prot: 1, carb: 28, fat: 0 },
    { name: 'Beurre de cacahuète', qty: '25g', kcal: 157, prot: 6, carb: 3, fat: 14 },
  ]},
  { type: 'Déjeuner', foods: [
    { name: 'Blanc de poulet', qty: '220g', kcal: 363, prot: 68, carb: 0, fat: 8 },
    { name: 'Riz basmati cuit', qty: '200g', kcal: 260, prot: 5, carb: 56, fat: 1 },
    { name: 'Brocolis', qty: '200g', kcal: 68, prot: 6, carb: 7, fat: 1 },
    { name: 'Huile d\'olive', qty: '10ml', kcal: 88, prot: 0, carb: 0, fat: 10 },
  ]},
  { type: 'Collation', foods: [
    { name: 'Amandes', qty: '40g', kcal: 232, prot: 8, carb: 4, fat: 20 },
    { name: 'Banane', qty: '1 moyenne', kcal: 90, prot: 1, carb: 23, fat: 0 },
    { name: 'Yaourt grec 0%', qty: '200g', kcal: 116, prot: 20, carb: 8, fat: 0 },
    { name: 'Miel', qty: '15g', kcal: 48, prot: 0, carb: 12, fat: 0 },
  ]},
  { type: 'Dîner', foods: [
    { name: 'Saumon', qty: '200g', kcal: 416, prot: 45, carb: 0, fat: 25 },
    { name: 'Patate douce', qty: '250g', kcal: 225, prot: 4, carb: 52, fat: 0 },
    { name: 'Salade verte + vinaigrette', qty: '120g', kcal: 54, prot: 1, carb: 4, fat: 4 },
  ]},
]

export const MEAL_PLAN_TEMPLATES: MealPlanTemplate[] = [
  {
    id: 'cut',
    name: 'Sèche',
    description: 'Déficit calorique, haute protéine',
    macros: { calorieTarget: 1800, protTarget: 150, carbTarget: 150, fatTarget: 70 },
    plan: makeWeek(cutMeals),
  },
  {
    id: 'maintain',
    name: 'Maintien',
    description: 'Calories d\'équilibre, macros balancées',
    macros: { calorieTarget: 2200, protTarget: 140, carbTarget: 240, fatTarget: 75 },
    plan: makeWeek(maintainMeals),
  },
  {
    id: 'bulk',
    name: 'Prise de masse',
    description: 'Surplus calorique, volume élevé',
    macros: { calorieTarget: 2800, protTarget: 170, carbTarget: 350, fatTarget: 80 },
    plan: makeWeek(bulkMeals),
  },
]
