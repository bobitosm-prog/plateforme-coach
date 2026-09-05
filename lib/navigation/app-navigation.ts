export const APP_NAVIGATION_TABS = ['home', 'training', 'nutrition', 'progression', 'account'] as const
export const ACCOUNT_NAVIGATION_SECTIONS = [
  'programs',
  'training-program',
  'nutrition-program',
  'profile',
  'messages',
  'feedback',
  'preferences',
  'account',
  'goals',
] as const

export type AppNavigationTab = typeof APP_NAVIGATION_TABS[number]
export type AccountNavigationSection = typeof ACCOUNT_NAVIGATION_SECTIONS[number]
export type AppNavigationMode = 'configure'

export interface AppNavigationState {
  tab: AppNavigationTab
  section?: AccountNavigationSection
  mode?: AppNavigationMode
}

type SearchParamsReader = Pick<URLSearchParams, 'get' | 'toString'>

function isOneOf<T extends string>(value: string | null, values: readonly T[]): value is T {
  return value !== null && values.includes(value as T)
}

export function normalizeAppNavigation(state: AppNavigationState): AppNavigationState {
  if (state.tab !== 'account') return { tab: state.tab }
  if (!state.section) return { tab: 'account' }
  if (state.mode === 'configure' && state.section === 'training-program') return state
  return { tab: 'account', section: state.section }
}

export function parseAppNavigation(searchParams: SearchParamsReader): AppNavigationState {
  const rawTab = searchParams.get('tab')
  const tab = isOneOf(rawTab, APP_NAVIGATION_TABS) ? rawTab : 'home'
  if (tab !== 'account') return { tab }

  const rawSection = searchParams.get('section')
  if (!isOneOf(rawSection, ACCOUNT_NAVIGATION_SECTIONS)) return { tab: 'account' }

  const rawMode = searchParams.get('mode')
  return normalizeAppNavigation({
    tab: 'account',
    section: rawSection,
    mode: rawMode === 'configure' ? rawMode : undefined,
  })
}

export function serializeAppNavigation(state: AppNavigationState): string {
  const normalized = normalizeAppNavigation(state)
  if (normalized.tab === 'home') return ''

  const result = new URLSearchParams({ tab: normalized.tab })
  if (normalized.section) result.set('section', normalized.section)
  if (normalized.mode) result.set('mode', normalized.mode)
  return result.toString()
}

export function normalizeAppNavigationQuery(searchParams: SearchParamsReader): string {
  const result = new URLSearchParams(searchParams.toString())
  result.delete('tab')
  result.delete('section')
  result.delete('mode')

  const canonical = new URLSearchParams(serializeAppNavigation(parseAppNavigation(searchParams)))
  canonical.forEach((value, key) => result.set(key, value))
  return result.toString()
}

export function appNavigationHref(state: AppNavigationState): string {
  const query = serializeAppNavigation(state)
  return query ? `/?${query}` : '/'
}
