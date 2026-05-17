'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../../lib/design-tokens'

const GoogleIcon = () => <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>

function JoinContent() {
  const t = useTranslations('auth.join')
  const params = useSearchParams()
  const router = useRouter()
  const coachId = params.get('coach')
  const supabase = useRef(createBrowserClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  )).current

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [coachName, setCoachName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!coachId) { setChecking(false); return }
    supabase.from('profiles').select('full_name').eq('id', coachId).maybeSingle()
      .then(({ data }) => { if (data?.full_name) setCoachName(data.full_name) })
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await fetch('/api/assign-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coachId, clientId: session.user.id }),
        })
        router.replace('/')
        return
      }
      setChecking(false)
    })
  }, [coachId])

  async function handleSignUp() {
    setError('')
    if (!email.trim()) { setError(t('errors.emailRequired')); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t('errors.emailInvalid')); return }
    if (password.length < 8) { setError(t('errors.passwordTooShort')); return }
    if (password !== confirmPassword) { setError(t('errors.passwordMismatch')); return }
    if (!coachId) { setError(t('errors.invalidLink')); return }

    setLoading(true)
    const redirectUrl = `${window.location.origin}/auth/callback?coach=${coachId}`
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectUrl, data: { role: 'client', invited_coach_id: coachId } },
    })

    if (authError) {
      setError(authError.message.includes('already registered')
        ? t('errors.alreadyRegistered')
        : authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      await new Promise(r => setTimeout(r, 1500))
      await fetch('/api/assign-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId, clientId: authData.user.id }),
      })
    }

    setLoading(false)
    setEmailSent(true)
  }

  function handleGoogleSignUp() {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?coach=${coachId}` },
    })
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: BG_BASE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!coachId) return (
    <div style={{ minHeight: '100vh', background: BG_BASE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: RED, fontFamily: FONT_BODY, fontWeight: 300 }}>{t('invalidLink')}</p>
    </div>
  )

  if (emailSent) return (
    <div style={{ minHeight: '100vh', background: BG_BASE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 40, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: TEXT_PRIMARY, margin: '0 0 12px', letterSpacing: '2px' }}>{t('emailSent.title')}</h2>
        <p style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6, margin: '0 0 8px' }}>
          {t('emailSent.message')} <strong style={{ color: GOLD }}>{email}</strong>.
        </p>
        <p style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13, color: TEXT_DIM, margin: 0 }}>
          {t('emailSent.instruction')}
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: BG_BASE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .join-input{width:100%;background:${BG_BASE};border:1px solid ${BORDER};border-radius:0;padding:12px 16px;color:${TEXT_PRIMARY};font-size:15px;font-family:${FONT_BODY};font-weight:300;outline:none;transition:border-color 0.2s;box-sizing:border-box} .join-input:focus{border-color:${GOLD}} .join-input::placeholder{color:${TEXT_DIM}}`}</style>
      <div style={{ width: '100%', maxWidth: 420, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 40 }}>

        {/* Logo + header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo-moovx.png" alt="MoovX" width={56} height={56} style={{ borderRadius: 12, marginBottom: 16 }} />
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 8px', letterSpacing: '2px' }}>{t('title')}</h1>
          {coachName && (
            <p style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 15, color: GOLD, margin: 0 }}>
              {t('coachInvitation', { coachName })}
            </p>
          )}
          <p style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13, color: TEXT_MUTED, margin: '8px 0 0' }}>
            {t('subtitle')}
          </p>
        </div>

        {/* Google */}
        <button onClick={handleGoogleSignUp}
          style={{ width: '100%', background: '#fff', border: 'none', borderRadius: 12, padding: '12px 16px', color: '#000', fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24, transition: 'transform 0.2s' }}>
          <GoogleIcon /> {t('continueGoogle')}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 24px' }}>
          <div style={{ flex: 1, height: 1, background: BORDER }} />
          <span style={{ fontFamily: FONT_ALT, fontSize: 11, color: TEXT_DIM, letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase' }}>{t('or')}</span>
          <div style={{ flex: 1, height: 1, background: BORDER }} />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <input type="email" className="join-input" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder={t('emailPlaceholder')} />
        </div>

        {/* Password */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input type={showPassword ? 'text' : 'password'} className="join-input" style={{ paddingRight: 44 }} value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder={t('passwordPlaceholder')} />
          <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {showPassword ? <EyeOff size={16} color={TEXT_DIM} /> : <Eye size={16} color={TEXT_DIM} />}
          </button>
        </div>

        {/* Confirm */}
        <div style={{ marginBottom: 20 }}>
          <input type={showPassword ? 'text' : 'password'} className="join-input" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError('') }} placeholder={t('confirmPasswordPlaceholder')} onKeyDown={e => { if (e.key === 'Enter') handleSignUp() }} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ color: RED, fontSize: 13, fontFamily: FONT_BODY, fontWeight: 300, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSignUp} disabled={loading}
          style={{ width: '100%', background: loading ? BORDER : GOLD, color: loading ? TEXT_MUTED : BG_BASE, border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, fontFamily: FONT_ALT, cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s', letterSpacing: '1px', clipPath: loading ? 'none' : 'polygon(0 0,100% 0,96% 100%,0 100%)' }}>
          {loading ? t('loadingButton') : t('submitButton')}
        </button>

        <p style={{ textAlign: 'center', marginTop: 16, fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13, color: TEXT_MUTED }}>
          {t('hasAccount')}{' '}
          <a href="/login" style={{ color: GOLD, textDecoration: 'none' }}>{t('loginLink')}</a>
        </p>

        <p style={{ textAlign: 'center', marginTop: 20, fontFamily: FONT_BODY, fontWeight: 300, fontSize: 11, color: TEXT_DIM }}>
          {t('features')}
        </p>
      </div>
    </div>
  )
}

export default function JoinPageContent() {
  return <Suspense><JoinContent /></Suspense>
}
