'use client'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import {
  RADIUS_CARD, GOLD,
  GREEN, TEXT_PRIMARY, TEXT_MUTED,
  FONT_DISPLAY, FONT_BODY, colors,
} from '../../../../lib/design-tokens'
import SectionTitle from '../../ui/SectionTitle'
import WorkoutDetailList from '../../training/WorkoutDetailList'

interface PRRecord {
  exercise_name: string
  value: number
  previous_value: number | null
  unit: string
}

interface TrainingSessionDoneProps {
  todayKey: string
  coachProgram: any
  detail: { name: string; sets: any[] }[] | null
  detailLoading: boolean
  prs: PRRecord[] | null
  prsLoading: boolean
}

export default function TrainingSessionDone({ todayKey, coachProgram, detail, detailLoading, prs, prsLoading }: TrainingSessionDoneProps) {
  return (
    <div style={{ padding: '0 16px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
          style={{ width: 72, height: 72, borderRadius: '50%', background: `${GREEN}20`, border: `2px solid ${GREEN}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}
        >
          <CheckCircle2 size={36} color={GREEN} strokeWidth={1.5} />
        </motion.div>
        <p style={{ fontFamily: FONT_DISPLAY, fontSize: '1.6rem', fontWeight: 700, color: GOLD, margin: '0 0 6px', letterSpacing: '0.04em' }}>SÉANCE TERMINÉE ✓</p>
        <p style={{ fontFamily: FONT_BODY, fontSize: '0.85rem', color: TEXT_MUTED, margin: '0 0 28px' }}>Bravo ! Tu as complété la séance du jour.</p>
      </motion.div>

      {(prsLoading || (prs && prs.length > 0)) && (
        <>
          <SectionTitle title="RECORDS BATTUS" noPadding />
          {prsLoading ? (
            <div style={{ textAlign: 'center', padding: 24, color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 13 }}>Chargement…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {prs!.map((pr, i) => (
                <div key={i} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 3, height: 14, background: GOLD, borderRadius: 2, flexShrink: 0 }} />
                    <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.exercise_name}</span>
                  </div>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY, flexShrink: 0, marginLeft: 10 }}>
                    {pr.previous_value != null
                      ? `${pr.previous_value} → ${pr.value} ${pr.unit}`
                      : `${pr.value} ${pr.unit} · Nouveau record`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {(detailLoading || (detail && detail.length > 0)) && (
        <>
          <SectionTitle title="TA SÉANCE" noPadding />
          <WorkoutDetailList detail={detail ?? []} loading={detailLoading} />
        </>
      )}
    </div>
  )
}
