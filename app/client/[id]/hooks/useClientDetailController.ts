'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useExerciseInfo } from '../../../hooks/useExerciseInfo'
import { capitalizeFullName } from '@/lib/utils/capitalize-name'
import type { DatabaseClient } from '@/lib/supabase/types'
import { appendClientDetailWeight, loadClientDetailNutrition, loadClientDetailProfile, loadClientDetailProgression, loadClientDetailTraining, loadClientDetailWeeklyTracking, saveClientDetailMealPlan, saveClientDetailProgram, updateClientDetailProfile } from '@/lib/coaching/client-detail'
import { currentMonday, DAYS, MEAL_TYPES, defaultFood, defaultMealPlan, defaultProgram, normalizeAndSanitize, type Exercise, type FoodItem, type Profile, type WeekMealPlan, type WeekProgram, type WeightLog, type WorkoutSession } from './client-detail-contract'
import { useClientDetailAi } from './useClientDetailAi'
import { useClientDetailResources } from './useClientDetailResources'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/* ══════════════════════════════════════════════════════════════
   HOOK
══════════════════════════════════════════════════════════════ */
export default function useClientDetailController() {
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
  const [clientCustomPrograms, setClientCustomPrograms] = useState<any[]>([])
  const [coachTemplates, setCoachTemplates] = useState<any[]>([])
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

  const [activeTab,      setActiveTab]      = useState<'apercu'|'programme'|'progression'|'nutrition'|'notes'|'messages'>('apercu')

  const detailLoadGenerationRef = useRef(0)

  const [clientActivePlan, setClientActivePlan] = useState<any>(null)
  const [clientActivePlanDay, setClientActivePlanDay] = useState('lundi')

  // Progression data (coach view)
  const [weightLogsFull, setWeightLogsFull] = useState<any[]>([])
  const [bodyMeasurements, setBodyMeasurements] = useState<any[]>([])
  const [clientProgressPhotos, setClientProgressPhotos] = useState<any[]>([])
  const [clientCompletedSessions, setClientCompletedSessions] = useState<any[]>([])
  const [weeklyTracking, setWeeklyTracking] = useState<Record<string, Set<string>>>({})
  const [resolvedFoods, setResolvedFoods] = useState<{ id: string; name: string; emoji: string | null }[]>([])
  const [showAllFoods, setShowAllFoods] = useState(false)

  /* ── Toast ──────────────────────────────────────────────────── */
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  /* ── Fetch all data ─────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    const generation = ++detailLoadGenerationRef.current
    setLoading(true); setError(null)
    const profileResult = await loadClientDetailProfile(supabase as DatabaseClient, id)
    if (generation !== detailLoadGenerationRef.current) return
    if (profileResult.status !== 'success') {
      if (profileResult.status === 'anonymous') router.replace('/fr/landing')
      else setError(profileResult.status === 'unavailable' ? 'Profil indisponible' : 'Client introuvable')
      setLoading(false)
      return
    }
    const { scope, notes: loadedNotes } = profileResult.data
    setCoachId(scope.coachUserId)
    const progressionPromise = loadClientDetailProgression(supabase as DatabaseClient, scope)
    const [trainingResult, nutritionResult] = await Promise.all([
      loadClientDetailTraining(supabase as DatabaseClient, scope),
      loadClientDetailNutrition(supabase as DatabaseClient, scope, currentMonday()),
    ])
    if (generation !== detailLoadGenerationRef.current) return
    const trainingData = trainingResult.status === 'success' ? trainingResult.data : null
    const nutritionData = nutritionResult.status === 'success' ? nutritionResult.data : null
    const p = profileResult.data.profile as Profile
    setProfile(p)
    const pLiked = Array.isArray(p.liked_foods) ? p.liked_foods : []
    if (pLiked.length) {
      supabase.from('food_items').select('id,name').eq('source', 'fitness').in('id', pLiked).limit(200)
        .then(({ data: foods }: any) => { if (foods) setResolvedFoods(foods.map((f: any) => ({ id: f.id, name: f.name, emoji: null }))) })
    }
    setEditName(p.full_name ?? ''); setEditEmail(p.email ?? ''); setEditPhone(p.phone ?? ''); setEditBirth(p.birth_date ?? ''); setEditGender(p.gender ?? '')
    setEditWeight(p.current_weight != null ? String(p.current_weight) : '')
    setEditHeight(p.height != null ? String(p.height) : ''); setEditTargetW(p.target_weight != null ? String(p.target_weight) : '')
    setEditBodyFat(p.body_fat_pct != null ? String(p.body_fat_pct) : ''); setEditStatus(p.status ?? 'active'); setEditObj(p.objective ?? '')
    setCalGoalInput(p.calorie_goal != null ? String(p.calorie_goal) : '')
    setSessions((trainingData?.sessions ?? []) as WorkoutSession[]); setTotalSessionsCount(trainingData?.totalSessionsCount ?? 0)
    setWeightLogs([]); setNotes(loadedNotes)

    if (trainingData?.assignedProgram) {
      setProgramId(trainingData.assignedProgram.id)
      setProgram(normalizeAndSanitize(trainingData.assignedProgram.program))
    }
    setClientCustomPrograms([...(trainingData?.customPrograms ?? [])])
    setCoachTemplates([...(trainingData?.coachTemplates ?? [])])

    if (nutritionData?.assignedPlan) {
      const mp = nutritionData.assignedPlan; setMealPlanId(mp.id)
      setCalorieTarget(mp.calorie_target ?? 2000); setProtTarget(mp.protein_target ?? 150); setCarbTarget(mp.carb_target ?? 200); setFatTarget(mp.fat_target ?? 70)
      const merged = defaultMealPlan(); const saved = mp.plan as WeekMealPlan
      DAYS.forEach(d => { if (saved[d]) { merged[d] = { meals: MEAL_TYPES.map(type => { const existing = saved[d].meals?.find(m => m.type === type); return existing ?? { type, foods: [] } }) } } })
      setMealPlan(merged)
    }
    setClientActivePlan(nutritionData?.activePlan ?? null)
    setWeeklyTracking(nutritionData?.weeklyTracking as Record<string, Set<string>> ?? {})
    setLoading(false)

    const progressionResult = await progressionPromise
    if (generation !== detailLoadGenerationRef.current || progressionResult.status !== 'success') return
    const progressionData = progressionResult.data
    const latestW = progressionData.weights.at(-1)
    setEditWeight(latestW != null ? String(latestW.poids) : (p.current_weight != null ? String(p.current_weight) : ''))
    setWeightLogs(latestW ? [latestW] : [])
    setWeightLogsFull([...progressionData.weights])
    setBodyMeasurements([...progressionData.measurements])
    setClientProgressPhotos([...progressionData.photos])
    setClientCompletedSessions([...progressionData.completions])
  }, [id, router])

  const ai = useClientDetailAi({
    client: supabase as DatabaseClient,
    coachId,
    profile,
    calorieTarget,
    protTarget,
    carbTarget,
    fatTarget,
    setProgram,
    showToast,
    refresh: fetchData,
  })
  const resources = useClientDetailResources({ client: supabase as DatabaseClient, id, coachId, activeTab, setProgram })

  const fetchWeeklyTracking = useCallback(async () => {
    const d = new Date(); const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    const mondayDate = d.toISOString().split('T')[0]
    const result = await loadClientDetailWeeklyTracking(supabase as DatabaseClient, id, mondayDate)
    if (result.status === 'success') setWeeklyTracking(result.data as Record<string, Set<string>>)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => () => { detailLoadGenerationRef.current += 1 }, [id])
  useEffect(() => { const interval = setInterval(fetchWeeklyTracking, 30000); return () => clearInterval(interval) }, [fetchWeeklyTracking])

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
      const d = raw[day]
      if (!d || typeof d !== 'object') {
        toSave[day] = { repos: true, exercises: [], day_name: '' }
        continue
      }
      toSave[day] = { ...d, exercises: (d.exercises || []).map(ex => ({ ...ex, sets: ex.sets || 3, reps: ex.reps || 10, rest: ex.rest || '60s' })) }
    }
    setProgramSaving(true)
    const result = await saveClientDetailProgram(supabase as DatabaseClient, { coachUserId: coachId, clientUserId: id }, { programId, program: toSave, weekStart: currentMonday(), updatedAt: new Date().toISOString() })
    if (result.status === 'success' && result.data) setProgramId(result.data)
    setProgramSaving(false); setProgramSaved(true); showToast('Programme sauvegardé'); setTimeout(() => setProgramSaved(false), 2000)
  }

  const resyncFromTemplate = (template: { program: any }) => {
    const tplDays = template.program?.days
    if (!Array.isArray(tplDays)) return
    const newProgram = normalizeAndSanitize(tplDays)
    setProgram(newProgram)
    saveProgram(newProgram)
  }

  /* ── Programme helpers ──────────────────────────────────────── */
  const toggleRepos = (day: string) => {
    const current = program[day]
    if (!current?.repos && (current?.exercises || []).length > 0) {
      setSavedExercises(prev => ({ ...prev, [day]: current.exercises || [] }))
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
    const newProgram = { ...program, [variantPopup.day]: { ...program[variantPopup.day], exercises: (program[variantPopup.day].exercises || []).map((ex, i) => i === variantPopup.idx ? { ...ex, name: variant.name } : ex) } }
    setProgram(newProgram)
    setVariantPopup(null)
    saveProgram(newProgram)
  }
  const addExercise  = (day: string) => setProgram(p => ({ ...p, [day]: { ...p[day], exercises: [...(p[day]?.exercises || []), { name:'', sets:3, reps:10, rest:'60s', notes:'' }] } }))
  const removeExercise = (day: string, i: number) => setProgram(p => ({ ...p, [day]: { ...p[day], exercises: (p[day]?.exercises || []).filter((_,j) => j !== i) } }))

  const updateExercise = (day: string, i: number, field: keyof Exercise, val: string|number) =>
    setProgram(p => { const ex=[...(p[day]?.exercises || [])]; ex[i]={...ex[i],[field]:val}; return {...p,[day]:{...p[day],exercises:ex}} })

  /* ── Save meal plan ─────────────────────────────────────────── */
  const saveMealPlan = async () => {
    if (!coachId) return
    setMealPlanSaving(true)
    const payload = { coach_id: coachId, client_id: id, week_start: currentMonday(), calorie_target: Math.round(calorieTarget), protein_target: Math.round(protTarget), carb_target: Math.round(carbTarget), fat_target: Math.round(fatTarget), plan: mealPlan, updated_at: new Date().toISOString() }
    const result = await saveClientDetailMealPlan(supabase as DatabaseClient, { coachUserId: coachId, clientUserId: id }, { planId: mealPlanId, payload, calorieGoal: calorieTarget })
    if (result.status === 'success' && result.data) setMealPlanId(result.data)
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
      full_name: editName ? capitalizeFullName(editName) : null, phone: editPhone || null, birth_date: editBirth || null, gender: editGender || null,
      current_weight: editWeight ? parseFloat(editWeight) : null, height: editHeight ? parseFloat(editHeight) : null,
      target_weight: editTargetW ? parseFloat(editTargetW) : null, body_fat_pct: editBodyFat ? parseFloat(editBodyFat) : null,
      objective: editObj || null,
    }
    if (!coachId) return
    const result = await updateClientDetailProfile(supabase as DatabaseClient, { coachUserId: coachId, clientUserId: id }, updates)
    if (result.status === 'failure') { showToast('Erreur lors de la mise à jour'); return }
    if (editWeight) {
      const newWeight = parseFloat(editWeight)
      if (!isNaN(newWeight) && newWeight !== weightLogs[0]?.poids) {
        await appendClientDetailWeight(supabase as DatabaseClient, { coachUserId: coachId, clientUserId: id }, newWeight, new Date().toISOString().split('T')[0])
        setWeightLogs([{ id: 'local', poids: newWeight, date: new Date().toISOString().split('T')[0] }])
      }
    }
    setProfile(p => p ? { ...p, ...updates } : p)
    setEditOpen(false); showToast('Profil mis à jour')
  }

  /* ── Save calorie goal ──────────────────────────────────────── */
  async function saveCalorieGoal() {
    if (!coachId) return
    const val = parseInt(calGoalInput)
    if (!val || val <= 0) return
    const result = await updateClientDetailProfile(supabase as DatabaseClient, { coachUserId: coachId, clientUserId: id }, { calorie_goal: val })
    if (result.status === 'failure') { showToast('Erreur lors de la mise à jour'); return }
    setProfile(p => p ? { ...p, calorie_goal: val } : p)
    setEditingCalGoal(false); showToast('Objectif calorique mis à jour')
  }

  /* ── Save target weight ─────────────────────────────────────── */
  async function saveTargetWeight(val: number) {
    if (!profile || !coachId || isNaN(val) || val < 20) return
    const result = await updateClientDetailProfile(supabase as DatabaseClient, { coachUserId: coachId, clientUserId: id }, { target_weight: val })
    if (result.status === 'failure') return
    setProfile(p => p ? { ...p, target_weight: val } : p)
  }

  /* ── Save objective text ──────────────────────────────────────── */
  async function saveObjective(val: string | null) {
    if (!profile || !coachId) return
    const result = await updateClientDetailProfile(supabase as DatabaseClient, { coachUserId: coachId, clientUserId: id }, { objective: val })
    if (result.status === 'failure') return
    setProfile(p => p ? { ...p, objective: val } : p)
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
    id, router, supabase,
    // Core state
    profile, loading, error, toast, showToast,
    activeTab, setActiveTab,
    // Overview
    currentWeight, weightDelta, totalSessions, goalProgress, streak,
    sessions, totalSessionsCount,
    editingCalGoal, calGoalInput, setCalGoalInput, saveCalorieGoal, setEditingCalGoal,
    saveTargetWeight, saveObjective,
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
    programSaving, programSaved, saveProgram, resyncFromTemplate,
    clientCustomPrograms, coachTemplates,
    toggleRepos, addExercise, removeExercise, updateExercise, openExDbModal: resources.openExDbModal,
    swapMode, setSwapMode, swapFirst, handleDayClick,
    variantPopup, setVariantPopup, loadVariants, selectVariant,
    exerciseInfo, setExerciseInfo, loadExInfo,
    // Exercise DB modal
    showExDbModal: resources.showExDbModal, setShowExDbModal: resources.setShowExDbModal,
    exDbTargetDay: resources.exDbTargetDay, exDbSearch: resources.exDbSearch, setExDbSearch: resources.setExDbSearch,
    exDbResults: resources.exDbResults, exDbAll: resources.exDbAll, exDbFilter: resources.exDbFilter,
    setExDbFilter: resources.setExDbFilter, selectExercise: resources.selectExercise,
    // AI Program
    showAiModal: ai.showAiModal, setShowAiModal: ai.setShowAiModal, aiLevel: ai.aiLevel, setAiLevel: ai.setAiLevel,
    aiEquipment: ai.aiEquipment, aiTrainingDays: ai.aiTrainingDays, setAiTrainingDays: ai.setAiTrainingDays,
    aiGenerating: ai.aiGenerating, aiPreview: ai.aiPreview, setAiPreview: ai.setAiPreview,
    toggleAiEquipment: ai.toggleAiEquipment, generateAiProgram: ai.generateAiProgram, acceptAiPreview: ai.acceptAiPreview,
    AI_EQUIPMENT: ai.AI_EQUIPMENT, AI_LEVELS: ai.AI_LEVELS,
    // Nutrition
    mealPlan, setMealPlan, calorieTarget, protTarget, carbTarget, fatTarget,
    setCalorieTarget, setProtTarget, setCarbTarget, setFatTarget,
    mealPlanSaving, mealPlanSaved, saveMealPlan,
    expandedMealDay, setExpandedMealDay, addFood, removeFood, updateFood,
    // AI Meal Plan
    aiMealGenerating: ai.aiMealGenerating, aiMealStreamStatus: ai.aiMealStreamStatus,
    aiMealPreview: ai.aiMealPreview, aiMealPreviewDay: ai.aiMealPreviewDay,
    setAiMealPreviewDay: ai.setAiMealPreviewDay, setAiMealPreview: ai.setAiMealPreview,
    generateAiMealPlan: ai.generateAiMealPlan, acceptAiMealPlan: ai.acceptAiMealPlan,
    // Client active plan
    clientActivePlan, clientActivePlanDay, setClientActivePlanDay,
    // Weekly tracking
    weeklyTracking,
    // Messages
    coachId, coachMessages: resources.coachMessages, coachMsgInput: resources.coachMsgInput,
    setCoachMsgInput: resources.setCoachMsgInput, sendCoachMessage: resources.sendCoachMessage,
    // Notes
    notes, notesSaved, notesSaving, onNotesChange, saveNotes,
    // Progression
    weightLogsFull, bodyMeasurements, clientProgressPhotos, clientCompletedSessions,
  }
}
