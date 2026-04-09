'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useExerciseInfo } from '../../../hooks/useExerciseInfo'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */
export type Profile = {
  id: string; full_name: string | null; email: string | null
  current_weight: number | null
  calorie_goal: number | null; created_at: string
  phone: string | null; birth_date: string | null; gender: string | null
  height: number | null; target_weight: number | null
  body_fat_pct: number | null; objective: string | null; status: string | null
  dietary_type: string | null; allergies: string[] | null; liked_foods: string[] | null
  meal_preferences: Record<string, any> | null
  activity_level: string | null; tdee: number | null; protein_goal: number | null
  carbs_goal: number | null; fat_goal: number | null
}
export type WorkoutSession = {
  id: string; created_at: string; name: string | null
  completed: boolean | null; duration_minutes: number | null; notes: string | null
}
export type WeightLog = { id: string; poids: number; date: string }
export type Exercise = { name: string; sets: number; reps: number; rest: string; notes: string }
export type DayData   = { repos: boolean; exercises: Exercise[] }
export type WeekProgram = Record<string, DayData>
export type FoodItem = { name: string; qty: string; kcal: number; prot: number; carb: number; fat: number }
export type Meal      = { type: string; foods: FoodItem[] }
export type DayMealData = { meals: Meal[] }
export type WeekMealPlan = Record<string, DayMealData>

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
export const DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
export const DAY_LABELS: Record<string,string> = { lundi:'Lun', mardi:'Mar', mercredi:'Mer', jeudi:'Jeu', vendredi:'Ven', samedi:'Sam', dimanche:'Dim' }
const MEAL_TYPES = ['Petit-déjeuner','Déjeuner','Dîner','Collation']

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
   HOOK
══════════════════════════════════════════════════════════════ */
export default function useClientDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { exerciseInfo, setExerciseInfo, loadExerciseInfo: loadExInfo } = useExerciseInfo(supabase)

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
  const [savedExercises, setSavedExercises] = useState<Record<string, Exercise[]>>({})
  const [swapMode, setSwapMode] = useState(false)
  const [swapFirst, setSwapFirst] = useState<string | null>(null)
  const [variantPopup, setVariantPopup] = useState<{day: string, idx: number, variants: any[]} | null>(null)

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
        body: JSON.stringify({ objective, weight, targetWeight, level: aiLevel, equipment, trainingDays: aiTrainingDays }),
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
            name: ex.name ?? '', sets: ex.sets ?? 3, reps: ex.reps ?? 10, rest: ex.rest ?? '60s', notes: ex.notes ?? '',
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
      setAiMealStreamStatus('Chargement des aliments...')
      let availableFoods: any[] = []
      const likedArr = Array.isArray(profile.liked_foods) ? profile.liked_foods : []
      if (likedArr.length) {
        const { data: foods } = await supabase
          .from('food_items')
          .select('id, name, energy_kcal, proteins, carbohydrates, fat')
          .in('id', likedArr)
          .limit(200)
        availableFoods = (foods || []).map((f: any) => ({
          id: f.id, nom: f.name || '', kcal: Math.round(f.energy_kcal ?? 0),
          p: Math.round((f.proteins ?? 0) * 10) / 10, g: Math.round((f.carbohydrates ?? 0) * 10) / 10, l: Math.round((f.fat ?? 0) * 10) / 10,
        }))
      }
      if (availableFoods.length < 10) {
        const { data: fallback } = await supabase
          .from('food_items')
          .select('id, name, energy_kcal, proteins, carbohydrates, fat')
          .eq('source', 'fitness')
          .not('name', 'is', null)
          .order('name')
          .limit(200)
        const extra = (fallback || []).map((f: any) => ({
          id: f.id, nom: f.name || '', kcal: Math.round(f.energy_kcal ?? 0),
          p: Math.round((f.proteins ?? 0) * 10) / 10, g: Math.round((f.carbohydrates ?? 0) * 10) / 10, l: Math.round((f.fat ?? 0) * 10) / 10,
        }))
        const seen = new Set(availableFoods.map((f: any) => f.nom))
        availableFoods.push(...extra.filter((f: any) => !seen.has(f.nom)))
      }

      // Fetch scanned foods
      const { data: scannedRaw } = await supabase.from('custom_foods').select('name, brand, calories_per_100g, proteins_per_100g, carbs_per_100g, fats_per_100g, scan_count').eq('user_id', profile.id).not('barcode', 'is', null).order('scan_count', { ascending: false }).limit(20)
      const scannedFoods = (scannedRaw || []).map((f: any) => ({ name: f.name, brand: f.brand || '', calories: f.calories_per_100g, proteins: f.proteins_per_100g, carbs: f.carbs_per_100g, fat: f.fats_per_100g }))

      // Parse meal_preferences to get per-meal food names
      const mp = profile.meal_preferences && typeof profile.meal_preferences === 'object' ? profile.meal_preferences : {}
      const foodNameMap = new Map(availableFoods.map((f: any) => [f.id, f.nom]))
      // Also map by ID from liked foods fetch
      const resolveNames = (ids: string[]) => (Array.isArray(ids) ? ids : []).map(id => foodNameMap.get(id)).filter(Boolean) as string[]
      const mealFoodNames = {
        morning: resolveNames(mp.petit_dejeuner || []),
        lunch: resolveNames(mp.dejeuner || []),
        snack: resolveNames(mp.collation || []),
        dinner: resolveNames(mp.diner || []),
      }

      setAiMealStreamStatus("Connexion à l'IA...")
      const res = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          calorie_goal: profile.calorie_goal || profile.tdee || calorieTarget,
          protein_goal: profile.protein_goal || protTarget,
          carbs_goal: profile.carbs_goal || carbTarget,
          fat_goal: profile.fat_goal || fatTarget,
          dietary_type: profile.dietary_type, allergies: profile.allergies,
          disliked_foods: profile.meal_preferences?.disliked_foods || [],
          objective: profile.objective, available_foods: availableFoods,
          meal_food_names: mealFoodNames, scanned_foods: scannedFoods,
          objective_mode: profile.objective === 'weight_loss' ? 'seche' : profile.objective === 'mass' ? 'bulk' : 'maintien',
          caloric_adjustment: (profile.calorie_goal || 0) - (profile.tdee || profile.calorie_goal || 0),
          tdee: profile.tdee,
          activity_level: profile.activity_level,
        }),
      })

      if (!res.ok) throw new Error(`Erreur ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let plan: any = null
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'progress') setAiMealStreamStatus(`Génération jour ${evt.index}/7 — ${evt.day}...`)
            else if (evt.type === 'done') plan = evt.plan
          } catch { /* skip malformed lines */ }
        }
      }

      if (!plan) throw new Error('Aucun plan reçu')
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
    // Round all numeric values to integers for DB integer columns
    const roundPlan = (plan: any) => {
      const rounded = { ...plan }
      for (const day of Object.keys(rounded)) {
        const d = rounded[day]
        if (!d || typeof d !== 'object') continue
        d.total_kcal = Math.round(d.total_kcal || 0)
        d.total_protein = Math.round(d.total_protein || 0)
        d.total_carbs = Math.round(d.total_carbs || 0)
        d.total_fat = Math.round(d.total_fat || 0)
        if (d.repas) {
          for (const foods of Object.values(d.repas) as any[]) {
            if (!Array.isArray(foods)) continue
            for (const f of foods) {
              f.quantite_g = Math.round(f.quantite_g || 0)
              f.kcal = Math.round(f.kcal || 0)
              f.proteines = Math.round(f.proteines || 0)
              f.glucides = Math.round(f.glucides || 0)
              f.lipides = Math.round(f.lipides || 0)
            }
          }
        }
      }
      return rounded
    }
    const roundedPlan = roundPlan(planData)
    const { error } = await supabase.from('meal_plans').insert({
      user_id: profile.id, created_by: coachId,
      total_calories: Math.round(lundi.total_kcal || calorieTarget),
      protein_g: Math.round(lundi.total_protein || protTarget),
      carbs_g: Math.round(lundi.total_carbs || carbTarget),
      fat_g: Math.round(lundi.total_fat || fatTarget),
      objective: profile.objective, plan_data: roundedPlan, is_active: true,
    })
    if (error) { showToast(`Erreur : ${error.message}`) } else { setAiMealPreview(null); showToast('Plan alimentaire IA envoyé au client'); fetchData() }
  }

  /* ── Toast ──────────────────────────────────────────────────── */
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  /* ── Auth ───────────────────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/landing'); return }
      setCoachId(session.user.id)
    })
  }, [router])

  /* ── Fetch all data ─────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!coachId) return
    setLoading(true); setError(null)

    const [profileRes, sessionsRes, sessionsCountRes, weightRes, notesRes, programRes, mealPlanRes, activePlanRes] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,current_weight,calorie_goal,created_at,phone,birth_date,gender,height,target_weight,body_fat_pct,objective,status,dietary_type,allergies,liked_foods,meal_preferences,activity_level,tdee,protein_goal,carbs_goal,fat_goal').eq('id', id).single(),
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
    const pLiked = Array.isArray(p.liked_foods) ? p.liked_foods : []
    if (pLiked.length) {
      supabase.from('food_items').select('id,name').eq('source', 'fitness').in('id', pLiked).limit(200)
        .then(({ data: foods }: any) => { if (foods) setResolvedFoods(foods.map((f: any) => ({ id: f.id, name: f.name, emoji: null }))) })
    }
    setEditName(p.full_name ?? ''); setEditEmail(p.email ?? ''); setEditPhone(p.phone ?? ''); setEditBirth(p.birth_date ?? ''); setEditGender(p.gender ?? '')
    const latestW = (weightRes.data as WeightLog[] | null)?.[0]
    setEditWeight(latestW != null ? String(latestW.poids) : (p.current_weight != null ? String(p.current_weight) : ''))
    setEditHeight(p.height != null ? String(p.height) : ''); setEditTargetW(p.target_weight != null ? String(p.target_weight) : '')
    setEditBodyFat(p.body_fat_pct != null ? String(p.body_fat_pct) : ''); setEditStatus(p.status ?? 'active'); setEditObj(p.objective ?? '')
    setCalGoalInput(p.calorie_goal != null ? String(p.calorie_goal) : '')
    setSessions((sessionsRes.data ?? []) as WorkoutSession[]); setTotalSessionsCount(sessionsCountRes.count ?? 0)
    setWeightLogs((weightRes.data ?? []) as WeightLog[]); setNotes(notesRes.data?.content ?? '')

    if (programRes.data) { setProgramId(programRes.data.id); setProgram({ ...defaultProgram(), ...(programRes.data.program as WeekProgram) }) }
    if (mealPlanRes.data) {
      const mp = mealPlanRes.data; setMealPlanId(mp.id)
      setCalorieTarget(mp.calorie_target ?? 2000); setProtTarget(mp.protein_target ?? 150); setCarbTarget(mp.carb_target ?? 200); setFatTarget(mp.fat_target ?? 70)
      const merged = defaultMealPlan(); const saved = mp.plan as WeekMealPlan
      DAYS.forEach(d => { if (saved[d]) { merged[d] = { meals: MEAL_TYPES.map(type => { const existing = saved[d].meals?.find(m => m.type === type); return existing ?? { type, foods: [] } }) } } })
      setMealPlan(merged)
    }
    if (activePlanRes.data) setClientActivePlan(activePlanRes.data)
    await fetchWeeklyTracking()
    setLoading(false)
  }, [coachId, id])

  const fetchWeeklyTracking = useCallback(async () => {
    const d = new Date(); const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    const mondayDate = d.toISOString().split('T')[0]
    const { data: trackingData } = await supabase.from('meal_tracking').select('date,meal_type,is_completed').eq('user_id', id).gte('date', mondayDate).eq('is_completed', true).limit(200)
    if (trackingData) {
      const map: Record<string, Set<string>> = {}
      for (const r of trackingData) { if (!map[r.date]) map[r.date] = new Set(); map[r.date].add(r.meal_type) }
      setWeeklyTracking(map)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const interval = setInterval(fetchWeeklyTracking, 30000); return () => clearInterval(interval) }, [fetchWeeklyTracking])

  // Coach messaging
  const loadCoachMessages = useCallback(async () => {
    if (!coachId || !id) return
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${coachId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${coachId})`)
      .order('created_at', { ascending: true })
      .limit(100)
    setCoachMessages(data || [])
  }, [coachId, id])

  useEffect(() => {
    if (activeTab === 'messages') {
      loadCoachMessages()
      supabase.from('messages').update({ read: true }).eq('sender_id', id).eq('receiver_id', coachId).eq('read', false)
    }
  }, [activeTab, loadCoachMessages])

  // Realtime for coach
  useEffect(() => {
    if (!coachId || !id) return
    const channel = supabase.channel(`coach-msg-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${coachId}` }, (payload: any) => {
        if (payload.new.sender_id === id) setCoachMessages(prev => [...prev, payload.new])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coachId, id])

  async function sendCoachMessage() {
    if (!coachMsgInput.trim() || !coachId || !id) return
    const content = coachMsgInput.trim(); setCoachMsgInput('')
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
    setNotesSaving(false); setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000)
  }
  const onNotesChange = (val: string) => {
    setNotes(val); setNotesSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNotes(), 3000)
  }

  /* ── Save programme ─────────────────────────────────────────── */
  const saveProgram = async (programOverride?: typeof program) => {
    if (!coachId) return
    const raw = programOverride || program
    // Clean empty numeric values before saving
    const toSave: typeof program = {}
    for (const day of Object.keys(raw)) {
      toSave[day] = { ...raw[day], exercises: raw[day].exercises.map(ex => ({ ...ex, sets: ex.sets || 3, reps: ex.reps || 10, rest: ex.rest || '60s' })) }
    }
    setProgramSaving(true)
    if (programId) {
      await supabase.from('client_programs').update({ program: toSave, updated_at: new Date().toISOString() }).eq('id', programId)
    } else {
      const { data } = await supabase.from('client_programs').insert({ coach_id: coachId, client_id: id, week_start: currentMonday(), program: toSave }).select('id').single()
      if (data?.id) setProgramId(data.id)
    }
    setProgramSaving(false); setProgramSaved(true); showToast('Programme sauvegardé'); setTimeout(() => setProgramSaved(false), 2000)
  }

  /* ── Programme helpers ──────────────────────────────────────── */
  const toggleRepos = (day: string) => {
    const current = program[day]
    if (!current.repos && current.exercises.length > 0) {
      setSavedExercises(prev => ({ ...prev, [day]: current.exercises }))
    }
    const newProgram = {
      ...program,
      [day]: {
        ...current,
        repos: !current.repos,
        exercises: !current.repos ? [] : (savedExercises[day] || []),
      },
    }
    setProgram(newProgram)
    saveProgram(newProgram)
  }
  const handleDayClick = (day: string) => {
    if (!swapMode) {
      setExpandedDay(expandedDay === day ? null : day)
      return
    }
    if (!swapFirst) {
      setSwapFirst(day)
      return
    }
    if (swapFirst === day) {
      setSwapFirst(null)
      return
    }
    const newProgram = {
      ...program,
      [swapFirst!]: { ...program[day] },
      [day]: { ...program[swapFirst!] },
    }
    setProgram(newProgram)
    setSwapFirst(null)
    setSwapMode(false)
    saveProgram(newProgram)
  }
  async function loadVariants(exerciseName: string, day: string, idx: number) {
    const { data: current } = await supabase
      .from('exercises_db').select('variant_group')
      .ilike('name', exerciseName).limit(1).maybeSingle()
    if (!current?.variant_group) {
      const baseName = exerciseName.split(' ').slice(0, 2).join(' ')
      const { data: similar } = await supabase
        .from('exercises_db').select('name, equipment, muscle_group')
        .ilike('name', `%${baseName}%`).neq('name', exerciseName).limit(8)
      setVariantPopup({ day, idx, variants: similar || [] })
      return
    }
    const { data: variants } = await supabase
      .from('exercises_db').select('name, equipment, muscle_group')
      .eq('variant_group', current.variant_group)
      .neq('name', exerciseName).order('equipment').limit(10)
    setVariantPopup({ day, idx, variants: variants || [] })
  }
  function selectVariant(variant: any) {
    if (!variantPopup) return
    const newProgram = { ...program, [variantPopup.day]: { ...program[variantPopup.day], exercises: program[variantPopup.day].exercises.map((ex, i) => i === variantPopup.idx ? { ...ex, name: variant.name } : ex) } }
    setProgram(newProgram)
    setVariantPopup(null)
    saveProgram(newProgram)
  }
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
    const payload = { coach_id: coachId, client_id: id, week_start: currentMonday(), calorie_target: Math.round(calorieTarget), protein_target: Math.round(protTarget), carb_target: Math.round(carbTarget), fat_target: Math.round(fatTarget), plan: mealPlan, updated_at: new Date().toISOString() }
    await Promise.all([
      mealPlanId
        ? supabase.from('client_meal_plans').update(payload).eq('id', mealPlanId)
        : supabase.from('client_meal_plans').insert(payload).select('id').single().then(({ data }) => { if (data?.id) setMealPlanId(data.id) }),
      supabase.from('profiles').update({ calorie_goal: calorieTarget }).eq('id', id),
    ])
    setProfile(p => p ? { ...p, calorie_goal: calorieTarget } : p)
    setMealPlanSaving(false); setMealPlanSaved(true); showToast('Plan alimentaire sauvegardé'); setTimeout(() => setMealPlanSaved(false), 2000)
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
    const updates: Record<string, unknown> = {
      full_name: editName || null, phone: editPhone || null, birth_date: editBirth || null, gender: editGender || null,
      current_weight: editWeight ? parseFloat(editWeight) : null, height: editHeight ? parseFloat(editHeight) : null,
      target_weight: editTargetW ? parseFloat(editTargetW) : null, body_fat_pct: editBodyFat ? parseFloat(editBodyFat) : null,
      status: editStatus, objective: editObj || null,
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', id)
    if (error) { console.error('[saveProfile] Supabase error:', error); showToast(`Erreur : ${error.message}`); return }
    if (editWeight) {
      const newWeight = parseFloat(editWeight)
      if (!isNaN(newWeight) && newWeight !== weightLogs[0]?.poids) {
        await supabase.from('weight_logs').insert({ user_id: id, poids: newWeight, date: new Date().toISOString().split('T')[0] })
        setWeightLogs([{ id: 'local', poids: newWeight, date: new Date().toISOString().split('T')[0] }])
      }
    }
    setProfile(p => p ? { ...p, ...updates } : p)
    setEditOpen(false); showToast('Profil mis à jour')
  }

  /* ── Save calorie goal ──────────────────────────────────────── */
  async function saveCalorieGoal() {
    const val = parseInt(calGoalInput)
    if (!val || val <= 0) return
    const { error } = await supabase.from('profiles').update({ calorie_goal: val }).eq('id', id)
    if (error) { console.error('[saveCalorieGoal] Supabase error:', error); showToast(`Erreur : ${error.message}`); return }
    setProfile(p => p ? { ...p, calorie_goal: val } : p)
    setEditingCalGoal(false); showToast('Objectif calorique mis à jour')
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

  return {
    // Router
    id, router,
    // Core state
    profile, loading, error, toast, showToast,
    activeTab, setActiveTab,
    // Overview
    currentWeight, weightDelta, totalSessions, goalProgress, streak,
    sessions, totalSessionsCount,
    editingCalGoal, calGoalInput, setCalGoalInput, saveCalorieGoal, setEditingCalGoal,
    showAllFoods, setShowAllFoods, resolvedFoods,
    // Edit modal
    editOpen, setEditOpen, editTab, setEditTab,
    editName, setEditName, editEmail, setEditEmail, editPhone, setEditPhone,
    editBirth, setEditBirth, editGender, setEditGender,
    editWeight, setEditWeight, editHeight, setEditHeight,
    editTargetW, setEditTargetW, editBodyFat, setEditBodyFat,
    editStatus, setEditStatus, editObj, setEditObj, saveEdit,
    // Programme
    program, expandedDay, setExpandedDay,
    programSaving, programSaved, saveProgram,
    toggleRepos, addExercise, removeExercise, updateExercise, openExDbModal,
    swapMode, setSwapMode, swapFirst, handleDayClick,
    variantPopup, setVariantPopup, loadVariants, selectVariant,
    exerciseInfo, setExerciseInfo, loadExInfo,
    // Exercise DB modal
    showExDbModal, setShowExDbModal, exDbTargetDay, exDbSearch, setExDbSearch,
    exDbResults, exDbAll, exDbFilter, setExDbFilter, selectExercise,
    // AI Program
    showAiModal, setShowAiModal, aiLevel, setAiLevel, aiEquipment, aiTrainingDays, setAiTrainingDays,
    aiGenerating, aiPreview, setAiPreview, toggleAiEquipment, generateAiProgram, acceptAiPreview,
    AI_EQUIPMENT, AI_LEVELS,
    // Nutrition
    mealPlan, calorieTarget, protTarget, carbTarget, fatTarget,
    setCalorieTarget, setProtTarget, setCarbTarget, setFatTarget,
    mealPlanSaving, mealPlanSaved, saveMealPlan,
    expandedMealDay, setExpandedMealDay, addFood, removeFood, updateFood,
    // AI Meal Plan
    aiMealGenerating, aiMealStreamStatus, aiMealPreview, aiMealPreviewDay,
    setAiMealPreviewDay, setAiMealPreview, generateAiMealPlan, acceptAiMealPlan,
    // Client active plan
    clientActivePlan, clientActivePlanDay, setClientActivePlanDay,
    // Weekly tracking
    weeklyTracking,
    // Messages
    coachId, coachMessages, coachMsgInput, setCoachMsgInput, sendCoachMessage,
    // Notes
    notes, notesSaved, notesSaving, onNotesChange, saveNotes,
  }
}
