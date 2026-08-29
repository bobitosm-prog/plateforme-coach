'use client'
import { useState, useEffect, useRef } from 'react'
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
  Dumbbell, Moon, ChevronRight, ChevronLeft,
} from 'lucide-react'
import {
  fonts, colors, JS_DAYS_FR, titleStyle, bodyStyle, mutedStyle, labelStyle, cardStyle, btnPrimary, btnSecondary,
} from '../../../lib/design-tokens'
import { toast } from 'sonner'
import CardioSection from '../CardioSection'
import { ScheduledSession, toDateStr, buildWeekSessions } from '../../../lib/schedule-utils'
import { getEffectiveWeek } from '../../../lib/training/program-week'

import StartProgramModal from './training/StartProgramModal'
import VideoFeedbackHistory from '../VideoFeedbackHistory'
import ProgramBuilder, { padTo7Days } from '../training/ProgramBuilder'
import AiQuotaBadge from '../ui/AiQuotaBadge'
import RecentSessionsList from '../training/RecentSessionsList'
import { exportProgramToXlsx, parseProgramFromXlsx, downloadBlankTemplate, type ImportResult } from '../../../lib/program-excel'
import type { UserCapabilities } from '../../../lib/entitlements/capabilities'
import type { ActiveTrainingProgramContext, TrainingReadState } from '../../../lib/training/active-program'
import { TrainingV2 } from '../training-v2/TrainingV2'
import NoActiveSession from '../training-v2/NoActiveSession'

const DATE_LOCALES: Record<string, Locale> = { fr: frLocale, en: enUS, de: deLocale }

interface TrainingTabProps {
  supabase: any
  session: any
  profile?: any
  capabilities: UserCapabilities
  activeTrainingProgram: ActiveTrainingProgramContext
  todayKey: string
  todaySessionDone: boolean
  workoutHistory: any[]
  workoutHistoryState: TrainingReadState
  startProgramWorkout: (day: any, exercises: any[], weekdayKey?: string) => void
  fetchAll: (forceRefresh?: boolean) => Promise<void>
  scheduledSessions: ScheduledSession[]
  setCalendarSelectedDate: (d: Date) => void
  setModal: (m: string | null) => void
}

export default function TrainingTab({
  supabase, session, profile, capabilities, activeTrainingProgram, todayKey, todaySessionDone, workoutHistory, workoutHistoryState, startProgramWorkout, fetchAll,
  scheduledSessions, setCalendarSelectedDate, setModal,
}: TrainingTabProps) {
  const t = useTranslations('training_tab')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const dateLocale = DATE_LOCALES[locale] || frLocale
  const aiAllowed = capabilities.training
  const [trainingDay, setTrainingDay]   = useState<string>(() => JS_DAYS_FR[new Date().getDay()])
  const [showProgramManager, setShowProgramManager] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekDir, setWeekDir] = useState(0)
  const calTouchStart = useRef<number | null>(null)
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [customPrograms, setCustomPrograms] = useState<any[]>([])
  const [showProgramBuilder, setShowProgramBuilder] = useState(false)
  const activeCustomProgram = activeTrainingProgram.source === 'personal'
    ? activeTrainingProgram.program as (typeof customPrograms)[number]
    : null
  const coachProgram = activeTrainingProgram.source === 'coach'
    ? activeTrainingProgram.program as Record<string, (typeof customPrograms)[number]>
    : null
  const [editingProgram, setEditingProgram] = useState<any>(null)
  // Workout detail
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null)
  const [workoutDetail, setWorkoutDetail] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportResult['program'] | null>(null)
  const [importSkipped, setImportSkipped] = useState<string[]>([])
  const [importName, setImportName] = useState('')
  const importFileRef = useRef<HTMLInputElement>(null)
  // Start program modal: holds the program to activate/schedule + optional import data
  const [startModalProgram, setStartModalProgram] = useState<any>(null)
  const [startModalImportData, setStartModalImportData] = useState<any>(null)
  const [scheduledBannerDismissed, setScheduledBannerDismissed] = useState(false)
  const fetchAllRef = useRef(fetchAll)
  useEffect(() => { fetchAllRef.current = fetchAll }, [fetchAll])

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

  // ── Load custom programs + auto-activate scheduled ──
  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('custom_programs').select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false })
      .then(async ({ data }: any) => {
        const programs = data || []
        // Auto-activate scheduled programs that are due
        const today = toDateStr(new Date())
        const dueToStart = programs.filter((p: any) => p.scheduled && p.start_date && p.start_date <= today)
        if (dueToStart.length > 0) {
          await supabase.from('custom_programs').update({ is_active: false }).eq('user_id', session.user.id).eq('is_active', true)
          await supabase.from('custom_programs').update({ is_active: true, scheduled: false }).eq('id', dueToStart[0].id)
          dueToStart[0].is_active = true
          dueToStart[0].scheduled = false
          programs.forEach((p: any) => { if (p.id !== dueToStart[0].id) p.is_active = false })
          toast.success(t('programs.newProgramToast'))
        }
        setCustomPrograms(programs)
        if (dueToStart.length > 0) await fetchAllRef.current(true)
      })
  }, [session?.user?.id])

  // Open start modal instead of activating directly
  function activateProgram(programId: string) {
    const prog = customPrograms.find(p => p.id === programId)
    if (prog) setStartModalProgram(prog)
  }

  async function doActivateProgram(programId: string) {
    await supabase.from('custom_programs').update({ is_active: false }).eq('user_id', session.user.id).neq('id', programId)
    const progToActivate = customPrograms.find(p => p.id === programId)
    const startDate = progToActivate?.start_date || toDateStr(new Date())
    const { error } = await supabase.from('custom_programs').update({ is_active: true, scheduled: false, start_date: startDate }).eq('id', programId).eq('user_id', session.user.id)
    if (error) { toast.error(t('calendar.toasts.error') + ': ' + error.message); return }
    const updated = customPrograms.map(p => ({ ...p, is_active: p.id === programId, scheduled: p.id === programId ? false : p.scheduled }))
    setCustomPrograms(updated)
    const activeProg = updated.find(p => p.id === programId) || null

    if (activeProg?.days) {
      try {
        const today = new Date()
        const dow = today.getDay()
        const monday = new Date(today)
        monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
        monday.setHours(0, 0, 0, 0)
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
        const mondayStr = toDateStr(monday)
        const sundayStr = toDateStr(sunday)
        await supabase.from('scheduled_sessions').delete().eq('user_id', session.user.id).gte('scheduled_date', mondayStr).lte('scheduled_date', sundayStr).eq('completed', false)
        const { data: remaining } = await supabase.from('scheduled_sessions')
          .select('scheduled_date, session_type').eq('user_id', session.user.id)
          .gte('scheduled_date', mondayStr).lte('scheduled_date', sundayStr)
        const remainingKeys = new Set((remaining || []).map((s: any) => `${s.scheduled_date}|${s.session_type}`))
        const newSessions = buildWeekSessions(session.user.id, monday, profile || {}, activeProg)
          .filter(s => !remainingKeys.has(`${s.scheduled_date}|${s.session_type}`))
        if (newSessions.length > 0) await supabase.from('scheduled_sessions').insert(newSessions)
      } catch (e) { console.error('[activateProgram] sync error:', e) }
    }
    await fetchAll(true)
    toast.success(t('calendar.toasts.activated'))
  }

  async function scheduleProgram(programId: string, startDate: string) {
    await supabase.from('custom_programs').update({ scheduled: true, start_date: startDate, current_week: 1 }).eq('id', programId)
    const updated = customPrograms.map(p => p.id === programId ? { ...p, scheduled: true, start_date: startDate } : p)
    setCustomPrograms(updated)
    toast.success(t('calendar.toasts.scheduled', { date: new Date(startDate + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' }) }))
  }

  async function handleStartProgram(option: 'now' | 'monday' | 'custom', date?: string) {
    const prog = startModalProgram
    const importData = startModalImportData
    setStartModalProgram(null)
    setStartModalImportData(null)

    if (importData) {
      // Import flow: insert program first
      const insertData: any = { ...importData, user_id: session.user.id, is_active: false }
      if (option === 'now') { insertData.is_active = true; insertData.scheduled = false }
      else { insertData.scheduled = true; insertData.start_date = date; insertData.is_active = false }

      // Deactivate others if starting now
      if (option === 'now') {
        await supabase.from('custom_programs').update({ is_active: false }).eq('user_id', session.user.id).eq('is_active', true)
      }

      const { error } = await supabase.from('custom_programs').insert(insertData)
      if (error) { toast.error(t('calendar.toasts.error') + ': ' + error.message); return }
      if (option === 'now') toast.success(t('calendar.toasts.importedActive'))
      else toast.success(t('calendar.toasts.importedScheduled', { date: new Date(date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' }) }))
      refreshPrograms()
      return
    }

    if (!prog?.id) return
    if (option === 'now') {
      await doActivateProgram(prog.id)
    } else {
      await scheduleProgram(prog.id, date!)
    }
  }

  async function deactivateProgram(programId: string) {
    await supabase.from('custom_programs').update({ is_active: false }).eq('id', programId).eq('user_id', session.user.id)
    const updated = customPrograms.map(p => p.id === programId ? { ...p, is_active: false } : p)
    setCustomPrograms(updated)
    await fetchAll(true)
    toast.success(t('calendar.toasts.deactivated'))
  }



  async function deleteProgram(programId: string) {
    await supabase.from('custom_programs').delete().eq('id', programId).eq('user_id', session.user.id)
    setCustomPrograms(prev => prev.filter(p => p.id !== programId))
    await fetchAll(true)
    toast.success(t('calendar.toasts.deleted'))
  }

  function refreshPrograms() {
    supabase.from('custom_programs').select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false })
      .then(({ data }: any) => {
        setCustomPrograms(data || [])
        void fetchAll(true)
      })
  }

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
        canStart={v2CanStart}
        canViewNext={v2NextSession != null}
        onStart={() => startProgramWorkout({ ...trainingDayData, day_name: v2SessionName }, trainingExercises, trainingDay)}
        onViewNext={showNextPlannedSession}
        onManage={() => setShowProgramManager(true)}
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

      {/* Scheduled program banner */}
      {!scheduledBannerDismissed && (() => {
        const scheduled = customPrograms.find((p: any) => p.scheduled && p.start_date)
        if (!scheduled) return null
        const startDate = new Date(scheduled.start_date + 'T00:00:00')
        const now = new Date(); now.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((startDate.getTime() - now.getTime()) / 86400000)
        if (diffDays < 1) return null
        return (
          <div style={{ margin: '0 24px 8px', padding: '10px 14px', background: colors.goldDim, border: `1px solid ${colors.goldRule}`, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.gold }}>
              Prochain : <span style={{ fontWeight: 700 }}>{scheduled.name}</span> — dans {diffDays} jour{diffDays > 1 ? 's' : ''}
            </div>
            <button onClick={() => setScheduledBannerDismissed(true)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
          </div>
        )
      })()}

      {/* ═══ SECTION 5 — DERNIÈRES SÉANCES ═══ */}
      <RecentSessionsList workoutHistory={workoutHistory} state={workoutHistoryState} onOpenDetail={openWorkoutDetail} />
      {/* ═══ SECTION 6 — CARDIO ═══ */}
      <div style={{ padding: '0 24px 16px' }}>
        <CardioSection supabase={supabase} userId={session?.user?.id || ''} weight={profile?.current_weight || 75} weightIsReal={!!profile?.current_weight} setModal={setModal} />
      </div>

      {/* ═══ SECTION 7 — PROGRAM MANAGER MODAL (fullscreen) ═══ */}
      {showProgramManager && (
        <RailOverlay>
        <div style={{ position: 'fixed', inset: 0, background: colors.background, zIndex: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ModalHeader title={t('programs.title')} onClose={() => { setShowProgramManager(false); setExpandedProgram(null); setConfirmDelete(null) }} />

          {/* Hidden file input for import */}
          <input ref={importFileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const result = await parseProgramFromXlsx(file)
            if (!result.success) { toast.error(result.error || t('calendar.toasts.error')); return }
            if (result.program) {
              setImportPreview(result.program)
              setImportName(result.program.name)
              setImportSkipped(result.skippedSheets || [])
            }
            e.target.value = ''
          }} />

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 100px' }}>
            <AiQuotaBadge />
            {/* Create + Import buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button onClick={() => { setEditingProgram(null); setShowProgramBuilder(true); setShowProgramManager(false) }} style={{ ...btnPrimary, flex: 1, padding: 16 }}>
                + CRÉER
              </button>
              <button onClick={() => importFileRef.current?.click()} style={{ ...btnSecondary, flex: 1, padding: 16 }}>
                {t('calendar.buttons.importXlsx')}
              </button>
            </div>

            {/* Program list */}
            {customPrograms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Dumbbell size={48} color={colors.textDim} strokeWidth={1.5} />
                <p style={{ ...bodyStyle, marginTop: 12 }}>{t('programs.noPrograms')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {customPrograms.map((prog: any) => {
                  const isExpanded = expandedProgram === prog.id
                  const days = prog.days || []

                  return (
                    <div key={prog.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden', opacity: prog.is_active ? 1 : 0.7 }}>
                      {/* Program header — always visible */}
                      <button
                        onClick={() => setExpandedProgram(isExpanded ? null : prog.id)}
                        style={{ width: '100%', padding: 20, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                      >
                        <div>
                          <div style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 700, color: prog.is_active ? colors.gold : colors.text, letterSpacing: '0.05em' }}>{prog.name}</div>
                          <div style={{ ...mutedStyle, marginTop: 4 }}>
                            {t('calendar.import.days', { count: days.length })} · {prog.source === 'ai' ? t('calendar.import.ai') : prog.source === 'import' ? t('calendar.import.importSource') : t('calendar.import.manual')}
                            {prog.total_weeks && ` · ${prog.total_weeks} sem.`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {prog.total_weeks && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '3px 8px', borderRadius: 999 }}>
                              {prog.total_weeks} SEM
                            </span>
                          )}
                          {prog.is_active ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: colors.success, background: 'rgba(74,222,128,0.1)', padding: '3px 10px', borderRadius: 999 }}>● Actif</span>
                          ) : prog.scheduled ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '3px 10px', borderRadius: 999 }}>📅 {new Date(prog.start_date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }).toUpperCase()}</span>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, color: colors.textMuted, background: colors.divider, padding: '3px 10px', borderRadius: 999 }}>○ Inactif</span>
                          )}
                          <span style={{ color: colors.textMuted, fontSize: 14, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                        </div>
                      </button>

                      {/* Expanded content — accordion */}
                      {isExpanded && (
                        <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${colors.goldBorder}` }}>
                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 16 }}>
                            {prog.is_active ? (
                              <button onClick={() => deactivateProgram(prog.id)} style={{ flex: 1, padding: '10px 0', background: 'rgba(74,222,128,0.08)', border: `1px solid rgba(74,222,128,0.3)`, borderRadius: 12, color: colors.success, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('calendar.buttons.deactivate')}</button>
                            ) : (
                              <button onClick={() => activateProgram(prog.id)} style={{ flex: 1, padding: '10px 0', background: colors.goldDim, border: `1px solid ${colors.gold}`, borderRadius: 12, color: colors.gold, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('calendar.buttons.activate')}</button>
                            )}
                            <button onClick={() => { setEditingProgram(prog); setShowProgramBuilder(true); setShowProgramManager(false) }} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: `1px solid ${colors.goldBorder}`, borderRadius: 12, color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>✏️ ÉDITER</button>
                            <button onClick={() => exportProgramToXlsx(prog)} style={{ padding: '10px 14px', background: 'transparent', border: `1px solid ${colors.goldBorder}`, borderRadius: 12, color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⬇️</button>
                          </div>

                          {/* Days list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {padTo7Days(days).map((day: any, di: number) => {
                              const exList = day.exercises || []
                              return (
                                <div key={di} style={{ background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: 16 }}>
                                  {/* Day header */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: day.is_rest ? 0 : 8 }}>
                                    <div style={{ ...titleStyle, fontSize: 12 }}>
                                      {t('calendar.day', { num: di + 1 })} : {day.is_rest ? t('calendar.rest') : (day.name || day.weekday || t('calendar.session', { num: di + 1 }))}
                                      {!day.is_rest && day.focus && <span style={{ color: colors.textMuted, fontWeight: 400, marginLeft: 6 }}>({day.focus})</span>}
                                    </div>
                                    {day.is_rest ? (
                                      <Moon size={14} color={colors.textDim} />
                                    ) : (
                                      <span style={{ ...mutedStyle, fontSize: 10 }}>{exList.length} ex.</span>
                                    )}
                                  </div>

                                  {/* Exercise list (if not rest) */}
                                  {!day.is_rest && exList.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {exList.map((ex: any, ei: number) => {
                                        const exName = ex.exercise_name || ex.custom_name || ex.name || ex.exerciseName || t('calendar.exerciseNum', { num: ei + 1 })
                                        return (
                                          <div key={ei} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ color: colors.gold, fontSize: 10 }}>•</span>
                                            <span style={{ ...bodyStyle, fontSize: 13, flex: 1, minWidth: 0 }}>{exName}</span>
                                            <span style={{ ...mutedStyle, fontSize: 11, flexShrink: 0 }}>{ex.sets || 3}×{ex.reps || 10}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                  {!day.is_rest && exList.length === 0 && (
                                    <span style={{ ...mutedStyle, fontSize: 12 }}>{t('programs.noExercises')}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Delete button with confirmation */}
                          <div style={{ marginTop: 16, borderTop: `1px solid ${colors.goldBorder}`, paddingTop: 16 }}>
                            {confirmDelete === prog.id ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { deleteProgram(prog.id); setConfirmDelete(null); setExpandedProgram(null) }} style={{ flex: 1, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, color: colors.error, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>{t('calendar.buttons.confirmDelete')}</button>
                                <button onClick={() => setConfirmDelete(null)} style={{ padding: '12px 20px', background: 'transparent', border: `1px solid ${colors.goldBorder}`, borderRadius: 12, color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t('calendar.buttons.cancel')}</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(prog.id)} style={{ width: '100%', padding: 12, background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: colors.error, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('programs.deleteProgram')}</button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Blank template link */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button onClick={downloadBlankTemplate} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textDecoration: 'underline', padding: 8 }}>
                Télécharger le modèle vierge (.xlsx)
              </button>
            </div>
          </div>
        </div>
        </RailOverlay>
      )}

      {/* ═══ IMPORT PREVIEW MODAL ═══ */}
      {importPreview && (<RailOverlay>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setImportPreview(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ModalHeader title="APERÇU IMPORT" badge={importPreview.total_weeks ? `${importPreview.total_weeks} SEM` : undefined} onClose={() => setImportPreview(null)} />
            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 0' }}>

              <div style={{ marginTop: 16 }}>
                <div style={{ ...labelStyle, marginBottom: 4 }}>{t('programs.programName')}</div>
                <input value={importName} onChange={e => setImportName(e.target.value)} style={{ width: '100%', padding: 12, background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 8, color: colors.text, fontFamily: fonts.body, fontSize: 14, outline: 'none' }} />
              </div>

              {/* Phase summary for periodized programs */}
              {importPreview.phases && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {importPreview.phases.map((phase, i) => (
                    <div key={i} style={{ padding: '6px 10px', background: colors.goldDim, borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: fonts.headline, fontSize: 11, color: colors.gold }}>{phase.name}</span>
                      <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted }}>{t('calendar.weekLabel', { start: phase.weeks[0], end: phase.weeks[1] })}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 16 }}>
                {importPreview.days.map((day, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: colors.background, borderRadius: 8, border: `1px solid ${colors.goldBorder}` }}>
                    <span style={{ ...bodyStyle, fontSize: 13 }}>
                      {day.is_rest ? `Jour ${i + 1} — Repos` : `Jour ${i + 1} — ${day.name}`}
                    </span>
                    <span style={{ ...mutedStyle, fontSize: 12 }}>
                      {day.is_rest ? '🌙' : `${(day.exercises || []).length} ex. ✓`}
                    </span>
                  </div>
                ))}
                {importSkipped.map((name, i) => (
                  <div key={`skip-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: colors.background, borderRadius: 8, border: `1px solid rgba(239,68,68,0.2)`, opacity: 0.6 }}>
                    <span style={{ ...bodyStyle, fontSize: 13 }}>{name}</span>
                    <span style={{ ...mutedStyle, fontSize: 12 }}>{t('calendar.import.skipped')}</span>
                  </div>
                ))}
                {importSkipped.length > 0 && (
                  <div style={{ ...mutedStyle, fontSize: 11, marginTop: 4 }}>
                    {t('calendar.import.result', { imported: importPreview.days.length, total: importPreview.days.length + importSkipped.length, skipped: importSkipped.length })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer FIXE — toujours visible */}
            <div style={{ flexShrink: 0, padding: '16px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', borderTop: `0.5px solid ${colors.goldBorder}`, background: colors.background, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => {
                const insertData: any = {
                  name: importName.trim() || 'Programme importé',
                  description: importPreview.description || '',
                  days: importPreview.days,
                  source: 'import',
                }
                if (importPreview.total_weeks) {
                  insertData.total_weeks = importPreview.total_weeks
                  insertData.current_week = importPreview.current_week || 1
                  insertData.phases = importPreview.phases || null
                }
                setStartModalImportData(insertData)
                setStartModalProgram({ name: importName.trim() || 'Programme importé' })
                setImportPreview(null)
              }} style={{ ...btnPrimary, padding: 14 }}>{t('calendar.buttons.import')}</button>
              <button onClick={() => setImportPreview(null)} style={{ ...btnSecondary, padding: 14 }}>{t('calendar.buttons.cancel')}</button>
            </div>
          </div>
        </div>
      </RailOverlay>)}

      {/* ═══ ALL EXISTING MODALS (unchanged) ═══ */}

      {/* Video Feedback History */}
      {session?.user?.id && (
        <VideoFeedbackHistory userId={session.user.id} />
      )}

      {showProgramBuilder && (
        <ProgramBuilder
          supabase={supabase}
          session={session}
          aiAllowed={aiAllowed}
          onClose={() => { setShowProgramBuilder(false); setEditingProgram(null) }}
          onSave={refreshPrograms}
          editProgram={editingProgram}
        />
      )}

      {/* Start program modal */}
      {startModalProgram && (
        <StartProgramModal
          programName={startModalProgram.name}
          onStart={handleStartProgram}
          onClose={() => { setStartModalProgram(null); setStartModalImportData(null) }}
        />
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
