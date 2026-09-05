'use client'

import { createBrowserClient } from '@supabase/ssr'
import { Eye, EyeOff } from 'lucide-react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { invitationTerminalState } from './invitation-state'
import {
  BG_BASE, BG_CARD, BORDER, FONT_ALT, FONT_BODY, FONT_DISPLAY, GOLD, GREEN,
  RED, RADIUS_CARD, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY,
} from '../../../lib/design-tokens'

const STORAGE_KEY = 'moovx_coach_invitation'
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
)

type JoinState =
  | 'checking'
  | 'ready'
  | 'consuming'
  | 'success'
  | 'invalid'
  | 'legacy'
  | 'expired'
  | 'revoked'
  | 'used'
  | 'email-mismatch'
  | 'coach-conflict'
  | 'forbidden'
  | 'temporary'

const GoogleIcon = () => <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>

function JoinContent() {
  const t = useTranslations('auth.join')
  const locale = useLocale()
  const params = useSearchParams()
  const router = useRouter()
  const tokenRef = useRef<string | null>(null)
  const started = useRef(false)
  const [state, setState] = useState<JoinState>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState('')

  function clearToken() {
    tokenRef.current = null
    sessionStorage.removeItem(STORAGE_KEY)
    void fetch('/api/coach/invitations/intent', { method: 'DELETE' })
  }

  async function rememberToken(token: string) {
    const response = await fetch('/api/coach/invitations/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    return response.ok
  }

  async function consumeInvitation(token: string) {
    setState('consuming')
    try {
      const response = await fetch('/api/coach/invitations/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const payload = await response.json()
      if (response.ok && payload.success) {
        clearToken()
        setState('success')
        window.setTimeout(() => router.replace(payload.data?.redirectTo || '/'), 900)
        return
      }
      if (response.status === 401) {
        setState('ready')
        return
      }
      const nextState = invitationTerminalState(payload.error?.code)
      if (nextState !== 'temporary') clearToken()
      setState(nextState)
    } catch {
      setState('temporary')
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (params.get('coach')) {
      sessionStorage.removeItem(STORAGE_KEY)
      window.history.replaceState({}, '', '/join')
      setState('legacy')
      return
    }

    void (async () => {
      try {
        const urlToken = params.get('token')
        let token = urlToken || sessionStorage.getItem(STORAGE_KEY)
        if (urlToken) {
          sessionStorage.setItem(STORAGE_KEY, urlToken)
          window.history.replaceState({}, '', '/join')
          await rememberToken(urlToken)
        } else {
          const intentResponse = await fetch('/api/coach/invitations/intent')
          if (intentResponse.ok) {
            const intentPayload = await intentResponse.json()
            token = intentPayload.data?.token || token
          }
        }
        if (!token || !TOKEN_PATTERN.test(token)) {
          clearToken()
          setState('invalid')
          return
        }
        tokenRef.current = token

        const response = await fetch('/api/coach/invitations/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          const nextState = invitationTerminalState(payload?.error?.code)
          if (nextState !== 'temporary') clearToken()
          setState(nextState)
          return
        }
        const payload = await response.json()
        setMaskedEmail(payload.data?.maskedEmail || '')
        const { data: { session } } = await supabase.auth.getSession()
        if (session) await consumeInvitation(token)
        else setState('ready')
      } catch {
        setState('temporary')
      }
    })()
    // Search params are intentionally captured once before the token is removed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSignUp() {
    setError('')
    if (!email.trim()) { setError(t('errors.emailRequired')); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t('errors.emailInvalid')); return }
    if (password.length < 8) { setError(t('errors.passwordTooShort')); return }
    if (password !== confirmPassword) { setError(t('errors.passwordMismatch')); return }
    if (!acceptedTerms) { setError(t('errors.termsRequired')); return }
    const token = tokenRef.current
    if (!token) { setState('invalid'); return }

    setLoading(true)
    const redirectUrl = `${window.location.origin}/auth/callback?next=/join`
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectUrl, data: { role: 'client' } },
    })
    if (authError) {
      setError(authError.message.includes('already registered')
        ? t('errors.alreadyRegistered')
        : authError.message)
      setLoading(false)
      return
    }
    if (data.session) await consumeInvitation(token)
    else setEmailSent(true)
    setLoading(false)
  }

  function handleGoogleSignUp() {
    if (!acceptedTerms) {
      setError(t('errors.termsRequired'))
      return
    }
    void supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/join` },
    })
  }

  const statusMessage: Partial<Record<JoinState, string>> = {
    invalid: t('states.invalid'),
    legacy: t('states.legacy'),
    expired: t('states.expired'),
    revoked: t('states.revoked'),
    used: t('states.used'),
    'email-mismatch': t('states.emailMismatch'),
    'coach-conflict': t('states.coachConflict'),
    forbidden: t('states.forbidden'),
    temporary: t('states.temporary'),
    success: t('states.success'),
  }

  if (state === 'checking' || state === 'consuming') {
    return <StatusScreen message={t(state === 'checking' ? 'states.validating' : 'states.consuming')} loading />
  }
  if (state !== 'ready') {
    return <StatusScreen message={statusMessage[state] || t('states.invalid')} success={state === 'success'} />
  }
  if (emailSent) return <StatusScreen message={t('emailSent.messageWithEmail', { email })} success />

  return (
    <main style={{ minHeight: '100dvh', background: BG_BASE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .join-input{width:100%;min-height:48px;background:${BG_BASE};border:1px solid ${BORDER};border-radius:12px;padding:12px 16px;color:${TEXT_PRIMARY};font-size:15px;font-family:${FONT_BODY};font-weight:300;outline:none;box-sizing:border-box}.join-input:focus{border-color:${GOLD}}.join-input::placeholder{color:${TEXT_DIM}}@media(max-width:480px){.join-card{padding:24px!important}}`}</style>
      <section className="join-card" style={{ width: '100%', maxWidth: 420, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Image src="/logo-moovx-96.png" alt="MoovX" width={56} height={56} style={{ borderRadius: 12, marginBottom: 16 }} />
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 8px', letterSpacing: '2px' }}>{t('title')}</h1>
          <p style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13, color: TEXT_MUTED, margin: 0 }}>{t('subtitle')}</p>
          {maskedEmail && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: GOLD, margin: '12px 0 0' }}>{t('invitedEmail', { email: maskedEmail })}</p>}
        </div>
        <button onClick={handleGoogleSignUp} style={{ width: '100%', background: '#fff', border: 'none', borderRadius: 12, padding: '12px 16px', color: '#000', fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          <GoogleIcon /> {t('continueGoogle')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}><div style={{ flex: 1, height: 1, background: BORDER }} /><span style={{ fontFamily: FONT_ALT, fontSize: 11, color: TEXT_DIM }}>{t('or')}</span><div style={{ flex: 1, height: 1, background: BORDER }} /></div>
        <label htmlFor="join-email" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>{t('emailPlaceholder')}</label>
        <input id="join-email" type="email" autoComplete="email" className="join-input" value={email} onChange={event => { setEmail(event.target.value); setError('') }} placeholder={t('emailPlaceholder')} style={{ marginBottom: 14 }} />
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="join-input" value={password} onChange={event => { setPassword(event.target.value); setError('') }} placeholder={t('passwordPlaceholder')} />
          <button type="button" aria-label={t(showPassword ? 'hidePassword' : 'showPassword')} onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 4, top: 2, width: 44, height: 44, background: 'none', border: 'none' }}>{showPassword ? <EyeOff size={16} color={TEXT_DIM} /> : <Eye size={16} color={TEXT_DIM} />}</button>
        </div>
        <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="join-input" value={confirmPassword} onChange={event => { setConfirmPassword(event.target.value); setError('') }} placeholder={t('confirmPasswordPlaceholder')} onKeyDown={event => { if (event.key === 'Enter') void handleSignUp() }} style={{ marginBottom: 16 }} />
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
          <input type="checkbox" checked={acceptedTerms} onChange={event => { setAcceptedTerms(event.target.checked); setError('') }} style={{ marginTop: 2 }} />
          <span>{t('terms.prefix')} <Link href={`/${locale}/cgu`} target="_blank">{t('terms.terms')}</Link> {t('terms.and')} <Link href={`/${locale}/privacy`} target="_blank">{t('terms.privacy')}</Link>.</span>
        </label>
        {error && <p role="alert" aria-live="polite" style={{ color: RED, fontSize: 13, fontFamily: FONT_BODY }}>{error}</p>}
        <button onClick={() => void handleSignUp()} disabled={loading} style={{ width: '100%', background: loading ? BORDER : GOLD, color: BG_BASE, border: 'none', borderRadius: 12, padding: 14, fontWeight: 800, fontFamily: FONT_ALT }}>{loading ? t('loadingButton') : t('submitButton')}</button>
        <p style={{ textAlign: 'center', marginTop: 16, fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED }}>{t('hasAccount')} <Link href="/login?next=/join" style={{ color: GOLD }}>{t('loginLink')}</Link></p>
      </section>
    </main>
  )
}

function StatusScreen({ message, loading = false, success = false }: { message: string; loading?: boolean; success?: boolean }) {
  return (
    <div style={{ minHeight: '100dvh', background: BG_BASE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        {loading && <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 18px' }} />}
        <p style={{ color: success ? GREEN : TEXT_PRIMARY, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{message}</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function JoinPageContent() {
  return <Suspense><JoinContent /></Suspense>
}
