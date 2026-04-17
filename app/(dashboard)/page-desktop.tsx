'use client'
import React, { useState, useEffect, useMemo } from 'react'
import {
  Home, Dumbbell, BarChart3, UtensilsCrossed, Target, User, Settings,
  ChevronRight, ChevronLeft, ChevronDown, LogOut, Play, Plus,
  Flame, Activity, TrendingUp, Calendar, MessageCircle, Sparkles, Trophy, Award,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart,
} from 'recharts'
import { colors, fonts } from '../../lib/design-tokens'
import MuscleHeatMap, { calculateMuscleStatus } from '../components/ui/MuscleHeatMap'
import { getTodaySession } from '../../lib/get-today-session'
import { getLevelFromXP, getLevelTitle } from '../../lib/gamification'

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */
type NavItem = 'dashboard' | 'workouts' | 'analytics' | 'nutrition' | 'goals' | 'profile' | 'settings'

interface DesktopDashboardProps {
  session: any
  profile: any
  supabase: any
  coachProgram: any
  todayKey: string
  todaySessionDone: boolean
  streak: number
  wSessions: any[]
  currentWeight: number | undefined
  personalRecords: any[]
  onSignOut: () => void
  onNavigate?: (tab: string) => void
  startProgramWorkout?: (day: any, exercises: any[]) => void
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

const NAV_ITEMS: { id: NavItem; icon: typeof Home; label: string }[] = [
  { id: 'dashboard', icon: Home, label: 'Dashboard' },
  { id: 'workouts', icon: Dumbbell, label: 'Workouts' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
  { id: 'goals', icon: Target, label: 'Goals' },
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

const OBJECTIVE_LABELS: Record<string, string> = {
  mass: 'PRISE DE MASSE', bulk: 'PRISE DE MASSE',
  weight_loss: 'SECHE', seche: 'SECHE',
  maintain: 'MAINTIEN', maintenance: 'MAINTIEN',
  performance: 'PERFORMANCE', recomposition: 'RECOMPOSITION',
}

const QUOTES: Record<string, string[]> = {
  bulk: [
    'Chaque calorie compte. Tu construis la meilleure version de toi-meme.',
    'La masse se construit jour apres jour, rep apres rep.',
    'Ton corps est une machine — donne-lui le carburant qu\'il merite.',
  ],
  cut: [
    'Chaque jour de discipline te rapproche de la definition parfaite.',
    'La seche, c\'est reveler le chef-d\'oeuvre que tu as construit.',
    'Le sacrifice temporaire pour un resultat permanent.',
  ],
  maintain: [
    'L\'equilibre est le vrai luxe. Tu l\'as trouve.',
    'Maintenir, c\'est maitriser. Tu controles ton physique.',
    'La constance silencieuse est la plus grande force.',
  ],
}

function getDailyQuote(objective?: string): string {
  const key = (objective === 'weight_loss' || objective === 'seche') ? 'cut'
    : (objective === 'mass' || objective === 'bulk') ? 'bulk' : 'maintain'
  const quotes = QUOTES[key]
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return quotes[dayOfYear % quotes.length]
}

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

/* ── SVG Ring ── */
function Ring({ value, max, size = 100, stroke = 8, color = GOLD, label, sublabel, labelSize, sublabelSize }: {
  value: number; max: number; size?: number; stroke?: number; color?: string
  label?: string; sublabel?: string; labelSize?: number; sublabelSize?: number
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / (max || 1), 1)
  const offset = circ * (1 - pct)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {label && <span style={{ fontFamily: HEADLINE, fontSize: labelSize || size * 0.28, fontWeight: 800, color: TEXT }}>{label}</span>}
        {sublabel && <span style={{ fontFamily: BODY, fontSize: sublabelSize || size * 0.12, color: MUTED, marginTop: 1 }}>{sublabel}</span>}
      </div>
    </div>
  )
}

/* ── Card wrapper ── */
function Card({ children, span = 4, style, onClick }: {
  children: React.ReactNode; span?: number; style?: React.CSSProperties; onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: `span ${span}`,
        background: CARD_BG,
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.30)' : CARD_BORDER}`,
        borderRadius: CARD_RADIUS,
        boxShadow: CARD_SHADOW,
        padding: 24,
        cursor: onClick ? 'pointer' : 'default',
        transform: hovered && onClick ? 'translateY(-2px)' : 'none',
        transition: 'all 200ms ease',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ── Card Title ── */
function CardTitle({ title, chevron }: { title: string; chevron?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <span style={{ fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: GOLD, whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.25)' }} />
      {chevron && <ChevronRight size={16} color={MUTED} />}
    </div>
  )
}

/* ── Custom Tooltip ── */
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

/* ── Icon Button ── */
function IconBtn({ Icon, badge, onClick }: { Icon: typeof Home; badge?: number; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', width: 36, height: 36, borderRadius: '50%',
        background: hovered ? 'rgba(230,195,100,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${CARD_BORDER}`, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 150ms',
      }}>
      <Icon size={16} color={hovered ? GOLD : TEXT} />
      {badge !== undefined && badge > 0 && (
        <span style={{
          position: 'absolute', top: -2, right: -2, width: 16, height: 16,
          background: '#ef4444', borderRadius: '50%', fontSize: 9, fontWeight: 700,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge > 9 ? '9+' : badge}</span>
      )}
    </button>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function DesktopDashboard({
  session, profile, supabase, coachProgram, todayKey, todaySessionDone,
  streak, wSessions, currentWeight, personalRecords,
  onSignOut, onNavigate, startProgramWorkout,
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
  const [prevBodyFat, setPrevBodyFat] = useState<number | null>(null)

  // Fetch data
  useEffect(() => {
    if (!session?.user?.id) return
    const uid = session.user.id
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]

    // Weekly sessions for chart + metrics
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
          const sessionCal = (s.duration_minutes || 0) * 8
          cal += sessionCal
          if (byDay[day]) byDay[day].calories += sessionCal
          ;(s.workout_sets || []).forEach((set: any) => {
            const v = (set.weight || 0) * (set.reps || 0)
            vol += v
            if (byDay[day]) byDay[day].volume += v
          })
        })
        setWeeklyData(DAYS_FR.map(d => ({ day: d, calories: byDay[d].calories, volume: Math.round(byDay[d].volume) })))
        setWeekSessions(data.length)
        setWeekVolume(vol)
        setWeekCalories(cal)
      })

    // Recent sessions
    supabase.from('workout_sessions').select('*, workout_sets(*)').eq('user_id', uid)
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }: any) => { if (data) setRecentSessions(data) })

    // Today's nutrition
    supabase.from('daily_food_logs').select('*').eq('user_id', uid).eq('date', today)
      .then(({ data }: any) => {
        if (!data) return
        let cal = 0, prot = 0, carb = 0, fat = 0
        data.forEach((f: any) => { cal += f.calories || 0; prot += f.proteins || 0; carb += f.carbs || 0; fat += f.fats || 0 })
        setNutritionToday({ calories: Math.round(cal), proteins: Math.round(prot), carbs: Math.round(carb), fats: Math.round(fat) })
      })

    // New PRs this week
    supabase.from('personal_records').select('id').eq('user_id', uid).gte('achieved_at', weekAgo)
      .then(({ data }: any) => { setNewRecords(data?.length || 0) })

    // Muscle status from recent workout sets (3 days)
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    supabase.from('workout_sets').select('exercise_name, created_at').eq('user_id', uid)
      .gte('created_at', threeDaysAgo)
      .then(({ data }: any) => { if (data) setMuscleStatus(calculateMuscleStatus(data)) })

    // Badges (last 3 unlocked)
    supabase.from('user_badges').select('badge_id, earned_at, badges(name, icon, category)')
      .eq('user_id', uid).order('earned_at', { ascending: false }).limit(3)
      .then(({ data }: any) => { if (data) setBadges(data) })

    // XP
    supabase.from('user_xp').select('total_xp, current_streak').eq('user_id', uid).maybeSingle()
      .then(({ data }: any) => { if (data) setXpData(data) })

    // Weight history (2 entries for comparison)
    supabase.from('weight_logs').select('poids, date').eq('user_id', uid)
      .order('date', { ascending: false }).limit(2)
      .then(({ data }: any) => { if (data?.[1]) setPrevWeight(data[1].poids) })

  }, [session?.user?.id])

  // Computed values
  const bodyFat = profile?.body_fat_pct || null
  const calorieGoal = profile?.calorie_goal || 2500
  const proteinGoal = Math.round(calorieGoal * 0.3 / 4)
  const carbsGoal = Math.round(calorieGoal * 0.4 / 4)
  const fatsGoal = Math.round(calorieGoal * 0.3 / 9)
  const displayName = profile?.full_name || 'Athlete'
  const firstName = displayName.split(' ')[0]
  const avatarUrl = profile?.avatar_url || session?.user?.user_metadata?.avatar_url
  const objective = profile?.objective || 'maintain'
  const objectiveLabel = OBJECTIVE_LABELS[objective] || 'MAINTIEN'
  const quote = getDailyQuote(objective)

  // Today's session from coach program
  const todaySessionInfo = useMemo(() => {
    if (!coachProgram) return null
    // Coach program is keyed by French day name
    const dayData = coachProgram[todayKey]
    if (!dayData || dayData.repos) return null
    const exercises = dayData.exercises || []
    const name = dayData.day_name || dayData.name || 'Seance du jour'
    const muscles = [...new Set(exercises.map((e: any) => e.muscle_group || '').filter(Boolean))] as string[]
    const totalSets = exercises.reduce((s: number, e: any) => s + (e.sets || 3), 0)
    const totalVolume = exercises.reduce((s: number, e: any) => s + (e.sets || 3) * (e.reps || 10) * (e.weight || 20), 0)
    const avgRest = exercises.length > 0 ? Math.round(exercises.reduce((s: number, e: any) => s + (e.rest_seconds || 90), 0) / exercises.length) : 90
    return { name, exercises, muscles, totalSets, totalVolume, avgRest, dayData }
  }, [coachProgram, todayKey])

  // Strength gains from PRs
  const strengthGains = useMemo(() => {
    if (!personalRecords?.length) return []
    // Group by exercise, get latest with previous_value
    const byExercise: Record<string, { name: string; value: number; previous: number }> = {}
    personalRecords.forEach((pr: any) => {
      if (pr.record_type !== '1rm' || !pr.previous_value) return
      if (!byExercise[pr.exercise_name]) {
        byExercise[pr.exercise_name] = { name: pr.exercise_name, value: pr.value, previous: pr.previous_value }
      }
    })
    return Object.values(byExercise).slice(0, 3)
  }, [personalRecords])

  // Weight change
  const weightChange = currentWeight && prevWeight ? +(currentWeight - prevWeight).toFixed(1) : null

  // XP / Level
  const levelInfo = xpData ? getLevelFromXP(xpData.total_xp) : null
  const levelTitle = levelInfo ? getLevelTitle(levelInfo.level) : null

  // Objective pct
  const weeklyGoalPct = Math.round((weekSessions / 5) * 100)

  /* handle nav click */
  function handleNavClick(id: NavItem) {
    setActiveNav(id)
    if (id !== 'dashboard' && onNavigate) {
      const tabMap: Record<string, string> = {
        workouts: 'training', analytics: 'progress', nutrition: 'nutrition',
        goals: 'progress', profile: 'profil', settings: 'profil',
      }
      onNavigate(tabMap[id] || 'home')
    }
  }

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100dvh', background: BG, color: TEXT, fontFamily: BODY }}>

      {/* ═══════════════════════════════════════════════════
          SIDEBAR
         ═══════════════════════════════════════════════════ */}
      <aside style={{
        width: 240, flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100dvh',
        background: BG, borderRight: `1px solid ${CARD_BORDER}`,
        display: 'flex', flexDirection: 'column', zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-moovx.png" alt="MoovX" style={{ height: 40, width: 40, borderRadius: 10, objectFit: 'contain' }} />
          <span style={{ fontFamily: HEADLINE, fontSize: 14, fontWeight: 700, color: GOLD, letterSpacing: '0.15em' }}>MOOVX</span>
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: 'rgba(230,195,100,0.10)', margin: '0 20px 16px' }} />

        {/* Profile compact */}
        <div style={{ padding: '0 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(201,168,76,0.30)' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1c1b1b', border: '2px solid rgba(201,168,76,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEADLINE, fontSize: 16, fontWeight: 700, color: GOLD }}>
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontFamily: HEADLINE, fontSize: 13, fontWeight: 700, color: TEXT, letterSpacing: '0.05em' }}>{displayName}</div>
            <div style={{ fontFamily: BODY, fontSize: 9, fontWeight: 700, color: GOLD, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{objectiveLabel}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
            const active = activeNav === id
            return (
              <button key={id} onClick={() => handleNavClick(id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 10, background: active ? 'rgba(230,195,100,0.08)' : 'transparent',
                border: 'none', borderLeft: `3px solid ${active ? GOLD : 'transparent'}`,
                cursor: 'pointer', width: '100%', textAlign: 'left',
                transition: 'all 150ms',
              }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon size={18} color={active ? GOLD : 'rgba(255,255,255,0.6)'} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontFamily: BODY, fontSize: 14, fontWeight: active ? 700 : 500, color: active ? GOLD : 'rgba(255,255,255,0.6)' }}>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '16px 20px' }}>
          <button onClick={onSignOut} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
            cursor: 'pointer', padding: '8px 0', color: MUTED, fontFamily: BODY, fontSize: 12,
            fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
          >
            <LogOut size={14} />
            Deconnexion
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════
          MAIN CONTENT
         ═══════════════════════════════════════════════════ */}
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>

        {/* ── STICKY HEADER ── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40, height: 64,
          background: 'rgba(19,19,19,0.8)', backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${CARD_BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 36px',
        }}>
          <div>
            <h1 style={{ fontFamily: HEADLINE, fontSize: 22, fontWeight: 700, color: TEXT, margin: 0, letterSpacing: '0.08em' }}>
              BONJOUR {firstName.toUpperCase()}
            </h1>
            <p style={{ fontFamily: BODY, fontSize: 12, color: MUTED, margin: 0, maxWidth: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {quote}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => onNavigate?.('progress')} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              background: 'rgba(230,195,100,0.08)', border: `1px solid ${CARD_BORDER}`,
              borderRadius: 8, cursor: 'pointer', transition: 'all 150ms',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = CARD_BORDER }}
            >
              <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.1em' }}>{objectiveLabel}</span>
              <ChevronDown size={12} color={GOLD} />
            </button>
            <IconBtn Icon={Sparkles} onClick={() => onNavigate?.('home')} />
            <IconBtn Icon={Calendar} onClick={() => onNavigate?.('training')} />
            <IconBtn Icon={MessageCircle} onClick={() => onNavigate?.('messages')} />
          </div>
        </header>

        {/* ── SCROLLABLE CONTENT ── */}
        <main style={{ flex: 1, padding: '28px 36px 40px', overflowY: 'auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 16,
          }}>

            {/* ═══ ROW 1 ═══ */}

            {/* WIDGET 1 — PERFORMANCE HEBDOMADAIRE (col 8) */}
            <Card span={8} style={{ minHeight: 320 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <CardTitle title="Performance Hebdomadaire" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><ChevronLeft size={14} color={MUTED} /></button>
                  <span style={{ fontFamily: BODY, fontSize: 12, fontWeight: 600, color: TEXT }}>Semaine</span>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><ChevronRight size={14} color={MUTED} /></button>
                </div>
              </div>
              {/* Mini stats row */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                {[
                  { label: 'Seances', value: `${weekSessions}`, unit: 'x' },
                  { label: 'Calories', value: weekCalories > 0 ? weekCalories.toLocaleString('fr-FR') : '0', unit: 'kcal' },
                  { label: 'Volume', value: weekVolume > 0 ? weekVolume.toLocaleString('fr-FR') : '0', unit: 'kg' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontFamily: BODY, fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 2 }}>
                      <span style={{ fontFamily: HEADLINE, fontSize: 20, fontWeight: 800, color: GOLD }}>{s.value}</span>
                      <span style={{ fontFamily: BODY, fontSize: 10, color: MUTED }}>{s.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Chart */}
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData.length > 0 ? weeklyData : DAYS_FR.map(d => ({ day: d, calories: 0, volume: 0 }))}>
                    <defs>
                      <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 11, fontFamily: BODY }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: MUTED, fontSize: 11, fontFamily: BODY }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="calories" name="Calories" stroke={GOLD} strokeWidth={2.5} fill="url(#goldGradient)"
                      dot={{ fill: GOLD, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: GOLD, stroke: BG, strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="volume" name="Volume (kg)" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5}
                      dot={{ fill: 'rgba(255,255,255,0.35)', r: 3, strokeWidth: 0 }} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* WIDGET 2 — METRIQUES CORE (col 4) */}
            <Card span={4} style={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}>
              <CardTitle title="Metriques Cles" />
              {/* Ring center */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <Ring value={weekSessions} max={5} size={120} stroke={10} color={GOLD}
                  label={`${weeklyGoalPct}%`} sublabel={`${weekSessions}/5 seances`} labelSize={28} sublabelSize={11} />
              </div>
              {/* Grid 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 'auto' }}>
                {[
                  { label: 'Frequence', value: `${weekSessions}x`, sub: '/sem' },
                  { label: 'Calories', value: weekCalories > 0 ? weekCalories.toLocaleString('fr-FR') : '0', sub: 'kcal' },
                  { label: 'Volume', value: weekVolume > 0 ? (weekVolume / 1000).toFixed(1) : '0', sub: 'T' },
                  { label: 'Records', value: `${newRecords}`, sub: 'nouveaux' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontFamily: BODY, fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                      <span style={{ fontFamily: HEADLINE, fontSize: 20, fontWeight: 800, color: GOLD }}>{m.value}</span>
                      <span style={{ fontFamily: BODY, fontSize: 9, color: MUTED }}>{m.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ═══ ROW 2 ═══ */}

            {/* WIDGET 3 — SEANCE DU JOUR (col 6) */}
            <Card span={6} style={{
              minHeight: 280, position: 'relative',
              background: todaySessionInfo
                ? `linear-gradient(135deg, rgba(14,14,14,0.95), rgba(14,14,14,0.8)), url('/gym-bg.jpg')`
                : CARD_BG,
              backgroundSize: 'cover',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: GOLD }}>Seance du Jour</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.25)' }} />
                {todaySessionDone ? (
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 6, background: 'rgba(74,222,128,0.12)', color: SUCCESS }}>Terminee</span>
                ) : todaySessionInfo ? (
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 6, background: 'rgba(230,195,100,0.12)', color: GOLD }}>A faire</span>
                ) : null}
              </div>

              {todaySessionInfo ? (
                <>
                  <h3 style={{ fontFamily: HEADLINE, fontSize: 22, fontWeight: 700, color: TEXT, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {todaySessionInfo.name}
                  </h3>
                  {/* Muscle badges */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {todaySessionInfo.muscles.map(m => (
                      <span key={m} style={{
                        fontFamily: BODY, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                        padding: '3px 10px', borderRadius: 6, background: 'rgba(230,195,100,0.08)', color: GOLD, border: `1px solid ${CARD_BORDER}`,
                      }}>{m}</span>
                    ))}
                  </div>
                  {/* Mini stats */}
                  <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                    {[
                      { label: 'SETS', value: todaySessionInfo.totalSets },
                      { label: 'EXERCICES', value: todaySessionInfo.exercises.length },
                      { label: 'REPOS', value: `${todaySessionInfo.avgRest}s` },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ fontFamily: BODY, fontSize: 9, color: MUTED, letterSpacing: '0.1em' }}>{s.label}</div>
                        <div style={{ fontFamily: HEADLINE, fontSize: 20, fontWeight: 800, color: TEXT, marginTop: 2 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => {
                      if (startProgramWorkout && todaySessionInfo.dayData) {
                        startProgramWorkout(todaySessionInfo.dayData, todaySessionInfo.exercises)
                      }
                    }} style={{
                      flex: 1, padding: '12px',
                      background: `linear-gradient(135deg, ${GOLD}, ${colors.goldContainer})`,
                      color: '#0D0B08', fontFamily: HEADLINE, fontSize: 12, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.12em',
                      borderRadius: 12, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      <Play size={14} fill="#0D0B08" />
                      Demarrer
                    </button>
                    <button onClick={() => onNavigate?.('training')} style={{
                      padding: '12px 20px', background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                      color: GOLD, fontFamily: HEADLINE, fontSize: 12, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      borderRadius: 12, cursor: 'pointer', transition: 'all 200ms',
                    }}>
                      Seance Libre
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '20px 0' }}>
                  <div style={{ fontFamily: HEADLINE, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 8 }}>JOUR DE REPOS</div>
                  <div style={{ fontFamily: BODY, fontSize: 13, color: MUTED, marginBottom: 20, textAlign: 'center' }}>
                    Profite de ta recuperation pour revenir plus fort demain.
                  </div>
                  <button onClick={() => onNavigate?.('training')} style={{
                    padding: '12px 24px', background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                    color: GOLD, fontFamily: HEADLINE, fontSize: 12, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 12, cursor: 'pointer',
                  }}>
                    Seance Libre
                  </button>
                </div>
              )}
            </Card>

            {/* WIDGET 4 — PROGRESSION (col 6) */}
            <Card span={6} onClick={() => onNavigate?.('progress')} style={{ minHeight: 280 }}>
              <CardTitle title="Ta Progression" chevron />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Left — Strength Gains */}
                <div>
                  <div style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Gains Recents</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {strengthGains.length > 0 ? strengthGains.map((pr, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: BODY, fontSize: 13, color: TEXT }}>{pr.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>{Math.round(pr.previous)}kg</span>
                          <span style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>→</span>
                          <span style={{ fontFamily: HEADLINE, fontSize: 13, fontWeight: 700, color: TEXT }}>{Math.round(pr.value)}kg</span>
                          <span style={{ fontFamily: HEADLINE, fontSize: 11, fontWeight: 700, color: SUCCESS }}>
                            <TrendingUp size={11} style={{ marginRight: 2 }} />
                            +{Math.round(pr.value - pr.previous)}kg
                          </span>
                        </div>
                      </div>
                    )) : (
                      <div style={{ fontFamily: BODY, fontSize: 12, color: MUTED }}>Aucun PR enregistre</div>
                    )}
                  </div>
                </div>
                {/* Right — Composition */}
                <div>
                  <div style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Composition</div>
                  {/* Weight */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: BODY, fontSize: 10, color: MUTED }}>Poids</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                      <span style={{ fontFamily: HEADLINE, fontSize: 28, fontWeight: 800, color: GOLD }}>
                        {currentWeight || '—'}
                      </span>
                      <span style={{ fontFamily: BODY, fontSize: 12, color: MUTED }}>kg</span>
                      {weightChange !== null && (
                        <span style={{ fontFamily: HEADLINE, fontSize: 12, fontWeight: 700, color: weightChange > 0 ? (objective === 'mass' || objective === 'bulk' ? SUCCESS : '#fb923c') : (objective === 'weight_loss' || objective === 'seche' ? SUCCESS : '#fb923c') }}>
                          {weightChange > 0 ? '+' : ''}{weightChange} kg
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Body fat */}
                  {bodyFat && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontFamily: BODY, fontSize: 10, color: MUTED }}>Masse grasse</div>
                      <div style={{ fontFamily: HEADLINE, fontSize: 22, fontWeight: 700, color: '#fb923c', marginTop: 2 }}>
                        {bodyFat}%
                      </div>
                    </div>
                  )}
                  {/* Streak */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Flame size={18} color="#fb923c" fill="#fb923c" />
                    <span style={{ fontFamily: HEADLINE, fontSize: 18, fontWeight: 700, color: TEXT }}>{streak}</span>
                    <span style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>jours</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* ═══ ROW 3 ═══ */}

            {/* WIDGET 5 — NUTRITION DU JOUR (col 5) */}
            <Card span={5} style={{ minHeight: 240 }}>
              <CardTitle title="Nutrition du Jour" />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <Ring value={nutritionToday.calories} max={calorieGoal} size={100} stroke={9} color={GOLD}
                  label={`${nutritionToday.calories}`} sublabel={`/ ${calorieGoal} kcal`} labelSize={22} sublabelSize={9} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
                {[
                  { label: 'Prot', value: nutritionToday.proteins, max: proteinGoal, color: '#3b82f6' },
                  { label: 'Gluc', value: nutritionToday.carbs, max: carbsGoal, color: '#f59e0b' },
                  { label: 'Lip', value: nutritionToday.fats, max: fatsGoal, color: '#10b981' },
                ].map(n => (
                  <div key={n.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Ring value={n.value} max={n.max} size={48} stroke={4} color={n.color}
                      label={`${n.value}`} labelSize={13} />
                    <span style={{ fontFamily: BODY, fontSize: 9, color: MUTED, textTransform: 'uppercase' }}>{n.label}</span>
                    <span style={{ fontFamily: BODY, fontSize: 9, color: MUTED }}>{n.value}/{n.max}g</span>
                  </div>
                ))}
              </div>
              <button onClick={() => onNavigate?.('nutrition')} style={{
                width: '100%', padding: '10px',
                background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                color: GOLD, fontFamily: HEADLINE, fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                borderRadius: 10, cursor: 'pointer', transition: 'all 200ms',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.30)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = CARD_BORDER }}
              >
                <Plus size={12} />
                Ajouter un Repas
              </button>
            </Card>

            {/* WIDGET 6 — RECUPERATION (col 3) */}
            <Card span={3} style={{ minHeight: 240, padding: 0, overflow: 'hidden' }}>
              <div style={{ transform: 'scale(0.72)', transformOrigin: 'top center', marginTop: -8 }}>
                <MuscleHeatMap muscleStatus={muscleStatus} />
              </div>
            </Card>

            {/* WIDGET 7 — HISTORIQUE & BADGES (col 4) */}
            <Card span={4} style={{ minHeight: 240 }}>
              {/* Recent sessions */}
              <CardTitle title="Dernieres Seances" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {recentSessions.length > 0 ? recentSessions.slice(0, 3).map((s, i) => {
                  const d = new Date(s.created_at)
                  const today = new Date()
                  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
                  const dayLabel = d.toDateString() === today.toDateString() ? "Auj." : d.toDateString() === yesterday.toDateString() ? 'Hier' : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
                  const vol = (s.workout_sets || []).reduce((a: number, ws: any) => a + (ws.weight || 0) * (ws.reps || 0), 0)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 2 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                      <Activity size={13} color={GOLD} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: BODY, fontSize: 12, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || 'Seance'}</div>
                        <div style={{ fontFamily: BODY, fontSize: 10, color: MUTED }}>{dayLabel} · {s.duration_minutes || '—'} min{vol > 0 ? ` · ${(vol / 1000).toFixed(1)}T` : ''}</div>
                      </div>
                    </div>
                  )
                }) : (
                  <div style={{ fontFamily: BODY, fontSize: 12, color: MUTED, textAlign: 'center', padding: '8px 0' }}>Aucune seance</div>
                )}
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: HEADLINE, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GOLD }}>Derniers Badges</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
              </div>
              {badges.length > 0 ? (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  {badges.map((b, i) => (
                    <div key={i} style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'rgba(230,195,100,0.08)', border: `1px solid ${CARD_BORDER}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20,
                    }} title={b.badges?.name || b.badge_id}>
                      {b.badges?.icon || '🏆'}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  {[Trophy, Award, Flame].map((Icon, i) => (
                    <div key={i} style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.06)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={18} color="rgba(255,255,255,0.15)" />
                    </div>
                  ))}
                </div>
              )}

              {/* XP bar */}
              {levelInfo && (
                <div style={{ marginTop: 12, padding: '8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: BODY, fontSize: 9, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Niv. {levelInfo.level} · {levelTitle}
                    </span>
                    <span style={{ fontFamily: BODY, fontSize: 9, color: MUTED }}>{xpData?.total_xp} XP</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${GOLD}, ${colors.goldContainer})`, width: `${Math.round(levelInfo.progress * 100)}%`, transition: 'width 1s ease' }} />
                  </div>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
