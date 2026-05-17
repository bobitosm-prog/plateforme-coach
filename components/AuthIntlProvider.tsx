import { NextIntlClientProvider } from 'next-intl'
import { getAppLocale } from '@/lib/get-locale'

/**
 * Wrapper pour les routes auth hors app/[locale]/.
 * Charge la locale via cookie/header et fournit le contexte i18n.
 */
export default async function AuthIntlProvider({ children }: { children: React.ReactNode }) {
  const locale = await getAppLocale()
  const messages = (await import(`../messages/${locale}.json`)).default

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
