// ─── Bauhaus/Swiss Design System ───
export const BG_BASE = '#050505'
export const BG_CARD = '#0D0C0B'
export const BG_CARD_2 = '#141310'
export const BORDER = '#3D3B38'
export const GOLD = '#C9A84C'
export const GOLD_DIM = 'rgba(201,168,76,0.15)'
export const GOLD_RULE = 'rgba(201,168,76,0.25)'
export const GREEN = '#4ade80'
export const RED = '#ef4444'
export const TEXT_PRIMARY = '#F0EDE8'
export const TEXT_MUTED = '#8A8580'
export const TEXT_DIM = '#3D3B38'
export const RADIUS_CARD = 2
export const FONT_DISPLAY = "'Bebas Neue', sans-serif"
export const FONT_ALT = "'Barlow Condensed', sans-serif"
export const FONT_BODY = "'Outfit', sans-serif"

// Legacy aliases (to avoid breaking imports)
export const ORANGE = GOLD

export const MUSCLE_COLORS: Record<string, string> = {
  'Poitrine': '#EF4444',
  'Dos': '#3B82F6',
  'Épaules': '#8B5CF6',
  'Bras': '#F97316',
  'Jambes': '#22C55E',
  'Abdos': '#EAB308',
  'Fessiers': '#EC4899',
  'Cardio': '#06B6D4',
}
export const MUSCLE_GROUPS_FILTER = ['Tous', 'Poitrine', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Abdos', 'Fessiers', 'Cardio']

export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Petit-déj', icon: '🥣' },
  { id: 'lunch', label: 'Déjeuner', icon: '🍽️' },
  { id: 'dinner', label: 'Dîner', icon: '🌙' },
  { id: 'snack', label: 'Collation', icon: '🍎' },
]

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sédentaire', sub: 'Bureau, peu/pas de sport', mult: 1.2 },
  { id: 'light', label: 'Légèrement actif', sub: '1-3 séances/semaine', mult: 1.375 },
  { id: 'moderate', label: 'Modérément actif', sub: '3-5 séances/semaine', mult: 1.55 },
  { id: 'active', label: 'Très actif', sub: '6-7 séances/semaine', mult: 1.725 },
  { id: 'extreme', label: 'Extrêmement actif', sub: 'Athlète / 2x/jour', mult: 1.9 },
]

export const JS_DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
export const WEEK_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export const NUTRITION_DAYS: { key: string; label: string }[] = [
  { key: 'lundi',    label: 'Lun' },
  { key: 'mardi',    label: 'Mar' },
  { key: 'mercredi', label: 'Mer' },
  { key: 'jeudi',    label: 'Jeu' },
  { key: 'vendredi', label: 'Ven' },
  { key: 'samedi',   label: 'Sam' },
  { key: 'dimanche', label: 'Dim' },
]

export function todayNutritionKey(): string {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 'dimanche' : NUTRITION_DAYS[jsDay - 1].key
}

export function calcMifflinStJeor(weight: number, height: number, age: number, gender: string) {
  const base = 10 * weight + 6.25 * height - 5 * age
  return gender === 'male' ? base + 5 : base - 161
}
export function calcKatchMcArdle(weight: number, bodyFatPct: number) {
  const leanMass = weight * (1 - bodyFatPct / 100)
  return 370 + 21.6 * leanMass
}
export function calcHarrisBenedict(weight: number, height: number, age: number, gender: string) {
  return gender === 'male'
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age
}
