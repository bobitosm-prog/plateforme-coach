export interface SavedMealSelectionState<T> {
  readonly status: 'idle' | 'loading' | 'ready' | 'empty' | 'error'
  readonly meals: readonly T[]
}

export interface SavedMealSelectionRead<T> {
  readonly data: readonly T[] | null
  readonly error: unknown | null
}

export const SAVED_MEAL_SELECTION_ERROR_MESSAGE =
  'Les repas sauvegardés n’ont pas pu être chargés. Réessaie dans un instant.'

export function createEmptySavedMealSelection<T>(): SavedMealSelectionState<T> {
  return { status: 'idle', meals: [] }
}

export function beginSavedMealSelection<T>(
  previous: SavedMealSelectionState<T>,
): SavedMealSelectionState<T> {
  return { status: 'loading', meals: previous.meals }
}

export function settleSavedMealSelection<T>(
  previous: SavedMealSelectionState<T>,
  read: SavedMealSelectionRead<T>,
  isCurrentRequest: boolean,
): SavedMealSelectionState<T> {
  if (!isCurrentRequest) return previous
  if (read.error) return { status: 'error', meals: previous.meals }
  const meals = read.data ?? []
  return {
    status: meals.length > 0 ? 'ready' : 'empty',
    meals,
  }
}
