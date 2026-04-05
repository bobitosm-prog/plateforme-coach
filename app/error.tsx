'use client'
import { useRouter } from 'next/navigation'
import { BG_BASE, BG_CARD, BORDER, GOLD, GOLD_RULE, RED, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../lib/design-tokens'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: BG_BASE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', fontFamily: FONT_BODY }}>
      <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: 20, color: RED }}>!</div>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '2.5rem', letterSpacing: '2px', color: RED, margin: '0 0 12px' }}>UNE ERREUR EST SURVENUE</h1>
      <p style={{ color: TEXT_MUTED, fontSize: '0.95rem', fontFamily: FONT_BODY, fontWeight: 300, maxWidth: 400, margin: '0 0 32px', lineHeight: 1.6 }}>Quelque chose s'est mal passe. Reessaie ou retourne a l'accueil.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={reset} style={{ padding: '14px 28px', borderRadius: 12, border: 'none', background: GOLD, color: BG_BASE, fontSize: '0.95rem', fontFamily: FONT_ALT, fontWeight: 800, cursor: 'pointer', letterSpacing: '1px',  }}>Reessayer</button>
        <button onClick={() => router.push('/')} style={{ padding: '14px 28px', borderRadius: 12, border: `1px solid ${GOLD_RULE}`, background: 'transparent', color: TEXT_MUTED, fontSize: '0.95rem', fontFamily: FONT_ALT, fontWeight: 600, cursor: 'pointer' }}>Retour a l'accueil</button>
      </div>
    </div>
  )
}
