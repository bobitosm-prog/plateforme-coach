'use client'
import { useId, useState, useEffect, useRef } from 'react'
import { toDateStr } from '../../lib/schedule-utils'
import { Play, Pause, Square, SkipForward, ChevronDown, Star, HeartPulse, ChevronRight } from 'lucide-react'
import { HIIT_WORKOUTS, LISS_WORKOUTS, estimateCalories, type CardioWorkout, type HiitExercise } from '../../lib/cardio-data'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  FONT_DISPLAY, FONT_ALT, FONT_BODY, colors,
} from '../../lib/design-tokens'
import overviewStyles from './tabs/TrainingOverview.module.css'
import { RailOverlay } from './ui/RailOverlay'

interface CardioProps {
  supabase: any
  userId: string
  weight: number
  weightIsReal: boolean
  setModal: (m: string | null) => void
}

export default function CardioSection({ supabase, userId, weight, weightIsReal, setModal }: CardioProps) {
  const t = useTranslations('cardio')
  const tf = useTranslations('training_tab.overview')
  const [expanded, setExpanded] = useState(true)
  const [filter, setFilter] = useState<'all' | 'hiit' | 'liss'>('all')
  const [activeWorkout, setActiveWorkout] = useState<CardioWorkout | null>(null)
  const [showLibrary, setShowLibrary] = useState(true)
  const panelId = useId()
  const [favorites, setFavorites] = useState<string[]>([])
  const [favoritesState, setFavoritesState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [savingFavorite, setSavingFavorite] = useState<string | null>(null)
  const [favoriteRetry, setFavoriteRetry] = useState(0)
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setFavoriteRetry(n => n + 1) }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])

  useEffect(() => {
    let current = true
    setFavorites([]); setFavoritesState('loading')
    if (!userId) { setFavoritesState('error'); return }
    supabase.from('cardio_favorites').select('workout_id').eq('user_id', userId).then(({data, error}: any) => {
      if (!current) return
      if (error) { setFavoritesState('error'); return }
      setFavorites((data || []).map((row: any) => row.workout_id)); setFavoritesState('ready')
    }).catch(() => { if (current) setFavoritesState('error') })
    return () => { current = false }
  }, [supabase, userId, favoriteRetry])
  async function toggleFavorite(id: string) {
    if (!userId || savingFavorite || favoritesState !== 'ready') return
    setSavingFavorite(id)
    const exists = favorites.includes(id)
    try {
      const { error } = exists
        ? await supabase.from('cardio_favorites').delete().eq('user_id', userId).eq('workout_id', id)
        : await supabase.from('cardio_favorites').insert({user_id: userId, workout_id: id})
      if (error) throw error
      setFavorites(previous => exists ? previous.filter(value => value !== id) : [...previous, id])
    } catch { toast.error(tf('favoriteError')) }
    finally { setSavingFavorite(null) }
  }


  const allWorkouts = [...HIIT_WORKOUTS, ...LISS_WORKOUTS]
  const filtered = filter === 'all' ? allWorkouts : allWorkouts.filter(w => w.type === filter)

  if (activeWorkout) {
    return (
      <RailOverlay>
        {activeWorkout.type === 'hiit' && activeWorkout.exercises?.length
          ? <HiitTimer workout={activeWorkout} weight={weight} supabase={supabase} userId={userId} onFinish={() => setActiveWorkout(null)} />
          : <LissTimer workout={activeWorkout} weight={weight} supabase={supabase} userId={userId} onFinish={() => setActiveWorkout(null)} />}
      </RailOverlay>
    )
  }

  return (
    <section
      data-training-section-card="cardio"
      className={overviewStyles.card}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <h2 className={overviewStyles.label}><HeartPulse size={24} aria-hidden="true" />{t('ui.title')}</h2>
        <span style={{ color: colors.textDim, fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {t('ui.optionsCount', { count: allWorkouts.length })}
        </span>
      </div>

      {/* Lightweight accordion row: details remain mounted only after user action. */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={expanded ? t('ui.hide') : t('ui.showOptions', { count: allWorkouts.length })}
        onClick={() => setExpanded(current => !current)}
        style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', minHeight: 56, marginBottom: expanded ? 12 : 0, padding: '4px 0 0', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ padding: '4px 8px', borderRadius: 8, background: '#29261f', border: 0, fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: colors.textDim }}>HIIT</span>
        <span style={{ padding: '4px 8px', borderRadius: 8, background: '#29261f', border: 0, fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: colors.textDim }}>LISS</span>
        <span aria-hidden="true" style={{ width: 44, height: 44, marginLeft: 'auto', display: 'grid', placeItems: 'center', borderRadius: 12, border: 0, background: '#29261f', flexShrink: 0 }}>
          <ChevronDown size={18} color={TEXT_MUTED} style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </span>
      </button>

      {expanded && (
        <div id={panelId} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{margin:0,fontSize:'1.05rem',fontWeight:750}}>{tf('favorites')}</h3>
          {favoritesState === 'loading' ? <p role="status" className={overviewStyles.hint}>{tf('favoritesLoading')}</p> : favoritesState === 'error' ? <button className={overviewStyles.link} onClick={() => setFavoriteRetry(n => n + 1)}>{tf('error')} · {tf('retry')}</button> : <>
            {favorites.length === 0 && <p className={overviewStyles.hint}>{tf('noFavorites')}</p>}
            <div style={{display:'grid',gridTemplateColumns:'1fr',gap:8}}>
              {allWorkouts.filter(w => favorites.includes(w.id)).map(w => <WorkoutCard key={w.id} workout={w} weight={weight} weightIsReal={weightIsReal} setModal={setModal} onStart={() => setActiveWorkout(w)} favorite favoriteDisabled={!!savingFavorite} onFavorite={() => toggleFavorite(w.id)} />)}
            </div>
          </>}

          {/* Library toggle */}
          <button type="button" onClick={() => setShowLibrary(!showLibrary)} style={{ minHeight: 44, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase', cursor: 'pointer', alignSelf: 'flex-start' }}>
            {showLibrary ? t('ui.hide') : t('ui.showOptions', { count: allWorkouts.length })}
          </button>

          {/* Library */}
          {showLibrary && (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['all', t('ui.all')], ['hiit', 'HIIT'], ['liss', 'LISS']].map(([k, l]) => {
                  const active = filter === k
                  return (
                    <button key={k} onClick={() => setFilter(k as any)} style={{ padding: '8px 14px', borderRadius: 10, background: active ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: `1px solid ${active ? GOLD : 'rgba(255,255,255,0.1)'}`, fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: active ? GOLD : TEXT_MUTED, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>{l}</button>
                  )
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                {filtered.map(w => <WorkoutCard key={w.id} workout={w} weight={weight} weightIsReal={weightIsReal} setModal={setModal} onStart={() => setActiveWorkout(w)} favorite={favorites.includes(w.id)} favoriteDisabled={!!savingFavorite || favoritesState !== 'ready'} onFavorite={() => toggleFavorite(w.id)} />)}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

function WorkoutCard({ workout, weight, weightIsReal, setModal, onStart, favorite, favoriteDisabled, onFavorite }: { workout: CardioWorkout; weight: number; weightIsReal: boolean; setModal: (m: string | null) => void; onStart: () => void; favorite?: boolean; favoriteDisabled?: boolean; onFavorite: () => void }) {
  const t = useTranslations('cardio')
  const tf = useTranslations('training_tab.overview')
  return <div style={{padding:'12px 0',borderTop:'1px solid #39362e'}}>
    <div style={{display:'flex',alignItems:'center',gap:12}}>
      <button type="button" onClick={onStart} className={overviewStyles.catalogRow} style={{border:0,flex:1}}>
        <span><strong>{t(`workouts.${workout.id}.name`)}</strong><small>{workout.type.toUpperCase()} · {workout.duration_min} {t('ui.minShort')} · ~{estimateCalories(workout, weight)} kcal</small></span><ChevronRight size={16} />
      </button>
      <button type="button" aria-label={`${tf(favorite ? 'unfavorite' : 'favorite')} : ${t(`workouts.${workout.id}.name`)}`} aria-pressed={!!favorite} disabled={favoriteDisabled} onClick={onFavorite} style={{width:44,height:44,flexShrink:0,border:0,borderRadius:12,background:'#29261e',color:'#dfc27a',cursor:'pointer'}}><Star size={20} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" /></button>
    </div>
    {!weightIsReal && <button className={overviewStyles.link} onClick={() => setModal('weight')}>{t('ui.weightPrompt')}<ChevronRight size={16} /></button>}
  </div>
}

/* ═══════════════════════════════════ HIIT TIMER ═══════════════════════════════════ */
function HiitTimer({ workout, weight, supabase, userId, onFinish }: { workout: CardioWorkout; weight: number; supabase: any; userId: string; onFinish: () => void }) {
  const t = useTranslations('cardio')
  const exercises = workout.exercises || []
  // Flatten all intervals
  const intervals = exercises.flatMap(ex =>
    Array.from({ length: ex.rounds }, () => ({ name: ex.name, work: ex.work_seconds, rest: ex.rest_seconds }))
  )

  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState<'work' | 'rest'>('work')
  const [timeLeft, setTimeLeft] = useState(intervals[0]?.work || 30)
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    if (paused || finished) return
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1)
      setTimeLeft(t => {
        if (t <= 1) {
          // Transition
          if (phase === 'work') {
            const restTime = intervals[currentIdx]?.rest || 0
            if (restTime > 0) { setPhase('rest'); return restTime }
            // No rest — next interval
            return advanceInterval()
          } else {
            return advanceInterval()
          }
        }
        // Vibrate at 3 seconds
        if (t === 4) try { navigator.vibrate?.([100]) } catch {}
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentIdx, phase, paused, finished])

  function advanceInterval(): number {
    const nextIdx = currentIdx + 1
    if (nextIdx >= intervals.length) {
      setFinished(true)
      try { navigator.vibrate?.([200, 100, 200]) } catch {}
      return 0
    }
    setCurrentIdx(nextIdx)
    setPhase('work')
    return intervals[nextIdx]?.work || 30
  }

  function skip() {
    const next = currentIdx + 1
    if (next >= intervals.length) { setFinished(true); return }
    setCurrentIdx(next)
    setPhase('work')
    setTimeLeft(intervals[next]?.work || 30)
  }

  const realCal = Math.round(workout.calories_per_min * (elapsed / 60) * (weight / 75))

  async function saveAndFinish() {
    const { error } = await supabase.from('cardio_sessions').insert({
      user_id: userId, type: 'hiit', name: workout.id,
      duration_min: Math.round(elapsed / 60), calories_burned: realCal,
      exercises: workout.exercises, completed: true, completed_at: new Date().toISOString(),
      scheduled_date: toDateStr(new Date()),
    })
    if (error) { console.error('[cardio] insert failed:', error); toast.error('Cardio non enregistré: ' + error.message); return }
    toast.success(t('ui.finishedToast', { name: t(`workouts.${workout.id}.name`), cal: realCal }))
    onFinish()
  }

  const current = intervals[currentIdx]
  const isWork = phase === 'work'
  const progress = currentIdx / intervals.length
  const accent = isWork ? GREEN : RED

  if (finished) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: BG_BASE, zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
        <span style={{ fontSize: '3rem' }}>🎉</span>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '2.4rem', fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', letterSpacing: '2px' }}>{t(`workouts.${workout.id}.name`)} {t('ui.done')}</h2>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: GOLD }}>{Math.round(elapsed / 60)}</div><div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('ui.minutes')}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: GOLD }}>~{realCal}</div><div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('ui.kcal')}</div></div>
        </div>
        <button onClick={saveAndFinish} style={{ padding: '14px 40px', borderRadius: 12, border: 'none', background: GOLD, color: colors.onGold, fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase' }}>{t('ui.save')}</button>
        <button onClick={onFinish} style={{ padding: '10px 30px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', fontFamily: FONT_ALT, fontSize: '0.8rem', fontWeight: 700, color: TEXT_MUTED, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('ui.cancel')}</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG_BASE, zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: BORDER }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: GOLD, transition: 'width 0.3s' }} />
      </div>

      {/* Phase label */}
      <div style={{ fontFamily: FONT_ALT, fontSize: '1.2rem', fontWeight: 700, color: accent, letterSpacing: '0.2em', marginBottom: 8, textTransform: 'uppercase' }}>
        {isWork ? 'WORK' : 'REST'}
      </div>

      {/* Timer */}
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(80px, 20vw, 140px)', fontWeight: 700, color: accent, lineHeight: 1 }}>
        {timeLeft}
      </div>

      {/* Exercise name */}
      <div style={{ fontFamily: FONT_ALT, fontSize: '1.4rem', fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', marginTop: 12, textTransform: 'uppercase', letterSpacing: '2px' }}>
        {current?.name || ''}
      </div>

      {/* Round counter */}
      <div style={{ fontSize: '0.82rem', color: TEXT_MUTED, marginTop: 8, fontFamily: FONT_BODY }}>
        Intervalle {currentIdx + 1} / {intervals.length}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
        <button onClick={() => setPaused(!paused)} style={{ width: 56, height: 56, borderRadius: '50%', background: BG_CARD, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {paused ? <Play size={24} color={TEXT_PRIMARY} /> : <Pause size={24} color={TEXT_PRIMARY} />}
        </button>
        <button onClick={skip} style={{ width: 56, height: 56, borderRadius: '50%', background: BG_CARD, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SkipForward size={24} color={TEXT_PRIMARY} />
        </button>
        <button onClick={() => setFinished(true)} style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: `1px solid ${RED}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Square size={20} color={RED} fill={RED} />
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

/* ═══════════════════════════════════ LISS TIMER ═══════════════════════════════════ */
function LissTimer({ workout, weight, supabase, userId, onFinish }: { workout: CardioWorkout; weight: number; supabase: any; userId: string; onFinish: () => void }) {
  const t = useTranslations('cardio')
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)
  const targetSec = workout.duration_min * 60

  useEffect(() => {
    if (paused || finished) return
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= targetSec) { setFinished(true); try { navigator.vibrate?.([200, 100, 200]) } catch {}; return targetSec }
        return e + 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [paused, finished])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const pct = Math.min(100, (elapsed / targetSec) * 100)
  const cal = Math.round(workout.calories_per_min * (elapsed / 60) * (weight / 75))

  async function saveAndFinish() {
    const { error } = await supabase.from('cardio_sessions').insert({
      user_id: userId, type: 'liss', name: workout.id,
      duration_min: mins, calories_burned: cal,
      completed: true, completed_at: new Date().toISOString(),
      scheduled_date: toDateStr(new Date()),
    })
    if (error) { console.error('[cardio] insert failed:', error); toast.error('Cardio non enregistré: ' + error.message); return }
    toast.success(t('ui.finishedToast', { name: t(`workouts.${workout.id}.name`), cal }))
    onFinish()
  }

  if (finished) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: BG_BASE, zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
        <span style={{ fontSize: '3rem' }}>🎉</span>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '2.4rem', fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', letterSpacing: '2px' }}>{t(`workouts.${workout.id}.name`)} {t('ui.done')}</h2>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: GOLD }}>{mins}</div><div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('ui.minutes')}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: GOLD }}>~{cal}</div><div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('ui.kcal')}</div></div>
        </div>
        <button onClick={saveAndFinish} style={{ padding: '14px 40px', borderRadius: 12, border: 'none', background: GOLD, color: colors.onGold, fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase' }}>{t('ui.save')}</button>
        <button onClick={onFinish} style={{ padding: '10px 30px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', fontFamily: FONT_ALT, fontSize: '0.8rem', fontWeight: 700, color: TEXT_MUTED, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('ui.cancel')}</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG_BASE, zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Progress */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: BORDER }}>
        <div style={{ height: '100%', width: `${pct}%`, background: GOLD, transition: 'width 1s linear' }} />
      </div>

      <span style={{ fontSize: '0.82rem', color: GOLD, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8, fontFamily: FONT_ALT, textTransform: 'uppercase' }}>LISS — ZONE 2</span>

      {/* Timer */}
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(60px, 15vw, 100px)', fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1 }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>

      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT_PRIMARY, marginTop: 12, fontFamily: FONT_ALT, textTransform: 'uppercase', letterSpacing: '2px' }}>{t(`workouts.${workout.id}.name`)}</div>
      {t.has(`workouts.${workout.id}.notes`) && <p style={{ fontSize: '0.78rem', color: TEXT_MUTED, textAlign: 'center', maxWidth: 300, marginTop: 8, lineHeight: 1.5, fontFamily: FONT_BODY }}>{t(`workouts.${workout.id}.notes`)}</p>}

      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '0.75rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>
        <span>{t('ui.targetHr')} <strong style={{ color: GOLD }}>120-140 bpm</strong></span>
        <span>~{cal} kcal</span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
        <button onClick={() => setPaused(!paused)} style={{ width: 56, height: 56, borderRadius: '50%', background: BG_CARD, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {paused ? <Play size={24} color={TEXT_PRIMARY} /> : <Pause size={24} color={TEXT_PRIMARY} />}
        </button>
        <button onClick={() => setFinished(true)} style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: `1px solid ${RED}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Square size={20} color={RED} fill={RED} />
        </button>
      </div>
    </div>
  )
}
