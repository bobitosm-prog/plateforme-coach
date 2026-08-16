'use client'
import { useState, useEffect } from 'react'
import ConfirmDialog from '../../ui/ConfirmDialog'
import { useTranslations } from 'next-intl'
import { Crown, UserMinus } from 'lucide-react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { BG_CARD, BORDER, GOLD, GREEN, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD, FONT_ALT, FONT_BODY } from '../../../../lib/design-tokens'

export default function CoachSection({ supabase, session, coachId }: { supabase: SupabaseClient; session: Session; coachId: string | null }) {
  const t = useTranslations('profile.coach')
  const [coachName, setCoachName] = useState<string | null>(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!coachId) return
    supabase.from('active_related_profiles').select('full_name').eq('id', coachId).single().then(({ data }) => {
      if (data?.full_name) setCoachName(data.full_name)
    })
  }, [coachId, supabase])

  async function leaveCoach() {
    if (!coachId || !session?.user?.id) return
    setLeaving(true)
    let requestCompleted = false
    try {
      await fetch('/api/coach/disconnect', { method: 'POST' })
      requestCompleted = true
    } finally {
      setLeaving(false)
    }
    if (requestCompleted) window.location.reload()
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
      <ConfirmDialog
        open={showLeaveModal}
        title={t('changeModal.title')}
        message={t('changeModal.description')}
        confirmLabel={leaving ? t('changeModal.leaving') : t('changeModal.leaveButton')}
        cancelLabel={t('changeModal.cancel')}
        confirmDisabled={leaving}
        variant="danger"
        onConfirm={leaveCoach}
        onCancel={() => setShowLeaveModal(false)}
      />
    </div>
  )
}
