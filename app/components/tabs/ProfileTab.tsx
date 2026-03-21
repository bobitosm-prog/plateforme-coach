'use client'
import React, { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { LogOut, Zap, ChevronRight, Crown, Bell, BellOff } from 'lucide-react'
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
  goalWeight: number
  calorieGoal: number
  coachProgram: any
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
  setModal,
  fetchAll,
}: ProfileTabProps) {
  const [phoneForm, setPhoneForm] = useState<string>(profile?.phone || '')
  const [phoneEditing, setPhoneEditing] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle')

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
    console.log('[push] permission:', permission)
    if (permission !== 'granted') { setNotifStatus('denied'); return }

    const reg = await navigator.serviceWorker.ready
    console.log('[push] service worker ready:', reg)

    const existing = await reg.pushManager.getSubscription()
    console.log('[push] existing subscription:', existing)

    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    })
    console.log('[push] subscription:', sub.toJSON())

    const { data, error } = await supabasePush.from('push_subscriptions').upsert(
      { user_id: session.user.id, subscription: sub.toJSON() },
      { onConflict: 'user_id' }
    )
    console.log('[push] supabase upsert data:', data, 'error:', error)

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

      {/* Sign out */}
      <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', background: 'transparent', border: `1px solid #EF4444`, borderRadius: 14, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'all 200ms' }}>
        <LogOut size={18} color="#EF4444" />
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#EF4444' }}>Déconnexion</span>
      </button>
    </div>
  )
}
