'use client'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Achievement { name: string; icon: string; xp_reward: number }

export default function AchievementToast({ achievement, onDone }: { achievement: Achievement | null; onDone: () => void }) {
  useEffect(() => {
    if (achievement) { const t = setTimeout(onDone, 4000); return () => clearTimeout(t) }
  }, [achievement, onDone])

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div initial={{ opacity: 0, y: -60, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -40, scale: 0.9 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'linear-gradient(135deg, rgba(26,23,18,0.95), rgba(20,18,9,0.95))', border: '1px solid rgba(212,168,67,0.4)', borderRadius: 16, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14, backdropFilter: 'blur(20px)', boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 40px rgba(212,168,67,0.1)', minWidth: 280 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 0 20px rgba(212,168,67,0.15)' }}>{achievement.icon}</div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#D4A843', textTransform: 'uppercase' }}>Achievement debloque !</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1, color: '#F5EDD8' }}>{achievement.name}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#D4A843', fontWeight: 600 }}>+{achievement.xp_reward} XP</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
