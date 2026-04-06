'use client'
import { useState, useEffect } from 'react'
import { Crown, UserMinus } from 'lucide-react'
import { BG_BASE, BG_CARD, BORDER, GOLD, GOLD_RULE, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../../../../lib/design-tokens'

export default function CoachSection({ supabase, session, coachId }: { supabase: any; session: any; coachId: string | null }) {
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
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18, marginTop: 12, marginBottom: 8 }}>
      <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>Mon coach</div>
      {coachId ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Crown size={18} color={GOLD} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontFamily: FONT_BODY, fontWeight: 400, color: TEXT_PRIMARY }}>{coachName || 'Coach'}</div>
              <div style={{ fontSize: '0.7rem', color: TEXT_MUTED, fontFamily: FONT_BODY, fontWeight: 300 }}>Coach actif</div>
            </div>
            <span style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: GREEN, background: `${GREEN}20`, borderRadius: RADIUS_CARD, padding: '4px 8px' }}>Actif</span>
          </div>
          <button onClick={() => setShowLeaveModal(true)} style={{ width: '100%', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: TEXT_MUTED, fontSize: '0.78rem', fontFamily: FONT_ALT, fontWeight: 600 }}>
            <UserMinus size={14} /> Changer de coach
          </button>
        </>
      ) : (
        <div style={{ fontSize: '0.82rem', color: TEXT_MUTED, lineHeight: 1.5, fontFamily: FONT_BODY, fontWeight: 300 }}>
          Aucun coach lie. Rejoins un coach via son lien d&apos;invitation.
        </div>
      )}
      {showLeaveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 24, maxWidth: 400, width: '100%' }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.2rem', fontWeight: 700, letterSpacing: '2px', color: TEXT_PRIMARY, margin: '0 0 12px' }}>CHANGER DE COACH</h3>
            <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, lineHeight: 1.6, margin: '0 0 16px', fontFamily: FONT_BODY, fontWeight: 300 }}>Pour changer de coach, contacte ton nouveau coach pour qu&apos;il te partage son lien d&apos;invitation. Ton historique sera conserve.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={leaveCoach} disabled={leaving} style={{ width: '100%', padding: '12px', background: 'rgba(239,68,68,0.1)', border: `1px solid ${RED}`, borderRadius: 12, color: RED, fontFamily: FONT_ALT, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>{leaving ? 'En cours...' : 'Quitter mon coach actuel'}</button>
              <button onClick={() => setShowLeaveModal(false)} style={{ width: '100%', padding: '12px', background: 'transparent', border: `1px solid ${GOLD_RULE}`, borderRadius: 12, color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontSize: '0.85rem', cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
