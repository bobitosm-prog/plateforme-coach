'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Search, Dumbbell, Play } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, TEXT_MUTED, TEXT_PRIMARY, ORANGE, GOLD,
  MUSCLE_COLORS, MUSCLE_GROUPS_FILTER,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'
import { getExerciseImage } from '../../../lib/exercise-media'

interface ExerciseSearchModalProps {
  supabase: any
  onClose: () => void
}

export default function ExerciseSearchModal({ supabase, onClose }: ExerciseSearchModalProps) {
  const [exSearch, setExSearch] = useState('')
  const [exResults, setExResults] = useState<any[]>([])
  const [exDbAllResults, setExDbAllResults] = useState<any[]>([])
  const [exDbMuscleFilter, setExDbMuscleFilter] = useState('Tous')
  const [selectedExDb, setSelectedExDb] = useState<any>(null)
  const [exDbAddSets, setExDbAddSets] = useState('3')
  const [exDbAddReps, setExDbAddReps] = useState('10')
  const [exDbAddRest, setExDbAddRest] = useState('60')
  const exSearchRef = useRef<any>(null)

  // Load all exercises on mount
  useEffect(() => {
    supabase.from('exercises_db').select('*').order('name').limit(200).then(({ data }: any) => {
      setExDbAllResults(data || [])
    })
  }, [])

  // Debounced search
  useEffect(() => {
    clearTimeout(exSearchRef.current)
    if (exSearch.length < 2) { setExResults([]); return }
    exSearchRef.current = setTimeout(async () => {
      const { data } = await supabase.from('exercises_db').select('*').ilike('name', `%${exSearch}%`).limit(10)
      setExResults(data || [])
    }, 300)
  }, [exSearch])

  const list = (() => {
    let l = exSearch.length >= 2 ? exResults : exDbAllResults
    if (exDbMuscleFilter !== 'Tous') l = l.filter((ex: any) => ex.muscle_group === exDbMuscleFilter)
    return l
  })()

  return (
    <>
      {/* ── EXERCISE DB FULL-SCREEN MODAL ── */}
      <AnimatePresence>
        <motion.div
          key="exdb-modal"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{ position: 'fixed', inset: 0, background: BG_BASE, zIndex: 70, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {/* Header */}
          <div style={{ padding: '16px 20px 0', flexShrink: 0, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <button
                onClick={() => { onClose(); }}
                style={{ width: 36, height: 36, borderRadius: 0, background: BG_CARD_2, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <X size={16} color={TEXT_MUTED} />
              </button>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '2px', margin: 0, textTransform: 'uppercase', color: TEXT_PRIMARY }}>BASE D'EXERCICES</h2>
            </div>
            {/* Search bar */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }} />
              <input
                value={exSearch}
                onChange={e => setExSearch(e.target.value)}
                placeholder="Rechercher un exercice..."
                autoFocus
                style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0, padding: '13px 16px 13px 46px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none', fontFamily: FONT_BODY }}
              />
            </div>
            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 14 }}>
              {MUSCLE_GROUPS_FILTER.map(mg => {
                const isActive = exDbMuscleFilter === mg
                const color = MUSCLE_COLORS[mg] || GOLD
                return (
                  <button key={mg} onClick={() => setExDbMuscleFilter(mg)} style={{
                    flexShrink: 0, padding: '6px 14px', borderRadius: 0,
                    border: `1px solid ${isActive ? color : BORDER}`,
                    background: isActive ? `${color}22` : BG_CARD,
                    color: isActive ? color : TEXT_MUTED,
                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 180ms',
                    fontFamily: FONT_ALT, letterSpacing: '2px', textTransform: 'uppercase',
                  }}>
                    {mg}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Exercise grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px' }}>
            {list.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0' }}>
                <Dumbbell size={36} color={TEXT_MUTED} strokeWidth={1.5} />
                <p style={{ color: TEXT_MUTED, fontSize: '0.85rem', margin: 0, fontFamily: FONT_BODY }}>
                  {exSearch.length >= 2 ? 'Aucun exercice trouve' : exDbAllResults.length === 0 ? 'Chargement...' : 'Aucun exercice pour ce groupe'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {list.map((ex: any) => {
                  const mgColor = MUSCLE_COLORS[ex.muscle_group] || TEXT_MUTED
                  const diffColor = ex.difficulty === 'Avance' ? '#EF4444' : ex.difficulty === 'Intermediaire' ? '#F97316' : '#22C55E'
                  return (
                    <motion.button
                      key={ex.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setSelectedExDb(ex)
                        setExDbAddSets('3')
                        setExDbAddReps(ex.reps ? String(ex.reps) : '10')
                        setExDbAddRest(ex.rest ? String(ex.rest) : '60')
                      }}
                      style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '0', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    >
                      {/* Exercise image or muscle color bar */}
                      {(() => {
                        const imgUrl = getExerciseImage(ex.name)
                        return imgUrl ? (
                          <div style={{ height: 80, overflow: 'hidden', flexShrink: 0 }}>
                            <img src={imgUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { const p = (e.target as HTMLImageElement).parentElement!; p.style.height = '4px'; p.style.background = mgColor; (e.target as HTMLImageElement).style.display = 'none' }} />
                          </div>
                        ) : (
                          <div style={{ height: 4, background: mgColor, width: '100%', flexShrink: 0 }} />
                        )
                      })()}
                      <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                        <div style={{ fontFamily: FONT_ALT, fontWeight: 700, fontSize: '0.88rem', color: TEXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1.2 }}>
                          {ex.name}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {ex.muscle_group && (
                            <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: mgColor, background: `${mgColor}20`, borderRadius: 0, padding: '2px 6px', display: 'inline-block', width: 'fit-content', fontFamily: FONT_ALT, letterSpacing: '1px' }}>
                              {ex.muscle_group}
                            </span>
                          )}
                          {ex.equipment && (
                            <span style={{ fontSize: '0.58rem', fontWeight: 700, color: TEXT_MUTED, background: BG_CARD_2, borderRadius: 0, padding: '2px 6px', display: 'inline-block', width: 'fit-content', fontFamily: FONT_ALT, letterSpacing: '1px' }}>
                              {ex.equipment}
                            </span>
                          )}
                          {ex.difficulty && (
                            <span style={{ fontSize: '0.58rem', fontWeight: 700, color: diffColor, background: `${diffColor}18`, borderRadius: 0, padding: '2px 6px', display: 'inline-block', width: 'fit-content', fontFamily: FONT_ALT, letterSpacing: '1px' }}>
                              {ex.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── EXERCISE DETAIL SHEET ── */}
      <AnimatePresence>
        {selectedExDb && (
          <motion.div
            key="exdb-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 80, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setSelectedExDb(null)}
          >
            <motion.div
              key="exdb-detail-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: `${RADIUS_CARD}px ${RADIUS_CARD}px 0 0`, padding: '24px 20px 52px', width: '100%', maxHeight: '88vh', overflowY: 'auto' }}
            >
              {/* Detail header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  {selectedExDb.muscle_group && (
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: MUSCLE_COLORS[selectedExDb.muscle_group] || GOLD, background: `${MUSCLE_COLORS[selectedExDb.muscle_group] || GOLD}20`, borderRadius: 0, padding: '2px 8px', display: 'inline-block', fontFamily: FONT_ALT, letterSpacing: '2px' }}>
                      {selectedExDb.muscle_group}
                    </span>
                  )}
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.6rem', fontWeight: 700, letterSpacing: '2px', margin: '8px 0 0', textTransform: 'uppercase', color: TEXT_PRIMARY }}>
                    {selectedExDb.name}
                  </h3>
                </div>
                <button onClick={() => setSelectedExDb(null)} style={{ width: 32, height: 32, background: BG_CARD_2, borderRadius: 0, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={14} color={TEXT_MUTED} />
                </button>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                {selectedExDb.equipment && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: TEXT_MUTED, background: BG_CARD_2, borderRadius: 0, padding: '4px 10px', fontFamily: FONT_ALT, letterSpacing: '1px' }}>{selectedExDb.equipment}</span>
                )}
                {selectedExDb.difficulty && (() => {
                  const dc = selectedExDb.difficulty === 'Avance' ? '#EF4444' : selectedExDb.difficulty === 'Intermediaire' ? '#F97316' : '#22C55E'
                  return <span style={{ fontSize: '0.7rem', fontWeight: 700, color: dc, background: `${dc}18`, borderRadius: 0, padding: '4px 10px', fontFamily: FONT_ALT, letterSpacing: '1px' }}>{selectedExDb.difficulty}</span>
                })()}
              </div>

              {/* Description */}
              {selectedExDb.description && (
                <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, lineHeight: 1.65, marginBottom: 20, fontFamily: FONT_BODY }}>{selectedExDb.description}</p>
              )}

              {/* Video link */}
              {selectedExDb.video_url && (
                <a href={selectedExDb.video_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: GOLD, fontSize: '0.82rem', fontWeight: 700, marginBottom: 22, textDecoration: 'none', fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  <Play size={15} fill={GOLD} color={GOLD} />
                  Voir la video demo
                </a>
              )}

              {/* Reference info: default sets/reps/rest */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Series', value: exDbAddSets },
                  { label: 'Reps', value: exDbAddReps },
                  { label: 'Repos (s)', value: exDbAddRest },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, fontFamily: FONT_ALT, letterSpacing: '2px' }}>{label}</div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, color: GOLD }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedExDb(null)}
                style={{ width: '100%', background: BG_BASE, color: TEXT_MUTED, fontWeight: 800, padding: '14px', borderRadius: 0, border: `1px solid ${BORDER}`, cursor: 'pointer', fontFamily: FONT_ALT, fontSize: '0.9rem', letterSpacing: '2px', textTransform: 'uppercase' }}
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
