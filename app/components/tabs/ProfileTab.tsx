'use client'
import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { LogOut, Zap, ChevronRight, Crown, Bell, BellOff, Trash2, UserMinus, Download, X } from 'lucide-react'
import Paywall from '../Paywall'
import { cache } from '../../../lib/cache'
import {
  BG_BASE, BG_CARD, BORDER, ORANGE, GREEN, TEXT_PRIMARY, TEXT_MUTED,
} from '../../../lib/design-tokens'

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
}: ProfileTabProps) {
  const [phoneForm, setPhoneForm] = useState<string>(profile?.phone || '')
  const [phoneEditing, setPhoneEditing] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle')
  const [showPaywall, setShowPaywall] = useState(false)
  const [badges, setBadges] = useState<string[]>([])

  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('user_badges').select('badge_type').eq('user_id', session.user.id)
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
      <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: '0 0 24px' }}>PROFIL</h1>

      {/* Avatar + name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 12 }}>
        <button onClick={() => avatarRef.current?.click()} style={{ width: 80, height: 80, borderRadius: '50%', background: displayAvatar ? 'transparent' : ORANGE, border: `2px solid ${BORDER}`, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, position: 'relative' }}>
          {displayAvatar
            ? <img src={displayAvatar} style={{ width: 80, height: 80, objectFit: 'cover' }} alt="" />
            : <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '2rem', color: '#fff' }}>{firstName.charAt(0).toUpperCase()}</span>
          }
        </button>
        <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: TEXT_PRIMARY }}>{fullName}</div>
          <div style={{ fontSize: '0.8rem', color: TEXT_MUTED }}>{session.user.email}</div>
        </div>
      </div>

      {/* Stats row — weight read-only */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
        {[
          { label: 'Poids', value: currentWeight ? `${currentWeight}kg` : '—', color: ORANGE },
          { label: 'Objectif', value: goalWeight ? `${goalWeight}kg` : '—', color: TEXT_MUTED },
          { label: 'Kcal/j', value: calorieGoal ? `${calorieGoal}` : '—', color: TEXT_MUTED },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '0.62rem', color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Phone field */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px', marginBottom: 8 }}>
        <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>Téléphone</div>
        {phoneEditing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="tel"
              value={phoneForm}
              onChange={e => setPhoneForm(e.target.value)}
              placeholder="+33 6 00 00 00 00"
              style={{ flex: 1, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }}
            />
            <button onClick={savePhone} style={{ background: GREEN, border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>OK</button>
            <button onClick={() => { setPhoneEditing(false); setPhoneForm(profile?.phone || '') }} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px', color: TEXT_MUTED, fontSize: '0.8rem', cursor: 'pointer' }}>✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: profile?.phone ? TEXT_PRIMARY : TEXT_MUTED }}>{profile?.phone || 'Ajouter un numéro'}</span>
            <button onClick={() => setPhoneEditing(true)} style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '4px 10px', color: TEXT_MUTED, fontSize: '0.72rem', cursor: 'pointer' }}>Modifier</button>
          </div>
        )}
      </div>

      {/* BMR calculator */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setModal('bmr')} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Zap size={18} color={TEXT_MUTED} />
            <span style={{ fontSize: '0.9rem', color: TEXT_PRIMARY }}>Calculateur BMR</span>
          </div>
          <ChevronRight size={16} color={TEXT_MUTED} />
        </button>
      </div>

      {/* Coach section */}
      {coachProgram && (
        <div style={{ background: BG_CARD, border: `1px solid ${ORANGE}30`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Crown size={18} color={ORANGE} />
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, color: TEXT_PRIMARY }}>Mon coach</div>
              <div style={{ fontSize: '0.72rem', color: TEXT_MUTED }}>Programme actif</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, color: GREEN, background: `${GREEN}20`, borderRadius: 8, padding: '4px 8px' }}>Actif</span>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        <button
          onClick={enableNotifications}
          disabled={notifStatus === 'loading' || notifStatus === 'done'}
          style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: notifStatus === 'done' ? 'default' : 'pointer', opacity: notifStatus === 'loading' ? 0.6 : 1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {notifStatus === 'denied' ? <BellOff size={18} color="#EF4444" /> : <Bell size={18} color={notifStatus === 'done' ? GREEN : TEXT_MUTED} />}
            <span style={{ fontSize: '0.9rem', color: notifStatus === 'denied' ? '#EF4444' : TEXT_PRIMARY }}>
              {notifStatus === 'done' ? 'Notifications activées' : notifStatus === 'denied' ? 'Notifications refusées' : 'Activer les notifications'}
            </span>
          </div>
          {notifStatus === 'done' && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: GREEN, background: `${GREEN}20`, borderRadius: 8, padding: '4px 8px' }}>Actif</span>}
          {notifStatus === 'idle' && <ChevronRight size={16} color={TEXT_MUTED} />}
        </button>
      </div>

      {/* Subscription */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 12 }}>Mon abonnement</div>
        {(() => {
          const st = profile?.subscription_status
          const subType = profile?.subscription_type
          const days = profile?.subscription_end_date ? Math.max(0, Math.ceil((new Date(profile.subscription_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0
          const endDate = profile?.subscription_end_date ? new Date(profile.subscription_end_date).toLocaleDateString('fr-FR') : ''

          // Lifetime
          if (st === 'lifetime') return (
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 10, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C', fontSize: '0.78rem', fontWeight: 700, marginBottom: 12 }}>Accès à vie ✦</span>
              <p style={{ fontSize: '0.85rem', color: TEXT_PRIMARY, margin: 0, lineHeight: 1.6 }}>Tu bénéficies d&apos;un accès permanent à toutes les fonctionnalités MoovX.</p>
            </div>
          )

          // Invited (via coach)
          if (st === 'invited' || subType === 'invited') return (
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 10, background: `${GREEN}15`, border: `1px solid ${GREEN}30`, color: GREEN, fontSize: '0.78rem', fontWeight: 700, marginBottom: 12 }}>Accès Coach</span>
              <p style={{ fontSize: '0.85rem', color: TEXT_PRIMARY, margin: 0, lineHeight: 1.6 }}>Ton accès est inclus via ton coach.</p>
            </div>
          )

          // Active subscription
          if (st === 'active') {
            const planLabel = subType === 'client_yearly' ? 'Plan Annuel — CHF 80/an'
              : subType === 'coach_monthly' ? 'Coach Pro — CHF 50/mois'
              : 'Plan Mensuel — CHF 10/mois'
            return (
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 10, background: `${GREEN}15`, border: `1px solid ${GREEN}30`, color: GREEN, fontSize: '0.78rem', fontWeight: 700, marginBottom: 12 }}>{planLabel}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 800, color: '#C9A84C' }}>{days}</span>
                  <span style={{ fontSize: '0.82rem', color: TEXT_MUTED }}>jours restants</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: TEXT_MUTED, marginBottom: days <= 5 ? 4 : 0 }}>Renouvellement le {endDate}</div>
                {days <= 5 && <div style={{ fontSize: '0.78rem', color: '#F59E0B', marginTop: 6, fontWeight: 600 }}>Ton abonnement expire bientôt</div>}
              </div>
            )
          }

          // No subscription
          return (
            <div>
              <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, margin: '0 0 14px', lineHeight: 1.5 }}>Abonne-toi pour accéder à toutes les fonctionnalités.</p>
              <button onClick={() => setShowPaywall(true)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #C9A84C, #D4AF37)', border: 'none', borderRadius: 12, color: '#000', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
                S&apos;abonner — Dès CHF 10/mois
              </button>
            </div>
          )
        })()}
      </div>

      {/* ── Paywall modal ── */}
      {showPaywall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 1000, overflowY: 'auto' }}>
          <button onClick={() => setShowPaywall(false)} style={{ position: 'fixed', top: 16, right: 16, zIndex: 1001, width: 36, height: 36, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#6B7280" />
          </button>
          <Paywall role="client" userId={session?.user?.id} coachId={coachId} onSignOut={() => setShowPaywall(false)} />
        </div>
      )}

      {/* ── Mon Coach section ── */}
      <CoachSection supabase={supabase} session={session} coachId={coachId} />

      {/* ── Payment history ── */}
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
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, marginBottom: 8 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 12 }}>Mes badges</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {ALL_BADGES.map(b => {
                const earned = badges.includes(b.type)
                return (
                  <div key={b.type} style={{
                    background: BG_BASE,
                    border: earned ? '1px solid #C9A84C' : `1px solid ${BORDER}`,
                    borderRadius: 12,
                    padding: '12px 6px',
                    textAlign: 'center',
                    opacity: earned ? 1 : 0.3,
                    transition: 'opacity 0.3s ease',
                  }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{b.icon}</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: earned ? '#C9A84C' : TEXT_MUTED, marginBottom: 2 }}>{b.label}</div>
                    <div style={{ fontSize: '0.55rem', color: TEXT_MUTED, lineHeight: 1.3 }}>{b.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Sign out */}
      <button onClick={() => { cache.clearAll(); supabase.auth.signOut().then(() => { window.location.href = '/landing' }) }} style={{ width: '100%', background: 'transparent', border: `1px solid #EF4444`, borderRadius: 14, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'all 200ms', marginTop: 8 }}>
        <LogOut size={18} color="#EF4444" />
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#EF4444' }}>Déconnexion</span>
      </button>

      {/* ── Delete account ── */}
      <DeleteAccountSection session={session} />
    </div>
  )
}

/* ── Coach Section (multi-coach) ── */
function CoachSection({ supabase, session, coachId }: { supabase: any; session: any; coachId: string | null }) {
  const [coachName, setCoachName] = useState<string | null>(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!coachId) return
    supabase.from('profiles').select('full_name').eq('id', coachId).single().then(({ data }: any) => {
      if (data?.full_name) setCoachName(data.full_name)
    })
  }, [coachId])

  async function leaveCoach() {
    if (!coachId || !session?.user?.id) return
    setLeaving(true)
    await supabase.from('coach_clients').delete().eq('client_id', session.user.id).eq('coach_id', coachId)
    setLeaving(false)
    window.location.reload()
  }

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, marginTop: 12, marginBottom: 8 }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 12 }}>Mon coach</div>
      {coachId ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Crown size={18} color={ORANGE} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT_PRIMARY }}>{coachName || 'Coach'}</div>
              <div style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>Coach actif</div>
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: GREEN, background: `${GREEN}20`, borderRadius: 8, padding: '4px 8px' }}>Actif</span>
          </div>
          <button onClick={() => setShowLeaveModal(true)} style={{ width: '100%', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: TEXT_MUTED, fontSize: '0.78rem', fontWeight: 600 }}>
            <UserMinus size={14} /> Changer de coach
          </button>
        </>
      ) : (
        <div style={{ fontSize: '0.82rem', color: TEXT_MUTED, lineHeight: 1.5 }}>
          Aucun coach lié. Rejoins un coach via son lien d&apos;invitation.
        </div>
      )}

      {/* Leave coach modal */}
      {showLeaveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, maxWidth: 400, width: '100%' }}>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 12px' }}>Changer de coach</h3>
            <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, lineHeight: 1.6, margin: '0 0 8px' }}>
              Pour changer de coach, tu as besoin d&apos;un nouveau lien d&apos;invitation. Contacte ton nouveau coach pour qu&apos;il te partage son lien.
            </p>
            <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, lineHeight: 1.6, margin: '0 0 16px' }}>
              Ton historique (poids, séances, mensurations) sera conservé.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={leaveCoach} disabled={leaving} style={{ width: '100%', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#EF4444', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                {leaving ? 'En cours...' : 'Quitter mon coach actuel'}
              </button>
              <button onClick={() => setShowLeaveModal(false)} style={{ width: '100%', padding: '12px', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT_MUTED, fontSize: '0.85rem', cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Payment History ── */
function PaymentHistory({ supabase, userId }: { supabase: any; userId: string }) {
  const [payments, setPayments] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from('payments').select('*').eq('client_id', userId).order('paid_at', { ascending: false }).limit(20)
      .then(({ data }: any) => { setPayments(data || []); setLoaded(true) })
  }, [userId])

  if (!loaded) return null

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, marginBottom: 8 }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 12 }}>Historique des paiements</div>
      {payments.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, margin: 0 }}>Aucun paiement enregistré</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {payments.map((p: any) => {
            const statusColor = p.status === 'paid' ? GREEN : p.status === 'refunded' ? '#F59E0B' : '#EF4444'
            const statusLabel = p.status === 'paid' ? 'Payé' : p.status === 'refunded' ? 'Remboursé' : 'Échoué'
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: BG_BASE, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div>
                  <div style={{ fontSize: '0.82rem', color: TEXT_PRIMARY, fontWeight: 600 }}>CHF {p.amount || 30}</div>
                  <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, marginTop: 2 }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('fr-FR') : '—'}</div>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: statusColor, background: `${statusColor}20`, borderRadius: 8, padding: '4px 8px' }}>{statusLabel}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Delete Account ── */
function DeleteAccountSection({ session }: { session: any }) {
  const [showModal, setShowModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function deleteAccount() {
    if (confirmText !== 'SUPPRIMER') return
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      })
      if (res.ok) {
        window.location.href = '/landing'
      } else {
        const { error } = await res.json()
        alert(`Erreur : ${error || 'Échec de la suppression'}`)
        setDeleting(false)
      }
    } catch {
      alert('Erreur réseau')
      setDeleting(false)
    }
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', marginTop: 24 }}>
        <Trash2 size={16} color="#EF4444" />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#EF4444' }}>Supprimer mon compte</span>
      </button>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: BG_CARD, border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 24, maxWidth: 400, width: '100%' }}>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#EF4444', margin: '0 0 12px' }}>Supprimer mon compte</h3>
            <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, lineHeight: 1.6, margin: '0 0 16px' }}>
              Es-tu sûr de vouloir supprimer ton compte ? Toutes tes données seront supprimées définitivement. Cette action est irréversible.
            </p>
            <p style={{ fontSize: '0.78rem', color: TEXT_MUTED, margin: '0 0 8px' }}>Tape <strong style={{ color: '#EF4444' }}>SUPPRIMER</strong> pour confirmer :</p>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="SUPPRIMER" style={{ width: '100%', background: BG_BASE, border: `1px solid ${confirmText === 'SUPPRIMER' ? '#EF4444' : BORDER}`, borderRadius: 10, padding: '10px 14px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowModal(false); setConfirmText('') }} style={{ flex: 1, padding: '12px', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT_MUTED, fontSize: '0.85rem', cursor: 'pointer' }}>Annuler</button>
              <button onClick={deleteAccount} disabled={confirmText !== 'SUPPRIMER' || deleting} style={{ flex: 1, padding: '12px', background: confirmText === 'SUPPRIMER' ? '#EF4444' : '#333', borderRadius: 12, border: 'none', color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: confirmText === 'SUPPRIMER' ? 'pointer' : 'default', opacity: confirmText === 'SUPPRIMER' ? 1 : 0.5 }}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
