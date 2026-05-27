// Constants for onboarding fitness questions
// Used by both v1 (/onboarding-fitness) and v2 (/onboarding-v2 SOLO flow)
// id = stable snake_case key for i18n in v2
// dbLabel = FR string persisted to DB (used by mapGoalToObjective in v1 — DO NOT MODIFY)
// Display uses t() from i18n in v2 (and existing i18n in v1)

export type OnboardingOption = { id: string; dbLabel: string; pts: number; icon: string }

export const GOALS: OnboardingOption[] = [
  { id: 'lose_weight', dbLabel: 'Perdre du poids', pts: 3, icon: 'local_fire_department' },
  { id: 'gain_muscle', dbLabel: 'Prendre du muscle', pts: 4, icon: 'fitness_center' },
  { id: 'improve_condition', dbLabel: 'Ameliorer ma condition', pts: 2, icon: 'directions_run' },
  { id: 'get_back_shape', dbLabel: 'Me remettre en forme', pts: 3, icon: 'refresh' },
]

export const ACTIVITY_OPTS: OnboardingOption[] = [
  { id: 'sedentary', dbLabel: 'Sedentaire <1x/sem', pts: 1, icon: 'weekend' },
  { id: 'active', dbLabel: 'Actif 1-2x/sem', pts: 3, icon: 'directions_walk' },
  { id: 'regular', dbLabel: 'Regulier 3-4x/sem', pts: 5, icon: 'directions_run' },
  { id: 'advanced', dbLabel: 'Avance 5x+/sem', pts: 7, icon: 'bolt' },
]

export const NUTRITION_OPTS: OnboardingOption[] = [
  { id: 'no_attention', dbLabel: 'Sans faire attention', pts: 1, icon: 'fastfood' },
  { id: 'try_well', dbLabel: "J'essaie de bien manger", pts: 3, icon: 'restaurant' },
  { id: 'macros', dbLabel: 'Je suis mes macros', pts: 5, icon: 'analytics' },
  { id: 'specific_diet', dbLabel: 'Regime specifique', pts: 4, icon: 'eco' },
]

export const EXPERIENCE_OPTS: OnboardingOption[] = [
  { id: 'beginner', dbLabel: 'Debutant <6 mois', pts: 1, icon: 'school' },
  { id: 'intermediate', dbLabel: 'Intermediaire 6m-2ans', pts: 3, icon: 'trending_up' },
  { id: 'experienced', dbLabel: 'Experimente 2-5ans', pts: 6, icon: 'military_tech' },
  { id: 'veteran', dbLabel: 'Veteran 5ans+', pts: 8, icon: 'emoji_events' },
]
