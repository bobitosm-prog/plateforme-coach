'use client'
import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { aiConsentCopy } from '@/lib/ai/consent-copy'
import { AiConsentDeclinedError, ensureAiConsent, getAiConsent, setAiConsent } from '@/lib/ai/consent-client'
import { colors, cardStyle } from '@/lib/design-tokens'

export default function AiConsentPreferences({ userId }: { userId?: string }) {
  const locale = useLocale()
  const t = aiConsentCopy[locale === 'en' || locale === 'de' ? locale : 'fr']
  const [granted, setGranted] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    let current = true
    const load = async () => {
      try {
        const status = await getAiConsent()
        if (!current) return
        if (status.userId !== userId) throw new Error()
        setGranted(status.granted)
        setError(false)
      } catch { if (current) setError(true) }
    }
    if (userId) void load()
    window.addEventListener('moovx-ai-consent-changed', load)
    return () => { current = false; window.removeEventListener('moovx-ai-consent-changed', load) }
  }, [userId])
  async function change() {
    if (!userId || busy) return
    setBusy(true); setError(false)
    try {
      if (granted) await setAiConsent(userId, false)
      else await ensureAiConsent(userId)
      const status = await getAiConsent()
      if (status.userId !== userId) throw new Error()
      setGranted(status.granted)
    } catch (err) { if (!(err instanceof AiConsentDeclinedError)) setError(true) }
    finally { setBusy(false) }
  }
  return <section style={{ ...cardStyle, padding: 20 }} aria-label={t.settings}>
    <h3 style={{ color: colors.gold, fontSize: 18, margin: '0 0 8px' }}>{t.settings}</h3>
    <p aria-live="polite">{granted === null ? t.loading : granted ? t.active : t.inactive}</p>
    <button type="button" onClick={() => void change()} disabled={busy || !userId || (granted === null && !error)}
      style={{ minHeight: 48, padding: '10px 16px', borderRadius: 12, border: `1px solid ${colors.gold}`, background: 'transparent', color: colors.gold, fontSize: 16 }}>
      {busy ? t.loading : granted ? t.revoke : t.enable}
    </button>
    {error && <p role="alert">{t.error}</p>}
  </section>
}
