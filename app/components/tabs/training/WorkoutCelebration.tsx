'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Award } from 'lucide-react'

const BLUE  = '#3B82F6'
const GREEN = '#22C55E'
const ORANGE = '#F97316'
const TEXT_PRIMARY = '#F5F5F5'
const TEXT_MUTED   = '#6B7280'

interface WorkoutCelebrationProps {
  visible: boolean
}

export default function WorkoutCelebration({ visible }: WorkoutCelebrationProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="confetti-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', zIndex: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, overflow: 'hidden' }}
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div key={i}
              initial={{ y: -40, x: (i % 2 === 0 ? 1 : -1) * (30 + (i * 17) % 180), opacity: 1, rotate: 0 }}
              animate={{ y: 700, x: (i % 2 === 0 ? 1 : -1) * (60 + (i * 23) % 200), opacity: 0, rotate: (i % 2 === 0 ? 1 : -1) * 540 }}
              transition={{ duration: 2.2 + (i % 4) * 0.4, delay: (i % 6) * 0.08 }}
              style={{ position: 'absolute', top: '10%', width: 10, height: 10, borderRadius: i % 3 === 0 ? '50%' : 2, background: [ORANGE, GREEN, BLUE, '#F59E0B', '#EF4444', '#8B5CF6'][i % 6] }}
            />
          ))}
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
            <Award size={72} color={GREEN} strokeWidth={1.5} />
          </motion.div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.8rem', fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', letterSpacing: '0.04em', lineHeight: 1.1 }}>SÉANCE<br />TERMINÉE</div>
          <span style={{ fontSize: '0.9rem', color: TEXT_MUTED }}>Excellent travail !</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
