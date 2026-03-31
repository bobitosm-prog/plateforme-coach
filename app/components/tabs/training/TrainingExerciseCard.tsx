'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, MoreHorizontal, Timer } from 'lucide-react'
import { MUSCLE_COLORS } from '../../../../lib/design-tokens'

const BLUE  = '#3B82F6'
const GREEN = '#22C55E'
const ORANGE = '#F97316'
const TEXT_PRIMARY = '#F5F5F5'
const TEXT_MUTED   = '#6B7280'
const INPUT_BG     = '#262626'

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
}

export default function TrainingExerciseCard({
  ex, exIdx, setsArr, inputs, trainingIsToday,
  restRunning, restingSet, restTimer,
  onToggleSet, onAddSet, onUpdateInput, onExerciseInfo, fmtRest, onCancelRest,
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
        background: '#1A1A1A',
        border: `1px solid ${allDone ? GREEN + '50' : '#242424'}`,
        borderRadius: 18,
        overflow: 'hidden',
        transition: 'border-color 0.4s ease',
      }}
    >
      {/* ── Card Header ── */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #222' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Exercise name in blue */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span onClick={() => onExerciseInfo(ex)} style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: '1.05rem',
                color: allDone ? GREEN : BLUE,
                textTransform: 'uppercase', letterSpacing: '0.04em',
                transition: 'color 0.3s', cursor: 'pointer',
              }}>{ex.name} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>ℹ️</span></span>

              {/* Muscle group badge */}
              {ex.muscle_group && (
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase',
                  color: MUSCLE_COLORS[ex.muscle_group] || ORANGE,
                  background: `${MUSCLE_COLORS[ex.muscle_group] || ORANGE}20`,
                  borderRadius: 6, padding: '2px 7px', flexShrink: 0,
                }}>{ex.muscle_group}</span>
              )}

              {/* Done badge */}
              {allDone && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ fontSize: '0.58rem', fontWeight: 700, color: GREEN, background: `${GREEN}20`, borderRadius: 6, padding: '2px 7px', flexShrink: 0 }}
                >✓ TERMINÉ</motion.span>
              )}
            </div>

            {/* Subtitle: sets × reps · rest */}
            <div style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontFamily: "'Barlow', sans-serif" }}>
                {numSets} × {ex.reps} reps
              </span>
              {restSecs > 0 && (
                <>
                  <span style={{ fontSize: '0.55rem', color: '#333' }}>·</span>
                  <span style={{ fontSize: '0.65rem', color: '#374151', fontFamily: "'Barlow', sans-serif" }}>
                    {fmtRest(restSecs)} repos
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ⋯ menu button */}
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, minHeight: 32, borderRadius: 8, flexShrink: 0 }}>
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
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '0.58rem', fontWeight: 700,
            color: '#2E2E2E', textTransform: 'uppercase', letterSpacing: '0.08em',
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
                animate={{ background: done ? 'rgba(34,197,94,0.06)' : 'transparent' }}
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
                    width: 26, height: 26, borderRadius: 7,
                    background: done ? `${GREEN}28` : '#262626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 300ms',
                  }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: done ? GREEN : '#555' }}>{si + 1}</span>
                  </div>
                </div>

                {/* Previous performance */}
                <span style={{
                  fontSize: '0.72rem', color: '#2E2E2E',
                  fontFamily: "'Barlow', sans-serif",
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
                    background: done ? 'rgba(34,197,94,0.1)' : INPUT_BG,
                    border: `1px solid ${done ? GREEN + '40' : 'transparent'}`,
                    borderRadius: 10, padding: '7px 4px',
                    fontSize: '0.95rem', fontFamily: "'Barlow Condensed', sans-serif",
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
                    background: done ? 'rgba(34,197,94,0.1)' : INPUT_BG,
                    border: `1px solid ${done ? GREEN + '40' : 'transparent'}`,
                    borderRadius: 10, padding: '7px 4px',
                    fontSize: '0.95rem', fontFamily: "'Barlow Condensed', sans-serif",
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
                      width: 34, height: 34, borderRadius: 10, border: 'none',
                      background: done ? GREEN : '#262626',
                      cursor: trainingIsToday ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 200ms', flexShrink: 0,
                    }}
                  >
                    <Check size={16} color={done ? '#000' : '#333'} strokeWidth={2.5} />
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
                    <div style={{ flex: 1, height: 1, background: '#1F1F1F' }} />
                    <button
                      onClick={onCancelRest}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 8px' }}
                    >
                      <Timer size={12} color={BLUE} />
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: BLUE, letterSpacing: '0.08em' }}>{fmtRest(restTimer)}</span>
                    </button>
                    <div style={{ flex: 1, height: 1, background: '#1F1F1F' }} />
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
            borderTop: '1px solid #222',
            padding: '11px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'background 150ms',
          }}
        >
          <Plus size={13} color={BLUE} strokeWidth={2.5} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: BLUE, letterSpacing: '0.06em' }}>
            + Ajouter une série ({fmtRest(restSecs)})
          </span>
        </motion.button>
      )}
    </motion.div>
  )
}
