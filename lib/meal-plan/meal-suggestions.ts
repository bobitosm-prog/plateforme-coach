/**
 * Shared meal suggestion constants for nutrition preferences.
 *
 * Used by:
 *   - app/components/NutritionPreferences.tsx (page nutrition)
 *   - app/onboarding-v2/steps/solo/SoloStep11Preferences.tsx (onboarding step)
 *
 * MEAL_KEYS order is canonical: breakfast → snack → lunch → dinner.
 * Food names are FR nutrition data (separate i18n sprint, cf. MEAL_DEFAULTS comment).
 */

export const MEAL_KEYS = ['breakfast', 'snack', 'lunch', 'dinner'] as const

export type MealKey = (typeof MEAL_KEYS)[number]

export const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🌅',
  snack: '🍎',
  lunch: '☀️',
  dinner: '🌙',
}

// Food defaults are FR nutrition data — separate i18n sprint
export const MEAL_DEFAULTS: Record<string, string[]> = {
  breakfast: ["Flocons d'avoine", 'Skyr nature', 'Yaourt grec', 'Banane', 'Oeufs', 'Pain complet', 'Fromage blanc', 'Myrtilles', 'Whey proteine', 'Beurre de cacahuete', 'Lait', 'Miel'],
  snack: ['Pomme', 'Amandes', 'Yaourt grec', 'Fromage blanc', 'Whey proteine', 'Banane', 'Barre proteinee', 'Cottage cheese', 'Fruits secs', 'Noix'],
  lunch: ['Blanc de poulet', 'Riz basmati', 'Pates completes', 'Patate douce', 'Saumon', 'Brocoli', 'Quinoa', 'Lentilles', 'Thon', 'Epinards', 'Boeuf hache', 'Legumes verts'],
  dinner: ['Blanc de poulet', 'Poisson blanc', 'Dinde', 'Legumes vapeur', 'Oeufs', 'Riz basmati', 'Saumon', 'Brocoli', 'Boeuf', 'Patate douce', 'Crevettes', 'Salade verte'],
}
