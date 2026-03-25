'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Zap } from 'lucide-react'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function LoginPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { router.replace('/'); return }
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) router.replace('/')
    })
    return () => subscription.unsubscribe()
  }, [])

  if (checking) return (
    <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #222', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A', padding: '2rem' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&display=swap');`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div style={{ width: 40, height: 40, background: '#C9A84C', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={22} color="#000" fill="#000" strokeWidth={2.5} />
        </div>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.08em' }}>COACHPRO</span>
      </div>
      <div style={{ width: '100%', maxWidth: 380, background: '#111', border: '1px solid #1A1A1A', borderRadius: 20, padding: 24 }}>
        <Auth supabaseClient={supabase}
          appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#C9A84C', brandAccent: '#8B6914' }, radii: { borderRadiusButton: '14px', inputBorderRadius: '14px' } } } }}
          theme="dark" providers={['google']}
          localization={{ variables: { sign_in: { email_label: 'Email', password_label: 'Mot de passe', button_label: 'Connexion', social_provider_text: 'Continuer avec {{provider}}' } } }}
        />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
        <button onClick={() => router.push('/register-client')} style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: '0.82rem', cursor: 'pointer' }}>S'inscrire comme client</button>
        <button onClick={() => router.push('/coach-signup')} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '0.82rem', cursor: 'pointer' }}>Devenir coach</button>
      </div>
      <button onClick={() => router.push('/landing')} style={{ marginTop: 16, background: 'none', border: 'none', color: '#4B5563', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>← Retour</button>
    </div>
  )
}
