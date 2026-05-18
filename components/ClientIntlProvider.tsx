'use client'

import { NextIntlClientProvider } from 'next-intl'
import { useState, useEffect } from 'react'

/**
 * Client-side i18n provider for components inside 'use client' pages
 * that don't have a server-side AuthIntlProvider parent.
 *
 * Reads locale from cookie NEXT_LOCALE, dynamically imports messages.
 * Use this for components like Paywall that live inside app/page.tsx (SPA).
 */
export default function ClientIntlProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [locale, setLocale] = useState('fr')
  const [messages, setMessages] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=([a-z]{2})/)
    const detected = match?.[1] || 'fr'
    setLocale(detected)

    import(`../messages/${detected}.json`).then((mod) => {
      setMessages(mod.default)
      setReady(true)
    })
  }, [])

  if (!ready || !messages) return null

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
