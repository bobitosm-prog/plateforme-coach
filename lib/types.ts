export interface FitnessFood {
  id: string
  name: string
  name_en: string | null
  category: 'proteines' | 'glucides' | 'lipides' | 'micronutriments'
  subcategory: string | null
  emoji: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fiber_per_100g: number | null
  is_cooked: boolean
  is_vegan: boolean
  is_vegetarian: boolean
  allergens: string[] | null
  notes: string | null
}
