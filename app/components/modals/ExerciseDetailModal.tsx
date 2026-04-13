'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, TEXT_MUTED, TEXT_PRIMARY, GOLD, GOLD_DIM, GOLD_RULE,
  MUSCLE_COLORS,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'

interface ExerciseDetailModalProps {
  exercise: any | null
  sets?: number
  reps?: number
  rest?: string
  onClose: () => void
  onAdd?: (exercise: any) => void
}

export default function ExerciseDetailModal({ exercise, sets, reps, rest, onClose, onAdd }: ExerciseDetailModalProps) {
  const [editSets, setEditSets] = useState(sets || 3)
  const [editReps, setEditReps] = useState(reps || 10)
  const [editRest, setEditRest] = useState(rest || '90')

  if (!exercise) return null

  const dc = exercise.difficulty === 'Avance' ? '#EF4444' : exercise.difficulty === 'Intermediaire' ? '#F97316' : '#22C55E'

  function handleAdd() {
    if (!onAdd) return
    onAdd({
      name: exercise.name,
      exercise_name: exercise.name,
      muscle_group: exercise.muscle_group || '',
      sets: editSets,
      reps: editReps,
      rest_seconds: parseInt(String(editRest)) || 90,
    })
    toast.success('Exercice ajouté ✓')
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        key="exdetail-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 80, display: 'flex', alignItems: 'flex-end' }}
        onClick={onClose}
      >
        <motion.div
          key="exdetail-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: `${RADIUS_CARD}px ${RADIUS_CARD}px 0 0`, width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ flex: 1, paddingRight: 12 }}>
                {exercise.muscle_group && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: MUSCLE_COLORS[exercise.muscle_group] || GOLD, background: `${MUSCLE_COLORS[exercise.muscle_group] || GOLD}20`, borderRadius: 12, padding: '2px 8px', display: 'inline-block', fontFamily: FONT_ALT, letterSpacing: '2px' }}>
                    {exercise.muscle_group}
                  </span>
                )}
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.6rem', fontWeight: 700, letterSpacing: '2px', margin: '8px 0 0', textTransform: 'uppercase', color: TEXT_PRIMARY }}>
                  {exercise.name}
                </h3>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, background: BG_CARD_2, borderRadius: 12, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={14} color={TEXT_MUTED} />
              </button>
            </div>

            {/* Media: video > gif > placeholder */}
            {exercise.video_url ? (
              <div style={{ borderRadius: RADIUS_CARD, overflow: 'hidden', marginBottom: 18, background: BG_BASE }}>
                <video src={`${exercise.video_url}?v=2`} autoPlay loop muted playsInline style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            ) : exercise.gif_url ? (
              <div style={{ borderRadius: RADIUS_CARD, overflow: 'hidden', marginBottom: 18, background: BG_BASE, border: `1px solid ${BORDER}` }}>
                <img src={exercise.gif_url} alt={exercise.name} style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            ) : (
              <div style={{ borderRadius: RADIUS_CARD, border: `1px dashed ${BORDER}`, padding: '40px 20px', textAlign: 'center', background: GOLD_DIM, marginBottom: 18 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
                <div style={{ fontFamily: FONT_ALT, fontSize: 12, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 1 }}>VIDÉO À VENIR</div>
              </div>
            )}

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
              {exercise.secondary_muscles && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: TEXT_MUTED, background: BG_CARD_2, borderRadius: 12, padding: '4px 10px', fontFamily: FONT_ALT, letterSpacing: '1px' }}>{exercise.secondary_muscles}</span>
              )}
              {exercise.equipment && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: TEXT_MUTED, background: BG_CARD_2, borderRadius: 12, padding: '4px 10px', fontFamily: FONT_ALT, letterSpacing: '1px' }}>{exercise.equipment}</span>
              )}
              {exercise.difficulty && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: dc, background: `${dc}18`, borderRadius: 12, padding: '4px 10px', fontFamily: FONT_ALT, letterSpacing: '1px' }}>{exercise.difficulty}</span>
              )}
            </div>

            {/* Description */}
            {exercise.description && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: GOLD, letterSpacing: '2px', marginBottom: 6, fontFamily: FONT_ALT }}>Description</div>
                <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, lineHeight: 1.65, margin: 0, fontFamily: FONT_BODY }}>{exercise.description}</p>
              </div>
            )}

            {/* Instructions */}
            {exercise.instructions && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: GOLD, letterSpacing: '2px', marginBottom: 6, fontFamily: FONT_ALT }}>Exécution</div>
                <p style={{ fontSize: '0.85rem', color: TEXT_PRIMARY, lineHeight: 1.65, margin: 0, fontFamily: FONT_BODY }}>{exercise.instructions}</p>
              </div>
            )}

            {/* Tips */}
            {exercise.tips && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: GOLD, letterSpacing: '2px', marginBottom: 6, fontFamily: FONT_ALT }}>Conseils</div>
                <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, lineHeight: 1.65, margin: 0, fontStyle: 'italic', fontFamily: FONT_BODY }}>{exercise.tips}</p>
              </div>
            )}

            {/* Editable Sets / Reps / Rest */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Séries', value: editSets, onChange: (v: number) => setEditSets(v) },
                { label: 'Reps', value: editReps, onChange: (v: number) => setEditReps(v) },
                { label: 'Repos (s)', value: editRest, onChange: (v: any) => setEditRest(v) },
              ].map(({ label, value, onChange }) => (
                <div key={label} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT_ALT, letterSpacing: '2px' }}>{label}</div>
                  <input
                    type="number"
                    value={value}
                    onChange={e => {
                      const raw = e.target.value
                      if (raw === '') { onChange('' as any); return }
                      const n = parseInt(raw)
                      if (!isNaN(n)) onChange(n)
                    }}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', outline: 'none',
                      fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, color: GOLD,
                      textAlign: 'center',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Sticky bottom buttons */}
          <div style={{ flexShrink: 0, padding: '12px 20px', paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))', borderTop: `1px solid ${BORDER}`, background: BG_CARD, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {onAdd && (
              <button onClick={handleAdd}
                style={{ width: '100%', background: GOLD, color: '#0D0B08', fontWeight: 800, padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                AJOUTER À MA SÉANCE
              </button>
            )}
            <button onClick={onClose}
              style={{ width: '100%', background: 'transparent', color: TEXT_MUTED, fontWeight: 800, padding: '12px', borderRadius: 12, border: `1px solid ${BORDER}`, cursor: 'pointer', fontFamily: FONT_ALT, fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Fermer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
