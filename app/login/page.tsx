'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { colors, fonts, titleStyle, subtitleStyle, bodyStyle, labelStyle, mutedStyle, pageTitleStyle, BG_BASE, BORDER, GOLD, GOLD_RULE, RED, GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD } from '../../lib/design-tokens'

const supabase = createBrowserClient((process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(), (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim())

const GoogleIcon = () => <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
const AppleIcon = () => <svg width="16" height="19" viewBox="0 0 16 19" fill="white"><path d="M15.462 6.498c-.098.063-1.828 1.05-1.828 3.218 0 2.508 2.202 3.396 2.268 3.418-.011.042-.351 1.207-1.163 2.384-.713 1.035-1.456 2.068-2.585 2.068s-1.422-.657-2.727-.657c-1.273 0-1.724.679-2.761.679s-1.741-.955-2.585-2.116C3.06 14.052 2.17 11.839 2.17 9.748c0-3.374 2.191-5.163 4.35-5.163 1.147 0 2.103.753 2.826.753.69 0 1.767-.8 3.078-.8.497 0 2.283.044 3.038 1.96zM10.737.94C11.286.294 11.676-.352 11.676-.352s-.03 0-.03.002c.003.003-.617.258-1.166.912-.504.598-.946 1.258-.946 1.929 0 .085.008.171.024.252.016.082.038.152.038.152s.035.002.035.002c.003 0 .654-.22 1.106-.957z"/></svg>

export default function LoginPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { router.replace('/'); return }
      setChecking(false)
    })
  }, [])

  const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback'

  async function handleEmailLogin() {
    if (!email.trim()) { setError('Email requis'); return }
    if (!password) { setError('Mot de passe requis'); return }
    setError(''); setSubmitting(true)
    supabase.from('app_logs').insert({ level: 'info', message: 'LOGIN_ATTEMPT', details: { email: email.trim(), method: 'password' }, page_url: '/login' })
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError) {
      supabase.from('app_logs').insert({ level: 'warning', message: 'LOGIN_ERROR', details: { error: signInError.message }, page_url: '/login' })
      setSubmitting(false)
      if (signInError.message.includes('Invalid login')) setError('Email ou mot de passe incorrect')
      else if (signInError.message.includes('Email not confirmed')) setError('Email non confirmé. Vérifie ta boîte mail.')
      else setError(signInError.message)
      return
    }
    supabase.from('app_logs').insert({ level: 'info', message: 'LOGIN_RESULT', details: { success: !!data.session, userId: data.session?.user?.id }, page_url: '/login' })
    if (data.session) {
      const { data: profile } = await supabase.from('profiles').select('role, coach_onboarding_complete').eq('id', data.session.user.id).maybeSingle()
      const role = profile?.role || data.session.user.user_metadata?.role
      if (!profile?.role && role) {
        await supabase.from('profiles').update({ role }).eq('id', data.session.user.id)
      }
      const target = role === 'coach' && !profile?.coach_onboarding_complete ? '/onboarding-coach' : '/'
      supabase.from('app_logs').insert({ level: 'info', message: 'LOGIN_REDIRECT', details: { target, userId: data.session.user.id, role: profile?.role }, page_url: '/login' })
      router.push(target)
    }
  }

  async function handleResetPassword() {
    if (!resetEmail.trim()) { setResetError('Email requis'); return }
    setResetError('')
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: redirectUrl })
    if (error) { setResetError(error.message); return }
    setResetSent(true)
  }

  if (checking) return (
    <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG_BASE }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const T = titleStyle
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: BG_BASE, fontFamily: fonts.body, position: 'relative' }}>
      {/* Hero gym background */}
      <img src="/images/hero-gym.webp" alt="Gym luxe Geneve" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,11,8,0.92)', zIndex: 0 }} />
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes panelIn{from{opacity:0}to{opacity:1}}
        .auth-input{width:100%;background:rgba(13,11,8,0.8);border:1px solid ${BORDER};border-radius:12px;padding:14px 14px 14px 44px;color:${TEXT_PRIMARY};font-size:0.9rem;outline:none;transition:border-color 0.3s,box-shadow 0.3s;font-family:${fonts.body}}
        .auth-input:focus{border-color:${GOLD};box-shadow:none}
        .auth-input::placeholder{color:${TEXT_DIM}}
        .oauth-btn{width:100%;padding:14px 20px;border-radius:12px;font-size:0.9rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-family:${fonts.body};transition:transform 0.2s,box-shadow 0.2s}
        .oauth-btn:hover{transform:translateY(-1px)}
        .gold-btn{width:100%;padding:15px 20px;background:linear-gradient(135deg, #E8C97A 0%, #D4A843 40%, #C9A84C 70%, #8B6914 100%);border:none;border-radius:12px;color:${BG_BASE};font-size:0.95rem;font-weight:800;cursor:pointer;font-family:${fonts.body};transition:transform 0.2s,box-shadow 0.2s;box-shadow:0 4px 24px rgba(212,168,67,0.25)}
        .gold-btn:hover{transform:translateY(-2px)}
        .gold-btn:disabled{opacity:0.6;cursor:wait;transform:none;box-shadow:none}
        @media(max-width:768px){.auth-left{display:none!important}.auth-right{min-height:100dvh!important}}
      `}</style>

      <LeftPanel />

      <div className="auth-right" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 400, width: '100%' }}>

          {/* Mobile logo */}
          <div className="auth-mobile-logo" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <img src="/logo-moovx.png" alt="MoovX Logo" width={48} height={48} style={{ borderRadius: RADIUS_CARD, marginBottom: 12 }} />
            <span style={{ ...T, fontSize: 18, letterSpacing: 3 }}>MOOVX</span>
          </div>
          <style>{`@media(max-width:768px){.auth-mobile-logo{display:flex!important}}`}</style>

          {forgotMode ? (
            /* ── Forgot password ── */
            <div style={{ animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1)' }}>
              <h1 style={{ ...pageTitleStyle, fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '2px', margin: '0 0 6px', lineHeight: 1 }}>MOT DE PASSE OUBLIE</h1>
              <p style={{ ...bodyStyle, fontSize: '0.88rem', fontWeight: 300, margin: '0 0 28px', lineHeight: 1.6 }}>Entre ton email pour recevoir un lien de réinitialisation.</p>

              {resetSent ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <CheckCircle size={36} color={GREEN} style={{ marginBottom: 16 }} />
                  <p style={{ ...bodyStyle, fontSize: '0.9rem', color: TEXT_PRIMARY, lineHeight: 1.6 }}>Email envoyé à <strong style={{ color: GOLD }}>{resetEmail}</strong></p>
                  <p style={{ ...mutedStyle, fontSize: '0.78rem', marginTop: 8 }}>Vérifie ta boîte mail.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input type="email" className="auth-input" value={resetEmail} onChange={e => { setResetEmail(e.target.value); setResetError('') }} placeholder="Email" onKeyDown={e => { if (e.key === 'Enter') handleResetPassword() }} />
                  </div>
                  {resetError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: RADIUS_CARD }}>
                      <AlertCircle size={14} color={RED} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', color: RED }}>{resetError}</span>
                    </div>
                  )}
                  <button className="gold-btn" onClick={handleResetPassword}>Envoyer le lien</button>
                </div>
              )}
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button onClick={() => { setForgotMode(false); setResetSent(false); setResetError('') }} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: '0.82rem', cursor: 'pointer', fontFamily: fonts.body, transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)} onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
                  ← Retour à la connexion
                </button>
              </div>
            </div>
          ) : (
            /* ── Login form ── */
            <>
              <div style={{ animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1)' }}>
                <h1 style={{ ...pageTitleStyle, fontSize: 'clamp(2rem,4vw,2.8rem)', letterSpacing: '2px', margin: '0 0 6px', lineHeight: 1 }}>CONTENT DE TE REVOIR</h1>
                <p style={{ ...bodyStyle, fontSize: '0.9rem', fontWeight: 300, margin: '0 0 32px' }}>Connecte-toi à ton espace</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="oauth-btn" onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } })}
                  style={{ background: '#fff', border: 'none', color: '#000', animation: 'fadeUp 0.7s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
                  <GoogleIcon /> Continuer avec Google
                </button>

                <button className="oauth-btn" onClick={() => supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: redirectUrl } })}
                  style={{ background: '#000', border: `1px solid ${BORDER}`, color: '#fff', animation: 'fadeUp 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both' }}>
                  <AppleIcon /> Continuer avec Apple
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0', animation: 'fadeUp 0.7s 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
                  <div style={{ flex: 1, height: 1, background: BORDER }} />
                  <span style={{ ...subtitleStyle, fontSize: '0.72rem', fontWeight: 500, letterSpacing: 1, color: TEXT_DIM }}>OU</span>
                  <div style={{ flex: 1, height: 1, background: BORDER }} />
                </div>

                <div style={{ position: 'relative', animation: 'fadeUp 0.7s 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
                  <Mail size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="email" className="auth-input" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="Email" />
                </div>

                <div style={{ position: 'relative', animation: 'fadeUp 0.7s 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
                  <Lock size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type={showPassword ? 'text' : 'password'} className="auth-input" style={{ paddingRight: 44 }} value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="Mot de passe"
                    onKeyDown={e => { if (e.key === 'Enter') handleEmailLogin() }} />
                  <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showPassword ? <EyeOff size={16} color={TEXT_DIM} /> : <Eye size={16} color={TEXT_DIM} />}
                  </button>
                </div>

                <div style={{ textAlign: 'right', animation: 'fadeUp 0.7s 0.33s cubic-bezier(0.16,1,0.3,1) both' }}>
                  <button onClick={() => { setForgotMode(true); setResetEmail(email) }} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontFamily: fonts.body, transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = GOLD)} onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
                    Mot de passe oublié ?
                  </button>
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: RADIUS_CARD }}>
                    <AlertCircle size={14} color={RED} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', color: RED }}>{error}</span>
                  </div>
                )}

                <div style={{ animation: 'fadeUp 0.7s 0.38s cubic-bezier(0.16,1,0.3,1) both' }}>
                  <button className="gold-btn" onClick={handleEmailLogin} disabled={submitting}>
                    {submitting ? 'Connexion...' : 'Se connecter'}
                  </button>
                </div>

                <div style={{ textAlign: 'center', marginTop: 12, animation: 'fadeUp 0.7s 0.42s cubic-bezier(0.16,1,0.3,1) both' }}>
                  <span style={{ ...mutedStyle, fontSize: '0.82rem' }}>Pas de compte ?{' '}</span>
                  <button onClick={() => router.push('/register-client')} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: '0.82rem', cursor: 'pointer', fontFamily: fonts.body, transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = GOLD)} onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
                    S&apos;inscrire
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Left decorative panel ── */
function LeftPanel() {
  return (
    <div className="auth-left" style={{ width: '50%', flexShrink: 0, background: BG_BASE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', animation: 'panelIn 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(${colors.goldDim} 1px,transparent 1px),linear-gradient(90deg,${colors.goldDim} 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, background: `radial-gradient(circle,${colors.goldDim},transparent 60%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.02, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 40px' }}>
        <img src="/logo-moovx.png" alt="MoovX Logo" width={72} height={72} style={{ borderRadius: RADIUS_CARD, margin: '0 auto 20px', display: 'block', boxShadow: `0 16px 48px ${colors.goldRule}` }} />
        <div style={{ fontFamily: fonts.headline, fontSize: 32, letterSpacing: 3, color: GOLD, marginBottom: 8 }}>MOOVX</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          <span style={{ fontSize: 14 }}>🇨🇭</span>
          <span style={{ ...labelStyle, fontSize: '0.7rem', letterSpacing: 4, fontWeight: 400 }}>Swiss Made · Swiss Quality</span>
        </div>
        <p style={{ ...bodyStyle, fontSize: '0.88rem', fontWeight: 300, lineHeight: 1.8, maxWidth: 300, margin: '0 auto' }}>
          La plateforme de coaching fitness d&apos;élite
        </p>
      </div>
      <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ ...mutedStyle, fontSize: '0.68rem', fontWeight: 300, letterSpacing: 1 }}>© 2026 MoovX · Genève, Suisse</span>
      </div>
    </div>
  )
}
