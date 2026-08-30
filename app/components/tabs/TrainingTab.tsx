'use client'
import { useState, useRef } from 'react'
import { RailOverlay } from '../ui/RailOverlay'
import WorkoutDetailList from '../training/WorkoutDetailList'
import ModalHeader from '../ui/ModalHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { format, type Locale } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale/fr'
import { enUS } from 'date-fns/locale/en-US'
import { de as deLocale } from 'date-fns/locale/de'
import { useTranslations, useLocale } from 'next-intl'
import { getSessionForDay, frDayToIndex } from '../../../lib/get-today-session'
import {
  ChevronRight, ChevronLeft,
} from 'lucide-react'
import {
  fonts, colors, JS_DAYS_FR,
} from '../../../lib/design-tokens'
import CardioSection from '../CardioSection'
import { ScheduledSession, toDateStr, padTo7Days } from '../../../lib/schedule-utils'
import { getEffectiveWeek } from '../../../lib/training/program-week'
import { deriveTodayTrainingState } from '../../../lib/training/today-training-state'

import VideoFeedbackHistory from '../VideoFeedbackHistory'
import RecentSessionsList from '../training/RecentSessionsList'
import type { ActiveTrainingProgramContext, TrainingReadState } from '../../../lib/training/active-program'
import { TrainingV2 } from '../training-v2/TrainingV2'
import NoActiveSession from '../training-v2/NoActiveSession'

const DATE_LOCALES: Record<string, Locale> = { fr: frLocale, en: enUS, de: deLocale }
type PersonalProgram = NonNullable<Parameters<typeof getEffectiveWeek>[0]> & {
  name?: string
  days?: Parameters<typeof getSessionForDay>[0]
}
type CoachProgram = Record<string, { repos?: boolean; exercises?: ReturnType<typeof getSessionForDay>['exercises'] }>

interface TrainingTabProps {
  supabase: any
  session: any
  profile?: any
  activeTrainingProgram: ActiveTrainingProgramContext
  todayKey: string
  todaySessionDone: boolean
  hasActiveDraft: boolean
  workoutHistory: any[]
  workoutHistoryState: TrainingReadState
  startProgramWorkout: (day: any, exercises: any[], weekdayKey?: string) => void
  onOpenProgramSettings: () => void
  scheduledSessions: ScheduledSession[]
  setCalendarSelectedDate: (d: Date) => void
  setModal: (m: string | null) => void
}

export default function TrainingTab({
  supabase, session, profile, activeTrainingProgram, todayKey, todaySessionDone, hasActiveDraft, workoutHistory, workoutHistoryState, startProgramWorkout, onOpenProgramSettings,
  scheduledSessions, setCalendarSelectedDate, setModal,
}: TrainingTabProps) {
  const t = useTranslations('training_tab')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const dateLocale = DATE_LOCALES[locale] || frLocale
  const [trainingDay, setTrainingDay]   = useState<string>(() => JS_DAYS_FR[new Date().getDay()])
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekDir, setWeekDir] = useState(0)
  const calTouchStart = useRef<number | null>(null)
  const activeCustomProgram = activeTrainingProgram.source === 'personal'
    ? activeTrainingProgram.program as PersonalProgram
    : null
  const coachProgram = activeTrainingProgram.source === 'coach'
    ? activeTrainingProgram.program as CoachProgram
    : null
  // Workout detail
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null)
  const [workoutDetail, setWorkoutDetail] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Use local date (not UTC) to avoid timezone issues
  const _now = new Date()
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`
  const trainingIsToday  = trainingDay === todayKey

  // Program choice is owned by ActiveTrainingProgramContext. This component
  // only renders the already-resolved personal OR coach authority.
  const customDayData = (() => {
    if (!activeCustomProgram?.days?.length) return null
    const dayIndex = frDayToIndex(trainingDay)
    if (dayIndex < 0) return null
    const session = getSessionForDay(activeCustomProgram.days, dayIndex)
    if (session.type === 'rest') return { repos: true, exercises: [] }
    return { repos: false, exercises: session.exercises }
  })()
  const trainingDayData = customDayData || (coachProgram ? (coachProgram[trainingDay] ?? { repos: false, exercises: [] }) : null)
  const baseExercises: any[] = trainingDayData?.exercises || []

  // Resolve exercises for current phase (periodized programs)
  const resolvedExercises: any[] = baseExercises.map((ex: any) => {
    if (!ex.phases || !activeCustomProgram) return ex
    const week = getEffectiveWeek(activeCustomProgram)
    const phaseKey = week <= 4 ? 'p1' : week <= 8 ? 'p2' : 'p3'
    const phaseData = ex.phases[phaseKey] || ex.phases.p1 || {}
    return {
      ...ex,
      sets: phaseData.sets ?? ex.sets,
      reps: typeof phaseData.reps === 'string' ? parseInt(phaseData.reps) || ex.reps : phaseData.reps ?? ex.reps,
      tempo: phaseData.tempo ?? ex.tempo,
      technique: phaseData.technique ?? ex.technique,
      technique_details: phaseData.technique_details ?? ex.technique_details,
      rest_seconds: phaseData.rest_seconds ?? ex.rest_seconds,
    }
  })

  const trainingExercises: any[] = resolvedExercises

  const trainingTotalSets = trainingExercises.reduce((sum: number, exercise: any) => sum + (Number(exercise.sets) || 0), 0)

  // Dates with a completed workout (used by calendar + HeroSessionCard)
  const doneDates = new Set(
    (workoutHistory || [])
      .filter((w: any) => w.completed && w.date)
      .map((w: any) => w.date)
  )

  // Build week sessions from custom program (single source of truth for calendar)
  const weekSessions: any[] = (() => {
    if (!activeCustomProgram?.days?.length) return scheduledSessions
    const paddedDays = padTo7Days(activeCustomProgram.days)
    const today = new Date()
    const dow = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
    monday.setHours(0, 0, 0, 0)
    return paddedDays.map((day: any, i: number) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = toDateStr(date)
      const existing = scheduledSessions.find((s: any) => s.scheduled_date === dateStr)
      const isRest = day.is_rest
      return {
        id: existing?.id || `custom-${i}`,
        user_id: session?.user?.id || '',
        title: isRest ? t('calendar.rest') : (day.name || day.weekday || t('calendar.day', { num: i + 1 })),
        session_type: isRest ? 'rest' as const : 'custom' as const,
        scheduled_date: dateStr,
        scheduled_time: existing?.scheduled_time || '08:00',
        duration_min: existing?.duration_min || 60,
        completed: existing?.completed || false,
        completed_at: existing?.completed_at || null,
        reminder_enabled: false,
        reminder_minutes_before: 30,
        notes: null,
        created_at: existing?.created_at || new Date().toISOString(),
      }
    })
  })()

  async function openWorkoutDetail(workout: any) {
    setSelectedWorkout(workout)
    setLoadingDetail(true)
    const { data } = await supabase
      .from('workout_sets')
      .select('exercise_name, set_number, weight, reps, completed')
      .eq('session_id', workout.id)
      .order('exercise_name').order('set_number', { ascending: true })
    // Group by exercise
    const grouped: Record<string, any[]> = {}
    for (const row of (data || [])) {
      if (!grouped[row.exercise_name]) grouped[row.exercise_name] = []
      grouped[row.exercise_name].push(row)
    }
    setWorkoutDetail(Object.entries(grouped).map(([name, sets]) => ({ name, sets })))
    setLoadingDetail(false)
  }

  const v2SessionName = (() => {
    if (activeCustomProgram?.days?.length) {
      const index = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].indexOf(trainingDay)
      const day = padTo7Days(activeCustomProgram.days)[index]
      if (day?.name && day.name !== 'Repos') return day.name
    }
    const scheduled = weekSessions.find(item => item.scheduled_date === todayStr && item.session_type !== 'rest')
    return scheduled?.title || trainingDay
  })()
  const v2ProgramName = activeTrainingProgram.source === 'coach'
    ? v2SessionName
    : activeCustomProgram?.name || ''
  const v2Muscles = Array.from(new Set(trainingExercises
    .map(exercise => exercise.muscle_group || exercise.muscle)
    .filter(Boolean))) as string[]
  const v2EstimatedMinutes = trainingExercises.length > 0
    ? Math.round(trainingExercises.reduce((sum: number, exercise) => (
      sum + (Number(exercise.sets) || 3) * 2.5
    ), 8))
    : 0
  const v2CanStart = ['ready', 'partial'].includes(activeTrainingProgram.state)
    && trainingExercises.length > 0
    && !(todaySessionDone && trainingIsToday)
  const todayTrainingState = deriveTodayTrainingState({
    activeDraft: hasActiveDraft,
    plannedSession: {
      exerciseCount: trainingExercises.length,
      isRest: Boolean(trainingDayData?.repos),
    },
    programSource: activeTrainingProgram.source,
    programState: activeTrainingProgram.state,
    scheduledCompleted: todaySessionDone,
    workoutSessions: workoutHistory,
  })
  const v2NextSession = (() => {
    const dayKeys = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    const currentIndex = Math.max(0, dayKeys.indexOf(trainingDay))
    for (let offset = 1; offset <= 7; offset += 1) {
      const dayIndex = (currentIndex + offset) % 7
      const dayKey = dayKeys[dayIndex]
      const exercises = activeCustomProgram?.days?.length
        ? getSessionForDay(activeCustomProgram.days, dayIndex).exercises
        : coachProgram?.[dayKey]?.exercises || []
      if (exercises.length > 0) {
        return { dayKey, dayIndex, weekOffset: currentIndex + offset > 6 ? 1 : 0 }
      }
    }
    return null
  })()

  function showNextPlannedSession() {
    if (!v2NextSession) return
    const now = new Date()
    const monday = new Date(now)
    const dow = now.getDay()
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
    monday.setHours(0, 0, 0, 0)
    const selectedDate = new Date(monday)
    selectedDate.setDate(monday.getDate() + v2NextSession.dayIndex + v2NextSession.weekOffset * 7)
    setTrainingDay(v2NextSession.dayKey)
    setCalendarSelectedDate(selectedDate)
    setWeekOffset(v2NextSession.weekOffset)
  }

  // ══════════════════════════════════════════
  return (
    <TrainingV2>
    <div style={{ minHeight: '100vh', background: colors.background, paddingBottom: 100, overflowX: 'hidden', maxWidth: '100%' }}>
      <style>{`
        .set-input { -webkit-appearance: none; appearance: none; }
        .set-input::-webkit-inner-spin-button,
        .set-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .set-input:focus { border-color: ${colors.gold} !important; }
        @keyframes ttPopIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @media(max-width:480px){
          .set-grid{grid-template-columns:28px 1fr 70px 52px 28px!important;gap:2px!important;padding-left:8px!important;padding-right:8px!important}
          .set-grid .prev-col{font-size:11px!important}
        }
      `}</style>

      <NoActiveSession
        programState={activeTrainingProgram.state}
        programSource={activeTrainingProgram.source}
        programName={v2ProgramName}
        sessionName={v2SessionName}
        exerciseCount={trainingExercises.length}
        totalSets={trainingTotalSets}
        estimatedMinutes={v2EstimatedMinutes}
        muscles={v2Muscles}
        isToday={trainingIsToday}
        todayState={trainingIsToday ? todayTrainingState.kind : null}
        completedSessionName={todayTrainingState.completedSession?.name || null}
        canStart={v2CanStart}
        canViewNext={v2NextSession != null}
        onStart={() => startProgramWorkout({ ...trainingDayData, day_name: v2SessionName }, trainingExercises, trainingDay)}
        onViewNext={showNextPlannedSession}
        onViewCompleted={todayTrainingState.completedSession
          ? () => openWorkoutDetail(todayTrainingState.completedSession)
          : undefined}
        onOpenProgramSettings={onOpenProgramSettings}
        onFreeSession={() => startProgramWorkout({ day_name: t('session.freeSession') }, [], trainingDay)}
      />

      {/* ═══ SECTION 2 — CALENDRIER HORIZONTAL ═══ */}
      {(() => {
        const today = new Date()
        const dow = today.getDay()
        const baseMonday = new Date(today)
        baseMonday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7)
        baseMonday.setHours(0, 0, 0, 0)

        const displayDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(baseMonday)
          d.setDate(baseMonday.getDate() + i)
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const ws = weekSessions.find((s: any) => s.scheduled_date === dateStr)
          const progSession = activeCustomProgram?.days?.length ? getSessionForDay(activeCustomProgram.days, i) : null
          const isProgRest = progSession?.type === 'rest'
          return { date: d, dateStr, ws, isProgRest }
        })

        const monthLabel = displayDays[3].date.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase()

        const glassBtn: React.CSSProperties = {
          width: 44, height: 44, borderRadius: 9,
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }

        return (
          <div
            data-no-tab-swipe="true"
            data-training-calendar="compact"
            style={{ margin: '0 20px', background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 14, padding: 12, marginBottom: 16 }}
            onTouchStart={e => { calTouchStart.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              if (calTouchStart.current === null) return
              const diff = e.changedTouches[0].clientX - calTouchStart.current
              if (diff > 60) { setWeekDir(-1); setWeekOffset(o => o - 1) }
              else if (diff < -60) { setWeekDir(1); setWeekOffset(o => o + 1) }
              calTouchStart.current = null
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: colors.textDim }}>{monthLabel}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {weekOffset !== 0 && (
                  <button onClick={() => { setWeekDir(weekOffset > 0 ? -1 : 1); setWeekOffset(0) }} aria-label={t('calendar.backToWeek')}
                    style={{ ...glassBtn, width: 'auto', padding: '6px 12px', fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: colors.gold, textTransform: 'uppercase' as const }}>
                    AUJOURD&apos;HUI
                  </button>
                )}
                <button onClick={() => { setWeekDir(-1); setWeekOffset(o => o - 1) }} aria-label={t('calendar.prevWeek')} style={glassBtn}>
                  <ChevronLeft size={16} color={colors.gold} />
                </button>
                <button onClick={() => { setWeekDir(1); setWeekOffset(o => o + 1) }} aria-label={t('calendar.nextWeek')} style={glassBtn}>
                  <ChevronRight size={16} color={colors.gold} />
                </button>
              </div>
            </div>

            {/* 7-day grid */}
            <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={weekOffset}
              initial={{ x: weekDir * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -weekDir * 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.7 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}
            >
              {displayDays.map(({ date, dateStr, ws, isProgRest }, i) => {
                const dayNum = date.getDate()
                const dayName = format(date, 'EEE', { locale: dateLocale }).toUpperCase()
                const isToday = dateStr === todayStr
                const isRest = isProgRest || ws?.session_type === 'rest' || ws?.title === 'Repos'
                const isDone = (ws?.completed || doneDates.has(dateStr)) && !isRest
                const isMissed = !isDone && !isToday && !isRest && ws && date < new Date(todayStr)
                const dotColor = isRest ? 'rgba(255,255,255,0.2)' : isDone ? colors.success : isMissed ? colors.error : isToday ? colors.gold : `${colors.goldContainer}4d`
                const statusLabel = isRest
                  ? t('calendar.legendRest')
                  : isDone
                    ? t('calendar.legendDone')
                    : isMissed
                      ? t('calendar.legendMissed')
                      : ws?.title || t('calendar.session', { num: i + 1 })

                return (
                  <button
                    key={i}
                    aria-label={`${dayName} ${dayNum} · ${statusLabel}`}
                    onClick={() => {
                      const dayKey = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'][i]
                      setTrainingDay(dayKey)
                      setCalendarSelectedDate(date)
                    }}
                    style={{
                      background: isToday ? `${colors.gold}12` : 'transparent',
                      border: isToday ? `2px solid ${colors.gold}` : `1px solid ${colors.divider}`,
                      borderRadius: 9, padding: '7px 2px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: isToday ? colors.gold : colors.textDim, textTransform: 'uppercase' as const }}>{dayName}</span>
                    <span style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 400, lineHeight: 1, color: isToday ? colors.gold : colors.text }}>{dayNum}</span>
                    <div aria-hidden="true" style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor }} />
                  </button>
                )
              })}
            </motion.div>
            </AnimatePresence>

            {/* Legend compact */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 9 }}>
              {[
                { color: colors.success, label: t('calendar.legendDone') },
                { color: colors.error, label: t('calendar.legendMissed') },
                { color: 'rgba(255,255,255,0.2)', label: t('calendar.legendRest') },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
                  <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ═══ SECTION 5 — DERNIÈRES SÉANCES ═══ */}
      <RecentSessionsList workoutHistory={workoutHistory} state={workoutHistoryState} onOpenDetail={openWorkoutDetail} />
      {/* ═══ SECTION 6 — CARDIO ═══ */}
      <div style={{ padding: '0 24px 16px' }}>
        <CardioSection supabase={supabase} userId={session?.user?.id || ''} weight={profile?.current_weight || 75} weightIsReal={!!profile?.current_weight} setModal={setModal} />
      </div>

      {/* ═══ ALL EXISTING MODALS (unchanged) ═══ */}

      {/* Video Feedback History */}
      {session?.user?.id && (
        <VideoFeedbackHistory userId={session.user.id} />
      )}

      {/* Workout detail popup */}
      {selectedWorkout && (<RailOverlay>
        <div style={{position:'fixed',inset:0,background:colors.background,zIndex:200,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <ModalHeader title={selectedWorkout.name || t('calendar.exercise')} onClose={() => setSelectedWorkout(null)} />
          <div style={{flex:1,overflowY:'auto',padding:'14px 16px 32px',WebkitOverflowScrolling:'touch' as any}}>
            <div style={{fontFamily:fonts.body,fontSize:12,color:colors.textMuted,marginBottom:14}}>
              {new Date(selectedWorkout.created_at).toLocaleDateString(locale === 'de' ? 'de-CH' : locale === 'en' ? 'en-US' : 'fr-CH',{weekday:'long',day:'numeric',month:'long'})}
              {selectedWorkout.duration_minutes?` · ${selectedWorkout.duration_minutes} min`:''}
            </div>
            <WorkoutDetailList detail={workoutDetail} loading={loadingDetail} />
          </div>
        </div>
      </RailOverlay>)}
    </div>
    </TrainingV2>
  )
}
