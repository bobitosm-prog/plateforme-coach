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

// Mapping id UI → objective canonique (CHECK profiles_objective_canonical, refonte 03/07)
export const GOAL_TO_OBJECTIVE: Record<string, 'cut' | 'mass' | 'maintain'> = {
  lose_weight: 'cut',
  gain_muscle: 'mass',
  improve_condition: 'maintain',
  get_back_shape: 'maintain',
}

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

// Phase 6B Training equipment (F6.B.1)
// dbLabel = valeur persistée dans profiles.training_location (enum CHECK constraint)
// pts = 0 (pas d'impact algo Mifflin-St Jeor)

export const LOCATION_OPTS: OnboardingOption[] = [
  { id: 'home', dbLabel: 'home', pts: 0, icon: 'home' },
  { id: 'gym', dbLabel: 'gym', pts: 0, icon: 'fitness_center' },
  { id: 'both', dbLabel: 'both', pts: 0, icon: 'swap_horiz' },
]

// Sous-options conditionnelles si LOCATION_OPTS = home ou both
// dbLabel = valeur persistée dans profiles.home_equipment[] (array element)
// Bodyweight assumé toujours dispo (pas dans la liste)

export const HOME_EQUIPMENT_OPTS: OnboardingOption[] = [
  { id: 'dumbbell', dbLabel: 'dumbbell', pts: 0, icon: 'fitness_center' },
  { id: 'kettlebell', dbLabel: 'kettlebell', pts: 0, icon: 'sports_handball' },
  { id: 'band', dbLabel: 'band', pts: 0, icon: 'all_inclusive' },
]
