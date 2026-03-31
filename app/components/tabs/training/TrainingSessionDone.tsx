'use client'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { BG_CARD, BG_BASE, BORDER, RADIUS_CARD, WEEK_DAYS } from '../../../../lib/design-tokens'

const GREEN = '#22C55E'
const ORANGE = '#F97316'
const TEXT_PRIMARY = '#F5F5F5'
const TEXT_MUTED   = '#6B7280'

interface TrainingSessionDoneProps {
  todayKey: string
  coachProgram: any
}

export default function TrainingSessionDone({ todayKey, coachProgram }: TrainingSessionDoneProps) {
  return (
    <div style={{ padding: '0 16px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ background: BG_CARD, border: `1px solid ${GREEN}40`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
          style={{ width: 72, height: 72, borderRadius: '50%', background: `${GREEN}20`, border: `2px solid ${GREEN}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}
        >
          <CheckCircle2 size={36} color={GREEN} strokeWidth={1.5} />
        </motion.div>
        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, color: GREEN, margin: '0 0 6px', letterSpacing: '0.04em' }}>SÉANCE TERMINÉE ✓</p>
        <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: '0 0 28px' }}>Bravo ! Tu as complété la séance du jour.</p>
        {(() => {
          const currentIdx = WEEK_DAYS.indexOf(todayKey)
          let nextDay: string | null = null
          for (let i = 1; i <= 7; i++) {
            const nd = WEEK_DAYS[(currentIdx + i) % 7]
            const dd = coachProgram?.[nd] ?? { repos: false, exercises: [] }
            if (!dd.repos && (dd.exercises?.length || 0) > 0) { nextDay = nd; break }
          }
          return nextDay ? (
            <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.62rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Prochaine séance</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color: TEXT_PRIMARY, textTransform: 'capitalize' }}>{nextDay}</div>
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: ORANGE, background: `${ORANGE}18`, borderRadius: 8, padding: '4px 10px' }}>
                {(coachProgram?.[nextDay]?.exercises || []).length} exercices
              </div>
            </div>
          ) : null
        })()}
      </motion.div>
    </div>
  )
}
