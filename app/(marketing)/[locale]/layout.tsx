import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '../../../i18n/routing'
import CookieConsent from '@/components/CookieConsent'
import RootDocument, { rootMetadata } from '@/app/components/layout/RootDocument'

export const metadata = rootMetadata

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return (
    <RootDocument lang={locale}>
      <NextIntlClientProvider>
        {children}
        <CookieConsent />
      </NextIntlClientProvider>
    </RootDocument>
  )
}
