'use client'
import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale/fr'
import { enUS } from 'date-fns/locale/en-US'
import { de as deLocale } from 'date-fns/locale/de'
import type { Locale } from 'date-fns'
import { useTranslations, useLocale } from 'next-intl'
import {
  Ruler, Camera, Zap, Moon, CheckCircle, Flame, Dumbbell, TrendingUp, Droplets, Calendar,
} from 'lucide-react'
import ExercisePreview from '../ExercisePreview'
import { getTodaySession, getSessionForDay } from '../../../lib/get-today-session'
import { toast } from 'sonner'
import { resolveSessionType } from '../../../lib/session-types'
import SessionDoneModal from '../training/SessionDoneModal'
import {
  colors, fonts, cardStyle, cardTitleAbove, titleStyle, titleLineStyle, statStyle, statSmallStyle, bodyStyle, labelStyle, mutedStyle, subtitleStyle, pageTitleStyle, btnPrimary, todayNutritionKey,
} from '../../../lib/design-tokens'
const GOLD = colors.gold
const TEXT_PRIMARY = colors.text
const TEXT_MUTED = colors.textMuted
import SwissBadge from '../ui/SwissBadge'
import MuscleHeatMap, { calculateMuscleStatus } from '../ui/MuscleHeatMap'
import { getLevelFromXP, getLevelTitle, addXP } from '../../../lib/gamification'
import HomeHeader from '../home/HomeHeader'
import HeroSessionCard, { type HeroState } from '../home/HeroSessionCard'
import EnergyCard from '../home/cards/EnergyCard'
import RecoveryCard from '../home/cards/RecoveryCard'
import NutritionCard from '../home/cards/NutritionCard'
import WeeklyDiagnosticCard, { formatWeekRange } from '../home/cards/WeeklyDiagnosticCard'
import RecoveryModal from '../home/modals/RecoveryModal'
import SectionTitle from '../ui/SectionTitle'
import { formatZurichDate } from '../../../lib/format-time'
import { modalOverlay, modalContainer, btnPrimary as btnPrimaryStyle } from '../../../lib/design-tokens'

/**
 * Get daily quote index — deterministic per day of year.
 * Same quote shown across FR/EN/DE on the same day.
 */
function getDailyQuoteIndex(count: number): number {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return dayOfYear % count
}

interface HomeTabProps {
  supabase: any
  session: any
  profile: any
  displayAvatar: string | undefined
  firstName: string
  avatarRef: React.RefObject<HTMLInputElement | null>
  photoRef: React.RefObject<HTMLInputElement | null>
  uploadAvatar: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  uploadProgressPhoto: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  currentWeight: number | undefined
  goalWeight: number | null
  calorieGoal: number
  completedSessions: number
  hasTrainedBefore: boolean
  streak: number
  coachProgram: any
  coachMealPlan: any
  todayKey: string
  todayCoachDay: any
  todaySessionDone: boolean
  setActiveTab: (tab: any) => void
  setModal: (modal: string) => void
  startProgramWorkout: (day: any, exercises: any[], weekdayKey?: string) => void
  completedThisWeek?: Map<number, string>
  aiAllowed?: boolean
  nextSession?: { sessionIndex: number; weekday: string; day: any; reason: string } | null
  latestDiagnostic?: any
  setLatestDiagnostic?: (d: any) => void
  sessionDates?: { created_at: string }[]
  activeTab: string
}

export default function HomeTab({
  supabase, session, profile, displayAvatar, firstName,
  avatarRef, photoRef, uploadAvatar, uploadProgressPhoto,
  currentWeight, goalWeight, completedSessions, hasTrainedBefore, streak,
  coachProgram, coachMealPlan, todayKey, todayCoachDay,
  setActiveTab, setModal, startProgramWorkout,
  completedThisWeek, aiAllowed, nextSession,
  latestDiagnostic, setLatestDiagnostic, sessionDates = [], activeTab,
}: HomeTabProps) {
  const ht = useTranslations('home')
  const locale = useLocale()
  const router = useRouter()
  const DATE_LOCALES: Record<string, Locale> = { fr: frLocale, en: enUS, de: deLocale }
  const dateLocale = DATE_LOCALES[locale] || frLocale
  const [showLevelModal, setShowLevelModal] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [todaySession, setTodaySession] = useState<{ id: string; created_at: string } | null>(null)
  const [consumedKcal, setConsumedKcal] = useState(0)
  const calorieGoal = profile?.calorie_goal || 2000
  const [waterToday, setWaterToday] = useState(0)

  // Mini analytics state
  const [weightData, setWeightData] = useState<{ date: string; poids: number }[]>([])
  const [caloriesWeekData, setCaloriesWeekData] = useState<{ day: string; calories: number }[]>([])
  const [weekVolume, setWeekVolume] = useState(0)
  const [weekSessions, setWeekSessions] = useState(0)
  const [xpData, setXpData] = useState<{ total_xp: number } | null>(null)
  const [nextAppt, setNextAppt] = useState<any>(null)
  const [apptCount, setApptCount] = useState(0)
  const [apptCoachName, setApptCoachName] = useState('votre coach')
  const [muscleStatus, setMuscleStatus] = useState<Record<string, number>>({})
  const [generatingDiag, setGeneratingDiag] = useState(false)

  async function handleGenerateDiagnostic() {
    setGeneratingDiag(true)
    try {
      const res = await fetch('/api/weekly-diagnostic', { method: 'POST' })
      const data = await res.json()
      if (data.diagnostic && setLatestDiagnostic) {
        setLatestDiagnostic(data.diagnostic)
      }
    } catch (e) {
      console.error('Generate diagnostic failed:', e)
    } finally {
      setGeneratingDiag(false)
    }
  }
  const [todayHabit, setTodayHabit] = useState<any>(null)
  const [habitValues, setHabitValues] = useState<Record<string, number>>({})
  const [checkinMood, setCheckinMood] = useState<string | null>(null)
  const [checkinNote, setCheckinNote] = useState('')
  const [checkinSleep, setCheckinSleep] = useState<string>('')
  const [checkinSaved, setCheckinSaved] = useState(false)
  const [checkinSaving, setCheckinSaving] = useState(false)
  const [checkinModified, setCheckinModified] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)
  const checkinSaveRef = useRef<any>(null)
  const [last7Checkins, setLast7Checkins] = useState<any[]>([])
  const [checkinEditMode, setCheckinEditMode] = useState(false)
  const [customProgramExercises, setCustomProgramExercises] = useState<any[] | null>(null)
  const [customDayName, setCustomDayName] = useState<string | null>(null)
  const [customIsRest, setCustomIsRest] = useState(false)
  const [nextSessionLabel, setNextSessionLabel] = useState<string | null>(null)
  const [todayScheduledSession, setTodayScheduledSession] = useState<any>(null)

  // Re-fetch data when returning to Home tab (skip mount to avoid double-fetch)
  const [homeRefreshKey, setHomeRefreshKey] = useState(0)
  const skipFirstHome = useRef(true)
  useEffect(() => {
    if (skipFirstHome.current) { skipFirstHome.current = false; return }
    if (activeTab === 'home') setHomeRefreshKey(k => k + 1)
  }, [activeTab])

  // Fetch today's consumed calories
  useEffect(() => {
    if (!session?.user?.id) return
    const uid = session.user.id
    const todayDate = new Date().toISOString().split('T')[0]
    const dayKey = todayNutritionKey()

    Promise.all([
      supabase.from('meal_tracking').select('meal_type').eq('user_id', uid).eq('date', todayDate).eq('is_completed', true).limit(20),
      supabase.from('meal_plans').select('plan_data').eq('user_id', uid).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('daily_food_logs').select('calories').eq('user_id', uid).eq('date', todayDate).limit(20),
    ]).then(([trackingRes, planRes, logsRes]) => {
      let planKcal = 0
      const completedTypes = new Set((trackingRes.data || []).map((r: any) => r.meal_type))
      const dayData = planRes.data?.plan_data?.[dayKey]
      if (dayData?.repas && completedTypes.size > 0) {
        for (const [mealType, foods] of Object.entries(dayData.repas)) {
          if (!completedTypes.has(mealType) || !Array.isArray(foods)) continue
          for (const f of foods as any[]) planKcal += f.kcal || 0
        }
      }
      const logsKcal = (logsRes.data || []).reduce((s: number, l: any) => s + (l.calories || 0), 0)
      setConsumedKcal(planKcal + logsKcal)
    })
  }, [session?.user?.id, homeRefreshKey])

  // Fetch water
  useEffect(() => {
    if (!session?.user?.id) return
    const today = new Date().toISOString().split('T')[0]
    supabase.from('water_intake').select('amount_ml').eq('user_id', session.user.id).eq('date', today).limit(50)
      .then(({ data }: any) => {
        setWaterToday((data || []).reduce((s: number, r: any) => s + (r.amount_ml || 0), 0))
      })
  }, [session?.user?.id, homeRefreshKey])

  async function addWater(ml: number) {
    if (!session?.user?.id) return
    await supabase.from('water_intake').insert({ user_id: session.user.id, amount_ml: ml, date: new Date().toISOString().split('T')[0] })
    setWaterToday(prev => prev + ml)
  }

  // Today session check
  useEffect(() => {
    if (!session?.user?.id) return
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    supabase
      .from('workout_sessions')
      .select('id,created_at')
      .eq('user_id', session.user.id)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .limit(1)
      .then(({ data }: { data: any[] | null }) => {
        setTodaySession(data?.[0] ?? null)
      })
  }, [session?.user?.id, homeRefreshKey])

  // Fetch mini analytics
  useEffect(() => {
    if (!session?.user?.id) return
    const userId = session.user.id
    const now = new Date()
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0]
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

    // Weight 14 days
    supabase.from('weight_logs').select('date, poids').eq('user_id', userId)
      .gte('date', twoWeeksAgo).order('date', { ascending: true }).limit(14)
      .then(({ data }: any) => setWeightData(data || []))

    // Calories 7 days (from daily_food_logs)
    supabase.from('daily_food_logs').select('calories, date').eq('user_id', userId)
      .gte('date', new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]).limit(200)
      .then(({ data }: any) => {
        const calByDay: Record<string, number> = {}
        ;(data || []).forEach((m: any) => {
          const day = m.date || ''
          calByDay[day] = (calByDay[day] || 0) + (m.calories || 0)
        })
        const days = Object.entries(calByDay).sort(([a], [b]) => a.localeCompare(b))
        setCaloriesWeekData(days.map(([day, calories]) => ({
          day: new Date(day + 'T12:00:00').toLocaleDateString(locale === 'de' ? 'de-CH' : locale === 'en' ? 'en-US' : 'fr-CH', { weekday: 'short' }),
          calories: Math.round(calories as number),
        })))
      })

    // Volume & sessions this week
    supabase.from('workout_sets').select('weight, reps').eq('user_id', userId)
      .gte('created_at', oneWeekAgo).limit(500)
      .then(({ data }: any) => {
        const vol = (data || []).reduce((sum: number, s: any) => sum + ((Number(s.weight) || 0) * (Number(s.reps) || 0)), 0)
        setWeekVolume(Math.round(vol))
      })

    supabase.from('workout_sessions').select('id').eq('user_id', userId)
      .gte('created_at', oneWeekAgo).eq('completed', true).limit(20)
      .then(({ data }: any) => setWeekSessions(data?.length || 0))

    // Fetch active custom program exercises for today — using shared utility
    supabase.from('custom_programs').select('days').eq('user_id', userId).eq('is_active', true).maybeSingle()
      .then(({ data }: any) => {
        if (data?.days) {
          const session = getTodaySession(data.days)
          if (session.type === 'rest') {
            setCustomDayName(ht('rest'))
            setCustomIsRest(true)
            setCustomProgramExercises([]) // empty array, not null — prevents coach fallthrough
            // Find next workout day
            const todayIdx = session.dayIndex
            for (let offset = 1; offset <= 6; offset++) {
              const nextIdx = (todayIdx + offset) % 7
              const nextSession = getSessionForDay(data.days, nextIdx)
              if (nextSession.type === 'workout') {
                const dayKeys = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const
                setNextSessionLabel(`${nextSession.name} — ${offset === 1 ? ht('tomorrow') : ht(dayKeys[nextIdx])}`)
                break
              }
            }
          } else {
            setCustomProgramExercises(session.exercises)
            setCustomDayName(session.name)
            setCustomIsRest(false)
          }
        }
      })

    // Fetch today's scheduled session (same source as Training page calendar)
    const localNow = new Date()
    const todayDateStr = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`
    supabase.from('scheduled_sessions').select('id, title, session_type, completed')
      .eq('user_id', userId).eq('scheduled_date', todayDateStr)
      .neq('session_type', 'rest').limit(1).maybeSingle()
      .then(({ data }: any) => { if (data) setTodayScheduledSession(data) })

    // Fetch XP data
    supabase.from('user_xp').select('total_xp').eq('user_id', userId).maybeSingle()
      .then(({ data }: any) => { if (data) setXpData(data) })

    // Fetch muscle status from recent workout sets + sessions
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    Promise.all([
      supabase.from('workout_sets').select('exercise_name, created_at').eq('user_id', userId).gte('created_at', threeDaysAgo).limit(200),
      supabase.from('workout_sessions').select('muscles_worked, created_at').eq('user_id', userId).eq('completed', true).gte('created_at', threeDaysAgo),
    ]).then(([setsRes, sessRes]: any) => {
      const sets = setsRes.data || []
      // Supplement: for sessions with muscles_worked, add synthetic entries so the body map picks them up via MUSCLE_GROUP_MAP
      const sessData = sessRes.data || []
      sessData.forEach((s: any) => {
        if (s.muscles_worked?.length) {
          s.muscles_worked.forEach((mg: string) => {
            sets.push({ exercise_name: '', muscle_group: mg, created_at: s.created_at })
          })
        }
      })
      setMuscleStatus(calculateMuscleStatus(sets))
    })

    // Fetch today's habit check-in
    const todayDate = new Date().toISOString().split('T')[0]
    supabase.from('daily_habits').select('*').eq('user_id', userId).eq('date', todayDate).maybeSingle()
      .then(({ data }: any) => { if (data) setTodayHabit(data) })

    // Fetch last 7 days check-ins for mini-timeline
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
    supabase.from('daily_checkins').select('date, mood, sleep_hours').eq('user_id', userId).gte('date', weekAgo).order('date')
      .then(({ data }: any) => setLast7Checkins(data || []))
  }, [session?.user?.id, homeRefreshKey])

  // Mount-only: load checkin mood/note/sleep (re-fetching would trigger autosave)
  useEffect(() => {
    if (!session?.user?.id) return
    const todayDate = new Date().toISOString().split('T')[0]
    supabase.from('daily_checkins').select('*').eq('user_id', session.user.id).eq('date', todayDate).maybeSingle()
      .then(({ data, error }: any) => {
        if (error) console.error('[CheckIn] Fetch error:', error.message, '— Table may not exist. Run the migration in Supabase.')
        if (data) { setCheckinMood(data.mood); setCheckinNote(data.note || ''); setCheckinSleep(data.sleep_hours?.toString() || ''); setCheckinSaved(true) }
      })
  }, [session?.user?.id])

  // Track modifications after initial save
  useEffect(() => {
    if (checkinSaved) setCheckinModified(true)
  }, [checkinMood, checkinNote, checkinSleep])

  // Save check-in helper (shared by auto-save and manual button)
  const saveCheckin = async () => {
    if (!session?.user?.id || !checkinMood) return
    setCheckinSaving(true)
    const todayDate = new Date().toISOString().split('T')[0]
    const payload = { user_id: session.user.id, date: todayDate, mood: checkinMood, note: checkinNote || null, sleep_hours: checkinSleep ? parseFloat(checkinSleep) : null }
    const { error } = await supabase.from('daily_checkins').upsert(payload, { onConflict: 'user_id,date' })
    setCheckinSaving(false)
    if (error) {
      console.error('[CheckIn] Save error:', error.message, error)
      toast.error(`Check-in error: ${error.message}`)
      return false
    }
    if (!checkinSaved) { try { await addXP(session.user.id, 10, supabase) } catch {} }
    setCheckinSaved(true); setCheckinModified(false)
    setLastSavedTime(new Date().toLocaleTimeString(locale === 'de' ? 'de-CH' : locale === 'en' ? 'en-US' : 'fr-CH', { hour: '2-digit', minute: '2-digit' }))
    // Reload week data for compact card
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
    supabase.from('daily_checkins').select('date, mood, sleep_hours').eq('user_id', session.user.id).gte('date', weekAgo).order('date')
      .then(({ data }: any) => setLast7Checkins(data || []))
    return true
  }

  // Auto-save check-in (debounced 800ms)
  useEffect(() => {
    if (!session?.user?.id || !checkinMood) return
    clearTimeout(checkinSaveRef.current)
    checkinSaveRef.current = setTimeout(() => saveCheckin(), 800)
    return () => clearTimeout(checkinSaveRef.current)
  }, [checkinMood, checkinNote, checkinSleep])

  const calPct = calorieGoal > 0 ? Math.min(100, Math.round((consumedKcal / calorieGoal) * 100)) : 0
  // Ring values used by MetallicRing via calPct

  // Custom program is authoritative: if it says rest, it's rest — don't fall through to coach
  const todayExercises = customIsRest ? [] : (customProgramExercises?.length ? customProgramExercises : todayCoachDay?.exercises || [])
  // Session title: custom program > scheduled session > coach program
  const rawSessionTitle = customIsRest ? ht('rest') : (customDayName || todayScheduledSession?.title || todayCoachDay?.nom || todayCoachDay?.name || (todayExercises.length > 0 ? `${todayExercises[0]?.muscle_group || ht('trainingOfDay')}` : ht('workoutOfDay')))
  const sessionTypeInfo = resolveSessionType(rawSessionTitle)
  const sessionTitle = rawSessionTitle
  // Has workout today: custom program says rest → no. Otherwise check exercises exist.
  const hasWorkoutToday = !customIsRest && (!!todayScheduledSession || (customProgramExercises && customProgramExercises.length > 0))

  const heroState: HeroState = (() => {
    if (!coachProgram && !customProgramExercises && !todayScheduledSession) return 'no-program'
    if (!hasWorkoutToday && (customIsRest || customDayName === ht('rest') || todayCoachDay?.repos)) return 'rest'
    if (!todayExercises.length) return 'no-exercises'
    if (todaySession) return 'done'
    return 'active'
  })()

  // Weekly assiduity bar chart (1 bar/day, filled if session done)
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const trainedDays = new Set(sessionDates.map(s => formatZurichDate(s.created_at)))
  const todayZ = formatZurichDate(new Date().toISOString())
  const jsDow = new Date().getDay() === 0 ? 7 : new Date().getDay()
  const barData = dayLabels.map((label, i) => {
    const dd = new Date(); dd.setDate(dd.getDate() + (i - (jsDow - 1)))
    const ds = formatZurichDate(dd.toISOString())
    return { label, value: trainedDays.has(ds) ? 1 : 0, isToday: ds === todayZ }
  })
  // Objective label
  const objLabel = profile?.objective === 'weight_loss' || profile?.objective === 'seche' ? 'cut'
    : profile?.objective === 'mass' || profile?.objective === 'bulk' ? 'bulk' : 'maintain'

  // Daily quote from translations (deterministic per day)
  const quoteCategory = objLabel === 'bulk' ? 'mass' : objLabel
  const quoteCount = parseInt(ht(`quotes.${quoteCategory}Count`), 10) || 15
  const dailyQuote = ht(`quotes.${quoteCategory}.${getDailyQuoteIndex(quoteCount)}`)

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid || !supabase) return
    supabase.from('coach_appointments')
      .select('*')
      .eq('client_id', uid)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10)
      .then(async ({ data }: any) => {
        if (data && data.length > 0) {
          setNextAppt(data[0]); setApptCount(data.length)
          const { data: coach } = await supabase.from('profiles').select('full_name').eq('id', data[0].coach_id).maybeSingle()
          if (coach?.full_name) setApptCoachName(coach.full_name)
        } else { setNextAppt(null); setApptCount(0) }
      })
  }, [session?.user?.id, supabase, homeRefreshKey])

  // Card title style from centralized design system
  const T = titleStyle

  return (
    <div style={{ background: colors.background, minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />

      {/* ═══ HOME HEADER ═══ */}
      {(() => {
        const xp = xpData?.total_xp ?? 0
        const { level: xpLevel, xpForNext, xpInLevel, progress: xpProgress } = getLevelFromXP(xp)
        const levelTitle = getLevelTitle(xpLevel)
        return (
          <HomeHeader
            firstName={firstName}
            displayAvatar={displayAvatar}
            level={xpLevel}
            levelTitle={levelTitle}
            streak={streak}
            xpInLevel={xpInLevel}
            xpForNext={xpForNext}
            xpProgress={xpProgress}
            onLevelClick={() => setShowLevelModal(true)}
          />
        )
      })()}

      {nextAppt && (
        <div style={{ margin: '12px 16px', padding: '14px 16px', background: 'rgba(230,195,100,0.08)', border: '1px solid rgba(230,195,100,0.35)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(230,195,100,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={18} color="#E6C364" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#E6C364', marginBottom: 2 }}>
              {ht('nextAppointment')}{apptCount > 1 ? ` · ${ht('nextAppointmentMore', { count: apptCount - 1 })}` : ''}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>
              {`${format(new Date(nextAppt.scheduled_at), 'EEEE d MMMM', { locale: dateLocale })} ${ht('appointmentAt')} ${format(new Date(nextAppt.scheduled_at), 'HH:mm', { locale: dateLocale })}`}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
              {ht('appointmentWith', { name: apptCoachName })}{nextAppt.location ? ` · ${nextAppt.location}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* ═══ HERO CARD — SÉANCE DU JOUR ═══ */}
      <HeroSessionCard
        state={heroState}
        sessionTitle={sessionTitle}
        todayExercises={todayExercises}
        todaySession={todaySession}
        onStart={
          heroState === 'no-program' || heroState === 'no-exercises'
            ? () => startProgramWorkout({ day_name: 'Séance libre' }, [])
            : () => startProgramWorkout({ day_name: sessionTitle || todayKey, name: sessionTitle || todayKey }, todayExercises)
        }
        onCalendar={() => setActiveTab('training')}
        onViewDetail={() => setShowSessionModal(true)}
      />

      {/* ═══ APERÇU DU JOUR — 3 cards grid (moved up from below) ═══ */}
      <div style={{ padding: '0 20px 16px' }}>
        <SectionTitle noPadding title={ht('overview')} action={{ label: '›', onClick: () => setActiveTab('progress') }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <EnergyCard consumedKcal={consumedKcal} calorieGoal={calorieGoal} weekData={caloriesWeekData} />
          <RecoveryCard muscleStatus={muscleStatus} onCardClick={() => setShowRecoveryModal(true)} hasTrainedBefore={hasTrainedBefore} />
          <NutritionCard consumedKcal={consumedKcal} calorieGoal={calorieGoal} proteinGoal={profile?.protein_goal} carbsGoal={profile?.carbs_goal} fatGoal={profile?.fat_goal} />
        </div>

        {/* ═══ MA SEMAINE — Weekly AI Diagnostic ═══ */}
        <SectionTitle noPadding title={ht('weekTitle')} trailing={latestDiagnostic ? formatWeekRange(latestDiagnostic.week_start, locale) : undefined} />
        <WeeklyDiagnosticCard
          diagnostic={latestDiagnostic}
          onViewDetails={() => latestDiagnostic && router.push(`/weekly-diagnostic/${latestDiagnostic.id}`)}
          onGenerate={handleGenerateDiagnostic}
          generating={generatingDiag}
        />

        {/* ═══ HYDRATATION ═══ */}
        <SectionTitle noPadding title={ht('hydration')} />
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <Droplets size={18} color={colors.gold} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.headline, fontSize: 16, color: colors.gold }}>{(waterToday / 1000).toFixed(1)}L <span style={{ fontSize: 11, color: colors.textMuted }}>/ {((profile?.water_goal || 3000) / 1000).toFixed(1)}L</span></div>
          </div>
          <button onClick={() => addWater(250)} className="active:scale-95" style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: colors.gold, fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', cursor: 'pointer', transition: 'all 0.15s' }}>{ht('addWater')}</button>
        </div>
      </div>

      {/* ═══ CHECK-IN — COMPACT (saved) or FULL (editing) ═══ */}
      <div style={{ padding: '0 24px' }}>
        {checkinSaved && !checkinEditMode ? (
          /* ── COMPACT CARD: week calendar ── */
          <>
            <SectionTitle noPadding title={ht('checkinTitle')} action={{ label: ht('viewAll'), onClick: () => setActiveTab('progress') }} />
            <div data-no-tab-swipe="true" style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 12 }}>
                {(() => {
                  const moodIcon = (m: string) => ({ fatigue: '😴', normal: '😐', bien: '💪', top: '🔥', energie: '⚡' } as any)[m] || '—'
                  const days: any[] = []
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(Date.now() - i * 86400000)
                    const ds = d.toISOString().split('T')[0]
                    const c = last7Checkins.find((x: any) => x.date === ds)
                    days.push({ ds, day: d.toLocaleDateString(locale === 'de' ? 'de-CH' : locale === 'en' ? 'en-US' : 'fr-CH', { weekday: 'narrow' }).toUpperCase(), isToday: i === 0, c })
                  }
                  return days.map((d) => (
                    <div key={d.ds} onClick={() => { if (d.isToday) setCheckinEditMode(true) }} style={{
                      background: d.isToday ? 'rgba(201,168,76,0.1)' : 'transparent',
                      border: d.isToday ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(201,168,76,0.05)',
                      borderRadius: 10, padding: '8px 2px', cursor: d.isToday ? 'pointer' : 'default', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: d.isToday ? colors.gold : 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', marginBottom: 4 }}>{d.day}</div>
                      <div style={{ fontSize: 18, height: 22, opacity: d.c ? 1 : 0.2 }}>{d.c ? moodIcon(d.c.mood) : '—'}</div>
                      <div style={{ fontSize: 9, color: d.c?.sleep_hours ? colors.gold : 'rgba(255,255,255,0.2)', fontWeight: 600, marginTop: 4 }}>{d.c?.sleep_hours ? `${d.c.sleep_hours}h` : '—'}</div>
                    </div>
                  ))
                })()}
              </div>
              <button onClick={() => setCheckinEditMode(true)} style={{ width: '100%', padding: '8px 0', background: 'transparent', border: 'none', color: 'rgba(201,168,76,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>{ht('editToday')}</button>
            </div>
          </>
        ) : (
          /* ── FULL CHECK-IN CARD ── */
          <>
          <SectionTitle noPadding title={ht('checkinTitle')} action={checkinSaved ? { label: ht('close'), onClick: () => setCheckinEditMode(false) } : undefined} />
          <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            <div style={{ fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>{ht('checkinQuestion')}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
              {[
                { id: 'fatigue', icon: '😴', label: ht('moodFatigue') },
                { id: 'normal', icon: '😐', label: ht('moodNormal') },
                { id: 'bien', icon: '💪', label: ht('moodBien') },
                { id: 'top', icon: '🔥', label: ht('moodTop') },
                { id: 'energie', icon: '⚡', label: ht('moodEnergie') },
              ].map(m => (
                <button key={m.id} onClick={() => setCheckinMood(m.id)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                    background: checkinMood === m.id ? colors.goldDim : colors.surface,
                    border: `1.5px solid ${checkinMood === m.id ? colors.goldRule : colors.goldBorder}`,
                    transform: checkinMood === m.id ? 'scale(1.08)' : 'scale(1)', transition: 'all 200ms',
                  }}>{m.icon}</div>
                  <span style={{ fontFamily: fonts.body, fontSize: 9, color: checkinMood === m.id ? colors.gold : colors.textDim }}>{m.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: fonts.body, fontSize: 9, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>{ht('sleep')}</span>
              <input type="number" step="0.5" min="0" max="14" placeholder="7.5" value={checkinSleep} onChange={e => setCheckinSleep(e.target.value)}
                style={{ width: 60, padding: '7px 8px', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, color: colors.text, fontFamily: fonts.headline, fontSize: 16, textAlign: 'center', outline: 'none' }} />
              <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDim }}>h</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: colors.gold, width: `${Math.min(100, (parseFloat(checkinSleep) || 0) / 8 * 100)}%`, transition: 'width 300ms' }} />
              </div>
              <span style={{ fontFamily: fonts.body, fontSize: 9, color: colors.textDim, flexShrink: 0 }}>/ 8h</span>
            </div>
            <textarea value={checkinNote} onChange={e => setCheckinNote(e.target.value.slice(0, 200))} placeholder={ht('checkinPlaceholder')} rows={2} maxLength={200}
              style={{ width: '100%', padding: '8px 12px', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, color: colors.text, fontFamily: fonts.body, fontSize: 12, outline: 'none', resize: 'none', marginBottom: 12 }} />
            <button disabled={!checkinMood || checkinSaving} onClick={() => { clearTimeout(checkinSaveRef.current); saveCheckin().then(ok => { if (ok) setCheckinEditMode(false) }) }}
              style={{
                ...btnPrimary,
                width: '100%', padding: 13,
                opacity: checkinMood ? 1 : 0.4,
                cursor: checkinMood && !checkinSaving ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {checkinSaving ? (<><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: colors.onGold, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />{ht('saving')}</>)
                : checkinSaved ? ht('update') : ht('validateCheckin')}
            </button>
          </div>
          </>
        )}
      </div>

      <div style={{ padding: '8px 24px 16px', display: 'flex', flexDirection: 'column' }}>

        {/* ═══ PROGRESSION (streak + weight + XP) ═══ */}
        <SectionTitle noPadding title={ht('progression')} action={{ label: ht('details'), onClick: () => setActiveTab('progress') }} />
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}>
          {/* Streak */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Flame size={22} color={GOLD} fill={GOLD} style={{ opacity: 0.8 }} />
              <div>
                <div style={{ ...statStyle, fontSize: 24, letterSpacing: '-0.02em' }}>{ht('streakDays', { count: streak })}</div>
                <div style={{ ...mutedStyle, fontSize: 10 }}>{ht('activeStreak')}</div>
              </div>
            </div>
            {currentWeight && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...statStyle, fontSize: 24, lineHeight: 1 }}>{currentWeight} <span style={{ fontSize: 12, color: TEXT_MUTED }}>KG</span></div>
                {goalWeight && <div style={{ ...mutedStyle, fontSize: 10 }}>{ht('goal', { weight: goalWeight })} {objLabel === 'bulk' ? '\u2197' : objLabel === 'cut' ? '\u2198' : '\u2192'}</div>}
              </div>
            )}
          </div>
          {/* Assiduity dots */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              {barData.map((b, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...(b.value
                      ? { background: `linear-gradient(180deg, ${GOLD}, ${colors.goldContainer})`, color: colors.onGold, fontSize: 15, fontWeight: 700, boxShadow: b.isToday ? `0 0 12px ${colors.goldDim}` : 'none' }
                      : { border: `1.5px solid ${colors.divider}`, color: colors.textDim, fontSize: 12 }),
                    transition: 'all 0.3s ease',
                  }}>{b.value ? '✓' : '·'}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: b.isToday ? GOLD : TEXT_MUTED, letterSpacing: '0.05em' }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* ═══ PROCHAINE SEANCE — invited clients only ═══ */}
        {!aiAllowed && coachProgram && nextSession && (
          <div>
            <SectionTitle noPadding title={ht('nextSession')} />
            <div style={{ ...cardStyle, background: colors.surface2, border: `1px solid ${colors.divider}`, padding: 20 }}>
              <div style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: colors.gold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                {ht('suggestedForYou')}
              </div>
              <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 700, color: colors.text, letterSpacing: 1, marginBottom: 4 }}>
                {(nextSession.day.name || 'Seance').toUpperCase()}
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
                {ht('exerciseCount', { count: nextSession.day.exercises?.length || 0 })}
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDim, fontStyle: 'italic', marginBottom: 16 }}>
                {nextSession.reason}
              </div>
              <button
                onClick={() => startProgramWorkout(nextSession.day, nextSession.day.exercises || [], nextSession.weekday)}
                style={{ ...btnPrimary, width: '100%', padding: 14, borderRadius: 14 }}
              >
                {ht('launchNow')}
              </button>
            </div>
          </div>
        )}

        {/* ═══ TA SEMAINE — invited clients only ═══ */}
        {!aiAllowed && coachProgram && (
          <div>
            <SectionTitle noPadding title={ht('yourWeek')} />
            <div data-no-tab-swipe="true" style={{ ...cardStyle, background: colors.surface2, border: `1px solid ${colors.divider}`, padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {(['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const).map((dayKey, idx) => {
                  const label = ht(dayKey)
                  const jsDay = new Date().getDay()
                  const todayIdx = jsDay === 0 ? 6 : jsDay - 1
                  const isToday = idx === todayIdx
                  const completed = completedThisWeek?.has(idx)
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 4px',
                        textAlign: 'center',
                        borderRadius: 10,
                        background: completed ? colors.goldDim : 'rgba(255,255,255,0.02)',
                        border: isToday ? `1.5px solid ${colors.gold}` : '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: isToday ? colors.gold : colors.textMuted, letterSpacing: 0.5 }}>{label}</div>
                      <div style={{ fontSize: 18, marginTop: 4, color: completed ? colors.gold : colors.textDim }}>
                        {completed ? '✓' : '·'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PHRASE MOTIVANTE (closer) ═══ */}
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          {/* Stats perso */}
          <div style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: colors.textDim, textTransform: 'uppercase', marginBottom: 6 }}>
            {ht('closerLabel')}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontFamily: fonts.headline, fontSize: 64, color: colors.gold }}>{completedSessions}</span>
            <span style={{ fontFamily: fonts.alt, fontSize: 16, fontWeight: 700, color: colors.gold, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{ht('closerSessions')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16, fontFamily: fonts.alt, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: colors.textDim, textTransform: 'uppercase' }}>
            <span>{ht('closerLevel')} <span style={{ color: colors.gold }}>{getLevelFromXP(xpData?.total_xp ?? 0).level}</span></span>
            <span style={{ color: colors.textDim, opacity: 0.4 }}>·</span>
            <span><span style={{ color: colors.gold }}>{streak}</span> {ht('closerStreakDays')}</span>
          </div>
          <div style={{ height: 22 }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 30, height: 1, background: 'rgba(201,168,76,0.4)' }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill={colors.gold}><path d="M12 2l2.5 7.5H22l-6 4.5 2.5 7.5-6-4.5-6 4.5 2.5-7.5-6-4.5h7.5z" /></svg>
            <div style={{ width: 30, height: 1, background: 'rgba(201,168,76,0.4)' }} />
          </div>
          <p style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 500, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, letterSpacing: '0.01em', margin: 0, maxWidth: 320, marginInline: 'auto' }}>
            &ldquo;{dailyQuote}&rdquo;
          </p>
          <p style={{ fontSize: 10, color: 'rgba(201,168,76,0.6)', letterSpacing: '0.15em', marginTop: 10, textTransform: 'uppercase', fontWeight: 700, margin: '10px 0 0' }}>
            — MOOVX MINDSET
          </p>
        </div>

        <div style={{ height: 20 }} />
      </div>

      {/* ═══ LEVEL MODAL PLACEHOLDER ═══ */}
      {showLevelModal && (
        <div style={modalOverlay} onClick={() => setShowLevelModal(false)}>
          <div style={{ ...modalContainer, padding: 24, maxWidth: 340, margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...titleStyle, fontSize: 14 }}>{ht('levelTitle')}</h2>
            <p style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', margin: 0, fontFamily: fonts.body }}>
              {ht('levelDesc')}
            </p>
            <button onClick={() => setShowLevelModal(false)} style={{ ...btnPrimaryStyle, padding: '12px 32px', fontSize: 13 }}>
              {ht('levelClose')}
            </button>
          </div>
        </div>
      )}

      {/* ═══ RECOVERY MODAL ═══ */}
      {showRecoveryModal && (
        <RecoveryModal
          muscleStatus={muscleStatus}
          onClose={() => setShowRecoveryModal(false)}
        />
      )}

      <SessionDoneModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        supabase={supabase}
        userId={session?.user?.id ?? ''}
        sessionId={todaySession?.id ?? null}
        sessionTitle={sessionTitle}
        todayKey={todayKey}
        coachProgram={coachProgram}
      />
    </div>
  )
}
