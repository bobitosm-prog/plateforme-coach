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
  Timer, Play, Pause, RotateCcw, Info, Sparkles, Utensils, Moon, TrendingUp,
  MessageCircle, Send
} from 'lucide-react'

import WorkoutSession from './components/WorkoutSession'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const COACH_EMAIL = "bobitosm@gmail.com"

type Tab = 'home' | 'training' | 'nutrition' | 'progress' | 'profil' | 'messages'

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

// Explicit tab→key mapping for the nutrition day tabs
// Tab index 0=lundi … 6=dimanche, matching coachMealPlan[key] directly
const NUTRITION_DAYS: { key: string; label: string }[] = [
  { key: 'lundi',    label: 'Lun' },
  { key: 'mardi',    label: 'Mar' },
  { key: 'mercredi', label: 'Mer' },
  { key: 'jeudi',    label: 'Jeu' },
  { key: 'vendredi', label: 'Ven' },
  { key: 'samedi',   label: 'Sam' },
  { key: 'dimanche', label: 'Dim' },
]
// Map JS getDay() (0=Sun … 6=Sat) to the French key used in coachMealPlan
function todayNutritionKey(): string {
  const jsDay = new Date().getDay() // 0=Sun, 1=Mon, …, 6=Sat
  return jsDay === 0 ? 'dimanche' : NUTRITION_DAYS[jsDay - 1].key
}

// Design tokens
const BG_BASE = '#0A0A0A'
const BG_CARD = '#1A1A1A'
const BORDER = '#2A2A2A'
const ORANGE = '#F97316'
const GREEN = '#22C55E'
const TEXT_PRIMARY = '#F8FAFC'
const TEXT_MUTED = '#6B7280'
const RADIUS_CARD = 20

const MUSCLE_COLORS: Record<string, string> = {
  'Poitrine': '#EF4444',
  'Dos': '#3B82F6',
  'Épaules': '#8B5CF6',
  'Bras': '#F97316',
  'Jambes': '#22C55E',
  'Abdos': '#EAB308',
  'Fessiers': '#EC4899',
  'Cardio': '#06B6D4',
}
const MUSCLE_GROUPS_FILTER = ['Tous', 'Poitrine', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Abdos', 'Fessiers', 'Cardio']

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

  // Training tab: expanded day (legacy, kept for compat)
  const [activeDay, setActiveDay] = useState<string | null>(null)
  // Training tab interactive state
  const [trainingDay, setTrainingDay] = useState<string>(() => JS_DAYS_FR[new Date().getDay()])
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({})
  const [exSearch, setExSearch] = useState('')
  const [exResults, setExResults] = useState<any[]>([])
  const [showExSearch, setShowExSearch] = useState(false)
  const [showExDbModal, setShowExDbModal] = useState(false)
  const [exDbAllResults, setExDbAllResults] = useState<any[]>([])
  const [exDbMuscleFilter, setExDbMuscleFilter] = useState('Tous')
  const [selectedExDb, setSelectedExDb] = useState<any>(null)
  const [exDbAddSets, setExDbAddSets] = useState('3')
  const [exDbAddReps, setExDbAddReps] = useState('10')
  const [exDbAddRest, setExDbAddRest] = useState('60')
  const [workoutFinished, setWorkoutFinished] = useState(false)
  const [workoutStarted, setWorkoutStarted] = useState<number | null>(null)
  const [activeRestExName, setActiveRestExName] = useState<string | null>(null)
  // Nutrition tab: selected day for coach plan
  const [nutritionDay, setNutritionDay] = useState<string>(todayNutritionKey())
  // Profil tab: phone editing
  const [phoneForm, setPhoneForm] = useState('')
  const [phoneEditing, setPhoneEditing] = useState(false)
  // Messages tab
  const [coachId, setCoachId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const lastMsgTimestampRef = useRef<string | null>(null)
  const exSearchRef = useRef<any>(null)

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

  // Training: load completed sets from localStorage when day or program changes
  useEffect(() => {
    if (!coachProgram || !trainingDay) return
    const todayStr = new Date().toISOString().split('T')[0]
    const dayData = coachProgram[trainingDay]
    if (!dayData?.exercises) { setCompletedSets({}); return }
    const loaded: Record<string, boolean[]> = {}
    ;(dayData.exercises as any[]).forEach((ex: any) => {
      const key = `fitpro-sets-${todayStr}-${ex.name}`
      const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null
      loaded[key] = stored ? JSON.parse(stored) : Array(Number(ex.sets)).fill(false)
    })
    setCompletedSets(loaded)
  }, [trainingDay, coachProgram])

  // Training: exercise DB search debounce
  useEffect(() => {
    clearTimeout(exSearchRef.current)
    if (exSearch.length < 2) { setExResults([]); return }
    exSearchRef.current = setTimeout(async () => {
      const { data } = await supabase.from('exercises_db').select('*').ilike('name', `%${exSearch}%`).limit(10)
      setExResults(data || [])
    }, 300)
  }, [exSearch])

  // Training: load all exercises when DB modal opens
  useEffect(() => {
    if (!showExDbModal || exDbAllResults.length > 0) return
    supabase.from('exercises_db').select('*').order('name').limit(200).then(({ data }) => {
      setExDbAllResults(data || [])
    })
  }, [showExDbModal])

  // Messages: keep timestamp ref pointing at latest real message
  useEffect(() => {
    const real = messages.filter(m => !String(m.id).startsWith('opt-'))
    if (real.length > 0) lastMsgTimestampRef.current = real[real.length - 1].created_at
  }, [messages])

  // Messages: poll every 3s for new messages (more reliable than WebSocket on free tier)
  useEffect(() => {
    if (!session?.user?.id || !coachId) return
    const uid = session.user.id
    loadMessages(coachId) // initial full load
    const id = setInterval(async () => {
      const since = lastMsgTimestampRef.current
      if (!since) return
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${coachId}),and(sender_id.eq.${coachId},receiver_id.eq.${uid})`)
        .gt('created_at', since)
        .order('created_at', { ascending: true })
      if (data?.length) {
        setMessages(prev => [...prev.filter(m => !String(m.id).startsWith('opt-')), ...data])
      }
    }, 3000)
    return () => clearInterval(id)
  }, [session?.user?.id, coachId])

  // Messages: scroll to bottom on new messages
  useEffect(() => {
    if (activeTab === 'messages') {
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [messages, activeTab])

  // Messages: mark as read when tab is opened
  useEffect(() => {
    if (activeTab === 'messages' && coachId) markMessagesRead()
  }, [activeTab, coachId])

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
      supabase.from('user_programs').select('*, training_programs(*)').eq('user_id', uid).eq('active', true).maybeSingle(),
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
    if (coachMealRes.data?.plan) setCoachMealPlan(coachMealRes.data.plan)

    if (session?.user?.email === COACH_EMAIL) {
      const { data } = await supabase.from('coach_clients').select('*, profiles!coach_clients_client_id_fkey(*)').eq('coach_id', uid)
      setClients(data || [])
    }

    // Find this client's coach
    const { data: coachLink } = await supabase
      .from('coach_clients')
      .select('coach_id')
      .eq('client_id', uid)
      .maybeSingle()
    if (coachLink?.coach_id) setCoachId(coachLink.coach_id)

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
    await supabase.from('progress_photos').insert({ user_id: session.user.id, photo_url: path, view_type: 'front' })
    toast.success('Photo ajoutée !')
    setPhotoUploading(false); fetchAll()
  }

  async function deletePhoto(photo: any) {
    await supabase.storage.from('progress-photos').remove([photo.photo_url])
    await supabase.from('progress_photos').delete().eq('id', photo.id)
    setProgressPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  async function loadMessages(cId: string) {
    const uid = session?.user?.id
    if (!uid || !cId) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${cId}),and(sender_id.eq.${cId},receiver_id.eq.${uid})`)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setUnreadCount((data || []).filter((m: any) => m.sender_id === cId && !m.read).length)
  }

  async function sendMessage() {
    if (!msgInput.trim() || !coachId || !session) return
    const content = msgInput.trim()
    setMsgInput('')

    // Optimistic update — show immediately without waiting for realtime
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: session.user.id,
      receiver_id: coachId,
      content,
      read: false,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    await supabase.from('messages').insert({ sender_id: session.user.id, receiver_id: coachId, content })

    // Replace optimistic with real row from server
    loadMessages(coachId)
  }

  async function markMessagesRead() {
    if (!session || !coachId) return
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', session.user.id)
      .eq('sender_id', coachId)
      .eq('read', false)
    setUnreadCount(0)
  }

  function toggleSet(exName: string, setIdx: number, totalSetsCount: number, restSecs: number) {
    const todayStr = new Date().toISOString().split('T')[0]
    const key = `fitpro-sets-${todayStr}-${exName}`
    const prev = completedSets[key] || Array(totalSetsCount).fill(false)
    const next = [...prev]
    next[setIdx] = !next[setIdx]
    localStorage.setItem(key, JSON.stringify(next))
    setCompletedSets(p => ({ ...p, [key]: next }))
    if (!workoutStarted && next[setIdx]) setWorkoutStarted(Date.now())
    if (next[setIdx]) {
      const allDone = next.every(Boolean)
      if (!allDone && restSecs > 0) {
        setActiveRestExName(exName)
        setRestMax(restSecs)
        setRestTimer(restSecs)
        setRestRunning(true)
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
      }
    } else {
      if (activeRestExName === exName) {
        setRestRunning(false)
        setRestTimer(0)
        setActiveRestExName(null)
      }
    }
  }

  async function finishTrainingWorkout() {
    const duration = workoutStarted ? Math.round((Date.now() - workoutStarted) / 60000) : 1
    const exs: any[] = (coachProgram?.[trainingDay]?.exercises as any[]) || []
    const todayStr = new Date().toISOString().split('T')[0]
    const totalSetsCount = exs.reduce((s: number, ex: any) => s + Number(ex.sets), 0)
    const doneSetsCount = exs.reduce((s: number, ex: any) => {
      const key = `fitpro-sets-${todayStr}-${ex.name}`
      return s + (completedSets[key] || []).filter(Boolean).length
    }, 0)
    await supabase.from('workout_sessions').insert({
      user_id: session.user.id,
      name: trainingDay,
      completed: true,
      duration_minutes: Math.max(duration, 1),
      notes: `${doneSetsCount}/${totalSetsCount} séries · ${exs.length} exercices`,
    })
    exs.forEach((ex: any) => {
      if (typeof window !== 'undefined') localStorage.removeItem(`fitpro-sets-${todayStr}-${ex.name}`)
    })
    setCompletedSets({})
    setWorkoutStarted(null)
    setRestRunning(false)
    setRestTimer(0)
    setActiveRestExName(null)
    setWorkoutFinished(true)
    toast.success('Séance terminée ! Bien joué')
    setTimeout(() => setWorkoutFinished(false), 4000)
    fetchAll()
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
        .photo-cell:hover .photo-delete-btn { opacity: 1 !important; }
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

      {/* ═══════════════════ EXERCISE DB MODAL ═══════════════════ */}
      <AnimatePresence>
        {showExDbModal && (
          <motion.div
            key="exdb-modal"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{ position: 'fixed', inset: 0, background: BG_BASE, zIndex: 70, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px 0', flexShrink: 0, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <button
                  onClick={() => { setShowExDbModal(false); setExSearch(''); setExResults([]); setExDbMuscleFilter('Tous') }}
                  style={{ width: 36, height: 36, borderRadius: 10, background: BG_CARD, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <X size={16} color={TEXT_MUTED} />
                </button>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>BASE D'EXERCICES</h2>
              </div>
              {/* Search bar */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }} />
                <input
                  value={exSearch}
                  onChange={e => setExSearch(e.target.value)}
                  placeholder="Rechercher un exercice..."
                  autoFocus
                  style={{ width: '100%', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '13px 16px 13px 46px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
              {/* Filter chips */}
              <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 14 }}>
                {MUSCLE_GROUPS_FILTER.map(mg => {
                  const isActive = exDbMuscleFilter === mg
                  const color = MUSCLE_COLORS[mg] || ORANGE
                  return (
                    <button key={mg} onClick={() => setExDbMuscleFilter(mg)} style={{
                      flexShrink: 0, padding: '6px 14px', borderRadius: 20,
                      border: `1px solid ${isActive ? color : BORDER}`,
                      background: isActive ? `${color}22` : BG_CARD,
                      color: isActive ? color : TEXT_MUTED,
                      fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 180ms',
                      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em',
                    }}>
                      {mg}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Exercise grid */}
            {(() => {
              let list = exSearch.length >= 2 ? exResults : exDbAllResults
              if (exDbMuscleFilter !== 'Tous') list = list.filter((ex: any) => ex.muscle_group === exDbMuscleFilter)
              return (
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px' }}>
                  {list.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0' }}>
                      <Dumbbell size={36} color={TEXT_MUTED} strokeWidth={1.5} />
                      <p style={{ color: TEXT_MUTED, fontSize: '0.85rem', margin: 0 }}>
                        {exSearch.length >= 2 ? 'Aucun exercice trouvé' : exDbAllResults.length === 0 ? 'Chargement...' : 'Aucun exercice pour ce groupe'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {list.map((ex: any) => {
                        const mgColor = MUSCLE_COLORS[ex.muscle_group] || TEXT_MUTED
                        const diffColor = ex.difficulty === 'Avancé' ? '#EF4444' : ex.difficulty === 'Intermédiaire' ? '#F97316' : '#22C55E'
                        return (
                          <motion.button
                            key={ex.id}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => { setSelectedExDb(ex); setExDbAddSets('3'); setExDbAddReps(ex.reps ? String(ex.reps) : '10'); setExDbAddRest(ex.rest ? String(ex.rest) : '60') }}
                            style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '0', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                          >
                            {/* Muscle color top bar */}
                            <div style={{ height: 4, background: mgColor, width: '100%', flexShrink: 0 }} />
                            <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: TEXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.2 }}>
                                {ex.name}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {ex.muscle_group && (
                                  <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: mgColor, background: `${mgColor}20`, borderRadius: 5, padding: '2px 6px', display: 'inline-block', width: 'fit-content' }}>
                                    {ex.muscle_group}
                                  </span>
                                )}
                                {ex.equipment && (
                                  <span style={{ fontSize: '0.58rem', fontWeight: 700, color: TEXT_MUTED, background: '#252525', borderRadius: 5, padding: '2px 6px', display: 'inline-block', width: 'fit-content' }}>
                                    {ex.equipment}
                                  </span>
                                )}
                                {ex.difficulty && (
                                  <span style={{ fontSize: '0.58rem', fontWeight: 700, color: diffColor, background: `${diffColor}18`, borderRadius: 5, padding: '2px 6px', display: 'inline-block', width: 'fit-content' }}>
                                    {ex.difficulty}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════ EXERCISE DETAIL MODAL ═══════════════════ */}
      <AnimatePresence>
        {selectedExDb && (
          <motion.div
            key="exdb-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', zIndex: 80, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setSelectedExDb(null)}
          >
            <motion.div
              key="exdb-detail-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: '24px 24px 0 0', padding: '24px 20px 52px', width: '100%', maxHeight: '88vh', overflowY: 'auto' }}
            >
              {/* Detail header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  {selectedExDb.muscle_group && (
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: MUSCLE_COLORS[selectedExDb.muscle_group] || ORANGE, background: `${MUSCLE_COLORS[selectedExDb.muscle_group] || ORANGE}20`, borderRadius: 6, padding: '2px 8px', display: 'inline-block' }}>
                      {selectedExDb.muscle_group}
                    </span>
                  )}
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.04em', margin: '8px 0 0', textTransform: 'uppercase', color: TEXT_PRIMARY }}>
                    {selectedExDb.name}
                  </h3>
                </div>
                <button onClick={() => setSelectedExDb(null)} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={14} color={TEXT_MUTED} />
                </button>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                {selectedExDb.equipment && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: TEXT_MUTED, background: '#252525', borderRadius: 8, padding: '4px 10px' }}>{selectedExDb.equipment}</span>
                )}
                {selectedExDb.difficulty && (() => {
                  const dc = selectedExDb.difficulty === 'Avancé' ? '#EF4444' : selectedExDb.difficulty === 'Intermédiaire' ? '#F97316' : '#22C55E'
                  return <span style={{ fontSize: '0.7rem', fontWeight: 700, color: dc, background: `${dc}18`, borderRadius: 8, padding: '4px 10px' }}>{selectedExDb.difficulty}</span>
                })()}
              </div>

              {/* Description */}
              {selectedExDb.description && (
                <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, lineHeight: 1.65, marginBottom: 20 }}>{selectedExDb.description}</p>
              )}

              {/* Video link */}
              {selectedExDb.video_url && (
                <a href={selectedExDb.video_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: ORANGE, fontSize: '0.82rem', fontWeight: 700, marginBottom: 22, textDecoration: 'none' }}>
                  <Play size={15} fill={ORANGE} color={ORANGE} />
                  Voir la vidéo démo
                </a>
              )}

              {/* Sets / Reps / Rest inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Séries', value: exDbAddSets, setter: setExDbAddSets },
                  { label: 'Reps', value: exDbAddReps, setter: setExDbAddReps },
                  { label: 'Repos (s)', value: exDbAddRest, setter: setExDbAddRest },
                ].map(({ label, value, setter }) => (
                  <div key={label} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.6rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <input type="number" value={value} onChange={e => setter(e.target.value)}
                      style={{ width: '100%', background: 'transparent', color: TEXT_PRIMARY, fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", outline: 'none', border: 'none' }} />
                  </div>
                ))}
              </div>

              {/* Add button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  toast.success(`${selectedExDb.name} ajouté à la séance 💪`)
                  setSelectedExDb(null)
                  setShowExDbModal(false)
                  setExSearch('')
                  setExResults([])
                  setExDbMuscleFilter('Tous')
                }}
                style={{ width: '100%', background: ORANGE, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Ajouter à la séance
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    const dayPlan = coachMealPlan[todayKey]
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
      {activeTab === 'training' && (() => {
        const todayStr = new Date().toISOString().split('T')[0]
        const trainingIsToday = trainingDay === todayKey
        const trainingDayData = coachProgram ? (coachProgram[trainingDay] ?? { repos: false, exercises: [] }) : null
        const trainingExercises: any[] = trainingDayData?.exercises || []
        const trainingTotalSets = trainingExercises.reduce((s: number, ex: any) => s + Number(ex.sets), 0)
        const trainingDoneSets = trainingExercises.reduce((s: number, ex: any) => {
          const key = `fitpro-sets-${todayStr}-${ex.name}`
          return s + (completedSets[key] || []).filter(Boolean).length
        }, 0)

        return (
          <div style={{ minHeight: '100vh' }}>

            {/* ── REST TIMER OVERLAY ── */}
            <AnimatePresence>
              {restRunning && restTimer > 0 && (
                <motion.div
                  key="rest-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(16px)', zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}
                >
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: TEXT_MUTED }}>REPOS</span>
                  {/* SVG circle countdown */}
                  {(() => {
                    const r = 70; const circ = 2 * Math.PI * r
                    const offset = circ * (1 - restTimer / Math.max(restMax, 1))
                    return (
                      <div style={{ position: 'relative', width: 180, height: 180 }}>
                        <svg width={180} height={180} viewBox="0 0 180 180">
                          <circle cx={90} cy={90} r={r} fill="none" stroke="#1A1A1A" strokeWidth={10} />
                          <circle cx={90} cy={90} r={r} fill="none" stroke={ORANGE} strokeWidth={10}
                            strokeDasharray={circ} strokeDashoffset={offset}
                            strokeLinecap="round" transform="rotate(-90 90 90)"
                            style={{ transition: 'stroke-dashoffset 1s linear' }} />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '4rem', fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1 }}>{restTimer}</span>
                          <span style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 700, marginTop: 4 }}>secondes</span>
                        </div>
                      </div>
                    )
                  })()}
                  {activeRestExName && (
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', color: TEXT_MUTED, textTransform: 'capitalize' }}>après · {activeRestExName}</span>
                  )}
                  <button
                    onClick={() => { setRestRunning(false); setRestTimer(0); setActiveRestExName(null) }}
                    style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '12px 32px', color: TEXT_MUTED, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'border-color 200ms' }}
                  >
                    Passer le repos
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── WORKOUT FINISHED CELEBRATION ── */}
            <AnimatePresence>
              {workoutFinished && (
                <motion.div
                  key="confetti-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', zIndex: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, overflow: 'hidden' }}
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <motion.div key={i}
                      initial={{ y: -40, x: (i % 2 === 0 ? 1 : -1) * (30 + (i * 17) % 180), opacity: 1, rotate: 0 }}
                      animate={{ y: 700, x: (i % 2 === 0 ? 1 : -1) * (60 + (i * 23) % 200), opacity: 0, rotate: (i % 2 === 0 ? 1 : -1) * 540 }}
                      transition={{ duration: 2.2 + (i % 4) * 0.4, delay: (i % 6) * 0.08 }}
                      style={{ position: 'absolute', top: '10%', width: 10, height: 10, borderRadius: i % 3 === 0 ? '50%' : 2, background: [ORANGE, GREEN, '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'][i % 6] }}
                    />
                  ))}
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
                    <Award size={72} color={ORANGE} strokeWidth={1.5} />
                  </motion.div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.8rem', fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', letterSpacing: '0.04em', lineHeight: 1.1 }}>SÉANCE<br />TERMINÉE</div>
                  <span style={{ fontSize: '0.9rem', color: TEXT_MUTED }}>Excellent travail !</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── HEADER ── */}
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>ENTRAÎNEMENT</h1>
                <span style={{ fontSize: '0.72rem', color: TEXT_MUTED, textTransform: 'capitalize' }}>{format(new Date(), 'EEE d MMM', { locale: fr })}</span>
              </div>
            </div>

            {!coachProgram ? (
              /* ── NO PROGRAM ── */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 20px', textAlign: 'center' }}>
                <Dumbbell size={56} color={TEXT_MUTED} strokeWidth={1.5} />
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>Programme en préparation</p>
                <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0, maxWidth: 260 }}>Ton coach prépare ton programme. Tu seras notifié dès qu'il est prêt.</p>
              </div>
            ) : (
              <>
                {/* ── WEEK DAY TABS ── */}
                <div style={{ padding: '0 20px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                    {WEEK_DAYS.map(day => {
                      const d = coachProgram[day] ?? { repos: false, exercises: [] }
                      const isActive = trainingDay === day
                      const isT = day === todayKey
                      const hasWork = !d.repos && (d.exercises?.length || 0) > 0
                      return (
                        <button key={day} onClick={() => setTrainingDay(day)} style={{
                          flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                          padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                          background: isActive ? ORANGE : BG_CARD,
                          outline: isT && !isActive ? `2px solid ${ORANGE}` : 'none',
                          transition: 'all 200ms',
                        }}>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: isActive ? '#000' : isT ? ORANGE : TEXT_MUTED, textTransform: 'capitalize' }}>
                            {day.slice(0, 3)}
                          </span>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: hasWork ? (isActive ? '#00000060' : ORANGE) : 'transparent', transition: 'background 200ms' }} />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {trainingDayData?.repos ? (
                  /* ── REST DAY ── */
                  <div style={{ padding: '0 20px' }}>
                    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}>
                      <Moon size={44} color={TEXT_MUTED} style={{ marginBottom: 16 }} />
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 6px', letterSpacing: '0.04em' }}>JOUR DE REPOS</p>
                      <p style={{ fontSize: '0.8rem', color: TEXT_MUTED, margin: '0 0 24px' }}>La récupération fait partie du progrès.</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                        {['Marche légère 20–30 min', 'Étirements statiques 15 min', 'Hydratation optimale (2L+)', 'Sommeil 7–9 heures'].map((tip, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: BG_BASE, borderRadius: 10 }}>
                            <CheckCircle2 size={16} color={GREEN} />
                            <span style={{ fontSize: '0.85rem', color: TEXT_MUTED }}>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : trainingExercises.length === 0 ? (
                  /* ── NO EXERCISES ── */
                  <div style={{ padding: '0 20px' }}>
                    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}>
                      <Dumbbell size={32} color={TEXT_MUTED} style={{ marginBottom: 12 }} />
                      <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Aucun exercice pour ce jour.</p>
                    </div>
                  </div>
                ) : (
                  /* ── EXERCISES ── */
                  <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Séance progress bar (today only) */}
                    {trainingIsToday && trainingTotalSets > 0 && (
                      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Progression séance</span>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, color: trainingDoneSets === trainingTotalSets ? GREEN : ORANGE }}>{trainingDoneSets}/{trainingTotalSets} séries</span>
                        </div>
                        <div style={{ height: 4, background: BORDER, borderRadius: 2, overflow: 'hidden' }}>
                          <motion.div
                            animate={{ width: `${trainingTotalSets > 0 ? (trainingDoneSets / trainingTotalSets) * 100 : 0}%` }}
                            style={{ height: '100%', background: trainingDoneSets === trainingTotalSets ? GREEN : ORANGE, borderRadius: 2 }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Exercise cards */}
                    {trainingExercises.map((ex: any) => {
                      const numSets = Number(ex.sets) || 3
                      const restSecs = Number(ex.rest) || 60
                      const storageKey = `fitpro-sets-${todayStr}-${ex.name}`
                      const setsArr: boolean[] = completedSets[storageKey] || Array(numSets).fill(false)
                      const doneCount = setsArr.filter(Boolean).length
                      const allDone = doneCount === numSets && numSets > 0

                      return (
                        <motion.div
                          key={ex.name}
                          layout
                          style={{
                            background: BG_CARD,
                            border: `1px solid ${allDone ? GREEN : BORDER}`,
                            borderRadius: RADIUS_CARD,
                            overflow: 'hidden',
                            transition: 'border-color 0.3s ease',
                          }}
                        >
                          {/* Card header */}
                          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${BORDER}` }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: allDone ? `${GREEN}20` : `${ORANGE}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 300ms' }}>
                              {allDone ? <Check size={20} color={GREEN} /> : <Dumbbell size={20} color={ORANGE} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1rem', color: allDone ? GREEN : TEXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'color 300ms' }}>{ex.name}</div>
                              <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                                {ex.muscle_group && (
                                  <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: MUSCLE_COLORS[ex.muscle_group] || ORANGE, background: `${MUSCLE_COLORS[ex.muscle_group] || ORANGE}20`, borderRadius: 6, padding: '2px 7px' }}>{ex.muscle_group}</span>
                                )}
                                {ex.equipment && (
                                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: TEXT_MUTED, background: '#252525', borderRadius: 6, padding: '2px 7px' }}>{ex.equipment}</span>
                                )}
                              </div>
                            </div>
                            <AnimatePresence>
                              {allDone && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  style={{ width: 26, height: 26, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                >
                                  <Check size={14} color="#000" strokeWidth={3} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Chips: sets / reps / rest */}
                          <div style={{ padding: '10px 16px', display: 'flex', gap: 8, borderBottom: `1px solid ${BORDER}` }}>
                            {[`${numSets} séries`, `${ex.reps} reps`, `${restSecs}s repos`].map(label => (
                              <span key={label} style={{ fontSize: '0.68rem', fontWeight: 700, color: ORANGE, background: `${ORANGE}18`, borderRadius: 8, padding: '4px 10px' }}>{label}</span>
                            ))}
                          </div>

                          {/* Set checkboxes + progress */}
                          <div style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                              {Array.from({ length: numSets }).map((_, si) => (
                                <motion.button
                                  key={si}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => trainingIsToday ? toggleSet(ex.name, si, numSets, restSecs) : undefined}
                                  style={{
                                    width: 46, height: 46, borderRadius: 12,
                                    border: `2px solid ${setsArr[si] ? GREEN : BORDER}`,
                                    background: setsArr[si] ? `${GREEN}20` : BG_BASE,
                                    cursor: trainingIsToday ? 'pointer' : 'default',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                                    transition: 'all 200ms', flexShrink: 0,
                                  }}
                                >
                                  {setsArr[si]
                                    ? <Check size={18} color={GREEN} strokeWidth={2.5} />
                                    : <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: TEXT_MUTED }}>{si + 1}</span>
                                  }
                                </motion.button>
                              ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                              <span style={{ fontSize: '0.62rem', color: TEXT_MUTED, fontWeight: 700 }}>{doneCount}/{numSets} séries</span>
                              {allDone && <span style={{ fontSize: '0.62rem', color: GREEN, fontWeight: 700, letterSpacing: '0.05em' }}>TERMINÉ</span>}
                            </div>
                            <div style={{ height: 3, background: BORDER, borderRadius: 2, overflow: 'hidden' }}>
                              <motion.div
                                animate={{ width: `${numSets > 0 ? (doneCount / numSets) * 100 : 0}%` }}
                                style={{ height: '100%', background: allDone ? GREEN : ORANGE, borderRadius: 2 }}
                                transition={{ duration: 0.35 }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}

                    {/* Browse exercise DB */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowExDbModal(true)}
                      style={{ width: '100%', background: BG_CARD, border: `2px dashed ${BORDER}`, borderRadius: 14, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                    >
                      <Plus size={18} color={ORANGE} />
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: ORANGE, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Parcourir les exercices</span>
                    </motion.button>

                    {/* Finish workout button */}
                    {trainingIsToday && (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={finishTrainingWorkout}
                        style={{
                          width: '100%', background: trainingDoneSets > 0 ? GREEN : BORDER,
                          color: trainingDoneSets > 0 ? '#000' : TEXT_MUTED,
                          fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none',
                          cursor: trainingDoneSets > 0 ? 'pointer' : 'not-allowed',
                          fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                          transition: 'all 300ms', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        }}
                      >
                        <Award size={18} color={trainingDoneSets > 0 ? '#000' : TEXT_MUTED} />
                        Terminer la séance
                      </motion.button>
                    )}

                    <div style={{ height: 8 }} />
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

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

              {/* Day tabs — index 0=lundi … 6=dimanche, keys match coachMealPlan[key] directly */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
                {NUTRITION_DAYS.map(({ key, label }) => {
                  const isActive = nutritionDay === key
                  const isToday = key === todayKey
                  const dayMeals: any[] = coachMealPlan[key]?.meals ?? []
                  const dayKcal = dayMeals.reduce((s: number, m: any) => s + (m.foods || []).reduce((fs: number, f: any) => fs + (f.kcal || 0), 0), 0)
                  return (
                    <button key={key} onClick={() => setNutritionDay(key)} style={{
                      flexShrink: 0, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700,
                      background: isActive ? GREEN : BG_CARD,
                      color: isActive ? '#000' : isToday ? GREEN : TEXT_MUTED,
                      outline: isToday && !isActive ? `2px solid ${GREEN}` : 'none',
                    }}>
                      {label}
                      {dayKcal > 0 && <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 700, opacity: 0.8 }}>{dayKcal}</span>}
                    </button>
                  )
                })}
              </div>

              {/* Selected day meals */}
              {(() => {
                const dayPlan = coachMealPlan[nutritionDay]
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
                const imgSrc = supabase.storage.from('progress-photos').getPublicUrl(p.photo_url).data.publicUrl
                return (
                  <div key={p.id} style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', position: 'relative' }}
                    className="photo-cell"
                  >
                    <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <button
                      onClick={() => deletePhoto(p)}
                      className="photo-delete-btn"
                      style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 200ms' }}
                    >
                      <Trash2 size={13} color="#fff" />
                    </button>
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

      {/* ═══════════════════ MESSAGES TAB ═══════════════════ */}
      {activeTab === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 72px)' }}>

          {/* Header */}
          <div style={{ background: BG_CARD, padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>MON COACH</h1>
          </div>

          {!coachId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <MessageCircle size={40} color={TEXT_MUTED} />
              <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', margin: 0 }}>Aucun coach assigné pour l'instant.</p>
            </div>
          ) : (
            <>
              {/* Message bubbles */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <p style={{ color: TEXT_MUTED, fontSize: '0.85rem' }}>Commencez la conversation avec votre coach !</p>
                  </div>
                )}
                {messages.map(msg => {
                  const isMine = msg.sender_id === session.user.id
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '75%',
                        background: isMine ? ORANGE : BG_CARD,
                        color: isMine ? '#000' : TEXT_PRIMARY,
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        padding: '10px 14px',
                        border: isMine ? 'none' : `1px solid ${BORDER}`,
                      }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.45 }}>{msg.content}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.62rem', opacity: 0.6, textAlign: isMine ? 'right' : 'left' }}>
                          {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={msgEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '12px 16px', background: BG_CARD, borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                <input
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Écrire un message…"
                  style={{ flex: 1, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '10px 16px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }}
                />
                <button
                  onClick={sendMessage}
                  style={{ width: 42, height: 42, borderRadius: '50%', background: msgInput.trim() ? ORANGE : BORDER, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 200ms' }}
                >
                  <Send size={16} color={msgInput.trim() ? '#000' : TEXT_MUTED} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      </motion.div>
      </AnimatePresence>

      {/* ═══════════════════ BOTTOM NAV ═══════════════════ */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: BG_CARD, borderTop: `1px solid ${BORDER}`, height: 72, display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 40, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {([
          { id: 'home',      icon: BarChart2,       label: 'Home'      },
          { id: 'training',  icon: Dumbbell,        label: 'Training'  },
          { id: 'nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
          { id: 'progress',  icon: TrendingUp,      label: 'Progress'  },
          { id: 'messages',  icon: MessageCircle,   label: 'Messages'  },
          { id: 'profil',    icon: User,            label: 'Profil'    },
        ] as const).map(({ id, icon: Icon, label }) => {
          const active = activeTab === id
          const badge = id === 'messages' && unreadCount > 0
          return (
            <button key={id} onClick={() => setActiveTab(id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 6px', background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative' }}>
              {active && (
                <motion.div
                  layoutId="navIndicator"
                  style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 3, background: ORANGE, borderRadius: '0 0 4px 4px' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
              <div style={{ position: 'relative' }}>
                <Icon size={20} color={active ? ORANGE : '#4B5563'} />
                {badge && (
                  <span style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, background: '#EF4444', borderRadius: 8, fontSize: '0.55rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: active ? ORANGE : '#4B5563', fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
