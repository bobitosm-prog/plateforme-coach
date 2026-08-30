'use client'

import { useTranslations } from 'next-intl'
import { BG_BASE, FONT_BODY, GOLD, TEXT_MUTED, TEXT_PRIMARY } from '@/lib/design-tokens'

export default function PostAuthFatalState({ state, onRetry }: { state: 'missing' | 'error'; onRetry: () => void }) {
  const t = useTranslations('auth.routing')
  return (
    <main style={{ minHeight: '100dvh', background: BG_BASE, color: TEXT_PRIMARY, fontFamily: FONT_BODY, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 26, margin: '0 0 12px' }}>{t(state === 'missing' ? 'profileMissingTitle' : 'profileErrorTitle')}</h1>
        <p role="alert" style={{ color: TEXT_MUTED, lineHeight: 1.6 }}>{t(state === 'missing' ? 'profileMissingBody' : 'profileErrorBody')}</p>
        <button type="button" onClick={onRetry} style={{ minHeight: 44, padding: '12px 22px', marginTop: 12, border: 0, borderRadius: 12, background: GOLD, color: BG_BASE, fontWeight: 800, cursor: 'pointer' }}>{t('retry')}</button>
      </div>
    </main>
  )
}
