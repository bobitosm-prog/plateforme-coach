'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { resolveClientPostAuth } from '@/lib/auth/client-post-auth'
import { BG_BASE, BORDER, FONT_BODY, GOLD, TEXT_MUTED, TEXT_PRIMARY } from '@/lib/design-tokens'

interface OnboardingRouteGuardProps {
  route: '/onboarding-v2' | '/onboarding-fitness' | '/onboarding' | '/onboarding-photo' | '/onboarding-coach'
  children: React.ReactNode
}

export default function OnboardingRouteGuard({ route, children }: OnboardingRouteGuardProps) {
  const t = useTranslations('auth.routing')
  const router = useRouter()
  const supabase = useRef(createBrowserClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
  )).current
  const [state, setState] = useState<'loading' | 'allowed' | 'error' | 'missing'>('loading')

  const check = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      setState('error')
      return
    }
    if (!session) {
      router.replace('/login')
      return
    }

    const result = await resolveClientPostAuth({ supabase, user: session.user })
    if (result.profileState === 'error' || result.decision.destination === 'role_missing') {
      setState('error')
      return
    }
    if (result.profileState === 'missing') {
      setState('missing')
      return
    }
    if (result.decision.route !== route) {
      router.replace(result.decision.route || '/')
      return
    }
    setState('allowed')
  }, [route, router, supabase])

  useEffect(() => {
    const timer = window.setTimeout(() => { void check() }, 0)
    return () => window.clearTimeout(timer)
  }, [check])

  if (state === 'allowed') return children

  return (
    <main style={{ minHeight: '100dvh', background: BG_BASE, color: TEXT_PRIMARY, fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      {state === 'loading' ? (
        <div aria-label={t('loading')} role="status" style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      ) : (
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, margin: '0 0 12px' }}>{t(state === 'missing' ? 'profileMissingTitle' : 'profileErrorTitle')}</h1>
          <p role="alert" style={{ color: TEXT_MUTED, lineHeight: 1.6 }}>{t(state === 'missing' ? 'profileMissingBody' : 'profileErrorBody')}</p>
          <button type="button" onClick={() => { setState('loading'); void check() }} style={{ minHeight: 44, padding: '12px 22px', marginTop: 12, border: 0, borderRadius: 12, background: GOLD, color: BG_BASE, fontWeight: 800, cursor: 'pointer' }}>{t('retry')}</button>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )
}
