'use client'
import { useRouter } from 'next/navigation'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: 20 }}>!</div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', letterSpacing: 2, color: '#EF4444', margin: '0 0 12px' }}>UNE ERREUR EST SURVENUE</h1>
      <p style={{ color: '#666', fontSize: '0.95rem', fontWeight: 300, maxWidth: 400, margin: '0 0 32px', lineHeight: 1.6 }}>Quelque chose s'est mal passé. Réessaie ou retourne à l'accueil.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={reset} style={{ padding: '14px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #C9A84C, #F0D060)', color: '#000', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>Réessayer</button>
        <button onClick={() => router.push('/')} style={{ padding: '14px 28px', borderRadius: 12, border: '1px solid #333', background: 'transparent', color: '#999', fontSize: '0.95rem', cursor: 'pointer' }}>Retour à l'accueil</button>
      </div>
    </div>
  )
}
