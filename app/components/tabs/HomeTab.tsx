'use client'
import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Ruler, Camera, Zap, Moon, CheckCircle, Flame, Dumbbell, TrendingUp, Droplets,
} from 'lucide-react'
import ExercisePreview from '../ExercisePreview'
import { getTodaySession, getSessionForDay } from '../../../lib/get-today-session'
import { toast } from 'sonner'
import { resolveSessionType } from '../../../lib/session-types'
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
import RecoveryModal from '../home/modals/RecoveryModal'
import { modalOverlay, modalContainer, btnPrimary as btnPrimaryStyle } from '../../../lib/design-tokens'

const QUOTES: Record<string, string[]> = {
  bulk: [
    'Chaque calorie compte. Tu construis la meilleure version de toi-meme.',
    'La masse se construit jour apres jour, rep apres rep.',
    'Ton corps est une machine — donne-lui le carburant qu\'il merite.',
    'Aujourd\'hui tu plantes, demain tu recoltes.',
    'Chaque repas est une brique de plus dans ta construction.',
    'Le volume d\'aujourd\'hui, c\'est la force de demain.',
    'Les resultats viennent a ceux qui persistent.',
    'Mange pour performer, pas pour survivre.',
    'Le gain est un marathon, pas un sprint.',
    'La discipline bat la motivation chaque jour de la semaine.',
    'Ton futur toi te remerciera pour l\'effort d\'aujourd\'hui.',
    'Construis le physique que tu merites.',
    'La progression silencieuse est la plus puissante.',
    'Le fer ne ment jamais. Le travail paie toujours.',
    'La croissance commence la ou le confort s\'arrete.',
  ],
  cut: [
    'Chaque jour de discipline te rapproche de la definition parfaite.',
    'La seche, c\'est reveler le chef-d\'oeuvre que tu as construit.',
    'Le sacrifice temporaire pour un resultat permanent.',
    'Ta discipline d\'aujourd\'hui est ta fierte de demain.',
    'Brule les doutes, pas juste les calories.',
    'Chaque choix alimentaire est un vote pour ton objectif.',
    'Le gras part, le muscle reste. Continue.',
    'Tu n\'es pas au regime. Tu es en transformation.',
    'Les abdos se revelent a ceux qui persistent.',
    'Transforme la sueur en resultats.',
    'Tu es plus fort que tes envies.',
    'Reste focus. Le resultat arrive.',
    'La version shredded de toi est juste derriere l\'effort.',
    'Controle ton assiette, controle ta transformation.',
    'La douleur est temporaire. Le regret est eternel.',
  ],
  maintain: [
    'L\'equilibre est le vrai luxe. Tu l\'as trouve.',
    'Maintenir, c\'est maitriser. Tu controles ton physique.',
    'La constance silencieuse est la plus grande force.',
    'Le maintien est l\'art de la regularite.',
    'Ton corps est une oeuvre achevee. Entretiens-la.',
    'Le vrai succes, c\'est maintenir ce que tu as gagne.',
    'L\'excellence, c\'est la regularite.',
    'Tu as atteint ton objectif. Maintenant, tiens-le.',
    'Profite du trajet, pas seulement de la destination.',
    'Tu es exactement la ou tu dois etre.',
    'Ta routine est ta superpuissance.',
    'Le physique se maintient comme une montre suisse — avec precision.',
    'La regularite bat l\'intensite sur le long terme.',
    'Continue comme ca. Tu es sur la bonne voie.',
    'La meilleure version de toi se construit chaque jour.',
  ],
}

function getDailyQuote(objective?: string): string {
  const key = (objective === 'weight_loss' || objective === 'seche') ? 'cut'
    : (objective === 'mass' || objective === 'bulk') ? 'bulk' : 'maintain'
  const quotes = QUOTES[key]
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return quotes[dayOfYear % quotes.length]
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
}

export default function HomeTab({
  supabase, session, profile, displayAvatar, firstName,
  avatarRef, photoRef, uploadAvatar, uploadProgressPhoto,
  currentWeight, goalWeight, completedSessions, streak,
  coachProgram, coachMealPlan, todayKey, todayCoachDay,
  setActiveTab, setModal, startProgramWorkout,
  completedThisWeek, aiAllowed, nextSession,
}: HomeTabProps) {
  const [showLevelModal, setShowLevelModal] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [todaySession, setTodaySession] = useState<{ id: string; created_at: string } | null>(null)
  const [consumedKcal, setConsumedKcal] = useState(0)
  const calorieGoal = profile?.calorie_goal || 2000
  const [waterToday, setWaterToday] = useState(0)

  // Mini analytics state
  const [weightData, setWeightData] = useState<{ date: string; poids: number }[]>([])
  const [caloriesWeekData, setCaloriesWeekData] = useState<{ day: string; calories: number }[]>([])
  const [weekVolume, setWeekVolume] = useState(0)
  const [weekSessions, setWeekSessions] = useState(0)
  const [xpData, setXpData] = useState<{ total_xp: number; current_streak: number } | null>(null)
  const [muscleStatus, setMuscleStatus] = useState<Record<string, number>>({})
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
  }, [session?.user?.id])

  // Fetch water
  useEffect(() => {
    if (!session?.user?.id) return
    const today = new Date().toISOString().split('T')[0]
    supabase.from('water_intake').select('amount_ml').eq('user_id', session.user.id).eq('date', today).limit(50)
      .then(({ data }: any) => {
        setWaterToday((data || []).reduce((s: number, r: any) => s + (r.amount_ml || 0), 0))
      })
  }, [session?.user?.id])

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
  }, [session?.user?.id])

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
          day: new Date(day + 'T12:00:00').toLocaleDateString('fr-CH', { weekday: 'short' }),
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
            setCustomDayName('Repos')
            setCustomIsRest(true)
            setCustomProgramExercises([]) // empty array, not null — prevents coach fallthrough
            // Find next workout day
            const todayIdx = session.dayIndex
            for (let offset = 1; offset <= 6; offset++) {
              const nextIdx = (todayIdx + offset) % 7
              const nextSession = getSessionForDay(data.days, nextIdx)
              if (nextSession.type === 'workout') {
                const dayNames = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
                setNextSessionLabel(`${nextSession.name} — ${offset === 1 ? 'demain' : dayNames[nextIdx]}`)
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
    supabase.from('user_xp').select('total_xp, current_streak').eq('user_id', userId).maybeSingle()
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

    // Fetch today's mood check-in
    supabase.from('daily_checkins').select('*').eq('user_id', userId).eq('date', todayDate).maybeSingle()
      .then(({ data, error }: any) => {
        if (error) console.error('[CheckIn] Fetch error:', error.message, '— Table may not exist. Run the migration in Supabase.')
        if (data) { setCheckinMood(data.mood); setCheckinNote(data.note || ''); setCheckinSleep(data.sleep_hours?.toString() || ''); setCheckinSaved(true) }
      })
    // Fetch last 7 days check-ins for mini-timeline
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
    supabase.from('daily_checkins').select('date, mood, sleep_hours').eq('user_id', userId).gte('date', weekAgo).order('date')
      .then(({ data }: any) => setLast7Checkins(data || []))
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
      toast.error(`Erreur check-in: ${error.message}`)
      return false
    }
    if (!checkinSaved) { try { await addXP(session.user.id, 10, supabase) } catch {} }
    setCheckinSaved(true); setCheckinModified(false)
    setLastSavedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
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
  const rawSessionTitle = customIsRest ? 'Repos' : (customDayName || todayScheduledSession?.title || todayCoachDay?.nom || todayCoachDay?.name || (todayExercises.length > 0 ? `${todayExercises[0]?.muscle_group || 'Entraînement'} du jour` : 'Séance du jour'))
  const sessionTypeInfo = resolveSessionType(rawSessionTitle)
  const sessionTitle = rawSessionTitle
  // Has workout today: custom program says rest → no. Otherwise check exercises exist.
  const hasWorkoutToday = !customIsRest && (!!todayScheduledSession || (customProgramExercises && customProgramExercises.length > 0))

  const heroState: HeroState = (() => {
    if (!coachProgram && !customProgramExercises && !todayScheduledSession) return 'no-program'
    if (!hasWorkoutToday && (customIsRest || customDayName === 'Repos' || todayCoachDay?.repos)) return 'rest'
    if (!todayExercises.length) return 'no-exercises'
    if (todaySession) return 'done'
    return 'active'
  })()

  // Weekly bar chart data
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const todayDow = new Date().getDay() // 0=Sun
  const barData = dayLabels.map((d, i) => {
    const match = caloriesWeekData[i]
    return { label: d, value: match?.calories || 0, isToday: i === (todayDow === 0 ? 6 : todayDow - 1) }
  })
  const barMax = Math.max(1, ...barData.map(b => b.value))

  // Objective label
  const objLabel = profile?.objective === 'weight_loss' || profile?.objective === 'seche' ? 'cut'
    : profile?.objective === 'mass' || profile?.objective === 'bulk' ? 'bulk' : 'maintain'

  // Card title style from centralized design system
  const T = titleStyle

  return (
    <div style={{ background: colors.background, minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />

      {/* ═══ HOME HEADER ═══ */}
      <HomeHeader
        firstName={firstName}
        displayAvatar={displayAvatar}
        level={getLevelFromXP(xpData?.total_xp ?? 0).level}
        streak={streak}
        onLevelClick={() => setShowLevelModal(true)}
      />

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
        onViewDetail={() => setActiveTab('progress')}
      />

      {/* ═══ APERÇU DU JOUR — 3 cards grid (moved up from below) ═══ */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: colors.textDim, textTransform: 'uppercase', margin: 0 }}>
            Apercu du jour
          </h2>
          <button onClick={() => setActiveTab('progress')} aria-label="Voir tous les details"
            style={{ background: 'transparent', border: 'none', fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: colors.gold, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            &rsaquo;
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <EnergyCard consumedKcal={consumedKcal} calorieGoal={calorieGoal} weekData={caloriesWeekData} />
          <RecoveryCard muscleStatus={muscleStatus} onCardClick={() => setShowRecoveryModal(true)} />
          <NutritionCard consumedKcal={consumedKcal} calorieGoal={calorieGoal} proteinGoal={profile?.protein_goal} carbsGoal={profile?.carbs_goal} fatGoal={profile?.fat_goal} />
        </div>

        {/* ═══ HYDRATATION ═══ */}
        <div style={{ marginTop: 12, background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <Droplets size={18} color={colors.blue} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: colors.textDim, textTransform: 'uppercase' }}>HYDRATATION</div>
            <div style={{ fontFamily: fonts.headline, fontSize: 16, color: colors.gold }}>{(waterToday / 1000).toFixed(1)}L <span style={{ fontSize: 11, color: colors.textMuted }}>/ {((profile?.water_goal || 3000) / 1000).toFixed(1)}L</span></div>
          </div>
          <button onClick={() => addWater(250)} className="active:scale-95" style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: colors.blue, fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', cursor: 'pointer', transition: 'all 0.15s' }}>+250ML</button>
        </div>
      </div>

      {/* ═══ CHECK-IN — COMPACT (saved) or FULL (editing) ═══ */}
      <div style={{ padding: '0 24px' }}>
        {checkinSaved && !checkinEditMode ? (
          /* ── COMPACT CARD: week calendar ── */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, color: colors.gold, letterSpacing: '0.15em', margin: 0 }}>MON BIEN-ETRE</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.25)' }} />
              <button onClick={() => setActiveTab('progress')} style={{ background: 'transparent', border: 'none', fontSize: 10, fontWeight: 700, color: colors.gold, letterSpacing: '0.12em', cursor: 'pointer', padding: '4px 0' }}>VOIR TOUT →</button>
            </div>
            <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 12 }}>
                {(() => {
                  const moodIcon = (m: string) => ({ fatigue: '😴', normal: '😐', bien: '💪', top: '🔥', energie: '⚡' } as any)[m] || '—'
                  const days: any[] = []
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(Date.now() - i * 86400000)
                    const ds = d.toISOString().split('T')[0]
                    const c = last7Checkins.find((x: any) => x.date === ds)
                    days.push({ ds, day: d.toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase(), isToday: i === 0, c })
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
              <button onClick={() => setCheckinEditMode(true)} style={{ width: '100%', padding: '8px 0', background: 'transparent', border: 'none', color: 'rgba(201,168,76,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>MODIFIER AUJOURD&apos;HUI</button>
            </div>
          </>
        ) : (
          /* ── FULL CHECK-IN CARD ── */
          <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: colors.gold }}>CHECK-IN DU JOUR</div>
              {checkinSaved && <button onClick={() => setCheckinEditMode(false)} style={{ background: 'transparent', border: 'none', fontSize: 10, fontWeight: 700, color: colors.textDim, cursor: 'pointer', padding: '2px 6px' }}>FERMER</button>}
            </div>
            <div style={{ height: 1, background: 'rgba(201,168,76,0.1)', margin: '8px 0 14px' }} />
            <div style={{ fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>Comment te sens-tu aujourd&apos;hui ?</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
              {[
                { id: 'fatigue', icon: '😴', label: 'Fatigue' },
                { id: 'normal', icon: '😐', label: 'Normal' },
                { id: 'bien', icon: '💪', label: 'Bien' },
                { id: 'top', icon: '🔥', label: 'Top' },
                { id: 'energie', icon: '⚡', label: 'Energie' },
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
              <span style={{ fontFamily: fonts.body, fontSize: 9, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>SOMMEIL</span>
              <input type="number" step="0.5" min="0" max="14" placeholder="7.5" value={checkinSleep} onChange={e => setCheckinSleep(e.target.value)}
                style={{ width: 60, padding: '7px 8px', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, color: colors.text, fontFamily: fonts.headline, fontSize: 16, textAlign: 'center', outline: 'none' }} />
              <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDim }}>h</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: colors.gold, width: `${Math.min(100, (parseFloat(checkinSleep) || 0) / 8 * 100)}%`, transition: 'width 300ms' }} />
              </div>
              <span style={{ fontFamily: fonts.body, fontSize: 9, color: colors.textDim, flexShrink: 0 }}>/ 8h</span>
            </div>
            <textarea value={checkinNote} onChange={e => setCheckinNote(e.target.value.slice(0, 200))} placeholder="Note pour ton coach (optionnel)..." rows={2} maxLength={200}
              style={{ width: '100%', padding: '8px 12px', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, color: colors.text, fontFamily: fonts.body, fontSize: 12, outline: 'none', resize: 'none', marginBottom: 12 }} />
            <button disabled={!checkinMood || checkinSaving} onClick={() => { clearTimeout(checkinSaveRef.current); saveCheckin().then(ok => { if (ok) setCheckinEditMode(false) }) }}
              style={{
                width: '100%', padding: 13, borderRadius: 14, border: 'none', cursor: checkinMood && !checkinSaving ? 'pointer' : 'not-allowed',
                opacity: checkinMood ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`, color: '#0D0B08',
              }}>
              {checkinSaving ? (<><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#0D0B08', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />SAUVEGARDE...</>)
                : checkinSaved ? 'METTRE A JOUR' : 'VALIDER LE CHECK-IN'}
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '8px 24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ═══ PROGRESSION (streak + weight + XP) ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={T}>Progression</span>
          <div style={titleLineStyle} />
          <button onClick={() => setActiveTab('progress')} style={{ ...labelStyle, fontSize: 10, flexShrink: 0 }}>Details</button>
        </div>
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}>
          {/* Streak */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Flame size={22} color={GOLD} fill={GOLD} style={{ opacity: 0.8 }} />
              <div>
                <div style={{ ...statStyle, fontSize: 24, letterSpacing: '-0.02em' }}>{streak} JOUR{streak > 1 ? 'S' : ''}</div>
                <div style={{ ...mutedStyle, fontSize: 10 }}>Streak actif</div>
              </div>
            </div>
            {currentWeight && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...statStyle, fontSize: 24, lineHeight: 1 }}>{currentWeight} <span style={{ fontSize: 12, color: TEXT_MUTED }}>KG</span></div>
                {goalWeight && <div style={{ ...mutedStyle, fontSize: 10 }}>Objectif : {goalWeight} kg {objLabel === 'bulk' ? '\u2197' : objLabel === 'cut' ? '\u2198' : '\u2192'}</div>}
              </div>
            )}
          </div>
          {/* XP bar */}
          {(() => {
            const xp = xpData?.total_xp || 0
            const { level, xpForNext, xpInLevel, progress } = getLevelFromXP(xp)
            const title = getLevelTitle(level)
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: fonts.body, fontSize: 9, fontWeight: 700, color: colors.gold, letterSpacing: '0.1em', textTransform: 'uppercase' }}>LV.{level} — {title}</span>
                  <span style={{ ...mutedStyle, fontSize: 10 }}>{xpInLevel} / {xpForNext} XP</span>
                </div>
                <div style={{ width: '100%', height: 6, borderRadius: 3, background: colors.surfaceHigh, overflow: 'hidden' }}>
                  <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #D4A843, #E8C97A)', transition: 'width 1s ease' }} />
                </div>
              </div>
            )
          })()}
          {/* Performance bar chart */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 60, gap: 6 }}>
              {barData.map((b, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', height: Math.max(4, (b.value / barMax) * 50), borderRadius: 999, background: b.isToday ? `linear-gradient(180deg, ${GOLD}, ${colors.goldContainer})` : colors.surfaceHigh, boxShadow: b.isToday ? `0 0 12px ${colors.goldDim}` : 'none', transition: 'height 0.5s ease' }} />
                  <span style={{ fontSize: 8, fontWeight: 700, color: b.isToday ? GOLD : TEXT_MUTED }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* ═══ PROCHAINE SEANCE — invited clients only ═══ */}
        {!aiAllowed && coachProgram && nextSession && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={titleStyle}>PROCHAINE SEANCE</span>
              <div style={titleLineStyle} />
            </div>
            <div style={{ ...cardStyle, background: colors.surface2, border: `1px solid ${colors.divider}`, padding: 20 }}>
              <div style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: colors.gold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                {"SUGGERE POUR TOI"}
              </div>
              <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 700, color: colors.text, letterSpacing: 1, marginBottom: 4 }}>
                {(nextSession.day.name || 'Seance').toUpperCase()}
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
                {nextSession.day.exercises?.length || 0} exercice{(nextSession.day.exercises?.length || 0) > 1 ? 's' : ''}
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDim, fontStyle: 'italic', marginBottom: 16 }}>
                {nextSession.reason}
              </div>
              <button
                onClick={() => startProgramWorkout(nextSession.day, nextSession.day.exercises || [], nextSession.weekday)}
                style={{ ...btnPrimary, width: '100%', padding: 14, borderRadius: 14 }}
              >
                LANCER MAINTENANT
              </button>
            </div>
          </div>
        )}

        {/* ═══ TA SEMAINE — invited clients only ═══ */}
        {!aiAllowed && coachProgram && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={titleStyle}>TA SEMAINE</span>
              <div style={titleLineStyle} />
            </div>
            <div style={{ ...cardStyle, background: colors.surface2, border: `1px solid ${colors.divider}`, padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label, idx) => {
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 30, height: 1, background: 'rgba(201,168,76,0.4)' }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill={colors.gold}><path d="M12 2l2.5 7.5H22l-6 4.5 2.5 7.5-6-4.5-6 4.5 2.5-7.5-6-4.5h7.5z" /></svg>
            <div style={{ width: 30, height: 1, background: 'rgba(201,168,76,0.4)' }} />
          </div>
          <p style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 500, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, letterSpacing: '0.01em', margin: 0, maxWidth: 320, marginInline: 'auto' }}>
            &ldquo;{getDailyQuote(profile?.objective)}&rdquo;
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
            <h2 style={{ ...titleStyle, fontSize: 14 }}>Mon niveau</h2>
            <p style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', margin: 0, fontFamily: fonts.body }}>
              Details XP, prochains paliers et achievements arrivent bientot.
            </p>
            <button onClick={() => setShowLevelModal(false)} style={{ ...btnPrimaryStyle, padding: '12px 32px', fontSize: 13 }}>
              Fermer
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
    </div>
  )
}
