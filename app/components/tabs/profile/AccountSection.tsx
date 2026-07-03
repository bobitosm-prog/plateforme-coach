'use client'
import React, { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { LogOut, X, ArrowLeft } from 'lucide-react'
import { RailOverlay } from '../../ui/RailOverlay'
import ClientIntlProvider from '@/components/ClientIntlProvider'
import Paywall from '../../Paywall'
import { cache } from '../../../../lib/cache'
import { colors, fonts, cardStyle, radii, mutedStyle } from '../../../../lib/design-tokens'
import SectionTitle from '../../ui/SectionTitle'
import PaymentHistory from './PaymentHistory'
import DeleteAccountSection from './DeleteAccountSection'

interface AccountSectionProps {
  supabase: any
  session: any
  profile: any
  coachId: string | null
  handleSubscribe?: () => void
  onBack: () => void
}

export default function AccountSection({
  supabase, session, profile, coachId, onBack,
}: AccountSectionProps) {
  const t = useTranslations('profile')
  const locale = useLocale()
  const [showPaywall, setShowPaywall] = useState(false)

  return (
    <div style={{ padding: '20px 20px calc(160px + env(safe-area-inset-bottom, 0px))', minHeight: '100vh', background: colors.background }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ArrowLeft size={20} color={colors.gold} />
          </button>
          <div style={{ fontFamily: fonts.headline, fontSize: 24, fontWeight: 400, color: colors.gold, letterSpacing: '0.02em', lineHeight: 1, textTransform: 'uppercase' }}>
            {t('sections.account')}
          </div>
        </div>

        {/* ═══ MON ABONNEMENT ═══ */}
        <SectionTitle noPadding title={t('sections.subscription')} />
        <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
          {(() => {
            const st = profile?.subscription_status
            const subType = profile?.subscription_type
            const hasEndDate = !!profile?.subscription_end_date
            const days = hasEndDate ? Math.max(0, Math.ceil((new Date(profile.subscription_end_date).getTime() - Date.now()) / 86400000)) : 0
            const endDate = hasEndDate ? new Date(profile.subscription_end_date).toLocaleDateString(locale) : ''

            if (st === 'lifetime') return (
              <div>
                <span style={{ display: 'inline-block', fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, background: `${colors.gold}1a`, border: `1px solid ${colors.gold}33`, borderRadius: 999, padding: '4px 12px', marginBottom: 10 }}>{t('subscription.lifetime')}</span>
                <p style={{ fontSize: 12, color: colors.text, margin: 0, lineHeight: 1.6 }}>{t('subscription.lifetimeDesc')}</p>
              </div>
            )

            if (st === 'invited' || subType === 'invited') return (
              <div>
                <span style={{ display: 'inline-block', fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 999, padding: '4px 12px', marginBottom: 10 }}>{t('subscription.coachAccess')}</span>
                <p style={{ fontSize: 12, color: colors.text, margin: 0 }}>{t('subscription.coachAccessDesc')}</p>
              </div>
            )

            if (st === 'active') {
              const planLabel = subType === 'client_yearly' ? t('subscription.planYearly') : subType === 'coach_monthly' ? t('subscription.planCoach') : t('subscription.planMonthly')
              return (
                <div>
                  <span style={{ display: 'inline-block', fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, background: `${colors.gold}1a`, border: `1px solid ${colors.gold}33`, borderRadius: 999, padding: '4px 12px', marginBottom: 10 }}>{planLabel}</span>
                  {hasEndDate && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: fonts.headline, fontSize: 24, fontWeight: 800, color: colors.text }}>{days}</span>
                        <span style={{ ...mutedStyle, fontSize: 12 }}>{t('subscription.daysRemaining', { days: '' }).trimStart()}</span>
                      </div>
                      <div style={{ ...mutedStyle, fontSize: 10, marginBottom: days <= 7 ? 10 : 0 }}>{t('subscription.renewalDate', { date: endDate })}</div>
                      {days <= 7 && (
                        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: 12, padding: 10, marginBottom: 10 }}>
                          <span style={{ fontSize: 10, color: 'rgba(239,68,68,0.6)' }}>{t('subscription.expiringSoon')}</span>
                        </div>
                      )}
                    </>
                  )}
                  <button onClick={() => setShowPaywall(true)} style={{ width: '100%', padding: 12, borderRadius: radii.button, background: 'transparent', border: `1px solid ${colors.goldBorder}`, color: colors.textMuted, fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const, marginTop: 4 }}>
                    {t('subscription.manageSubscription')}
                  </button>
                </div>
              )
            }

            return (
              <div>
                <p style={{ ...mutedStyle, fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>{t('subscription.subscribePrompt')}</p>
                <button onClick={() => setShowPaywall(true)} style={{ width: '100%', padding: 14, background: colors.gold, border: 'none', borderRadius: radii.button, color: colors.onGold, fontFamily: fonts.headline, fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}>
                  {t('subscription.subscribeCta')}
                </button>
              </div>
            )
          })()}
        </div>

        {/* Paywall modal */}
        {showPaywall && (<RailOverlay>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, overflowY: 'auto' }}>
            <button onClick={() => setShowPaywall(false)} style={{ position: 'fixed', top: 16, right: 16, zIndex: 1001, width: 36, height: 36, background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color={colors.textMuted} />
            </button>
            <ClientIntlProvider>
              <Paywall role="client" userId={session?.user?.id} coachId={coachId} onSignOut={() => setShowPaywall(false)} />
            </ClientIntlProvider>
          </div>
        </RailOverlay>)}

        {/* ═══ HISTORIQUE DES PAIEMENTS ═══ */}
        <PaymentHistory supabase={supabase} userId={session?.user?.id} />

        {/* ═══ DÉCONNEXION ═══ */}
        <button onClick={() => { cache.clearAll(); supabase.auth.signOut().then(() => { window.location.href = '/login' }) }}
          style={{ width: '100%', padding: 16, borderRadius: radii.button, background: 'transparent', border: `1px solid ${colors.goldBorder}`, color: colors.textMuted, fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24 }}>
          <LogOut size={16} /> {t('logout')}
        </button>

        {/* ═══ ZONE DANGER ═══ */}
        <DeleteAccountSection session={session} />

      </div>
    </div>
  )
}
