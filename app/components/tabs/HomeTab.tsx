'use client'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Ruler, Camera, Zap, Moon, CheckCircle, Flame, Dumbbell, TrendingUp, Droplets,
} from 'lucide-react'
import ExercisePreview from '../ExercisePreview'
import { getTodaySession } from '../../../lib/get-today-session'
import { resolveSessionType } from '../../../lib/session-types'
import {
  colors, fonts, cardStyle, titleStyle, statStyle, statSmallStyle, bodyStyle, labelStyle, mutedStyle, subtitleStyle, pageTitleStyle, btnPrimary, todayNutritionKey,
} from '../../../lib/design-tokens'
const GOLD = colors.gold
const TEXT_PRIMARY = colors.text
const TEXT_MUTED = colors.textMuted
import SwissBadge from '../ui/SwissBadge'
import MuscleHeatMap, { calculateMuscleStatus } from '../ui/MuscleHeatMap'
import { getLevelFromXP, getLevelTitle, addXP } from '../../../lib/gamification'

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
  startProgramWorkout: (day: any, exercises: any[]) => void
}

export default function HomeTab({
  supabase, session, profile, displayAvatar, firstName,
  avatarRef, photoRef, uploadAvatar, uploadProgressPhoto,
  currentWeight, goalWeight, completedSessions, streak,
  coachProgram, coachMealPlan, todayKey, todayCoachDay,
  setActiveTab, setModal, startProgramWorkout,
}: HomeTabProps) {
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
  const [customProgramExercises, setCustomProgramExercises] = useState<any[] | null>(null)
  const [customDayName, setCustomDayName] = useState<string | null>(null)
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
          } else {
            setCustomProgramExercises(session.exercises)
            setCustomDayName(session.name)
          }
        }
      })

    // Fetch today's scheduled session (same source as Training page calendar)
    const todayDateStr = new Date().toISOString().split('T')[0]
    supabase.from('scheduled_sessions').select('id, title, session_type, completed')
      .eq('user_id', userId).eq('scheduled_date', todayDateStr)
      .neq('session_type', 'rest').limit(1).maybeSingle()
      .then(({ data }: any) => { if (data) setTodayScheduledSession(data) })

    // Fetch XP data
    supabase.from('user_xp').select('total_xp, current_streak').eq('user_id', userId).maybeSingle()
      .then(({ data }: any) => { if (data) setXpData(data) })

    // Fetch muscle status from recent workout sets
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    supabase.from('workout_sets').select('exercise_name, created_at').eq('user_id', userId).gte('created_at', threeDaysAgo).limit(200)
      .then(({ data }: any) => { if (data) setMuscleStatus(calculateMuscleStatus(data)) })

    // Fetch today's habit check-in
    const todayDate = new Date().toISOString().split('T')[0]
    supabase.from('daily_habits').select('*').eq('user_id', userId).eq('date', todayDate).maybeSingle()
      .then(({ data }: any) => { if (data) setTodayHabit(data) })
  }, [session?.user?.id])

  const calPct = calorieGoal > 0 ? Math.min(100, Math.round((consumedKcal / calorieGoal) * 100)) : 0
  // Ring values used by MetallicRing via calPct

  // Custom program exercises take priority over coach program
  const todayExercises = customProgramExercises || todayCoachDay?.exercises || []
  // Session title: scheduled session > custom program > coach program
  const rawSessionTitle = todayScheduledSession?.title || customDayName || todayCoachDay?.nom || todayCoachDay?.name || (todayExercises.length > 0 ? `${todayExercises[0]?.muscle_group || 'Entraînement'} du jour` : 'Séance du jour')
  const sessionTypeInfo = resolveSessionType(rawSessionTitle)
  const sessionTitle = rawSessionTitle
  // Has workout today: scheduled session exists (not rest) OR custom program has exercises
  const hasWorkoutToday = !!todayScheduledSession || (customProgramExercises && customProgramExercises.length > 0)

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

      {/* ═══ LOGO + CITATION ═══ */}
      <div style={{ padding: '12px 24px 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Image src="/logo-moovx.png" alt="MoovX" width={120} height={40} style={{ objectFit: 'contain' }} priority />
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
          &ldquo;{getDailyQuote(profile?.objective)}&rdquo;
        </div>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ═══ HERO DIORAMA — Stitch floating stats ═══ */}
        <div style={{ position: 'relative', width: '100%', height: 280, background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          {/* Background bar chart faint */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.08, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 32px 16px' }}>
            {[40, 60, 35, 80, 50].map((h, i) => <div key={i} style={{ width: 24, height: `${h}%`, background: GOLD, borderRadius: '8px 8px 0 0' }} />)}
          </div>
          {/* Calorie ring center */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 120, height: 120 }}>
              <svg viewBox="0 0 140 140" width={120} height={120} style={{ filter: 'drop-shadow(0 0 10px rgba(212,168,67,0.12))', transform: 'rotate(-90deg)' }}>
                <defs>
                  <linearGradient id="heroGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={colors.gold} /><stop offset="100%" stopColor={colors.goldContainer} />
                  </linearGradient>
                </defs>
                <circle cx="70" cy="70" r="56" fill="none" stroke="#2a2a2a" strokeWidth="6" />
                <circle cx="70" cy="70" r="56" fill="none" stroke="url(#heroGold)" strokeWidth="6" strokeLinecap="round" strokeDasharray="351.86" strokeDashoffset={351.86 * (1 - calPct / 100)} style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={statStyle}>{consumedKcal}</span>
                <span style={{ ...subtitleStyle, fontSize: 9, letterSpacing: 2 }}>kcal</span>
              </div>
            </div>
          </div>
          {/* Floating stat: Daily Burn — top left */}
          <div style={{ position: 'absolute', top: 20, left: 20, padding: '12px 16px', background: 'rgba(32,31,31,0.6)', backdropFilter: 'blur(24px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flame size={12} color={GOLD} />
              <span style={T}>Objectif</span>
            </div>
            <div style={{ ...statStyle, fontSize: 22, marginTop: 4 }}>
              {calorieGoal} <span style={{ fontSize: 11, fontWeight: 400, color: TEXT_MUTED }}>kcal</span>
            </div>
          </div>
          {/* Floating stat: Volume — bottom right */}
          <div style={{ position: 'absolute', bottom: 36, right: 20, padding: '12px 16px', background: 'rgba(32,31,31,0.6)', backdropFilter: 'blur(24px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Dumbbell size={12} color={GOLD} />
              <span style={T}>Volume</span>
            </div>
            <div style={{ ...statStyle, fontSize: 22, marginTop: 4 }}>
              {weekSessions} <span style={{ fontSize: 11, fontWeight: 400, color: TEXT_MUTED }}>séances</span>
            </div>
          </div>
        </div>

        {/* ═══ BENTO STATS — Active Energy + Hydration ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Active Energy */}
          <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', aspectRatio: '1', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <div>
              <span style={T}>Énergie</span>
              <div style={{ ...statStyle, marginTop: 4 }}>{calPct}%</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Zap size={40} color={GOLD} fill={GOLD} opacity={0.6} />
            </div>
          </div>
          {/* Hydration */}
          <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', aspectRatio: '1', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <div>
              <span style={T}>Hydratation</span>
              <div style={{ ...statStyle, marginTop: 4 }}>
                {(waterToday / 1000).toFixed(1)} <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_MUTED }}>L</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 48 }}>
              {[60, 80, 40, 95, 20].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '4px 4px 0 0', background: i === 3 ? `linear-gradient(180deg, ${GOLD}, ${colors.goldContainer})` : '#2a2a2a', transition: 'height 0.5s ease' }} />
              ))}
            </div>
          </div>
        </div>

        {/* ═══ STREAK CARD — Stitch "ON FIRE" ═══ */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={T}>On Fire</span>
            </div>
            <div style={{ ...statStyle, fontSize: 30, letterSpacing: '-0.02em' }}>
              {streak} JOUR{streak > 1 ? 'S' : ''} STREAK
            </div>
            <p style={{ ...bodyStyle, fontSize: 13, marginTop: 6, maxWidth: 200, lineHeight: 1.4 }}>
              Continue pour débloquer le badge &ldquo;Titan&rdquo;.
            </p>
          </div>
          <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '33%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
            <Flame size={100} color={GOLD} />
          </div>
        </div>

        {/* ═══ WEIGHT + OBJECTIVE CARD ═══ */}
        {currentWeight && (
          <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <div>
              <div style={{ ...T, marginBottom: 4 }}>
                {objLabel === 'bulk' && 'PRISE DE MASSE'}
                {objLabel === 'cut' && 'SÈCHE'}
                {objLabel === 'maintain' && 'MAINTIEN'}
              </div>
              <div style={{ ...statStyle, fontSize: 32, lineHeight: 1 }}>
                {currentWeight} <span style={{ fontSize: 16, color: colors.textMuted }}>KG</span>
              </div>
            </div>
            {goalWeight && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...subtitleStyle, fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>OBJECTIF</div>
                <div style={{ ...statStyle, fontSize: 28, color: colors.gold, lineHeight: 1 }}>
                  {goalWeight} <span style={{ fontSize: 14, color: colors.textMuted }}>KG</span>
                </div>
              </div>
            )}
            <div style={{ ...statSmallStyle, color: objLabel === 'bulk' ? colors.gold : objLabel === 'cut' ? colors.gold : colors.success }}>
              {objLabel === 'bulk' ? '\u2197' : objLabel === 'cut' ? '\u2198' : '\u2192'}
            </div>
          </div>
        )}

        {/* ═══ XP BAR ═══ */}
        {(() => {
          const xp = xpData?.total_xp || 0
          const { level, xpForNext, xpInLevel, progress } = getLevelFromXP(xp)
          const title = getLevelTitle(level)
          return (
            <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={T}>LV.{level} — {title}</span>
                </div>
                <span style={{ ...mutedStyle, fontSize: 11 }}>{xpInLevel} / {xpForNext} XP</span>
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: colors.surfaceHigh, overflow: 'hidden' }}>
                <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #D4A843, #E8C97A)', transition: 'width 1s ease' }} />
              </div>
            </div>
          )
        })()}

        {/* ═══ COACH BANNER ═══ */}
        <div style={{ position: 'relative', width: '100%', height: 120, borderRadius: 16, overflow: 'hidden', border: `1px solid ${colors.goldBorder}`, cursor: 'pointer' }}>
          <img src="/images/hero-coaching.webp" alt="Coaching personnalise" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(13,11,8,0.92) 0%, rgba(13,11,8,0.5) 50%, rgba(13,11,8,0.15) 100%)' }} />
          <div style={{ position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)' }}>
            <div style={{ ...T, marginBottom: 3 }}>Coaching personnel</div>
            <div style={{ ...statSmallStyle, fontWeight: 800, color: colors.text, letterSpacing: '0.05em', lineHeight: 1.15 }}>VOTRE COACH<br />VOUS ACCOMPAGNE</div>
          </div>
        </div>

        {/* ═══ PROGRAMME — Title with line ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: -4 }}>
          <span style={T}>PROGRAMME</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(212,168,67,0.25), transparent)' }} />
          <button onClick={() => setActiveTab('training')} style={{ ...labelStyle, fontSize: 10, letterSpacing: 1 }}>Voir tout</button>
        </div>

        {/* ═══ SÉANCE DU JOUR ═══ */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, position: 'relative', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
          {/* Background image overlay */}
          <div style={{ height: todayExercises.length > 0 && !todaySession ? 160 : 0, position: 'relative', overflow: 'hidden' }}>
            {todayExercises.length > 0 && !todaySession && (
              <>
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 0%, ${colors.surface} 100%)`, zIndex: 1 }} />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${colors.goldDim} 0%, transparent 60%)` }} />
                <img src="/images/stitch-gym.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, filter: 'grayscale(100%)' }} />
              </>
            )}
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, background: colors.gold, padding: '4px 12px' }}>
              <span style={{ fontFamily: fonts.body, fontSize: 10, fontWeight: 700, color: '#0D0B08', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Séance du jour</span>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {!coachProgram && !customProgramExercises && !todayScheduledSession ? (
              <p style={{ ...bodyStyle, margin: 0, fontStyle: 'italic' }}>Cree ton programme dans l&apos;onglet Entrainement.</p>
            ) : !hasWorkoutToday && (customDayName === 'Repos' || todayCoachDay?.repos) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Moon size={24} color={colors.textMuted} />
                <div>
                  <div style={T}>JOUR DE REPOS</div>
                  <div style={mutedStyle}>Récupère bien, étirements bienvenus</div>
                </div>
              </div>
            ) : !todayExercises.length ? (
              <p style={{ ...bodyStyle, margin: 0 }}>Aucun exercice prévu.</p>
            ) : todaySession ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <CheckCircle size={32} color={colors.success} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ ...T, color: colors.success }}>SÉANCE TERMINÉE</div>
                  <div style={{ ...mutedStyle, marginTop: 2 }}>
                    {format(new Date(todaySession.created_at), 'HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h3 style={{ ...statStyle, letterSpacing: '1px', lineHeight: 1, margin: '0 0 8px' }}>
                  {sessionTitle.toUpperCase()}
                </h3>
                <div style={{ display: 'flex', gap: 16, ...subtitleStyle, fontSize: 11, letterSpacing: '0.12em', marginBottom: 20 }}>
                  <span>{todayExercises.length} exercices</span>
                  <span>·</span>
                  <span>~45 min</span>
                </div>
                <button
                  onClick={() => startProgramWorkout({ day_name: sessionTitle || todayKey, name: sessionTitle || todayKey }, todayExercises)}
                  style={{ width: '100%', background: colors.gold, color: '#0D0B08', fontFamily: fonts.headline, fontSize: 18, letterSpacing: '0.15em', padding: '16px', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
                  COMMENCER
                </button>
              </>
            )}
          </div>
        </div>

        {/* ═══ PERFORMANCE HEBDO — Stitch bar chart ═══ */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={T}>Performance</span>
            <button onClick={() => setActiveTab('progress')} style={{ ...labelStyle, fontSize: 11 }}>Semaine</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, gap: 8 }}>
            {barData.map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: '100%',
                  height: Math.max(8, (b.value / barMax) * 90),
                  borderRadius: 999,
                  background: b.isToday
                    ? `linear-gradient(180deg, ${GOLD}, ${colors.goldContainer})`
                    : '#353534',
                  boxShadow: b.isToday ? `0 0 20px ${colors.goldDim}` : 'none',
                  transition: 'height 0.5s ease',
                }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: b.isToday ? GOLD : TEXT_MUTED }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ HYDRATATION — Visual glasses ═══ */}
        {(() => {
          const waterGoal = (profile?.water_goal || 3000) / 1000
          const glassSize = 0.25
          const totalGlasses = Math.ceil(waterGoal / glassSize)
          const waterL = waterToday / 1000
          const filledGlasses = Math.floor(waterL / glassSize)
          const partialFill = (waterL % glassSize) / glassSize
          return (
            <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <div style={T}>HYDRATATION</div>
                  <div style={{ ...subtitleStyle, fontSize: 11, letterSpacing: 2 }}>OBJECTIF : {waterGoal}L</div>
                </div>
                <div style={{ ...statStyle, fontSize: 32, color: colors.gold, lineHeight: 1 }}>{waterL.toFixed(1)}L</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 5, flex: 1, flexWrap: 'wrap' }}>
                  {Array.from({ length: totalGlasses }).map((_, i) => {
                    const filled = i < filledGlasses
                    const isPartial = i === filledGlasses && partialFill > 0
                    return (
                      <div key={i} style={{ width: 28, height: 28, borderRadius: 6, position: 'relative', overflow: 'hidden', background: filled ? 'linear-gradient(180deg, #E8C97A, #D4A843, #B8922F)' : colors.surfaceHigh, border: filled ? '1px solid rgba(232,201,122,0.4)' : `1px solid ${colors.goldDim}`, transition: 'all 0.4s ease', boxShadow: filled ? '0 0 8px rgba(212,168,67,0.15)' : 'none' }}>
                        {isPartial && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${partialFill * 100}%`, background: 'linear-gradient(180deg, #E8C97A, #D4A843)', transition: 'height 0.4s ease' }} />}
                      </div>
                    )
                  })}
                </div>
                <button onClick={() => addWater(250)} style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, #E8C97A, #D4A843, ${colors.goldContainer}, #8B6914)`, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 16px rgba(212,168,67,0.25)' }}>
                  <span style={{ fontFamily: fonts.headline, fontSize: 24, color: '#0D0B08', lineHeight: 1 }}>+</span>
                </button>
              </div>
            </div>
          )
        })()}

        {/* ═══ MUSCLE HEAT MAP ═══ */}
        <MuscleHeatMap muscleStatus={muscleStatus} />

        {/* ═══ DAILY HABIT CHECK-IN ═══ */}
        {!todayHabit ? (
          <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <div style={{ ...T, marginBottom: 10 }}>CHECK-IN DU JOUR</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'mood', label: 'Humeur', emojis: ['\u{1F62B}','\u{1F615}','\u{1F610}','\u{1F60A}','\u{1F525}'] },
                { key: 'energy', label: 'Energie', emojis: ['\u{1FAB4}','\u{1F634}','\u26A1','\u{1F4AA}','\u{1F680}'] },
              ].map(({ key, label, emojis }) => (
                <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: fonts.body, fontSize: 8, color: colors.textMuted, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                    {emojis.map((e, i) => (
                      <button key={i} onClick={() => setHabitValues(prev => ({ ...prev, [key]: i + 1 }))} style={{ background: habitValues[key] === i + 1 ? colors.goldDim : 'transparent', border: habitValues[key] === i + 1 ? `1px solid ${colors.goldRule}` : '1px solid transparent', borderRadius: 6, width: 28, height: 28, fontSize: 14, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <span style={{ fontFamily: fonts.body, fontSize: 9, color: colors.textMuted, letterSpacing: 1 }}>SOMMEIL</span>
              <input type="number" step="0.5" min="0" max="14" placeholder="7.5" value={habitValues.sleep_hours || ''} onChange={e => setHabitValues(prev => ({ ...prev, sleep_hours: parseFloat(e.target.value) }))} style={{ width: 60, padding: '6px 8px', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 8, color: colors.text, fontFamily: fonts.headline, fontSize: 18, textAlign: 'center', outline: 'none' }} />
              <span style={mutedStyle}>heures</span>
            </div>
            <button onClick={async () => {
              const todayDate = new Date().toISOString().split('T')[0]
              await supabase.from('daily_habits').upsert({ user_id: session.user.id, date: todayDate, ...habitValues })
              try { await addXP(session.user.id, 10, supabase) } catch {}
              setTodayHabit({ ...habitValues })
            }} style={{ width: '100%', padding: 12, marginTop: 12, background: Object.keys(habitValues).length >= 2 ? 'linear-gradient(135deg, #E8C97A, #D4A843, #8B6914)' : colors.surfaceHigh, color: Object.keys(habitValues).length >= 2 ? '#0D0B08' : colors.textDim, fontFamily: fonts.headline, fontSize: 14, letterSpacing: 2, border: 'none', borderRadius: 16, cursor: 'pointer' }}>ENREGISTRER</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[
              { emoji: ['\u{1F62B}','\u{1F615}','\u{1F610}','\u{1F60A}','\u{1F525}'][((todayHabit.mood || 3) - 1)], label: 'HUMEUR' },
              { emoji: ['\u{1FAB4}','\u{1F634}','\u26A1','\u{1F4AA}','\u{1F680}'][((todayHabit.energy || 3) - 1)], label: 'ENERGIE' },
              { emoji: `${todayHabit.sleep_hours || '?'}h`, label: 'SOMMEIL', isText: true },
            ].map(i => (
              <div key={i.label} style={{ flex: 1, background: colors.surface, borderRadius: 16, padding: '8px 10px', textAlign: 'center', border: `1px solid ${colors.goldDim}` }}>
                <div style={i.isText ? statSmallStyle : { fontSize: 18 }}>{i.emoji}</div>
                <div style={{ ...mutedStyle, fontSize: 8, letterSpacing: 1 }}>{i.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ NUTRITION MACROS ═══ */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={T}>NUTRITION</span>
            <button onClick={() => setActiveTab('nutrition')} style={{ ...labelStyle, fontSize: 10, letterSpacing: '0.12em' }}>Voir plan</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Cible', value: calorieGoal },
              { label: 'Prot', value: profile?.protein_goal ? `${profile.protein_goal}g` : '—' },
              { label: 'Gluc', value: profile?.carbs_goal ? `${profile.carbs_goal}g` : '—' },
              { label: 'Lip', value: profile?.fat_goal ? `${profile.fat_goal}g` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 4px', textAlign: 'center' }}>
                <div style={{ ...statSmallStyle, fontSize: 22 }}>{value}</div>
                <div style={{ ...subtitleStyle, fontSize: 9, letterSpacing: '0.1em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
