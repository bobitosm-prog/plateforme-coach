'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Ruler, Camera, Zap, Moon, CheckCircle, Flame, Dumbbell, TrendingUp, Droplets,
} from 'lucide-react'
import ExercisePreview from '../ExercisePreview'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
  todayNutritionKey,
} from '../../../lib/design-tokens'
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
    supabase.from('water_intake').select('amount_ml').eq('user_id', session.user.id).eq('date', today).limit(10)
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

  const todayExercises = todayCoachDay?.exercises || []
  const sessionTitle = todayCoachDay?.nom || todayCoachDay?.name || (todayExercises.length > 0 ? `${todayExercises[0]?.muscle_group || 'Entraînement'} du jour` : 'Séance du jour')

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

  return (
    <div style={{ background: BG_BASE, minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />

      {/* ═══ GREETING ═══ */}
      <div style={{ padding: '8px 24px 0' }}>
        <p style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>
          {format(new Date(), 'EEEE d MMMM', { locale: fr })}
        </p>
        <h1 style={{ fontFamily: FONT_DISPLAY, margin: '0 0 8px', lineHeight: 1, letterSpacing: '2px' }}>
          <span style={{ fontSize: 30, color: TEXT_PRIMARY }}>BONJOUR, </span>
          <span style={{ fontSize: 30, color: GOLD }}>{firstName.toUpperCase()}</span>
        </h1>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontStyle: 'italic', color: TEXT_MUTED, lineHeight: 1.5, paddingLeft: 12, borderLeft: `2px solid ${GOLD_RULE}` }}>
          &ldquo;{getDailyQuote(profile?.objective)}&rdquo;
        </div>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ═══ HERO CARD — Ring + Stats side by side ═══ */}
        <div className="liquid-glass-strong" style={{ borderRadius: 20, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Compact Ring 110px */}
            <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,67,0.07) 0%, transparent 70%)', transform: 'translate(-50%, -50%)' }} />
              <svg viewBox="0 0 140 140" width={110} height={110} style={{ filter: 'drop-shadow(0 0 10px rgba(212,168,67,0.12))', position: 'relative', zIndex: 1 }}>
                <defs>
                  <linearGradient id="heroGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E8C97A" /><stop offset="40%" stopColor="#D4A843" /><stop offset="70%" stopColor="#C9A84C" /><stop offset="100%" stopColor="#8B6914" />
                  </linearGradient>
                  <filter id="heroGlow"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                <circle cx="70" cy="70" r="56" fill="none" stroke="rgba(212,168,67,0.1)" strokeWidth="7" />
                <circle cx="70" cy="70" r="56" fill="none" stroke="url(#heroGold)" strokeWidth="7" strokeLinecap="round" filter="url(#heroGlow)" strokeDasharray="351.86" strokeDashoffset={351.86 * (1 - calPct / 100)} transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
                <text x="70" y="64" textAnchor="middle" fill={GOLD} fontSize="30" fontFamily={FONT_DISPLAY} letterSpacing="1">{consumedKcal}</text>
                <text x="70" y="80" textAnchor="middle" fill={TEXT_MUTED} fontSize="9" fontFamily={FONT_ALT} fontWeight="700" letterSpacing="2">KCAL</text>
              </svg>
            </div>
            {/* Stats grid 2x2 */}
            <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { icon: <Flame size={14} color={GOLD} />, value: consumedKcal, label: 'Kcal' },
                { icon: <Dumbbell size={14} color={GOLD} />, value: weekSessions, label: 'Seances' },
                { icon: <TrendingUp size={14} color={GOLD} />, value: `+${streak}`, label: 'Streak' },
                { icon: <Droplets size={14} color={GOLD} />, value: `${(waterToday / 1000).toFixed(1)}L`, label: 'Eau' },
              ].map((stat, i) => (
                <div key={i} style={{ background: BG_CARD_2, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, padding: '8px 8px', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{stat.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: GOLD, lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, letterSpacing: 1, color: TEXT_MUTED, textTransform: 'uppercase' }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ WEIGHT + OBJECTIVE CARD ═══ */}
        {currentWeight && (
          <div className="liquid-glass" style={{ borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 4 }}>
                {objLabel === 'bulk' && '\u{1F4AA} PRISE DE MASSE'}
                {objLabel === 'cut' && '\u{1F525} SECHE'}
                {objLabel === 'maintain' && '\u2696\uFE0F MAINTIEN'}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, lineHeight: 1 }}>
                {currentWeight} <span style={{ fontSize: 16, color: TEXT_MUTED }}>KG</span>
              </div>
            </div>
            {goalWeight && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 4 }}>OBJECTIF</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: GOLD, lineHeight: 1 }}>
                  {goalWeight} <span style={{ fontSize: 14, color: TEXT_MUTED }}>KG</span>
                </div>
              </div>
            )}
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: objLabel === 'bulk' ? GOLD : objLabel === 'cut' ? GOLD : GREEN }}>
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
            <div className="liquid-glass" style={{ borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: GOLD }}>LV.{level}</span>
                  <span style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: TEXT_MUTED, textTransform: 'uppercase' }}>{title}</span>
                </div>
                <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED }}>{xpInLevel} / {xpForNext} XP</span>
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: BG_CARD_2, overflow: 'hidden' }}>
                <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #D4A843, #E8C97A)', transition: 'width 1s ease' }} />
              </div>
            </div>
          )
        })()}

        {/* ═══ COACH BANNER ═══ */}
        <div style={{ position: 'relative', width: '100%', height: 120, borderRadius: 16, overflow: 'hidden', border: `1px solid ${BORDER}`, cursor: 'pointer' }}>
          <img src="/images/hero-coaching.webp" alt="Coaching personnalise" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(13,11,8,0.92) 0%, rgba(13,11,8,0.5) 50%, rgba(13,11,8,0.15) 100%)' }} />
          <div style={{ position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)' }}>
            <div style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 3 }}>Coaching personnel</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: 2, color: TEXT_PRIMARY, lineHeight: 1.15 }}>VOTRE COACH<br />VOUS ACCOMPAGNE</div>
          </div>
        </div>

        {/* ═══ PROGRAMME — Title with line ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: -4 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 3, color: TEXT_PRIMARY }}>PROGRAMME</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(212,168,67,0.25), transparent)' }} />
          <button onClick={() => setActiveTab('training')} style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: GOLD, textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}>Voir tout</button>
        </div>

        {/* ═══ SÉANCE DU JOUR ═══ */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
          {/* Background image overlay */}
          <div style={{ height: todayExercises.length > 0 && !todaySession ? 160 : 0, position: 'relative', overflow: 'hidden' }}>
            {todayExercises.length > 0 && !todaySession && (
              <>
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 0%, ${BG_CARD} 100%)`, zIndex: 1 }} />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, rgba(201,168,76,0.06) 0%, transparent 60%)` }} />
                <img src="/images/stitch-gym.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, filter: 'grayscale(100%)' }} />
              </>
            )}
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, background: GOLD, padding: '4px 12px' }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: '#0D0B08', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Séance du jour</span>
            </div>
          </div>
          <div style={{ padding: '16px 20px 20px' }}>
            {!coachProgram ? (
              <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, margin: 0, fontStyle: 'italic' }}>Cree ton programme dans l&apos;onglet Entrainement.</p>
            ) : todayCoachDay?.repos ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Moon size={24} color={TEXT_MUTED} />
                <div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: TEXT_PRIMARY, letterSpacing: '1px' }}>JOUR DE REPOS</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED }}>Récupère bien, étirements bienvenus</div>
                </div>
              </div>
            ) : !todayExercises.length ? (
              <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, margin: 0 }}>Aucun exercice prévu.</p>
            ) : todaySession ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <CheckCircle size={32} color={GREEN} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: GREEN, letterSpacing: '1px' }}>SÉANCE TERMINÉE</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                    {format(new Date(todaySession.created_at), 'HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: TEXT_PRIMARY, letterSpacing: '1px', lineHeight: 1, margin: '0 0 8px' }}>
                  {sessionTitle.toUpperCase()}
                </h3>
                <div style={{ display: 'flex', gap: 16, fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20 }}>
                  <span>{todayExercises.length} exercices</span>
                  <span>·</span>
                  <span>~45 min</span>
                </div>
                <button
                  onClick={() => startProgramWorkout({ day_name: todayKey }, todayExercises)}
                  style={{ width: '100%', background: GOLD, color: '#0D0B08', fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: '0.15em', padding: '16px', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
                  COMMENCER
                </button>
              </>
            )}
          </div>
        </div>

        {/* ═══ PERFORMANCE HEBDO ═══ */}
        <div className="liquid-glass" style={{ borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, color: TEXT_PRIMARY }}>PERFORMANCE HEBDO</span>
            <button onClick={() => setActiveTab('progress')} style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: GOLD, textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}>Voir tout</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
            {barData.map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: Math.max(4, (b.value / barMax) * 55), borderRadius: '4px 4px 0 0', background: b.isToday ? TEXT_DIM : b.value > 40 ? 'linear-gradient(180deg, #E8C97A, #D4A843)' : GOLD, opacity: b.value < 10 && b.value > 0 ? 0.5 : b.value === 0 ? 0.15 : 1, transition: 'height 0.5s ease' }} />
                <span style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 600, letterSpacing: 1, color: b.isToday ? GOLD : TEXT_DIM }}>{b.label}</span>
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
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: 3, color: TEXT_PRIMARY }}>HYDRATATION</div>
                  <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 600, letterSpacing: 2, color: TEXT_MUTED }}>OBJECTIF : {waterGoal}L</div>
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: GOLD, lineHeight: 1 }}>{waterL.toFixed(1)}L</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 5, flex: 1, flexWrap: 'wrap' }}>
                  {Array.from({ length: totalGlasses }).map((_, i) => {
                    const filled = i < filledGlasses
                    const isPartial = i === filledGlasses && partialFill > 0
                    return (
                      <div key={i} style={{ width: 28, height: 28, borderRadius: 6, position: 'relative', overflow: 'hidden', background: filled ? 'linear-gradient(180deg, #E8C97A, #D4A843, #B8922F)' : BG_CARD_2, border: filled ? '1px solid rgba(232,201,122,0.4)' : `1px solid ${GOLD_DIM}`, transition: 'all 0.4s ease', boxShadow: filled ? '0 0 8px rgba(212,168,67,0.15)' : 'none' }}>
                        {isPartial && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${partialFill * 100}%`, background: 'linear-gradient(180deg, #E8C97A, #D4A843)', transition: 'height 0.4s ease' }} />}
                      </div>
                    )
                  })}
                </div>
                <button onClick={() => addWater(250)} style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #E8C97A, #D4A843, #C9A84C, #8B6914)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 16px rgba(212,168,67,0.25)' }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: '#0D0B08', lineHeight: 1 }}>+</span>
                </button>
              </div>
            </div>
          )
        })()}

        {/* ═══ MUSCLE HEAT MAP ═══ */}
        <MuscleHeatMap muscleStatus={muscleStatus} />

        {/* ═══ DAILY HABIT CHECK-IN ═══ */}
        {!todayHabit ? (
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: GOLD, marginBottom: 10 }}>CHECK-IN DU JOUR</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'mood', label: 'Humeur', emojis: ['\u{1F62B}','\u{1F615}','\u{1F610}','\u{1F60A}','\u{1F525}'] },
                { key: 'energy', label: 'Energie', emojis: ['\u{1FAB4}','\u{1F634}','\u26A1','\u{1F4AA}','\u{1F680}'] },
              ].map(({ key, label, emojis }) => (
                <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: FONT_ALT, fontSize: 8, color: TEXT_MUTED, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                    {emojis.map((e, i) => (
                      <button key={i} onClick={() => setHabitValues(prev => ({ ...prev, [key]: i + 1 }))} style={{ background: habitValues[key] === i + 1 ? GOLD_DIM : 'transparent', border: habitValues[key] === i + 1 ? `1px solid ${GOLD_RULE}` : '1px solid transparent', borderRadius: 6, width: 28, height: 28, fontSize: 14, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <span style={{ fontFamily: FONT_ALT, fontSize: 9, color: TEXT_MUTED, letterSpacing: 1 }}>SOMMEIL</span>
              <input type="number" step="0.5" min="0" max="14" placeholder="7.5" value={habitValues.sleep_hours || ''} onChange={e => setHabitValues(prev => ({ ...prev, sleep_hours: parseFloat(e.target.value) }))} style={{ width: 60, padding: '6px 8px', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, fontSize: 18, textAlign: 'center', outline: 'none' }} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED }}>heures</span>
            </div>
            <button onClick={async () => {
              const todayDate = new Date().toISOString().split('T')[0]
              await supabase.from('daily_habits').upsert({ user_id: session.user.id, date: todayDate, ...habitValues })
              try { await addXP(session.user.id, 10, supabase) } catch {}
              setTodayHabit({ ...habitValues })
            }} style={{ width: '100%', padding: 12, marginTop: 12, background: Object.keys(habitValues).length >= 2 ? 'linear-gradient(135deg, #E8C97A, #D4A843, #8B6914)' : BG_CARD_2, color: Object.keys(habitValues).length >= 2 ? '#0D0B08' : TEXT_DIM, fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: 2, border: 'none', borderRadius: 10, cursor: 'pointer' }}>ENREGISTRER</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[
              { emoji: ['\u{1F62B}','\u{1F615}','\u{1F610}','\u{1F60A}','\u{1F525}'][((todayHabit.mood || 3) - 1)], label: 'HUMEUR' },
              { emoji: ['\u{1FAB4}','\u{1F634}','\u26A1','\u{1F4AA}','\u{1F680}'][((todayHabit.energy || 3) - 1)], label: 'ENERGIE' },
              { emoji: `${todayHabit.sleep_hours || '?'}h`, label: 'SOMMEIL', isText: true },
            ].map(i => (
              <div key={i.label} style={{ flex: 1, background: BG_CARD, borderRadius: 10, padding: '8px 10px', textAlign: 'center', border: `1px solid ${GOLD_DIM}` }}>
                <div style={i.isText ? { fontFamily: FONT_DISPLAY, fontSize: 18, color: GOLD } : { fontSize: 18 }}>{i.emoji}</div>
                <div style={{ fontFamily: FONT_ALT, fontSize: 8, color: TEXT_MUTED, letterSpacing: 1 }}>{i.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ NUTRITION MACROS ═══ */}
        <div className="liquid-glass" style={{ borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: TEXT_PRIMARY, letterSpacing: '1px' }}>NUTRITION</span>
            <button onClick={() => setActiveTab('nutrition')} style={{ fontFamily: FONT_BODY, fontSize: 10, color: GOLD, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Voir plan</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: BORDER }}>
            {[
              { label: 'Cible', value: calorieGoal },
              { label: 'Prot', value: profile?.protein_goal ? `${profile.protein_goal}g` : '—' },
              { label: 'Gluc', value: profile?.carbs_goal ? `${profile.carbs_goal}g` : '—' },
              { label: 'Lip', value: profile?.fat_goal ? `${profile.fat_goal}g` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: BG_CARD, padding: '10px 4px', textAlign: 'center' }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: GOLD }}>{value}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 9, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
