'use client'
import { isActiveAppleEntitlement, type AppleEntitlement } from '@/lib/entitlements/apple-entitlement'
import { applePurchaseBridge, isNativeMoovx, loadNativeAppleProducts, APPLE_PRODUCTS, type NativeProduct } from '@/lib/apple/native-purchases'
import React, { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { LogOut, X, ArrowLeft } from 'lucide-react'
import { RailOverlay } from '../../ui/RailOverlay'
import ClientIntlProvider from '@/components/ClientIntlProvider'
import Paywall from '../../Paywall'
import { cache } from '../../../../lib/cache'
import { colors, fonts, radii, mutedStyle } from '../../../../lib/design-tokens'
import styles from './AccountSection.module.css'
import homeStyles from '../../home-v2/HomeV2.module.css'
import PaymentHistory from './PaymentHistory'
import DeleteAccountSection from './DeleteAccountSection'

interface AccountSectionProps {
  appleEntitlement?: AppleEntitlement | null
  supabase: any
  session: any
  profile: any
  coachId: string | null
  handleSubscribe?: () => void
  onBack: () => void
}

export default function AccountSection({
  supabase, session, profile, coachId, onBack, appleEntitlement,
}: AccountSectionProps) {
  const t = useTranslations('profile')
  const accountText = useTranslations('account')
  const [products, setProducts] = useState<NativeProduct[]>([])
  const appleText = useTranslations('applePurchases')
  const [native, setNative] = useState<boolean | null>(null)
  const [appleMessage, setAppleMessage] = useState('')
  useEffect(() => {
    let alive = true
    const isNative = isNativeMoovx()
    setNative(isNative)
    if (isNative) loadNativeAppleProducts().then(items => { if (alive) setProducts(items) }).catch(() => { if (alive) setAppleMessage(appleText('unavailable')) })
    return () => { alive = false }
  }, [appleText])
  const locale = useLocale()
  const [showPaywall, setShowPaywall] = useState(false)

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <button onClick={onBack} className={styles.back} aria-label={t('sections.account')}><ArrowLeft size={22} /></button>
        <header><h1 className={homeStyles.title}>{accountText('titleLead')}<br /><em>{accountText('titleAccent')}</em></h1></header>
        <section className={styles.card}>
          <h2 className={styles.label}>{t('sections.subscription')}</h2>
          {(() => {
            if (isActiveAppleEntitlement(appleEntitlement)) return <>
              <p style={{ color: colors.gold, fontWeight: 700 }}>Apple · {appleText(appleEntitlement!.plan)}</p>
              {appleEntitlement?.accessUntil && <p style={mutedStyle}>{new Date(appleEntitlement.accessUntil).toLocaleDateString(locale)}</p>}
              {native && appleEntitlement?.type !== 'lifetime' && <button onClick={async () => {
                try { await applePurchaseBridge()?.postMessage({ action: 'manage' }) }
                catch { setAppleMessage(appleText('unavailable')) }
              }} style={{ color: colors.gold, minHeight: 44 }}>{appleText('manage')}</button>}
            </>
            const st = profile?.subscription_status
            const subType = profile?.subscription_type
            const hasHistoricalCoachAccess = (
              st === 'invited' || subType === 'invited'
            )
            const hasEndDate = !!profile?.subscription_end_date
            const days = hasEndDate ? Math.max(0, Math.ceil((new Date(profile.subscription_end_date).getTime() - Date.now()) / 86400000)) : 0
            const endDate = hasEndDate ? new Date(profile.subscription_end_date).toLocaleDateString(locale) : ''

            if (st === 'lifetime') return (
              <div>
                <span style={{ display: 'inline-block', fontSize: 12, fontFamily: fonts.body, fontWeight: 700, color: colors.gold, background: `${colors.gold}1a`, border: `1px solid ${colors.gold}33`, borderRadius: 999, padding: '4px 12px', marginBottom: 10 }}>{t('subscription.lifetime')}</span>
                <p style={{ fontSize: 12, color: colors.text, margin: 0, lineHeight: 1.6 }}>{t('subscription.lifetimeDesc')}</p>
              </div>
            )

            if (hasHistoricalCoachAccess) return (
              <div>
                <span style={{ display: 'inline-block', fontSize: 12, fontFamily: fonts.body, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 999, padding: '4px 12px', marginBottom: 10 }}>{t('subscription.legacyAccess')}</span>
                <p style={{ fontSize: 12, color: colors.text, margin: 0 }}>{t('subscription.legacyAccessDesc')}</p>
              </div>
            )

            if (st === 'active') {
              const planLabel = subType === 'client_yearly' ? t('subscription.planYearly') : subType === 'coach_monthly' ? t('subscription.planCoach') : t('subscription.planMonthly')
              return (
                <div>
                  <span style={{ display: 'inline-block', fontSize: 12, fontFamily: fonts.body, fontWeight: 700, color: colors.gold, background: `${colors.gold}1a`, border: `1px solid ${colors.gold}33`, borderRadius: 999, padding: '4px 12px', marginBottom: 10 }}>{planLabel}</span>
                  {hasEndDate && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: fonts.body, fontSize: 24, fontWeight: 800, color: colors.text }}>{days}</span>
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
                  <button onClick={() => setShowPaywall(true)} style={{ width: '100%', padding: 12, borderRadius: radii.button, background: 'transparent', border: `1px solid ${colors.goldBorder}`, color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: '0', cursor: 'pointer', textTransform: 'uppercase' as const, marginTop: 4 }}>
                    {t('subscription.manageSubscription')}
                  </button>
                </div>
              )
            }

            return (
              <div>
                <p style={{ ...mutedStyle, fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>{t('subscription.subscribePrompt')}</p>
                <div className={styles.offers}>
                  {(['monthly', 'yearly'] as const).map((plan, index) => <div className={styles.offer} key={plan}>
                    <h3>{appleText(plan)}</h3>
                    <strong>{native !== false ? products.find(product => product.id === APPLE_PRODUCTS[index])?.displayPrice ?? '—' : `CHF ${index === 0 ? '9.90' : '79.90'}`}</strong>
                    <span>{appleText(index === 0 ? 'perMonth' : 'perYear')}</span>
                  </div>)}
                </div>
                <button onClick={() => setShowPaywall(true)} className={styles.primary}>
                  {t('subscription.viewOffers')}
                </button>
              </div>
            )
          })()}
        </section>

        {native && <button onClick={() => setShowPaywall(true)} style={{ minHeight: 48, color: colors.gold, marginBottom: 16 }}>{appleText('restore')}</button>}
        {appleMessage && <p role="status" className={styles.message}>{appleMessage}</p>}
        {/* Paywall modal */}
        {showPaywall && (<RailOverlay>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, overflowY: 'auto' }}>
            <button aria-label={appleText('close')} onClick={() => setShowPaywall(false)} style={{ position: 'fixed', top: 16, right: 16, zIndex: 1001, width: 36, height: 36, background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color={colors.textMuted} />
            </button>
            <ClientIntlProvider>
              <Paywall dismissible role="client" userId={session?.user?.id} coachId={coachId} onSignOut={() => setShowPaywall(false)} />
            </ClientIntlProvider>
          </div>
        </RailOverlay>)}

        {/* ═══ HISTORIQUE DES PAIEMENTS ═══ */}
        <PaymentHistory supabase={supabase} userId={session?.user?.id} />

        {/* ═══ DÉCONNEXION ═══ */}
        <button onClick={() => { cache.clearAll(); supabase.auth.signOut().then(() => { window.location.href = '/login' }) }}
          style={{ width: '100%', padding: 16, borderRadius: radii.button, background: 'transparent', border: `1px solid ${colors.goldBorder}`, color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, fontWeight: 700, letterSpacing: '0', cursor: 'pointer', textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24 }}>
          <LogOut size={16} /> {t('logout')}
        </button>

        {/* ═══ ZONE DANGER ═══ */}
        <DeleteAccountSection session={session} />

      </div>
    </div>
  )
}
