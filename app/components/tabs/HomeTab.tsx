'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Ruler, Camera, Zap, Moon, CheckCircle,
} from 'lucide-react'
import ExercisePreview from '../ExercisePreview'
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
  todayNutritionKey,
} from '../../../lib/design-tokens'

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
  }, [session?.user?.id])

  const calPct = calorieGoal > 0 ? Math.min(100, Math.round((consumedKcal / calorieGoal) * 100)) : 0
  const ringSize = 140
  const ringStroke = 12
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircum = 2 * Math.PI * ringRadius
  const ringOffset = ringCircum - (calPct / 100) * ringCircum

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

  return (
    <div style={{ background: BG_BASE, minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />

      {/* ═══ HEADER ═══ */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => avatarRef.current?.click()} style={{ width: 36, height: 36, borderRadius: '50%', background: displayAvatar ? 'transparent' : BG_CARD_2, border: `1px solid ${BORDER}`, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
              {displayAvatar
                ? <img src={displayAvatar} style={{ width: 36, height: 36, objectFit: 'cover' }} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                : <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: GOLD }}>{firstName.charAt(0).toUpperCase()}</span>}
            </button>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: GOLD, letterSpacing: '0.15em' }}>MOOVX</span>
          </div>
          <button onClick={() => setActiveTab('profil')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="1.5"><path d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>
          {format(new Date(), 'EEEE d MMMM', { locale: fr })}
        </p>
        <h1 style={{ fontFamily: FONT_DISPLAY, margin: 0, lineHeight: 1, letterSpacing: '2px' }}>
          <span style={{ fontSize: 36, color: TEXT_PRIMARY }}>BONJOUR, </span>
          <span style={{ fontSize: 56, color: GOLD }}>{firstName.toUpperCase()}</span>
        </h1>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ═══ CALORIE RING + STATS BENTO ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: `${ringSize + 32}px 1fr`, gap: 16 }}>
          {/* Ring */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative' }}>
            <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="goldRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E8C97A" />
                  <stop offset="100%" stopColor="#C9A84C" />
                </linearGradient>
              </defs>
              <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="#1c1b1b" strokeWidth={ringStroke} />
              <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="url(#goldRingGrad)" strokeWidth={ringStroke} strokeLinecap="butt" strokeDasharray={ringCircum} strokeDashoffset={ringOffset} style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.3))' }} />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: GOLD, lineHeight: 1 }}>{calPct}%</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Objectif</span>
            </div>
          </div>
          {/* Right stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Calories</span>
              <div><span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: GOLD }}>{consumedKcal}</span><span style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED, marginLeft: 4 }}>kcal</span></div>
            </div>
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Hydratation</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: '#60A5FA' }}>{(waterToday / 1000).toFixed(1)}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED }}>/ {((profile?.water_goal || 3000) / 1000).toFixed(1)}L</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SÉANCE DU JOUR — Stitch Card ═══ */}
        <div style={{ background: BG_CARD, border: `2px solid ${GOLD}`, position: 'relative', overflow: 'hidden' }}>
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
              <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: '#080808', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Séance du jour</span>
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
                  style={{ width: '100%', background: GOLD, color: '#080808', fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: '0.15em', padding: '16px', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
                  COMMENCER
                </button>
              </>
            )}
          </div>
        </div>

        {/* ═══ STATS BAR — 4 metrics ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, border: `1px solid ${BORDER}` }}>
          {[
            { value: currentWeight ? String(currentWeight) : '—', label: 'KG' },
            { value: String(weekSessions), label: 'SÉANCES' },
            { value: streak > 0 ? `${streak}j` : '—', label: 'STREAK' },
            { value: weekVolume > 1000 ? `${(weekVolume / 1000).toFixed(1)}k` : String(weekVolume), label: 'KG VOL.' },
          ].map((stat, i) => (
            <div key={stat.label} style={{ background: BG_CARD, padding: '16px 8px', textAlign: 'center', borderLeft: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: GOLD, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 9, color: TEXT_MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ PERFORMANCE HEBDOMADAIRE — Bar chart ═══ */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: TEXT_PRIMARY, letterSpacing: '1px' }}>PERFORMANCE HEBDOMADAIRE</span>
            <button onClick={() => setActiveTab('progress')} style={{ fontFamily: FONT_BODY, fontSize: 10, color: GOLD, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Voir tout</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, gap: 6 }}>
            {barData.map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: '100%', height: Math.max(4, (b.value / barMax) * 80), background: b.isToday ? GOLD : b.value > 0 ? `${GOLD}60` : TEXT_DIM, transition: 'height 0.5s ease' }} />
                <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: b.isToday ? GOLD : TEXT_MUTED }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ WATER QUICK ADD ═══ */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[250, 500, 1000].map(ml => (
            <button key={ml} onClick={() => addWater(ml)} style={{ flex: 1, padding: '12px 4px', border: `1px solid ${GOLD_RULE}`, background: 'transparent', cursor: 'pointer', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = GOLD_RULE; e.currentTarget.style.color = TEXT_MUTED }}
            >
              +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
            </button>
          ))}
        </div>

        {/* ═══ NUTRITION MACROS ═══ */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: 18 }}>
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
