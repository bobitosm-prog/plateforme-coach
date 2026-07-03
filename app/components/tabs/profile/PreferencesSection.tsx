'use client'
import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useTranslations } from 'next-intl'
import { Bell, Volume2, Activity, Globe, ArrowLeft } from 'lucide-react'
import { colors, fonts, cardStyle } from '../../../../lib/design-tokens'
import { isTimerSoundEnabled, setTimerSoundEnabled } from '../../../../lib/timer-audio'
import SectionTitle from '../../ui/SectionTitle'
import LocaleSelector from '@/components/LocaleSelector'

const supabasePush = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PreferencesSectionProps {
  supabase: any
  session: any
  profile: any
  updateReminderSettings: (settings: { preferred_training_time?: string; reminder_enabled?: boolean; reminder_minutes_before?: number }) => Promise<void>
  updateRirSettings: (settings: { rir_tracking_enabled?: boolean; rir_scale_advanced?: boolean }) => Promise<void>
  onBack: () => void
}

const Toggle = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
  <button onClick={onToggle} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: active ? colors.gold : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}>
    <div style={{ width: 16, height: 16, borderRadius: '50%', background: active ? '#fff' : 'rgba(255,255,255,0.5)', position: 'absolute', top: 3, left: active ? 21 : 3, transition: 'left 200ms' }} />
  </button>
)

const Pill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${active ? `${colors.gold}4d` : `${colors.gold}1a`}`, background: active ? colors.goldBorder : 'transparent', color: active ? colors.gold : 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, cursor: 'pointer' }}>
    {label}
  </button>
)

export default function PreferencesSection({
  supabase, session, profile, updateReminderSettings, updateRirSettings, onBack,
}: PreferencesSectionProps) {
  const t = useTranslations('profile')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle')
  const [timerSound, setTimerSound] = useState(() => isTimerSoundEnabled())

  // Check initial push subscription status
  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('push_subscriptions').select('id').eq('user_id', session.user.id).limit(1)
      .then(({ data }: any) => setPushEnabled((data?.length || 0) > 0))
  }, [session?.user?.id])

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  async function enableNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('[Push] Not supported'); return false
    }
    setNotifStatus('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setNotifStatus('denied'); return false }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) { console.error('[Push] VAPID key missing'); setNotifStatus('denied'); return false }
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) })
      await supabasePush.from('push_subscriptions').upsert({ user_id: session.user.id, subscription: sub.toJSON() }, { onConflict: 'user_id' })
      setNotifStatus('done')
      return true
    } catch (err) {
      console.error('[Push] Error:', err)
      setNotifStatus('denied')
      return false
    }
  }

  return (
    <div style={{ padding: '20px 20px calc(160px + env(safe-area-inset-bottom, 0px))', minHeight: '100vh', background: colors.background }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ArrowLeft size={20} color={colors.gold} />
          </button>
          <div style={{ fontFamily: fonts.headline, fontSize: 24, fontWeight: 400, color: colors.gold, letterSpacing: '0.02em', lineHeight: 1, textTransform: 'uppercase' }}>
            {t('sections.preferences')}
          </div>
        </div>

        {/* ═══ LANGUE ═══ */}
        <SectionTitle noPadding title={t('sections.language')} />
        <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Globe size={14} color={colors.gold} />
              <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.text }}>{t('sections.language')}</span>
            </div>
            <LocaleSelector />
          </div>
        </div>

        {/* ═══ RAPPELS ═══ */}
        <SectionTitle noPadding title={t('sections.reminders')} />
        <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
          {/* Push notifications toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pushEnabled ? colors.success : colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <div>
                <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.text }}>{t('reminders.pushNotifications')}</div>
                <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim, marginTop: 1 }}>{t('reminders.pushDescription')}</div>
              </div>
            </div>
            <Toggle active={pushEnabled} onToggle={async () => {
              if (pushLoading) return
              setPushLoading(true)
              if (pushEnabled) {
                try {
                  const reg = await navigator.serviceWorker.ready
                  const sub = await reg.pushManager.getSubscription()
                  if (sub) await sub.unsubscribe()
                  await supabase.from('push_subscriptions').delete().eq('user_id', session.user.id)
                } catch {}
                setPushEnabled(false)
              } else {
                const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
                const isPWA = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
                if (isIOS && !isPWA) {
                  alert(t('reminders.iosAlert'))
                  setPushLoading(false); return
                }
                await enableNotifications()
                const { data } = await supabase.from('push_subscriptions').select('id').eq('user_id', session.user.id).limit(1)
                setPushEnabled((data?.length || 0) > 0)
              }
              setPushLoading(false)
            }} />
          </div>

          {/* Toggle reminders */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bell size={14} color={profile?.reminder_enabled ? colors.success : colors.textMuted} />
              <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>{t('reminders.sessionReminders')}</span>
            </div>
            <Toggle active={!!profile?.reminder_enabled} onToggle={async () => {
              const newVal = !profile?.reminder_enabled
              if (newVal && 'Notification' in window && Notification.permission !== 'granted') {
                const perm = await Notification.requestPermission()
                if (perm !== 'granted') return
              }
              await updateReminderSettings({ reminder_enabled: newVal })
            }} />
          </div>
          {/* Timer sound */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Volume2 size={14} color={timerSound ? colors.success : colors.textMuted} />
              <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>{t('reminders.timerSound')}</span>
            </div>
            <Toggle active={timerSound} onToggle={() => { const next = !timerSound; setTimerSound(next); setTimerSoundEnabled(next) }} />
          </div>
          {/* Training time */}
          <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 8, marginTop: 14 }}>{t('reminders.trainingTime')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {['06:00', '08:00', '12:00', '17:00', '19:00'].map(time => (
              <Pill key={time} label={time} active={(profile?.preferred_training_time || '08:00') === time} onClick={() => updateReminderSettings({ preferred_training_time: time })} />
            ))}
          </div>
          {/* Reminder delay */}
          <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 8 }}>{t('reminders.reminderBefore')}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ label: '15 min', value: 15 }, { label: '30 min', value: 30 }, { label: '1h', value: 60 }].map(opt => (
              <Pill key={opt.value} label={opt.label} active={(profile?.reminder_minutes_before ?? 30) === opt.value} onClick={() => updateReminderSettings({ reminder_minutes_before: opt.value })} />
            ))}
          </div>
          {/* Preview */}
          {profile?.reminder_enabled && (
            <div style={{ background: colors.goldDim, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, padding: 10, marginTop: 14 }}>
              <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted }}>
                {t('reminders.reminderPreview', {
                  time: (() => { const [h, m] = (profile?.preferred_training_time || '08:00').split(':').map(Number); const tt = h * 60 + m - (profile?.reminder_minutes_before ?? 30); return `${String(Math.floor(tt / 60)).padStart(2, '0')}:${String(tt % 60).padStart(2, '0')}` })(),
                  sessionTime: profile?.preferred_training_time || '08:00',
                })}
              </span>
            </div>
          )}
        </div>

        {/* ═══ EFFORT (RIR) ═══ */}
        <SectionTitle noPadding title={t('sections.effort')} />
        <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={14} color={profile?.rir_tracking_enabled ? colors.success : colors.textMuted} />
              <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>{t('rir.tracking')}</span>
            </div>
            <Toggle active={!!profile?.rir_tracking_enabled} onToggle={async () => {
              await updateRirSettings({ rir_tracking_enabled: !profile?.rir_tracking_enabled })
            }} />
          </div>
          {profile?.rir_tracking_enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingLeft: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={12} color={profile?.rir_scale_advanced ? colors.gold : colors.textMuted} />
                <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 600, color: colors.textMuted }}>{t('rir.advancedScale')}</span>
              </div>
              <Toggle active={!!profile?.rir_scale_advanced} onToggle={async () => {
                await updateRirSettings({ rir_scale_advanced: !profile?.rir_scale_advanced })
              }} />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
