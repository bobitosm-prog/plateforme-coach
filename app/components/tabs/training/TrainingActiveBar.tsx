'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Timer, Check } from 'lucide-react'

const BLUE  = '#3B82F6'
const GREEN = '#22C55E'
const TEXT_PRIMARY = '#F5F5F5'
const TEXT_MUTED   = '#6B7280'

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
          style={{ position: 'sticky', top: 0, zIndex: 30, background: '#111111', borderBottom: '1px solid #1E1E1E', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          {/* Timer left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Timer size={14} color={BLUE} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.45rem', fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.08em', lineHeight: 1 }}>{fmtElapsed(elapsedSecs)}</span>
            </div>
            <span style={{ fontSize: '0.62rem', color: TEXT_MUTED, paddingLeft: 21 }}>
              {format(new Date(), 'EEE d MMM', { locale: fr })} · {trainingDoneSets}/{trainingTotalSets} séries
            </span>
          </div>
          {/* Terminer right */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onFinish}
            style={{ background: GREEN, color: '#000', border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Check size={15} strokeWidth={3} /> Terminer
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
