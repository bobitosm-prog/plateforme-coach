'use client'
import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { LogOut, Zap, ChevronRight, Crown, Bell, BellOff, X, Clock, Calendar, Volume2, User, Cake, Ruler, Target, Activity } from 'lucide-react'
import Paywall from '../Paywall'
import { cache } from '../../../lib/cache'
import { colors, fonts, titleStyle, titleLineStyle, subtitleStyle, statSmallStyle, bodyStyle, labelStyle, mutedStyle, pageTitleStyle, cardStyle, cardTitleAbove, radii } from '../../../lib/design-tokens'
import { isTimerSoundEnabled, setTimerSoundEnabled } from '../../../lib/timer-audio'
import { updateProfile } from '../../../lib/profile-service'
import SwissBadge from '../ui/SwissBadge'
import CoachSection from './profile/CoachSection'
import PaymentHistory from './profile/PaymentHistory'
import DeleteAccountSection from './profile/DeleteAccountSection'
import BadgesModal from '../BadgesModal'
import BadgeCelebration from '../BadgeCelebration'
import { checkAndUnlockBadges, getLevelInfo, type Badge } from '../../../lib/check-badges'

const supabasePush = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ProfileTabProps {
  supabase: any
  session: any
  profile: any
  displayAvatar: string | undefined
  fullName: string
  firstName: string
  avatarRef: React.RefObject<HTMLInputElement | null>
  uploadAvatar: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  currentWeight: number | undefined
  goalWeight: number | null
  calorieGoal: number
  coachProgram: any
  coachId: string | null
  setModal: (modal: string) => void
  fetchAll: () => Promise<void>
  updateReminderSettings: (settings: { preferred_training_time?: string; reminder_enabled?: boolean; reminder_minutes_before?: number }) => Promise<void>
  regenerateWeekSchedule: () => Promise<void>
}

export default function ProfileTab({
  supabase, session, profile, displayAvatar, fullName, firstName, avatarRef, uploadAvatar,
  currentWeight, goalWeight, calorieGoal, coachProgram, coachId, setModal, fetchAll,
  updateReminderSettings, regenerateWeekSchedule,
}: ProfileTabProps) {
  const [phoneForm, setPhoneForm] = useState<string>(profile?.phone || '')
  const [phoneEditing, setPhoneEditing] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [timerSound, setTimerSound] = useState(() => isTimerSoundEnabled())
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<Set<string>>(new Set())
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [totalXp, setTotalXp] = useState(0)
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({})
  const [showBadgesModal, setShowBadgesModal] = useState(false)
  const [celebrateBadge, setCelebrateBadge] = useState<Badge | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return
    const uid = session.user.id

    async function loadAndCheck() {
      // 1. Snapshot BEFORE — get existing badge IDs
      const { data: beforeBadges } = await supabase.from('user_badges').select('badge_id').eq('user_id', uid)
      const beforeIds = new Set<string>((beforeBadges || []).map((b: any) => b.badge_id).filter(Boolean))

      // 2. Run badge check (unlocks new ones)
      const { currentValues: cv } = await checkAndUnlockBadges(uid, supabase)
      setCurrentValues(cv)

      // 3. Refetch AFTER — get full state
      const [bRes, uRes, xRes] = await Promise.all([
        supabase.from('badges').select('*').order('sort_order'),
        supabase.from('user_badges').select('badge_id, badge_type, celebrated').eq('user_id', uid).limit(100),
        supabase.from('user_xp').select('total_xp').eq('user_id', uid).maybeSingle(),
      ])
      setAllBadges(bRes.data || [])
      const afterIds = new Set<string>((uRes.data || []).map((u: any) => u.badge_id || u.badge_type).filter(Boolean))
      setUnlockedBadgeIds(afterIds)
      setTotalXp(xRes.data?.total_xp || 0)

      // 4. Find truly new badges (in after but not in before) AND uncelebrated
      const uncelebrated = (uRes.data || []).filter((u: any) => u.celebrated === false && u.badge_id && !beforeIds.has(u.badge_id))
      if (uncelebrated.length > 0 && bRes.data) {
        const badgeToShow = (bRes.data as Badge[]).find(b => b.id === uncelebrated[0].badge_id)
        if (badgeToShow) setCelebrateBadge(badgeToShow)
      }
    }
    loadAndCheck()
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

  async function savePhone() {
    await updateProfile(session.user.id, { phone: phoneForm }, supabase)
    setPhoneEditing(false)
    fetchAll()
  }

  // Shared row style for list items
  // Check initial push subscription status
  React.useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('push_subscriptions').select('id').eq('user_id', session.user.id).limit(1)
      .then(({ data }: any) => setPushEnabled((data?.length || 0) > 0))
  }, [session?.user?.id])

  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', cursor: 'pointer' }
  const iconBoxStyle: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, background: colors.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  const separatorStyle: React.CSSProperties = { height: 0.5, background: colors.goldDim }

  // Toggle switch component
  const Toggle = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: active ? colors.gold : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: active ? '#fff' : 'rgba(255,255,255,0.5)', position: 'absolute', top: 3, left: active ? 21 : 3, transition: 'left 200ms' }} />
    </button>
  )

  // Pill button component
  const Pill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${active ? `${colors.gold}4d` : `${colors.gold}1a`}`, background: active ? colors.goldBorder : 'transparent', color: active ? colors.gold : 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, cursor: 'pointer' }}>
      {label}
    </button>
  )

  return (
    <div style={{ padding: '20px 20px 120px', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>

      {/* ═══ SECTION 1 — PROFIL HEADER ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <button onClick={() => avatarRef.current?.click()} style={{ width: 80, height: 80, borderRadius: '50%', background: displayAvatar ? 'transparent' : colors.surfaceHigh, border: `2px solid ${colors.goldContainer}4d`, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            {displayAvatar
              ? <img src={displayAvatar} style={{ width: 80, height: 80, objectFit: 'cover' }} alt="Photo de profil" />
              : <span style={{ fontFamily: fonts.headline, fontWeight: 700, fontSize: 32, color: colors.gold }}>{firstName.charAt(0).toUpperCase()}</span>}
          </button>
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => avatarRef.current?.click()}>
            <span style={{ fontSize: 12, color: colors.background, fontWeight: 700, lineHeight: 1 }}>+</span>
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
        <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 700, color: colors.text, letterSpacing: '0.12em', textTransform: 'uppercase' as const, textAlign: 'center', marginBottom: 4 }}>{fullName}</div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10 }}>{session.user.email}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 8, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, border: `1px solid ${colors.goldContainer}33`, borderRadius: 999, padding: '4px 10px', letterSpacing: '0.08em' }}>SWISS MADE</span>
          {profile?.fitness_level && (
            <span style={{ fontSize: 8, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, background: colors.goldBorder, border: `1px solid ${colors.gold}4d`, borderRadius: 999, padding: '4px 10px', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{profile.fitness_level}</span>
          )}
        </div>
        {profile?.created_at && (
          <div style={{ fontSize: 8, color: colors.textMuted, letterSpacing: '0.1em' }}>
            MEMBRE DEPUIS {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
          </div>
        )}
      </div>

      {/* ═══ SECTION 2 — STATS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'POIDS', value: currentWeight || '—', color: colors.gold },
          { label: 'OBJECTIF', value: goalWeight || '—', color: colors.text },
          { label: 'KCAL/J', value: calorieGoal || '—', color: colors.gold },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, padding: 14, textAlign: 'center' }}>
            <div style={{ fontFamily: fonts.headline, fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ SECTION 3 — MON PROFIL ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={cardTitleAbove}>MON PROFIL</span>
        <div style={titleLineStyle} />
      </div>
      <div style={{ ...cardStyle, padding: '4px 16px', marginBottom: 24 }}>
        {[
          { icon: User, label: 'Prénom', value: firstName },
          { icon: Cake, label: 'Date de naissance', value: profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('fr-FR') : '—' },
          { icon: User, label: 'Genre', value: profile?.gender === 'male' ? 'Homme' : profile?.gender === 'female' ? 'Femme' : '—' },
          { icon: Ruler, label: 'Taille', value: profile?.height ? `${profile.height} cm` : '—' },
          { icon: Target, label: 'Poids cible', value: goalWeight ? `${goalWeight} kg` : '—' },
          { icon: Target, label: 'Objectif', value: ({ mass: 'Prise de masse', cut: 'Sèche', maintain: 'Maintien' } as Record<string, string>)[profile?.objective] || profile?.objective || '—', action: 'objective' },
          { icon: Activity, label: 'Niveau d\'activité', value: ({ sedentary: 'Sédentaire', light: 'Léger', moderate: 'Modéré', active: 'Actif', extreme: 'Intense' } as Record<string, string>)[profile?.activity_level] || profile?.activity_level || '—', action: 'objective' },
        ].map((row, i, arr) => (
          <React.Fragment key={row.label}>
            <div style={rowStyle} onClick={'action' in row ? () => setModal(row.action as string) : undefined}>
              <div style={iconBoxStyle}><row.icon size={14} color={colors.gold} /></div>
              <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>{row.label}</span>
              <span style={{ fontSize: 12, color: colors.textMuted }}>{row.value}</span>
              <ChevronRight size={12} color="rgba(255,255,255,0.15)" />
            </div>
            {i < arr.length - 1 && <div style={separatorStyle} />}
          </React.Fragment>
        ))}
      </div>

      {/* ═══ SECTION 4 — TÉLÉPHONE ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={cardTitleAbove}>TÉLÉPHONE</span>
        <div style={titleLineStyle} />
      </div>
      <div style={{ ...cardStyle, padding: '14px 16px', marginBottom: 24 }}>
        {phoneEditing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="tel" value={phoneForm} onChange={e => setPhoneForm(e.target.value)} placeholder="+41 79 000 00 00"
              style={{ flex: 1, background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: radii.button, padding: '8px 12px', color: colors.text, fontSize: 14, outline: 'none', fontFamily: fonts.body }} />
            <button onClick={savePhone} style={{ background: colors.gold, border: 'none', borderRadius: radii.button, padding: '8px 14px', color: '#0D0B08', fontFamily: fonts.headline, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>OK</button>
            <button onClick={() => { setPhoneEditing(false); setPhoneForm(profile?.phone || '') }} style={{ background: colors.surfaceHigh, border: 'none', borderRadius: radii.button, padding: '8px 12px', color: colors.textMuted, fontSize: 12, cursor: 'pointer' }}>✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: profile?.phone ? colors.text : colors.textMuted }}>{profile?.phone || 'Ajouter un numéro'}</span>
            <button onClick={() => setPhoneEditing(true)} style={{ background: 'transparent', border: `1px solid ${colors.goldBorder}`, borderRadius: radii.button, padding: '4px 10px', color: colors.textMuted, fontSize: 10, cursor: 'pointer', fontFamily: fonts.headline, fontWeight: 700 }}>Modifier</button>
          </div>
        )}
      </div>

      {/* ═══ SECTION 5 — OUTILS ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={cardTitleAbove}>OUTILS</span>
        <div style={titleLineStyle} />
      </div>
      <div style={{ ...cardStyle, padding: '4px 16px', marginBottom: 24 }}>
        <div style={rowStyle} onClick={() => setModal('bmr')}>
          <div style={iconBoxStyle}><Zap size={14} color={colors.gold} /></div>
          <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>Calculateur BMR</span>
          <ChevronRight size={12} color="rgba(255,255,255,0.15)" />
        </div>
        {coachProgram && (
          <>
            <div style={separatorStyle} />
            <div style={rowStyle} onClick={regenerateWeekSchedule}>
              <div style={iconBoxStyle}><Calendar size={14} color={colors.gold} /></div>
              <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>Régénérer le planning</span>
              <ChevronRight size={12} color="rgba(255,255,255,0.15)" />
            </div>
          </>
        )}
      </div>

      {/* ═══ SECTION 6 — RAPPELS ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={cardTitleAbove}>RAPPELS</span>
        <div style={titleLineStyle} />
      </div>
      <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
        {/* Push notifications toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pushEnabled ? colors.success : colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <div>
              <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.text }}>Notifications push</div>
              <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim, marginTop: 1 }}>Messages du coach + rappels</div>
            </div>
          </div>
          <Toggle active={pushEnabled} onToggle={async () => {
            if (pushLoading) return
            setPushLoading(true)
            if (pushEnabled) {
              // Unsubscribe
              try {
                const reg = await navigator.serviceWorker.ready
                const sub = await reg.pushManager.getSubscription()
                if (sub) await sub.unsubscribe()
                await supabase.from('push_subscriptions').delete().eq('user_id', session.user.id)
              } catch {}
              setPushEnabled(false)
            } else {
              // Check iOS PWA
              const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
              const isPWA = window.matchMedia('(display-mode: standalone)').matches
              if (isIOS && !isPWA) {
                alert('Pour activer les notifications sur iPhone, ajoute d\'abord MoovX a ton ecran d\'accueil : Safari > Partager > Sur l\'ecran d\'accueil')
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
            <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>Rappels seance</span>
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
            <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>Son du timer</span>
          </div>
          <Toggle active={timerSound} onToggle={() => { const next = !timerSound; setTimerSound(next); setTimerSoundEnabled(next) }} />
        </div>
        {/* Training time */}
        <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 8, marginTop: 14 }}>HEURE D&apos;ENTRAÎNEMENT</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {['06:00', '08:00', '12:00', '17:00', '19:00'].map(time => (
            <Pill key={time} label={time} active={(profile?.preferred_training_time || '08:00') === time} onClick={() => updateReminderSettings({ preferred_training_time: time })} />
          ))}
        </div>
        {/* Reminder delay */}
        <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 8 }}>RAPPEL AVANT SÉANCE</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ label: '15 min', value: 15 }, { label: '30 min', value: 30 }, { label: '1h', value: 60 }].map(opt => (
            <Pill key={opt.value} label={opt.label} active={(profile?.reminder_minutes_before ?? 30) === opt.value} onClick={() => updateReminderSettings({ reminder_minutes_before: opt.value })} />
          ))}
        </div>
        {/* Preview */}
        {profile?.reminder_enabled && (
          <div style={{ background: colors.goldDim, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, padding: 10, marginTop: 14 }}>
            <span style={{ ...mutedStyle, fontSize: 10 }}>
              Rappel à{' '}
              <strong style={{ color: colors.text }}>
                {(() => { const [h, m] = (profile?.preferred_training_time || '08:00').split(':').map(Number); const t = h * 60 + m - (profile?.reminder_minutes_before ?? 30); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` })()}
              </strong>
              {' '}pour ta séance de <strong style={{ color: colors.text }}>{profile?.preferred_training_time || '08:00'}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ═══ SECTION 7 — MON COACH ═══ */}
      {coachProgram && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={cardTitleAbove}>MON COACH</span>
            <div style={titleLineStyle} />
          </div>
          <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Crown size={18} color={colors.gold} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 700, color: colors.text }}>Coach</div>
                <div style={{ ...mutedStyle, fontSize: 10 }}>Coach actif</div>
              </div>
              <span style={{ fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 999, padding: '4px 8px' }}>ACTIF</span>
            </div>
          </div>
        </>
      )}

      {/* ═══ SECTION 8 — MON ABONNEMENT ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={cardTitleAbove}>MON ABONNEMENT</span>
        <div style={titleLineStyle} />
      </div>
      <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
        {(() => {
          const st = profile?.subscription_status
          const subType = profile?.subscription_type
          const days = profile?.subscription_end_date ? Math.max(0, Math.ceil((new Date(profile.subscription_end_date).getTime() - Date.now()) / 86400000)) : 0
          const endDate = profile?.subscription_end_date ? new Date(profile.subscription_end_date).toLocaleDateString('fr-FR') : ''

          if (st === 'lifetime') return (
            <div>
              <span style={{ display: 'inline-block', fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, background: `${colors.gold}1a`, border: `1px solid ${colors.gold}33`, borderRadius: 999, padding: '4px 12px', marginBottom: 10 }}>Accès à vie</span>
              <p style={{ fontSize: 12, color: colors.text, margin: 0, lineHeight: 1.6 }}>Accès permanent à toutes les fonctionnalités MoovX.</p>
            </div>
          )

          if (st === 'invited' || subType === 'invited') return (
            <div>
              <span style={{ display: 'inline-block', fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 999, padding: '4px 12px', marginBottom: 10 }}>Accès Coach</span>
              <p style={{ fontSize: 12, color: colors.text, margin: 0 }}>Ton accès est inclus via ton coach.</p>
            </div>
          )

          if (st === 'active') {
            const planLabel = subType === 'client_yearly' ? 'Plan Annuel — CHF 80/an' : subType === 'coach_monthly' ? 'Coach Pro — CHF 50/mois' : 'Plan Mensuel — CHF 10/mois'
            return (
              <div>
                <span style={{ display: 'inline-block', fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, background: `${colors.gold}1a`, border: `1px solid ${colors.gold}33`, borderRadius: 999, padding: '4px 12px', marginBottom: 10 }}>{planLabel}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: fonts.headline, fontSize: 24, fontWeight: 800, color: colors.text }}>{days}</span>
                  <span style={{ ...mutedStyle, fontSize: 12 }}>jours restants</span>
                </div>
                <div style={{ ...mutedStyle, fontSize: 10, marginBottom: days <= 7 ? 10 : 0 }}>Renouvellement le {endDate}</div>
                {days <= 7 && (
                  <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: 12, padding: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: 'rgba(239,68,68,0.6)' }}>Ton abonnement expire bientôt</span>
                  </div>
                )}
                <button onClick={() => setShowPaywall(true)} style={{ width: '100%', padding: 12, borderRadius: radii.button, background: 'transparent', border: `1px solid ${colors.goldBorder}`, color: colors.textMuted, fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const, marginTop: 4 }}>
                  GÉRER MON ABONNEMENT
                </button>
              </div>
            )
          }

          return (
            <div>
              <p style={{ ...mutedStyle, fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>Abonne-toi pour accéder à toutes les fonctionnalités.</p>
              <button onClick={() => setShowPaywall(true)} style={{ width: '100%', padding: 14, background: colors.gold, border: 'none', borderRadius: radii.button, color: '#0D0B08', fontFamily: fonts.headline, fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}>
                S&apos;abonner — Dès CHF 10/mois
              </button>
            </div>
          )
        })()}
      </div>

      {/* Paywall modal */}
      {showPaywall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, overflowY: 'auto' }}>
          <button onClick={() => setShowPaywall(false)} style={{ position: 'fixed', top: 16, right: 16, zIndex: 1001, width: 36, height: 36, background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={colors.textMuted} />
          </button>
          <Paywall role="client" userId={session?.user?.id} coachId={coachId} onSignOut={() => setShowPaywall(false)} />
        </div>
      )}

      {/* ═══ SECTION 9 — PAIEMENTS ═══ */}
      <PaymentHistory supabase={supabase} userId={session?.user?.id} />

      {/* ═══ SECTION 10 — MES BADGES ═══ */}
      {(() => {
        const earnedBadges = allBadges.filter(b => unlockedBadgeIds.has(b.id))
        const lastThree = earnedBadges.slice(-3)
        const EMOJIS: Record<string, string> = { star: '⭐', grid: '📊', home: '🏠', clock: '⏱️', 'star-big': '🌟', chart: '📈', doc: '📝', list: '📋', scan: '📷', target: '🎯', flame: '🔥', 'flame-plus': '💪', 'flame-star': '🏆', 'flame-crown': '👑', 'flame-legend': '🏅', camera: '📸', share: '🔗', users: '👥', crown: '👑' }
        const level = getLevelInfo(totalXp)
        return (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={cardTitleAbove}>MES BADGES</span>
              <div style={titleLineStyle} />
              <span style={{ ...labelStyle, fontSize: 10 }}>{earnedBadges.length}/{allBadges.length}</span>
              <button onClick={() => setShowBadgesModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: colors.gold, letterSpacing: '0.08em' }}>VOIR TOUT →</button>
            </div>
            <div style={{ ...cardStyle, padding: 16, marginBottom: 8 }}>
              {/* Level bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 800, color: colors.gold }}>LV.{level.level}</span>
                <div style={{ flex: 1, height: 4, background: `${colors.gold}1a`, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.round(((totalXp - level.minXp) / (level.maxXp - level.minXp)) * 100))}%`, height: '100%', background: colors.gold, borderRadius: 999 }} />
                </div>
                <span style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.gold }}>{totalXp} XP</span>
              </div>
              {/* Last 3 earned */}
              {lastThree.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {lastThree.map(b => (
                    <div key={b.id} style={{ background: colors.goldDim, border: `1px solid ${colors.gold}4d`, borderRadius: 12, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, marginBottom: 3 }}>{EMOJIS[b.icon] || '🏆'}</div>
                      <div style={{ fontFamily: fonts.headline, fontSize: 7, fontWeight: 700, color: colors.text, letterSpacing: '0.05em' }}>{b.name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <span style={{ fontSize: 10, color: colors.textMuted }}>Complète des actions pour débloquer des badges !</span>
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* Badges fullscreen modal */}
      {showBadgesModal && (
        <BadgesModal allBadges={allBadges} unlockedIds={unlockedBadgeIds} totalXp={totalXp} currentValues={currentValues} onClose={() => setShowBadgesModal(false)} />
      )}

      {/* Badge celebration */}
      {celebrateBadge && (
        <BadgeCelebration badge={celebrateBadge} xp={celebrateBadge.xp_reward} onClose={async () => {
          // Mark ALL uncelebrated badges as celebrated (belt and suspenders)
          await supabase.from('user_badges').update({ celebrated: true }).eq('user_id', session.user.id).eq('celebrated', false)
          setCelebrateBadge(null)
        }} />
      )}

      {/* ═══ SECTION 11 — ZONE DANGER ═══ */}
      <button onClick={() => { cache.clearAll(); supabase.auth.signOut().then(() => { window.location.href = '/login' }) }}
        style={{ width: '100%', padding: 16, borderRadius: radii.button, background: 'transparent', border: `1px solid ${colors.goldBorder}`, color: colors.textMuted, fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24 }}>
        <LogOut size={16} /> DÉCONNEXION
      </button>
      <DeleteAccountSection session={session} />
    </div>
  )
}
