'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import dynamic from 'next/dynamic'
import { getRole } from '../lib/getRole'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Flame, LogOut, Scale, TrendingDown, Target, Dumbbell,
  Plus, CheckCircle2, Zap, Award, Calendar, BarChart2,
  User, UtensilsCrossed, X, Check, Camera, Ruler,
  Users, Crown, Trash2, ChevronRight, Upload,
  Activity, Heart, Search, Filter, ChevronDown, ChevronUp,
  Timer, Play, Pause, RotateCcw, Info, Sparkles, Utensils, Moon, TrendingUp
} from 'lucide-react'

import WorkoutSession from './components/WorkoutSession'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const COACH_EMAIL = "bobitosm@gmail.com"

type Tab = 'home' | 'training' | 'nutrition' | 'progress' | 'profil'

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Petit-déj', icon: '🥣' },
  { id: 'lunch', label: 'Déjeuner', icon: '🍽️' },
  { id: 'dinner', label: 'Dîner', icon: '🌙' },
  { id: 'snack', label: 'Collation', icon: '🍎' },
]

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sédentaire', sub: 'Bureau, peu/pas de sport', mult: 1.2 },
  { id: 'light', label: 'Légèrement actif', sub: '1-3 séances/semaine', mult: 1.375 },
  { id: 'moderate', label: 'Modérément actif', sub: '3-5 séances/semaine', mult: 1.55 },
  { id: 'active', label: 'Très actif', sub: '6-7 séances/semaine', mult: 1.725 },
  { id: 'extreme', label: 'Extrêmement actif', sub: 'Athlète / 2x/jour', mult: 1.9 },
]

const JS_DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const WEEK_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

// Design tokens
const BG_BASE = '#0A0A0A'
const BG_CARD = '#1A1A1A'
const BORDER = '#2A2A2A'
const ORANGE = '#F97316'
const GREEN = '#22C55E'
const TEXT_PRIMARY = '#F8FAFC'
const TEXT_MUTED = '#6B7280'
const RADIUS_CARD = 20

function calcMifflinStJeor(weight: number, height: number, age: number, gender: string) {
  const base = 10 * weight + 6.25 * height - 5 * age
  return gender === 'male' ? base + 5 : base - 161
}
function calcKatchMcArdle(weight: number, bodyFatPct: number) {
  const leanMass = weight * (1 - bodyFatPct / 100)
  return 370 + 21.6 * leanMass
}
function calcHarrisBenedict(weight: number, height: number, age: number, gender: string) {
  return gender === 'male'
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age
}

export default function CoachApp() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [weightHistory, setWeightHistory] = useState<any[]>([])
  const [measurements, setMeasurements] = useState<any[]>([])
  const [progressPhotos, setProgressPhotos] = useState<any[]>([])
  const [todayMeals, setTodayMeals] = useState<any[]>([])
  const [wSessions, setWSessions] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [userProgram, setUserProgram] = useState<any>(null)
  const [coachProgram, setCoachProgram] = useState<any>(null)
  const [coachMealPlan, setCoachMealPlan] = useState<any>(null)
  const [weightHistory30, setWeightHistory30] = useState<{ date: string; poids: number }[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [roleChecked, setRoleChecked] = useState(false)

  const [workoutSession, setWorkoutSession] = useState<{ name: string; exercises: any[] } | null>(null)

  const [modal, setModal] = useState<string | null>(null)
  const [restTimer, setRestTimer] = useState<number>(0)
  const [restMax, setRestMax] = useState<number>(90)
  const [restRunning, setRestRunning] = useState(false)
  const restIntervalRef = useRef<any>(null)

  const [programFilter, setProgramFilter] = useState({ level: '', goal: '', gender: '' })
  const [selectedProgram, setSelectedProgram] = useState<any>(null)
  const [programDays, setProgramDays] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [dayExercises, setDayExercises] = useState<any[]>([])

  const [foodSearch, setFoodSearch] = useState('')
  const [foodResults, setFoodResults] = useState<any[]>([])
  const [customFoods, setCustomFoods] = useState<any[]>([])
  const [selectedFood, setSelectedFood] = useState<any>(null)
  const [foodQty, setFoodQty] = useState('100')
  const [mealType, setMealType] = useState('lunch')
  const [customFoodForm, setCustomFoodForm] = useState({ name: '', brand: '', calories_per_100g: '', proteins_per_100g: '', carbs_per_100g: '', fats_per_100g: '' })
  const [searchTab, setSearchTab] = useState<'anses' | 'custom'>('anses')

  const [weightForm, setWeightForm] = useState('')
  const [measureForm, setMeasureForm] = useState({ chest: '', waist: '', hips: '', left_arm: '', right_arm: '', left_thigh: '', right_thigh: '', body_fat: '', muscle_mass: '' })
  const [bmrForm, setBmrForm] = useState({ weight: '', height: '', age: '', gender: 'male', activity: 'moderate', body_fat: '' })
  const [bmrResult, setBmrResult] = useState<any>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<any>(null)

  // Training tab: expanded day
  const [activeDay, setActiveDay] = useState<string | null>(null)
  // Nutrition tab: selected day for coach plan
  const [nutritionDay, setNutritionDay] = useState<string>(JS_DAYS_FR[new Date().getDay()])
  // Profil tab: phone editing
  const [phoneForm, setPhoneForm] = useState('')
  const [phoneEditing, setPhoneEditing] = useState(false)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setLoading(false) })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    getRole(session.user.id, session.access_token).then(role => {
      console.log('[page] role received:', role, '| user:', session.user.id)
      if (role === 'super_admin') { router.replace('/admin') }
      else if (role === 'coach') { router.replace('/coach') }
      else setRoleChecked(true)
    })
  }, [session])

  useEffect(() => { if (session) fetchAll() }, [session])

  useEffect(() => {
    if (restRunning && restTimer > 0) {
      restIntervalRef.current = setInterval(() => {
        setRestTimer(t => {
          if (t <= 1) { setRestRunning(false); clearInterval(restIntervalRef.current); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(restIntervalRef.current)
  }, [restRunning])

  useEffect(() => {
    clearTimeout(searchRef.current)
    if (foodSearch.length < 2) { setFoodResults([]); return }
    searchRef.current = setTimeout(async () => {
      if (searchTab === 'anses') {
        const { data } = await supabase.from('food_items').select('*').ilike('name', `%${foodSearch}%`).limit(20)
        setFoodResults(data || [])
      } else {
        const { data } = await supabase.from('custom_foods').select('*').eq('user_id', session?.user?.id).ilike('name', `%${foodSearch}%`).limit(20)
        setFoodResults(data || [])
      }
    }, 300)
  }, [foodSearch, searchTab])

  async function fetchAll() {
    const uid = session?.user?.id
    if (!uid) return
    const today = new Date().toISOString().split('T')[0]

    const [profRes, weightsRes, mealsRes, sessRes, measureRes, photosRes, progsRes, userProgRes, coachProgRes, coachMealRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('weight_logs').select('date, poids').eq('user_id', uid).order('date', { ascending: true }).limit(30),
      supabase.from('meal_logs').select('*').eq('user_id', uid).eq('date', today),
      supabase.from('workout_sessions').select('*, workout_sets(*)').eq('user_id', uid).order('created_at', { ascending: false }).limit(10),
      supabase.from('body_measurements').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(10),
      supabase.from('progress_photos').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(20),
      supabase.from('training_programs').select('*').eq('is_template', true),
      supabase.from('user_programs').select('*, training_programs(*)').eq('user_id', uid).eq('active', true).single(),
      supabase.from('client_programs').select('program').eq('client_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('client_meal_plans').select('plan').eq('client_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (profRes.data) { setProfile(profRes.data); if (profRes.data.phone) setPhoneForm(profRes.data.phone) }
    setWeightHistory(weightsRes.data?.map(w => ({ ...w, date: format(new Date(w.date), 'dd/MM', { locale: fr }) })) || [])
    setTodayMeals(mealsRes.data || [])
    setWSessions(sessRes.data || [])
    setMeasurements(measureRes.data || [])
    setProgressPhotos(photosRes.data || [])
    setPrograms(progsRes.data || [])
    if (userProgRes.data) setUserProgram(userProgRes.data)
    setWeightHistory30((weightsRes.data || []).map(w => ({ date: w.date, poids: w.poids })))
    if (coachProgRes.data?.program) setCoachProgram(coachProgRes.data.program)
    console.log('[fetchAll] coachMealRes raw:', JSON.stringify(coachMealRes))
    if (coachMealRes.data?.plan) setCoachMealPlan(coachMealRes.data.plan)
    else console.warn('[fetchAll] No coach meal plan found for client_id:', uid, '| error:', coachMealRes.error)

    if (session?.user?.email === COACH_EMAIL) {
      const { data } = await supabase.from('coach_clients').select('*, profiles!coach_clients_client_id_fkey(*)').eq('coach_id', uid)
      setClients(data || [])
    }

    if (profRes.data) {
      const age = profRes.data.birth_date ? Math.floor((Date.now() - new Date(profRes.data.birth_date).getTime()) / 31557600000) : ''
      setBmrForm(p => ({
        ...p,
        weight: profRes.data.current_weight?.toString() || '',
        height: profRes.data.height?.toString() || '',
        age: age.toString(),
        gender: profRes.data.gender || 'male',
        activity: profRes.data.activity_level || 'moderate',
        body_fat: profRes.data.body_fat_pct?.toString() || '',
      }))
    }
  }

  async function loadProgram(prog: any) {
    setSelectedProgram(prog)
    const { data: days } = await supabase.from('program_days').select('*').eq('program_id', prog.id).order('day_number')
    setProgramDays(days || [])
    if (days && days.length > 0) loadDayExercises(days[0])
  }

  async function loadDayExercises(day: any) {
    setSelectedDay(day)
    const { data: exos } = await supabase.from('program_exercises').select('*').eq('program_day_id', day.id).order('order_index')
    setDayExercises(exos || [])
  }

  async function startProgramWorkout(day: any, exercises: any[]) {
    setWorkoutSession({ name: day.day_name, exercises })
  }

  async function onFinishWorkout(data: any) {
    const { data: sess } = await supabase.from('workout_sessions').insert({
      user_id: session.user.id,
      name: workoutSession?.name,
      completed: true,
      duration_minutes: Math.round(data.duration / 60000),
      notes: `${data.completedSets}/${data.totalSets} sets · ${Math.round(data.totalVolume)} kg volume`,
    }).select().single()

    if (sess) {
      const setsToInsert: any[] = []
      data.exercises.forEach((exo: any) => {
        exo.sets.forEach((s: any, i: number) => {
          setsToInsert.push({
            session_id: sess.id,
            user_id: session.user.id,
            exercise_name: exo.name,
            set_number: i + 1,
            reps: s.reps || 0,
            weight: s.weight || 0,
            completed: true,
          })
        })
      })
      if (setsToInsert.length > 0) {
        await supabase.from('workout_sets').insert(setsToInsert)
      }
    }
    toast.success('Séance terminée ! Bien joué 💪')
    fetchAll()
  }

  function calculateBMR() {
    const w = parseFloat(bmrForm.weight)
    const h = parseFloat(bmrForm.height)
    const a = parseInt(bmrForm.age)
    const bf = parseFloat(bmrForm.body_fat)
    if (!w || !h || !a) return

    const mifflin = calcMifflinStJeor(w, h, a, bmrForm.gender)
    const harris = calcHarrisBenedict(w, h, a, bmrForm.gender)
    const katch = bf ? calcKatchMcArdle(w, bf) : null
    const actMult = ACTIVITY_LEVELS.find(l => l.id === bmrForm.activity)?.mult || 1.55
    const tdee = Math.round((katch || mifflin) * actMult)
    const fatLoss = Math.round(tdee * 0.8)
    const massGain = Math.round(tdee * 1.1)
    const protein = Math.round(w * 2.2)
    const proteinCal = protein * 4
    const fatCal = Math.round(tdee * 0.25)
    const fat = Math.round(fatCal / 9)
    const carbs = Math.round((tdee - proteinCal - fatCal) / 4)

    setBmrResult({ mifflin: Math.round(mifflin), harris: Math.round(harris), katch: katch ? Math.round(katch) : null, tdee, fatLoss, massGain, protein, fat, carbs })
    supabase.from('profiles').upsert({ id: session.user.id, current_weight: w, height: h, gender: bmrForm.gender, activity_level: bmrForm.activity, body_fat_pct: bf || null, calorie_goal: tdee })
  }

  async function addFoodToMeal() {
    if (!selectedFood) return
    const qty = parseFloat(foodQty) || 100
    const isCustom = searchTab === 'custom'
    const cals = isCustom ? selectedFood.calories_per_100g : selectedFood.energy_kcal || selectedFood.calories || 0
    const prot = isCustom ? selectedFood.proteins_per_100g : selectedFood.proteins || 0
    const carb = isCustom ? selectedFood.carbs_per_100g : selectedFood.carbohydrates || selectedFood.carbs || 0
    const fat = isCustom ? selectedFood.fats_per_100g : selectedFood.fat || selectedFood.fats || 0

    await supabase.from('meal_logs').insert({
      user_id: session.user.id, meal_type: mealType,
      name: `${selectedFood.name}${selectedFood.brand ? ` (${selectedFood.brand})` : ''} ${qty}g`,
      calories: Math.round(cals * qty / 100),
      proteins: Math.round(prot * qty / 100 * 10) / 10,
      carbs: Math.round(carb * qty / 100 * 10) / 10,
      fats: Math.round(fat * qty / 100 * 10) / 10,
      quantity_g: qty,
      ...(isCustom ? { custom_food_id: selectedFood.id } : { food_id: selectedFood.id }),
    })
    setSelectedFood(null); setFoodSearch(''); setFoodResults([])
    toast.success('Aliment ajouté !')
    setModal(null); fetchAll()
  }

  async function addCustomFood() {
    const f = customFoodForm
    if (!f.name || !f.calories_per_100g) return
    await supabase.from('custom_foods').insert({
      user_id: session.user.id, name: f.name, brand: f.brand,
      calories_per_100g: parseFloat(f.calories_per_100g),
      proteins_per_100g: parseFloat(f.proteins_per_100g) || 0,
      carbs_per_100g: parseFloat(f.carbs_per_100g) || 0,
      fats_per_100g: parseFloat(f.fats_per_100g) || 0,
    })
    setCustomFoodForm({ name: '', brand: '', calories_per_100g: '', proteins_per_100g: '', carbs_per_100g: '', fats_per_100g: '' })
    toast.success('Aliment créé !')
    setModal(null); fetchAll()
  }

  async function saveWeight() {
    if (!weightForm) return
    const val = parseFloat(weightForm)
    await supabase.from('weight_logs').insert({ user_id: session.user.id, poids: val })
    await supabase.from('profiles').upsert({ id: session.user.id, current_weight: val })
    if (!profile?.start_weight) await supabase.from('profiles').update({ start_weight: val }).eq('id', session.user.id)
    toast.success('Poids enregistré !')
    setWeightForm(''); setModal(null); fetchAll()
  }

  async function saveMeasurements() {
    const data: any = { user_id: session.user.id }
    Object.entries(measureForm).forEach(([k, v]) => { if (v) data[k] = parseFloat(v as string) })
    await supabase.from('body_measurements').insert(data)
    setMeasureForm({ chest: '', waist: '', hips: '', left_arm: '', right_arm: '', left_thigh: '', right_thigh: '', body_fat: '', muscle_mass: '' })
    toast.success('Mensurations enregistrées !')
    setModal(null); fetchAll()
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setAvatarUploading(true)
    const path = `${session.user.id}/avatar.${file.name.split('.').pop()}`
    await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').upsert({ id: session.user.id, avatar_url: publicUrl })
    setAvatarUploading(false); fetchAll()
  }

  async function savePhone() {
    await supabase.from('profiles').update({ phone: phoneForm }).eq('id', session.user.id)
    toast.success('Numéro enregistré !')
    setPhoneEditing(false); fetchAll()
  }

  async function uploadProgressPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoUploading(true)
    const path = `${session.user.id}/${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('progress-photos').upload(path, file)
    if (uploadError) { toast.error('Erreur lors de l\'upload'); setPhotoUploading(false); return }
    // Save the storage path — public URL is derived at render time
    await supabase.from('progress_photos').insert({ user_id: session.user.id, photo_url: path, view_type: 'front' })
    toast.success('Photo ajoutée !')
    setPhotoUploading(false); fetchAll()
  }

  const totalCals = useMemo(() => todayMeals.reduce((s, m) => s + (m.calories || 0), 0), [todayMeals])
  const totalProteins = useMemo(() => todayMeals.reduce((s, m) => s + (m.proteins || 0), 0), [todayMeals])
  const totalCarbs = useMemo(() => todayMeals.reduce((s: number, m: any) => s + (m.carbs || 0), 0), [todayMeals])
  const totalFats = useMemo(() => todayMeals.reduce((s: number, m: any) => s + (m.fats || 0), 0), [todayMeals])
  const calorieGoal = profile?.calorie_goal || 2500
  const goalWeight = profile?.goal_weight || 75
  const currentWeight = profile?.current_weight
  const latestMeasure = measurements[0]
  const completedSessions = wSessions.filter(s => s.completed).length
  const streak = (() => {
    const dates = new Set(wSessions.filter(s => s.completed).map(s => new Date(s.created_at).toDateString()))
    let count = 0; const d = new Date()
    while (dates.has(d.toDateString())) { count++; d.setDate(d.getDate() - 1) }
    return count
  })()
  const todayKey = JS_DAYS_FR[new Date().getDay()]
  const todayCoachDay = coachProgram ? (coachProgram[todayKey] ?? { repos: false, exercises: [] }) : null
  const chartMin = weightHistory30.length > 0 ? Math.min(...weightHistory30.map(p => p.poids)) - 1 : 0
  const chartMax = weightHistory30.length > 0 ? Math.max(...weightHistory30.map(p => p.poids)) + 1 : 1
  const isCoach = session?.user?.email === COACH_EMAIL
  const filteredPrograms = programs.filter(p =>
    (!programFilter.level || p.level === programFilter.level) &&
    (!programFilter.goal || p.goal === programFilter.goal) &&
    (!programFilter.gender || p.gender === programFilter.gender || p.gender === 'both')
  )
  const calPct = Math.min(100, (totalCals / (calorieGoal || 1)) * 100)
  const donutR = 52
  const donutCirc = 2 * Math.PI * donutR
  const donutOffset = donutCirc * (1 - calPct / 100)

  if (!mounted || loading) return (
    <div style={{ minHeight: '100vh', background: BG_BASE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${ORANGE}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (session && !roleChecked) return (
    <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: ORANGE, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={20} color="#fff" strokeWidth={2.5} />
        </div>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.1em' }}>FITPRO</span>
      </div>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid #374151`, borderTopColor: ORANGE, animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&display=swap');`}</style>
    </div>
  )

  if (!session) return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');.fd{font-family:'Bebas Neue',sans-serif;letter-spacing:.05em}`}</style>
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#C9A84C]/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-[#C9A84C] to-[#8B6914] rounded-[24px] flex items-center justify-center shadow-[0_20px_60px_rgba(201,168,76,0.3)] rotate-3 mb-5">
            <Flame size={40} fill="white" className="text-white -rotate-3" />
          </div>
          <h1 className="fd text-6xl text-white tracking-widest">COACHPRO</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-px w-12 bg-[#C9A84C]/30" />
            <p className="text-[#C9A84C]/50 text-[9px] tracking-[0.3em] uppercase">Elite Performance</p>
            <div className="h-px w-12 bg-[#C9A84C]/30" />
          </div>
        </div>
        <div className="bg-[#111]/80 border border-white/5 rounded-[28px] p-6">
          <Auth supabaseClient={supabase}
            appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#C9A84C', brandAccent: '#8B6914' }, radii: { borderRadiusButton: '14px', inputBorderRadius: '14px' } } } }}
            theme="dark" providers={['google']}
            localization={{ variables: { sign_in: { email_label: 'Email', password_label: 'Mot de passe', button_label: 'Connexion', social_provider_text: 'Continuer avec {{provider}}' } } }}
          />
        </div>
      </div>
    </div>
  )

  const displayAvatar = profile?.avatar_url || session.user.user_metadata?.avatar_url
  const fullName = profile?.full_name || session.user.user_metadata?.full_name || 'Athlete'
  const firstName = fullName.split(' ')[0]
  const userName = firstName

  return (
    <div style={{ minHeight: '100vh', background: BG_BASE, color: TEXT_PRIMARY, fontFamily: "'Barlow', sans-serif", paddingBottom: 88 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      {/* ── WorkoutSession fullscreen ── */}
      {workoutSession && (
        <WorkoutSession
          sessionName={workoutSession.name}
          exercises={workoutSession.exercises}
          onFinish={onFinishWorkout}
          onClose={() => { setWorkoutSession(null); fetchAll() }}
        />
      )}

      {/* ═══════════════════ MODAL POIDS ═══════════════════ */}
      {modal === 'weight' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>LOG POIDS</h3>
              <button onClick={() => setModal(null)} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input type="number" step="0.1" value={weightForm} onChange={e => setWeightForm(e.target.value)} placeholder="0.0"
                style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 48px 20px 20px', color: TEXT_PRIMARY, fontSize: '3rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textAlign: 'center', outline: 'none' }} />
              <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, fontSize: '0.9rem', fontWeight: 600 }}>kg</span>
            </div>
            {currentWeight && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.75rem', marginBottom: 16 }}>Précédent : {currentWeight} kg</p>}
            <button onClick={saveWeight} style={{ width: '100%', background: GREEN, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Enregistrer</button>
          </div>
        </div>
      )}

      {/* ═══════════════════ MODAL MESURES ═══════════════════ */}
      {modal === 'measure' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto' }}>
          <div style={{ background: BG_CARD, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', marginTop: 64, minHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>MENSURATIONS</h3>
              <button onClick={() => setModal(null)} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { key: 'chest', label: 'Poitrine', unit: 'cm' },
                { key: 'waist', label: 'Taille', unit: 'cm' },
                { key: 'hips', label: 'Hanches', unit: 'cm' },
                { key: 'left_arm', label: 'Bras gauche', unit: 'cm' },
                { key: 'right_arm', label: 'Bras droit', unit: 'cm' },
                { key: 'left_thigh', label: 'Cuisse gauche', unit: 'cm' },
                { key: 'right_thigh', label: 'Cuisse droite', unit: 'cm' },
                { key: 'body_fat', label: '% Masse grasse', unit: '%' },
                { key: 'muscle_mass', label: 'Masse musculaire', unit: 'kg' },
              ].map(({ key, label, unit }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px' }}>
                  <span style={{ fontSize: '0.85rem', color: TEXT_MUTED, flex: 1 }}>{label}</span>
                  <input type="number" step="0.1" value={(measureForm as any)[key]}
                    onChange={e => setMeasureForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder="—" style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '0.95rem', fontWeight: 700, textAlign: 'right', width: 64, outline: 'none', border: 'none' }} />
                  <span style={{ color: TEXT_MUTED, fontSize: '0.75rem', width: 24 }}>{unit}</span>
                </div>
              ))}
            </div>
            <button onClick={saveMeasurements} style={{ width: '100%', background: GREEN, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 20 }}>Enregistrer</button>
          </div>
        </div>
      )}

      {/* ═══════════════════ MODAL BMR ═══════════════════ */}
      {modal === 'bmr' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto' }}>
          <div style={{ background: BG_CARD, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', marginTop: 40, minHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 2px' }}>CALCULATEUR BMR</h3>
                <p style={{ fontSize: '0.7rem', color: TEXT_MUTED, margin: 0 }}>Mifflin-St Jeor · Katch-McArdle · Harris-Benedict</p>
              </div>
              <button onClick={() => setModal(null)} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[['weight', 'Poids', 'kg'], ['height', 'Taille', 'cm'], ['age', 'Âge', 'ans'], ['body_fat', '% Graisse (opt.)', '%']].map(([key, label, unit]) => (
                <div key={key} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" value={(bmrForm as any)[key]} onChange={e => setBmrForm(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="0" style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '0.95rem', fontWeight: 700, flex: 1, outline: 'none', border: 'none', width: '100%' }} />
                    <span style={{ color: TEXT_MUTED, fontSize: '0.75rem' }}>{unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[['male', 'Homme'], ['female', 'Femme']].map(([val, label]) => (
                <button key={val} onClick={() => setBmrForm(p => ({ ...p, gender: val }))}
                  style={{ border: `1px solid ${bmrForm.gender === val ? ORANGE : BORDER}`, background: bmrForm.gender === val ? `${ORANGE}18` : BG_BASE, borderRadius: 12, padding: '12px', fontSize: '0.85rem', fontWeight: 700, color: bmrForm.gender === val ? ORANGE : TEXT_MUTED, cursor: 'pointer', transition: 'all 200ms' }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Niveau d'activité</div>
              {ACTIVITY_LEVELS.map(l => (
                <button key={l.id} onClick={() => setBmrForm(p => ({ ...p, activity: l.id }))}
                  style={{ width: '100%', border: `1px solid ${bmrForm.activity === l.id ? ORANGE + '80' : BORDER}`, background: bmrForm.activity === l.id ? `${ORANGE}10` : BG_BASE, borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, cursor: 'pointer', transition: 'all 200ms' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: bmrForm.activity === l.id ? ORANGE : TEXT_PRIMARY }}>{l.label}</div>
                    <div style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>{l.sub}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: TEXT_MUTED }}>×{l.mult}</span>
                </button>
              ))}
            </div>
            <button onClick={calculateBMR} style={{ width: '100%', background: ORANGE, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Calculer mon TDEE</button>
            {bmrResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: BG_BASE, border: `1px solid ${ORANGE}30`, borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: '0.7rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>TDEE (Dépense Totale)</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '3rem', fontWeight: 700, color: ORANGE, letterSpacing: '0.05em' }}>{bmrResult.tdee}</div>
                  <div style={{ fontSize: '0.75rem', color: TEXT_MUTED }}>kcal / jour · Sauvegardé comme objectif</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[['Mifflin', bmrResult.mifflin, false], ['Harris', bmrResult.harris, false], ['Katch', bmrResult.katch || '—', !!bmrResult.katch]].map(([n, v, hi]) => (
                    <div key={n as string} style={{ background: BG_BASE, border: `1px solid ${hi ? ORANGE + '30' : BORDER}`, borderRadius: 14, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 4 }}>{n}</div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: hi ? ORANGE : TEXT_PRIMARY }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Objectifs Caloriques</div>
                  {[['Perte de graisse', bmrResult.fatLoss, '-20%'], ['Maintenance', bmrResult.tdee, '0%'], ['Prise de masse', bmrResult.massGain, '+10%']].map(([label, val, pct]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                      <span style={{ fontSize: '0.85rem', color: TEXT_MUTED }}>{label}</span>
                      <div>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: TEXT_PRIMARY }}>{val}</span>
                        <span style={{ fontSize: '0.75rem', color: TEXT_MUTED, marginLeft: 4 }}>kcal</span>
                        <span style={{ fontSize: '0.7rem', color: TEXT_MUTED, marginLeft: 8 }}>{pct}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Macros ({bmrResult.tdee} kcal)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[['Protéines', bmrResult.protein, 'g', '#3b82f6'], ['Glucides', bmrResult.carbs, 'g', ORANGE], ['Lipides', bmrResult.fat, 'g', '#10b981']].map(([n, v, u, c]) => (
                      <div key={n as string} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: TEXT_PRIMARY }}>{v}</div>
                        <div style={{ fontSize: '0.65rem', color: c as string, fontWeight: 700, textTransform: 'uppercase' }}>{n}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ MODAL FOOD ═══════════════════ */}
      {modal === 'food' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto' }}>
          <div style={{ background: BG_CARD, borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', marginTop: 40, minHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>AJOUTER ALIMENT</h3>
              <button onClick={() => { setModal(null); setSelectedFood(null); setFoodSearch('') }} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {MEAL_TYPES.map(m => (
                <button key={m.id} onClick={() => setMealType(m.id)}
                  style={{ border: `1px solid ${mealType === m.id ? ORANGE : BORDER}`, background: mealType === m.id ? `${ORANGE}15` : BG_BASE, borderRadius: 12, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 200ms' }}>
                  <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: mealType === m.id ? ORANGE : TEXT_MUTED }}>{m.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['anses', 'Base ANSES'], ['custom', 'Mes aliments']].map(([id, label]) => (
                <button key={id} onClick={() => { setSearchTab(id as any); setFoodSearch(''); setFoodResults([]) }}
                  style={{ flex: 1, border: `1px solid ${searchTab === id ? ORANGE : BORDER}`, background: searchTab === id ? `${ORANGE}15` : BG_BASE, borderRadius: 12, padding: '10px', fontSize: '0.75rem', fontWeight: 700, color: searchTab === id ? ORANGE : TEXT_MUTED, cursor: 'pointer', transition: 'all 200ms' }}>
                  {label}
                </button>
              ))}
            </div>
            {!selectedFood ? (
              <>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED }} />
                  <input value={foodSearch} onChange={e => setFoodSearch(e.target.value)}
                    placeholder={searchTab === 'anses' ? 'Rechercher dans la base ANSES...' : 'Rechercher mes aliments...'}
                    style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }} />
                </div>
                {searchTab === 'custom' && (
                  <button onClick={() => setModal('custom_food')} style={{ width: '100%', border: `2px dashed ${BORDER}`, borderRadius: 12, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: TEXT_MUTED, fontSize: '0.8rem', fontWeight: 700, background: 'transparent', cursor: 'pointer', marginBottom: 12 }}>
                    <Plus size={14} /> Créer un aliment personnalisé
                  </button>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {foodResults.map((food: any) => {
                    const cals = searchTab === 'anses' ? (food.energy_kcal || food.calories || 0) : food.calories_per_100g
                    const prot = searchTab === 'anses' ? (food.proteins || 0) : food.proteins_per_100g
                    return (
                      <button key={food.id} onClick={() => setSelectedFood(food)}
                        style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', transition: 'border-color 200ms' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: TEXT_PRIMARY }}>{food.name}</div>
                          {food.brand && <div style={{ fontSize: '0.7rem', color: TEXT_MUTED, marginTop: 2 }}>{food.brand}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: ORANGE }}>{Math.round(cals)} kcal</div>
                          <div style={{ fontSize: '0.65rem', color: TEXT_MUTED }}>P:{Math.round(prot)}g/100g</div>
                        </div>
                        <ChevronRight size={14} color={TEXT_MUTED} />
                      </button>
                    )
                  })}
                  {foodSearch.length >= 2 && foodResults.length === 0 && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.85rem', padding: '20px 0' }}>Aucun résultat</p>}
                  {foodSearch.length < 2 && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.75rem', padding: '16px 0' }}>Saisir au moins 2 caractères</p>}
                </div>
              </>
            ) : (
              <div>
                <button onClick={() => setSelectedFood(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEXT_MUTED, fontSize: '0.8rem', fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 16 }}>← Retour</button>
                <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: TEXT_PRIMARY, fontSize: '1rem', marginBottom: 12 }}>{selectedFood.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      ['Calories', searchTab === 'anses' ? (selectedFood.energy_kcal || 0) : selectedFood.calories_per_100g, 'kcal', ORANGE],
                      ['Protéines', searchTab === 'anses' ? (selectedFood.proteins || 0) : selectedFood.proteins_per_100g, 'g', '#3b82f6'],
                      ['Glucides', searchTab === 'anses' ? (selectedFood.carbohydrates || selectedFood.carbs || 0) : selectedFood.carbs_per_100g, 'g', '#f59e0b'],
                      ['Lipides', searchTab === 'anses' ? (selectedFood.fat || selectedFood.fats || 0) : selectedFood.fats_per_100g, 'g', '#10b981'],
                    ].map(([n, v, u, c]) => (
                      <div key={n as string} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: c as string }}>{Math.round(v as number)}</div>
                        <div style={{ fontSize: '0.6rem', color: TEXT_MUTED }}>{u}/100g</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ color: TEXT_MUTED, fontSize: '0.9rem', flex: 1 }}>Quantité</span>
                  <input type="number" value={foodQty} onChange={e => setFoodQty(e.target.value)} style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '1.4rem', fontWeight: 700, textAlign: 'right', width: 80, outline: 'none', border: 'none' }} />
                  <span style={{ color: ORANGE, fontWeight: 700 }}>g</span>
                </div>
                <div style={{ background: `${ORANGE}10`, border: `1px solid ${ORANGE}20`, borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Pour {foodQty}g :</div>
                  <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    {[
                      ['Kcal', Math.round((searchTab === 'anses' ? (selectedFood.energy_kcal || 0) : selectedFood.calories_per_100g) * parseFloat(foodQty) / 100)],
                      ['Prot', Math.round((searchTab === 'anses' ? (selectedFood.proteins || 0) : selectedFood.proteins_per_100g) * parseFloat(foodQty) / 100 * 10) / 10],
                      ['Gluc', Math.round((searchTab === 'anses' ? (selectedFood.carbohydrates || selectedFood.carbs || 0) : selectedFood.carbs_per_100g) * parseFloat(foodQty) / 100 * 10) / 10],
                      ['Lip', Math.round((searchTab === 'anses' ? (selectedFood.fat || selectedFood.fats || 0) : selectedFood.fats_per_100g) * parseFloat(foodQty) / 100 * 10) / 10],
                    ].map(([n, v]) => (
                      <div key={n as string} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, color: ORANGE }}>{v}</div>
                        <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase' }}>{n}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={addFoodToMeal} style={{ width: '100%', background: GREEN, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ajouter au repas</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ MODAL CUSTOM FOOD ═══════════════════ */}
      {modal === 'custom_food' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>NOUVEL ALIMENT</h3>
              <button onClick={() => setModal('food')} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={customFoodForm.name} onChange={e => setCustomFoodForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nom de l'aliment *" style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }} />
              <input value={customFoodForm.brand} onChange={e => setCustomFoodForm(p => ({ ...p, brand: e.target.value }))}
                placeholder="Marque (optionnel)" style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['calories_per_100g', 'Calories *', 'kcal'], ['proteins_per_100g', 'Protéines', 'g'], ['carbs_per_100g', 'Glucides', 'g'], ['fats_per_100g', 'Lipides', 'g']].map(([k, l, u]) => (
                  <div key={k} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 4 }}>{l} /100g</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input type="number" value={(customFoodForm as any)[k]} onChange={e => setCustomFoodForm(p => ({ ...p, [k]: e.target.value }))}
                        placeholder="0" style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '0.9rem', fontWeight: 700, flex: 1, outline: 'none', border: 'none', width: '100%' }} />
                      <span style={{ color: TEXT_MUTED, fontSize: '0.75rem' }}>{u}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={addCustomFood} style={{ width: '100%', background: ORANGE, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 16 }}>Créer l'aliment</button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
      >

      {/* ═══════════════════ HOME TAB ═══════════════════ */}
      {activeTab === 'home' && (
        <div style={{ background: BG_BASE, minHeight: '100vh' }}>

          {/* Header */}
          <div style={{ background: BG_CARD, padding: '20px 20px 16px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.72rem', color: TEXT_MUTED, margin: '0 0 4px', textTransform: 'capitalize' }}>
                  {format(new Date(), 'EEEE d MMMM', { locale: fr })}
                </p>
                <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.75rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0, letterSpacing: '0.03em' }}>
                  Bonjour, {firstName}
                </h1>
              </div>
              <button onClick={() => avatarRef.current?.click()} style={{ width: 48, height: 48, borderRadius: '50%', background: displayAvatar ? 'transparent' : ORANGE, border: `2px solid ${BORDER}`, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                {displayAvatar
                  ? <img src={displayAvatar} style={{ width: 48, height: 48, objectFit: 'cover' }} alt="" />
                  : <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>{firstName.charAt(0).toUpperCase()}</span>
                }
              </button>
              <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
            </div>
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* 4 metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Poids actuel', value: currentWeight ? `${currentWeight} kg` : '—', sub: 'coach-assigned', color: ORANGE, icon: Scale },
                { label: 'Objectif', value: `${profile?.target_weight || goalWeight} kg`, sub: 'cible', color: TEXT_MUTED, icon: Target },
                { label: 'Séances', value: String(completedSessions), sub: 'total complétées', color: TEXT_MUTED, icon: Dumbbell },
                { label: 'Streak', value: streak > 0 ? `${streak}j` : '—', sub: 'jours consécutifs', color: streak > 0 ? ORANGE : TEXT_MUTED, icon: Flame },
              ].map(({ label, value, sub, color, icon: Icon }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22, delay: i * 0.07 }}
                  style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '16px' }}
                >
                  <Icon size={15} color={color} style={{ marginBottom: 8 }} />
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '0.62rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 4 }}>{label}</div>
                </motion.div>
              ))}
            </div>

            {/* Programme du jour */}
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: ORANGE }}>Programme du jour</span>
                <button onClick={() => setActiveTab('training')} style={{ fontSize: '0.68rem', fontWeight: 700, color: TEXT_MUTED, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Voir tout</button>
              </div>
              {!coachProgram ? (
                <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0, fontStyle: 'italic' }}>Programme en attente de ton coach.</p>
              ) : todayCoachDay?.repos ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG_BASE, borderRadius: 12, padding: '12px 14px' }}>
                  <Moon size={20} color={TEXT_MUTED} />
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY }}>Jour de repos</div>
                    <div style={{ fontSize: '0.72rem', color: TEXT_MUTED }}>Récupère bien, étirements bienvenus</div>
                  </div>
                </div>
              ) : !todayCoachDay?.exercises?.length ? (
                <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Aucun exercice prévu.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(todayCoachDay.exercises as any[]).slice(0, 4).map((ex: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: BG_BASE, borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ width: 26, height: 26, borderRadius: 8, background: `${ORANGE}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.8rem', color: ORANGE, flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                          <div style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>{ex.sets} × {ex.reps} reps{ex.rest ? ` · repos ${ex.rest}` : ''}</div>
                        </div>
                      </div>
                    ))}
                    {(todayCoachDay.exercises as any[]).length > 4 && (
                      <div style={{ fontSize: '0.72rem', color: ORANGE, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, paddingLeft: 4 }}>
                        +{(todayCoachDay.exercises as any[]).length - 4} autres exercices
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => startProgramWorkout({ day_name: todayKey }, todayCoachDay.exercises)}
                    style={{ width: '100%', background: GREEN, color: '#000', fontWeight: 700, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Commencer la séance
                  </button>
                </>
              )}
            </div>

            {/* Nutrition du jour (coach meal plan) */}
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GREEN }}>Nutrition du jour</span>
                <button onClick={() => setActiveTab('nutrition')} style={{ fontSize: '0.68rem', fontWeight: 700, color: TEXT_MUTED, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Voir plan</button>
              </div>
              {!coachMealPlan ? (
                <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0, fontStyle: 'italic' }}>Plan alimentaire en attente.</p>
              ) : (
                <>
                  {/* Macro targets row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
                    {[
                      { label: 'Kcal', value: coachMealPlan.calorie_target || '—', color: ORANGE },
                      { label: 'Prot', value: coachMealPlan.protein_target ? `${coachMealPlan.protein_target}g` : '—', color: '#3B82F6' },
                      { label: 'Gluc', value: coachMealPlan.carb_target ? `${coachMealPlan.carb_target}g` : '—', color: '#F59E0B' },
                      { label: 'Lip', value: coachMealPlan.fat_target ? `${coachMealPlan.fat_target}g` : '—', color: '#EF4444' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: BG_BASE, borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color }}>{value}</div>
                        <div style={{ fontSize: '0.58rem', color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Today's meals from plan */}
                  {(() => {
                    const dayPlan = coachMealPlan.days?.[todayKey]
                    const meals: any[] = dayPlan?.meals ?? []
                    if (!meals.length) return <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, margin: 0 }}>Aucun repas planifié aujourd'hui.</p>
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {meals.map((meal: any, mi: number) => {
                          const mealKcal = (meal.foods || []).reduce((s: number, f: any) => s + (f.kcal || 0), 0)
                          const mealProt = (meal.foods || []).reduce((s: number, f: any) => s + (f.prot || 0), 0)
                          return (
                            <div key={mi} style={{ background: BG_BASE, borderRadius: 12, padding: '12px 14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY, fontSize: '0.9rem' }}>{meal.name}</span>
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: ORANGE }}>{mealKcal} kcal</span>
                              </div>
                              {(meal.foods || []).map((food: any, fi: number) => (
                                <div key={fi} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: fi > 0 ? `1px solid ${BORDER}` : 'none' }}>
                                  <span style={{ fontSize: '0.75rem', color: TEXT_MUTED, flex: 1 }}>{food.name}{food.qty ? ` — ${food.qty}` : ''}</span>
                                  <span style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>{food.prot ? `${food.prot}g P` : ''}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </>
              )}
            </div>

            {/* Quick actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { icon: Ruler, label: '+ Mesure', action: () => setModal('measure') },
                { icon: Camera, label: '+ Photo', action: () => photoRef.current?.click() },
                { icon: Zap, label: 'BMR', action: () => setModal('bmr') },
              ].map(({ icon: Icon, label, action }) => (
                <button key={label} onClick={action} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Icon size={18} color={TEXT_MUTED} />
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_MUTED }}>{label}</span>
                </button>
              ))}
              <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProgressPhoto} />
            </div>

          </div>
        </div>
      )}

      {/* ═══════════════════ TRAINING TAB ═══════════════════ */}
      {activeTab === 'training' && (
        <div style={{ padding: '20px 20px 20px', minHeight: '100vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>PROGRAMME</h1>
            <span style={{ fontSize: '0.75rem', color: TEXT_MUTED, textTransform: 'capitalize' }}>
              Semaine du {format(new Date(Date.now() - new Date().getDay() * 86400000), 'd MMM', { locale: fr })}
            </span>
          </div>

          {!coachProgram ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0' }}>
              <Dumbbell size={40} color={TEXT_MUTED} />
              <p style={{ fontSize: '0.95rem', color: TEXT_MUTED, textAlign: 'center', margin: 0 }}>Ton coach n'a pas encore créé ton programme.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {WEEK_DAYS.map(day => {
                const dayData = coachProgram[day] ?? { repos: false, exercises: [] }
                const isToday = day === todayKey
                const isExpanded = activeDay === day
                const exCount = dayData.exercises?.length || 0
                return (
                  <div key={day} style={{ background: BG_CARD, border: `1px solid ${isToday ? ORANGE : BORDER}`, borderRadius: 16, overflow: 'hidden', borderLeft: isToday ? `3px solid ${ORANGE}` : `1px solid ${BORDER}` }}>
                    <button
                      onClick={() => setActiveDay(isExpanded ? null : day)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, textTransform: 'capitalize', color: isToday ? ORANGE : TEXT_PRIMARY }}>{day}</span>
                          {isToday && <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: ORANGE, background: `${ORANGE}20`, borderRadius: 6, padding: '2px 6px' }}>Aujourd'hui</span>}
                        </div>
                      </div>
                      {dayData.repos ? (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: TEXT_MUTED, background: `${BORDER}`, borderRadius: 8, padding: '4px 10px' }}>Repos</span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: ORANGE, background: `${ORANGE}15`, borderRadius: 8, padding: '4px 10px' }}>{exCount} exo{exCount > 1 ? 's' : ''}</span>
                      )}
                      {isExpanded ? <ChevronUp size={16} color={TEXT_MUTED} /> : <ChevronDown size={16} color={TEXT_MUTED} />}
                    </button>
                    {isExpanded && !dayData.repos && exCount > 0 && (
                      <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(dayData.exercises as any[]).map((ex: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: BG_BASE, borderRadius: 10 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 8, background: `${ORANGE}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.8rem', color: ORANGE, flexShrink: 0 }}>{i + 1}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY, fontSize: '0.9rem' }}>{ex.name}</div>
                              <div style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>{ex.sets} × {ex.reps}</div>
                            </div>
                          </div>
                        ))}
                        {isToday && (
                          <button
                            onClick={() => startProgramWorkout({ day_name: day }, dayData.exercises)}
                            style={{ width: '100%', background: GREEN, color: '#000', fontWeight: 700, padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>
                            Commencer la séance
                          </button>
                        )}
                      </div>
                    )}
                    {isExpanded && dayData.repos && (
                      <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Moon size={18} color={TEXT_MUTED} />
                        <span style={{ fontSize: '0.85rem', color: TEXT_MUTED }}>Récupération active — marche, étirements</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ NUTRITION TAB ═══════════════════ */}
      {activeTab === 'nutrition' && (
        <div style={{ padding: '20px 20px 20px', minHeight: '100vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>PLAN ALIMENTAIRE</h1>
          </div>

          {!coachMealPlan ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0' }}>
              <UtensilsCrossed size={40} color={TEXT_MUTED} />
              <p style={{ fontSize: '0.95rem', color: TEXT_MUTED, textAlign: 'center', margin: 0 }}>Ton coach n'a pas encore créé ton plan alimentaire.</p>
            </div>
          ) : (
            <>
              {/* Macro targets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Kcal', value: String(coachMealPlan.calorie_target || '—'), color: ORANGE },
                  { label: 'Prot', value: coachMealPlan.protein_target ? `${coachMealPlan.protein_target}g` : '—', color: '#3B82F6' },
                  { label: 'Gluc', value: coachMealPlan.carb_target ? `${coachMealPlan.carb_target}g` : '—', color: '#F59E0B' },
                  { label: 'Lip', value: coachMealPlan.fat_target ? `${coachMealPlan.fat_target}g` : '—', color: '#EF4444' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.15rem', fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: '0.6rem', color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Day tabs */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
                {WEEK_DAYS.map(day => {
                  const isActive = nutritionDay === day
                  const isToday = day === todayKey
                  const dayMeals: any[] = coachMealPlan.days?.[day]?.meals ?? []
                  const dayKcal = dayMeals.reduce((s: number, m: any) => s + (m.foods || []).reduce((fs: number, f: any) => fs + (f.kcal || 0), 0), 0)
                  return (
                    <button key={day} onClick={() => setNutritionDay(day)} style={{
                      flexShrink: 0, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, textTransform: 'capitalize',
                      background: isActive ? GREEN : BG_CARD,
                      color: isActive ? '#000' : isToday ? GREEN : TEXT_MUTED,
                      outline: isToday && !isActive ? `2px solid ${GREEN}` : 'none',
                    }}>
                      {day.slice(0, 3)}
                      {dayKcal > 0 && <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 700, opacity: 0.8 }}>{dayKcal}</span>}
                    </button>
                  )
                })}
              </div>

              {/* Selected day meals */}
              {(() => {
                const dayPlan = coachMealPlan.days?.[nutritionDay]
                const meals: any[] = dayPlan?.meals ?? []
                if (!meals.length) return (
                  <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 20px', textAlign: 'center' }}>
                    <UtensilsCrossed size={28} color={TEXT_MUTED} style={{ marginBottom: 8 }} />
                    <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Aucun repas pour ce jour.</p>
                  </div>
                )
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {meals.map((meal: any, mi: number) => {
                      const mealKcal = (meal.foods || []).reduce((s: number, f: any) => s + (f.kcal || 0), 0)
                      const mealProt = (meal.foods || []).reduce((s: number, f: any) => s + (f.prot || 0), 0)
                      const mealCarb = (meal.foods || []).reduce((s: number, f: any) => s + (f.carb || 0), 0)
                      const mealFat = (meal.foods || []).reduce((s: number, f: any) => s + (f.fat || 0), 0)
                      return (
                        <div key={mi} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden' }}>
                          {/* Meal header */}
                          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY, fontSize: '1rem' }}>{meal.name}</span>
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: GREEN }}>{mealKcal} kcal</span>
                          </div>
                          {/* Macro bar */}
                          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 12 }}>
                            {[
                              { label: 'P', value: `${Math.round(mealProt)}g`, color: '#3B82F6' },
                              { label: 'G', value: `${Math.round(mealCarb)}g`, color: '#F59E0B' },
                              { label: 'L', value: `${Math.round(mealFat)}g`, color: '#EF4444' },
                            ].map(({ label, value, color }) => (
                              <span key={label} style={{ fontSize: '0.72rem', fontWeight: 700, color: TEXT_MUTED }}>
                                <span style={{ color }}>{label}</span> {value}
                              </span>
                            ))}
                          </div>
                          {/* Food items */}
                          <div>
                            {(meal.foods || []).map((food: any, fi: number) => (
                              <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: fi > 0 ? `1px solid ${BORDER}` : 'none' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.85rem', color: TEXT_PRIMARY, fontWeight: 500 }}>{food.name}</div>
                                  {food.qty && <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, marginTop: 2 }}>{food.qty}</div>}
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: TEXT_MUTED }}>{food.kcal || 0} kcal</div>
                                  {(food.prot || food.carb || food.fat) ? (
                                    <div style={{ fontSize: '0.6rem', color: TEXT_MUTED }}>P{food.prot || 0} G{food.carb || 0} L{food.fat || 0}</div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════ PROGRESS TAB ═══════════════════ */}
      {activeTab === 'progress' && (
        <div style={{ padding: '20px 20px 20px', minHeight: '100vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>PROGRESSION</h1>
          </div>

          {/* Weight chart */}
          {weightHistory30.length > 1 ? (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED }}>Évolution du poids (30j)</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: ORANGE }}>
                  {weightHistory30[weightHistory30.length - 1]?.poids} kg
                </span>
              </div>
              <svg viewBox="0 0 300 90" style={{ width: '100%', height: 90, overflow: 'visible' }} preserveAspectRatio="none">
                <polyline
                  points={weightHistory30.map((p, i) => {
                    const x = (i / (weightHistory30.length - 1)) * 300
                    const y = 90 - ((p.poids - chartMin) / ((chartMax - chartMin) || 1)) * 86
                    return `${x.toFixed(1)},${y.toFixed(1)}`
                  }).join(' ')}
                  fill="none" stroke={ORANGE} strokeWidth="2.5"
                  strokeLinejoin="round" strokeLinecap="round"
                />
                <circle
                  cx={300}
                  cy={90 - ((weightHistory30[weightHistory30.length - 1]?.poids - chartMin) / ((chartMax - chartMin) || 1)) * 86}
                  r="5" fill={ORANGE}
                />
              </svg>
            </div>
          ) : (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '32px 20px', textAlign: 'center', marginBottom: 16 }}>
              <TrendingUp size={32} color={TEXT_MUTED} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Pas encore assez de données poids.</p>
            </div>
          )}

          {/* Latest measurements */}
          {latestMeasure && (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED }}>Dernières mesures</span>
                <span style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>{format(new Date(latestMeasure.date), 'd MMMM yyyy', { locale: fr })}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Poitrine', latestMeasure.chest, 'cm'],
                  ['Taille', latestMeasure.waist, 'cm'],
                  ['Hanches', latestMeasure.hips, 'cm'],
                  ['Bras G', latestMeasure.left_arm, 'cm'],
                  ['Bras D', latestMeasure.right_arm, 'cm'],
                  ['% Graisse', latestMeasure.body_fat, '%'],
                  ['Masse Musc', latestMeasure.muscle_mass, 'kg'],
                ].map(([l, v, u]) => v && (
                  <div key={l as string} style={{ background: BG_BASE, borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: TEXT_MUTED }}>{l}</span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT_PRIMARY }}>{v}<span style={{ fontSize: '0.65rem', color: TEXT_MUTED, marginLeft: 2 }}>{u}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress photos grid */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED, display: 'block', marginBottom: 10 }}>Photos progression</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <button onClick={() => photoRef.current?.click()} style={{ aspectRatio: '1', border: `2px dashed ${BORDER}`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG_CARD, cursor: 'pointer' }}>
                {photoUploading ? <div style={{ width: 24, height: 24, border: `2px solid ${ORANGE}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Plus size={22} color={TEXT_MUTED} />}
              </button>
              {progressPhotos.map(p => {
                // photo_url may be a storage path or a full URL (legacy)
                const imgSrc = p.photo_url?.startsWith('http')
                  ? p.photo_url
                  : supabase.storage.from('progress-photos').getPublicUrl(p.photo_url).data.publicUrl
                return (
                  <div key={p.id} style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden' }}>
                    <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick log row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { icon: Scale, label: '+ Poids', action: () => setModal('weight') },
              { icon: Ruler, label: '+ Mesure', action: () => setModal('measure') },
              { icon: Camera, label: '+ Photo', action: () => photoRef.current?.click() },
            ].map(({ icon: Icon, label, action }) => (
              <button key={label} onClick={action} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Icon size={20} color={TEXT_MUTED} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_MUTED }}>{label}</span>
              </button>
            ))}
          </div>
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProgressPhoto} />
        </div>
      )}

      {/* ═══════════════════ PROFIL TAB ═══════════════════ */}
      {activeTab === 'profil' && (
        <div style={{ padding: '20px 20px 20px', minHeight: '100vh' }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: '0 0 24px' }}>PROFIL</h1>

          {/* Avatar + name */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 12 }}>
            <button onClick={() => avatarRef.current?.click()} style={{ width: 80, height: 80, borderRadius: '50%', background: displayAvatar ? 'transparent' : ORANGE, border: `2px solid ${BORDER}`, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, position: 'relative' }}>
              {displayAvatar
                ? <img src={displayAvatar} style={{ width: 80, height: 80, objectFit: 'cover' }} alt="" />
                : <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '2rem', color: '#fff' }}>{firstName.charAt(0).toUpperCase()}</span>
              }
            </button>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: TEXT_PRIMARY }}>{fullName}</div>
              <div style={{ fontSize: '0.8rem', color: TEXT_MUTED }}>{session.user.email}</div>
            </div>
          </div>

          {/* Stats row — weight read-only */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
            {[
              { label: 'Poids', value: currentWeight ? `${currentWeight}kg` : '—', color: ORANGE },
              { label: 'Objectif', value: goalWeight ? `${goalWeight}kg` : '—', color: TEXT_MUTED },
              { label: 'Kcal/j', value: calorieGoal ? `${calorieGoal}` : '—', color: TEXT_MUTED },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 8px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: '0.62rem', color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Phone field */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px', marginBottom: 8 }}>
            <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>Téléphone</div>
            {phoneEditing ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="tel"
                  value={phoneForm}
                  onChange={e => setPhoneForm(e.target.value)}
                  placeholder="+33 6 00 00 00 00"
                  style={{ flex: 1, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }}
                />
                <button onClick={savePhone} style={{ background: GREEN, border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>OK</button>
                <button onClick={() => { setPhoneEditing(false); setPhoneForm(profile?.phone || '') }} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px', color: TEXT_MUTED, fontSize: '0.8rem', cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: profile?.phone ? TEXT_PRIMARY : TEXT_MUTED }}>{profile?.phone || 'Ajouter un numéro'}</span>
                <button onClick={() => setPhoneEditing(true)} style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '4px 10px', color: TEXT_MUTED, fontSize: '0.72rem', cursor: 'pointer' }}>Modifier</button>
              </div>
            )}
          </div>

          {/* BMR calculator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setModal('bmr')} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Zap size={18} color={TEXT_MUTED} />
                <span style={{ fontSize: '0.9rem', color: TEXT_PRIMARY }}>Calculateur BMR</span>
              </div>
              <ChevronRight size={16} color={TEXT_MUTED} />
            </button>
          </div>

          {/* Coach section */}
          {coachProgram && (
            <div style={{ background: BG_CARD, border: `1px solid ${ORANGE}30`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Crown size={18} color={ORANGE} />
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, color: TEXT_PRIMARY }}>Mon coach</div>
                  <div style={{ fontSize: '0.72rem', color: TEXT_MUTED }}>Programme actif</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, color: GREEN, background: `${GREEN}20`, borderRadius: 8, padding: '4px 8px' }}>Actif</span>
              </div>
            </div>
          )}

          {/* Sign out */}
          <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', background: 'transparent', border: `1px solid #EF4444`, borderRadius: 14, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'all 200ms' }}>
            <LogOut size={18} color="#EF4444" />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#EF4444' }}>Déconnexion</span>
          </button>
        </div>
      )}

      </motion.div>
      </AnimatePresence>

      {/* ═══════════════════ BOTTOM NAV ═══════════════════ */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: BG_CARD, borderTop: `1px solid ${BORDER}`, height: 72, display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 40, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {([
          { id: 'home', icon: BarChart2, label: 'Home' },
          { id: 'training', icon: Dumbbell, label: 'Training' },
          { id: 'nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
          { id: 'progress', icon: TrendingUp, label: 'Progress' },
          { id: 'profil', icon: User, label: 'Profil' },
        ] as const).map(({ id, icon: Icon, label }) => {
          const active = activeTab === id
          return (
            <button key={id} onClick={() => setActiveTab(id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative' }}>
              {active && (
                <motion.div
                  layoutId="navIndicator"
                  style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 28, height: 3, background: ORANGE, borderRadius: '0 0 4px 4px' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
              <Icon size={22} color={active ? ORANGE : '#4B5563'} />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? ORANGE : '#4B5563', fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
