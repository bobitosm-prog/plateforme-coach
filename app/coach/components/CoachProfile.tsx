'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Users, LogOut, Trash2, Save } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'

const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

interface CoachProfileProps {
  coachName: string
  coachInitials: string
  session: any
  coachProfile: any
  setSection: (s: 'dashboard' | 'messages' | 'calendar' | 'aliments' | 'profil') => void
  supabaseSignOut: () => void
}

export default function CoachProfile({
  coachName, coachInitials, session, coachProfile,
  setSection, supabaseSignOut,
}: CoachProfileProps) {
  const [showDelete, setShowDelete] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [rate, setRate] = useState(String(coachProfile?.coach_monthly_rate || 50))
  const [rateSaving, setRateSaving] = useState(false)
  const [rateSaved, setRateSaved] = useState(false)

  async function saveRate() {
    const val = parseFloat(rate)
    if (isNaN(val) || val < 1) return
    setRateSaving(true)
    await supabase.from('profiles').update({ coach_monthly_rate: val }).eq('id', session.user.id)
    setRateSaving(false)
    setRateSaved(true)
    setTimeout(() => setRateSaved(false), 2000)
  }

  async function deleteAccount() {
    if (confirmText !== 'SUPPRIMER') return
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: session.user.id }) })
      if (res.ok) { window.location.href = '/landing' } else { const { error } = await res.json(); alert(`Erreur : ${error || 'Échec'}`); setDeleting(false) }
    } catch { alert('Erreur réseau'); setDeleting(false) }
  }

  return (
    <div className="section-pad" style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 16px' }}>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '2.2rem', fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '3px', margin: '0 0 24px', textTransform: 'uppercase' }}>Mon profil</h1>
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div className="avatar-circle" style={{ width: 72, height: 72, fontSize: '1.5rem', background: GOLD, color: BG_BASE }}>{coachInitials}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.5rem', fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '2px' }}>{coachName}</div>
        <div style={{ fontSize: '0.82rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>{session.user.email}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="badge badge-active">Coach</span>
          {coachProfile?.stripe_account_id ? <span style={{ padding: '3px 9px', borderRadius: 2, fontSize: '0.65rem', fontWeight: 700, fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' as const, background: `rgba(74,222,128,0.12)`, color: GREEN, border: `1px solid rgba(74,222,128,0.2)` }}>Stripe connecté</span> : <span style={{ padding: '3px 9px', borderRadius: 2, fontSize: '0.65rem', fontWeight: 700, fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' as const, background: GOLD_DIM, color: GOLD, border: `1px solid ${GOLD_RULE}` }}>Stripe manquant</span>}
        </div>
      </div>

      {coachProfile && (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {coachProfile.coach_bio && <div><div style={{ fontFamily: FONT_ALT, fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Bio</div><div style={{ fontSize: '0.85rem', color: TEXT_PRIMARY, fontFamily: FONT_BODY, marginTop: 4 }}>{coachProfile.coach_bio}</div></div>}
          {coachProfile.coach_speciality?.length > 0 && (
            <div><div style={{ fontFamily: FONT_ALT, fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Spécialités</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {coachProfile.coach_speciality.map((s: string) => <span key={s} style={{ padding: '3px 10px', borderRadius: 2, fontFamily: FONT_ALT, fontSize: '0.68rem', fontWeight: 700, background: GOLD_DIM, color: GOLD, border: `1px solid ${GOLD_RULE}`, letterSpacing: '1px', textTransform: 'uppercase' as const }}>{s}</span>)}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {coachProfile.coach_experience_years != null && <div><div style={{ fontFamily: FONT_ALT, fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Expérience</div><div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.2rem', color: TEXT_PRIMARY, fontWeight: 600, marginTop: 2 }}>{coachProfile.coach_experience_years} ans</div></div>}
            <div><div style={{ fontFamily: FONT_ALT, fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Clients</div><div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.2rem', color: TEXT_PRIMARY, fontWeight: 600, marginTop: 2 }}>{coachProfile.coach_max_clients || '--'}</div></div>
          </div>
        </div>
      )}

      {/* Tarif section */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18, marginTop: 12 }}>
        <div style={{ fontFamily: FONT_ALT, fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>Mon tarif client</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input type="number" inputMode="decimal" value={rate} onChange={e => { setRate(e.target.value); setRateSaved(false) }}
              style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 50px 10px 14px', color: TEXT_PRIMARY, fontSize: '1rem', fontFamily: FONT_BODY, outline: 'none' }} />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, fontSize: '0.85rem', pointerEvents: 'none' }}>CHF</span>
          </div>
          <button onClick={saveRate} disabled={rateSaving}
            style={{ padding: '10px 16px', background: rateSaved ? `rgba(74,222,128,0.15)` : GOLD, border: rateSaved ? `1px solid rgba(74,222,128,0.3)` : 'none', borderRadius: 12, color: rateSaved ? GREEN : BG_BASE, fontWeight: 700, fontSize: '0.82rem', cursor: rateSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT_ALT, whiteSpace: 'nowrap', letterSpacing: '1px', textTransform: 'uppercase' as const,  }}>
            {rateSaved ? '✓ Sauvé' : rateSaving ? '...' : <><Save size={14} /> Sauver</>}
          </button>
        </div>
        <p style={{ fontSize: '0.7rem', color: TEXT_DIM, margin: '8px 0 0', fontStyle: 'italic', fontFamily: FONT_BODY }}>Ce montant sera facturé mensuellement à tes clients. MoovX prélève 3% de commission.</p>
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn-secondary" onClick={() => setSection('dashboard')}>
          <Users size={16} /> Tableau de bord
        </button>
        <button onClick={supabaseSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', color: RED, border: `1px solid rgba(239,68,68,0.3)`, padding: '11px 20px', borderRadius: 12, fontFamily: FONT_ALT, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', width: '100%', letterSpacing: '1px', textTransform: 'uppercase' as const }}>
          <LogOut size={16} /> Se déconnecter
        </button>
      </div>

      {/* Delete account */}
      <button onClick={() => setShowDelete(true)} style={{ width: '100%', background: 'transparent', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 12, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', marginTop: 32 }}>
        <Trash2 size={14} color={RED} />
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: RED, fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' as const }}>Supprimer mon compte</span>
      </button>

      {showDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: BG_CARD, border: `1px solid rgba(239,68,68,0.3)`, borderRadius: RADIUS_CARD, padding: 24, maxWidth: 'min(400px, calc(100vw - 32px))', width: '100%' }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, color: RED, margin: '0 0 12px', letterSpacing: '2px', textTransform: 'uppercase' }}>Supprimer mon compte</h3>
            <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, lineHeight: 1.6, margin: '0 0 16px', fontFamily: FONT_BODY }}>
              Es-tu sûr de vouloir supprimer ton compte ? Toutes tes données seront supprimées définitivement. Cette action est irréversible.
            </p>
            <p style={{ fontSize: '0.78rem', color: TEXT_MUTED, margin: '0 0 8px', fontFamily: FONT_BODY }}>Tape <strong style={{ color: RED }}>SUPPRIMER</strong> pour confirmer :</p>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="SUPPRIMER" style={{ width: '100%', background: BG_BASE, border: `1px solid ${confirmText === 'SUPPRIMER' ? RED : BORDER}`, borderRadius: 12, padding: '10px 14px', color: TEXT_PRIMARY, fontSize: '0.9rem', fontFamily: FONT_BODY, outline: 'none', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowDelete(false); setConfirmText('') }} style={{ flex: 1, padding: '12px', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT_MUTED, fontSize: '0.85rem', fontFamily: FONT_BODY, cursor: 'pointer' }}>Annuler</button>
              <button onClick={deleteAccount} disabled={confirmText !== 'SUPPRIMER' || deleting} style={{ flex: 1, padding: '12px', background: confirmText === 'SUPPRIMER' ? RED : BORDER, borderRadius: 12, border: 'none', color: '#fff', fontFamily: FONT_ALT, fontSize: '0.9rem', fontWeight: 700, cursor: confirmText === 'SUPPRIMER' ? 'pointer' : 'default', opacity: confirmText === 'SUPPRIMER' ? 1 : 0.5, letterSpacing: '1px', textTransform: 'uppercase' as const }}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
