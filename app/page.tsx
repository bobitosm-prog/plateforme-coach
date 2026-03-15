'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import dynamic from 'next/dynamic'
import {
  Flame, LogOut, Scale, TrendingDown, Target, Dumbbell,
  Plus, CheckCircle2, Zap, Award, Calendar, BarChart2,
  User, UtensilsCrossed, X, Check, Camera, Ruler,
  Users, Crown, Trash2, ChevronRight, Upload,
  Activity, Heart, Search, Filter, ChevronDown, ChevronUp,
  Timer, Play, Pause, RotateCcw, Info, Sparkles, Utensils
} from 'lucide-react'

// ── CHANGEMENT 1 : Import WorkoutSession ──────────────────
import WorkoutSession from './components/WorkoutSession'

const WeightChart = dynamic(() => import('./nutrition/NutritionDashboard').then(m => m.WeightChart), { ssr: false })
const CalorieChart = dynamic(() => import('./nutrition/NutritionDashboard').then(m => m.CalorieChart), { ssr: false })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const COACH_EMAIL = "bobitosm@gmail.com" // ← TON EMAIL ICI

type Tab = 'home' | 'body' | 'nutrition' | 'training' | 'coach'

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Petit-déj', emoji: '🥣' },
  { id: 'lunch', label: 'Déjeuner', emoji: '🍽️' },
  { id: 'dinner', label: 'Dîner', emoji: '🌙' },
  { id: 'snack', label: 'Collation', emoji: '🍎' },
]

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sédentaire', sub: 'Bureau, peu/pas de sport', mult: 1.2 },
  { id: 'light', label: 'Légèrement actif', sub: '1-3 séances/semaine', mult: 1.375 },
  { id: 'moderate', label: 'Modérément actif', sub: '3-5 séances/semaine', mult: 1.55 },
  { id: 'active', label: 'Très actif', sub: '6-7 séances/semaine', mult: 1.725 },
  { id: 'extreme', label: 'Extrêmement actif', sub: 'Athlète / 2x/jour', mult: 1.9 },
]

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
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)

  // ── CHANGEMENT 2 : État WorkoutSession ────────────────────
  const [workoutSession, setWorkoutSession] = useState<{ name: string; exercises: any[] } | null>(null)

  // Workout state (ancien modal — conservé pour compatibilité)
  const [modal, setModal] = useState<string | null>(null)
  const [restTimer, setRestTimer] = useState<number>(0)
  const [restMax, setRestMax] = useState<number>(90)
  const [restRunning, setRestRunning] = useState(false)
  const restIntervalRef = useRef<any>(null)

  // Programs state
  const [programFilter, setProgramFilter] = useState({ level: '', goal: '', gender: '' })
  const [selectedProgram, setSelectedProgram] = useState<any>(null)
  const [programDays, setProgramDays] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [dayExercises, setDayExercises] = useState<any[]>([])

  // Nutrition state
  const [foodSearch, setFoodSearch] = useState('')
  const [foodResults, setFoodResults] = useState<any[]>([])
  const [customFoods, setCustomFoods] = useState<any[]>([])
  const [selectedFood, setSelectedFood] = useState<any>(null)
  const [foodQty, setFoodQty] = useState('100')
  const [mealType, setMealType] = useState('lunch')
  const [customFoodForm, setCustomFoodForm] = useState({ name: '', brand: '', calories_per_100g: '', proteins_per_100g: '', carbs_per_100g: '', fats_per_100g: '' })
  const [searchTab, setSearchTab] = useState<'anses' | 'custom'>('anses')

  // Forms
  const [weightForm, setWeightForm] = useState('')
  const [measureForm, setMeasureForm] = useState({ chest: '', waist: '', hips: '', left_arm: '', right_arm: '', left_thigh: '', right_thigh: '', body_fat: '', muscle_mass: '' })
  const [bmrForm, setBmrForm] = useState({ weight: '', height: '', age: '', gender: 'male', activity: 'moderate', body_fat: '' })
  const [bmrResult, setBmrResult] = useState<any>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<any>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setLoading(false) })
    return () => subscription.unsubscribe()
  }, [])

  // Role-based redirect — always fetches fresh role, no browser cache
  useEffect(() => {
    if (!session) return
    // Append a timestamp so the browser never serves a cached response
    const url = `${SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${session.user.id}&limit=1&_t=${Date.now()}`
    fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Cache-Control': 'no-cache, no-store',
      },
      cache: 'no-store',
    })
      .then(r => r.json())
      .then((rows: { role: string }[]) => {
        const role = rows?.[0]?.role
        if (role === 'super_admin') router.replace('/admin')
        else if (role === 'coach')  router.replace('/coach')
        // 'client' or null → stay on /
      })
      .catch(() => {/* stay on / on error */})
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

    const [profRes, weightsRes, mealsRes, sessRes, measureRes, photosRes, progsRes, userProgRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('weight_logs').select('date, poids').eq('user_id', uid).order('date', { ascending: true }).limit(12),
      supabase.from('meal_logs').select('*').eq('user_id', uid).eq('date', today),
      supabase.from('workout_sessions').select('*, workout_sets(*)').eq('user_id', uid).order('created_at', { ascending: false }).limit(10),
      supabase.from('body_measurements').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(10),
      supabase.from('progress_photos').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(20),
      supabase.from('training_programs').select('*').eq('is_template', true),
      supabase.from('user_programs').select('*, training_programs(*)').eq('user_id', uid).eq('active', true).single(),
    ])

    if (profRes.data) setProfile(profRes.data)
    setWeightHistory(weightsRes.data?.map(w => ({ ...w, date: new Date(w.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) })) || [])
    setTodayMeals(mealsRes.data || [])
    setWSessions(sessRes.data || [])
    setMeasurements(measureRes.data || [])
    setProgressPhotos(photosRes.data || [])
    setPrograms(progsRes.data || [])
    if (userProgRes.data) setUserProgram(userProgRes.data)

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

  // ── CHANGEMENT 3 : startProgramWorkout → ouvre WorkoutSession ──
  async function startProgramWorkout(day: any, exercises: any[]) {
    setWorkoutSession({ name: day.day_name, exercises })
  }

  // ── CHANGEMENT 4 : onFinishWorkout → sauvegarde dans Supabase ──
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
    setModal(null); fetchAll()
  }

  async function saveWeight() {
    if (!weightForm) return
    const val = parseFloat(weightForm)
    await supabase.from('weight_logs').insert({ user_id: session.user.id, poids: val })
    await supabase.from('profiles').upsert({ id: session.user.id, current_weight: val })
    if (!profile?.start_weight) await supabase.from('profiles').update({ start_weight: val }).eq('id', session.user.id)
    setWeightForm(''); setModal(null); fetchAll()
  }

  async function saveMeasurements() {
    const data: any = { user_id: session.user.id }
    Object.entries(measureForm).forEach(([k, v]) => { if (v) data[k] = parseFloat(v as string) })
    await supabase.from('body_measurements').insert(data)
    setMeasureForm({ chest: '', waist: '', hips: '', left_arm: '', right_arm: '', left_thigh: '', right_thigh: '', body_fat: '', muscle_mass: '' })
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

  async function uploadProgressPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoUploading(true)
    const path = `${session.user.id}/${Date.now()}.${file.name.split('.').pop()}`
    await supabase.storage.from('progress-photos').upload(path, file)
    const { data: { publicUrl } } = supabase.storage.from('progress-photos').getPublicUrl(path)
    await supabase.from('progress_photos').insert({ user_id: session.user.id, photo_url: publicUrl, view_type: 'front' })
    setPhotoUploading(false); fetchAll()
  }

  const totalCals = useMemo(() => todayMeals.reduce((s, m) => s + (m.calories || 0), 0), [todayMeals])
  const totalProteins = useMemo(() => todayMeals.reduce((s, m) => s + (m.proteins || 0), 0), [todayMeals])
  const calorieGoal = profile?.calorie_goal || 2500
  const goalWeight = profile?.goal_weight || 75
  const currentWeight = profile?.current_weight
  const latestMeasure = measurements[0]
  const weightProgress = weightHistory.length >= 2
    ? parseFloat((weightHistory[weightHistory.length - 1].poids - weightHistory[0].poids).toFixed(1)) : 0
  const progressPct = profile?.start_weight && currentWeight
    ? Math.max(0, Math.min(100, ((profile.start_weight - currentWeight) / (profile.start_weight - goalWeight)) * 100)) : 0
  const completedSessions = wSessions.filter(s => s.completed).length
  const isCoach = session?.user?.email === COACH_EMAIL
  const filteredPrograms = programs.filter(p =>
    (!programFilter.level || p.level === programFilter.level) &&
    (!programFilter.goal || p.goal === programFilter.goal) &&
    (!programFilter.gender || p.gender === programFilter.gender || p.gender === 'both')
  )
  const restPct = restMax > 0 ? (restTimer / restMax) * 100 : 0
  const restCirc = 2 * Math.PI * 36

  if (!mounted || loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
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
  const userName = session.user.user_metadata?.full_name?.split(' ')[0] || 'Athlete'

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-28" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        .fd { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; }
        .gold { color: #C9A84C; }
        .gold-bg { background: #C9A84C; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .rest-ring { transition: stroke-dashoffset 1s linear; }
      `}</style>

      {/* ── CHANGEMENT 5 : WorkoutSession plein écran ─────────── */}
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-[#111] border border-white/5 rounded-t-[32px] p-6 w-full pb-10">
            <div className="flex justify-between items-center mb-5">
              <h3 className="fd text-2xl tracking-wider">LOG POIDS</h3>
              <button onClick={() => setModal(null)} className="w-8 h-8 bg-[#1a1a1a] rounded-full flex items-center justify-center"><X size={14} className="text-white/30" /></button>
            </div>
            <div className="relative mb-4">
              <input type="number" step="0.1" value={weightForm} onChange={e => setWeightForm(e.target.value)} placeholder="0.0"
                className="w-full bg-[#1a1a1a] border border-white/8 rounded-2xl px-5 py-5 text-white text-5xl fd tracking-widest text-center outline-none focus:border-[#C9A84C]/40 placeholder:text-white/10" />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 gold text-sm font-bold">kg</span>
            </div>
            {currentWeight && <p className="text-center text-white/20 text-xs mb-4">Précédent : {currentWeight} kg</p>}
            <button onClick={saveWeight} className="w-full gold-bg text-black font-bold py-4 rounded-2xl uppercase tracking-widest text-sm active:scale-[0.98]">Enregistrer</button>
          </div>
        </div>
      )}

      {/* ═══════════════════ MODAL MESURES ═══════════════════ */}
      {modal === 'measure' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="bg-[#111] border border-white/5 rounded-t-[32px] p-6 pb-10 mt-16 min-h-screen">
            <div className="flex justify-between items-center mb-6">
              <h3 className="fd text-2xl tracking-wider">MENSURATIONS</h3>
              <button onClick={() => setModal(null)} className="w-8 h-8 bg-[#1a1a1a] rounded-full flex items-center justify-center"><X size={14} className="text-white/30" /></button>
            </div>
            <div className="space-y-2">
              {[
                { key: 'chest', label: 'Poitrine', icon: '📐', unit: 'cm' },
                { key: 'waist', label: 'Taille', icon: '📏', unit: 'cm' },
                { key: 'hips', label: 'Hanches', icon: '📐', unit: 'cm' },
                { key: 'left_arm', label: 'Bras gauche', icon: '💪', unit: 'cm' },
                { key: 'right_arm', label: 'Bras droit', icon: '💪', unit: 'cm' },
                { key: 'left_thigh', label: 'Cuisse gauche', icon: '🦵', unit: 'cm' },
                { key: 'right_thigh', label: 'Cuisse droite', icon: '🦵', unit: 'cm' },
                { key: 'body_fat', label: '% Masse grasse', icon: '📊', unit: '%' },
                { key: 'muscle_mass', label: 'Masse musculaire', icon: '⚡', unit: 'kg' },
              ].map(({ key, label, icon, unit }) => (
                <div key={key} className="flex items-center gap-3 bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3">
                  <span className="text-base w-6">{icon}</span>
                  <span className="text-sm font-medium text-white/50 flex-1">{label}</span>
                  <input type="number" step="0.1" value={(measureForm as any)[key]}
                    onChange={e => setMeasureForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder="—" className="bg-transparent text-white text-sm font-bold text-right w-16 outline-none placeholder:text-white/15" />
                  <span className="text-white/25 text-xs w-6">{unit}</span>
                </div>
              ))}
            </div>
            <button onClick={saveMeasurements} className="w-full gold-bg text-black font-bold py-4 rounded-2xl uppercase tracking-widest text-sm active:scale-[0.98] mt-5">Enregistrer</button>
          </div>
        </div>
      )}

      {/* ═══════════════════ MODAL BMR ═══════════════════ */}
      {modal === 'bmr' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="bg-[#111] border border-white/5 rounded-t-[32px] p-6 pb-10 mt-10 min-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="fd text-2xl tracking-wider">CALCULATEUR BMR</h3>
                <p className="text-white/25 text-[10px] mt-0.5">Mifflin-St Jeor · Katch-McArdle · Harris-Benedict</p>
              </div>
              <button onClick={() => setModal(null)} className="w-8 h-8 bg-[#1a1a1a] rounded-full flex items-center justify-center"><X size={14} className="text-white/30" /></button>
            </div>
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                {[['weight', 'Poids', 'kg'], ['height', 'Taille', 'cm'], ['age', 'Âge', 'ans'], ['body_fat', '% Graisse (optionnel)', '%']].map(([key, label, unit]) => (
                  <div key={key} className="bg-[#1a1a1a] border border-white/5 rounded-xl px-3 py-2.5">
                    <div className="text-[9px] text-white/25 font-bold uppercase mb-1">{label}</div>
                    <div className="flex items-center gap-1">
                      <input type="number" value={(bmrForm as any)[key]} onChange={e => setBmrForm(p => ({ ...p, [key]: e.target.value }))}
                        placeholder="0" className="bg-transparent text-white text-sm font-bold flex-1 outline-none placeholder:text-white/10 w-full" />
                      <span className="text-white/20 text-xs">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[['male', '♂ Homme'], ['female', '♀ Femme']].map(([val, label]) => (
                  <button key={val} onClick={() => setBmrForm(p => ({ ...p, gender: val }))}
                    className={`border rounded-xl py-3 text-sm font-bold transition-all ${bmrForm.gender === val ? 'border-[#C9A84C] bg-[#C9A84C]/10 gold' : 'border-white/8 bg-[#1a1a1a] text-white/30'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-[9px] text-white/25 font-bold uppercase tracking-widest ml-1">Niveau d'activité</div>
                {ACTIVITY_LEVELS.map(l => (
                  <button key={l.id} onClick={() => setBmrForm(p => ({ ...p, activity: l.id }))}
                    className={`w-full border rounded-xl px-4 py-3 flex justify-between items-center transition-all ${bmrForm.activity === l.id ? 'border-[#C9A84C]/50 bg-[#C9A84C]/8' : 'border-white/5 bg-[#1a1a1a]'}`}>
                    <div className="text-left">
                      <div className={`text-sm font-bold ${bmrForm.activity === l.id ? 'gold' : 'text-white/60'}`}>{l.label}</div>
                      <div className="text-[9px] text-white/25">{l.sub}</div>
                    </div>
                    <span className="text-[10px] font-bold text-white/20">×{l.mult}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={calculateBMR} className="w-full gold-bg text-black font-bold py-4 rounded-2xl uppercase tracking-widest text-sm active:scale-[0.98] mb-5">Calculer mon TDEE</button>
            {bmrResult && (
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-[#1a1500] to-[#111] border border-[#C9A84C]/20 rounded-[20px] p-5">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">TDEE (Dépense Totale)</div>
                  <div className="fd text-5xl gold tracking-wider">{bmrResult.tdee}</div>
                  <div className="text-white/30 text-xs">kcal / jour · Sauvegardé comme objectif</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Mifflin', bmrResult.mifflin, false], ['Harris', bmrResult.harris, false], ['Katch', bmrResult.katch || '—', !!bmrResult.katch]].map(([n, v, highlight]) => (
                    <div key={n as string} className={`bg-[#111] border rounded-[16px] p-3 text-center ${highlight ? 'border-[#C9A84C]/20' : 'border-white/5'}`}>
                      <div className="text-[8px] text-white/25 uppercase tracking-wider mb-1">{n}</div>
                      <div className={`fd text-xl tracking-wider ${highlight ? 'gold' : 'text-white'}`}>{v}</div>
                      <div className="text-[8px] text-white/20">{n === 'Katch' ? '+ précis' : 'BMR base'}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#111] border border-white/5 rounded-[20px] p-5">
                  <div className="text-[9px] text-white/25 uppercase tracking-widest mb-3">Objectifs Caloriques</div>
                  {[['🔥 Perte de graisse', bmrResult.fatLoss, '-20%'], ['⚖️ Maintenance', bmrResult.tdee, '0%'], ['💪 Prise de masse', bmrResult.massGain, '+10%']].map(([label, val, pct]) => (
                    <div key={label as string} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                      <span className="text-sm text-white/60">{label}</span>
                      <div className="text-right">
                        <span className="fd text-xl text-white tracking-wider">{val}</span>
                        <span className="text-white/25 text-xs ml-1">kcal</span>
                        <span className="text-white/20 text-[9px] ml-2">{pct}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#111] border border-white/5 rounded-[20px] p-5">
                  <div className="text-[9px] text-white/25 uppercase tracking-widest mb-3">Macros ({bmrResult.tdee} kcal)</div>
                  <div className="grid grid-cols-3 gap-3">
                    {[['Protéines', bmrResult.protein, 'g', '#3b82f6'], ['Glucides', bmrResult.carbs, 'g', '#C9A84C'], ['Lipides', bmrResult.fat, 'g', '#10b981']].map(([n, v, u, c]) => (
                      <div key={n as string} className="text-center">
                        <div className="fd text-3xl text-white tracking-wider">{v}</div>
                        <div className="text-[9px] text-white/25 mt-0.5">{u}</div>
                        <div style={{ color: c as string }} className="text-[8px] font-bold uppercase mt-0.5">{n}</div>
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="bg-[#111] border border-white/5 rounded-t-[32px] p-5 pb-10 mt-10 min-h-[90vh]">
            <div className="flex justify-between items-center mb-5">
              <h3 className="fd text-2xl tracking-wider">AJOUTER ALIMENT</h3>
              <button onClick={() => { setModal(null); setSelectedFood(null); setFoodSearch('') }} className="w-8 h-8 bg-[#1a1a1a] rounded-full flex items-center justify-center"><X size={14} className="text-white/30" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {MEAL_TYPES.map(m => (
                <button key={m.id} onClick={() => setMealType(m.id)}
                  className={`border rounded-xl p-2 flex flex-col items-center gap-1 transition-all ${mealType === m.id ? 'border-[#C9A84C] bg-[#C9A84C]/10' : 'border-white/8 bg-[#1a1a1a]'}`}>
                  <span className="text-lg">{m.emoji}</span>
                  <span className={`text-[8px] font-bold uppercase ${mealType === m.id ? 'gold' : 'text-white/30'}`}>{m.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              {[['anses', '🏛️ Base ANSES'], ['custom', '⭐ Mes aliments']].map(([id, label]) => (
                <button key={id} onClick={() => { setSearchTab(id as any); setFoodSearch(''); setFoodResults([]) }}
                  className={`flex-1 border rounded-xl py-2.5 text-xs font-bold transition-all ${searchTab === id ? 'border-[#C9A84C] bg-[#C9A84C]/10 gold' : 'border-white/8 bg-[#1a1a1a] text-white/30'}`}>
                  {label}
                </button>
              ))}
            </div>
            {!selectedFood ? (
              <>
                <div className="relative mb-4">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                  <input value={foodSearch} onChange={e => setFoodSearch(e.target.value)}
                    placeholder={searchTab === 'anses' ? 'Rechercher dans la base ANSES (3484 aliments)...' : 'Rechercher mes aliments...'}
                    className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl pl-9 pr-4 py-3 text-white text-sm outline-none focus:border-[#C9A84C]/40 placeholder:text-white/15" />
                </div>
                {searchTab === 'custom' && (
                  <button onClick={() => setModal('custom_food')} className="w-full border-2 border-dashed border-white/10 rounded-xl py-3 flex items-center justify-center gap-2 text-white/30 text-xs font-bold mb-3">
                    <Plus size={14} /> Créer un aliment personnalisé
                  </button>
                )}
                <div className="space-y-2">
                  {foodResults.map((food: any) => {
                    const cals = searchTab === 'anses' ? (food.energy_kcal || food.calories || 0) : food.calories_per_100g
                    const prot = searchTab === 'anses' ? (food.proteins || 0) : food.proteins_per_100g
                    return (
                      <button key={food.id} onClick={() => setSelectedFood(food)}
                        className="w-full bg-[#1a1a1a] border border-white/5 rounded-[16px] px-4 py-3 flex items-center gap-3 active:border-[#C9A84C]/20 text-left">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-white">{food.name}</div>
                          {food.brand && <div className="text-[9px] text-white/25 mt-0.5">{food.brand}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold gold">{Math.round(cals)} kcal</div>
                          <div className="text-[9px] text-white/25">P:{Math.round(prot)}g · /100g</div>
                        </div>
                        <ChevronRight size={14} className="text-white/15" />
                      </button>
                    )
                  })}
                  {foodSearch.length >= 2 && foodResults.length === 0 && <p className="text-center text-white/20 text-sm py-5">Aucun résultat</p>}
                  {foodSearch.length < 2 && <p className="text-center text-white/15 text-xs py-4">Saisir au moins 2 caractères</p>}
                </div>
              </>
            ) : (
              <div>
                <button onClick={() => setSelectedFood(null)} className="flex items-center gap-1.5 text-white/30 text-xs font-bold mb-4">← Retour</button>
                <div className="bg-[#1a1a1a] border border-white/5 rounded-[20px] p-5 mb-4">
                  <div className="font-bold text-white text-base mb-3">{selectedFood.name}</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      ['Calories', searchTab === 'anses' ? (selectedFood.energy_kcal || 0) : selectedFood.calories_per_100g, 'kcal', '#C9A84C'],
                      ['Protéines', searchTab === 'anses' ? (selectedFood.proteins || 0) : selectedFood.proteins_per_100g, 'g', '#3b82f6'],
                      ['Glucides', searchTab === 'anses' ? (selectedFood.carbohydrates || selectedFood.carbs || 0) : selectedFood.carbs_per_100g, 'g', '#f97316'],
                      ['Lipides', searchTab === 'anses' ? (selectedFood.fat || selectedFood.fats || 0) : selectedFood.fats_per_100g, 'g', '#10b981'],
                    ].map(([n, v, u, c]) => (
                      <div key={n as string} className="text-center">
                        <div className="fd text-xl tracking-wider" style={{ color: c as string }}>{Math.round(v as number)}</div>
                        <div className="text-[8px] text-white/25">{u}/100g</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#1a1a1a] border border-white/5 rounded-[16px] px-4 py-3 flex items-center gap-3 mb-4">
                  <span className="text-white/30 text-sm flex-1">Quantité</span>
                  <input type="number" value={foodQty} onChange={e => setFoodQty(e.target.value)} className="bg-transparent text-white text-xl font-bold text-right w-20 outline-none" />
                  <span className="gold font-bold text-sm">g</span>
                </div>
                <div className="bg-[#1a1500] border border-[#C9A84C]/10 rounded-[16px] px-4 py-3 mb-4">
                  <div className="text-[9px] text-white/25 uppercase tracking-widest mb-2">Pour {foodQty}g :</div>
                  <div className="flex justify-around">
                    {[
                      ['Kcal', Math.round((searchTab === 'anses' ? (selectedFood.energy_kcal || 0) : selectedFood.calories_per_100g) * parseFloat(foodQty) / 100)],
                      ['Prot', Math.round((searchTab === 'anses' ? (selectedFood.proteins || 0) : selectedFood.proteins_per_100g) * parseFloat(foodQty) / 100 * 10) / 10],
                      ['Gluc', Math.round((searchTab === 'anses' ? (selectedFood.carbohydrates || selectedFood.carbs || 0) : selectedFood.carbs_per_100g) * parseFloat(foodQty) / 100 * 10) / 10],
                      ['Lip', Math.round((searchTab === 'anses' ? (selectedFood.fat || selectedFood.fats || 0) : selectedFood.fats_per_100g) * parseFloat(foodQty) / 100 * 10) / 10],
                    ].map(([n, v]) => (
                      <div key={n as string} className="text-center">
                        <div className="fd text-2xl gold tracking-wider">{v}</div>
                        <div className="text-[8px] text-white/25 uppercase">{n}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={addFoodToMeal} className="w-full gold-bg text-black font-bold py-4 rounded-2xl uppercase tracking-widest text-sm active:scale-[0.98]">Ajouter au repas</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ MODAL CUSTOM FOOD ═══════════════════ */}
      {modal === 'custom_food' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-[#111] border border-white/5 rounded-t-[32px] p-5 w-full pb-10">
            <div className="flex justify-between items-center mb-5">
              <h3 className="fd text-xl tracking-wider">NOUVEL ALIMENT</h3>
              <button onClick={() => setModal('food')} className="w-8 h-8 bg-[#1a1a1a] rounded-full flex items-center justify-center"><X size={14} className="text-white/30" /></button>
            </div>
            <div className="space-y-3">
              <input value={customFoodForm.name} onChange={e => setCustomFoodForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nom de l'aliment *" className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C9A84C]/40 placeholder:text-white/20" />
              <input value={customFoodForm.brand} onChange={e => setCustomFoodForm(p => ({ ...p, brand: e.target.value }))}
                placeholder="Marque (optionnel)" className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C9A84C]/40 placeholder:text-white/20" />
              <div className="grid grid-cols-2 gap-3">
                {[['calories_per_100g', 'Calories *', 'kcal'], ['proteins_per_100g', 'Protéines', 'g'], ['carbs_per_100g', 'Glucides', 'g'], ['fats_per_100g', 'Lipides', 'g']].map(([k, l, u]) => (
                  <div key={k} className="bg-[#1a1a1a] border border-white/5 rounded-xl px-3 py-2.5">
                    <div className="text-[8px] text-white/20 uppercase mb-1">{l} /100g</div>
                    <div className="flex gap-1 items-center">
                      <input type="number" value={(customFoodForm as any)[k]} onChange={e => setCustomFoodForm(p => ({ ...p, [k]: e.target.value }))}
                        placeholder="0" className="bg-transparent text-white text-sm font-bold flex-1 outline-none placeholder:text-white/10 w-full" />
                      <span className="text-white/20 text-xs">{u}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={addCustomFood} className="w-full gold-bg text-black font-bold py-4 rounded-2xl uppercase tracking-widest text-sm active:scale-[0.98] mt-4">Créer l'aliment</button>
          </div>
        </div>
      )}

      {/* ═══════════════════ HOME TAB ═══════════════════ */}
      {activeTab === 'home' && (
        <div>
          <div className="relative overflow-hidden bg-gradient-to-b from-[#111] to-[#080808] pb-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A84C]/4 rounded-full blur-[60px] pointer-events-none" />
            <div className="p-5 pt-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] mb-1">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <h1 className="fd text-4xl text-white tracking-wider">BON RETOUR,</h1>
                  <h1 className="fd text-4xl gold tracking-wider">{userName.toUpperCase()}</h1>
                </div>
                <button onClick={() => avatarRef.current?.click()} className="relative">
                  {displayAvatar
                    ? <img src={displayAvatar} className="w-14 h-14 rounded-2xl border-2 border-[#C9A84C]/20 object-cover" />
                    : <div className="w-14 h-14 bg-[#C9A84C]/8 border border-[#C9A84C]/15 rounded-2xl flex items-center justify-center"><User size={24} className="gold" /></div>
                  }
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 gold-bg rounded-full flex items-center justify-center border-2 border-[#080808]">
                    {avatarUploading ? <div className="w-2.5 h-2.5 border border-black border-t-transparent rounded-full animate-spin" /> : <Camera size={8} className="text-black" />}
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setModal('weight')} className="bg-[#1a1a1a] border border-white/5 rounded-[20px] p-4 text-left active:border-[#C9A84C]/25">
                  <Scale size={15} className="gold mb-2" />
                  <div className="fd text-2xl text-white tracking-wider">{currentWeight || '—'}</div>
                  <div className="text-[8px] text-white/25 uppercase tracking-widest">kg actuel</div>
                </button>
                <div className="bg-[#1a1a1a] border border-white/5 rounded-[20px] p-4">
                  <Target size={15} className="text-white/30 mb-2" />
                  <div className="fd text-2xl text-white tracking-wider">{goalWeight}</div>
                  <div className="text-[8px] text-white/25 uppercase tracking-widest">kg objectif</div>
                </div>
                <div className="bg-[#1a1a1a] border border-white/5 rounded-[20px] p-4">
                  <TrendingDown size={15} className={`mb-2 ${weightProgress <= 0 ? 'text-green-400' : 'text-red-400'}`} />
<div className={`fd text-2xl tracking-wider ${weightProgress <= 0 ? 'text-green-400' : 'text-red-400'}`}>
  {weightProgress > 0 ? '+' : ''}{weightProgress}
</div>
                  <div className="text-[8px] text-white/25 uppercase tracking-widest">évolution</div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-[#111] border border-white/5 rounded-[20px] p-5">
              <div className="flex justify-between mb-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Objectif Poids</span>
                <span className="gold text-[10px] font-bold">{Math.round(progressPct)}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full gold-bg rounded-full shadow-[0_0_8px_rgba(201,168,76,0.4)]" style={{ width: `${progressPct}%`, transition: 'width 0.7s ease' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setActiveTab('nutrition')} className="bg-[#111] border border-white/5 rounded-[20px] p-5 text-left active:border-[#C9A84C]/20">
                <UtensilsCrossed size={17} className="gold mb-3" />
                <div className="fd text-3xl text-white tracking-wider">{totalCals}</div>
                <div className="text-[8px] text-white/25 uppercase tracking-wider">kcal aujourd'hui</div>
                <div className="h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                  <div className="h-full gold-bg rounded-full" style={{ width: `${Math.min(100, (totalCals / calorieGoal) * 100)}%` }} />
                </div>
              </button>
              <button onClick={() => setActiveTab('training')} className="bg-[#111] border border-white/5 rounded-[20px] p-5 text-left active:border-[#C9A84C]/20">
                <Dumbbell size={17} className="text-white/30 mb-3" />
                <div className="fd text-3xl text-white tracking-wider">{completedSessions}</div>
                <div className="text-[8px] text-white/25 uppercase tracking-wider">séances totales</div>
                <div className="flex gap-1 mt-3">
                  {[...Array(5)].map((_, i) => <div key={i} className={`flex-1 h-1 rounded-full ${i < Math.min(5, completedSessions) ? 'gold-bg' : 'bg-white/5'}`} />)}
                </div>
              </button>
            </div>
            <button onClick={() => setModal('bmr')} className="w-full bg-[#111] border border-[#C9A84C]/15 rounded-[20px] p-5 flex items-center gap-4 active:border-[#C9A84C]/30 transition-all">
              <div className="w-11 h-11 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-2xl flex items-center justify-center"><Sparkles size={20} className="gold" /></div>
              <div className="text-left flex-1">
                <div className="font-bold text-sm text-white">Calculateur BMR / TDEE</div>
                <div className="text-[9px] text-white/25 mt-0.5">Mifflin-St Jeor · Katch-McArdle · Macros optimaux</div>
              </div>
              <ChevronRight size={16} className="text-white/20" />
            </button>
            {userProgram && (
              <div className="bg-[#111] border border-white/5 rounded-[20px] p-5">
                <div className="text-[9px] text-white/25 uppercase tracking-widest mb-2">Programme Actuel</div>
                <div className="font-bold text-sm text-white">{userProgram.training_programs?.name}</div>
                <div className="text-[9px] text-white/25 mt-1">Semaine {userProgram.current_week} · Jour {userProgram.current_day}</div>
              </div>
            )}
            {weightHistory.length > 1 && (
              <div className="bg-[#111] border border-white/5 rounded-[20px] p-5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Courbe de Poids</span>
                  <button onClick={() => setModal('weight')} className="text-[9px] gold font-bold uppercase">+ Log</button>
                </div>
                <WeightChart data={weightHistory} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              {[{ icon: Scale, label: 'Poids', action: () => setModal('weight') }, { icon: Ruler, label: 'Mesures', action: () => setModal('measure') }, { icon: Camera, label: 'Photo', action: () => photoRef.current?.click() }].map(({ icon: Icon, label, action }) => (
                <button key={label} onClick={action} className="bg-[#111] border border-white/5 rounded-[20px] p-4 flex flex-col items-center gap-2 active:border-[#C9A84C]/20">
                  <Icon size={20} className="gold" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">{label}</span>
                </button>
              ))}
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={uploadProgressPhoto} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ BODY TAB ═══════════════════ */}
      {activeTab === 'body' && (
        <div className="p-5 pt-10">
          <div className="flex justify-between items-center mb-6">
            <h1 className="fd text-3xl tracking-wider">CORPS</h1>
            <div className="flex gap-2">
              <button onClick={() => setModal('measure')} className="gold-bg text-black text-[9px] font-bold px-3 py-2 rounded-xl uppercase">+ Mesure</button>
              <button onClick={() => photoRef.current?.click()} className="bg-[#1a1a1a] border border-white/8 text-white/30 text-[9px] font-bold px-3 py-2 rounded-xl flex items-center gap-1"><Camera size={11} /> Photo</button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={uploadProgressPhoto} />
            </div>
          </div>
          {latestMeasure ? (
            <div className="bg-[#111] border border-white/5 rounded-[24px] p-5 mb-4">
              <div className="flex justify-between mb-4">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Dernières Mesures</span>
                <span className="text-[9px] text-white/15">{new Date(latestMeasure.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[['Poitrine', latestMeasure.chest, 'cm'], ['Taille', latestMeasure.waist, 'cm'], ['Hanches', latestMeasure.hips, 'cm'], ['Bras G', latestMeasure.left_arm, 'cm'], ['Bras D', latestMeasure.right_arm, 'cm'], ['Cuisse G', latestMeasure.left_thigh, 'cm'], ['% Graisse', latestMeasure.body_fat, '%'], ['Masse Musc', latestMeasure.muscle_mass, 'kg']].map(([l, v, u]) => v && (
                  <div key={l as string} className="bg-[#1a1a1a] rounded-xl px-3 py-2 flex justify-between items-center">
                    <span className="text-[9px] text-white/30">{l}</span>
                    <span className="fd text-lg text-white tracking-wider">{v}<span className="text-[9px] text-white/20 ml-1">{u}</span></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button onClick={() => setModal('measure')} className="w-full border-2 border-dashed border-white/8 rounded-[20px] p-8 flex flex-col items-center gap-2 mb-4">
              <Ruler size={28} className="text-white/15" />
              <span className="text-white/25 text-sm font-medium">Prendre mes premières mesures</span>
            </button>
          )}
          <div className="flex justify-between items-center mb-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Photos Progression</span>
          </div>
          {progressPhotos.length === 0 ? (
            <button onClick={() => photoRef.current?.click()} className="w-full border-2 border-dashed border-white/8 rounded-[20px] p-10 flex flex-col items-center gap-2">
              <Camera size={28} className="text-white/15" />
              <span className="text-white/20 text-sm font-medium">Ajouter une photo</span>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => photoRef.current?.click()} className="aspect-square border-2 border-dashed border-white/8 rounded-[16px] flex items-center justify-center">
                {photoUploading ? <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" /> : <Plus size={22} className="text-white/15" />}
              </button>
              {progressPhotos.map(p => (
                <div key={p.id} className="aspect-square rounded-[16px] overflow-hidden">
                  <img src={p.photo_url} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ NUTRITION TAB ═══════════════════ */}
      {activeTab === 'nutrition' && (
        <div className="p-5 pt-10">
          <div className="flex justify-between items-center mb-5">
            <h1 className="fd text-3xl tracking-wider">NUTRITION</h1>
            <div className="flex gap-2">
              <button onClick={() => setModal('bmr')} className="bg-[#1a1a1a] border border-[#C9A84C]/20 text-[9px] gold font-bold px-3 py-2 rounded-xl uppercase flex items-center gap-1"><Sparkles size={10} /> BMR</button>
              <button onClick={() => setModal('food')} className="gold-bg text-black text-[9px] font-bold px-3 py-2 rounded-xl uppercase flex items-center gap-1"><Plus size={11} strokeWidth={3} /> Repas</button>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#1a1500] to-[#111] border border-[#C9A84C]/15 rounded-[24px] p-5 mb-4 flex items-center gap-4">
            <CalorieChart data={[{ value: totalCals || 1 }, { value: Math.max(0, calorieGoal - totalCals) }]} colors={['#C9A84C', 'rgba(201,168,76,0.08)']} calories={totalCals} />
            <div className="flex-1">
              <div className="text-white/25 text-[9px] uppercase tracking-widest mb-1">Aujourd'hui</div>
              <div className="fd text-4xl gold tracking-wider">{totalCals}</div>
              <div className="text-white/25 text-xs">/ {calorieGoal} kcal</div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[['P', totalProteins.toFixed(0), '#3b82f6'], ['G', todayMeals.reduce((s, m) => s + (m.carbs || 0), 0).toFixed(0), '#C9A84C'], ['L', todayMeals.reduce((s, m) => s + (m.fats || 0), 0).toFixed(0), '#10b981']].map(([k, v, c]) => (
                  <div key={k as string} className="text-center">
                    <div className="font-bold text-sm text-white">{v}<span className="text-[9px] text-white/25 ml-0.5">g</span></div>
                    <div className="text-[8px] uppercase font-bold" style={{ color: c as string }}>{k === 'P' ? 'Prot' : k === 'G' ? 'Gluc' : 'Lip'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {MEAL_TYPES.map(type => {
            const meals = todayMeals.filter(m => m.meal_type === type.id)
            return (
              <div key={type.id} className="mb-3">
                <div className="flex items-center gap-2 px-1 mb-2">
                  <span>{type.emoji}</span>
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{type.label}</span>
                  {meals.length > 0 && <span className="ml-auto gold text-[9px] font-bold">{meals.reduce((s, m) => s + m.calories, 0)} kcal</span>}
                </div>
                {meals.length === 0 ? (
                  <button onClick={() => { setMealType(type.id); setModal('food') }} className="w-full bg-[#111] border border-dashed border-white/5 rounded-[14px] py-3 flex items-center justify-center gap-2 text-white/15 text-xs active:border-[#C9A84C]/15">
                    <Plus size={13} /> Ajouter
                  </button>
                ) : (
                  <div className="bg-[#111] border border-white/5 rounded-[16px] overflow-hidden">
                    {meals.map((meal, i) => (
                      <div key={meal.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{meal.name}</div>
                          <div className="text-[9px] text-white/20 mt-0.5">P:{meal.proteins}g · G:{meal.carbs}g · L:{meal.fats}g</div>
                        </div>
                        <span className="text-xs font-bold text-white/30">{meal.calories} kcal</span>
                        <button onClick={async () => { await supabase.from('meal_logs').delete().eq('id', meal.id); fetchAll() }} className="text-white/10 active:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => { setMealType(type.id); setModal('food') }} className="w-full py-2.5 border-t border-white/5 text-[9px] gold font-bold uppercase tracking-widest">+ Ajouter</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════ TRAINING TAB ═══════════════════ */}
      {activeTab === 'training' && !selectedProgram && (
        <div className="p-5 pt-10">
          <div className="flex justify-between items-center mb-5">
            <h1 className="fd text-3xl tracking-wider">TRAINING</h1>
          </div>
          <div className="space-y-2 mb-5">
            <div className="grid grid-cols-3 gap-2">
              {[['', 'Tous niveaux'], ['beginner', '🌱 Débutant'], ['intermediate', '⚡ Intermédiaire'], ['advanced', '🔥 Avancé']].map(([val, label]) => (
                <button key={val as string} onClick={() => setProgramFilter(p => ({ ...p, level: val as string }))}
                  className={`border rounded-xl py-2 text-[9px] font-bold uppercase tracking-wider transition-all ${programFilter.level === val ? 'border-[#C9A84C] bg-[#C9A84C]/10 gold' : 'border-white/8 bg-[#1a1a1a] text-white/30'} ${val === '' ? 'col-span-3' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[['', 'Tous objectifs'], ['fat_loss', '🔥 Sèche'], ['muscle_gain', '💪 Masse'], ['hypertrophy', '📈 Hypertrophie']].map(([val, label]) => (
                <button key={val as string} onClick={() => setProgramFilter(p => ({ ...p, goal: val as string }))}
                  className={`border rounded-xl py-2 text-[9px] font-bold uppercase tracking-wider transition-all ${programFilter.goal === val ? 'border-[#C9A84C] bg-[#C9A84C]/10 gold' : 'border-white/8 bg-[#1a1a1a] text-white/30'} ${val === '' ? 'col-span-3' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[['', 'Tous'], ['male', '♂ Homme'], ['female', '♀ Femme']].map(([val, label]) => (
                <button key={val as string} onClick={() => setProgramFilter(p => ({ ...p, gender: val as string }))}
                  className={`border rounded-xl py-2 text-[9px] font-bold uppercase tracking-wider transition-all ${programFilter.gender === val ? 'border-[#C9A84C] bg-[#C9A84C]/10 gold' : 'border-white/8 bg-[#1a1a1a] text-white/30'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {filteredPrograms.length === 0 ? (
              <div className="border-2 border-dashed border-white/5 rounded-[20px] p-10 text-center">
                <p className="text-white/20 text-sm">Aucun programme pour ces filtres</p>
              </div>
            ) : filteredPrograms.map(prog => (
              <button key={prog.id} onClick={() => loadProgram(prog)} className="w-full bg-[#111] border border-white/5 rounded-[20px] p-5 text-left active:border-[#C9A84C]/20 transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/15 rounded-xl px-2 py-1 mt-0.5">
                    <span className="fd text-xs gold">{prog.level === 'beginner' ? '🌱' : prog.level === 'intermediate' ? '⚡' : '🔥'}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-white">{prog.name}</div>
                    <div className="text-[9px] text-white/25 mt-0.5">{prog.description}</div>
                  </div>
                  <ChevronRight size={16} className="text-white/15 mt-0.5" />
                </div>
                <div className="flex gap-2">
                  <span className={`text-[8px] font-bold px-2 py-1 rounded-lg uppercase border ${prog.goal === 'fat_loss' ? 'border-orange-500/30 text-orange-400 bg-orange-500/5' : prog.goal === 'muscle_gain' ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' : 'border-purple-500/30 text-purple-400 bg-purple-500/5'}`}>
                    {prog.goal === 'fat_loss' ? '🔥 Sèche' : prog.goal === 'muscle_gain' ? '💪 Masse' : '📈 Hypertrophie'}
                  </span>
                  <span className="text-[8px] font-bold px-2 py-1 rounded-lg uppercase border border-white/8 text-white/25">{prog.gender === 'both' ? '♂♀' : prog.gender === 'male' ? '♂ Homme' : '♀ Femme'}</span>
                  <span className="text-[8px] font-bold px-2 py-1 rounded-lg uppercase border border-white/8 text-white/25">{prog.days_per_week}j/sem</span>
                </div>
              </button>
            ))}
          </div>
          {wSessions.length > 0 && (
            <div className="mt-6">
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-3 ml-1">Séances Récentes</div>
              <div className="space-y-2">
                {wSessions.slice(0, 4).map((s: any) => (
                  <div key={s.id} className="bg-[#111] border border-white/5 rounded-[14px] px-4 py-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.completed ? 'bg-[#C9A84C]/10' : 'bg-white/5'}`}>
                      {s.completed ? <Check size={14} className="gold" strokeWidth={3} /> : <Zap size={14} className="text-white/20" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{s.name}</div>
                      <div className="text-[9px] text-white/20 mt-0.5">{new Date(s.date).toLocaleDateString('fr-FR')} · {s.duration_minutes ? `${s.duration_minutes} min` : '—'}</div>
                    </div>
                    {s.completed && <span className="text-[8px] gold font-bold uppercase bg-[#C9A84C]/8 px-2 py-1 rounded-lg">Done</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ PROGRAM DETAIL ═══════════════════ */}
      {activeTab === 'training' && selectedProgram && (
        <div className="p-5 pt-8">
          <button onClick={() => { setSelectedProgram(null); setProgramDays([]); setSelectedDay(null); setDayExercises([]) }}
            className="flex items-center gap-1.5 text-white/25 text-xs font-bold mb-5 active:text-white/50">← Programmes</button>
          <h1 className="fd text-3xl tracking-wider text-white mb-1">{selectedProgram.name}</h1>
          <p className="text-white/25 text-xs mb-5">{selectedProgram.description}</p>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {programDays.map(day => (
              <button key={day.id} onClick={() => loadDayExercises(day)}
                className={`flex-shrink-0 border rounded-xl px-4 py-2 text-[9px] font-bold uppercase tracking-wider transition-all ${selectedDay?.id === day.id ? 'border-[#C9A84C] bg-[#C9A84C]/10 gold' : 'border-white/8 bg-[#1a1a1a] text-white/30'}`}>
                {day.is_rest ? '😴 Repos' : `J${day.day_number}`}
              </button>
            ))}
          </div>
          {selectedDay && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="font-bold text-white">{selectedDay.day_name}</h2>
                  <p className="text-[9px] text-white/25 mt-0.5">{selectedDay.focus}</p>
                </div>
                {!selectedDay.is_rest && dayExercises.length > 0 && (
                  <button onClick={() => startProgramWorkout(selectedDay, dayExercises)}
                    className="gold-bg text-black text-[10px] font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider active:scale-95">
                    ▶ Commencer
                  </button>
                )}
              </div>
              {selectedDay.is_rest ? (
                <div className="bg-[#111] border border-white/5 rounded-[20px] p-8 text-center">
                  <div className="text-4xl mb-3">😴</div>
                  <p className="text-white/30 font-medium">Jour de repos — Récupération active</p>
                  <p className="text-white/15 text-xs mt-1">Marche légère, stretching, mobilité</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayExercises.map((exo, i) => (
                    <div key={exo.id} className="bg-[#111] border border-white/5 rounded-[18px] p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-7 h-7 bg-[#C9A84C]/10 border border-[#C9A84C]/15 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="fd text-xs gold">{i + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm text-white">{exo.exercise_name}</div>
                          <div className="text-[9px] text-white/25 mt-0.5">{exo.muscle_group}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 ml-10">
                        <span className="text-[8px] bg-white/5 text-white/30 px-2 py-1 rounded-lg font-bold">{exo.sets} × {exo.reps}</span>
                        <span className="text-[8px] bg-[#C9A84C]/8 gold px-2 py-1 rounded-lg font-bold">⏱ {exo.rest_seconds}s repos</span>
                        {exo.tempo && <span className="text-[8px] bg-white/5 text-white/25 px-2 py-1 rounded-lg font-bold">Tempo {exo.tempo}</span>}
                        {exo.rir != null && <span className="text-[8px] bg-white/5 text-white/25 px-2 py-1 rounded-lg font-bold">RIR {exo.rir}</span>}
                      </div>
                      {exo.notes && <p className="text-[8px] text-white/20 italic ml-10 mt-1.5">{exo.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ COACH / PROFIL TAB ═══════════════════ */}
      {activeTab === 'coach' && (
        <div className="p-5 pt-10">
          {isCoach ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="fd text-3xl tracking-wider">COACH PANEL</h1>
                  <p className="text-[#C9A84C]/40 text-[9px] uppercase tracking-widest mt-0.5">Accès Privé</p>
                </div>
                <button onClick={() => supabase.auth.signOut()} className="bg-[#1a1a1a] border border-white/5 p-2.5 rounded-xl text-white/25"><LogOut size={16} /></button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[['Clients', clients.length, Crown], ['Actifs', clients.filter((c: any) => c.status === 'active').length, Zap], ['Séances', completedSessions, Dumbbell]].map(([l, v, Icon]: any) => (
                  <div key={l} className="bg-[#111] border border-white/5 rounded-[20px] p-4 text-center">
                    <Icon size={15} className="gold mx-auto mb-2" />
                    <div className="fd text-3xl text-white tracking-wider">{v}</div>
                    <div className="text-[8px] text-white/20 uppercase tracking-wider">{l}</div>
                  </div>
                ))}
              </div>
              {clients.length === 0 ? (
                <div className="border-2 border-dashed border-white/5 rounded-[20px] p-10 text-center">
                  <Users size={28} className="text-white/10 mx-auto mb-3" />
                  <p className="text-white/15 text-sm">Aucun client — Ajoute via Supabase</p>
                </div>
              ) : clients.map((c: any) => (
                <div key={c.id} className="bg-[#111] border border-white/5 rounded-[20px] p-5 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#C9A84C]/8 border border-[#C9A84C]/15 rounded-2xl flex items-center justify-center"><User size={17} className="gold" /></div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-white">{c.profiles?.full_name || 'Client'}</div>
                      <div className={`text-[8px] font-bold uppercase mt-0.5 ${c.status === 'active' ? 'text-green-400' : 'text-white/20'}`}>{c.status}</div>
                    </div>
                    <div className="gold text-sm fd tracking-wider">{c.profiles?.current_weight || '—'} kg</div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h1 className="fd text-3xl tracking-wider">PROFIL</h1>
                <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1.5 bg-[#1a1a1a] border border-white/5 px-3 py-2 rounded-xl text-white/25 text-[9px] font-bold uppercase">
                  <LogOut size={12} /> Déco
                </button>
              </div>
              <div className="bg-[#111] border border-white/5 rounded-[24px] p-5 mb-4 flex items-center gap-4">
                <button onClick={() => avatarRef.current?.click()} className="relative">
                  {displayAvatar
                    ? <img src={displayAvatar} className="w-16 h-16 rounded-2xl object-cover border border-[#C9A84C]/15" />
                    : <div className="w-16 h-16 bg-[#C9A84C]/8 rounded-2xl flex items-center justify-center"><User size={26} className="gold" /></div>
                  }
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 gold-bg rounded-full flex items-center justify-center border-2 border-[#080808]"><Camera size={7} className="text-black" /></div>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
                </button>
                <div>
                  <div className="fd text-2xl text-white tracking-wider">{session.user.user_metadata?.full_name || userName}</div>
                  <div className="text-white/25 text-xs">{session.user.email}</div>
                  <div className="flex items-center gap-1 mt-1.5"><Award size={9} className="gold" /><span className="gold text-[8px] font-bold uppercase">Membre Actif</span></div>
                </div>
              </div>
              <div className="space-y-2">
                {[['Poids actuel', `${currentWeight || '—'} kg`, () => setModal('weight')], ['Objectif', `${goalWeight} kg`], ['Calories/jour', `${calorieGoal} kcal`, () => setModal('bmr')], ['Séances', `${completedSessions} total`]].map(([label, val, action]: any) => (
                  <button key={label} onClick={action} className="w-full bg-[#111] border border-white/5 rounded-[14px] px-4 py-3.5 flex justify-between items-center active:border-[#C9A84C]/15">
                    <span className="text-sm text-white/40 font-medium">{label}</span>
                    <span className="gold text-sm font-bold">{val}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════ BOTTOM NAV ═══════════════════ */}
      <nav className="fixed bottom-5 left-5 right-5 bg-[#111]/96 backdrop-blur-xl border border-white/5 h-16 rounded-[22px] flex justify-around items-center shadow-[0_10px_40px_rgba(0,0,0,0.7)] z-40">
        {([
          { id: 'home', icon: BarChart2, label: 'Home' },
          { id: 'body', icon: Ruler, label: 'Corps' },
          { id: 'nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
          { id: 'training', icon: Dumbbell, label: 'Training' },
          { id: 'coach', icon: isCoach ? Crown : User, label: isCoach ? 'Coach' : 'Profil' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => { setActiveTab(id as Tab); if (id === 'training' && selectedProgram) setSelectedProgram(null) }} className="flex flex-col items-center gap-1 px-3 active:scale-90 transition-all">
            <Icon size={20} className={activeTab === id ? 'gold' : 'text-white/18'} />
            <span className={`text-[8px] font-bold uppercase tracking-wider ${activeTab === id ? 'gold' : 'text-white/18'}`}>{label}</span>
          </button>
        ))}
        <button onClick={() => router.push('/programme')} className="flex flex-col items-center gap-1 px-3 active:scale-90 transition-all">
          <Dumbbell size={20} style={{ color: '#F97316' }} />
          <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: '#F97316' }}>Programme</span>
        </button>
        <button onClick={() => router.push('/nutrition-plan')} className="flex flex-col items-center gap-1 px-3 active:scale-90 transition-all">
          <Utensils size={20} style={{ color: '#22C55E' }} />
          <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: '#22C55E' }}>Plan nutri</span>
        </button>
      </nav>
    </div>
  )
}