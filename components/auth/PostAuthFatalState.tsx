'use client'

import { useTranslations } from 'next-intl'
import { BG_BASE, BG_CARD, BORDER, FONT_BODY, GOLD, TEXT_MUTED, TEXT_PRIMARY } from '@/lib/app-design-tokens'

export default function PostAuthFatalState({ state, onRetry }: { state: 'missing' | 'error'; onRetry: () => void }) {
  const t = useTranslations('auth.routing')
  return (
    <main className="post-auth-fatal" style={{ minHeight: '100dvh', background: BG_BASE, color: TEXT_PRIMARY, fontFamily: FONT_BODY, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: 24, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 20 }}>
        <h1 style={{ fontSize: 'clamp(26px, 7vw, 32px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.1, margin: '0 0 12px' }}>{t(state === 'missing' ? 'profileMissingTitle' : 'profileErrorTitle')}</h1>
        <p role="alert" style={{ color: TEXT_MUTED, lineHeight: 1.6 }}>{t(state === 'missing' ? 'profileMissingBody' : 'profileErrorBody')}</p>
        <button type="button" onClick={onRetry} style={{ minHeight: 48, padding: '12px 22px', marginTop: 12, border: 0, borderRadius: 12, background: GOLD, color: BG_BASE, fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{t('retry')}</button>
      </div>
      <style>{`.post-auth-fatal button:focus-visible { outline: 2px solid #dfbf70; outline-offset: 3px; }`}</style>
    </main>
  )
}
