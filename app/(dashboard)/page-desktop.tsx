'use client'
import React, { useState, useEffect, useMemo } from 'react'
import {
  Home, Dumbbell, BarChart3, UtensilsCrossed, Target, User, Settings,
  ChevronRight, ChevronLeft, ChevronDown, LogOut, Play, Plus,
  Flame, Activity, TrendingUp, Calendar, MessageCircle, Sparkles, Trophy, Award,
  Camera, Scale, Ruler, Clock, Zap, Star,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart, BarChart, Bar,
} from 'recharts'
import { colors, fonts } from '../../lib/design-tokens'
import MuscleHeatMap, { calculateMuscleStatus } from '../components/ui/MuscleHeatMap'
import { getLevelFromXP, getLevelTitle } from '../../lib/gamification'

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */
type NavItem = 'dashboard' | 'workouts' | 'analytics' | 'nutrition' | 'goals' | 'profile' | 'settings'

interface DesktopDashboardProps {
  session: any; profile: any; supabase: any
  coachProgram: any; coachMealPlan: any
  todayKey: string; todaySessionDone: boolean
  streak: number; wSessions: any[]
  currentWeight: number | undefined; goalWeight: number | null
  personalRecords: any[]
  weightHistory: { date: string; poids: number }[]
  progressPhotos: any[]; measurements: any[]
  weeklyCalories: { date: string; calories: number; protein: number; carbs: number; fat: number }[]
  weeklyVolume: { week: string; volume: number }[]
  scheduledSessions: any[]; completedSessions: number
  calorieGoal: number
  onSignOut: () => void; onNavigate?: (tab: string) => void
  startProgramWorkout?: (day: any, exercises: any[]) => void
  setModal?: (m: string) => void
}

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const GOLD = colors.gold
const BG = '#131313'
const CARD_BG = '#0e0e0e'
const CARD_BORDER = 'rgba(201,168,76,0.15)'
const CARD_SHADOW = '0 4px 24px rgba(0,0,0,0.4)'
const CARD_RADIUS = 20
const TEXT = '#e5e2e1'
const MUTED = '#99907e'
const SUCCESS = '#4ade80'
const HEADLINE = fonts.headline
const BODY = fonts.body
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAYS_FULL = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const NAV_ITEMS: { id: NavItem; icon: typeof Home; label: string }[] = [
  { id: 'dashboard', icon: Home, label: 'ACCUEIL' },
  { id: 'workouts', icon: Dumbbell, label: 'ENTRAINEMENT' },
  { id: 'analytics', icon: BarChart3, label: 'PROGRESSION' },
  { id: 'nutrition', icon: UtensilsCrossed, label: 'NUTRITION' },
  { id: 'goals', icon: Target, label: 'OBJECTIFS' },
  { id: 'profile', icon: User, label: 'PROFIL' },
  { id: 'settings', icon: Settings, label: 'REGLAGES' },
]

const OBJECTIVE_LABELS: Record<string, string> = {
  mass: 'PRISE DE MASSE', bulk: 'PRISE DE MASSE',
  weight_loss: 'SECHE', seche: 'SECHE',
  maintain: 'MAINTIEN', maintenance: 'MAINTIEN',
  performance: 'PERFORMANCE', recomposition: 'RECOMPOSITION',
}

const QUOTES: Record<string, string[]> = {
  bulk: ['Chaque calorie compte. Tu construis la meilleure version de toi-meme.', 'La masse se construit jour apres jour, rep apres rep.', 'Ton corps est une machine — donne-lui le carburant qu\'il merite.'],
  cut: ['Chaque jour de discipline te rapproche de la definition parfaite.', 'La seche, c\'est reveler le chef-d\'oeuvre que tu as construit.', 'Le sacrifice temporaire pour un resultat permanent.'],
  maintain: ['L\'equilibre est le vrai luxe. Tu l\'as trouve.', 'Maintenir, c\'est maitriser. Tu controles ton physique.', 'La constance silencieuse est la plus grande force.'],
}
function getDailyQuote(o?: string): string {
  const k = (o === 'weight_loss' || o === 'seche') ? 'cut' : (o === 'mass' || o === 'bulk') ? 'bulk' : 'maintain'
  const q = QUOTES[k]; return q[Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000) % q.length]
}

/* ═══════════════════════════════════════════════════
   SHARED UI
   ═══════════════════════════════════════════════════ */
function Ring({ value, max, size = 100, stroke = 8, color = GOLD, label, sublabel, labelSize, sublabelSize }: {
  value: number; max: number; size?: number; stroke?: number; color?: string; label?: string; sublabel?: string; labelSize?: number; sublabelSize?: number
}) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, offset = circ * (1 - Math.min(value / (max || 1), 1))
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {label && <span style={{ fontFamily: HEADLINE, fontSize: labelSize || size * 0.28, fontWeight: 800, color: TEXT }}>{label}</span>}
        {sublabel && <span style={{ fontFamily: BODY, fontSize: sublabelSize || size * 0.12, color: MUTED, marginTop: 1 }}>{sublabel}</span>}
      </div>
    </div>
  )
}

function Card({ children, span = 4, style, onClick }: { children: React.ReactNode; span?: number; style?: React.CSSProperties; onClick?: () => void }) {
  const [h, setH] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ gridColumn: `span ${span}`, background: CARD_BG, border: `1px solid ${h ? 'rgba(201,168,76,0.30)' : CARD_BORDER}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, padding: 24, cursor: onClick ? 'pointer' : 'default', transform: h && onClick ? 'translateY(-2px)' : 'none', transition: 'all 200ms ease', overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function CardTitle({ title, chevron }: { title: string; chevron?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <span style={{ fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: GOLD, whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.25)' }} />
      {chevron && <ChevronRight size={16} color={MUTED} />}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1c1b1b', border: `1px solid ${GOLD}`, borderRadius: 8, padding: '8px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
      <div style={{ fontFamily: BODY, fontSize: 11, color: MUTED, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontFamily: HEADLINE, fontSize: 13, fontWeight: 700, color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}
        </div>
      ))}
    </div>
  )
}

function IconBtn({ Icon, badge, onClick }: { Icon: typeof Home; badge?: number; onClick?: () => void }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: h ? 'rgba(230,195,100,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${CARD_BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms' }}>
      <Icon size={16} color={h ? GOLD : TEXT} />
      {badge !== undefined && badge > 0 && <span style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, background: '#ef4444', borderRadius: '50%', fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge > 9 ? '9+' : badge}</span>}
    </button>
  )
}

function StatBox({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontFamily: BODY, fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
        <span style={{ fontFamily: HEADLINE, fontSize: 20, fontWeight: 800, color: color || GOLD }}>{value}</span>
        {unit && <span style={{ fontFamily: BODY, fontSize: 9, color: MUTED }}>{unit}</span>}
      </div>
    </div>
  )
}

function dayLabel(d: Date): string {
  const t = new Date(), y = new Date(t); y.setDate(y.getDate() - 1)
  if (d.toDateString() === t.toDateString()) return "Auj."
  if (d.toDateString() === y.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function DesktopDashboard({
  session, profile, supabase, coachProgram, coachMealPlan, todayKey, todaySessionDone,
  streak, wSessions, currentWeight, goalWeight, personalRecords,
  weightHistory, progressPhotos, measurements, weeklyCalories, weeklyVolume,
  scheduledSessions, completedSessions, calorieGoal,
  onSignOut, onNavigate, startProgramWorkout, setModal,
}: DesktopDashboardProps) {
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [nutritionToday, setNutritionToday] = useState({ calories: 0, proteins: 0, carbs: 0, fats: 0 })
  const [weekSessions, setWeekSessions] = useState(0)
  const [weekVolume, setWeekVolume] = useState(0)
  const [weekCalories, setWeekCalories] = useState(0)
  const [newRecords, setNewRecords] = useState(0)
  const [muscleStatus, setMuscleStatus] = useState<Record<string, number>>({})
  const [badges, setBadges] = useState<any[]>([])
  const [xpData, setXpData] = useState<{ total_xp: number; current_streak: number } | null>(null)
  const [prevWeight, setPrevWeight] = useState<number | null>(null)
  const [allBadges, setAllBadges] = useState<any[]>([])

  useEffect(() => {
    if (!session?.user?.id) return
    const uid = session.user.id
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    supabase.from('workout_sessions').select('*, workout_sets(*)').eq('user_id', uid)
      .gte('created_at', weekAgo).order('created_at', { ascending: true })
      .then(({ data }: any) => {
        if (!data) return
        const byDay: Record<string, { calories: number; volume: number }> = {}
        DAYS_FR.forEach(d => { byDay[d] = { calories: 0, volume: 0 } })
        const jsToFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
        let vol = 0, cal = 0
        data.forEach((s: any) => {
          const day = jsToFr[new Date(s.created_at).getDay()]
          const sc = (s.duration_minutes || 0) * 8; cal += sc
          if (byDay[day]) byDay[day].calories += sc
          ;(s.workout_sets || []).forEach((st: any) => { const v = (st.weight || 0) * (st.reps || 0); vol += v; if (byDay[day]) byDay[day].volume += v })
        })
        setWeeklyData(DAYS_FR.map(d => ({ day: d, calories: byDay[d].calories, volume: Math.round(byDay[d].volume) })))
        setWeekSessions(data.length); setWeekVolume(vol); setWeekCalories(cal)
      })

    supabase.from('workout_sessions').select('*, workout_sets(*)').eq('user_id', uid).order('created_at', { ascending: false }).limit(10)
      .then(({ data }: any) => { if (data) setRecentSessions(data) })

    supabase.from('daily_food_logs').select('*').eq('user_id', uid).eq('date', today)
      .then(({ data }: any) => {
        if (!data) return
        let c = 0, p = 0, ca = 0, f = 0
        data.forEach((x: any) => { c += x.calories || 0; p += x.proteins || 0; ca += x.carbs || 0; f += x.fats || 0 })
        setNutritionToday({ calories: Math.round(c), proteins: Math.round(p), carbs: Math.round(ca), fats: Math.round(f) })
      })

    supabase.from('personal_records').select('id').eq('user_id', uid).gte('achieved_at', weekAgo)
      .then(({ data }: any) => { setNewRecords(data?.length || 0) })

    const td = new Date(Date.now() - 3 * 86400000).toISOString()
    supabase.from('workout_sets').select('exercise_name, created_at').eq('user_id', uid).gte('created_at', td)
      .then(({ data }: any) => { if (data) setMuscleStatus(calculateMuscleStatus(data)) })

    supabase.from('user_badges').select('badge_id, earned_at, badges(name, icon, category)').eq('user_id', uid).order('earned_at', { ascending: false }).limit(3)
      .then(({ data }: any) => { if (data) setBadges(data) })

    supabase.from('user_badges').select('badge_id, earned_at, badges(name, icon, category)').eq('user_id', uid).order('earned_at', { ascending: false }).limit(20)
      .then(({ data }: any) => { if (data) setAllBadges(data) })

    supabase.from('user_xp').select('total_xp, current_streak').eq('user_id', uid).maybeSingle()
      .then(({ data }: any) => { if (data) setXpData(data) })

    supabase.from('weight_logs').select('poids, date').eq('user_id', uid).order('date', { ascending: false }).limit(2)
      .then(({ data }: any) => { if (data?.[1]) setPrevWeight(data[1].poids) })
  }, [session?.user?.id])

  // Computed
  const bodyFat = profile?.body_fat_pct || null
  const proteinGoal = Math.round(calorieGoal * 0.3 / 4)
  const carbsGoal = Math.round(calorieGoal * 0.4 / 4)
  const fatsGoal = Math.round(calorieGoal * 0.3 / 9)
  const displayName = profile?.full_name || 'Athlete'
  const firstName = displayName.split(' ')[0]
  const avatarUrl = profile?.avatar_url || session?.user?.user_metadata?.avatar_url
  const objective = profile?.objective || 'maintain'
  const objectiveLabel = OBJECTIVE_LABELS[objective] || 'MAINTIEN'
  const quote = getDailyQuote(objective)
  const weightChange = currentWeight && prevWeight ? +(currentWeight - prevWeight).toFixed(1) : null
  const levelInfo = xpData ? getLevelFromXP(xpData.total_xp) : null
  const levelTitle = levelInfo ? getLevelTitle(levelInfo.level) : null
  const weeklyGoalPct = Math.round((weekSessions / 5) * 100)

  const todaySessionInfo = useMemo(() => {
    if (!coachProgram) return null
    const dayData = coachProgram[todayKey]
    if (!dayData || dayData.repos) return null
    const exercises = dayData.exercises || []
    const name = dayData.day_name || dayData.name || 'Seance du jour'
    const muscles = [...new Set(exercises.map((e: any) => e.muscle_group || '').filter(Boolean))] as string[]
    const totalSets = exercises.reduce((s: number, e: any) => s + (e.sets || 3), 0)
    const avgRest = exercises.length > 0 ? Math.round(exercises.reduce((s: number, e: any) => s + (e.rest_seconds || 90), 0) / exercises.length) : 90
    return { name, exercises, muscles, totalSets, avgRest, dayData }
  }, [coachProgram, todayKey])

  const strengthGains = useMemo(() => {
    if (!personalRecords?.length) return []
    const byEx: Record<string, { name: string; value: number; previous: number }> = {}
    personalRecords.forEach((pr: any) => {
      if (pr.record_type !== '1rm' || !pr.previous_value) return
      if (!byEx[pr.exercise_name]) byEx[pr.exercise_name] = { name: pr.exercise_name, value: pr.value, previous: pr.previous_value }
    })
    return Object.values(byEx).slice(0, 5)
  }, [personalRecords])

  // Week program for training page
  const weekProgram = useMemo(() => {
    if (!coachProgram) return []
    return DAYS_FULL.map((d, i) => {
      const day = coachProgram[d]
      if (!day || day.repos) return { day: DAYS_FR[i], dayFull: d, rest: true, name: 'Repos', exercises: [] }
      return { day: DAYS_FR[i], dayFull: d, rest: false, name: day.day_name || day.name || 'Seance', exercises: day.exercises || [], muscles: [...new Set((day.exercises || []).map((e: any) => e.muscle_group).filter(Boolean))] }
    })
  }, [coachProgram])

  const bmi = currentWeight && profile?.height ? +(currentWeight / ((profile.height / 100) ** 2)).toFixed(1) : null

  function handleNavClick(id: NavItem) { setActiveNav(id) }

  /* ═══════════════════════════════════════════════════
     SIDEBAR + SHELL
     ═══════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100dvh', background: BG, color: TEXT, fontFamily: BODY }}>
      {/* SIDEBAR */}
      <aside style={{ width: 240, flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100dvh', background: BG, borderRight: `1px solid ${CARD_BORDER}`, display: 'flex', flexDirection: 'column', zIndex: 50 }}>
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-moovx.png" alt="MoovX" style={{ height: 40, width: 40, borderRadius: 10, objectFit: 'contain' }} />
          <span style={{ fontFamily: HEADLINE, fontSize: 14, fontWeight: 700, color: GOLD, letterSpacing: '0.15em' }}>MOOVX</span>
        </div>
        <div style={{ height: 1, background: 'rgba(230,195,100,0.10)', margin: '0 20px 16px' }} />
        <div style={{ padding: '0 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(201,168,76,0.30)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1c1b1b', border: '2px solid rgba(201,168,76,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEADLINE, fontSize: 16, fontWeight: 700, color: GOLD }}>{displayName[0]?.toUpperCase()}</div>}
          <div>
            <div style={{ fontFamily: HEADLINE, fontSize: 13, fontWeight: 700, color: TEXT, letterSpacing: '0.05em' }}>{displayName}</div>
            <div style={{ fontFamily: BODY, fontSize: 9, fontWeight: 700, color: GOLD, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{objectiveLabel}</div>
          </div>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
            const active = activeNav === id
            return (
              <button key={id} onClick={() => handleNavClick(id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: active ? 'rgba(230,195,100,0.08)' : 'transparent', border: 'none', borderLeft: `3px solid ${active ? GOLD : 'transparent'}`, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 150ms' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                <Icon size={18} color={active ? GOLD : 'rgba(255,255,255,0.6)'} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontFamily: HEADLINE, fontSize: 13, fontWeight: 700, color: active ? GOLD : 'rgba(255,255,255,0.6)', letterSpacing: '0.12em' }}>{label}</span>
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '16px 20px' }}>
          <button onClick={onSignOut} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', color: MUTED, fontFamily: BODY, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}>
            <LogOut size={14} />Deconnexion
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        {/* HEADER */}
        <header style={{ position: 'sticky', top: 0, zIndex: 40, height: 64, background: 'rgba(19,19,19,0.8)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${CARD_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px' }}>
          <div>
            <h1 style={{ fontFamily: HEADLINE, fontSize: 22, fontWeight: 700, color: TEXT, margin: 0, letterSpacing: '0.08em' }}>BONJOUR {firstName.toUpperCase()}</h1>
            <p style={{ fontFamily: BODY, fontSize: 12, color: MUTED, margin: 0, maxWidth: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quote}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => onNavigate?.('progress')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(230,195,100,0.08)', border: `1px solid ${CARD_BORDER}`, borderRadius: 8, cursor: 'pointer', transition: 'all 150ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = CARD_BORDER }}>
              <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.1em' }}>{objectiveLabel}</span>
              <ChevronDown size={12} color={GOLD} />
            </button>
            <IconBtn Icon={Sparkles} onClick={() => onNavigate?.('home')} />
            <IconBtn Icon={Calendar} onClick={() => onNavigate?.('training')} />
            <IconBtn Icon={MessageCircle} onClick={() => onNavigate?.('messages')} />
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ flex: 1, padding: '28px 36px 40px', overflowY: 'auto' }}>
          {activeNav === 'dashboard' && <DashboardView {...{ weeklyData, weekSessions, weekCalories, weekVolume, weeklyGoalPct, newRecords, todaySessionInfo, todaySessionDone, strengthGains, currentWeight, weightChange, bodyFat, objective, streak, nutritionToday, calorieGoal, proteinGoal, carbsGoal, fatsGoal, muscleStatus, recentSessions, badges, levelInfo, levelTitle, xpData, onNavigate, startProgramWorkout, coachProgram, todayKey, colors }} />}
          {activeNav === 'workouts' && <TrainingView {...{ todaySessionInfo, todaySessionDone, weekProgram, todayKey, recentSessions, personalRecords, strengthGains, weeklyVolume, weeklyData, startProgramWorkout, coachProgram, onNavigate }} />}
          {activeNav === 'analytics' && <ProgressView {...{ weightHistory, currentWeight, goalWeight, bodyFat, bmi, streak, strengthGains, personalRecords, progressPhotos, supabase, session }} />}
          {activeNav === 'nutrition' && <NutritionView {...{ nutritionToday, calorieGoal, proteinGoal, carbsGoal, fatsGoal, coachMealPlan, todayKey, weeklyCalories, onNavigate, setModal }} />}
          {activeNav === 'goals' && <GoalsView {...{ objective, objectiveLabel, currentWeight, goalWeight, weekSessions, streak, completedSessions, allBadges, levelInfo, levelTitle, xpData }} />}
          {activeNav === 'profile' && <ProfileView {...{ profile, avatarUrl, displayName, currentWeight, goalWeight, bodyFat, bmi, completedSessions, streak, onNavigate, setModal }} />}
          {activeNav === 'settings' && <SettingsView {...{ profile, onNavigate, setModal }} />}
        </main>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   PAGE: DASHBOARD (ACCUEIL)
   ═══════════════════════════════════════════════════ */
function DashboardView({ weeklyData, weekSessions, weekCalories, weekVolume, weeklyGoalPct, newRecords, todaySessionInfo, todaySessionDone, strengthGains, currentWeight, weightChange, bodyFat, objective, streak, nutritionToday, calorieGoal, proteinGoal, carbsGoal, fatsGoal, muscleStatus, recentSessions, badges, levelInfo, levelTitle, xpData, onNavigate, startProgramWorkout, colors: c }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
      {/* ROW 1: Performance + Metrics */}
      <Card span={8} style={{ minHeight: 320 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <CardTitle title="Performance Hebdomadaire" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><ChevronLeft size={14} color={MUTED} /></button>
            <span style={{ fontFamily: BODY, fontSize: 12, fontWeight: 600, color: TEXT }}>Semaine</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><ChevronRight size={14} color={MUTED} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          {[{ l: 'Seances', v: `${weekSessions}`, u: 'x' }, { l: 'Calories', v: weekCalories > 0 ? weekCalories.toLocaleString('fr-FR') : '0', u: 'kcal' }, { l: 'Volume', v: weekVolume > 0 ? weekVolume.toLocaleString('fr-FR') : '0', u: 'kg' }].map(s => (
            <div key={s.l}><div style={{ fontFamily: BODY, fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</div><div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 2 }}><span style={{ fontFamily: HEADLINE, fontSize: 20, fontWeight: 800, color: GOLD }}>{s.v}</span><span style={{ fontFamily: BODY, fontSize: 10, color: MUTED }}>{s.u}</span></div></div>
          ))}
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData.length > 0 ? weeklyData : DAYS_FR.map(d => ({ day: d, calories: 0, volume: 0 }))}>
              <defs><linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.3} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 11, fontFamily: BODY }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 11, fontFamily: BODY }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="calories" name="Calories" stroke={GOLD} strokeWidth={2.5} fill="url(#goldGrad)" dot={{ fill: GOLD, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: GOLD, stroke: BG, strokeWidth: 2 }} />
              <Line type="monotone" dataKey="volume" name="Volume (kg)" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} dot={{ fill: 'rgba(255,255,255,0.35)', r: 3, strokeWidth: 0 }} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card span={4} style={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}>
        <CardTitle title="Metriques Cles" />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Ring value={weekSessions} max={5} size={120} stroke={10} color={GOLD} label={`${weeklyGoalPct}%`} sublabel={`${weekSessions}/5 seances`} labelSize={28} sublabelSize={11} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 'auto' }}>
          <StatBox label="Frequence" value={`${weekSessions}x`} unit="/sem" />
          <StatBox label="Calories" value={weekCalories > 0 ? weekCalories.toLocaleString('fr-FR') : '0'} unit="kcal" />
          <StatBox label="Volume" value={weekVolume > 0 ? (weekVolume / 1000).toFixed(1) : '0'} unit="T" />
          <StatBox label="Records" value={`${newRecords}`} unit="nouveaux" />
        </div>
      </Card>

      {/* ROW 2: Today + Progress */}
      <Card span={6} style={{ minHeight: 280, background: todaySessionInfo ? `linear-gradient(135deg, rgba(14,14,14,0.95), rgba(14,14,14,0.8))` : CARD_BG }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: GOLD }}>Seance du Jour</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.25)' }} />
          {todaySessionDone ? <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 6, background: 'rgba(74,222,128,0.12)', color: SUCCESS }}>Terminee</span>
            : todaySessionInfo ? <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 6, background: 'rgba(230,195,100,0.12)', color: GOLD }}>A faire</span> : null}
        </div>
        {todaySessionInfo ? (<>
          <h3 style={{ fontFamily: HEADLINE, fontSize: 22, fontWeight: 700, color: TEXT, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{todaySessionInfo.name}</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>{todaySessionInfo.muscles.map((m: string) => <span key={m} style={{ fontFamily: BODY, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 6, background: 'rgba(230,195,100,0.08)', color: GOLD, border: `1px solid ${CARD_BORDER}` }}>{m}</span>)}</div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>{[{ l: 'SETS', v: todaySessionInfo.totalSets }, { l: 'EXERCICES', v: todaySessionInfo.exercises.length }, { l: 'REPOS', v: `${todaySessionInfo.avgRest}s` }].map(s => <div key={s.l}><div style={{ fontFamily: BODY, fontSize: 9, color: MUTED, letterSpacing: '0.1em' }}>{s.l}</div><div style={{ fontFamily: HEADLINE, fontSize: 20, fontWeight: 800, color: TEXT, marginTop: 2 }}>{s.v}</div></div>)}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => startProgramWorkout?.(todaySessionInfo.dayData, todaySessionInfo.exercises)} style={{ flex: 1, padding: '12px', background: `linear-gradient(135deg, ${GOLD}, ${c.goldContainer})`, color: '#0D0B08', fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Play size={14} fill="#0D0B08" />Demarrer</button>
            <button onClick={() => onNavigate?.('training')} style={{ padding: '12px 20px', background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: GOLD, fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 12, cursor: 'pointer' }}>Seance Libre</button>
          </div>
        </>) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '20px 0' }}>
            <div style={{ fontFamily: HEADLINE, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 8 }}>JOUR DE REPOS</div>
            <div style={{ fontFamily: BODY, fontSize: 13, color: MUTED, marginBottom: 20, textAlign: 'center' }}>Profite de ta recuperation.</div>
            <button onClick={() => onNavigate?.('training')} style={{ padding: '12px 24px', background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: GOLD, fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 12, cursor: 'pointer' }}>Seance Libre</button>
          </div>
        )}
      </Card>
      <Card span={6} onClick={() => onNavigate?.('progress')} style={{ minHeight: 280 }}>
        <CardTitle title="Ta Progression" chevron />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Gains Recents</div>
            {strengthGains.length > 0 ? strengthGains.slice(0, 3).map((pr: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: BODY, fontSize: 13, color: TEXT }}>{pr.name}</span>
                <span style={{ fontFamily: HEADLINE, fontSize: 11, fontWeight: 700, color: SUCCESS }}>+{Math.round(pr.value - pr.previous)}kg</span>
              </div>
            )) : <div style={{ fontFamily: BODY, fontSize: 12, color: MUTED }}>Aucun PR</div>}
          </div>
          <div>
            <div style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Composition</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: BODY, fontSize: 10, color: MUTED }}>Poids</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <span style={{ fontFamily: HEADLINE, fontSize: 28, fontWeight: 800, color: GOLD }}>{currentWeight || '—'}</span><span style={{ fontFamily: BODY, fontSize: 12, color: MUTED }}>kg</span>
                {weightChange !== null && <span style={{ fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, color: weightChange > 0 ? (objective === 'mass' || objective === 'bulk' ? SUCCESS : '#fb923c') : (objective === 'weight_loss' || objective === 'seche' ? SUCCESS : '#fb923c') }}>{weightChange > 0 ? '+' : ''}{weightChange} kg</span>}
              </div>
            </div>
            {bodyFat && <div style={{ marginBottom: 12 }}><div style={{ fontFamily: BODY, fontSize: 10, color: MUTED }}>Masse grasse</div><div style={{ fontFamily: HEADLINE, fontSize: 22, fontWeight: 700, color: '#fb923c', marginTop: 2 }}>{bodyFat}%</div></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}><Flame size={18} color="#fb923c" fill="#fb923c" /><span style={{ fontFamily: HEADLINE, fontSize: 18, fontWeight: 700, color: TEXT }}>{streak}</span><span style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>jours</span></div>
          </div>
        </div>
      </Card>

      {/* ROW 3: Nutrition + Recovery + History */}
      <Card span={5} style={{ minHeight: 240 }}>
        <CardTitle title="Nutrition du Jour" />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Ring value={nutritionToday.calories} max={calorieGoal} size={100} stroke={9} color={GOLD} label={`${nutritionToday.calories}`} sublabel={`/ ${calorieGoal} kcal`} labelSize={22} sublabelSize={9} /></div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
          {[{ l: 'Prot', v: nutritionToday.proteins, m: proteinGoal, c: '#3b82f6' }, { l: 'Gluc', v: nutritionToday.carbs, m: carbsGoal, c: '#f59e0b' }, { l: 'Lip', v: nutritionToday.fats, m: fatsGoal, c: '#10b981' }].map(n => (
            <div key={n.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Ring value={n.v} max={n.m} size={48} stroke={4} color={n.c} label={`${n.v}`} labelSize={13} />
              <span style={{ fontFamily: BODY, fontSize: 9, color: MUTED, textTransform: 'uppercase' }}>{n.l}</span>
              <span style={{ fontFamily: BODY, fontSize: 9, color: MUTED }}>{n.v}/{n.m}g</span>
            </div>
          ))}
        </div>
        <button onClick={() => onNavigate?.('nutrition')} style={{ width: '100%', padding: '10px', background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: GOLD, fontFamily: HEADLINE, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.30)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = CARD_BORDER }}><Plus size={12} />Ajouter un Repas</button>
      </Card>
      <Card span={3} style={{ minHeight: 240, padding: 0, overflow: 'hidden' }}>
        <div style={{ transform: 'scale(0.72)', transformOrigin: 'top center', marginTop: -8 }}><MuscleHeatMap muscleStatus={muscleStatus} /></div>
      </Card>
      <Card span={4} style={{ minHeight: 240 }}>
        <CardTitle title="Dernieres Seances" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {recentSessions.length > 0 ? recentSessions.slice(0, 3).map((s: any, i: number) => {
            const vol = (s.workout_sets || []).reduce((a: number, ws: any) => a + (ws.weight || 0) * (ws.reps || 0), 0)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <Activity size={13} color={GOLD} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: BODY, fontSize: 12, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || 'Seance'}</div><div style={{ fontFamily: BODY, fontSize: 10, color: MUTED }}>{dayLabel(new Date(s.created_at))} · {s.duration_minutes || '—'} min{vol > 0 ? ` · ${(vol / 1000).toFixed(1)}T` : ''}</div></div>
              </div>
            )
          }) : <div style={{ fontFamily: BODY, fontSize: 12, color: MUTED, textAlign: 'center', padding: '8px 0' }}>Aucune seance</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><span style={{ fontFamily: HEADLINE, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GOLD }}>Derniers Badges</span><div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {badges.length > 0 ? badges.map((b: any, i: number) => (
            <div key={i} style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(230,195,100,0.08)', border: `1px solid ${CARD_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }} title={b.badges?.name || b.badge_id}>{b.badges?.icon || '🏆'}</div>
          )) : [Trophy, Award, Flame].map((Icon, i) => <div key={i} style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color="rgba(255,255,255,0.15)" /></div>)}
        </div>
        {levelInfo && <div style={{ marginTop: 12, padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontFamily: BODY, fontSize: 9, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Niv. {levelInfo.level} · {levelTitle}</span><span style={{ fontFamily: BODY, fontSize: 9, color: MUTED }}>{xpData?.total_xp} XP</span></div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${GOLD}, ${colors.goldContainer})`, width: `${Math.round(levelInfo.progress * 100)}%`, transition: 'width 1s ease' }} /></div>
        </div>}
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   PAGE: ENTRAINEMENT
   ═══════════════════════════════════════════════════ */
function TrainingView({ todaySessionInfo, todaySessionDone, weekProgram, todayKey, recentSessions, personalRecords, strengthGains, weeklyVolume, weeklyData, startProgramWorkout, coachProgram, onNavigate }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
      {/* Today's session */}
      <Card span={8} style={{ minHeight: 300 }}>
        <CardTitle title="Seance du Jour" />
        {todaySessionInfo ? (<>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h3 style={{ fontFamily: HEADLINE, fontSize: 22, fontWeight: 700, color: TEXT, margin: 0, textTransform: 'uppercase' }}>{todaySessionInfo.name}</h3>
            {todaySessionDone ? <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'rgba(74,222,128,0.12)', color: SUCCESS, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Terminee</span>
              : <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'rgba(230,195,100,0.12)', color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em' }}>A faire</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {todaySessionInfo.exercises.map((ex: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: `1px solid rgba(255,255,255,0.04)` }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(230,195,100,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, color: GOLD }}>{i + 1}</div>
                <div style={{ flex: 1 }}><div style={{ fontFamily: BODY, fontSize: 13, fontWeight: 600, color: TEXT }}>{ex.exercise_name || ex.name}</div>{ex.muscle_group && <div style={{ fontFamily: BODY, fontSize: 10, color: MUTED }}>{ex.muscle_group}</div>}</div>
                <span style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>{ex.sets || 3}x{ex.reps || '10-12'}</span>
                <span style={{ fontFamily: BODY, fontSize: 10, color: MUTED }}>{ex.rest_seconds || 90}s</span>
              </div>
            ))}
          </div>
          <button onClick={() => startProgramWorkout?.(todaySessionInfo.dayData, todaySessionInfo.exercises)} style={{ marginTop: 16, width: '100%', padding: '14px', background: `linear-gradient(135deg, ${GOLD}, ${colors.goldContainer})`, color: '#0D0B08', fontFamily: HEADLINE, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Play size={14} fill="#0D0B08" />Demarrer la Seance</button>
        </>) : <div style={{ padding: 40, textAlign: 'center' }}><div style={{ fontFamily: HEADLINE, fontSize: 18, color: TEXT, marginBottom: 8 }}>JOUR DE REPOS</div><div style={{ fontFamily: BODY, fontSize: 13, color: MUTED }}>Aucune seance programmee.</div></div>}
      </Card>
      {/* Week program */}
      <Card span={4} style={{ minHeight: 300 }}>
        <CardTitle title="Programme Semaine" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {weekProgram.map((d: any) => {
            const isToday = d.dayFull === todayKey
            return (
              <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: isToday ? 'rgba(230,195,100,0.08)' : 'transparent', border: isToday ? `1px solid ${CARD_BORDER}` : '1px solid transparent' }}>
                <span style={{ fontFamily: HEADLINE, fontSize: 11, fontWeight: 700, color: isToday ? GOLD : MUTED, width: 32, letterSpacing: '0.1em' }}>{d.day}</span>
                <div style={{ flex: 1 }}><div style={{ fontFamily: BODY, fontSize: 12, color: d.rest ? MUTED : TEXT }}>{d.name}</div>{d.muscles?.length > 0 && <div style={{ fontFamily: BODY, fontSize: 9, color: MUTED }}>{d.muscles.join(' · ')}</div>}</div>
                {!d.rest && <Dumbbell size={12} color={isToday ? GOLD : MUTED} />}
              </div>
            )
          })}
        </div>
      </Card>
      {/* Recent sessions table */}
      <Card span={6}>
        <CardTitle title="Dernieres Seances" chevron />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recentSessions.slice(0, 6).map((s: any, i: number) => {
            const vol = (s.workout_sets || []).reduce((a: number, ws: any) => a + (ws.weight || 0) * (ws.reps || 0), 0)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <Activity size={13} color={GOLD} />
                <div style={{ flex: 1 }}><div style={{ fontFamily: BODY, fontSize: 12, color: TEXT }}>{s.name || 'Seance'}</div></div>
                <span style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>{dayLabel(new Date(s.created_at))}</span>
                <span style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>{s.duration_minutes || '—'} min</span>
                <span style={{ fontFamily: HEADLINE, fontSize: 11, fontWeight: 700, color: GOLD }}>{vol > 0 ? `${(vol / 1000).toFixed(1)}T` : '—'}</span>
              </div>
            )
          })}
        </div>
      </Card>
      {/* Records */}
      <Card span={6}>
        <CardTitle title="Records Personnels" chevron />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {strengthGains.length > 0 ? strengthGains.map((pr: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: BODY, fontSize: 13, color: TEXT }}>{pr.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>{Math.round(pr.previous)}kg</span><span style={{ color: MUTED }}>→</span>
                <span style={{ fontFamily: HEADLINE, fontSize: 13, fontWeight: 700, color: TEXT }}>{Math.round(pr.value)}kg</span>
                <span style={{ fontFamily: HEADLINE, fontSize: 11, fontWeight: 700, color: SUCCESS }}>+{Math.round(pr.value - pr.previous)}kg</span>
              </div>
            </div>
          )) : <div style={{ fontFamily: BODY, fontSize: 12, color: MUTED, textAlign: 'center', padding: 20 }}>Aucun record enregistre</div>}
        </div>
      </Card>
      {/* Volume chart */}
      <Card span={12} style={{ minHeight: 200 }}>
        <CardTitle title="Volume par Semaine" />
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyVolume?.length > 0 ? weeklyVolume : [{ week: 'Sem.', volume: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" tick={{ fill: MUTED, fontSize: 10, fontFamily: BODY }} axisLine={false} tickLine={false} tickFormatter={(v: string) => { const d = new Date(v); return d.getDate ? `S${Math.ceil(d.getDate() / 7)}` : v }} />
              <YAxis tick={{ fill: MUTED, fontSize: 10, fontFamily: BODY }} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => v > 1000 ? `${(v / 1000).toFixed(0)}T` : `${v}`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="volume" name="Volume (kg)" fill={GOLD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   PAGE: PROGRESSION
   ═══════════════════════════════════════════════════ */
function ProgressView({ weightHistory, currentWeight, goalWeight, bodyFat, bmi, streak, strengthGains, personalRecords, progressPhotos, supabase, session }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
      {/* Weight chart */}
      <Card span={8} style={{ minHeight: 320 }}>
        <CardTitle title="Evolution du Poids" />
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weightHistory?.length > 0 ? weightHistory.map((w: any) => ({ ...w, date: new Date(w.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) })) : [{ date: '-', poids: 0 }]}>
              <defs><linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.2} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 10, fontFamily: BODY }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: MUTED, fontSize: 10, fontFamily: BODY }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="poids" name="Poids (kg)" stroke={GOLD} strokeWidth={2.5} fill="url(#wGrad)" dot={{ fill: GOLD, r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      {/* Stats */}
      <Card span={4} style={{ minHeight: 320 }}>
        <CardTitle title="Stats Globales" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><div style={{ fontFamily: BODY, fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Poids actuel</div><div style={{ fontFamily: HEADLINE, fontSize: 32, fontWeight: 800, color: GOLD, marginTop: 4 }}>{currentWeight || '—'} <span style={{ fontSize: 14, color: MUTED }}>kg</span></div></div>
          {goalWeight && <div><div style={{ fontFamily: BODY, fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Objectif</div><div style={{ fontFamily: HEADLINE, fontSize: 22, fontWeight: 700, color: TEXT, marginTop: 4 }}>{goalWeight} kg</div></div>}
          {bodyFat && <div><div style={{ fontFamily: BODY, fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Masse grasse</div><div style={{ fontFamily: HEADLINE, fontSize: 22, fontWeight: 700, color: '#fb923c', marginTop: 4 }}>{bodyFat}%</div></div>}
          {bmi && <div><div style={{ fontFamily: BODY, fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>IMC</div><div style={{ fontFamily: HEADLINE, fontSize: 22, fontWeight: 700, color: TEXT, marginTop: 4 }}>{bmi}</div></div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Flame size={18} color="#fb923c" fill="#fb923c" /><span style={{ fontFamily: HEADLINE, fontSize: 20, fontWeight: 700, color: TEXT }}>{streak}</span><span style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>jours de streak</span></div>
        </div>
      </Card>
      {/* Records */}
      <Card span={6}>
        <CardTitle title="Records Personnels" chevron />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(personalRecords || []).filter((pr: any) => pr.record_type === '1rm').slice(0, 8).map((pr: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: BODY, fontSize: 13, color: TEXT }}>{pr.exercise_name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: HEADLINE, fontSize: 14, fontWeight: 700, color: GOLD }}>{Math.round(pr.value)} kg</span>
                <span style={{ fontFamily: BODY, fontSize: 10, color: MUTED }}>1RM</span>
              </div>
            </div>
          ))}
          {(!personalRecords || personalRecords.length === 0) && <div style={{ fontFamily: BODY, fontSize: 12, color: MUTED, textAlign: 'center', padding: 20 }}>Aucun record</div>}
        </div>
      </Card>
      {/* Photos */}
      <Card span={6}>
        <CardTitle title="Photos Avant / Apres" />
        {progressPhotos?.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {progressPhotos.slice(0, 6).map((p: any, i: number) => (
              <div key={i} style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '3/4', background: '#1c1b1b', border: `1px solid ${CARD_BORDER}` }}>
                <img src={supabase.storage.from('progress-photos').getPublicUrl(p.photo_url).data.publicUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            ))}
          </div>
        ) : <div style={{ fontFamily: BODY, fontSize: 12, color: MUTED, textAlign: 'center', padding: 40 }}>Aucune photo de progression</div>}
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   PAGE: NUTRITION
   ═══════════════════════════════════════════════════ */
function NutritionView({ nutritionToday, calorieGoal, proteinGoal, carbsGoal, fatsGoal, coachMealPlan, todayKey, weeklyCalories, onNavigate, setModal }: any) {
  const mealTypes = [{ id: 'petit_dejeuner', label: 'Petit-dejeuner', icon: '🥣' }, { id: 'dejeuner', label: 'Dejeuner', icon: '🍽️' }, { id: 'diner', label: 'Diner', icon: '🌙' }, { id: 'collation', label: 'Collation', icon: '🍎' }]
  const todayMeals = coachMealPlan?.[todayKey]?.repas || {}

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
      {/* Journal */}
      <Card span={8} style={{ minHeight: 300 }}>
        <CardTitle title="Journal du Jour" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mealTypes.map(mt => {
            const foods = todayMeals[mt.id] || []
            return (
              <div key={mt.id} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{mt.icon}</span>
                  <span style={{ fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{mt.label}</span>
                  <span style={{ fontFamily: BODY, fontSize: 10, color: MUTED, marginLeft: 'auto' }}>{(foods as any[]).length} aliment{(foods as any[]).length !== 1 ? 's' : ''}</span>
                </div>
                {(foods as any[]).length > 0 ? (foods as any[]).map((f: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontFamily: BODY, fontSize: 12, color: MUTED }}>
                    <span>{f.name || f.aliment || 'Aliment'}</span>
                    <span style={{ color: GOLD }}>{f.kcal || f.calories || '—'} kcal</span>
                  </div>
                )) : <div style={{ fontFamily: BODY, fontSize: 11, color: MUTED, fontStyle: 'italic' }}>Aucun aliment enregistre</div>}
              </div>
            )
          })}
        </div>
        <button onClick={() => setModal?.('food')} style={{ marginTop: 16, width: '100%', padding: '12px', background: `linear-gradient(135deg, ${GOLD}, ${colors.goldContainer})`, color: '#0D0B08', fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Plus size={14} />Ajouter un Aliment</button>
      </Card>
      {/* Macros ring */}
      <Card span={4} style={{ minHeight: 300 }}>
        <CardTitle title="Macros du Jour" />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Ring value={nutritionToday.calories} max={calorieGoal} size={130} stroke={12} color={GOLD} label={`${nutritionToday.calories}`} sublabel={`/ ${calorieGoal} kcal`} labelSize={26} sublabelSize={10} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          {[{ l: 'Proteines', v: nutritionToday.proteins, m: proteinGoal, c: '#3b82f6' }, { l: 'Glucides', v: nutritionToday.carbs, m: carbsGoal, c: '#f59e0b' }, { l: 'Lipides', v: nutritionToday.fats, m: fatsGoal, c: '#10b981' }].map(n => (
            <div key={n.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Ring value={n.v} max={n.m} size={56} stroke={5} color={n.c} label={`${n.v}`} labelSize={14} />
              <span style={{ fontFamily: BODY, fontSize: 9, color: MUTED, textTransform: 'uppercase' }}>{n.l}</span>
              <span style={{ fontFamily: BODY, fontSize: 9, color: MUTED }}>{n.v}/{n.m}g</span>
            </div>
          ))}
        </div>
      </Card>
      {/* Weekly macros chart */}
      <Card span={12} style={{ minHeight: 200 }}>
        <CardTitle title="Calories Hebdomadaires" />
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyCalories?.length > 0 ? weeklyCalories.map((d: any) => ({ ...d, date: new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short' }) })) : [{ date: '-', calories: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 10, fontFamily: BODY }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 10, fontFamily: BODY }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="calories" name="Calories" fill={GOLD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   PAGE: OBJECTIFS
   ═══════════════════════════════════════════════════ */
function GoalsView({ objective, objectiveLabel, currentWeight, goalWeight, weekSessions, streak, completedSessions, allBadges, levelInfo, levelTitle, xpData }: any) {
  const pct = currentWeight && goalWeight ? Math.min(100, Math.round(Math.abs(1 - Math.abs(currentWeight - goalWeight) / Math.max(Math.abs((goalWeight > currentWeight ? goalWeight : currentWeight) - (goalWeight > currentWeight ? currentWeight : goalWeight)), 1)) * 100)) : 0
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
      {/* Main goal */}
      <Card span={12} style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <CardTitle title="Objectif Principal" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Ring value={pct} max={100} size={140} stroke={12} color={GOLD} label={`${pct}%`} sublabel={objectiveLabel} labelSize={32} sublabelSize={10} />
          <div>
            <div style={{ fontFamily: BODY, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Objectif</div>
            <div style={{ fontFamily: HEADLINE, fontSize: 32, fontWeight: 800, color: TEXT }}>{objectiveLabel}</div>
            {goalWeight && <div style={{ fontFamily: BODY, fontSize: 14, color: MUTED, marginTop: 8 }}>{currentWeight || '—'} kg → <span style={{ color: GOLD, fontWeight: 700 }}>{goalWeight} kg</span></div>}
          </div>
        </div>
      </Card>
      {/* Mini goals */}
      <Card span={4}>
        <CardTitle title="Poids Cible" />
        <div style={{ textAlign: 'center' }}><div style={{ fontFamily: HEADLINE, fontSize: 36, fontWeight: 800, color: GOLD }}>{goalWeight || '—'} <span style={{ fontSize: 16, color: MUTED }}>kg</span></div><div style={{ fontFamily: BODY, fontSize: 11, color: MUTED, marginTop: 4 }}>Actuel: {currentWeight || '—'} kg</div></div>
      </Card>
      <Card span={4}>
        <CardTitle title="Seances / Semaine" />
        <div style={{ textAlign: 'center' }}><div style={{ fontFamily: HEADLINE, fontSize: 36, fontWeight: 800, color: GOLD }}>{weekSessions} <span style={{ fontSize: 16, color: MUTED }}>/ 5</span></div><div style={{ fontFamily: BODY, fontSize: 11, color: MUTED, marginTop: 4 }}>{completedSessions} seances au total</div></div>
      </Card>
      <Card span={4}>
        <CardTitle title="Streak" />
        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Flame size={28} color="#fb923c" fill="#fb923c" /><div style={{ fontFamily: HEADLINE, fontSize: 36, fontWeight: 800, color: TEXT }}>{streak}</div><span style={{ fontFamily: BODY, fontSize: 14, color: MUTED }}>jours</span></div>
      </Card>
      {/* Badges + XP */}
      <Card span={12}>
        <CardTitle title="Badges Debloques" />
        {allBadges?.length > 0 ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {allBadges.map((b: any, i: number) => (
              <div key={i} style={{ width: 64, height: 64, borderRadius: 14, background: 'rgba(230,195,100,0.08)', border: `1px solid ${CARD_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }} title={b.badges?.name || b.badge_id}>{b.badges?.icon || '🏆'}</div>
            ))}
          </div>
        ) : <div style={{ fontFamily: BODY, fontSize: 12, color: MUTED, textAlign: 'center', padding: 20 }}>Aucun badge debloque. Continue tes efforts !</div>}
        {levelInfo && <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontFamily: HEADLINE, fontSize: 13, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Niveau {levelInfo.level} · {levelTitle}</span><span style={{ fontFamily: BODY, fontSize: 12, color: MUTED }}>{xpData?.total_xp} XP</span></div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${GOLD}, ${colors.goldContainer})`, width: `${Math.round(levelInfo.progress * 100)}%`, transition: 'width 1s ease' }} /></div>
          <div style={{ fontFamily: BODY, fontSize: 10, color: MUTED, marginTop: 4 }}>{levelInfo.xpInLevel} / {levelInfo.xpForNext} XP pour le niveau suivant</div>
        </div>}
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   PAGE: PROFIL
   ═══════════════════════════════════════════════════ */
function ProfileView({ profile, avatarUrl, displayName, currentWeight, goalWeight, bodyFat, bmi, completedSessions, streak, onNavigate, setModal }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
      {/* Left: Photo + info */}
      <Card span={4} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: `3px solid rgba(201,168,76,0.3)` }} />
          : <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#1c1b1b', border: '3px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEADLINE, fontSize: 36, fontWeight: 700, color: GOLD }}>{displayName[0]?.toUpperCase()}</div>}
        <h2 style={{ fontFamily: HEADLINE, fontSize: 18, fontWeight: 700, color: TEXT, margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{displayName}</h2>
        <div style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>{profile?.email}</div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          {[{ l: 'Poids', v: currentWeight ? `${currentWeight} kg` : '—' }, { l: 'Objectif', v: goalWeight ? `${goalWeight} kg` : '—' }, { l: 'Masse grasse', v: bodyFat ? `${bodyFat}%` : '—' }, { l: 'IMC', v: bmi || '—' }, { l: 'Seances', v: `${completedSessions}` }, { l: 'Streak', v: `${streak} jours` }].map(s => (
            <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: BODY, fontSize: 12, color: MUTED }}>{s.l}</span>
              <span style={{ fontFamily: HEADLINE, fontSize: 13, fontWeight: 700, color: GOLD }}>{s.v}</span>
            </div>
          ))}
        </div>
      </Card>
      {/* Right: Settings */}
      <Card span={8}>
        <CardTitle title="Informations" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { l: 'Nom complet', v: profile?.full_name || '—' }, { l: 'Email', v: profile?.email || '—' },
            { l: 'Genre', v: profile?.gender === 'male' ? 'Homme' : profile?.gender === 'female' ? 'Femme' : '—' },
            { l: 'Date de naissance', v: profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('fr-FR') : '—' },
            { l: 'Taille', v: profile?.height ? `${profile.height} cm` : '—' },
            { l: 'Niveau activite', v: profile?.activity_level || '—' },
            { l: 'Objectif', v: OBJECTIVE_LABELS[profile?.objective] || '—' },
            { l: 'Abonnement', v: profile?.subscription_status === 'active' ? 'Actif' : profile?.subscription_status || '—' },
          ].map(f => (
            <div key={f.l} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontFamily: BODY, fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{f.l}</div>
              <div style={{ fontFamily: BODY, fontSize: 14, color: TEXT }}>{f.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={() => setModal?.('weight')} style={{ flex: 1, padding: '12px', background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: GOLD, fontFamily: HEADLINE, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Scale size={14} />Peser</button>
          <button onClick={() => setModal?.('measure')} style={{ flex: 1, padding: '12px', background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: GOLD, fontFamily: HEADLINE, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Ruler size={14} />Mensurations</button>
          <button onClick={() => setModal?.('bmr')} style={{ flex: 1, padding: '12px', background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: GOLD, fontFamily: HEADLINE, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Zap size={14} />BMR</button>
        </div>
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   PAGE: REGLAGES
   ═══════════════════════════════════════════════════ */
function SettingsView({ profile, onNavigate, setModal }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
      <Card span={6}>
        <CardTitle title="Parametres du Compte" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { l: 'Rappels entrainement', v: profile?.reminder_enabled ? 'Active' : 'Desactive' },
            { l: 'Heure preferee', v: profile?.preferred_training_time || '—' },
            { l: 'Objectif calorique', v: profile?.calorie_goal ? `${profile.calorie_goal} kcal` : '—' },
            { l: 'Objectif hydratation', v: profile?.water_goal ? `${profile.water_goal} ml` : '3000 ml' },
          ].map(s => (
            <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: BODY, fontSize: 13, color: TEXT }}>{s.l}</span>
              <span style={{ fontFamily: BODY, fontSize: 13, color: GOLD, fontWeight: 600 }}>{s.v}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card span={6}>
        <CardTitle title="Actions Rapides" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setModal?.('objective')} style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${CARD_BORDER}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: TEXT, fontFamily: BODY, fontSize: 13 }}><Target size={16} color={GOLD} />Modifier mon objectif</button>
          <button onClick={() => setModal?.('bmr')} style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${CARD_BORDER}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: TEXT, fontFamily: BODY, fontSize: 13 }}><Zap size={16} color={GOLD} />Recalculer mes macros</button>
          <button onClick={() => onNavigate?.('profil')} style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${CARD_BORDER}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: TEXT, fontFamily: BODY, fontSize: 13 }}><User size={16} color={GOLD} />Modifier mon profil</button>
        </div>
      </Card>
    </div>
  )
}
