'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function RegisterClientPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { router.replace('/onboarding'); return }
      setChecking(false)
    })
  }, [])

  if (checking) return (
    <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #222', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A', padding: '2rem', textAlign: 'center', fontFamily: "'Barlow', sans-serif" }}>

      <div className="animate-pulse-gold" style={{ width: 80, height: 80, background: '#C9A84C', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Zap size={40} color="#000" strokeWidth={2.5} fill="#000" />
      </div>
      <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.08em', margin: '0 0 8px' }}>Rejoins CoachPro</h1>
      <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: '0 0 32px' }}>Ton coach t'attend</p>

      <button
        onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/onboarding` } })}
        style={{ width: '100%', maxWidth: 320, padding: '16px', background: 'linear-gradient(135deg, #C9A84C, #D4AF37)', border: 'none', borderRadius: 14, color: '#000', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        Continuer avec Google
      </button>

      <button onClick={() => router.push('/')} style={{ marginTop: 20, background: 'none', border: 'none', color: '#6B7280', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}>
        Déjà un compte ? Se connecter
      </button>
    </div>
  )
}
