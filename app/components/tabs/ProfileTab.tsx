'use client'
import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { LogOut, Zap, ChevronRight, Crown, Bell, BellOff, Download, X, Clock, Calendar, Volume2 } from 'lucide-react'
import Paywall from '../Paywall'
import { cache } from '../../../lib/cache'
import { colors, fonts, titleStyle, subtitleStyle, statStyle, statSmallStyle, bodyStyle, labelStyle, mutedStyle, pageTitleStyle, cardStyle, cardTitleAbove, BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD } from '../../../lib/design-tokens'
import { isTimerSoundEnabled, setTimerSoundEnabled } from '../../../lib/timer-audio'
import SwissBadge from '../ui/SwissBadge'
import CoachSection from './profile/CoachSection'
import PaymentHistory from './profile/PaymentHistory'
import DeleteAccountSection from './profile/DeleteAccountSection'

const ORANGE = GOLD

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
  supabase,
  session,
  profile,
  displayAvatar,
  fullName,
  firstName,
  avatarRef,
  uploadAvatar,
  currentWeight,
  goalWeight,
  calorieGoal,
  coachProgram,
  coachId,
  setModal,
  fetchAll,
  updateReminderSettings,
  regenerateWeekSchedule,
}: ProfileTabProps) {
  const T = titleStyle
  const [phoneForm, setPhoneForm] = useState<string>(profile?.phone || '')
  const [phoneEditing, setPhoneEditing] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle')
  const [showPaywall, setShowPaywall] = useState(false)
  const [timerSound, setTimerSound] = useState(() => isTimerSoundEnabled())
  const [badges, setBadges] = useState<string[]>([])

  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('user_badges').select('badge_type').eq('user_id', session.user.id).limit(100)
      .then(({ data }: any) => setBadges((data || []).map((b: any) => b.badge_type)))
  }, [session?.user?.id])

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  async function enableNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    setNotifStatus('loading')

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { setNotifStatus('denied'); return }

    const reg = await navigator.serviceWorker.ready

    const existing = await reg.pushManager.getSubscription()

    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    })

    const { data, error } = await supabasePush.from('push_subscriptions').upsert(
      { user_id: session.user.id, subscription: sub.toJSON() },
      { onConflict: 'user_id' }
    )

    setNotifStatus('done')
  }

  async function savePhone() {
    await supabase.from('profiles').update({ phone: phoneForm }).eq('id', session.user.id)
    setPhoneEditing(false)
    fetchAll()
  }

  return (
    <div style={{ padding: '20px 20px 20px', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      <h1 style={{ ...pageTitleStyle, margin: '0 0 24px' }}>PROFIL</h1>

      {/* Avatar + name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 12 }}>
        <button onClick={() => avatarRef.current?.click()} style={{ width: 80, height: 80, borderRadius: '50%', background: displayAvatar ? 'transparent' : BG_CARD_2, border: `2px solid ${GOLD}`, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, position: 'relative' }}>
          {displayAvatar
            ? <img src={displayAvatar} style={{ width: 80, height: 80, objectFit: 'cover' }} alt="Photo de profil" />
            : <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 32, color: GOLD }}>{firstName.charAt(0).toUpperCase()}</span>
          }
        </button>
        <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...statStyle, fontSize: '2.5rem', textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1.1 }}>{fullName}</div>
          <div style={{ ...mutedStyle, marginBottom: 6 }}>{session.user.email}</div>
          <SwissBadge variant="solid" />
          {profile?.fitness_level && (
            <div style={{ display: 'inline-block', marginTop: 8, background: GOLD_DIM, border: `1px solid ${GOLD}`, borderRadius: 20, padding: '4px 14px' }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: '0.75rem', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '1px' }}>{profile.fitness_level}</span>
            </div>
          )}
          {profile?.created_at && (
            <div style={{ ...subtitleStyle, fontSize: '10px', marginTop: 6 }}>
              MEMBRE DEPUIS {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
        {[
          { label: 'Poids', value: currentWeight ? `${currentWeight}kg` : '—', color: GOLD },
          { label: 'Objectif', value: goalWeight ? `${goalWeight}kg` : '—', color: TEXT_MUTED },
          { label: 'Kcal/j', value: calorieGoal ? `${calorieGoal}` : '—', color: TEXT_MUTED },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '14px 8px', textAlign: 'center' }}>
            <div style={{ ...statSmallStyle, fontSize: '1.6rem', color }}>{value}</div>
            <div style={{ ...mutedStyle, fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Phone field */}
      <div style={cardTitleAbove}>Téléphone</div>
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '14px 16px', marginBottom: 8 }}>
        {phoneEditing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="tel"
              value={phoneForm}
              onChange={e => setPhoneForm(e.target.value)}
              placeholder="+33 6 00 00 00 00"
              style={{ flex: 1, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 12px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none', fontFamily: FONT_BODY }}
            />
            <button onClick={savePhone} style={{ background: GOLD, border: 'none', borderRadius: 12, padding: '8px 14px', color: '#0D0B08', fontFamily: FONT_ALT, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>OK</button>
            <button onClick={() => { setPhoneEditing(false); setPhoneForm(profile?.phone || '') }} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 12px', color: TEXT_MUTED, fontSize: '0.8rem', cursor: 'pointer', fontFamily: FONT_ALT }}>✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...bodyStyle, fontSize: 15, color: profile?.phone ? TEXT_PRIMARY : TEXT_MUTED }}>{profile?.phone || 'Ajouter un numéro'}</span>
            <button onClick={() => setPhoneEditing(true)} style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '4px 10px', color: TEXT_MUTED, fontSize: '0.72rem', cursor: 'pointer', fontFamily: FONT_ALT, fontWeight: 700 }}>Modifier</button>
          </div>
        )}
      </div>

      {/* BMR calculator */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <button onMouseEnter={e => (e.currentTarget.style.background = colors.surfaceHigh)} onMouseLeave={e => (e.currentTarget.style.background = BG_CARD)} onClick={() => setModal('bmr')} style={{ background: BG_CARD, borderBottom: '1px solid rgba(255,255,255,0.04)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 12, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 150ms', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Zap size={18} color={TEXT_MUTED} />
            <span style={{ ...bodyStyle, color: TEXT_PRIMARY }}>Calculateur BMR</span>
          </div>
          <ChevronRight size={16} color={TEXT_DIM} />
        </button>
      </div>

      {/* Coach section */}
      {coachProgram && (
        <div style={{ background: BG_CARD, border: `1px solid ${GOLD_RULE}`, borderRadius: RADIUS_CARD, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Crown size={18} color={GOLD} />
            <div>
              <div style={{ ...bodyStyle, fontWeight: 700, color: TEXT_PRIMARY }}>Mon coach</div>
              <div style={{ ...mutedStyle }}>Programme actif</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: GREEN, background: `${GREEN}20`, borderRadius: RADIUS_CARD, padding: '4px 8px' }}>Actif</span>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        <button
          onClick={enableNotifications}
          disabled={notifStatus === 'loading' || notifStatus === 'done'}
          onMouseEnter={e => (e.currentTarget.style.background = colors.surfaceHigh)}
          onMouseLeave={e => (e.currentTarget.style.background = BG_CARD)}
          style={{ background: BG_CARD, borderBottom: '1px solid rgba(255,255,255,0.04)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 12, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: notifStatus === 'done' ? 'default' : 'pointer', opacity: notifStatus === 'loading' ? 0.6 : 1, transition: 'background 150ms', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {notifStatus === 'denied' ? <BellOff size={18} color={RED} /> : <Bell size={18} color={notifStatus === 'done' ? GREEN : TEXT_MUTED} />}
            <span style={{ ...bodyStyle, color: notifStatus === 'denied' ? RED : TEXT_PRIMARY }}>
              {notifStatus === 'done' ? 'Notifications activées' : notifStatus === 'denied' ? 'Notifications refusées' : 'Activer les notifications'}
            </span>
          </div>
          {notifStatus === 'done' && <span style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: GREEN, background: `${GREEN}20`, borderRadius: RADIUS_CARD, padding: '4px 8px' }}>Actif</span>}
          {notifStatus === 'idle' && <ChevronRight size={16} color={TEXT_DIM} />}
        </button>
      </div>

      {/* Reminder settings */}
      <div style={cardTitleAbove}>Rappels d&apos;entraînement</div>
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18, marginBottom: 8 }}>

        {/* Toggle reminders */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={16} color={profile?.reminder_enabled ? GREEN : TEXT_MUTED} />
            <span style={{ ...bodyStyle, fontSize: 15, color: TEXT_PRIMARY }}>Activer les rappels</span>
          </div>
          <button
            onClick={async () => {
              const newVal = !profile?.reminder_enabled
              if (newVal && 'Notification' in window && Notification.permission !== 'granted') {
                const perm = await Notification.requestPermission()
                if (perm !== 'granted') return
              }
              await updateReminderSettings({ reminder_enabled: newVal })
            }}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: profile?.reminder_enabled ? GOLD : '#333',
              position: 'relative', transition: 'background 200ms',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: profile?.reminder_enabled ? 23 : 3,
              transition: 'left 200ms',
            }} />
          </button>
        </div>

        {/* Timer sound toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Volume2 size={16} color={timerSound ? GREEN : TEXT_MUTED} />
            <span style={{ ...bodyStyle, fontSize: 15, color: TEXT_PRIMARY }}>Son du timer</span>
          </div>
          <button
            onClick={() => { const next = !timerSound; setTimerSound(next); setTimerSoundEnabled(next) }}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: timerSound ? GOLD : '#333',
              position: 'relative', transition: 'background 200ms',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: timerSound ? 23 : 3,
              transition: 'left 200ms',
            }} />
          </button>
        </div>

        {/* Preferred training time */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Clock size={16} color={TEXT_MUTED} />
            <span style={{ ...subtitleStyle, fontSize: 11 }}>Heure d&apos;entraînement</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['06:00', '08:00', '12:00', '17:00', '19:00'].map(time => {
              const isActive = (profile?.preferred_training_time || '08:00') === time
              return (
                <button
                  key={time}
                  onClick={() => updateReminderSettings({ preferred_training_time: time })}
                  style={{
                    padding: '6px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: isActive ? `${GOLD}20` : BG_BASE,
                    color: isActive ? GOLD : TEXT_MUTED,
                    fontSize: '0.78rem', fontFamily: FONT_ALT, fontWeight: isActive ? 700 : 500,
                    outline: isActive ? `1.5px solid ${GOLD}` : `1px solid ${BORDER}`,
                  }}
                >
                  {time}
                </button>
              )
            })}
          </div>
        </div>

        {/* Reminder delay */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Calendar size={16} color={TEXT_MUTED} />
            <span style={{ ...subtitleStyle, fontSize: 11 }}>Rappel avant la séance</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ label: '15 min', value: 15 }, { label: '30 min', value: 30 }, { label: '1h', value: 60 }].map(opt => {
              const isActive = (profile?.reminder_minutes_before ?? 30) === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => updateReminderSettings({ reminder_minutes_before: opt.value })}
                  style={{
                    padding: '6px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: isActive ? `${GOLD}20` : BG_BASE,
                    color: isActive ? GOLD : TEXT_MUTED,
                    fontSize: '0.78rem', fontFamily: FONT_ALT, fontWeight: isActive ? 700 : 500,
                    outline: isActive ? `1.5px solid ${GOLD}` : `1px solid ${BORDER}`,
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Preview */}
        {profile?.reminder_enabled && (
          <div style={{
            background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD,
            padding: '10px 14px', marginBottom: 12,
          }}>
            <span style={{ ...mutedStyle }}>
              Tu recevras un rappel à{' '}
              <strong style={{ color: TEXT_PRIMARY }}>
                {(() => {
                  const time = profile?.preferred_training_time || '08:00'
                  const [h, m] = time.split(':').map(Number)
                  const mins = (profile?.reminder_minutes_before ?? 30)
                  const totalMin = h * 60 + m - mins
                  const rH = Math.floor(totalMin / 60)
                  const rM = totalMin % 60
                  return `${String(rH).padStart(2, '0')}:${String(rM).padStart(2, '0')}`
                })()}
              </strong>
              {' '}pour ta séance de{' '}
              <strong style={{ color: TEXT_PRIMARY }}>{profile?.preferred_training_time || '08:00'}</strong>
            </span>
          </div>
        )}

        {/* Regenerate schedule */}
        {coachProgram && (
          <button
            onClick={regenerateWeekSchedule}
            style={{
              width: '100%', padding: '10px', background: BG_BASE,
              border: `1px solid ${BORDER}`, borderRadius: 12, cursor: 'pointer',
              fontSize: '0.78rem', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Régénérer le planning de la semaine
          </button>
        )}
      </div>

      {/* Subscription */}
      <div style={cardTitleAbove}>Mon abonnement</div>
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18 }}>
        {(() => {
          const st = profile?.subscription_status
          const subType = profile?.subscription_type
          const days = profile?.subscription_end_date ? Math.max(0, Math.ceil((new Date(profile.subscription_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0
          const endDate = profile?.subscription_end_date ? new Date(profile.subscription_end_date).toLocaleDateString('fr-FR') : ''

          // Lifetime
          if (st === 'lifetime') return (
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: RADIUS_CARD, background: colors.goldBorder, border: `1px solid ${GOLD_RULE}`, color: GOLD, fontSize: '0.78rem', fontFamily: FONT_ALT, fontWeight: 700, marginBottom: 12 }}>Accès à vie</span>
              <p style={{ ...bodyStyle, fontSize: 15, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.6 }}>Tu bénéficies d&apos;un accès permanent à toutes les fonctionnalités MoovX.</p>
            </div>
          )

          // Invited (via coach)
          if (st === 'invited' || subType === 'invited') return (
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: RADIUS_CARD, background: `${GREEN}15`, border: `1px solid ${GREEN}30`, color: GREEN, fontSize: '0.78rem', fontFamily: FONT_ALT, fontWeight: 700, marginBottom: 12 }}>Accès Coach</span>
              <p style={{ ...bodyStyle, fontSize: 15, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.6 }}>Ton accès est inclus via ton coach.</p>
            </div>
          )

          // Active subscription
          if (st === 'active') {
            const planLabel = subType === 'client_yearly' ? 'Plan Annuel — CHF 80/an'
              : subType === 'coach_monthly' ? 'Coach Pro — CHF 50/mois'
              : 'Plan Mensuel — CHF 10/mois'
            return (
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: RADIUS_CARD, background: `${GREEN}15`, border: `1px solid ${GREEN}30`, color: GREEN, fontSize: '0.78rem', fontFamily: FONT_ALT, fontWeight: 700, marginBottom: 12 }}>{planLabel}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ ...statSmallStyle, fontSize: '1.4rem' }}>{days}</span>
                  <span style={{ ...mutedStyle, fontSize: '0.82rem' }}>jours restants</span>
                </div>
                <div style={{ ...mutedStyle, marginBottom: days <= 5 ? 4 : 0 }}>Renouvellement le {endDate}</div>
                {days <= 5 && <div style={{ ...labelStyle, fontSize: '0.78rem', marginTop: 6, cursor: 'default' }}>Ton abonnement expire bientôt</div>}
              </div>
            )
          }

          // No subscription
          return (
            <div>
              <p style={{ ...mutedStyle, fontSize: '0.82rem', margin: '0 0 14px', lineHeight: 1.5 }}>Abonne-toi pour accéder à toutes les fonctionnalités.</p>
              <button onClick={() => setShowPaywall(true)} style={{ width: '100%', padding: '14px', background: GOLD, border: 'none', borderRadius: 12, color: '#0D0B08', fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 800, cursor: 'pointer',  }}>
                S&apos;abonner — Dès CHF 10/mois
              </button>
            </div>
          )
        })()}
      </div>

      {/* Paywall modal */}
      {showPaywall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, overflowY: 'auto' }}>
          <button onClick={() => setShowPaywall(false)} style={{ position: 'fixed', top: 16, right: 16, zIndex: 1001, width: 36, height: 36, background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={TEXT_MUTED} />
          </button>
          <Paywall role="client" userId={session?.user?.id} coachId={coachId} onSignOut={() => setShowPaywall(false)} />
        </div>
      )}

      {/* Mon Coach section */}
      <CoachSection supabase={supabase} session={session} coachId={coachId} />

      {/* Payment history */}
      <PaymentHistory supabase={supabase} userId={session?.user?.id} />

      {/* Badges */}
      {(() => {
        const ALL_BADGES = [
          { type: 'first_workout', icon: '🔥', label: 'Premier pas', desc: '1ère séance complétée' },
          { type: 'week_streak', icon: '💪', label: 'Semaine complète', desc: '7 jours de streak' },
          { type: 'month_streak', icon: '🏆', label: "Mois d'acier", desc: '30 jours de streak' },
          { type: 'first_weight', icon: '📊', label: 'Première pesée', desc: '1er poids enregistré' },
          { type: 'plan_respected', icon: '🥗', label: 'Plan respecté', desc: '7 jours repas cochés' },
          { type: 'first_photo', icon: '📸', label: 'Avant/Après', desc: '1ère photo uploadée' },
          { type: 'lifetime', icon: '⭐', label: 'À vie', desc: 'Abonnement lifetime' },
        ]
        return (
          <>
          <div style={cardTitleAbove}>Mes badges</div>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18, marginBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {ALL_BADGES.map(b => {
                const earned = badges.includes(b.type)
                return (
                  <div key={b.type} style={{
                    background: BG_BASE,
                    border: earned ? `1px solid ${GOLD}` : `1px solid ${BORDER}`,
                    borderRadius: RADIUS_CARD,
                    padding: '12px 6px',
                    textAlign: 'center',
                    opacity: earned ? 1 : 0.3,
                    transition: 'opacity 0.3s ease',
                  }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{b.icon}</div>
                    <div style={{ ...labelStyle, fontSize: '0.72rem', color: earned ? GOLD : TEXT_MUTED, marginBottom: 2, cursor: 'default' }}>{b.label}</div>
                    <div style={{ ...mutedStyle, fontSize: '0.55rem', lineHeight: 1.3 }}>{b.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>
          </>
        )
      })()}

      {/* Sign out */}
      <button onClick={() => { cache.clearAll(); supabase.auth.signOut().then(() => { window.location.href = '/login' }) }} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'all 200ms', marginTop: 8 }}>
        <LogOut size={18} color={TEXT_MUTED} />
        <span style={{ ...labelStyle, fontSize: '1rem', color: TEXT_MUTED, cursor: 'inherit' }}>Déconnexion</span>
      </button>

      {/* Delete account */}
      <DeleteAccountSection session={session} />
    </div>
  )
}

/* Coach Section (multi-coach) */
// CoachSection, PaymentHistory, DeleteAccountSection extracted to ./profile/
