'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'
import { BG_BASE, BG_CARD, BORDER, FONT_BODY, GOLD, RED, RADIUS_CARD, TEXT_MUTED, TEXT_PRIMARY } from '@/lib/design-tokens'

const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
)

export default function ResetPasswordContent() {
  const t = useTranslations('auth.resetPassword')
  const router = useRouter()
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login?auth_error=recovery_error')
      else setChecking(false)
    })
  }, [router])

  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  async function submit() {
    if (password.length < 8) { setError(t('errors.tooShort')); return }
    if (password !== confirmation) { setError(t('errors.mismatch')); return }
    setError('')
    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setSubmitting(false)
      setError(t('errors.generic'))
      return
    }
    await fetch('/auth/reset-complete', { method: 'POST' }).catch(() => null)
    await supabase.auth.signOut()
    router.replace('/login?reset=success')
  }

  if (checking) {
    return <main role="status" aria-label={t('checking')} style={{ minHeight: '100dvh', background: BG_BASE, display: 'grid', placeItems: 'center' }}><div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></main>
  }

  return (
    <main style={{ minHeight: '100dvh', background: BG_BASE, color: TEXT_PRIMARY, fontFamily: FONT_BODY, display: 'grid', placeItems: 'center', padding: 24 }}>
      <section style={{ width: '100%', maxWidth: 420, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 28 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 30 }}>{t('title')}</h1>
        <p style={{ margin: '0 0 24px', color: TEXT_MUTED, lineHeight: 1.6 }}>{t('subtitle')}</p>

        <label htmlFor="new-password" style={{ display: 'block', marginBottom: 8 }}>{t('passwordLabel')}</label>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => { setPassword(event.target.value); setError('') }} style={{ width: '100%', minHeight: 48, boxSizing: 'border-box', padding: '12px 52px 12px 14px', borderRadius: 12, border: `1px solid ${BORDER}`, background: BG_BASE, color: TEXT_PRIMARY }} />
          <button type="button" aria-label={t(showPassword ? 'hidePassword' : 'showPassword')} onClick={() => setShowPassword(value => !value)} style={{ position: 'absolute', right: 4, top: 2, width: 44, height: 44, border: 0, background: 'transparent', color: TEXT_MUTED }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>

        <label htmlFor="confirm-new-password" style={{ display: 'block', marginBottom: 8 }}>{t('confirmationLabel')}</label>
        <input id="confirm-new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={event => { setConfirmation(event.target.value); setError('') }} onKeyDown={event => { if (event.key === 'Enter') void submit() }} style={{ width: '100%', minHeight: 48, boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: `1px solid ${BORDER}`, background: BG_BASE, color: TEXT_PRIMARY }} />

        {error && <p ref={errorRef} tabIndex={-1} role="alert" style={{ color: RED, margin: '14px 0 0' }}>{error}</p>}
        <button type="button" disabled={submitting} onClick={() => void submit()} style={{ width: '100%', minHeight: 48, marginTop: 20, border: 0, borderRadius: 12, background: GOLD, color: BG_BASE, fontWeight: 800 }}>{submitting ? t('saving') : t('submit')}</button>
      </section>
    </main>
  )
}
