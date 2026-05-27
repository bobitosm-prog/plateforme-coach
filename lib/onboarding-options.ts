// Constants for onboarding fitness questions
// Used by both v1 (/onboarding-fitness) and v2 (/onboarding-v2 SOLO flow)
// dbLabel = FR string persisted to DB (used by mapGoalToObjective in v1)
// Display uses t() from i18n in v2 (and existing i18n in v1)

export type OnboardingOption = { dbLabel: string; pts: number; icon: string }

export const GOALS: OnboardingOption[] = [
  { dbLabel: 'Perdre du poids', pts: 3, icon: 'local_fire_department' },
  { dbLabel: 'Prendre du muscle', pts: 4, icon: 'fitness_center' },
  { dbLabel: 'Ameliorer ma condition', pts: 2, icon: 'directions_run' },
  { dbLabel: 'Me remettre en forme', pts: 3, icon: 'refresh' },
]

export const ACTIVITY_OPTS: OnboardingOption[] = [
  { dbLabel: 'Sedentaire <1x/sem', pts: 1, icon: 'weekend' },
  { dbLabel: 'Actif 1-2x/sem', pts: 3, icon: 'directions_walk' },
  { dbLabel: 'Regulier 3-4x/sem', pts: 5, icon: 'directions_run' },
  { dbLabel: 'Avance 5x+/sem', pts: 7, icon: 'bolt' },
]

export const NUTRITION_OPTS: OnboardingOption[] = [
  { dbLabel: 'Sans faire attention', pts: 1, icon: 'fastfood' },
  { dbLabel: "J'essaie de bien manger", pts: 3, icon: 'restaurant' },
  { dbLabel: 'Je suis mes macros', pts: 5, icon: 'analytics' },
  { dbLabel: 'Regime specifique', pts: 4, icon: 'eco' },
]

export const EXPERIENCE_OPTS: OnboardingOption[] = [
  { dbLabel: 'Debutant <6 mois', pts: 1, icon: 'school' },
  { dbLabel: 'Intermediaire 6m-2ans', pts: 3, icon: 'trending_up' },
  { dbLabel: 'Experimente 2-5ans', pts: 6, icon: 'military_tech' },
  { dbLabel: 'Veteran 5ans+', pts: 8, icon: 'emoji_events' },
]
