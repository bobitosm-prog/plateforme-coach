'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Users, LogOut, Trash2, Save } from 'lucide-react'

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
      <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.8rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.04em', margin: '0 0 24px' }}>Mon profil</h1>
      <div style={{ background: '#141414', border: '1px solid #242424', borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div className="avatar-circle" style={{ width: 72, height: 72, fontSize: '1.5rem', background: 'linear-gradient(135deg, #C9A84C, #D4AF37)', color: '#000' }}>{coachInitials}</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC' }}>{coachName}</div>
        <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>{session.user.email}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="badge badge-active">Coach</span>
          {coachProfile?.stripe_account_id ? <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>Stripe connecté</span> : <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, background: 'rgba(249,115,22,0.12)', color: '#F97316', border: '1px solid rgba(249,115,22,0.2)' }}>Stripe manquant</span>}
        </div>
      </div>

      {coachProfile && (
        <div style={{ background: '#141414', border: '1px solid #242424', borderRadius: 16, padding: 18, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {coachProfile.coach_bio && <div><div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bio</div><div style={{ fontSize: '0.85rem', color: '#F8FAFC', marginTop: 4 }}>{coachProfile.coach_bio}</div></div>}
          {coachProfile.coach_speciality?.length > 0 && (
            <div><div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Spécialités</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {coachProfile.coach_speciality.map((s: string) => <span key={s} style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>{s}</span>)}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {coachProfile.coach_experience_years != null && <div><div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Expérience</div><div style={{ fontSize: '0.95rem', color: '#F8FAFC', fontWeight: 600, marginTop: 2 }}>{coachProfile.coach_experience_years} ans</div></div>}
            <div><div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Clients</div><div style={{ fontSize: '0.95rem', color: '#F8FAFC', fontWeight: 600, marginTop: 2 }}>{coachProfile.coach_max_clients || '--'}</div></div>
          </div>
        </div>
      )}

      {/* Tarif section */}
      <div style={{ background: '#141414', border: '1px solid #242424', borderRadius: 16, padding: 18, marginTop: 12 }}>
        <div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Mon tarif client</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input type="number" inputMode="decimal" value={rate} onChange={e => { setRate(e.target.value); setRateSaved(false) }}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 50px 10px 14px', color: '#F8FAFC', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontSize: '0.85rem', pointerEvents: 'none' }}>CHF</span>
          </div>
          <button onClick={saveRate} disabled={rateSaving}
            style={{ padding: '10px 16px', background: rateSaved ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #C9A84C, #D4AF37)', border: rateSaved ? '1px solid rgba(34,197,94,0.3)' : 'none', borderRadius: 10, color: rateSaved ? '#22C55E' : '#000', fontWeight: 700, fontSize: '0.82rem', cursor: rateSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
            {rateSaved ? '✓ Sauvé' : rateSaving ? '...' : <><Save size={14} /> Sauver</>}
          </button>
        </div>
        <p style={{ fontSize: '0.7rem', color: '#555', margin: '8px 0 0', fontStyle: 'italic' }}>Ce montant sera facturé mensuellement à tes clients. MoovX prélève 10% de commission.</p>
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn-secondary" onClick={() => setSection('dashboard')}>
          <Users size={16} /> Tableau de bord
        </button>
        <button onClick={supabaseSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '11px 20px', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
          <LogOut size={16} /> Se déconnecter
        </button>
      </div>

      {/* Delete account */}
      <button onClick={() => setShowDelete(true)} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', marginTop: 32 }}>
        <Trash2 size={14} color="#EF4444" />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#EF4444' }}>Supprimer mon compte</span>
      </button>

      {showDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1A1A1A', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 24, maxWidth: 'min(400px, calc(100vw - 32px))', width: '100%' }}>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#EF4444', margin: '0 0 12px' }}>Supprimer mon compte</h3>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.6, margin: '0 0 16px' }}>
              Es-tu sûr de vouloir supprimer ton compte ? Toutes tes données seront supprimées définitivement. Cette action est irréversible.
            </p>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 8px' }}>Tape <strong style={{ color: '#EF4444' }}>SUPPRIMER</strong> pour confirmer :</p>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="SUPPRIMER" style={{ width: '100%', background: '#111', border: `1px solid ${confirmText === 'SUPPRIMER' ? '#EF4444' : '#2A2A2A'}`, borderRadius: 10, padding: '10px 14px', color: '#F8FAFC', fontSize: '0.9rem', outline: 'none', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowDelete(false); setConfirmText('') }} style={{ flex: 1, padding: '12px', background: '#111', border: '1px solid #2A2A2A', borderRadius: 12, color: '#6B7280', fontSize: '0.85rem', cursor: 'pointer' }}>Annuler</button>
              <button onClick={deleteAccount} disabled={confirmText !== 'SUPPRIMER' || deleting} style={{ flex: 1, padding: '12px', background: confirmText === 'SUPPRIMER' ? '#EF4444' : '#333', borderRadius: 12, border: 'none', color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: confirmText === 'SUPPRIMER' ? 'pointer' : 'default', opacity: confirmText === 'SUPPRIMER' ? 1 : 0.5 }}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
