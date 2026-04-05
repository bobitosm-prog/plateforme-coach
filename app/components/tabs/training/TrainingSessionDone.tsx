'use client'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import {
  BG_CARD, BG_BASE, BORDER, RADIUS_CARD, GOLD, GOLD_DIM,
  GREEN, TEXT_PRIMARY, TEXT_MUTED, WEEK_DAYS,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../../lib/design-tokens'

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
        style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}
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
        {(() => {
          const currentIdx = WEEK_DAYS.indexOf(todayKey)
          let nextDay: string | null = null
          for (let i = 1; i <= 7; i++) {
            const nd = WEEK_DAYS[(currentIdx + i) % 7]
            const dd = coachProgram?.[nd] ?? { repos: false, exercises: [] }
            if (!dd.repos && (dd.exercises?.length || 0) > 0) { nextDay = nd; break }
          }
          return nextDay ? (
            <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: FONT_ALT, fontSize: '0.62rem', color: TEXT_MUTED, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 3 }}>Prochaine séance</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', fontWeight: 700, color: TEXT_PRIMARY, textTransform: 'capitalize' }}>{nextDay}</div>
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: '0.75rem', fontWeight: 700, color: GOLD, background: GOLD_DIM, borderRadius: 12, padding: '4px 10px' }}>
                {(coachProgram?.[nextDay]?.exercises || []).length} exercices
              </div>
            </div>
          ) : null
        })()}
      </motion.div>
    </div>
  )
}
