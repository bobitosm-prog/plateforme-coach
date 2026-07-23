'use client'

import Image from 'next/image'
import { FONT_ALT, FONT_BODY, FONT_DISPLAY, GOLD, TEXT_MUTED } from '@/lib/design-tokens'

export default function DashboardProfileError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div role="alert" data-testid="profile-load-error" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: 24, textAlign: 'center', background: '#0D0B08', color: '#F8FAFC', fontFamily: FONT_BODY }}>
      <Image src="/logo-moovx.png" alt="MoovX" width={72} height={72} style={{ borderRadius: 18, marginBottom: 24 }} />
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.6rem', letterSpacing: 2, margin: '0 0 12px' }}>PROFIL INDISPONIBLE</h1>
      <p style={{ color: TEXT_MUTED, lineHeight: 1.6, maxWidth: 420, margin: '0 0 24px' }}>
        Nous n’avons pas pu charger ton profil. Ta session est conservée et aucune donnée n’a été modifiée.
      </p>
      <button type="button" onClick={onRetry} style={{ minHeight: 44, padding: '0 22px', border: `1px solid ${GOLD}`, borderRadius: 12, background: GOLD, color: '#0D0B08', fontFamily: FONT_ALT, fontWeight: 800, letterSpacing: 1, cursor: 'pointer' }}>
        RÉESSAYER
      </button>
    </div>
  )
}
