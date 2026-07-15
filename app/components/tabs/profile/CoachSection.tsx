'use client'
import { useState, useEffect } from 'react'
import { RailOverlay } from '../../ui/RailOverlay'
import { useTranslations } from 'next-intl'
import { Crown, UserMinus } from 'lucide-react'
import { BG_BASE, BG_CARD, BORDER, GOLD, GOLD_RULE, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../../../../lib/design-tokens'

export default function CoachSection({ supabase, session, coachId }: { supabase: any; session: any; coachId: string | null }) {
  const t = useTranslations('profile.coach')
  const [coachName, setCoachName] = useState<string | null>(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!coachId) return
    supabase.from('active_related_profiles').select('full_name').eq('id', coachId).single().then(({ data }: any) => {
      if (data?.full_name) setCoachName(data.full_name)
    })
  }, [coachId])

  async function leaveCoach() {
    if (!coachId || !session?.user?.id) return
    setLeaving(true)
    await fetch('/api/coach/disconnect', { method: 'POST' })
    setLeaving(false)
    window.location.reload()
  }

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18, marginTop: 12, marginBottom: 8 }}>
      <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>{t('title')}</div>
      {coachId ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Crown size={18} color={GOLD} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontFamily: FONT_BODY, fontWeight: 400, color: TEXT_PRIMARY }}>{coachName || 'Coach'}</div>
              <div style={{ fontSize: '0.7rem', color: TEXT_MUTED, fontFamily: FONT_BODY, fontWeight: 300 }}>{t('activeStatus')}</div>
            </div>
            <span style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: GREEN, background: `${GREEN}20`, borderRadius: RADIUS_CARD, padding: '4px 8px' }}>{t('active')}</span>
          </div>
          <button onClick={() => setShowLeaveModal(true)} style={{ width: '100%', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: TEXT_MUTED, fontSize: '0.78rem', fontFamily: FONT_ALT, fontWeight: 600 }}>
            <UserMinus size={14} /> {t('changeCoach')}
          </button>
        </>
      ) : (
        <div style={{ fontSize: '0.82rem', color: TEXT_MUTED, lineHeight: 1.5, fontFamily: FONT_BODY, fontWeight: 300 }}>
          {t('noCoach')}
        </div>
      )}
      {showLeaveModal && (<RailOverlay>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 24, maxWidth: 400, width: '100%' }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.2rem', fontWeight: 700, letterSpacing: '2px', color: TEXT_PRIMARY, margin: '0 0 12px' }}>{t('changeModal.title')}</h3>
            <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, lineHeight: 1.6, margin: '0 0 16px', fontFamily: FONT_BODY, fontWeight: 300 }}>{t('changeModal.description')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={leaveCoach} disabled={leaving} style={{ width: '100%', padding: '12px', background: 'rgba(239,68,68,0.1)', border: `1px solid ${RED}`, borderRadius: 12, color: RED, fontFamily: FONT_ALT, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>{leaving ? t('changeModal.leaving') : t('changeModal.leaveButton')}</button>
              <button onClick={() => setShowLeaveModal(false)} style={{ width: '100%', padding: '12px', background: 'transparent', border: `1px solid ${GOLD_RULE}`, borderRadius: 12, color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontSize: '0.85rem', cursor: 'pointer' }}>{t('changeModal.cancel')}</button>
            </div>
          </div>
        </div>
      </RailOverlay>)}
    </div>
  )
}
