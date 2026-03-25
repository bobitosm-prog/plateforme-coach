'use client'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontSize: '5rem', marginBottom: 16, opacity: 0.3 }}>404</div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', letterSpacing: 2, color: '#C9A84C', margin: '0 0 12px' }}>PAGE INTROUVABLE</h1>
      <p style={{ color: '#666', fontSize: '0.95rem', fontWeight: 300, maxWidth: 400, margin: '0 0 32px', lineHeight: 1.6 }}>La page que tu cherches n'existe pas ou a été déplacée.</p>
      <button onClick={() => router.push('/')} style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #C9A84C, #F0D060)', color: '#000', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Retour à l'accueil</button>
    </div>
  )
}
