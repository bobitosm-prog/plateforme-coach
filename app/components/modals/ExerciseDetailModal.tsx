'use client'
import { X, Play } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BG_BASE, BG_CARD, BORDER, TEXT_MUTED, TEXT_PRIMARY, ORANGE,
  MUSCLE_COLORS,
} from '../../../lib/design-tokens'

interface ExerciseDetailModalProps {
  exercise: any | null
  sets?: number
  reps?: number
  rest?: string
  onClose: () => void
}

export default function ExerciseDetailModal({ exercise, sets, reps, rest, onClose }: ExerciseDetailModalProps) {
  if (!exercise) return null

  const dc = exercise.difficulty === 'Avancé' ? '#EF4444' : exercise.difficulty === 'Intermédiaire' ? '#F97316' : '#22C55E'

  return (
    <AnimatePresence>
      <motion.div
        key="exdetail-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', zIndex: 80, display: 'flex', alignItems: 'flex-end' }}
        onClick={onClose}
      >
        <motion.div
          key="exdetail-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: '24px 24px 0 0', padding: '24px 20px 52px', width: '100%', maxHeight: '88vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              {exercise.muscle_group && (
                <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: MUSCLE_COLORS[exercise.muscle_group] || ORANGE, background: `${MUSCLE_COLORS[exercise.muscle_group] || ORANGE}20`, borderRadius: 6, padding: '2px 8px', display: 'inline-block' }}>
                  {exercise.muscle_group}
                </span>
              )}
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.04em', margin: '8px 0 0', textTransform: 'uppercase', color: TEXT_PRIMARY }}>
                {exercise.name}
              </h3>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={14} color={TEXT_MUTED} />
            </button>
          </div>

          {/* Video or placeholder */}
          {exercise.video_url ? (
            <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 18, background: '#111' }}>
              <video autoPlay loop muted playsInline style={{ width: '100%', display: 'block' }} src={exercise.video_url} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#111', borderRadius: 16, padding: '28px 16px', marginBottom: 18 }}>
              <span style={{ fontSize: '1.8rem' }}>💪</span>
              <span style={{ fontSize: '0.82rem', color: TEXT_MUTED, fontWeight: 500 }}>Vidéo bientôt disponible</span>
            </div>
          )}

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            {exercise.secondary_muscles && (
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: TEXT_MUTED, background: '#1A1A1A', borderRadius: 8, padding: '4px 10px' }}>{exercise.secondary_muscles}</span>
            )}
            {exercise.equipment && (
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: TEXT_MUTED, background: '#1A1A1A', borderRadius: 8, padding: '4px 10px' }}>{exercise.equipment}</span>
            )}
            {exercise.difficulty && (
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: dc, background: `${dc}18`, borderRadius: 8, padding: '4px 10px' }}>{exercise.difficulty}</span>
            )}
            {exercise.category && (
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: ORANGE, background: `${ORANGE}18`, borderRadius: 8, padding: '4px 10px' }}>{exercise.category}</span>
            )}
          </div>

          {/* Description */}
          {exercise.description && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: ORANGE, letterSpacing: '0.08em', marginBottom: 6 }}>Description</div>
              <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, lineHeight: 1.65, margin: 0 }}>{exercise.description}</p>
            </div>
          )}

          {/* Tips */}
          {exercise.tips && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: ORANGE, letterSpacing: '0.08em', marginBottom: 6 }}>Conseils</div>
              <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>{exercise.tips}</p>
            </div>
          )}

          {/* Sets / Reps / Rest */}
          {(sets || reps || rest) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Séries', value: sets || '—' },
                { label: 'Reps', value: reps || '—' },
                { label: 'Repos', value: rest || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: ORANGE }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Video link if exists */}
          {exercise.video_url && (
            <a href={exercise.video_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: ORANGE, fontSize: '0.82rem', fontWeight: 700, marginBottom: 20, textDecoration: 'none' }}>
              <Play size={15} fill={ORANGE} color={ORANGE} />
              Ouvrir la vidéo en plein écran
            </a>
          )}

          <button onClick={onClose}
            style={{ width: '100%', background: BG_BASE, color: TEXT_MUTED, fontWeight: 700, padding: '14px', borderRadius: 14, border: `1px solid ${BORDER}`, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Fermer
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
