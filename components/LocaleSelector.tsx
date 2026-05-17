'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Locale = 'fr' | 'en' | 'de'

const LOCALES: Array<{ code: Locale; label: string; flag: string }> = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
]

/**
 * Sélecteur de langue intégré dans la liste des préférences (Compte > Préférences).
 * 3 boutons FR / EN / DE côte à côte, actif highlighted en gold.
 */
export default function LocaleSelector() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentLocale, setCurrentLocale] = useState<Locale>('fr')

  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=([a-z]{2})/)
    const value = match?.[1]
    if (value && LOCALES.some(l => l.code === value)) {
      setCurrentLocale(value as Locale)
    }
  }, [])

  const handleSelect = async (locale: Locale) => {
    if (locale === currentLocale || isPending) return
    startTransition(async () => {
      try {
        const res = await fetch('/api/user/locale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale }),
        })
        if (!res.ok) {
          console.error('[LocaleSelector] API error', await res.text())
          return
        }
        setCurrentLocale(locale)
        router.refresh()
        window.location.reload()
      } catch (e) {
        console.error('[LocaleSelector] Network error', e)
      }
    })
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {LOCALES.map((locale) => {
        const isActive = locale.code === currentLocale
        return (
          <button
            key={locale.code}
            type="button"
            onClick={() => handleSelect(locale.code)}
            disabled={isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px',
              border: isActive ? 'none' : '1px solid rgba(255,255,255,0.06)',
              background: isActive ? '#D4A843' : 'rgba(255,255,255,0.03)',
              color: isActive ? '#0D0B08' : 'rgba(255,255,255,0.6)',
              cursor: isPending ? 'wait' : 'pointer',
              opacity: isPending ? 0.5 : 1,
              transition: 'all 150ms',
            }}
            aria-pressed={isActive}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{locale.flag}</span>
            <span>{locale.code}</span>
          </button>
        )
      })}
    </div>
  )
}
