'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, MoreHorizontal, Timer, Video, RefreshCw, Info, BarChart2 } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY, MUSCLE_COLORS,
} from '../../../../lib/design-tokens'
import ExercisePreview from '../../ExercisePreview'

interface PreviousSet {
  weight: number
  reps: number
}

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
  supabase?: any
  userId?: string
}

export default function TrainingExerciseCard({
  ex, exIdx, setsArr, inputs, trainingIsToday,
  restRunning, restingSet, restTimer,
  onToggleSet, onAddSet, onUpdateInput, onExerciseInfo, fmtRest, onCancelRest, onVideoFeedback,
  supabase, userId,
}: TrainingExerciseCardProps) {
  const restSecs   = Number(ex.rest) || 90
  const numSets    = setsArr.length
  const doneCount  = setsArr.filter(Boolean).length
  const allDone    = doneCount === numSets && numSets > 0
  const isRestingHere = restRunning && restingSet?.exName === ex.name

  // ── Previous performance data ──
  const [previousSets, setPreviousSets] = useState<PreviousSet[]>([])
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!supabase || !userId || !ex.name || fetchedRef.current) return
    fetchedRef.current = true
    supabase
      .from('workout_sets')
      .select('weight, reps, created_at')
      .eq('user_id', userId)
      .eq('exercise_name', ex.name)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }: any) => {
        if (!data || data.length === 0) return
        // Group by session (same created_at within 2 hours)
        const first = new Date(data[0].created_at).getTime()
        const sessionSets = data.filter((d: any) => Math.abs(new Date(d.created_at).getTime() - first) < 7200000)
        setPreviousSets(sessionSets.map((s: any) => ({ weight: s.weight || 0, reps: s.reps || 0 })))
      })
  }, [supabase, userId, ex.name])

  // ── Dropdown menu ──
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  function fmtPrev(set: PreviousSet | undefined) {
    if (!set || (set.weight === 0 && set.reps === 0)) return '—'
    return `${set.weight}×${set.reps}`
  }

  return (
    <div
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Exercise image */}
          <ExercisePreview name={ex.name} size={48} animate={false} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Exercise name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span onClick={() => onExerciseInfo(ex)} style={{
                fontFamily: FONT_BODY,
                fontWeight: 500, fontSize: 15,
                color: allDone ? GREEN : TEXT_PRIMARY,
                letterSpacing: '0.02em',
                transition: 'color 0.3s', cursor: 'pointer',
              }}>{ex.name}</span>

              {/* Muscle group badge */}
              {ex.muscle_group && (
                <span style={{
                  fontFamily: FONT_ALT, fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase',
                  color: MUSCLE_COLORS[ex.muscle_group] || GOLD,
                  background: `${MUSCLE_COLORS[ex.muscle_group] || GOLD}20`,
                  borderRadius: 0, padding: '2px 7px', flexShrink: 0,
                }}>{ex.muscle_group}</span>
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
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
                color: TEXT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 32, minHeight: 32, borderRadius: 0, flexShrink: 0,
              }}
            >
              <MoreHorizontal size={16} />
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: '100%', right: 0, zIndex: 100,
                    background: BG_CARD, border: `1px solid ${BORDER}`,
                    minWidth: 200, overflow: 'hidden',
                  }}
                >
                  {onVideoFeedback && (
                    <button
                      onClick={() => { setMenuOpen(false); onVideoFeedback(ex.name) }}
                      style={{
                        width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                        fontFamily: FONT_BODY, fontWeight: 400, fontSize: 14, color: TEXT_PRIMARY,
                        textAlign: 'left', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = BG_CARD_2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Video size={14} color={GOLD} />
                      Envoyer une vidéo
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); onExerciseInfo(ex) }}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                      fontFamily: FONT_BODY, fontWeight: 400, fontSize: 14, color: TEXT_PRIMARY,
                      textAlign: 'left', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = BG_CARD_2)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Info size={14} color={GOLD} />
                    Infos exercice
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false) }}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                      fontFamily: FONT_BODY, fontWeight: 400, fontSize: 14, color: TEXT_PRIMARY,
                      textAlign: 'left', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = BG_CARD_2)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <BarChart2 size={14} color={GOLD} />
                    Historique
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Table Header ── */}
      <div className="set-grid" style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr 80px 64px 28px',
        gap: 2, padding: '8px 14px 4px', alignItems: 'center',
      }}>
        {['SÉRIE', 'PRÉCÉDENT', 'KG', 'REPS', ''].map((col, ci) => (
          <span key={ci} style={{
            fontFamily: FONT_ALT,
            fontSize: 10, fontWeight: 700,
            color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '2px',
            textAlign: (ci === 0 || ci >= 2) ? 'center' : 'left',
          }}>{col}</span>
        ))}
      </div>

      {/* ── Set Rows ── */}
      <div style={{ paddingBottom: 4 }}>
        {setsArr.map((done, si) => {
          const inp = inputs[si] || { kg: '', reps: String(ex.reps || '') }
          const isRestingThisSet = isRestingHere && restingSet?.setIdx === si
          const prev = previousSets[si]

          return (
            <div key={si}>
              {/* Set row */}
              <motion.div
                animate={{ background: done ? 'rgba(74,222,128,0.06)' : 'transparent' }}
                transition={{ duration: 0.35 }}
                className="set-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 80px 64px 28px',
                  gap: 2, padding: '5px 14px', alignItems: 'center',
                }}
              >
                {/* Series number */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: 28, height: 28,
                    border: `1px solid ${done ? GREEN + '40' : TEXT_DIM}`,
                    background: done ? `${GREEN}15` : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 300ms',
                  }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: done ? GREEN : TEXT_MUTED }}>{si + 1}</span>
                  </div>
                </div>

                {/* Previous performance */}
                <span className="prev-col" style={{
                  fontSize: 13, color: TEXT_MUTED,
                  fontFamily: FONT_BODY, fontWeight: 400,
                  paddingLeft: 4,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textDecoration: done ? 'line-through' : 'none',
                  opacity: done ? 0.5 : 1,
                }}>{fmtPrev(prev)}</span>

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
                    background: done ? 'rgba(74,222,128,0.08)' : BG_BASE,
                    border: `1px solid ${done ? GREEN + '40' : TEXT_DIM}`,
                    borderRadius: 0, padding: '7px 4px',
                    fontSize: 16, fontFamily: FONT_BODY,
                    fontWeight: 500, color: done ? GREEN : TEXT_PRIMARY,
                    textAlign: 'center', width: 80, outline: 'none',
                    transition: 'background 300ms, border-color 200ms',
                    cursor: trainingIsToday ? 'text' : 'default',
                    minHeight: 44,
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
                    background: done ? 'rgba(74,222,128,0.08)' : BG_BASE,
                    border: `1px solid ${done ? GREEN + '40' : TEXT_DIM}`,
                    borderRadius: 0, padding: '7px 4px',
                    fontSize: 16, fontFamily: FONT_BODY,
                    fontWeight: 500, color: done ? GREEN : TEXT_PRIMARY,
                    textAlign: 'center', width: '100%', outline: 'none',
                    transition: 'background 300ms, border-color 200ms',
                    cursor: trainingIsToday ? 'text' : 'default',
                    minHeight: 44,
                  }}
                />

                {/* Check button */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <motion.button
                    whileTap={{ scale: 1.1 }}
                    onClick={() => trainingIsToday ? onToggleSet(ex.name, si, numSets, restSecs) : undefined}
                    style={{
                      width: 28, height: 28, borderRadius: 0,
                      border: `1px solid ${done ? GOLD : TEXT_DIM}`,
                      background: done ? GOLD : 'transparent',
                      cursor: trainingIsToday ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms', flexShrink: 0,
                    }}
                  >
                    <Check size={14} color={done ? '#050505' : TEXT_DIM} strokeWidth={2.5} />
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
        <button
          onClick={() => onAddSet(ex.name)}
          style={{
            width: '100%', background: 'transparent',
            border: 'none', borderTop: `1px solid ${TEXT_DIM}`,
            padding: '12px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'background 150ms',
            minHeight: 44,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = BG_CARD_2; (e.currentTarget.style as any).borderColor = GOLD_RULE }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; (e.currentTarget.style as any).borderColor = TEXT_DIM }}
        >
          <Plus size={13} color={GOLD} strokeWidth={2.5} />
          <span style={{ fontFamily: FONT_ALT, fontSize: 13, fontWeight: 700, color: TEXT_MUTED, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Ajouter une série
          </span>
        </button>
      )}
    </div>
  )
}
