'use client'

import { Fragment, type Dispatch, type SetStateAction } from 'react'
import { Check, Clock, Dumbbell, Play, Plus } from 'lucide-react'
import { Reorder } from 'framer-motion'
import { getExerciseName } from '../../../../lib/i18n-exercise'
import { getMuscleLabel } from '../../../../lib/i18n-muscle'
import { TECHNIQUE_LABELS } from '../../../../lib/technique-labels'
import { BG_BASE, BORDER, FONT_ALT, FONT_BODY, FONT_DISPLAY, GOLD, GOLD_DIM, GOLD_RULE, GREEN, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY, colors } from '../../../../lib/design-tokens'
import { WorkoutActiveRestView } from './WorkoutRestViews'
import { legacyTonnage } from '../../../../lib/progression'
import type { WorkoutSessionExercise, WorkoutTranslate } from './types'

export interface WorkoutProgressionSuggestion { weight: number; status: 'progress' | 'hold' | 'deload'; step: number }

export interface WorkoutExerciseEditorProps {
  exos: WorkoutSessionExercise[]
  setExos: Dispatch<SetStateAction<WorkoutSessionExercise[]>>
  reorderMode: boolean
  setReorderMode: Dispatch<SetStateAction<boolean>>
  locale: 'fr' | 'en' | 'de'
  t: WorkoutTranslate
  tMuscle: WorkoutTranslate
  previousData: Record<string, { weight: number; reps: number }[]>
  progressionByExo: Record<string, WorkoutProgressionSuggestion | null>
  exerciseMenu: number | null
  setExerciseMenu: Dispatch<SetStateAction<number | null>>
  restOn: boolean
  restExoId: string | null
  restSetId: string | null
  restSecs: number
  restMax: number
  rirTrackingEnabled?: boolean
  rirScaleAdvanced?: boolean
  onMoveExercise(index: number, direction: number): void
  onRemoveExercise(index: number): void
  onLoadVariants(exercise: WorkoutSessionExercise, index: number): void
  onOpenExerciseInfo(exercise: WorkoutSessionExercise): void
  onOpenTempo(tempo: string, name: string): void
  onStartTempo(exercise: WorkoutSessionExercise, setIndex: number): void
  onSetField(exerciseId: string, setId: string, field: 'weight' | 'reps', value: string): void
  onCommitWeight(exerciseId: string, setId: string): void
  onValidate(exerciseId: string, setId: string): void
  onUnvalidate(exerciseId: string, setId: string): void
  onSetRir(value: number): void
  onAddRestTime(): void
  onSkipRest(): void
  onAddSet(exerciseId: string): void
  onAddExercise(): void
}

const fmtStep = (value: number) => value.toString().replace('.', ',')
const isTempoValid = (tempo?: string) => {
  if (!tempo) return false
  const parts = tempo.trim().split('-').map(part => Number.parseInt(part.trim(), 10))
  return parts.length >= 3 && parts.slice(0, 3).every(value => !Number.isNaN(value) && value >= 0)
}

export function WorkoutExerciseEditor(props: WorkoutExerciseEditorProps) {
  const { exos, setExos, reorderMode, setReorderMode, locale, t, tMuscle, previousData, progressionByExo, exerciseMenu, setExerciseMenu, restOn, restExoId, restSetId, restSecs, restMax, rirTrackingEnabled, rirScaleAdvanced, onMoveExercise: moveExercise, onRemoveExercise: removeExerciseDuringSession, onLoadVariants: loadVariantsForSession, onOpenExerciseInfo: openExerciseInfo, onOpenTempo, onStartTempo, onSetField: setField, onCommitWeight: commitWeight, onValidate: validate, onUnvalidate: unvalidate, onSetRir: setRir, onAddRestTime: addRestTime, onSkipRest: skipRest, onAddSet: addSet, onAddExercise } = props
  return <>
      {/* EXERCICES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '16px 12px', paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' }}>
        {!reorderMode && exos.length === 0 && (
          <div style={{ margin: '0 4px 24px', padding: '40px 20px', textAlign: 'center', border: `1.5px dashed ${colors.divider}`, borderRadius: 14, background: colors.surface2 }}>
            <Dumbbell size={32} color={TEXT_DIM} style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: FONT_ALT, fontSize: 14, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 1, margin: '0 0 4px' }}>{t('emptyTitle')}</p>
            <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_DIM, margin: 0 }}>{t('emptyHint')}</p>
          </div>
        )}

        {/* ── Reorder mode ── */}
        {reorderMode && (
          <div>
            <div style={{ textAlign: 'center', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(201,168,76,0.10)' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', fontWeight: 700, color: GOLD, fontFamily: FONT_ALT }}>{t('reorder.title')}</div>
              <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 4, fontFamily: FONT_BODY }}>{t('reorder.hint')}</div>
            </div>
            <Reorder.Group axis="y" values={exos} onReorder={(newOrder) => setExos(newOrder)} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {exos.map((exo, idx) => (
                <Reorder.Item
                  key={exo.id}
                  value={exo}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 12px',
                    background: 'rgba(201,168,76,0.05)',
                    border: '1px solid rgba(201,168,76,0.20)',
                    borderRadius: 12, marginBottom: 8,
                    cursor: 'grab', userSelect: 'none',
                  }}
                  whileDrag={{
                    scale: 1.02,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    borderColor: GOLD,
                    background: 'rgba(201,168,76,0.12)',
                    cursor: 'grabbing',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.15em', flexShrink: 0, minWidth: 16, fontFamily: FONT_ALT, fontWeight: 700 }}>{idx + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: TEXT_PRIMARY, fontWeight: 700, lineHeight: 1.2, fontFamily: FONT_BODY }}>{getExerciseName(exo, locale)}</div>
                    <div style={{ fontSize: 11, color: 'rgba(245,241,232,0.5)', marginTop: 2, fontFamily: FONT_BODY }}>{exo.muscle ? `${getMuscleLabel(exo.muscle, locale, tMuscle)} · ` : ''}{t('done.setsCount', { count: exo.targetSets })}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 4, flexShrink: 0 }}>
                    <div style={{ width: 18, height: 2, background: GOLD, borderRadius: 1 }} />
                    <div style={{ width: 18, height: 2, background: GOLD, borderRadius: 1 }} />
                    <div style={{ width: 18, height: 2, background: GOLD, borderRadius: 1 }} />
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            <button onClick={() => setReorderMode(false)} style={{ width: '100%', background: GOLD, padding: 14, borderRadius: 12, border: 'none', textAlign: 'center', fontSize: 13, fontWeight: 800, color: colors.onGold, letterSpacing: '0.15em', marginTop: 18, cursor: 'pointer', fontFamily: FONT_ALT }}>{t('reorder.done')}</button>
          </div>
        )}

        {/* ── Normal exercise list ── */}
        {!reorderMode && exos.map((exo, idx) => {
          const cnt = exo.sets.filter(s => s.done).length
          const isDone = cnt === exo.sets.length
          const last = exo.sets.filter(s => s.done).at(-1)
          // Progression badge — "même stade" : compare le volume cumulé des N premiers sets communs
          const progressBadge = (() => {
            const prev = previousData[exo.name]
            if (!prev?.length) return null
            const doneSets = exo.sets.filter(s => s.done && s.weight !== '' && s.reps !== '')
            if (!doneSets.length) return null
            const n = Math.min(doneSets.length, prev.length)
            const curVol = legacyTonnage(doneSets.slice(0, n).map(set => ({ weight: Number(set.weight), reps: Number(set.reps) })))
            const prevVol = legacyTonnage(prev.slice(0, n))
            if (!prevVol) return null
            return Math.round(((curVol - prevVol) / prevVol) * 100)
          })()
          return (
            <div key={exo.id} style={{ marginBottom: 12 }}>
              {/* ── Exercise Hero Banner ── */}
              <div
                onClick={() => setExos(p => p.map(e => e.id === exo.id ? { ...e, open: !e.open } : e))}
                style={{ position: 'relative', height: 110, borderRadius: 12, overflow: 'hidden', marginBottom: exo.open ? 14 : 0, cursor: 'pointer', background: colors.surface2 }}
              >
                {/* Background image */}
                {exo.imageUrl && (
                  <img src={exo.imageUrl} alt={getExerciseName(exo, locale)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, rgba(13,11,8,0.85) 100%)', pointerEvents: 'none' }} />
                {/* Done overlay */}
                {isDone && <div style={{ position: 'absolute', inset: 0, background: colors.goldBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><Check size={32} color={GOLD} strokeWidth={3} /></div>}

                {/* Actions — top right */}
                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6, zIndex: 2 }}>
                  <button onClick={(e) => { e.stopPropagation(); openExerciseInfo(exo) }} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setExerciseMenu(exerciseMenu === idx ? null : idx) }} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0, color: GOLD, fontSize: 13, fontWeight: 700 }}>⋯</button>
                </div>

                {/* Text — bottom left */}
                <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, zIndex: 1 }}>
                  {exo.muscle && <div style={{ fontSize: 11, letterSpacing: '0.18em', fontWeight: 700, color: GOLD, opacity: 0.85, textTransform: 'uppercase' as const, marginBottom: 4, fontFamily: FONT_ALT }}>{getMuscleLabel(exo.muscle, locale, tMuscle)}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.02em', lineHeight: 1, textTransform: 'uppercase' as const, fontFamily: FONT_BODY }}>{getExerciseName(exo, locale)}</span>
                    {progressBadge !== null && (
                      <span style={{ fontSize: 14, fontWeight: 700, padding: '5px 12px', borderRadius: 8, fontFamily: FONT_ALT, background: progressBadge > 0 ? 'rgba(34,197,94,0.20)' : progressBadge < 0 ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.12)', color: progressBadge > 0 ? colors.success : progressBadge < 0 ? colors.error : 'rgba(255,255,255,0.5)' }}>
                        {progressBadge > 0 ? '+' : ''}{progressBadge}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(245,241,232,0.7)', marginTop: 6, fontFamily: FONT_BODY }}>
                    {t('setsReps', { sets: exo.targetSets, reps: exo.targetReps })}
                    {exo.tempo && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenTempo(exo.tempo!, exo.name) }}
                        style={{
                          marginLeft: 8,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 8px',
                          background: 'rgba(212,175,55,0.15)',
                          border: `0.5px solid ${GOLD_RULE}`,
                          borderRadius: 5,
                          color: GOLD,
                          fontFamily: FONT_ALT,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          cursor: 'pointer',
                          verticalAlign: 'middle',
                        }}
                      >
                        <Clock size={10} strokeWidth={2.5} />
                        <span style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 1.5 }}>TEMPO</span>
                        <span>{exo.tempo}</span>
                      </button>
                    )}
                    {exo.rir != null && <span style={{ marginLeft: 4, fontSize: 10, padding: '2px 5px', background: 'rgba(0,0,0,0.35)', borderRadius: 4, fontFamily: FONT_ALT, fontWeight: 700 }}>R{exo.rir}</span>}
                    {exo.technique && TECHNIQUE_LABELS[exo.technique] && (
                      <span style={{ marginLeft: 4, fontSize: 10, padding: '2px 6px', background: colors.goldBorder, border: `0.5px solid ${GOLD_RULE}`, borderRadius: 4, fontFamily: FONT_ALT, fontWeight: 700, color: GOLD }}>
                        {TECHNIQUE_LABELS[exo.technique].emoji} {TECHNIQUE_LABELS[exo.technique].label}{exo.techniqueDetails ? ` ×${exo.techniqueDetails.split(',')[0]}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Exercise menu */}
              {exerciseMenu === idx && (
                <div style={{ display: 'flex', gap: 6, padding: '10px 0 4px', flexWrap: 'wrap' }}>
                  <button disabled={idx === 0} onClick={() => { moveExercise(idx, -1); setExerciseMenu(null) }} style={{ flex: 1, padding: 8, borderRadius: 8, minWidth: 65, background: idx === 0 ? BG_BASE : GOLD_DIM, border: `1px solid ${idx === 0 ? BORDER : GOLD_RULE}`, color: idx === 0 ? TEXT_DIM : GOLD, fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: idx === 0 ? 'default' : 'pointer' }}>{t('menu.moveUp')}</button>
                  <button disabled={idx === exos.length - 1} onClick={() => { moveExercise(idx, 1); setExerciseMenu(null) }} style={{ flex: 1, padding: 8, borderRadius: 8, minWidth: 65, background: idx === exos.length - 1 ? BG_BASE : GOLD_DIM, border: `1px solid ${idx === exos.length - 1 ? BORDER : GOLD_RULE}`, color: idx === exos.length - 1 ? TEXT_DIM : GOLD, fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: idx === exos.length - 1 ? 'default' : 'pointer' }}>{t('menu.moveDown')}</button>
                  <button onClick={() => { setExerciseMenu(null); loadVariantsForSession(exo, idx) }} style={{ flex: 1, padding: 8, borderRadius: 8, minWidth: 65, background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, color: GOLD, fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>{t('menu.replace')}</button>
                  <button onClick={() => removeExerciseDuringSession(idx)} style={{ flex: 1, padding: 8, borderRadius: 8, minWidth: 65, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: colors.error, fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>{t('menu.delete')}</button>
                </div>
              )}

              {/* ── Sets Big Stack ── */}
              {exo.open && (
                <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>

                  {/* Set cards */}
                  {exo.sets.map((set, si) => {
                    const firstUndoneIdx = exo.sets.findIndex(s => !s.done)
                    const isFirstUndone = si === firstUndoneIdx
                    const showTempoPlay = !set.done && isFirstUndone && isTempoValid(exo.tempo)
                    const ok = !set.done && (set.weight !== '' || set.reps !== '')
                    const prevSet = previousData[exo.name]?.[set.num - 1]
                    const isActive = ok && !set.done
                    return (
                      <Fragment key={set.id}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 12px', borderRadius: 12,
                        background: (isActive || set.done) ? 'rgba(201,168,76,0.10)' : 'rgba(201,168,76,0.05)',
                        border: set.done ? `2px solid ${colors.success}` : isActive ? `2px solid ${GOLD}` : '1px solid rgba(201,168,76,0.20)',
                        transition: 'all 0.2s',
                      }}>
                        {/* a) Set number */}
                        <div style={{ width: 42, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontSize: 9, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase' as const }}>{t('set')}</span>
                          <span style={{ fontSize: 22, fontFamily: FONT_DISPLAY, fontWeight: 700, color: set.done ? GOLD : isActive ? GOLD : 'rgba(245,241,232,0.5)', lineHeight: 1 }}>{set.num}</span>
                        </div>

                        {/* b) Previous data + progression badge on 1st set */}
                        <div style={{ width: 60, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 9, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase' as const }}>{t('prev')}</span>
                          <span style={{ fontSize: 13, fontFamily: FONT_BODY, fontWeight: 600, color: prevSet ? GOLD : 'rgba(245,241,232,0.25)', whiteSpace: 'nowrap' }}>
                            {prevSet ? `${prevSet.weight} × ${prevSet.reps}` : '—'}
                          </span>
                          {si === 0 && progressionByExo[exo.name] && (
                            <span style={{
                              marginTop: 2, fontSize: 9, fontFamily: FONT_ALT, fontWeight: 700,
                              padding: '1px 4px', borderRadius: 4, alignSelf: 'flex-start',
                              ...(progressionByExo[exo.name]!.status === 'progress'
                                ? { color: GREEN, background: `${GREEN}20` }
                                : progressionByExo[exo.name]!.status === 'deload'
                                  ? { color: colors.orange, background: 'rgba(251,146,60,0.15)' }
                                  : { color: TEXT_DIM, background: `${TEXT_DIM}20` }),
                            }}>
                              {progressionByExo[exo.name]!.status === 'progress' ? `+${fmtStep(progressionByExo[exo.name]!.step)}` : progressionByExo[exo.name]!.status === 'deload' ? `-${fmtStep(progressionByExo[exo.name]!.step)}` : t('keep')}
                            </span>
                          )}
                        </div>

                        {/* c) KG x REPS inputs */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'center' }}>
                          <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="ws-input ws-big-input"
                            value={set.weightRaw ?? ''} onChange={e => setField(exo.id, set.id, 'weight', e.target.value)}
                            onBlur={() => commitWeight(exo.id, set.id)}
                            disabled={set.done} placeholder={si === 0 && progressionByExo[exo.name] ? String(progressionByExo[exo.name]!.weight).replace('.', ',') : last?.weight ? String(last.weight).replace('.', ',') : '0'}
                            style={{ width: 64, textAlign: 'center', background: 'transparent', border: 'none', borderRadius: 6, fontSize: isActive ? 40 : 36, fontFamily: FONT_BODY, fontWeight: 800, color: (set.weight !== '') ? GOLD : 'rgba(201,168,76,0.4)', caretColor: GOLD, outline: 'none', lineHeight: 1, opacity: set.done ? 0.6 : 1 }} />
                          <span style={{ fontSize: 17, fontWeight: 600, color: 'rgba(245,241,232,0.3)', lineHeight: 1 }}>×</span>
                          <input type="text" inputMode="numeric" pattern="[0-9]*" className="ws-input ws-big-input"
                            value={set.reps === '' || Number.isNaN(set.reps) ? '' : set.reps} onChange={e => { const cleaned = e.target.value.replace(/\D/g, ''); setField(exo.id, set.id, 'reps', cleaned) }}
                            disabled={set.done} placeholder={String(exo.targetReps || '0').split('-')[0] || '0'}
                            style={{ width: 52, textAlign: 'center', background: 'transparent', border: 'none', borderRadius: 6, fontSize: isActive ? 40 : 36, fontFamily: FONT_BODY, fontWeight: 800, color: (set.reps !== '') ? GOLD : 'rgba(201,168,76,0.4)', caretColor: GOLD, outline: 'none', lineHeight: 1, opacity: set.done ? 0.6 : 1 }} />
                        </div>

                        {/* d) Tempo play + Validate button */}
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          {showTempoPlay && (
                            <button
                              onClick={() => onStartTempo(exo, si)}
                              aria-label={t('startTempo')}
                              style={{
                                width: 40,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: GOLD_DIM,
                                border: `1.5px solid ${GOLD}`,
                                borderRadius: '50%',
                                cursor: 'pointer',
                                color: GOLD,
                                marginRight: 8,
                                transition: 'transform 0.15s',
                              }}
                              className="active:scale-95"
                            >
                              <Play size={16} fill={GOLD} strokeWidth={2} />
                            </button>
                          )}
                          {set.done ? (
                            <button onClick={() => unvalidate(exo.id, set.id)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.success, border: 'none', borderRadius: '50%', cursor: 'pointer' }}>
                              <Check size={18} strokeWidth={3} color="#fff" />
                            </button>
                          ) : ok ? (
                            <button onClick={() => validate(exo.id, set.id)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GOLD, border: 'none', borderRadius: '50%', cursor: 'pointer' }}>
                              <Check size={18} strokeWidth={3} color={colors.onGold} />
                            </button>
                          ) : (
                            <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(201,168,76,0.3)', borderRadius: '50%' }}>
                              <Check size={14} strokeWidth={2.5} color="rgba(201,168,76,0.3)" />
                            </div>
                          )}
                        </div>
                      </div>
                      {/* INLINE REST TIMER — rendered below the set that triggered it */}
                      {restOn && restExoId === exo.id && restSetId === set.id && (
                        <WorkoutActiveRestView
                          seconds={restSecs}
                          maximumSeconds={restMax}
                          currentRir={exo.sets.find(candidate => candidate.id === set.id)?.rir ?? null}
                          rirTrackingEnabled={Boolean(rirTrackingEnabled)}
                          rirScaleAdvanced={Boolean(rirScaleAdvanced)}
                          t={t}
                          onSetRir={setRir}
                          onAddThirtySeconds={addRestTime}
                          onSkip={skipRest}
                        />
                      )}
                      </Fragment>
                    )
                  })}

                  {/* Add set */}
                  <button onClick={() => addSet(exo.id)} style={{
                    width: '100%', marginTop: 8, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'transparent', border: `1px dashed rgba(201,168,76,0.2)`, borderRadius: 8, cursor: 'pointer',
                    fontFamily: FONT_ALT, fontWeight: 700, fontSize: 11, color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  }}>
                    <Plus size={12} /> {t('addSet')}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Reorder link — visible only in normal mode with 2+ exos */}
        {exos.length >= 2 && !reorderMode && (
          <div style={{ textAlign: 'center', padding: '6px 0', marginBottom: 14 }}>
            <button onClick={() => setReorderMode(true)} style={{ background: 'transparent', border: 'none', fontSize: 12, color: 'rgba(201,168,76,0.6)', letterSpacing: '0.05em', textDecoration: 'underline', textDecorationColor: 'rgba(201,168,76,0.3)', textUnderlineOffset: 3, cursor: 'pointer', fontFamily: FONT_BODY }}>{t('reorderLink')}</button>
          </div>
        )}

        {/* Spacer to keep scroll above bottom bar */}
        <div style={{ height: 8 }} />
      </div>

      {/* FAB ajout exercice — flottant, au-dessus de la barre TERMINER */}
      {!reorderMode && (
        <button
          onClick={onAddExercise}
          aria-label={t('addExercise')}
          className="active:scale-90"
          style={{
            position: 'fixed',
            left: 20,
            bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
            zIndex: 201,
            width: 56, height: 56, borderRadius: '50%',
            background: GOLD, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 2px 6px rgba(212,175,55,0.3)',
            cursor: 'pointer',
            transition: 'transform 120ms ease',
          }}
        >
          <Plus size={26} color={colors.onGold} strokeWidth={2.5} />
        </button>
      )}
  </>
}
