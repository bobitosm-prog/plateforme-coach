import { cookies, headers } from 'next/headers'

export type AppLocale = 'fr' | 'en' | 'de'

const SUPPORTED_LOCALES: readonly AppLocale[] = ['fr', 'en', 'de']
const DEFAULT_LOCALE: AppLocale = 'fr'

/**
 * Détecte la locale active pour une route HORS app/[locale]/.
 * Priorité : cookie NEXT_LOCALE > Accept-Language header > fallback fr.
 */
export async function getAppLocale(): Promise<AppLocale> {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as AppLocale | undefined

  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale
  }

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') ?? ''
  const browserLocale = acceptLanguage.split(',')[0]?.split('-')[0] as AppLocale | undefined

  if (browserLocale && SUPPORTED_LOCALES.includes(browserLocale)) {
    return browserLocale
  }

  return DEFAULT_LOCALE
}
