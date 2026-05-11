'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Award } from 'lucide-react'
import { colors, fonts } from '../../../../lib/design-tokens'

const CONFETTI_COLORS = [colors.orange, colors.success, colors.blue, colors.gold, colors.error, '#8B5CF6']

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
              style={{ position: 'absolute', top: '10%', width: 10, height: 10, borderRadius: i % 3 === 0 ? '50%' : 2, background: CONFETTI_COLORS[i % 6] }}
            />
          ))}
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
            <Award size={72} color={colors.gold} strokeWidth={1.5} />
          </motion.div>
          <div style={{ fontFamily: fonts.alt, fontSize: '2.8rem', fontWeight: 700, color: colors.text, textAlign: 'center', letterSpacing: '0.04em', lineHeight: 1.1 }}>SEANCE<br />TERMINEE</div>
          <span style={{ fontSize: '0.9rem', color: colors.textDim }}>Excellent travail !</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
