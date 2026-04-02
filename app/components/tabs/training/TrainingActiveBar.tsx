'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Timer, Check } from 'lucide-react'
import {
  BG_CARD, BORDER, GOLD, GREEN, TEXT_PRIMARY, TEXT_MUTED,
  FONT_ALT, FONT_DISPLAY,
} from '../../../../lib/design-tokens'

interface TrainingActiveBarProps {
  workoutStarted: number | null
  elapsedSecs: number
  trainingDoneSets: number
  trainingTotalSets: number
  onFinish: () => void
  fmtElapsed: (s: number) => string
}

export default function TrainingActiveBar({
  workoutStarted, elapsedSecs, trainingDoneSets, trainingTotalSets, onFinish, fmtElapsed,
}: TrainingActiveBarProps) {
  return (
    <AnimatePresence>
      {workoutStarted && (
        <motion.div
          key="session-bar"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{ position: 'sticky', top: 0, zIndex: 30, background: BG_CARD, borderBottom: `1px solid ${BORDER}`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          {/* Progress bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: BORDER }}>
            <div style={{ height: 2, background: GOLD, width: trainingTotalSets > 0 ? `${(trainingDoneSets / trainingTotalSets) * 100}%` : '0%', transition: 'width 300ms ease' }} />
          </div>
          {/* Timer left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Timer size={14} color={GOLD} />
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: '1.45rem', fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.08em', lineHeight: 1 }}>{fmtElapsed(elapsedSecs)}</span>
            </div>
            <span style={{ fontFamily: FONT_ALT, fontSize: '0.62rem', color: TEXT_MUTED, paddingLeft: 21 }}>
              {format(new Date(), 'EEE d MMM', { locale: fr })} · {trainingDoneSets}/{trainingTotalSets} séries
            </span>
          </div>
          {/* Terminer right */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onFinish}
            style={{ background: GREEN, color: '#050505', border: 'none', borderRadius: 0, padding: '10px 20px', fontFamily: FONT_ALT, fontSize: '0.95rem', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Check size={15} strokeWidth={3} /> Terminer
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
