'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, MoreHorizontal, Timer } from 'lucide-react'
import {
  BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY, MUSCLE_COLORS,
} from '../../../../lib/design-tokens'

const INPUT_BG = '#141310'

interface TrainingExerciseCardProps {
  ex: any
  exIdx: number
  setsArr: boolean[]
  inputs: { kg: string; reps: string }[]
  trainingIsToday: boolean
  restRunning: boolean
  restingSet: { exName: string; setIdx: number } | null
  restTimer: number
  onToggleSet: (exName: string, setIdx: number, numSets: number, restSecs: number) => void
  onAddSet: (exName: string) => void
  onUpdateInput: (exName: string, setIdx: number, field: 'kg' | 'reps', value: string) => void
  onExerciseInfo: (ex: any) => void
  fmtRest: (s: number) => string
  onCancelRest: () => void
  onVideoFeedback?: (exerciseName: string) => void
}

export default function TrainingExerciseCard({
  ex, exIdx, setsArr, inputs, trainingIsToday,
  restRunning, restingSet, restTimer,
  onToggleSet, onAddSet, onUpdateInput, onExerciseInfo, fmtRest, onCancelRest, onVideoFeedback,
}: TrainingExerciseCardProps) {
  const restSecs   = Number(ex.rest) || 90
  const numSets    = setsArr.length
  const doneCount  = setsArr.filter(Boolean).length
  const allDone    = doneCount === numSets && numSets > 0
  const isRestingHere = restRunning && restingSet?.exName === ex.name

  return (
    <motion.div
      key={ex.name}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: exIdx * 0.05, duration: 0.28 }}
      style={{
        background: BG_CARD,
        border: `1px solid ${allDone ? GREEN + '50' : BORDER}`,
        borderRadius: RADIUS_CARD,
        overflow: 'hidden',
        transition: 'border-color 0.4s ease',
      }}
    >
      {/* ── Card Header ── */}
      <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Exercise name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span onClick={() => onExerciseInfo(ex)} style={{
                fontFamily: FONT_BODY,
                fontWeight: 500, fontSize: 15,
                color: allDone ? GREEN : TEXT_PRIMARY,
                letterSpacing: '0.02em',
                transition: 'color 0.3s', cursor: 'pointer',
              }}>{ex.name} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>ℹ️</span></span>

              {/* Muscle group badge */}
              {ex.muscle_group && (
                <span style={{
                  fontFamily: FONT_ALT, fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase',
                  color: MUSCLE_COLORS[ex.muscle_group] || GOLD,
                  background: `${MUSCLE_COLORS[ex.muscle_group] || GOLD}20`,
                  borderRadius: 0, padding: '2px 7px', flexShrink: 0,
                }}>{ex.muscle_group}</span>
              )}

              {/* Video feedback button */}
              {onVideoFeedback && (
                <span onClick={(e) => { e.stopPropagation(); onVideoFeedback(ex.name) }}
                  style={{ fontSize: '0.65rem', fontWeight: 700, color: GOLD, background: GOLD_DIM, borderRadius: 0, padding: '2px 7px', cursor: 'pointer', flexShrink: 0 }}>
                  📹
                </span>
              )}

              {/* Done badge */}
              {allDone && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ fontFamily: FONT_ALT, fontSize: '0.58rem', fontWeight: 700, color: GREEN, background: `${GREEN}20`, borderRadius: 0, padding: '2px 7px', flexShrink: 0 }}
                >✓ TERMINÉ</motion.span>
              )}
            </div>

            {/* Subtitle: sets × reps · rest */}
            <div style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'center' }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: GOLD }}>
                {numSets} × {ex.reps}
              </span>
              <span style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13, color: TEXT_MUTED }}>
                reps
              </span>
              {restSecs > 0 && (
                <>
                  <span style={{ fontSize: '0.55rem', color: TEXT_DIM }}>·</span>
                  <span style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13, color: TEXT_MUTED }}>
                    {fmtRest(restSecs)} repos
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ⋯ menu button */}
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: TEXT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, minHeight: 32, borderRadius: RADIUS_CARD, flexShrink: 0 }}>
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* ── Table Header ── */}
      <div className="set-grid" style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr 72px 64px 44px',
        gap: 4, padding: '8px 14px 4px', alignItems: 'center',
      }}>
        {['SÉRIE', 'PRÉCÉDENT', 'KG', 'REPS', ''].map((col, ci) => (
          <span key={ci} style={{
            fontFamily: FONT_ALT,
            fontSize: '0.58rem', fontWeight: 800,
            color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '2px',
            textAlign: (ci === 0 || ci >= 2) ? 'center' : 'left',
          }}>{col}</span>
        ))}
      </div>

      {/* ── Set Rows ── */}
      <div style={{ paddingBottom: 4 }}>
        {setsArr.map((done, si) => {
          const inp = inputs[si] || { kg: '', reps: String(ex.reps || '') }
          const isRestingThisSet = isRestingHere && restingSet?.setIdx === si

          return (
            <div key={si}>
              {/* Set row */}
              <motion.div
                animate={{ background: done ? 'rgba(74,222,128,0.06)' : 'transparent' }}
                transition={{ duration: 0.35 }}
                className="set-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 72px 64px 44px',
                  gap: 4, padding: '5px 14px', alignItems: 'center',
                }}
              >
                {/* Series number pill */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 0,
                    background: done ? `${GREEN}28` : INPUT_BG,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 300ms',
                  }}>
                    <span style={{ fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 700, color: done ? GREEN : TEXT_DIM }}>{si + 1}</span>
                  </div>
                </div>

                {/* Previous performance */}
                <span style={{
                  fontSize: '0.72rem', color: TEXT_DIM,
                  fontFamily: FONT_BODY,
                  paddingLeft: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textDecoration: done ? 'line-through' : 'none',
                }}>—</span>

                {/* KG input */}
                <input
                  type="number"
                  inputMode="decimal"
                  className="set-input"
                  value={inp.kg}
                  onChange={e => onUpdateInput(ex.name, si, 'kg', e.target.value)}
                  placeholder="0"
                  disabled={!trainingIsToday}
                  style={{
                    background: done ? 'rgba(74,222,128,0.1)' : INPUT_BG,
                    border: `1px solid ${done ? GREEN + '40' : BORDER}`,
                    borderRadius: 0, padding: '7px 4px',
                    fontSize: '0.95rem', fontFamily: FONT_ALT,
                    fontWeight: 700, color: done ? GREEN : TEXT_PRIMARY,
                    textAlign: 'center', width: '100%', outline: 'none',
                    transition: 'background 300ms, border-color 200ms',
                    cursor: trainingIsToday ? 'text' : 'default',
                  }}
                />

                {/* Reps input */}
                <input
                  type="number"
                  inputMode="numeric"
                  className="set-input"
                  value={inp.reps}
                  onChange={e => onUpdateInput(ex.name, si, 'reps', e.target.value)}
                  placeholder="0"
                  disabled={!trainingIsToday}
                  style={{
                    background: done ? 'rgba(74,222,128,0.1)' : INPUT_BG,
                    border: `1px solid ${done ? GREEN + '40' : BORDER}`,
                    borderRadius: 0, padding: '7px 4px',
                    fontSize: '0.95rem', fontFamily: FONT_ALT,
                    fontWeight: 700, color: done ? GREEN : TEXT_PRIMARY,
                    textAlign: 'center', width: '100%', outline: 'none',
                    transition: 'background 300ms, border-color 200ms',
                    cursor: trainingIsToday ? 'text' : 'default',
                  }}
                />

                {/* Check button */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => trainingIsToday ? onToggleSet(ex.name, si, numSets, restSecs) : undefined}
                    style={{
                      width: 34, height: 34, borderRadius: 0, border: 'none',
                      background: done ? GREEN : INPUT_BG,
                      cursor: trainingIsToday ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 200ms', flexShrink: 0,
                    }}
                  >
                    <Check size={16} color={done ? '#050505' : TEXT_DIM} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </motion.div>

              {/* ── Inline rest timer between rows ── */}
              <AnimatePresence>
                {isRestingThisSet && (
                  <motion.div
                    key={`rest-${si}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 34 }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', overflow: 'hidden' }}
                  >
                    <div style={{ flex: 1, height: 1, background: BORDER }} />
                    <button
                      onClick={onCancelRest}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 8px' }}
                    >
                      <Timer size={12} color={GOLD} />
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: '1.1rem', fontWeight: 700, color: GOLD, letterSpacing: '0.08em' }}>{fmtRest(restTimer)}</span>
                    </button>
                    <div style={{ flex: 1, height: 1, background: BORDER }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* ── Add Set Button ── */}
      {trainingIsToday && (
        <motion.button
          className="add-set-btn"
          whileTap={{ scale: 0.98 }}
          onClick={() => onAddSet(ex.name)}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderTop: `1px solid ${BORDER}`,
            padding: '11px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'background 150ms',
          }}
        >
          <Plus size={13} color={GOLD} strokeWidth={2.5} />
          <span style={{ fontFamily: FONT_ALT, fontSize: 13, fontWeight: 700, color: GOLD, letterSpacing: '1px' }}>
            + Ajouter une série ({fmtRest(restSecs)})
          </span>
        </motion.button>
      )}
    </motion.div>
  )
}
