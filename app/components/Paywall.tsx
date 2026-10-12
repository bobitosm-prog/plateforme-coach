'use client'
import ApplePaywall from './ApplePaywall'
import styles from './Paywall.module.css'
import { isNativeMoovx } from '@/lib/apple/native-purchases'
import { useState, useEffect } from 'react'
import { Check, Crown, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { BG_BASE, BG_CARD, BORDER, GOLD, GOLD_RULE, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD } from '../../lib/app-design-tokens'

interface PaywallProps {
  role: 'client' | 'coach'
  userId: string
  coachId?: string | null
  dismissible?: boolean
  onSignOut: () => void
}

export default function Paywall({ role, userId, coachId, onSignOut, dismissible }: PaywallProps) {
  const t = useTranslations('paywall')
  const [native, setNative] = useState<boolean | null>(null)
  useEffect(() => setNative(isNativeMoovx()), [])
  const [loading, setLoading] = useState<string | null>(null)
  const [coachData, setCoachData] = useState<{ name: string; rate: number; id: string } | null>(null)

  useEffect(() => {
    if (isNativeMoovx()) return
    if (role !== 'client' || !coachId || coachId === 'platform') return
    fetch('/api/stripe/coach-checkout', { method: 'OPTIONS' }).catch(() => {})
    import('@supabase/ssr').then(({ createBrowserClient }) => {
      const sb = createBrowserClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
      )
      sb.from('profiles').select('full_name, coach_monthly_rate, stripe_account_id').eq('id', coachId).maybeSingle()
        .then(({ data }) => {
          if (data?.stripe_account_id) {
            setCoachData({ name: data.full_name || 'Coach', rate: data.coach_monthly_rate || 50, id: coachId })
          }
        })
    })
  }, [role, coachId])

  type PlanDef = { id: string; nameKey: string; price: number; intervalKey: string; features: string[]; badge?: string; savings?: string }

  const CLIENT_PLANS: PlanDef[] = [
    { id: 'client_monthly', nameKey: 'plans.monthly', price: 9.90, intervalKey: 'plans.perMonth', features: Array.from({ length: 4 }, (_, i) => t(`features.clientMonthly.${i}`)) },
    { id: 'client_yearly', nameKey: 'plans.yearly', price: 79.90, intervalKey: 'plans.perYear', badge: t('plans.popular'), savings: t('plans.save33'), features: Array.from({ length: 3 }, (_, i) => t(`features.clientYearly.${i}`)) },
  ]

  const COACH_PLANS: PlanDef[] = [
    { id: 'coach_monthly', nameKey: 'plans.coachPro', price: 50, intervalKey: 'plans.perMonth', features: Array.from({ length: 6 }, (_, i) => t(`features.coachPro.${i}`)) },
  ]

  const COACH_CLIENT_FEATURES = Array.from({ length: 5 }, (_, i) => t(`features.coachClient.${i}`))

  const plans = role === 'coach' ? COACH_PLANS : CLIENT_PLANS

  async function handleSelect(planId: string) {
    if (isNativeMoovx()) return
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: userId, planId, coachId: coachId || 'platform' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || t('errors.serverError', { status: res.status }))
      }
      const { url } = await res.json()
      if (url) window.location.href = url
      else throw new Error(t('errors.paymentLink'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('errors.paymentFailed'))
      setLoading(null)
    }
  }

  async function handleCoachCheckout() {
    if (isNativeMoovx()) return
    if (!coachData) return
    setLoading('coach')
    try {
      const res = await fetch('/api/stripe/coach-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: userId, coachId: coachData.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || t('errors.serverError', { status: res.status }))
      }
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(t('errors.paymentLink'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('errors.paymentFailed'))
      setLoading(null)
    }
  }

  function getCta(plan: typeof CLIENT_PLANS[0]) {
    if (loading === plan.id) return t('cta.redirecting')
    if (plan.id === 'client_monthly') return t('cta.startMonthly', { price: plan.price.toFixed(2) })
    if (plan.id === 'client_yearly') return t('cta.startYearly', { price: plan.price.toFixed(2) })
    if (plan.id === 'coach_monthly') return t('cta.startMonthly', { price: plan.price.toFixed(2) })
    return t('cta.redirecting')
  }

  if (native === null) return null
  if (native) return <ApplePaywall key={userId} userId={userId} onSignOut={onSignOut} dismissible={dismissible} supported={role === 'client'} />

  return (
    <div className={styles.page} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG_BASE, padding: '2rem 1rem', fontFamily: FONT_BODY }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ width: 64, height: 64, background: GOLD, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          {role === 'coach' ? <Crown size={30} color="#0D0B08" strokeWidth={2} /> : <Sparkles size={30} color="#0D0B08" strokeWidth={2} />}
        </div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(32px,7vw,44px)', lineHeight: 1.08, fontWeight: 700, letterSpacing: '-.04em', color: TEXT_PRIMARY, margin: '0 0 8px' }}>
          {role === 'coach' ? t('coach.title') : t('client.title')}
        </h1>
        <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', fontWeight: 400, fontFamily: FONT_BODY, margin: 0 }}>
          {role === 'coach' ? t('coach.subtitle') : t('client.subtitle')}
        </p>
      </div>

      {/* Coach subscription card */}
      {coachData && role === 'client' && (
        <div style={{ maxWidth: 400, width: '100%', marginBottom: 32 }}>
          <div style={{ borderRadius: RADIUS_CARD, border: `2px solid ${GOLD}`, background: BG_CARD }}>
            <div style={{ padding: '32px 28px', position: 'relative' }}>
              <span style={{ position: 'absolute', top: 0, right: 24, background: GOLD, color: '#0D0B08', fontSize: '0.75rem', fontFamily: FONT_ALT, fontWeight: 800, padding: '4px 14px', borderRadius: '0 0 2px 2px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('coachCard.badge')}</span>
              <div style={{ fontSize: '0.875rem', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: FONT_ALT, fontWeight: 700, color: GOLD, marginBottom: 12 }}>{t('coachCard.coachingWith', { coachName: coachData.name })}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                <span style={{ fontSize: '0.75rem', color: TEXT_DIM, alignSelf: 'flex-start', marginTop: 16, fontFamily: FONT_BODY }}>CHF</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(40px,12vw,56px)', fontWeight: 700, lineHeight: 1, color: GOLD, letterSpacing: '1px' }}>{coachData.rate}</span>
                <span style={{ color: TEXT_DIM, fontSize: '0.85rem', fontFamily: FONT_BODY }}>{t('coachCard.perMonth')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {COACH_CLIENT_FEATURES.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Check size={14} color={GOLD} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.9375rem', color: TEXT_MUTED, fontFamily: FONT_BODY, fontWeight: 400 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleCoachCheckout} disabled={loading !== null}
                style={{ width: '100%', padding: '15px 20px', borderRadius: 12, border: 'none', cursor: loading ? 'wait' : 'pointer', background: GOLD, color: '#0D0B08', fontSize: '0.9rem', fontWeight: 800, fontFamily: FONT_ALT, letterSpacing: 0, textTransform: 'none', opacity: loading && loading !== 'coach' ? 0.5 : 1 }}>
                {loading === 'coach' ? t('cta.redirecting') : t('coachCard.subscribe', { rate: coachData.rate })}
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'center', margin: '20px 0 0' }}>
            <span style={{ fontSize: '0.875rem', color: TEXT_DIM, fontFamily: FONT_BODY }}>{t('coachCard.orChoosePlan')}</span>
          </div>
        </div>
      )}

      {/* Plans */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: role === 'coach' ? 'min(400px, calc(100vw - 32px))' : 'min(960px, calc(100vw - 32px))', width: '100%' }}>
        {plans.map((plan) => {
          const isPopular = plan.badge === t('plans.popular')
          const isBest = plan.badge === t('plans.bestOffer')
          const isHighlight = isPopular || isBest
          return (
            <div key={plan.id} style={{
              flex: role === 'coach' ? '1 1 100%' : '1 1 280px', maxWidth: role === 'coach' ? 'min(400px, calc(100vw - 32px))' : 320,
            }}>
              <div style={{
                background: BG_CARD, borderRadius: RADIUS_CARD, padding: '32px 28px',
                border: isHighlight ? `2px solid ${GOLD}` : `1px solid ${BORDER}`,
                display: 'flex', flexDirection: 'column', height: '100%', position: 'relative',
              }}>
                {plan.badge && (
                  <span style={{ position: 'absolute', top: -1, right: 24, background: isBest ? '#4ade80' : GOLD, color: '#0D0B08', fontSize: '0.75rem', fontFamily: FONT_ALT, fontWeight: 800, padding: '4px 14px', borderRadius: '0 0 2px 2px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {plan.badge}
                  </span>
                )}
                <div style={{ fontSize: '0.875rem', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: FONT_ALT, fontWeight: 700, color: isHighlight ? GOLD : TEXT_MUTED, marginBottom: 16 }}>{t(plan.nameKey)}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: TEXT_DIM, alignSelf: 'flex-start', marginTop: 16, fontFamily: FONT_BODY }}>CHF</span>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(40px,12vw,56px)', fontWeight: 700, lineHeight: 1, color: GOLD, letterSpacing: '1px' }}>{plan.price.toFixed(2)}</span>
                  {plan.intervalKey && <span style={{ color: TEXT_DIM, fontSize: '0.85rem', fontFamily: FONT_BODY }}>{t(plan.intervalKey)}</span>}
                </div>
                {'savings' in plan && plan.savings && (
                  <div style={{ fontSize: '0.875rem', color: '#4ade80', fontWeight: 600, fontFamily: FONT_ALT, marginBottom: 12 }}>{plan.savings}</div>
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, marginTop: 8 }}>
                  {plan.features.map((f, fi) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Check size={14} color={isHighlight ? GOLD : TEXT_DIM} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.9375rem', color: TEXT_MUTED, fontFamily: FONT_BODY, fontWeight: 400 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => handleSelect(plan.id)} disabled={loading !== null}
                  style={{
                    width: '100%', padding: '15px 20px', borderRadius: 12, border: isHighlight ? 'none' : `1px solid ${GOLD_RULE}`, cursor: loading ? 'wait' : 'pointer',
                    background: isHighlight ? GOLD : 'transparent', color: isHighlight ? '#0D0B08' : TEXT_PRIMARY,
                    fontSize: '0.9rem', fontWeight: 800, fontFamily: FONT_ALT, letterSpacing: 0, textTransform: 'none',
                    transition: 'transform 0.2s, box-shadow 0.2s', opacity: loading && loading !== plan.id ? 0.5 : 1,
                  }}>
                  {getCta(plan)}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <p style={{ color: TEXT_DIM, fontSize: '0.875rem', fontFamily: FONT_BODY, margin: '0 0 16px' }}>{t('footer.security')}</p>
        <button onClick={onSignOut} style={{ background: 'none', border: 'none', color: TEXT_DIM, fontSize: '0.875rem', fontFamily: FONT_BODY, cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.2s' }}>
          {t('footer.signOut')}
        </button>
      </div>
    </div>
  )
}
