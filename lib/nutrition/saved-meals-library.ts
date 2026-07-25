export type SavedMealsLibraryStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'

export interface SavedMealsLibraryMeal {
  readonly user_id?: unknown
}

export interface SavedMealsLibraryState<T extends SavedMealsLibraryMeal> {
  readonly status: SavedMealsLibraryStatus
  readonly ownerUserId: string | null
  readonly meals: readonly T[]
}

export interface SavedMealsLibraryRead<T extends SavedMealsLibraryMeal> {
  readonly data: readonly T[] | null
  readonly error: unknown | null
}

type MealsReplacement<T> =
  | readonly T[]
  | ((previous: T[]) => readonly T[])

export function createEmptySavedMealsLibrary<
  T extends SavedMealsLibraryMeal,
>(): SavedMealsLibraryState<T> {
  return {
    status: 'idle',
    ownerUserId: null,
    meals: [],
  }
}

export function beginSavedMealsLibraryRead<
  T extends SavedMealsLibraryMeal,
>(
  previous: SavedMealsLibraryState<T>,
  ownerUserId: string,
): SavedMealsLibraryState<T> {
  return {
    status: 'loading',
    ownerUserId,
    meals: previous.ownerUserId === ownerUserId ? previous.meals : [],
  }
}

export function settleSavedMealsLibraryRead<
  T extends SavedMealsLibraryMeal,
>(
  previous: SavedMealsLibraryState<T>,
  read: SavedMealsLibraryRead<T>,
  ownerUserId: string,
  isCurrentRequest: boolean,
): SavedMealsLibraryState<T> {
  if (!isCurrentRequest || previous.ownerUserId !== ownerUserId) return previous
  if (read.error || read.data === null) {
    return { ...previous, status: 'error' }
  }
  if (read.data.some(meal => meal.user_id !== ownerUserId)) {
    return { ...previous, status: 'error' }
  }
  const meals = [...read.data]
  return {
    status: meals.length > 0 ? 'ready' : 'empty',
    ownerUserId,
    meals,
  }
}

export function replaceSavedMealsLibraryMeals<
  T extends SavedMealsLibraryMeal,
>(
  previous: SavedMealsLibraryState<T>,
  replacement: MealsReplacement<T>,
): SavedMealsLibraryState<T> {
  const meals = typeof replacement === 'function'
    ? [...replacement([...previous.meals])]
    : [...replacement]
  return {
    ...previous,
    status: meals.length > 0 ? 'ready' : 'empty',
    meals,
  }
}
