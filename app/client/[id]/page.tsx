'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Zap, Mail, Calendar, Scale, Target, Dumbbell,
  Flame, TrendingDown, CheckCircle, CalendarClock, Save,
  Archive, Trash2, Check, X, Plus, Minus, Moon, Utensils, Search, Pencil, Sparkles, Loader2,
  LayoutDashboard, FileText, MessageCircle, Send, CheckCheck,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */
type Profile = {
  id: string; full_name: string | null; email: string | null
  current_weight: number | null
  calorie_goal: number | null; created_at: string
  phone: string | null; birth_date: string | null; gender: string | null
  height: number | null; target_weight: number | null
  body_fat_pct: number | null; objective: string | null; status: string | null
  dietary_type: string | null; allergies: string[] | null; liked_foods: string[] | null
  activity_level: string | null; tdee: number | null; protein_goal: number | null
  carbs_goal: number | null; fat_goal: number | null
}
type WorkoutSession = {
  id: string; created_at: string; name: string | null
  completed: boolean | null; duration_minutes: number | null; notes: string | null
}
type WeightLog = { id: string; poids: number; date: string }

// Programme types
type Exercise = { name: string; sets: number; reps: number; rest: string; notes: string }
type DayData   = { repos: boolean; exercises: Exercise[] }
type WeekProgram = Record<string, DayData>

// Meal plan types
type FoodItem = { name: string; qty: string; kcal: number; prot: number; carb: number; fat: number }
type Meal      = { type: string; foods: FoodItem[] }
type DayMealData = { meals: Meal[] }
type WeekMealPlan = Record<string, DayMealData>

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
const DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
const DAY_LABELS: Record<string,string> = { lundi:'Lun', mardi:'Mar', mercredi:'Mer', jeudi:'Jeu', vendredi:'Ven', samedi:'Sam', dimanche:'Dim' }
const DAY_FULL:   Record<string,string> = { lundi:'Lundi', mardi:'Mardi', mercredi:'Mercredi', jeudi:'Jeudi', vendredi:'Vendredi', samedi:'Samedi', dimanche:'Dimanche' }
const MEAL_TYPES = ['Petit-déjeuner','Déjeuner','Dîner','Collation']
const MEAL_ICONS: Record<string,string> = { 'Petit-déjeuner':'☀️', 'Déjeuner':'🍽️', 'Dîner':'🌙', 'Collation':'🍎' }
const MACRO_COLORS = { kcal:'#F97316', prot:'#818CF8', carb:'#22C55E', fat:'#FBBF24' }
const AI_MEAL_ORDER = ['petit_dejeuner', 'dejeuner', 'collation', 'diner']
const AI_MEAL_LABELS: Record<string, string> = { petit_dejeuner: 'Petit-déjeuner', dejeuner: 'Déjeuner', collation: 'Collation', diner: 'Dîner' }

const MUSCLE_COLORS: Record<string, string> = {
  'Poitrine': '#EF4444', 'Dos': '#3B82F6', 'Épaules': '#8B5CF6',
  'Bras': '#F97316', 'Jambes': '#22C55E', 'Abdos': '#EAB308',
  'Fessiers': '#EC4899', 'Cardio': '#06B6D4',
}
const MUSCLE_FILTERS = ['Tous', 'Poitrine', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Abdos', 'Fessiers', 'Cardio']

/* ══════════════════════════════════════════════════════════════
   DEFAULTS
══════════════════════════════════════════════════════════════ */
function defaultProgram(): WeekProgram {
  return Object.fromEntries(DAYS.map(d => [d, { repos: false, exercises: [] }]))
}
function defaultMealPlan(): WeekMealPlan {
  return Object.fromEntries(DAYS.map(d => [d, { meals: MEAL_TYPES.map(type => ({ type, foods: [] })) }]))
}
function defaultFood(): FoodItem {
  return { name: '', qty: '', kcal: 0, prot: 0, carb: 0, fat: 0 }
}
function currentMonday(): string {
  const d = new Date()
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay()
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
}
function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { month:'short', year:'numeric' })
}
function dayMacros(day: DayMealData) {
  let kcal=0, prot=0, carb=0, fat=0
  day.meals.forEach(m => m.foods.forEach(f => { kcal+=f.kcal; prot+=f.prot; carb+=f.carb; fat+=f.fat }))
  return { kcal, prot, carb, fat }
}
function pct(val: number, target: number) { return Math.min(100, target > 0 ? Math.round((val/target)*100) : 0) }

/* ══════════════════════════════════════════════════════════════
   STYLE CONSTANTS
══════════════════════════════════════════════════════════════ */
const inputStyle: React.CSSProperties = {
  width:'100%', background:'#111827', border:'1px solid #374151', borderRadius:8,
  padding:'11px 14px', fontFamily:'Barlow, sans-serif', fontSize:'0.9rem',
  color:'#F8FAFC', outline:'none', transition:'border-color 200ms ease',
}
const smallInput: React.CSSProperties = {
  background:'#111827', border:'1px solid #2D3748', borderRadius:6,
  padding:'6px 8px', fontFamily:'Barlow, sans-serif', fontSize:'0.82rem',
  color:'#F8FAFC', outline:'none', width:'100%',
}
const numInput: React.CSSProperties = { ...smallInput, textAlign:'center' }
const targetInput: React.CSSProperties = {
  background:'#111827', border:'1px solid #374151', borderRadius:8,
  padding:'8px 10px', fontFamily:"'Barlow Condensed', sans-serif",
  fontSize:'1.1rem', fontWeight:700, color:'#F8FAFC', outline:'none',
  width:'100%', textAlign:'center',
}

/* ── EditField helper ──────────────────────────────────────── */
function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{display:'block',fontSize:'0.75rem',fontWeight:700,color:'#9CA3AF',marginBottom:6,letterSpacing:'0.06em',textTransform:'uppercase',fontFamily:"'Barlow Condensed',sans-serif"}}>{label}</label>
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  // Core
  const [profile,     setProfile]     = useState<Profile | null>(null)
  const [sessions,    setSessions]    = useState<WorkoutSession[]>([])
  const [weightLogs,  setWeightLogs]  = useState<WeightLog[]>([])
  const [notes,       setNotes]       = useState('')
  const [notesSaved,  setNotesSaved]  = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const [coachId,     setCoachId]     = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [toast,       setToast]       = useState<string | null>(null)
  const [editOpen,    setEditOpen]    = useState(false)
  const [editTab,     setEditTab]     = useState<'info'|'metrics'|'status'>('info')
  const [editName,    setEditName]    = useState('')
  const [editEmail,   setEditEmail]   = useState('')
  const [editPhone,   setEditPhone]   = useState('')
  const [editBirth,   setEditBirth]   = useState('')
  const [editGender,  setEditGender]  = useState('')
  const [editWeight,  setEditWeight]  = useState('')
  const [editHeight,  setEditHeight]  = useState('')
  const [editTargetW, setEditTargetW] = useState('')
  const [editBodyFat, setEditBodyFat] = useState('')
  const [editStatus,  setEditStatus]  = useState('active')
  const [editObj,     setEditObj]     = useState('')
  const [editingCalGoal, setEditingCalGoal] = useState(false)
  const [calGoalInput,   setCalGoalInput]   = useState('')
  const [totalSessionsCount, setTotalSessionsCount] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Programme
  const [program,      setProgram]      = useState<WeekProgram>(defaultProgram())
  const [programId,    setProgramId]    = useState<string | null>(null)
  const [programSaving,setProgramSaving]= useState(false)
  const [programSaved, setProgramSaved] = useState(false)
  const [expandedDay,  setExpandedDay]  = useState<string | null>('lundi')

  // Meal plan
  const [mealPlan,       setMealPlan]       = useState<WeekMealPlan>(defaultMealPlan())
  const [mealPlanId,     setMealPlanId]     = useState<string | null>(null)
  const [calorieTarget,  setCalorieTarget]  = useState(2000)
  const [protTarget,     setProtTarget]     = useState(150)
  const [carbTarget,     setCarbTarget]     = useState(200)
  const [fatTarget,      setFatTarget]      = useState(70)
  const [mealPlanSaving, setMealPlanSaving] = useState(false)
  const [mealPlanSaved,  setMealPlanSaved]  = useState(false)
  const [expandedMealDay,setExpandedMealDay]= useState<string | null>('lundi')

  // Exercise DB search modal
  const [showExDbModal,  setShowExDbModal]  = useState(false)
  const [exDbTargetDay,  setExDbTargetDay]  = useState<string | null>(null)
  const [exDbSearch,     setExDbSearch]     = useState('')
  const [exDbResults,    setExDbResults]    = useState<any[]>([])
  const [exDbAll,        setExDbAll]        = useState<any[]>([])
  const [exDbFilter,     setExDbFilter]     = useState('Tous')
  const exDbRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // AI Program Generator
  const [showAiModal,    setShowAiModal]    = useState(false)
  const [aiLevel,        setAiLevel]        = useState('Intermédiaire')
  const [aiEquipment,    setAiEquipment]    = useState<string[]>(['Poids du corps'])
  const [aiTrainingDays, setAiTrainingDays] = useState(4)
  const [aiGenerating,   setAiGenerating]   = useState(false)
  const [aiPreview,      setAiPreview]      = useState<WeekProgram | null>(null)
  const [activeTab,      setActiveTab]      = useState<'apercu'|'programme'|'nutrition'|'notes'|'messages'>('apercu')

  // Coach messaging
  const [coachMessages, setCoachMessages] = useState<any[]>([])
  const [coachMsgInput, setCoachMsgInput] = useState('')
  const coachMsgEndRef = useRef<HTMLDivElement>(null)

  // AI Meal Plan Generator
  const [aiMealGenerating, setAiMealGenerating] = useState(false)
  const [aiMealStreamStatus, setAiMealStreamStatus] = useState('')
  const [aiMealPreview, setAiMealPreview] = useState<any>(null)
  const [aiMealPreviewDay, setAiMealPreviewDay] = useState('lundi')
  const [clientActivePlan, setClientActivePlan] = useState<any>(null)
  const [clientActivePlanDay, setClientActivePlanDay] = useState('lundi')
  const [weeklyTracking, setWeeklyTracking] = useState<Record<string, Set<string>>>({})
  const [resolvedFoods, setResolvedFoods] = useState<{ id: string; name: string; emoji: string | null }[]>([])
  const [showAllFoods, setShowAllFoods] = useState(false)

  const AI_EQUIPMENT = ['Haltères', 'Barre', 'Machine', 'Poulie', 'Poids du corps', 'Banc']
  const AI_LEVELS    = ['Débutant', 'Intermédiaire', 'Avancé']

  const toggleAiEquipment = (item: string) => {
    setAiEquipment(prev => prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item])
  }

  const generateAiProgram = async () => {
    setAiGenerating(true)
    setAiPreview(null)
    try {
      const objective = profile?.objective || 'Amélioration de la condition physique'
      const weight = profile?.current_weight ?? '?'
      const targetWeight = profile?.target_weight ?? '?'
      const equipment = aiEquipment.length > 0 ? aiEquipment : ['Poids du corps']

      const res = await fetch('/api/generate-program', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          objective,
          weight,
          targetWeight,
          level: aiLevel,
          equipment,
          trainingDays: aiTrainingDays,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Erreur génération programme (${res.status}): ${err}`)
      }

      const { program: aiProgram } = await res.json()

      const mapped: WeekProgram = {}
      DAYS.forEach(d => {
        const aiDay = aiProgram[d]
        mapped[d] = {
          repos: aiDay?.isRest ?? true,
          exercises: (aiDay?.exercises ?? []).map((ex: any) => ({
            name:  ex.name  ?? '',
            sets:  ex.sets  ?? 3,
            reps:  ex.reps  ?? 10,
            rest:  ex.rest  ?? '60s',
            notes: ex.notes ?? '',
          })),
        }
      })
      setAiPreview(mapped)
    } catch {
      showToast('Erreur lors de la génération IA')
    } finally {
      setAiGenerating(false)
    }
  }

  const acceptAiPreview = () => {
    if (!aiPreview) return
    setProgram(aiPreview)
    setAiPreview(null)
    setShowAiModal(false)
    showToast('Programme IA appliqué — vérifiez et sauvegardez')
  }

  /* ── AI Meal Plan Generator ───────────────────────────────── */
  const generateAiMealPlan = async () => {
    if (!profile) return
    setAiMealGenerating(true)
    setAiMealPreview(null)
    setAiMealStreamStatus('Préparation...')
    try {
      // Fetch liked food names
      let likedFoodNames: string[] = []
      if (profile.liked_foods?.length) {
        const { data: foodRows } = await supabase
          .from('fitness_foods')
          .select('name')
          .in('id', profile.liked_foods)
        likedFoodNames = (foodRows || []).map((f: any) => f.name)
      }

      setAiMealStreamStatus('Connexion à l\'IA...')
      const res = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          calorie_goal: profile.calorie_goal || profile.tdee || calorieTarget,
          protein_goal: profile.protein_goal || protTarget,
          carbs_goal: profile.carbs_goal || carbTarget,
          fat_goal: profile.fat_goal || fatTarget,
          dietary_type: profile.dietary_type,
          allergies: profile.allergies,
          liked_foods_names: likedFoodNames,
          objective: profile.objective,
        }),
      })

      if (!res.ok) throw new Error(`Erreur ${res.status}`)

      // Read SSE progress events (day-by-day generation)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let plan: any = null
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // keep incomplete last line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'progress') {
              setAiMealStreamStatus(`Génération jour ${evt.index}/7 — ${evt.day}...`)
            } else if (evt.type === 'done') {
              plan = evt.plan
            }
          } catch { /* skip malformed lines */ }
        }
      }

      if (!plan) throw new Error('Aucun plan reçu')

      // Ensure all 7 days
      for (const d of DAYS) {
        if (!plan[d]) plan[d] = { total_kcal: 0, total_protein: 0, total_carbs: 0, total_fat: 0, repas: {} }
      }

      setAiMealPreview(plan)
      setAiMealPreviewDay('lundi')
    } catch {
      showToast('Erreur lors de la génération du plan alimentaire')
    } finally {
      setAiMealGenerating(false)
      setAiMealStreamStatus('')
    }
  }

  const acceptAiMealPlan = async () => {
    if (!aiMealPreview || !profile) return
    const planData = aiMealPreview
    const lundi = planData.lundi || {}

    const { error } = await supabase.from('meal_plans').insert({
      user_id: profile.id,
      created_by: coachId,
      total_calories: lundi.total_kcal || calorieTarget,
      protein_g: lundi.total_protein || protTarget,
      carbs_g: lundi.total_carbs || carbTarget,
      fat_g: lundi.total_fat || fatTarget,
      objective: profile.objective,
      plan_data: planData,
      is_active: true,
    })

    if (error) {
      showToast(`Erreur : ${error.message}`)
    } else {
      setAiMealPreview(null)
      showToast('Plan alimentaire IA envoyé au client')
      fetchData()
    }
  }

  /* ── Toast ──────────────────────────────────────────────────── */
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  /* ── Auth ───────────────────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      setCoachId(session.user.id)
    })
  }, [router])

  /* ── Fetch all data ─────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!coachId) return
    setLoading(true); setError(null)

    const [profileRes, sessionsRes, sessionsCountRes, weightRes, notesRes, programRes, mealPlanRes, activePlanRes] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,current_weight,calorie_goal,created_at,phone,birth_date,gender,height,target_weight,body_fat_pct,objective,status,dietary_type,allergies,liked_foods,activity_level,tdee,protein_goal,carbs_goal,fat_goal').eq('id', id).single(),
      supabase.from('workout_sessions').select('id,created_at,name,completed,duration_minutes,notes').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('workout_sessions').select('*', { count: 'exact', head: true }).eq('user_id', id),
      supabase.from('weight_logs').select('id,poids,date').eq('user_id', id).order('date', { ascending: false }).limit(1),
      supabase.from('coach_notes').select('content').eq('coach_id', coachId).eq('client_id', id).maybeSingle(),
      supabase.from('client_programs').select('id,program').eq('coach_id', coachId).eq('client_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('client_meal_plans').select('id,calorie_target,protein_target,carb_target,fat_target,plan').eq('coach_id', coachId).eq('client_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('meal_plans').select('*').eq('user_id', id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (profileRes.error) { setError(profileRes.error.message); setLoading(false); return }
    const p = profileRes.data as Profile
    setProfile(p)
    // Resolve liked_foods UUIDs to names
    if (p.liked_foods?.length) {
      supabase.from('fitness_foods').select('id,name,emoji').in('id', p.liked_foods)
        .then(({ data: foods }: any) => { if (foods) setResolvedFoods(foods) })
    }
    setEditName(p.full_name ?? '')
    setEditEmail(p.email ?? '')
    setEditPhone(p.phone ?? '')
    setEditBirth(p.birth_date ?? '')
    setEditGender(p.gender ?? '')
    const latestW = (weightRes.data as WeightLog[] | null)?.[0]
    setEditWeight(latestW != null ? String(latestW.poids) : (p.current_weight != null ? String(p.current_weight) : ''))
    setEditHeight(p.height != null ? String(p.height) : '')
    setEditTargetW(p.target_weight != null ? String(p.target_weight) : '')
    setEditBodyFat(p.body_fat_pct != null ? String(p.body_fat_pct) : '')
    setEditStatus(p.status ?? 'active')
    setEditObj(p.objective ?? '')
    setCalGoalInput(p.calorie_goal != null ? String(p.calorie_goal) : '')
    setSessions((sessionsRes.data ?? []) as WorkoutSession[])
    setTotalSessionsCount(sessionsCountRes.count ?? 0)
    setWeightLogs((weightRes.data ?? []) as WeightLog[])
    setNotes(notesRes.data?.content ?? '')

    if (programRes.data) {
      setProgramId(programRes.data.id)
      setProgram({ ...defaultProgram(), ...(programRes.data.program as WeekProgram) })
    }
    if (mealPlanRes.data) {
      const mp = mealPlanRes.data
      setMealPlanId(mp.id)
      setCalorieTarget(mp.calorie_target ?? 2000)
      setProtTarget(mp.protein_target ?? 150)
      setCarbTarget(mp.carb_target ?? 200)
      setFatTarget(mp.fat_target ?? 70)
      const merged = defaultMealPlan()
      const saved = mp.plan as WeekMealPlan
      DAYS.forEach(d => {
        if (saved[d]) {
          merged[d] = {
            meals: MEAL_TYPES.map(type => {
              const existing = saved[d].meals?.find(m => m.type === type)
              return existing ?? { type, foods: [] }
            }),
          }
        }
      })
      setMealPlan(merged)
    }
    if (activePlanRes.data) {
      setClientActivePlan(activePlanRes.data)
    }
    await fetchWeeklyTracking()
    setLoading(false)
  }, [coachId, id])

  const fetchWeeklyTracking = useCallback(async () => {
    const d = new Date(); const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    const mondayDate = d.toISOString().split('T')[0]
    const { data: trackingData } = await supabase
      .from('meal_tracking')
      .select('date,meal_type,is_completed')
      .eq('user_id', id)
      .gte('date', mondayDate)
      .eq('is_completed', true)
    if (trackingData) {
      const map: Record<string, Set<string>> = {}
      for (const r of trackingData) {
        if (!map[r.date]) map[r.date] = new Set()
        map[r.date].add(r.meal_type)
      }
      setWeeklyTracking(map)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  // Poll weekly tracking every 30s for real-time coach view
  useEffect(() => {
    const interval = setInterval(fetchWeeklyTracking, 30000)
    return () => clearInterval(interval)
  }, [fetchWeeklyTracking])

  // Coach messaging functions
  const loadCoachMessages = useCallback(async () => {
    if (!coachId || !id) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${coachId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${coachId})`)
      .order('created_at', { ascending: true })
    setCoachMessages(data || [])
  }, [coachId, id])

  useEffect(() => {
    if (activeTab === 'messages') {
      loadCoachMessages()
      // Mark messages from client as read
      supabase.from('messages').update({ read: true }).eq('sender_id', id).eq('receiver_id', coachId).eq('read', false)
    }
  }, [activeTab, loadCoachMessages])

  const coachMsgPrevLen = useRef(0)
  useEffect(() => {
    if (activeTab !== 'messages' || coachMessages.length === 0) return
    const isInitial = coachMsgPrevLen.current === 0
    coachMsgPrevLen.current = coachMessages.length
    const timer = setTimeout(() => {
      coachMsgEndRef.current?.scrollIntoView({ behavior: isInitial ? 'instant' as ScrollBehavior : 'smooth' })
    }, 0)
    return () => clearTimeout(timer)
  }, [coachMessages.length, activeTab])

  // Realtime for coach
  useEffect(() => {
    if (!coachId || !id) return
    const channel = supabase
      .channel(`coach-msg-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${coachId}` }, (payload: any) => {
        if (payload.new.sender_id === id) {
          setCoachMessages(prev => [...prev, payload.new])
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coachId, id])

  async function sendCoachMessage() {
    if (!coachMsgInput.trim() || !coachId || !id) return
    const content = coachMsgInput.trim()
    setCoachMsgInput('')
    const optimistic = { id: `opt-${Date.now()}`, sender_id: coachId, receiver_id: id, content, read: false, created_at: new Date().toISOString() }
    setCoachMessages(prev => [...prev, optimistic])
    await supabase.from('messages').insert({ sender_id: coachId, receiver_id: id, content })
    loadCoachMessages()
  }

  /* ── Exercise DB modal: load all on open ────────────────────── */
  useEffect(() => {
    if (!showExDbModal || exDbAll.length > 0) return
    supabase.from('exercises_db').select('*').order('name').limit(200).then(({ data }) => setExDbAll(data || []))
  }, [showExDbModal])

  /* ── Exercise DB modal: debounced search ────────────────────── */
  useEffect(() => {
    if (exDbRef.current) clearTimeout(exDbRef.current)
    if (exDbSearch.length < 2) { setExDbResults([]); return }
    exDbRef.current = setTimeout(async () => {
      const { data } = await supabase.from('exercises_db').select('*').ilike('name', `%${exDbSearch}%`).limit(30)
      setExDbResults(data || [])
    }, 280)
  }, [exDbSearch])

  /* ── Save notes ─────────────────────────────────────────────── */
  const saveNotes = async () => {
    if (!coachId) return
    setNotesSaving(true)
    await supabase.from('coach_notes').upsert(
      { coach_id: coachId, client_id: id, content: notes, updated_at: new Date().toISOString() },
      { onConflict: 'coach_id,client_id' }
    )
    setNotesSaving(false); setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }
  const onNotesChange = (val: string) => {
    setNotes(val); setNotesSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNotes(), 3000)
  }

  /* ── Save programme ─────────────────────────────────────────── */
  const saveProgram = async () => {
    if (!coachId) return
    setProgramSaving(true)
    if (programId) {
      await supabase.from('client_programs').update({ program, updated_at: new Date().toISOString() }).eq('id', programId)
    } else {
      const { data } = await supabase.from('client_programs').insert({ coach_id: coachId, client_id: id, week_start: currentMonday(), program }).select('id').single()
      if (data?.id) setProgramId(data.id)
    }
    setProgramSaving(false); setProgramSaved(true)
    showToast('Programme sauvegardé')
    setTimeout(() => setProgramSaved(false), 2000)
  }

  /* ── Programme helpers ──────────────────────────────────────── */
  const toggleRepos  = (day: string) => setProgram(p => ({ ...p, [day]: { ...p[day], repos: !p[day].repos, exercises: [] } }))
  const addExercise  = (day: string) => setProgram(p => ({ ...p, [day]: { ...p[day], exercises: [...p[day].exercises, { name:'', sets:3, reps:10, rest:'60s', notes:'' }] } }))
  const removeExercise = (day: string, i: number) => setProgram(p => ({ ...p, [day]: { ...p[day], exercises: p[day].exercises.filter((_,j) => j !== i) } }))

  const openExDbModal = (day: string) => {
    setExDbTargetDay(day); setExDbSearch(''); setExDbResults([]); setExDbFilter('Tous'); setShowExDbModal(true)
  }
  const selectExercise = (ex: any) => {
    if (!exDbTargetDay) return
    setProgram(p => ({ ...p, [exDbTargetDay]: { ...p[exDbTargetDay], exercises: [...p[exDbTargetDay].exercises, { name: ex.name, sets: 3, reps: ex.reps ?? 10, rest: ex.rest ? `${ex.rest}s` : '60s', notes: '' }] } }))
    setShowExDbModal(false); setExDbSearch(''); setExDbResults([]); setExDbFilter('Tous')
  }
  const updateExercise = (day: string, i: number, field: keyof Exercise, val: string|number) =>
    setProgram(p => { const ex=[...p[day].exercises]; ex[i]={...ex[i],[field]:val}; return {...p,[day]:{...p[day],exercises:ex}} })

  /* ── Save meal plan ─────────────────────────────────────────── */
  const saveMealPlan = async () => {
    if (!coachId) return
    setMealPlanSaving(true)
    const payload = { coach_id: coachId, client_id: id, week_start: currentMonday(), calorie_target: calorieTarget, protein_target: protTarget, carb_target: carbTarget, fat_target: fatTarget, plan: mealPlan, updated_at: new Date().toISOString() }
    await Promise.all([
      mealPlanId
        ? supabase.from('client_meal_plans').update(payload).eq('id', mealPlanId)
        : supabase.from('client_meal_plans').insert(payload).select('id').single().then(({ data }) => { if (data?.id) setMealPlanId(data.id) }),
      supabase.from('profiles').update({ calorie_goal: calorieTarget }).eq('id', id),
    ])
    setProfile(p => p ? { ...p, calorie_goal: calorieTarget } : p)
    setMealPlanSaving(false); setMealPlanSaved(true)
    showToast('Plan alimentaire sauvegardé')
    setTimeout(() => setMealPlanSaved(false), 2000)
  }

  /* ── Meal plan helpers ──────────────────────────────────────── */
  const addFood = (day: string, mealIdx: number) =>
    setMealPlan(p => { const meals=[...p[day].meals]; meals[mealIdx]={...meals[mealIdx],foods:[...meals[mealIdx].foods,defaultFood()]}; return {...p,[day]:{meals}} })
  const removeFood = (day: string, mealIdx: number, foodIdx: number) =>
    setMealPlan(p => { const meals=[...p[day].meals]; meals[mealIdx]={...meals[mealIdx],foods:meals[mealIdx].foods.filter((_,j)=>j!==foodIdx)}; return {...p,[day]:{meals}} })
  const updateFood = (day: string, mealIdx: number, foodIdx: number, field: keyof FoodItem, val: string|number) =>
    setMealPlan(p => { const meals=[...p[day].meals]; const foods=[...meals[mealIdx].foods]; foods[foodIdx]={...foods[foodIdx],[field]:val}; meals[mealIdx]={...meals[mealIdx],foods}; return {...p,[day]:{meals}} })

  /* ── Edit profile save ──────────────────────────────────────── */
  const saveEdit = async () => {
    // Only valid profiles columns — email excluded (auth-managed)
    const updates: Record<string, unknown> = {
      full_name:      editName || null,
      phone:          editPhone || null,
      birth_date:     editBirth || null,
      gender:         editGender || null,
      current_weight: editWeight  ? parseFloat(editWeight)  : null,
      height:         editHeight  ? parseFloat(editHeight)  : null,
      target_weight:  editTargetW ? parseFloat(editTargetW) : null,
      body_fat_pct:   editBodyFat ? parseFloat(editBodyFat) : null,
      status:         editStatus,
      objective:      editObj || null,
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', id)
    if (error) {
      console.error('[saveProfile] Supabase error:', error)
      showToast(`Erreur : ${error.message}`)
      return
    }
    // Also log weight change into weight_logs for consistency
    if (editWeight) {
      const newWeight = parseFloat(editWeight)
      if (!isNaN(newWeight) && newWeight !== weightLogs[0]?.poids) {
        await supabase.from('weight_logs').insert({ user_id: id, poids: newWeight, date: new Date().toISOString().split('T')[0] })
        setWeightLogs([{ id: 'local', poids: newWeight, date: new Date().toISOString().split('T')[0] }])
      }
    }
    setProfile(p => p ? { ...p, ...updates } : p)
    setEditOpen(false)
    showToast('Profil mis à jour')
  }

  /* ── Save calorie goal ──────────────────────────────────────── */
  async function saveCalorieGoal() {
    const val = parseInt(calGoalInput)
    if (!val || val <= 0) return
    const { error } = await supabase.from('profiles').update({ calorie_goal: val }).eq('id', id)
    if (error) { console.error('[saveCalorieGoal] Supabase error:', error); showToast(`Erreur : ${error.message}`); return }
    setProfile(p => p ? { ...p, calorie_goal: val } : p)
    setEditingCalGoal(false)
    showToast('Objectif calorique mis à jour')
  }

  /* ── Derived metrics ────────────────────────────────────────── */
  const currentWeight   = weightLogs[0]?.poids ?? profile?.current_weight ?? null
  const prevMonthWeight = weightLogs.find(w => { const d=new Date(w.date),n=new Date(); return d.getMonth()!==n.getMonth()||d.getFullYear()!==n.getFullYear() })?.poids ?? null
  const weightDelta     = currentWeight && prevMonthWeight ? currentWeight - prevMonthWeight : null
  const totalSessions   = totalSessionsCount
  const goalProgress = (() => {
    if (!currentWeight || !profile?.target_weight) return null
    const start=profile.current_weight ?? currentWeight, target=profile.target_weight
    if (start===target) return 100
    return Math.max(0, Math.min(100, Math.round(((start-currentWeight)/(start-target))*100)))
  })()
  const streak = (() => {
    if (!sessions.length) return 0
    const dates=[...new Set(sessions.map(s=>s.created_at.split('T')[0]))].sort((a,b)=>b.localeCompare(a))
    let count=0; let cursor=new Date(); cursor.setHours(0,0,0,0)
    for (const d of dates) {
      const sd=new Date(d); sd.setHours(0,0,0,0)
      if (Math.round((cursor.getTime()-sd.getTime())/86400000)<=1) { count++; cursor=sd } else break
    }
    return count
  })()

  /* ── Loading / error ────────────────────────────────────────── */
  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0A0A0A',padding:'20px 16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <div className="skeleton" style={{width:60,height:60,borderRadius:'50%'}} />
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
          <div className="skeleton" style={{height:16,width:'60%'}} />
          <div className="skeleton" style={{height:12,width:'40%'}} />
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{height:80,borderRadius:14}} />)}
      </div>
    </div>
  )
  if (error || !profile) return (
    <div style={{minHeight:'100vh',background:'#0A0A0A',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <p style={{color:'#EF4444',fontSize:'0.9rem'}}>{error ?? 'Client introuvable'}</p>
      <button onClick={()=>router.back()} style={{color:'#F97316',background:'none',border:'1px solid #F97316',borderRadius:8,padding:'8px 18px',cursor:'pointer',fontFamily:'Barlow Condensed,sans-serif',fontWeight:600}}>← Retour</button>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════
     RENDER — MOBILE-FIRST
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        body{margin:0;font-family:'Barlow',sans-serif;background:#0A0A0A;color:#F8FAFC;overscroll-behavior-y:none;overflow-x:hidden;max-width:100vw;}
        h1,h2,h3,h4{font-family:'Barlow Condensed',sans-serif;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .card{background:#141414;border:1px solid #242424;border-radius:16px;padding:16px;}
        .metric-card{background:#141414;border:1px solid #242424;border-radius:14px;padding:14px;}
        .section-title{font-family:'Barlow Condensed',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:12px;}
        .btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#F97316;color:#fff;padding:12px 20px;border-radius:10px;font-family:'Barlow Condensed',sans-serif;font-size:.95rem;font-weight:700;letter-spacing:.04em;border:none;cursor:pointer;transition:opacity 200ms,transform 150ms;min-height:44px;}
        .btn-primary:active{transform:scale(0.97);opacity:.9;}
        .btn-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:transparent;color:#F97316;border:1.5px solid #F97316;padding:10px 16px;border-radius:10px;font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:700;letter-spacing:.04em;cursor:pointer;transition:background 200ms,color 200ms;min-height:44px;}
        .btn-secondary:active{background:#F97316;color:#fff;}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#9CA3AF;border:none;padding:10px 12px;border-radius:8px;font-family:'Barlow',sans-serif;font-size:.875rem;font-weight:500;cursor:pointer;transition:background 150ms,color 150ms;min-height:44px;}
        .btn-ghost:active{background:#242424;color:#F8FAFC;}
        .badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-family:'Barlow Condensed',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}
        .badge-active{background:rgba(34,197,94,.12);color:#22C55E;border:1px solid rgba(34,197,94,.2);}
        .badge-warning{background:rgba(249,115,22,.12);color:#F97316;border:1px solid rgba(249,115,22,.2);}
        .badge-inactive{background:rgba(156,163,175,.08);color:#9CA3AF;border:1px solid rgba(156,163,175,.12);}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;pointer-events:none;transition:opacity 200ms ease;}
        .modal-overlay.open{opacity:1;pointer-events:all;}
        .modal{background:#111111;border:1px solid #242424;border-radius:20px;max-width:480px;width:92%;transform:translateY(12px);transition:transform 200ms ease;overflow:hidden;}
        .modal-overlay.open .modal{transform:translateY(0);}
        .toast-el{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1A1A1A;border:1px solid #242424;border-left:3px solid #22C55E;color:#F8FAFC;padding:11px 16px;border-radius:10px;font-size:.85rem;font-weight:500;display:flex;align-items:center;gap:8px;z-index:300;animation:slideUp 200ms ease;box-shadow:0 8px 32px rgba(0,0,0,.5);white-space:nowrap;}
        .col-hdr{font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;margin-bottom:3px;}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#0F0F0F;border-top:1px solid #1E1E1E;z-index:50;padding-bottom:env(safe-area-inset-bottom,0px);}
        .nav-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px 4px;border:none;background:transparent;cursor:pointer;transition:color 150ms;min-height:52px;}
        .day-chip{flex-shrink:0;display:inline-flex;align-items:center;padding:8px 14px;border-radius:10px;border:none;cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.82rem;font-weight:700;letter-spacing:.05em;transition:all 150ms ease;min-height:44px;}
        .ex-row-m{display:flex;flex-direction:column;gap:7px;padding:12px 0;border-bottom:1px solid #1E1E1E;}
        .ex-row-m:last-child{border-bottom:none;}
        .food-row-m{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-bottom:1px solid #1a1f2e;}
        .food-row-m:last-child{border-bottom:none;}
        input[type=number]::-webkit-inner-spin-button{opacity:.4;}
        input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:999px;background:#242424;outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#A855F7;cursor:pointer;border:2px solid #0A0A0A;box-shadow:0 2px 8px rgba(168,85,247,.4);}
        ::-webkit-scrollbar{display:none;}
      `}</style>

      {/* ── MOBILE HEADER ─────────────────────────────────────────── */}
      <header style={{background:'#0F0F0F',borderBottom:'1px solid #1E1E1E',position:'sticky',top:0,zIndex:40,height:52,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px'}}>
        <button onClick={()=>router.push('/coach')} style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:10,background:'#1A1A1A',border:'1px solid #242424',cursor:'pointer',color:'#9CA3AF',flexShrink:0}} aria-label="Retour">
          <ArrowLeft size={16} strokeWidth={2.5}/>
        </button>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:22,height:22,background:'#F97316',borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Zap size={12} color="#fff" strokeWidth={2.5}/>
          </div>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:700,color:'#F8FAFC',letterSpacing:'0.08em'}}>FITPRO</span>
        </div>
        <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#F97316,#FB923C)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'0.72rem',color:'#fff',flexShrink:0}}>
          {initials(profile.full_name)}
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <main style={{padding:'14px 14px 80px',maxWidth:600,margin:'0 auto'}}>

        {/* ══ TAB: APERÇU ══ */}
        {activeTab === 'apercu' && (
          <div style={{animation:'fadeIn 200ms ease',display:'flex',flexDirection:'column',gap:12}}>

            {/* Profile hero */}
            <div className="card" style={{position:'relative',overflow:'hidden',padding:'16px 16px 14px'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#F97316,#FB923C)'}}/>
              <div style={{display:'flex',alignItems:'center',gap:12,marginTop:4}}>
                <div style={{position:'relative',flexShrink:0}}>
                  <div style={{width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg,#F97316,#FB923C)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.3rem',fontWeight:700,color:'#fff',border:'3px solid #141414',boxShadow:'0 0 0 2px #F97316'}}>
                    {initials(profile.full_name)}
                  </div>
                  <div style={{position:'absolute',bottom:2,right:2,width:12,height:12,background:'#22C55E',borderRadius:'50%',border:'2px solid #141414'}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
                    <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.35rem',fontWeight:700,color:'#F8FAFC',margin:0,lineHeight:1}}>{profile.full_name ?? 'Client'}</h1>
                    {(() => {
                      const s = profile.status ?? 'active'
                      const cfg = s==='warning' ? {cls:'badge-warning',label:'À relancer'} : s==='inactive' ? {cls:'badge-inactive',label:'Inactif'} : {cls:'badge-active',label:'Actif'}
                      return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                    })()}
                  </div>
                  {profile.objective && (() => {
                    const labels: Record<string,string> = {perte_poids:'Perte de poids',prise_masse:'Prise de masse',maintien:'Maintien',performance:'Performance'}
                    return <span style={{fontSize:'0.75rem',color:'#6B7280'}}>{labels[profile.objective] ?? profile.objective}</span>
                  })()}
                </div>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'3px 14px',marginTop:10,paddingTop:10,borderTop:'1px solid #1E1E1E'}}>
                {profile.email && <span style={{fontSize:'0.75rem',color:'#6B7280',display:'flex',alignItems:'center',gap:4}}><Mail size={12} strokeWidth={2}/>{profile.email}</span>}
                <span style={{fontSize:'0.75rem',color:'#6B7280',display:'flex',alignItems:'center',gap:4}}><Calendar size={12} strokeWidth={2}/>Depuis {formatMonthYear(profile.created_at)}</span>
              </div>
              {/* Nutrition preferences badges */}
              {(profile.dietary_type || profile.allergies?.length || profile.liked_foods?.length) && (
                <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #1E1E1E',display:'flex',flexWrap:'wrap',gap:6}}>
                  {profile.dietary_type && (
                    <span style={{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:999,fontSize:'0.68rem',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',fontFamily:"'Barlow Condensed',sans-serif",background:'rgba(34,197,94,0.12)',color:'#22C55E',border:'1px solid rgba(34,197,94,0.2)'}}>
                      {profile.dietary_type === 'omnivore' ? '🥩 Omnivore' : profile.dietary_type === 'vegetarian' ? '🥗 Végétarien' : '🌱 Vegan'}
                    </span>
                  )}
                  {(profile.allergies || []).map((a: string) => (
                    <span key={a} style={{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:999,fontSize:'0.68rem',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',fontFamily:"'Barlow Condensed',sans-serif",background:'rgba(239,68,68,0.12)',color:'#EF4444',border:'1px solid rgba(239,68,68,0.2)'}}>
                      {a}
                    </span>
                  ))}
                  {(showAllFoods ? resolvedFoods : resolvedFoods.slice(0, 10)).map(f => (
                    <span key={f.id} style={{display:'inline-flex',alignItems:'center',gap:2,padding:'3px 9px',borderRadius:999,fontSize:'0.68rem',fontWeight:700,letterSpacing:'0.06em',fontFamily:"'Barlow Condensed',sans-serif",background:'rgba(156,163,175,0.08)',color:'#9CA3AF',border:'1px solid rgba(156,163,175,0.12)'}}>
                      {f.emoji || ''} {f.name}
                    </span>
                  ))}
                  {resolvedFoods.length > 10 && !showAllFoods && (
                    <button onClick={()=>setShowAllFoods(true)} style={{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:999,fontSize:'0.68rem',fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",background:'rgba(201,168,76,0.1)',color:'#C9A84C',border:'1px solid rgba(201,168,76,0.2)',cursor:'pointer'}}>
                      +{resolvedFoods.length - 10} autres
                    </button>
                  )}
                </div>
              )}
              <button className="btn-secondary" style={{width:'100%',marginTop:12,fontSize:'0.85rem'}} onClick={()=>{ setEditTab('info'); setEditOpen(true) }}>
                <Pencil size={13} strokeWidth={2}/>Modifier le profil
              </button>
            </div>

            {/* 2×2 Metrics */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {/* Poids */}
              <div className="metric-card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Poids</span>
                  <div style={{width:27,height:27,background:'rgba(249,115,22,.12)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Scale size={13} color="#F97316" strokeWidth={2}/></div>
                </div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.9rem',fontWeight:700,color:'#F8FAFC',lineHeight:1}}>
                  {currentWeight ?? '—'}<span style={{fontSize:'0.85rem',color:'#6B7280',fontWeight:500,marginLeft:2}}>kg</span>
                </div>
                {weightDelta !== null && (
                  <div style={{display:'flex',alignItems:'center',gap:3,marginTop:6}}>
                    <TrendingDown size={11} color={weightDelta<=0?'#22C55E':'#EF4444'} strokeWidth={2.5}/>
                    <span style={{fontSize:'0.68rem',color:weightDelta<=0?'#22C55E':'#EF4444',fontWeight:600}}>{weightDelta>0?'+':''}{weightDelta.toFixed(1)} kg</span>
                  </div>
                )}
              </div>
              {/* Objectif */}
              <div className="metric-card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Objectif</span>
                  <div style={{width:27,height:27,background:'rgba(34,197,94,.1)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Target size={13} color="#22C55E" strokeWidth={2}/></div>
                </div>
                {profile.target_weight && <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.3rem',fontWeight:700,color:'#F8FAFC',lineHeight:1,marginBottom:5}}>{profile.target_weight}<span style={{fontSize:'0.78rem',color:'#6B7280',marginLeft:2}}>kg</span></div>}
                {editingCalGoal ? (
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <input type="number" inputMode="numeric" value={calGoalInput} onChange={e=>setCalGoalInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveCalorieGoal();if(e.key==='Escape')setEditingCalGoal(false)}} autoFocus style={{background:'#0A0A0A',border:'1px solid #F97316',borderRadius:6,padding:'4px 6px',color:'#F8FAFC',fontSize:'0.9rem',fontWeight:700,width:68,outline:'none',fontFamily:"'Barlow Condensed',sans-serif"}}/>
                    <button onClick={saveCalorieGoal} style={{background:'#22C55E',border:'none',borderRadius:6,padding:'4px 6px',cursor:'pointer',display:'flex',alignItems:'center',minHeight:28}}><Check size={11} color="#fff" strokeWidth={3}/></button>
                    <button onClick={()=>setEditingCalGoal(false)} style={{background:'transparent',border:'none',cursor:'pointer',padding:2,display:'flex',alignItems:'center'}}><X size={11} color="#6B7280"/></button>
                  </div>
                ) : (
                  <button onClick={()=>{setCalGoalInput(profile.calorie_goal?String(profile.calorie_goal):'');setEditingCalGoal(true)}} style={{background:'transparent',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:700,color:'#F8FAFC'}}>{profile.calorie_goal??'—'}<span style={{fontSize:'0.68rem',color:'#6B7280',marginLeft:2}}>kcal</span></span>
                    <Pencil size={10} color="#6B7280" strokeWidth={2}/>
                  </button>
                )}
                {goalProgress !== null && (
                  <div style={{marginTop:8}}>
                    <div style={{background:'#242424',borderRadius:999,height:4,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:999,background:'#22C55E',width:`${goalProgress}%`,transition:'width 600ms ease'}}/>
                    </div>
                    <span style={{fontSize:'0.62rem',color:'#6B7280',marginTop:3,display:'block'}}>{goalProgress}% atteint</span>
                  </div>
                )}
              </div>
              {/* Séances */}
              <div className="metric-card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Séances</span>
                  <div style={{width:27,height:27,background:'rgba(249,115,22,.12)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Dumbbell size={13} color="#F97316" strokeWidth={2}/></div>
                </div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.9rem',fontWeight:700,color:'#F8FAFC',lineHeight:1}}>{totalSessions}</div>
                <div style={{display:'flex',alignItems:'center',gap:3,marginTop:6}}>
                  <CheckCircle size={11} color="#22C55E" strokeWidth={2.5}/>
                  <span style={{fontSize:'0.68rem',color:'#22C55E',fontWeight:600}}>complétées</span>
                </div>
              </div>
              {/* Streak */}
              <div className="metric-card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Streak</span>
                  <div style={{width:27,height:27,background:'rgba(249,115,22,.12)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Flame size={13} color="#F97316" strokeWidth={2}/></div>
                </div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'2.2rem',fontWeight:700,color:'#F97316',lineHeight:1}}>{streak}</div>
                <span style={{fontSize:'0.68rem',color:'#F97316',fontWeight:600,marginTop:6,display:'block'}}>jours consécutifs</span>
              </div>
            </div>

            {/* Session history — cards */}
            <section>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <p className="section-title" style={{marginBottom:0}}>Historique séances</p>
                <span style={{fontSize:'0.72rem',color:'#6B7280'}}>{totalSessionsCount} total</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {sessions.length === 0 ? (
                  <div className="card" style={{textAlign:'center',color:'#6B7280',padding:'28px 16px',fontSize:'0.85rem'}}>Aucune séance enregistrée</div>
                ) : sessions.map(s => (
                  <div key={s.id} style={{background:'#141414',border:'1px solid #242424',borderRadius:12,padding:'12px 14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:'#F8FAFC',fontSize:'0.95rem',textTransform:'capitalize'}}>{s.name ?? '—'}</div>
                        <div style={{fontSize:'0.7rem',color:'#6B7280',marginTop:2}}>{formatDate(s.created_at)}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                        {s.duration_minutes && <span style={{fontSize:'0.72rem',color:'#9CA3AF',background:'#1E1E1E',borderRadius:6,padding:'2px 7px'}}>{s.duration_minutes} min</span>}
                        {s.completed && <CheckCircle size={14} color="#22C55E" strokeWidth={2}/>}
                      </div>
                    </div>
                    {s.notes && <div style={{fontSize:'0.7rem',color:'#6B7280',marginTop:6,fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.notes}</div>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ══ TAB: PROGRAMME ══ */}
        {activeTab === 'programme' && (
          <div style={{animation:'fadeIn 200ms ease',display:'flex',flexDirection:'column',gap:12}}>
            {/* Actions */}
            <div style={{display:'flex',gap:8}}>
              <button
                onClick={()=>{setShowAiModal(true);setAiPreview(null)}}
                style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:7,padding:'12px 16px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.9rem',fontWeight:700,letterSpacing:'0.04em',background:'linear-gradient(135deg,#7C3AED,#A855F7)',color:'#fff',minHeight:44}}
              >
                <Sparkles size={14} strokeWidth={2.5}/>Générer avec l&apos;IA
              </button>
              <button className="btn-secondary" style={{padding:'12px 14px',flexShrink:0,gap:0}} onClick={saveProgram} disabled={programSaving} aria-label="Sauvegarder">
                {programSaving ? <Loader2 size={15} strokeWidth={2} style={{animation:'spin 0.7s linear infinite'}}/> : <Save size={15} strokeWidth={2.5}/>}
              </button>
            </div>
            {programSaved && (
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:'rgba(34,197,94,.07)',border:'1px solid rgba(34,197,94,.18)',borderRadius:8,color:'#22C55E',fontSize:'0.78rem',fontWeight:600}}>
                <Check size={12} strokeWidth={2.5}/>Programme sauvegardé
              </div>
            )}

            {/* Day chips — horizontal scroll */}
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2}}>
              {DAYS.map(day => {
                const d = program[day]
                const isActive = expandedDay === day
                const hasEx = !d.repos && d.exercises.length > 0
                return (
                  <button
                    key={day}
                    className="day-chip"
                    onClick={()=>setExpandedDay(isActive?null:day)}
                    style={{
                      background: d.repos?'rgba(107,114,128,.1)':isActive?'#F97316':hasEx?'rgba(249,115,22,.12)':'#1A1A1A',
                      color: d.repos?'#6B7280':isActive?'#fff':hasEx?'#F97316':'#9CA3AF',
                      border: `1.5px solid ${isActive?'#F97316':d.repos?'#1E1E1E':hasEx?'rgba(249,115,22,.25)':'#242424'}`,
                    }}
                  >
                    {DAY_LABELS[day]}
                    {d.repos && <Moon size={9} style={{marginLeft:3}}/>}
                    {hasEx && <span style={{marginLeft:4,background:'rgba(249,115,22,.2)',borderRadius:999,padding:'0 4px',fontSize:'0.62rem'}}>{d.exercises.length}</span>}
                  </button>
                )
              })}
            </div>

            {/* Expanded day */}
            {expandedDay && (
              <div className="card" style={{padding:0,overflow:'hidden',animation:'fadeIn 150ms ease'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderBottom:'1px solid #1E1E1E'}}>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:700,color:'#F8FAFC'}}>{DAY_FULL[expandedDay]}</span>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <button
                      onClick={()=>toggleRepos(expandedDay)}
                      style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:700,background:program[expandedDay].repos?'rgba(107,114,128,.18)':'rgba(107,114,128,.08)',color:program[expandedDay].repos?'#9CA3AF':'#6B7280',minHeight:36}}
                    >
                      <Moon size={11} strokeWidth={2}/>{program[expandedDay].repos?'Repos ✓':'Repos'}
                    </button>
                    {!program[expandedDay].repos && (
                      <button
                        onClick={()=>openExDbModal(expandedDay)}
                        style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:700,background:'rgba(249,115,22,.12)',color:'#F97316',minHeight:36}}
                      >
                        <Plus size={12} strokeWidth={2.5}/>Ajouter
                      </button>
                    )}
                  </div>
                </div>

                {program[expandedDay].repos ? (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'28px 16px',color:'#6B7280'}}>
                    <Moon size={20} strokeWidth={1.5}/><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:600}}>Jour de repos</span>
                  </div>
                ) : program[expandedDay].exercises.length === 0 ? (
                  <div style={{textAlign:'center',padding:'28px 16px',color:'#6B7280',fontSize:'0.85rem'}}>Aucun exercice — cliquez Ajouter</div>
                ) : (
                  <div style={{padding:'0 14px'}}>
                    {program[expandedDay].exercises.map((ex,idx)=>(
                      <div key={idx} className="ex-row-m">
                        {/* Name + delete */}
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          <input
                            placeholder="Nom de l'exercice"
                            value={ex.name}
                            onChange={e=>updateExercise(expandedDay,idx,'name',e.target.value)}
                            style={{flex:1,background:'#0A0A0A',border:'1px solid #242424',borderRadius:8,padding:'9px 11px',fontFamily:'Barlow,sans-serif',fontSize:'0.88rem',color:'#F8FAFC',outline:'none',minHeight:40}}
                            onFocus={e=>{e.target.style.borderColor='#F97316'}}
                            onBlur={e=>{e.target.style.borderColor='#242424'}}
                          />
                          <button onClick={()=>removeExercise(expandedDay,idx)} style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.15)',cursor:'pointer',color:'#EF4444',padding:0,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',width:40,height:40,flexShrink:0}}>
                            <Minus size={14} strokeWidth={2.5}/>
                          </button>
                        </div>
                        {/* Sets / Reps / Rest / Notes */}
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6}}>
                          {([
                            {label:'Séries',field:'sets' as const,type:'number',val:ex.sets},
                            {label:'Reps',field:'reps' as const,type:'number',val:ex.reps},
                            {label:'Repos',field:'rest' as const,type:'text',val:ex.rest},
                            {label:'Notes',field:'notes' as const,type:'text',val:ex.notes},
                          ]).map(({label,field,type,val})=>(
                            <div key={field}>
                              <div className="col-hdr">{label}</div>
                              <input
                                type={type}
                                min={type==='number'?1:undefined}
                                inputMode={type==='number'?'numeric':undefined}
                                value={val}
                                placeholder={field==='rest'?'60s':field==='notes'?'…':''}
                                onChange={e=>updateExercise(expandedDay,idx,field,type==='number'?parseInt(e.target.value)||1:e.target.value)}
                                style={{width:'100%',background:'#0A0A0A',border:'1px solid #242424',borderRadius:7,padding:'7px 7px',fontFamily:'Barlow,sans-serif',fontSize:'0.8rem',color:'#F8FAFC',outline:'none',textAlign:type==='number'?'center':'left',minHeight:36}}
                                onFocus={e=>{e.target.style.borderColor='#F97316'}}
                                onBlur={e=>{e.target.style.borderColor='#242424'}}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div style={{padding:'10px 0'}}>
                      <button
                        onClick={()=>openExDbModal(expandedDay)}
                        style={{display:'flex',alignItems:'center',gap:6,background:'transparent',border:'1.5px dashed #242424',borderRadius:10,padding:'10px 14px',cursor:'pointer',color:'#6B7280',fontFamily:'Barlow,sans-serif',fontSize:'0.82rem',width:'100%',justifyContent:'center',minHeight:44}}
                        onFocus={e=>{e.currentTarget.style.borderColor='#F97316';e.currentTarget.style.color='#F97316'}}
                        onBlur={e=>{e.currentTarget.style.borderColor='#242424';e.currentTarget.style.color='#6B7280'}}
                      >
                        <Plus size={13} strokeWidth={2.5}/>Ajouter un exercice
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: NUTRITION ══ */}
        {activeTab === 'nutrition' && (
          <div style={{animation:'fadeIn 200ms ease',display:'flex',flexDirection:'column',gap:12}}>
            {/* ── Header + AI Generate Button ── */}
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{flex:1,fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:700,color:'#F8FAFC'}}>Plan alimentaire</span>
              <button
                onClick={generateAiMealPlan}
                disabled={aiMealGenerating}
                style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,border:'none',cursor:aiMealGenerating?'wait':'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:700,letterSpacing:'0.04em',background:'linear-gradient(135deg,#C9A84C,#D4AF37)',color:'#000',minHeight:38,opacity:aiMealGenerating?0.6:1}}
              >
                {aiMealGenerating ? <Loader2 size={13} strokeWidth={2.5} style={{animation:'spin 0.7s linear infinite'}}/> : <Sparkles size={13} strokeWidth={2.5}/>}
                {aiMealGenerating ? 'Génération...' : 'Générer plan IA'}
              </button>
            </div>

            {/* ── Client TDEE / preferences summary ── */}
            {profile && (
              <div style={{background:'#141414',border:'1px solid #242424',borderRadius:12,padding:'10px 14px',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                {profile.tdee ? (
                  <>
                    <span style={{fontSize:'0.72rem',color:'#C9A84C',fontWeight:700}}>{profile.tdee} kcal/j</span>
                    <span style={{fontSize:'0.68rem',color:'#6B7280'}}>P {profile.protein_goal || '—'}g · G {profile.carbs_goal || '—'}g · L {profile.fat_goal || '—'}g</span>
                  </>
                ) : (
                  <span style={{fontSize:'0.72rem',color:'#6B7280',fontStyle:'italic'}}>Le client n'a pas encore calculé son TDEE</span>
                )}
                {profile.dietary_type && <span style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:999,background:'rgba(34,197,94,.12)',color:'#22C55E',fontWeight:700,textTransform:'uppercase'}}>{profile.dietary_type}</span>}
                {(profile.allergies || []).map((a: string) => (
                  <span key={a} style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:999,background:'rgba(239,68,68,.12)',color:'#EF4444',fontWeight:700,textTransform:'uppercase'}}>{a}</span>
                ))}
              </div>
            )}

            {/* ── Streaming loading state ── */}
            {aiMealGenerating && (
              <div style={{background:'#141414',border:'1.5px solid #C9A84C30',borderRadius:16,padding:'28px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                <div style={{width:40,height:40,borderRadius:'50%',border:'3px solid #242424',borderTopColor:'#C9A84C',animation:'spin 0.8s linear infinite'}}/>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.9rem',fontWeight:700,color:'#C9A84C'}}>{aiMealStreamStatus || 'Génération...'}</span>
                <span style={{fontSize:'0.7rem',color:'#6B7280'}}>Claude rédige le plan alimentaire sur 7 jours</span>
              </div>
            )}

            {/* ── AI Meal Plan Preview ── */}
            {aiMealPreview && (
              <div style={{background:'#141414',border:'1.5px solid #C9A84C40',borderRadius:16,overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid #242424',display:'flex',alignItems:'center',gap:8}}>
                  <Sparkles size={14} color="#C9A84C" strokeWidth={2.5}/>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.9rem',fontWeight:700,color:'#C9A84C',flex:1}}>Plan IA généré</span>
                  <button onClick={()=>setAiMealPreview(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#6B7280',padding:4}}><X size={16}/></button>
                </div>
                <div style={{display:'flex',gap:4,padding:'8px 12px',overflowX:'auto'}}>
                  {DAYS.map(d => (
                    <button key={d} onClick={()=>setAiMealPreviewDay(d)} style={{
                      padding:'6px 10px',borderRadius:8,border:'none',cursor:'pointer',
                      fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,
                      background:aiMealPreviewDay===d?'#C9A84C':'#1A1A1A',
                      color:aiMealPreviewDay===d?'#000':'#6B7280',flexShrink:0,
                    }}>{DAY_LABELS[d]}</button>
                  ))}
                </div>
                {(() => {
                  const day = aiMealPreview[aiMealPreviewDay]
                  if (!day) return null
                  return (
                    <div style={{padding:'8px 12px 12px'}}>
                      <div style={{display:'flex',gap:8,marginBottom:10}}>
                        {[
                          {l:'Kcal',v:day.total_kcal,c:'#EF4444'},{l:'P',v:`${day.total_protein}g`,c:'#3B82F6'},
                          {l:'G',v:`${day.total_carbs}g`,c:'#F59E0B'},{l:'L',v:`${day.total_fat}g`,c:'#22C55E'},
                        ].map(m=>(
                          <div key={m.l} style={{flex:1,background:'#0A0A0A',borderRadius:8,padding:'6px 4px',textAlign:'center'}}>
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.95rem',fontWeight:700,color:m.c}}>{m.v}</div>
                            <div style={{fontSize:'0.55rem',color:'#6B7280',fontWeight:700}}>{m.l}</div>
                          </div>
                        ))}
                      </div>
                      {AI_MEAL_ORDER.map(mealType => {
                        const foods = Array.isArray(day.repas?.[mealType]) ? day.repas[mealType] : []
                        if (foods.length === 0) return null
                        return (
                          <div key={mealType} style={{marginBottom:8}}>
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,color:'#C9A84C',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>
                              {AI_MEAL_LABELS[mealType]}
                            </div>
                            {foods.map((f: any, i: number) => (
                              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:'1px solid #1A1A1A'}}>
                                <span style={{fontSize:'0.78rem',color:'#F8FAFC'}}>{f.aliment}</span>
                                <span style={{fontSize:'0.7rem',color:'#6B7280',flexShrink:0,marginLeft:8}}>{f.quantite_g}g · {f.kcal}kcal</span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
                <div style={{display:'flex',gap:8,padding:'8px 12px 12px'}}>
                  <button onClick={generateAiMealPlan} disabled={aiMealGenerating} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:8,border:'1px solid #374151',background:'transparent',color:'#9CA3AF',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.82rem',fontWeight:700}}>
                    <Sparkles size={13}/>Régénérer
                  </button>
                  <button onClick={acceptAiMealPlan} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#C9A84C,#D4AF37)',color:'#000',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.82rem',fontWeight:700}}>
                    <Check size={13} strokeWidth={3}/>Valider et envoyer
                  </button>
                </div>
              </div>
            )}

            {/* ── Active Meal Plan Summary ── */}
            {!aiMealPreview && clientActivePlan?.plan_data && (
              <div style={{background:'#141414',border:'1px solid #242424',borderRadius:16,overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid #242424',display:'flex',alignItems:'center',gap:8}}>
                  <Utensils size={14} color="#22C55E" strokeWidth={2.5}/>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.9rem',fontWeight:700,color:'#22C55E',flex:1}}>Plan actif</span>
                  <span style={{fontSize:'0.65rem',color:'#6B7280'}}>{new Date(clientActivePlan.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div style={{display:'flex',gap:4,padding:'8px 12px',overflowX:'auto'}}>
                  {DAYS.map(d => {
                    const dayData = clientActivePlan.plan_data[d]
                    return (
                      <button key={d} onClick={()=>setClientActivePlanDay(d)} style={{
                        padding:'6px 10px',borderRadius:8,border:'none',cursor:'pointer',
                        fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,
                        background:clientActivePlanDay===d?'#22C55E':'#1A1A1A',
                        color:clientActivePlanDay===d?'#000':'#6B7280',flexShrink:0,
                      }}>
                        {DAY_LABELS[d]}
                        {dayData?.total_kcal && <span style={{display:'block',fontSize:'0.55rem',opacity:0.8}}>{dayData.total_kcal}</span>}
                      </button>
                    )
                  })}
                </div>
                {(() => {
                  const day = clientActivePlan.plan_data[clientActivePlanDay]
                  if (!day) return null
                  return (
                    <div style={{padding:'8px 12px 12px'}}>
                      <div style={{display:'flex',gap:8,marginBottom:10}}>
                        {[
                          {l:'Kcal',v:day.total_kcal,c:'#EF4444'},{l:'P',v:`${day.total_protein}g`,c:'#3B82F6'},
                          {l:'G',v:`${day.total_carbs}g`,c:'#F59E0B'},{l:'L',v:`${day.total_fat}g`,c:'#22C55E'},
                        ].map(m=>(
                          <div key={m.l} style={{flex:1,background:'#0A0A0A',borderRadius:8,padding:'6px 4px',textAlign:'center'}}>
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.95rem',fontWeight:700,color:m.c}}>{m.v}</div>
                            <div style={{fontSize:'0.55rem',color:'#6B7280',fontWeight:700}}>{m.l}</div>
                          </div>
                        ))}
                      </div>
                      {AI_MEAL_ORDER.map(mealType => {
                        const foods = Array.isArray(day.repas?.[mealType]) ? day.repas[mealType] : []
                        if (foods.length === 0) return null
                        return (
                          <div key={mealType} style={{marginBottom:8}}>
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,color:'#22C55E',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>
                              {AI_MEAL_LABELS[mealType]}
                            </div>
                            {foods.map((f: any, i: number) => (
                              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:'1px solid #1A1A1A'}}>
                                <span style={{fontSize:'0.78rem',color:'#F8FAFC'}}>{f.aliment}</span>
                                <span style={{fontSize:'0.7rem',color:'#6B7280',flexShrink:0,marginLeft:8}}>{f.quantite_g}g · {f.kcal}kcal</span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ── No plan message ── */}
            {!aiMealPreview && !clientActivePlan && (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'30px 0',background:'#141414',border:'1px solid #242424',borderRadius:16}}>
                <Utensils size={28} color="#6B7280"/>
                <p style={{fontSize:'0.85rem',color:'#6B7280',margin:0,textAlign:'center'}}>Aucun plan actif pour ce client</p>
                <p style={{fontSize:'0.72rem',color:'#4B5563',margin:0}}>Clique sur "Générer plan IA" pour en créer un</p>
              </div>
            )}

            {/* ── Weekly tracking grid ── */}
            {(() => {
              const mondayDate = new Date()
              const dayOfWeek = mondayDate.getDay()
              mondayDate.setDate(mondayDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
              const todayStr = new Date().toISOString().split('T')[0]
              const weekDates = DAYS.map((_, i) => {
                const d = new Date(mondayDate)
                d.setDate(d.getDate() + i)
                return d.toISOString().split('T')[0]
              })
              const mealTypes = ['petit_dejeuner', 'dejeuner', 'collation', 'diner']
              const mealLabels = ['P-déj', 'Déj', 'Coll', 'Dîner']
              let completed = 0, total = 0
              weekDates.forEach(date => {
                mealTypes.forEach(mt => {
                  if (date <= todayStr) { total++; if (weeklyTracking[date]?.has(mt)) completed++ }
                })
              })
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0

              return (
                <div style={{background:'#141414',border:'1px solid #242424',borderRadius:16,padding:'12px 10px',marginBottom:4}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,color:'#C9A84C',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>
                    Suivi de la semaine
                  </div>
                  {/* Grid header */}
                  <div style={{display:'grid',gridTemplateColumns:'50px repeat(7, 1fr)',gap:3,marginBottom:4}}>
                    <div/>
                    {DAYS.map((d,i) => (
                      <div key={d} style={{textAlign:'center',fontSize:'0.58rem',fontWeight:700,color:weekDates[i]===todayStr?'#C9A84C':'#6B7280',textTransform:'uppercase'}}>
                        {DAY_LABELS[d]}
                      </div>
                    ))}
                  </div>
                  {/* Grid rows */}
                  {mealTypes.map((mt, mi) => (
                    <div key={mt} style={{display:'grid',gridTemplateColumns:'50px repeat(7, 1fr)',gap:3,marginBottom:2}}>
                      <div style={{fontSize:'0.58rem',fontWeight:600,color:'#6B7280',display:'flex',alignItems:'center'}}>{mealLabels[mi]}</div>
                      {weekDates.map((date, di) => {
                        const isFuture = date > todayStr
                        const isDone = weeklyTracking[date]?.has(mt)
                        return (
                          <div key={di} style={{
                            display:'flex',alignItems:'center',justifyContent:'center',
                            height:24,borderRadius:6,fontSize:'0.65rem',fontWeight:700,
                            background: isFuture ? '#1A1A1A' : isDone ? 'rgba(34,197,94,.15)' : 'rgba(156,163,175,.06)',
                            color: isFuture ? '#2A2A2A' : isDone ? '#22C55E' : '#4B5563',
                          }}>
                            {isFuture ? '' : isDone ? '✓' : '○'}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                  {/* Score */}
                  <div style={{marginTop:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                      <span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>{profile?.full_name?.split(' ')[0] || 'Client'} a complété {completed}/{total} repas ({pct}%)</span>
                    </div>
                    <div style={{background:'#242424',borderRadius:999,height:6,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:999,background:'linear-gradient(90deg,#C9A84C,#D4AF37)',width:`${pct}%`,transition:'width 300ms'}}/>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── Manual meal plan editor (old interface) ── */}
            <details style={{marginTop:4}}>
              <summary style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:700,color:'#6B7280',cursor:'pointer',padding:'8px 0',letterSpacing:'0.04em',textTransform:'uppercase'}}>
                Édition manuelle du plan
              </summary>
              <div style={{display:'flex',flexDirection:'column',gap:12,paddingTop:8}}>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button className="btn-secondary" style={{padding:'10px 14px',flexShrink:0,gap:6,fontSize:'0.78rem'}} onClick={saveMealPlan} disabled={mealPlanSaving}>
                    {mealPlanSaving ? <Loader2 size={13} strokeWidth={2} style={{animation:'spin 0.7s linear infinite'}}/> : <Save size={13} strokeWidth={2.5}/>}
                    Sauvegarder
                  </button>
                </div>
                {mealPlanSaved && (
                  <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:'rgba(34,197,94,.07)',border:'1px solid rgba(34,197,94,.18)',borderRadius:8,color:'#22C55E',fontSize:'0.78rem',fontWeight:600}}>
                    <Check size={12} strokeWidth={2.5}/>Plan alimentaire sauvegardé
                  </div>
                )}

            {/* Macro targets 2×2 */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
              {[
                { label:'Calories', unit:'kcal', color:MACRO_COLORS.kcal, val:calorieTarget, set:setCalorieTarget },
                { label:'Protéines', unit:'g', color:MACRO_COLORS.prot, val:protTarget, set:setProtTarget },
                { label:'Glucides', unit:'g', color:MACRO_COLORS.carb, val:carbTarget, set:setCarbTarget },
                { label:'Lipides', unit:'g', color:MACRO_COLORS.fat, val:fatTarget, set:setFatTarget },
              ].map(({ label, unit, color, val, set }) => (
                <div key={label} style={{background:'#141414',border:'1px solid #242424',borderRadius:12,padding:'11px 12px',borderTop:`3px solid ${color}`}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',marginBottom:7}}>{label}</div>
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={val}
                      onChange={e=>set(parseInt(e.target.value)||0)}
                      style={{flex:1,background:'#0A0A0A',border:'1px solid #242424',borderRadius:8,padding:'6px 7px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.1rem',fontWeight:700,color,outline:'none',textAlign:'center',minHeight:38}}
                      onFocus={e=>{e.target.style.borderColor=color}}
                      onBlur={e=>{e.target.style.borderColor='#242424'}}
                    />
                    <span style={{fontSize:'0.7rem',color:'#6B7280',flexShrink:0}}>{unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Day chips */}
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2}}>
              {DAYS.map(day => {
                const { kcal } = dayMacros(mealPlan[day])
                const isActive = expandedMealDay === day
                const hasFoods = mealPlan[day].meals.some(m => m.foods.length > 0)
                return (
                  <button
                    key={day}
                    className="day-chip"
                    onClick={()=>setExpandedMealDay(isActive?null:day)}
                    style={{
                      background: isActive?'#22C55E':hasFoods?'rgba(34,197,94,.12)':'#1A1A1A',
                      color: isActive?'#fff':hasFoods?'#22C55E':'#9CA3AF',
                      border: `1.5px solid ${isActive?'#22C55E':hasFoods?'rgba(34,197,94,.25)':'#242424'}`,
                    }}
                  >
                    {DAY_LABELS[day]}
                    {hasFoods && !isActive && <span style={{marginLeft:4,background:'rgba(34,197,94,.18)',borderRadius:999,padding:'0 4px',fontSize:'0.6rem'}}>{kcal}</span>}
                  </button>
                )
              })}
            </div>

            {/* Expanded meal day */}
            {expandedMealDay && (() => {
              const dayData = mealPlan[expandedMealDay]
              const totals = dayMacros(dayData)
              return (
                <div style={{display:'flex',flexDirection:'column',gap:10,animation:'fadeIn 150ms ease'}}>
                  {/* Macro summary */}
                  <div style={{background:'#141414',border:'1px solid #242424',borderRadius:12,padding:'12px 14px'}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.65rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',marginBottom:10}}>Total du jour</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                      {[
                        {label:'Cal',val:totals.kcal,target:calorieTarget,color:MACRO_COLORS.kcal},
                        {label:'Prot',val:totals.prot,target:protTarget,color:MACRO_COLORS.prot},
                        {label:'Gluc',val:totals.carb,target:carbTarget,color:MACRO_COLORS.carb},
                        {label:'Lip',val:totals.fat,target:fatTarget,color:MACRO_COLORS.fat},
                      ].map(({label,val,target,color})=>(
                        <div key={label}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:3}}>
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.6rem',fontWeight:700,color:'#6B7280',textTransform:'uppercase'}}>{label}</span>
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.85rem',fontWeight:700,color}}>{val}</span>
                          </div>
                          <div style={{background:'#242424',borderRadius:999,height:4,overflow:'hidden'}}>
                            <div style={{height:'100%',borderRadius:999,background:color,width:`${pct(val,target)}%`,transition:'width 400ms ease'}}/>
                          </div>
                          <div style={{fontSize:'0.58rem',color:'#4B5563',marginTop:2,textAlign:'right'}}>{pct(val,target)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Meal cards */}
                  {dayData.meals.map((meal, mealIdx) => {
                    const mealTotals = meal.foods.reduce((acc,f)=>({kcal:acc.kcal+f.kcal,prot:acc.prot+f.prot,carb:acc.carb+f.carb,fat:acc.fat+f.fat}),{kcal:0,prot:0,carb:0,fat:0})
                    return (
                      <div key={mealIdx} className="card" style={{padding:0,overflow:'hidden'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:meal.foods.length>0?'1px solid #1E1E1E':'none',background:'rgba(255,255,255,.015)'}}>
                          <div style={{flex:1,minWidth:0}}>
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.95rem',fontWeight:700,color:'#F8FAFC'}}>{meal.type}</span>
                            {meal.foods.length > 0 && (
                              <div style={{fontSize:'0.68rem',color:'#6B7280',marginTop:1}}>{mealTotals.kcal} kcal · {mealTotals.prot}g prot</div>
                            )}
                          </div>
                          <button onClick={()=>addFood(expandedMealDay,mealIdx)} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:700,background:'rgba(34,197,94,.1)',color:'#22C55E',minHeight:36}}>
                            <Plus size={11} strokeWidth={2.5}/>Ajouter
                          </button>
                        </div>

                        {meal.foods.length > 0 && (
                          <div style={{padding:'0 14px'}}>
                            {meal.foods.map((food, foodIdx) => (
                              <div key={foodIdx} className="food-row-m">
                                {/* Name + delete */}
                                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                                  <input
                                    placeholder="Ex: Riz cuit"
                                    value={food.name}
                                    onChange={e=>updateFood(expandedMealDay,mealIdx,foodIdx,'name',e.target.value)}
                                    style={{flex:1,background:'#0A0A0A',border:'1px solid #242424',borderRadius:8,padding:'8px 10px',fontFamily:'Barlow,sans-serif',fontSize:'0.85rem',color:'#F8FAFC',outline:'none',minHeight:36}}
                                    onFocus={e=>{e.target.style.borderColor='#22C55E'}}
                                    onBlur={e=>{e.target.style.borderColor='#242424'}}
                                  />
                                  <button onClick={()=>removeFood(expandedMealDay,mealIdx,foodIdx)} style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.15)',cursor:'pointer',color:'#EF4444',padding:0,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,flexShrink:0}}>
                                    <Minus size={12} strokeWidth={2.5}/>
                                  </button>
                                </div>
                                {/* Qty / Kcal / Prot / Carb / Fat */}
                                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5}}>
                                  {([
                                    {label:'Qté',field:'qty' as const,type:'text',val:food.qty,color:'#9CA3AF'},
                                    {label:'Kcal',field:'kcal' as const,type:'number',val:food.kcal,color:MACRO_COLORS.kcal},
                                    {label:'Prot',field:'prot' as const,type:'number',val:food.prot,color:MACRO_COLORS.prot},
                                    {label:'Gluc',field:'carb' as const,type:'number',val:food.carb,color:MACRO_COLORS.carb},
                                    {label:'Lip',field:'fat' as const,type:'number',val:food.fat,color:MACRO_COLORS.fat},
                                  ]).map(({label,field,type,val,color})=>(
                                    <div key={field}>
                                      <div className="col-hdr">{label}</div>
                                      <input
                                        type={type}
                                        min={type==='number'?0:undefined}
                                        inputMode={type==='number'?'numeric':undefined}
                                        value={val}
                                        placeholder={field==='qty'?'100g':'0'}
                                        onChange={e=>updateFood(expandedMealDay,mealIdx,foodIdx,field,type==='number'?parseInt(e.target.value)||0:e.target.value)}
                                        style={{width:'100%',background:'#0A0A0A',border:'1px solid #242424',borderRadius:6,padding:'5px 4px',fontFamily:'Barlow,sans-serif',fontSize:'0.75rem',color,outline:'none',textAlign:'center',minHeight:30}}
                                        onFocus={e=>{e.target.style.borderColor=color}}
                                        onBlur={e=>{e.target.style.borderColor='#242424'}}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <div style={{padding:'6px 0'}}/>
                          </div>
                        )}
                        {meal.foods.length === 0 && (
                          <div style={{textAlign:'center',padding:'14px',color:'#4B5563',fontSize:'0.78rem',fontStyle:'italic'}}>Aucun aliment</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
              </div>
            </details>
          </div>
        )}

        {/* ══ TAB: MESSAGES ══ */}
        {activeTab === 'messages' && (
          <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 120px)'}}>
            {/* Messages scrollable */}
            <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'12px 16px',display:'flex',flexDirection:'column',gap:4}}>
              {coachMessages.length === 0 && (
                <div style={{textAlign:'center',padding:'40px 0'}}>
                  <MessageCircle size={32} color="#6B7280" style={{marginBottom:8}}/>
                  <p style={{color:'#6B7280',fontSize:'0.85rem',margin:0}}>Commencez la conversation</p>
                </div>
              )}
              {coachMessages.map((msg: any, i: number) => {
                const isCoach = msg.sender_id === coachId
                const prevMsg = coachMessages[i-1]
                const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={{display:'flex',alignItems:'center',gap:10,margin:'12px 0',padding:'0 8px'}}>
                        <div style={{flex:1,height:1,background:'#242424'}}/>
                        <span style={{fontSize:'0.6rem',color:'#6B7280',fontWeight:600}}>{(() => { const d = new Date(msg.created_at); const today = new Date(); return d.toDateString() === today.toDateString() ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) })()}</span>
                        <div style={{flex:1,height:1,background:'#242424'}}/>
                      </div>
                    )}
                    <div style={{display:'flex',justifyContent:isCoach?'flex-end':'flex-start',marginBottom:2}}>
                      <div style={{maxWidth:'78%',background:isCoach?'#C9A84C':'#1E1E1E',color:isCoach?'#000':'#F8FAFC',borderRadius:isCoach?'16px 16px 4px 16px':'16px 16px 16px 4px',padding:'10px 14px',border:isCoach?'none':'1px solid #242424'}}>
                        <p style={{margin:0,fontSize:'0.88rem',lineHeight:1.45,whiteSpace:'pre-wrap'}}>{msg.content}</p>
                        <div style={{display:'flex',alignItems:'center',justifyContent:isCoach?'flex-end':'flex-start',gap:4,marginTop:3}}>
                          <span style={{fontSize:'0.58rem',opacity:0.5}}>{new Date(msg.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
                          {isCoach && (msg.read ? <CheckCheck size={12} style={{opacity:0.6}}/> : null)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={coachMsgEndRef}/>
            </div>
            {/* Input always at bottom */}
            <div style={{flexShrink:0,padding:'12px 14px',background:'#111111',borderTop:'1px solid #222222',display:'flex',gap:8,alignItems:'flex-end'}}>
              <textarea value={coachMsgInput} onChange={e=>setCoachMsgInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendCoachMessage()}}} placeholder="Écrire un message..." rows={1}
                style={{flex:1,background:'#0A0A0A',border:'1px solid #242424',borderRadius:20,padding:'10px 16px',color:'#F8FAFC',fontSize:'0.88rem',outline:'none',resize:'none',maxHeight:100,lineHeight:1.4,fontFamily:'inherit'}}/>
              <button onClick={sendCoachMessage} disabled={!coachMsgInput.trim()}
                style={{width:40,height:40,borderRadius:'50%',background:coachMsgInput.trim()?'#C9A84C':'#242424',border:'none',cursor:coachMsgInput.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Send size={16} color={coachMsgInput.trim()?'#000':'#6B7280'}/>
              </button>
            </div>
          </div>
        )}

        {/* ══ TAB: NOTES ══ */}
        {activeTab === 'notes' && (
          <div style={{animation:'fadeIn 200ms ease',display:'flex',flexDirection:'column',gap:12}}>
            {/* Next RDV */}
            <div className="card">
              <p className="section-title">Prochain RDV</p>
              <div style={{display:'flex',alignItems:'center',gap:14,background:'#0A0A0A',borderRadius:10,padding:14,borderLeft:'3px solid #F97316',marginBottom:12}}>
                <div style={{width:38,height:38,background:'rgba(249,115,22,.1)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <CalendarClock size={17} color="#F97316" strokeWidth={2}/>
                </div>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:700,color:'#F8FAFC'}}>À planifier</div>
                  <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginTop:2}}>Aucun RDV planifié</div>
                </div>
              </div>
              <button className="btn-primary" style={{width:'100%'}} onClick={()=>showToast('Planification de RDV à venir')}>
                Planifier un RDV
              </button>
            </div>

            {/* Coach notes */}
            <div className="card">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <p className="section-title" style={{marginBottom:0}}>Notes coach</p>
                <div style={{fontSize:'0.7rem',color:'#22C55E',display:'flex',alignItems:'center',gap:4,opacity:notesSaved?1:0,transition:'opacity 300ms ease'}}>
                  <Check size={11} strokeWidth={2.5}/>Sauvegardé
                </div>
              </div>
              <textarea
                value={notes}
                onChange={e=>onNotesChange(e.target.value)}
                placeholder="Ajoutez vos observations, programmes, remarques…"
                style={{width:'100%',background:'#0A0A0A',border:'1px solid #242424',borderRadius:10,padding:'12px 14px',fontFamily:'Barlow,sans-serif',fontSize:'0.9rem',color:'#F8FAFC',resize:'vertical',minHeight:120,lineHeight:1.6,outline:'none',transition:'border-color 200ms'}}
                onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.08)'}}
                onBlur={e=>{e.target.style.borderColor='#242424';e.target.style.boxShadow='none'}}
              />
              <button className="btn-secondary" style={{width:'100%',marginTop:10}} onClick={saveNotes} disabled={notesSaving}>
                <Save size={13} strokeWidth={2.5}/>{notesSaving?'Sauvegarde…':'Sauvegarder les notes'}
              </button>
            </div>

            {/* Advanced zone */}
            <div className="card">
              <p className="section-title" style={{color:'#EF4444'}}>Zone avancée</p>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <button className="btn-ghost" style={{justifyContent:'flex-start',color:'#9CA3AF',width:'100%'}} onClick={()=>showToast('Archivage à implémenter')}>
                  <Archive size={14} strokeWidth={2}/>Archiver le client
                </button>
                <button className="btn-ghost" style={{justifyContent:'flex-start',color:'#EF4444',width:'100%'}} onClick={()=>showToast('Suppression à implémenter')}>
                  <Trash2 size={14} strokeWidth={2}/>Supprimer le client
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── BOTTOM NAVIGATION ─────────────────────────────────────── */}
      <nav className="bottom-nav">
        <div style={{display:'flex',alignItems:'stretch',height:52}}>
          {([
            {id:'apercu',    label:'Aperçu',     icon:(a:boolean)=><LayoutDashboard size={20} strokeWidth={a?2.5:1.5}/>},
            {id:'programme', label:'Programme',  icon:(a:boolean)=><Dumbbell        size={20} strokeWidth={a?2.5:1.5}/>},
            {id:'nutrition', label:'Nutrition',  icon:(a:boolean)=><Utensils        size={20} strokeWidth={a?2.5:1.5}/>},
            {id:'messages',  label:'Messages',   icon:(a:boolean)=><MessageCircle   size={20} strokeWidth={a?2.5:1.5}/>},
            {id:'notes',     label:'Notes',      icon:(a:boolean)=><FileText        size={20} strokeWidth={a?2.5:1.5}/>},
          ] as {id:'apercu'|'programme'|'nutrition'|'notes'|'messages', label:string, icon:(a:boolean)=>React.ReactNode}[]).map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                className="nav-tab"
                onClick={()=>setActiveTab(tab.id)}
                style={{color: active ? '#F97316' : '#4B5563'}}
                aria-label={tab.label}
              >
                {tab.icon(active)}
                <span style={{fontSize:'0.55rem',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,letterSpacing:'0.05em',textTransform:'uppercase'}}>{tab.label}</span>
                {active && <div style={{position:'absolute',bottom:0,width:24,height:2,background:'#F97316',borderRadius:'2px 2px 0 0'}}/>}
              </button>
            )
          })}
        </div>
      </nav>

      {/* EDIT MODAL */}
      <div className={`modal-overlay${editOpen?' open':''}`} onClick={()=>setEditOpen(false)}>
        <div className="modal" style={{maxWidth:560,padding:0,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>

          {/* Modal header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid #374151'}}>
            <h2 style={{fontSize:'1.4rem',fontWeight:700,margin:0,color:'#F8FAFC',fontFamily:"'Barlow Condensed',sans-serif"}}>Modifier le profil</h2>
            <button style={{background:'#374151',border:'none',borderRadius:8,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onClick={()=>setEditOpen(false)}>
              <X size={16} color="#9CA3AF" strokeWidth={2}/>
            </button>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:0,borderBottom:'1px solid #374151',background:'#111827'}}>
            {(['info','metrics','status'] as const).map(tab => {
              const labels = { info:'Informations', metrics:'Métriques', status:'Statut & Objectif' }
              return (
                <button key={tab} onClick={()=>setEditTab(tab)} style={{flex:1,padding:'12px 8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.82rem',fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',transition:'all 150ms ease',background:'transparent',color:editTab===tab?'#F97316':'#6B7280',borderBottom:editTab===tab?'2px solid #F97316':'2px solid transparent',marginBottom:-1}}>
                  {labels[tab]}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:14,maxHeight:'60vh',overflowY:'auto'}}>

            {editTab === 'info' && (<>
              <EditField label="Nom complet">
                <input value={editName} onChange={e=>setEditName(e.target.value)} style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/>
              </EditField>
              <EditField label="Email">
                <input type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)} style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/>
              </EditField>
              <EditField label="Téléphone">
                <input type="tel" value={editPhone} onChange={e=>setEditPhone(e.target.value)} placeholder="+33 6 00 00 00 00" style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/>
              </EditField>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <EditField label="Date de naissance">
                  <input type="date" value={editBirth} onChange={e=>setEditBirth(e.target.value)} style={{...inputStyle,colorScheme:'dark'} as React.CSSProperties} onFocus={e=>{e.target.style.borderColor='#F97316'}} onBlur={e=>{e.target.style.borderColor='#374151'}}/>
                </EditField>
                <EditField label="Genre">
                  <select value={editGender} onChange={e=>setEditGender(e.target.value)} style={{...inputStyle,appearance:'none',cursor:'pointer'} as React.CSSProperties} onFocus={e=>{e.target.style.borderColor='#F97316'}} onBlur={e=>{e.target.style.borderColor='#374151'}}>
                    <option value="">Non précisé</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                    <option value="autre">Autre</option>
                  </select>
                </EditField>
              </div>
            </>)}

            {editTab === 'metrics' && (<>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <EditField label="Poids actuel (kg)">
                  <input type="number" step="0.1" value={editWeight} onChange={e=>setEditWeight(e.target.value)} placeholder="70" style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/>
                </EditField>
                <EditField label="Taille (cm)">
                  <input type="number" step="1" value={editHeight} onChange={e=>setEditHeight(e.target.value)} placeholder="175" style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/>
                </EditField>
                <EditField label="Poids cible (kg)">
                  <input type="number" step="0.1" value={editTargetW} onChange={e=>setEditTargetW(e.target.value)} placeholder="65" style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/>
                </EditField>
                <EditField label="% Graisse corporelle">
                  <input type="number" step="0.1" value={editBodyFat} onChange={e=>setEditBodyFat(e.target.value)} placeholder="20" style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/>
                </EditField>
              </div>
              {/* BMI preview */}
              {editWeight && editHeight && (() => {
                const bmi = (parseFloat(editWeight) / ((parseFloat(editHeight)/100)**2)).toFixed(1)
                const bmiNum = parseFloat(bmi)
                const cat = bmiNum < 18.5 ? {label:'Insuffisance pondérale',color:'#60A5FA'} : bmiNum < 25 ? {label:'Poids normal',color:'#22C55E'} : bmiNum < 30 ? {label:'Surpoids',color:'#FBBF24'} : {label:'Obésité',color:'#EF4444'}
                return (
                  <div style={{background:'#111827',border:'1px solid #374151',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:'0.8rem',color:'#6B7280',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>IMC calculé</span>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.1rem',fontWeight:700,color:cat.color}}>{bmi} <span style={{fontSize:'0.75rem',color:'#6B7280',fontWeight:500}}>— {cat.label}</span></span>
                  </div>
                )
              })()}
            </>)}

            {editTab === 'status' && (<>
              <EditField label="Statut">
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[{val:'active',label:'Actif',color:'#22C55E'},{val:'warning',label:'À relancer',color:'#F97316'},{val:'inactive',label:'Inactif',color:'#9CA3AF'}].map(({val,label,color})=>(
                    <button key={val} onClick={()=>setEditStatus(val)} style={{padding:'10px 8px',borderRadius:8,border:`2px solid ${editStatus===val?color:'#374151'}`,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.85rem',fontWeight:700,background:editStatus===val?`${color}20`:'transparent',color:editStatus===val?color:'#6B7280',transition:'all 150ms ease'}}>
                      {label}
                    </button>
                  ))}
                </div>
              </EditField>
              <EditField label="Objectif">
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {[{val:'perte_poids',label:'Perte de poids',icon:'📉'},{val:'prise_masse',label:'Prise de masse',icon:'💪'},{val:'maintien',label:'Maintien',icon:'⚖️'},{val:'performance',label:'Performance',icon:'🏆'}].map(({val,label,icon})=>(
                    <button key={val} onClick={()=>setEditObj(val)} style={{padding:'12px 10px',borderRadius:8,border:`2px solid ${editObj===val?'#F97316':'#374151'}`,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.85rem',fontWeight:700,background:editObj===val?'rgba(249,115,22,.12)':'transparent',color:editObj===val?'#F97316':'#6B7280',transition:'all 150ms ease',display:'flex',alignItems:'center',gap:8}}>
                      <span>{icon}</span>{label}
                    </button>
                  ))}
                </div>
              </EditField>
            </>)}
          </div>

          {/* Footer */}
          <div style={{display:'flex',gap:10,padding:'16px 24px',borderTop:'1px solid #374151'}}>
            <button className="btn-secondary" style={{flex:1,justifyContent:'center'}} onClick={()=>setEditOpen(false)}>Annuler</button>
            <button className="btn-primary" style={{flex:1,justifyContent:'center'}} onClick={saveEdit}>
              <Check size={14} strokeWidth={2.5}/>Enregistrer
            </button>
          </div>
        </div>
      </div>

      {/* ── EXERCISE DB SEARCH MODAL ── */}
      <AnimatePresence>
        {showExDbModal && (
          <motion.div
            key="exdb-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setShowExDbModal(false)}
          >
            <motion.div
              key="exdb-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#111827', border: '1px solid #374151', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: '0.05em' }}>
                      BASE D&apos;EXERCICES
                    </h3>
                    {exDbTargetDay && (
                      <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '2px 0 0', textTransform: 'capitalize' }}>
                        Ajouter à · {exDbTargetDay}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setShowExDbModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#1F2937', border: '1px solid #374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={14} color="#6B7280" />
                  </button>
                </div>
                {/* Search input */}
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#6B7280', pointerEvents: 'none' }} />
                  <input
                    value={exDbSearch}
                    onChange={e => setExDbSearch(e.target.value)}
                    placeholder="Rechercher un exercice..."
                    autoFocus
                    style={{ ...inputStyle, paddingLeft: 40, borderRadius: 12, fontSize: '0.88rem' }}
                  />
                </div>
                {/* Muscle group filter chips */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 14 }}>
                  {MUSCLE_FILTERS.map(mg => {
                    const active = exDbFilter === mg
                    const color = MUSCLE_COLORS[mg] ?? '#F97316'
                    return (
                      <button key={mg} onClick={() => setExDbFilter(mg)} style={{
                        flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                        border: `1px solid ${active ? color : '#374151'}`,
                        background: active ? `${color}22` : '#1F2937',
                        color: active ? color : '#6B7280',
                        fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 150ms',
                        fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em',
                      }}>
                        {mg}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Exercise grid */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 32px' }}>
                {(() => {
                  let list = exDbSearch.length >= 2 ? exDbResults : exDbAll
                  if (exDbFilter !== 'Tous') list = list.filter(ex => ex.muscle_group === exDbFilter)
                  if (list.length === 0) return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 0', color: '#6B7280' }}>
                      <Dumbbell size={32} strokeWidth={1.5} />
                      <p style={{ fontSize: '0.85rem', margin: 0 }}>
                        {exDbSearch.length >= 2 ? 'Aucun résultat' : exDbAll.length === 0 ? 'Chargement...' : 'Aucun exercice pour ce groupe'}
                      </p>
                    </div>
                  )
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {list.map((ex: any) => {
                        const mgColor = MUSCLE_COLORS[ex.muscle_group] ?? '#6B7280'
                        const diffColor = ex.difficulty === 'Avancé' ? '#EF4444' : ex.difficulty === 'Intermédiaire' ? '#F97316' : '#22C55E'
                        return (
                          <motion.button
                            key={ex.id}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => selectExercise(ex)}
                            style={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 14, padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'border-color 150ms' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = mgColor)}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = '#374151')}
                          >
                            <div style={{ height: 3, background: mgColor, width: '100%', flexShrink: 0 }} />
                            <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.2 }}>
                                {ex.name}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {ex.muscle_group && (
                                  <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: mgColor, background: `${mgColor}20`, borderRadius: 4, padding: '2px 6px', display: 'inline-block', width: 'fit-content' }}>
                                    {ex.muscle_group}
                                  </span>
                                )}
                                {ex.equipment && (
                                  <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#9CA3AF', background: '#2D3748', borderRadius: 4, padding: '2px 6px', display: 'inline-block', width: 'fit-content' }}>
                                    {ex.equipment}
                                  </span>
                                )}
                                {ex.difficulty && (
                                  <span style={{ fontSize: '0.58rem', fontWeight: 700, color: diffColor, background: `${diffColor}18`, borderRadius: 4, padding: '2px 6px', display: 'inline-block', width: 'fit-content' }}>
                                    {ex.difficulty}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      {/* ── AI PROGRAM GENERATOR MODAL ── */}
      <AnimatePresence>
        {showAiModal && (
          <motion.div
            key="ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => { if (!aiGenerating) setShowAiModal(false) }}
          >
            <motion.div
              key="ai-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #374151', background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.08))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7C3AED,#A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} color="#fff" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: '0.05em' }}>GÉNÉRER AVEC L&apos;IA</h2>
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>Claude génère un programme personnalisé</p>
                  </div>
                </div>
                {!aiGenerating && (
                  <button onClick={() => setShowAiModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#1F2937', border: '1px solid #374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={14} color="#6B7280" />
                  </button>
                )}
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>

                {/* Loading state */}
                {aiGenerating && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '56px 24px' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 1s linear infinite' }}>
                      <Loader2 size={28} color="#fff" strokeWidth={2} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: '0.04em' }}>L&apos;IA génère votre programme…</p>
                      <p style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 6 }}>Cela prend quelques secondes</p>
                    </div>
                  </div>
                )}

                {/* Preview state */}
                {!aiGenerating && aiPreview && (
                  <div style={{ padding: '20px 24px' }}>
                    <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: '#22C55E', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>✓ Programme généré — aperçu</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                      {DAYS.map(d => {
                        const day = aiPreview[d]
                        return (
                          <div key={d} style={{ background: '#1A1A2E', borderRadius: 10, padding: '10px 14px', border: `1px solid ${day.repos ? '#1F2937' : 'rgba(124,58,237,0.3)'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: day.repos ? '#4B5563' : '#A855F7', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                              </span>
                              {day.repos
                                ? <span style={{ fontSize: '0.72rem', color: '#4B5563', display: 'flex', alignItems: 'center', gap: 4 }}><Moon size={10} /> Repos</span>
                                : <span style={{ fontSize: '0.72rem', color: '#A855F7', fontWeight: 600 }}>{day.exercises.length} exercice{day.exercises.length !== 1 ? 's' : ''}</span>
                              }
                            </div>
                            {!day.repos && day.exercises.length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {day.exercises.map((ex, i) => (
                                  <span key={i} style={{ fontSize: '0.68rem', background: 'rgba(124,58,237,0.15)', color: '#C4B5FD', borderRadius: 6, padding: '2px 8px' }}>{ex.name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={generateAiProgram}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: '1px solid #374151', background: 'transparent', color: '#9CA3AF', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, transition: 'border-color 150ms, color 150ms' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6B7280'; (e.currentTarget as HTMLElement).style.color = '#F8FAFC' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#374151'; (e.currentTarget as HTMLElement).style.color = '#9CA3AF' }}
                      >
                        <Sparkles size={13} /> Régénérer
                      </button>
                      <button
                        onClick={acceptAiPreview}
                        style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em', transition: 'opacity 200ms' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        <Check size={15} strokeWidth={2.5} /> Accepter ce programme
                      </button>
                    </div>
                  </div>
                )}

                {/* Config form */}
                {!aiGenerating && !aiPreview && (
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Client context (auto-filled) */}
                    <div style={{ background: '#0F172A', borderRadius: 10, padding: '12px 16px', border: '1px solid #1E293B' }}>
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Contexte client (auto-rempli)</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <p style={{ fontSize: '0.68rem', color: '#6B7280', margin: '0 0 2px' }}>Objectif</p>
                          <p style={{ fontSize: '0.82rem', color: '#F8FAFC', margin: 0, fontWeight: 500 }}>{profile?.objective || '—'}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.68rem', color: '#6B7280', margin: '0 0 2px' }}>Poids actuel</p>
                          <p style={{ fontSize: '0.82rem', color: '#F8FAFC', margin: 0, fontWeight: 500 }}>{currentWeight ? `${currentWeight} kg` : '—'}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.68rem', color: '#6B7280', margin: '0 0 2px' }}>Poids cible</p>
                          <p style={{ fontSize: '0.82rem', color: '#F8FAFC', margin: 0, fontWeight: 500 }}>{profile?.target_weight ? `${profile.target_weight} kg` : '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Niveau */}
                    <div>
                      <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Niveau</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {AI_LEVELS.map(l => (
                          <button
                            key={l}
                            onClick={() => setAiLevel(l)}
                            style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${aiLevel === l ? '#A855F7' : '#374151'}`, background: aiLevel === l ? 'rgba(168,85,247,0.15)' : 'transparent', color: aiLevel === l ? '#A855F7' : '#6B7280', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, transition: 'all 150ms' }}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Équipement */}
                    <div>
                      <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Équipement disponible</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {AI_EQUIPMENT.map(item => {
                          const checked = aiEquipment.includes(item)
                          return (
                            <button
                              key={item}
                              onClick={() => toggleAiEquipment(item)}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px solid ${checked ? '#A855F7' : '#374151'}`, background: checked ? 'rgba(168,85,247,0.15)' : 'transparent', color: checked ? '#A855F7' : '#6B7280', cursor: 'pointer', fontSize: '0.82rem', fontWeight: checked ? 700 : 500, transition: 'all 150ms' }}
                            >
                              <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${checked ? '#A855F7' : '#4B5563'}`, background: checked ? '#A855F7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 150ms' }}>
                                {checked && <Check size={9} color="#fff" strokeWidth={3} />}
                              </div>
                              {item}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Jours d'entraînement */}
                    <div>
                      <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Jours d&apos;entraînement — <span style={{ color: '#A855F7' }}>{aiTrainingDays} jours/semaine</span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '0.78rem', color: '#6B7280', minWidth: 12 }}>3</span>
                        <input
                          type="range"
                          min={3}
                          max={5}
                          step={1}
                          value={aiTrainingDays}
                          onChange={e => setAiTrainingDays(parseInt(e.target.value))}
                          style={{ flex: 1, accentColor: '#A855F7', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.78rem', color: '#6B7280', minWidth: 12 }}>5</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        {[3, 4, 5].map(n => (
                          <span key={n} style={{ fontSize: '0.68rem', color: n === aiTrainingDays ? '#A855F7' : '#4B5563', fontWeight: n === aiTrainingDays ? 700 : 400 }}>{n}j</span>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Footer */}
              {!aiGenerating && !aiPreview && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid #374151' }}>
                  <button
                    onClick={generateAiProgram}
                    disabled={aiEquipment.length === 0}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, border: 'none', background: aiEquipment.length === 0 ? '#1F2937' : 'linear-gradient(135deg,#7C3AED,#A855F7)', color: aiEquipment.length === 0 ? '#4B5563' : '#fff', cursor: aiEquipment.length === 0 ? 'not-allowed' : 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em', transition: 'opacity 200ms' }}
                    onMouseEnter={e => { if (aiEquipment.length > 0) (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <Sparkles size={16} strokeWidth={2} />
                    Générer le programme
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <div className="toast-el">
          <CheckCircle size={15} color="#22C55E" strokeWidth={2}/>
          <span>{toast}</span>
        </div>
      )}
    </>
  )
}
