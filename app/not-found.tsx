'use client'
import { useRouter } from 'next/navigation'
import { BG_BASE, GOLD, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../lib/design-tokens'

export default function NotFound() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: BG_BASE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', fontFamily: FONT_BODY }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: '5rem', marginBottom: 16, color: TEXT_DIM, letterSpacing: '4px' }}>404</div>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '2.5rem', letterSpacing: '2px', color: GOLD, margin: '0 0 12px' }}>PAGE INTROUVABLE</h1>
      <p style={{ color: TEXT_MUTED, fontSize: '0.95rem', fontFamily: FONT_BODY, fontWeight: 300, maxWidth: 400, margin: '0 0 32px', lineHeight: 1.6 }}>La page que tu cherches n'existe pas ou a ete deplacee.</p>
      <button onClick={() => router.push('/')} style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: GOLD, color: BG_BASE, fontSize: '0.95rem', fontFamily: FONT_ALT, fontWeight: 800, cursor: 'pointer', letterSpacing: '1px',  }}>Retour a l'accueil</button>
    </div>
  )
}
