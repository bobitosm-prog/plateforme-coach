'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Zap, Mail, Calendar, Scale, Target, Dumbbell,
  Flame, TrendingDown, CheckCircle, CalendarClock, Save,
  Archive, Trash2, Check, X, Plus, Minus, Moon, Utensils, Search,
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
  current_weight: number | null; goal_weight: number | null
  calorie_goal: number | null; created_at: string
  phone: string | null; birth_date: string | null; gender: string | null
  height: number | null; target_weight: number | null
  body_fat_pct: number | null; objective: string | null; status: string | null
}
type WorkoutSession = {
  id: string; date: string; session_type: string | null
  duration_min: number | null; notes: string | null
}
type WeightLog = { id: string; weight: number; recorded_at: string }

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

    const [profileRes, sessionsRes, weightRes, notesRes, programRes, mealPlanRes] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,current_weight,goal_weight,calorie_goal,created_at,phone,birth_date,gender,height,target_weight,body_fat_pct,objective,status').eq('id', id).single(),
      supabase.from('workout_sessions').select('id,date,session_type,duration_min,notes').eq('user_id', id).order('date', { ascending: false }).limit(20),
      supabase.from('weight_logs').select('id,weight,recorded_at').eq('user_id', id).order('recorded_at', { ascending: false }).limit(30),
      supabase.from('coach_notes').select('content').eq('coach_id', coachId).eq('client_id', id).maybeSingle(),
      supabase.from('client_programs').select('id,program').eq('coach_id', coachId).eq('client_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('client_meal_plans').select('id,calorie_target,protein_target,carb_target,fat_target,plan').eq('coach_id', coachId).eq('client_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (profileRes.error) { setError(profileRes.error.message); setLoading(false); return }
    const p = profileRes.data as Profile
    setProfile(p)
    setEditName(p.full_name ?? '')
    setEditEmail(p.email ?? '')
    setEditPhone(p.phone ?? '')
    setEditBirth(p.birth_date ?? '')
    setEditGender(p.gender ?? '')
    setEditWeight(p.current_weight != null ? String(p.current_weight) : '')
    setEditHeight(p.height != null ? String(p.height) : '')
    setEditTargetW(p.target_weight != null ? String(p.target_weight) : '')
    setEditBodyFat(p.body_fat_pct != null ? String(p.body_fat_pct) : '')
    setEditStatus(p.status ?? 'active')
    setEditObj(p.objective ?? '')
    setSessions((sessionsRes.data ?? []) as WorkoutSession[])
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
    setLoading(false)
  }, [coachId, id])

  useEffect(() => { fetchData() }, [fetchData])

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
    const updates = {
      full_name: editName, email: editEmail, phone: editPhone || null,
      birth_date: editBirth || null, gender: editGender || null,
      current_weight: editWeight ? parseFloat(editWeight) : null,
      height: editHeight ? parseFloat(editHeight) : null,
      target_weight: editTargetW ? parseFloat(editTargetW) : null,
      body_fat_pct: editBodyFat ? parseFloat(editBodyFat) : null,
      status: editStatus, objective: editObj || null,
    }
    await supabase.from('profiles').update(updates).eq('id', id)
    setProfile(p => p ? { ...p, ...updates } : p)
    setEditOpen(false); showToast('Profil mis à jour')
  }

  /* ── Derived metrics ────────────────────────────────────────── */
  const currentWeight   = weightLogs[0]?.weight ?? profile?.current_weight ?? null
  const prevMonthWeight = weightLogs.find(w => { const d=new Date(w.recorded_at),n=new Date(); return d.getMonth()!==n.getMonth()||d.getFullYear()!==n.getFullYear() })?.weight ?? null
  const weightDelta     = currentWeight && prevMonthWeight ? currentWeight - prevMonthWeight : null
  const totalSessions   = sessions.length
  const goalProgress = (() => {
    if (!currentWeight || !profile?.goal_weight || !profile?.current_weight) return null
    const start=profile.current_weight, target=profile.goal_weight
    if (start===target) return 100
    return Math.max(0, Math.min(100, Math.round(((start-currentWeight)/(start-target))*100)))
  })()
  const streak = (() => {
    if (!sessions.length) return 0
    const dates=[...new Set(sessions.map(s=>s.date))].sort((a,b)=>b.localeCompare(a))
    let count=0; let cursor=new Date(); cursor.setHours(0,0,0,0)
    for (const d of dates) {
      const sd=new Date(d); sd.setHours(0,0,0,0)
      if (Math.round((cursor.getTime()-sd.getTime())/86400000)<=1) { count++; cursor=sd } else break
    }
    return count
  })()

  /* ── Loading / error ────────────────────────────────────────── */
  if (loading) return (
    <div style={{minHeight:'100vh',background:'#111827',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid #374151',borderTopColor:'#F97316',animation:'spin 0.7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (error || !profile) return (
    <div style={{minHeight:'100vh',background:'#111827',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <p style={{color:'#EF4444',fontSize:'0.9rem'}}>{error ?? 'Client introuvable'}</p>
      <button onClick={()=>router.back()} style={{color:'#F97316',background:'none',border:'1px solid #F97316',borderRadius:8,padding:'8px 18px',cursor:'pointer',fontFamily:'Barlow Condensed,sans-serif',fontWeight:600}}>← Retour</button>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        body{margin:0;font-family:'Barlow',sans-serif;background:#111827;color:#F8FAFC;}
        h1,h2,h3,h4{font-family:'Barlow Condensed',sans-serif;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .metric-card{background:#1F2937;border:1px solid #374151;border-radius:12px;padding:16px;transition:box-shadow 200ms ease;}
        .metric-card:hover{box-shadow:0 10px 15px rgba(0,0,0,.15);}
        .card{background:#1F2937;border:1px solid #374151;border-radius:12px;padding:20px;}
        .section-title{font-family:'Barlow Condensed',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:16px;}
        .btn-primary{display:inline-flex;align-items:center;gap:8px;background:#22C55E;color:#fff;padding:10px 20px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:.95rem;font-weight:600;letter-spacing:.04em;border:none;cursor:pointer;transition:opacity 200ms ease,transform 200ms ease;}
        .btn-primary:hover{opacity:.9;transform:translateY(-1px);}
        .btn-secondary{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#F97316;border:2px solid #F97316;padding:8px 18px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:.95rem;font-weight:600;letter-spacing:.04em;cursor:pointer;transition:background 200ms ease,color 200ms ease;}
        .btn-secondary:hover{background:#F97316;color:#fff;}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#9CA3AF;border:none;padding:7px 12px;border-radius:8px;font-family:'Barlow',sans-serif;font-size:.875rem;font-weight:500;cursor:pointer;transition:background 150ms ease,color 150ms ease;}
        .btn-ghost:hover{background:#374151;color:#F8FAFC;}
        .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-family:'Barlow Condensed',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}
        .badge-active{background:rgba(34,197,94,.15);color:#22C55E;}
        .badge-warning{background:rgba(249,115,22,.15);color:#F97316;}
        .badge-inactive{background:rgba(156,163,175,.12);color:#9CA3AF;}
        .data-table{width:100%;border-collapse:collapse;}
        .data-table thead th{font-family:'Barlow Condensed',sans-serif;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#6B7280;padding:10px 16px;text-align:left;border-bottom:1px solid #374151;}
        .data-table tbody tr{border-bottom:1px solid #1F2937;transition:background 150ms ease;}
        .data-table tbody tr:last-child{border-bottom:none;}
        .data-table tbody tr:hover{background:#374151;}
        .data-table tbody td{padding:13px 16px;font-size:.875rem;color:#F8FAFC;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;pointer-events:none;transition:opacity 200ms ease;}
        .modal-overlay.open{opacity:1;pointer-events:all;}
        .modal{background:#1F2937;border-radius:16px;padding:32px;max-width:480px;width:92%;transform:translateY(12px);transition:transform 200ms ease;}
        .modal-overlay.open .modal{transform:translateY(0);}
        .toast-el{position:fixed;bottom:24px;right:24px;background:#1F2937;border:1px solid #374151;border-left:3px solid #22C55E;color:#F8FAFC;padding:12px 18px;border-radius:8px;font-size:.875rem;font-weight:500;display:flex;align-items:center;gap:8px;z-index:200;animation:fadeIn 200ms ease;box-shadow:0 10px 15px rgba(0,0,0,.3);}
        .ex-row{display:grid;grid-template-columns:1fr 56px 56px 64px 1fr 28px;gap:6px;align-items:center;padding:8px 0;border-bottom:1px solid #1F2937;}
        .ex-row:last-child{border-bottom:none;}
        .col-hdr{font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;margin-bottom:3px;}
        .food-row{display:grid;grid-template-columns:1fr 64px 72px 64px 64px 64px 28px;gap:5px;align-items:center;padding:6px 0;border-bottom:1px solid #1a2232;}
        .food-row:last-child{border-bottom:none;}
        .day-tab-active{background:#F97316!important;color:#fff!important;box-shadow:0 0 0 2px #F97316;}
        input[type=number]::-webkit-inner-spin-button{opacity:.4;}
      `}</style>

      {/* ── NAVBAR ────────────────────────────────────────────────── */}
      <nav style={{background:'#1F2937',borderBottom:'1px solid #374151',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:1152,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:64}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button onClick={()=>router.push('/coach')} className="btn-ghost" style={{padding:'7px 10px'}}>
              <ArrowLeft size={16} strokeWidth={2.5}/><span>Dashboard</span>
            </button>
            <div style={{width:1,height:20,background:'#374151'}}/>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,background:'#F97316',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Zap size={15} color="#fff" strokeWidth={2.5}/>
              </div>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.2rem',fontWeight:700,color:'#F8FAFC',letterSpacing:'0.08em'}}>FITPRO</span>
            </div>
          </div>
          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#F97316,#FB923C)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'0.8rem',color:'#fff'}}>
            {initials(profile.full_name)}
          </div>
        </div>
      </nav>

      {/* ── MAIN ──────────────────────────────────────────────────── */}
      <main style={{maxWidth:1152,margin:'0 auto',padding:'32px 24px'}}>

        {/* CLIENT HEADER */}
        <div className="card" style={{marginBottom:24}}>
          <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:20}}>
            <div style={{position:'relative',flexShrink:0}}>
              <div style={{width:72,height:72,borderRadius:'50%',background:'#F97316',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.6rem',fontWeight:700,color:'#fff',border:'3px solid #1F2937',boxShadow:'0 0 0 2px #F97316'}}>
                {initials(profile.full_name)}
              </div>
              <div style={{position:'absolute',bottom:2,right:2,width:14,height:14,background:'#22C55E',borderRadius:'50%',border:'2px solid #1F2937'}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:12,marginBottom:4}}>
                <h1 style={{fontSize:'1.75rem',fontWeight:700,color:'#F8FAFC',margin:0}}>{profile.full_name ?? 'Client'}</h1>
                {(() => {
                  const s = profile.status ?? 'active'
                  const cfg = s==='warning' ? {cls:'badge-warning',label:'À relancer'} : s==='inactive' ? {cls:'badge-inactive',label:'Inactif'} : {cls:'badge-active',label:'Actif'}
                  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                })()}
                {profile.objective && (() => {
                  const labels: Record<string,string> = {perte_poids:'📉 Perte de poids',prise_masse:'💪 Prise de masse',maintien:'⚖️ Maintien',performance:'🏆 Performance'}
                  return <span style={{fontSize:'0.78rem',color:'#6B7280',background:'rgba(255,255,255,.05)',border:'1px solid #374151',borderRadius:6,padding:'2px 8px'}}>{labels[profile.objective] ?? profile.objective}</span>
                })()}
              </div>
              <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'4px 20px',marginTop:4}}>
                {profile.email && <span style={{fontSize:'0.85rem',color:'#6B7280',display:'flex',alignItems:'center',gap:5}}><Mail size={13} strokeWidth={2}/>{profile.email}</span>}
                <span style={{fontSize:'0.85rem',color:'#6B7280',display:'flex',alignItems:'center',gap:5}}><Calendar size={13} strokeWidth={2}/>Client depuis {formatMonthYear(profile.created_at)}</span>
              </div>
            </div>
            <button className="btn-secondary" onClick={()=>{ setEditTab('info'); setEditOpen(true) }}>Modifier</button>
          </div>
        </div>

        {/* TWO-COLUMN */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:24}}>

          {/* ── LEFT (2/3) ────────────────────────────────────────── */}
          <div style={{display:'flex',flexDirection:'column',gap:24}}>

            {/* MÉTRIQUES */}
            <section>
              <p className="section-title">Métriques clés</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                {/* Poids */}
                <div className="metric-card">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Poids</span>
                    <div style={{width:30,height:30,background:'rgba(249,115,22,.12)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}><Scale size={14} color="#F97316" strokeWidth={2}/></div>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'2rem',fontWeight:700,color:'#F8FAFC',lineHeight:1}}>
                    {currentWeight ?? '—'}<span style={{fontSize:'1rem',color:'#6B7280',fontWeight:500,marginLeft:2}}>kg</span>
                  </div>
                  {weightDelta !== null && (
                    <div style={{display:'flex',alignItems:'center',gap:3,marginTop:8}}>
                      <TrendingDown size={12} color={weightDelta<=0?'#22C55E':'#EF4444'} strokeWidth={2.5}/>
                      <span style={{fontSize:'0.72rem',color:weightDelta<=0?'#22C55E':'#EF4444',fontWeight:500}}>{weightDelta>0?'+':''}{weightDelta.toFixed(1)} kg ce mois</span>
                    </div>
                  )}
                </div>
                {/* Objectif */}
                <div className="metric-card">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Objectif</span>
                    <div style={{width:30,height:30,background:'rgba(34,197,94,.1)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}><Target size={14} color="#22C55E" strokeWidth={2}/></div>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.1rem',fontWeight:700,color:'#F8FAFC',lineHeight:1.2}}>
                    {profile.goal_weight ? `Objectif : ${profile.goal_weight} kg` : profile.calorie_goal ? `${profile.calorie_goal} kcal/j` : '—'}
                  </div>
                  {goalProgress !== null && (
                    <>
                      <div style={{background:'#374151',borderRadius:999,height:6,marginTop:8,overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:999,background:'#22C55E',width:`${goalProgress}%`,transition:'width 600ms ease'}}/>
                      </div>
                      <span style={{fontSize:'0.72rem',color:'#6B7280',marginTop:4,display:'block'}}>{goalProgress} % atteint</span>
                    </>
                  )}
                </div>
                {/* Séances */}
                <div className="metric-card">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Séances</span>
                    <div style={{width:30,height:30,background:'rgba(249,115,22,.12)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}><Dumbbell size={14} color="#F97316" strokeWidth={2}/></div>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'2rem',fontWeight:700,color:'#F8FAFC',lineHeight:1}}>{totalSessions}</div>
                  <div style={{display:'flex',alignItems:'center',gap:3,marginTop:8}}>
                    <CheckCircle size={12} color="#22C55E" strokeWidth={2.5}/>
                    <span style={{fontSize:'0.72rem',color:'#22C55E',fontWeight:500}}>complétées</span>
                  </div>
                </div>
                {/* Streak */}
                <div className="metric-card">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Streak</span>
                    <div style={{width:30,height:30,background:'rgba(249,115,22,.12)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}><Flame size={14} color="#F97316" strokeWidth={2}/></div>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'2.5rem',fontWeight:700,color:'#F97316',lineHeight:1}}>{streak}</div>
                  <div style={{marginTop:8}}><span style={{fontSize:'0.72rem',color:'#F97316',fontWeight:500}}>jours consécutifs</span></div>
                </div>
              </div>
            </section>

            {/* SÉANCES TABLE */}
            <section>
              <p className="section-title">Historique des séances</p>
              <div className="card" style={{padding:0,overflow:'hidden'}}>
                <div style={{overflowX:'auto'}}>
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Type</th><th>Durée</th><th>Notes</th></tr></thead>
                    <tbody>
                      {sessions.length === 0
                        ? <tr><td colSpan={4} style={{textAlign:'center',color:'#6B7280',padding:'32px 16px'}}>Aucune séance enregistrée</td></tr>
                        : sessions.map(s => (
                          <tr key={s.id}>
                            <td style={{color:'#9CA3AF',whiteSpace:'nowrap'}}>{formatDate(s.date)}</td>
                            <td>{s.session_type ?? '—'}</td>
                            <td>{s.duration_min ? `${s.duration_min} min` : '—'}</td>
                            <td style={{color:'#9CA3AF',maxWidth:240,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.notes ?? '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div style={{padding:'12px 16px',borderTop:'1px solid #374151'}}>
                  <span style={{fontSize:'0.78rem',color:'#6B7280'}}>{sessions.length} séance{sessions.length!==1?'s':''}</span>
                </div>
              </div>
            </section>

            {/* ── PROGRAMME HEBDOMADAIRE ─────────────────────────────── */}
            <section>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <p className="section-title" style={{marginBottom:0}}>Programme hebdomadaire</p>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:'0.75rem',color:'#22C55E',display:'flex',alignItems:'center',gap:4,opacity:programSaved?1:0,transition:'opacity 300ms ease'}}>
                    <Check size={12} strokeWidth={2.5}/>Sauvegardé
                  </span>
                  <button className="btn-secondary" style={{padding:'6px 14px',fontSize:'0.85rem'}} onClick={saveProgram} disabled={programSaving}>
                    <Save size={13} strokeWidth={2.5}/>{programSaving?'Sauvegarde…':'Sauvegarder'}
                  </button>
                </div>
              </div>

              {/* Day tabs */}
              <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                {DAYS.map(day => {
                  const d = program[day]
                  const isActive = expandedDay === day
                  const hasEx = !d.repos && d.exercises.length > 0
                  return (
                    <button key={day} onClick={()=>setExpandedDay(isActive?null:day)} style={{
                      padding:'5px 12px',borderRadius:8,border:'none',cursor:'pointer',
                      fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.8rem',fontWeight:700,letterSpacing:'0.05em',
                      transition:'all 150ms ease',
                      background: d.repos?'rgba(107,114,128,.15)':isActive?'#F97316':hasEx?'rgba(249,115,22,.15)':'#2D3748',
                      color: d.repos?'#6B7280':isActive?'#fff':hasEx?'#F97316':'#9CA3AF',
                      boxShadow: isActive?'0 0 0 2px #F97316':'none',
                    }}>
                      {DAY_LABELS[day]}
                      {d.repos && <Moon size={10} style={{marginLeft:4,verticalAlign:'middle'}}/>}
                      {hasEx && <span style={{marginLeft:5,background:'rgba(249,115,22,.25)',borderRadius:999,padding:'0 5px',fontSize:'0.7rem'}}>{d.exercises.length}</span>}
                    </button>
                  )
                })}
              </div>

              {expandedDay && (
                <div className="card" style={{padding:0,overflow:'hidden',animation:'fadeIn 150ms ease'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1px solid #374151'}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.05rem',fontWeight:700,color:'#F8FAFC'}}>{DAY_FULL[expandedDay]}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <button onClick={()=>toggleRepos(expandedDay)} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.8rem',fontWeight:700,background:program[expandedDay].repos?'rgba(107,114,128,.2)':'rgba(107,114,128,.1)',color:program[expandedDay].repos?'#9CA3AF':'#6B7280',transition:'all 150ms ease'}}>
                        <Moon size={12} strokeWidth={2}/>{program[expandedDay].repos?'Repos ✓':'Marquer repos'}
                      </button>
                      {!program[expandedDay].repos && (
                        <button onClick={()=>openExDbModal(expandedDay)} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.8rem',fontWeight:700,background:'rgba(249,115,22,.15)',color:'#F97316'}}>
                          <Plus size={12} strokeWidth={2.5}/>Ajouter exercice
                        </button>
                      )}
                    </div>
                  </div>
                  {program[expandedDay].repos ? (
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'32px 16px',color:'#6B7280'}}>
                      <Moon size={20} strokeWidth={1.5}/><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:600}}>Jour de repos</span>
                    </div>
                  ) : program[expandedDay].exercises.length === 0 ? (
                    <div style={{textAlign:'center',padding:'32px 16px',color:'#6B7280',fontSize:'0.875rem'}}>Aucun exercice — cliquez sur &quot;Ajouter exercice&quot;</div>
                  ) : (
                    <div style={{padding:'0 16px'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 56px 56px 64px 1fr 28px',gap:6,padding:'10px 0 4px'}}>
                        {['Exercice','Séries','Reps','Repos','Notes',''].map((h,i)=><div key={i} className="col-hdr">{h}</div>)}
                      </div>
                      {program[expandedDay].exercises.map((ex,idx)=>(
                        <div key={idx} className="ex-row">
                          <input placeholder="Nom de l'exercice" value={ex.name} onChange={e=>updateExercise(expandedDay,idx,'name',e.target.value)} style={smallInput} onFocus={e=>{e.target.style.borderColor='#F97316'}} onBlur={e=>{e.target.style.borderColor='#2D3748'}}/>
                          <input type="number" min={1} value={ex.sets} onChange={e=>updateExercise(expandedDay,idx,'sets',parseInt(e.target.value)||1)} style={numInput} onFocus={e=>{e.target.style.borderColor='#F97316'}} onBlur={e=>{e.target.style.borderColor='#2D3748'}}/>
                          <input type="number" min={1} value={ex.reps} onChange={e=>updateExercise(expandedDay,idx,'reps',parseInt(e.target.value)||1)} style={numInput} onFocus={e=>{e.target.style.borderColor='#F97316'}} onBlur={e=>{e.target.style.borderColor='#2D3748'}}/>
                          <input placeholder="60s" value={ex.rest} onChange={e=>updateExercise(expandedDay,idx,'rest',e.target.value)} style={{...smallInput,textAlign:'center'}} onFocus={e=>{e.target.style.borderColor='#F97316'}} onBlur={e=>{e.target.style.borderColor='#2D3748'}}/>
                          <input placeholder="Notes" value={ex.notes} onChange={e=>updateExercise(expandedDay,idx,'notes',e.target.value)} style={smallInput} onFocus={e=>{e.target.style.borderColor='#F97316'}} onBlur={e=>{e.target.style.borderColor='#2D3748'}}/>
                          <button onClick={()=>removeExercise(expandedDay,idx)} style={{background:'transparent',border:'none',cursor:'pointer',color:'#4B5563',padding:4,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}} onMouseEnter={e=>(e.currentTarget.style.color='#EF4444')} onMouseLeave={e=>(e.currentTarget.style.color='#4B5563')}>
                            <Minus size={14} strokeWidth={2.5}/>
                          </button>
                        </div>
                      ))}
                      <div style={{padding:'12px 0'}}>
                        <button onClick={()=>openExDbModal(expandedDay)} style={{display:'flex',alignItems:'center',gap:6,background:'transparent',border:'1px dashed #374151',borderRadius:8,padding:'8px 14px',cursor:'pointer',color:'#6B7280',fontFamily:'Barlow,sans-serif',fontSize:'0.82rem',width:'100%',justifyContent:'center',transition:'all 150ms ease'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#F97316';e.currentTarget.style.color='#F97316'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#374151';e.currentTarget.style.color='#6B7280'}}>
                          <Plus size={13} strokeWidth={2.5}/>Ajouter un exercice
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ══════════════════════════════════════════════════════════
                PLAN ALIMENTAIRE
            ══════════════════════════════════════════════════════════ */}
            <section>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,background:'rgba(34,197,94,.12)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Utensils size={16} color="#22C55E" strokeWidth={2}/>
                  </div>
                  <p className="section-title" style={{marginBottom:0}}>Plan alimentaire</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:'0.75rem',color:'#22C55E',display:'flex',alignItems:'center',gap:4,opacity:mealPlanSaved?1:0,transition:'opacity 300ms ease'}}>
                    <Check size={12} strokeWidth={2.5}/>Sauvegardé
                  </span>
                  <button className="btn-secondary" style={{padding:'6px 14px',fontSize:'0.85rem'}} onClick={saveMealPlan} disabled={mealPlanSaving}>
                    <Save size={13} strokeWidth={2.5}/>{mealPlanSaving?'Sauvegarde…':'Sauvegarder'}
                  </button>
                </div>
              </div>

              {/* Targets row */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
                {[
                  { label:'Calories', unit:'kcal', color:MACRO_COLORS.kcal, val:calorieTarget, set:setCalorieTarget },
                  { label:'Protéines', unit:'g', color:MACRO_COLORS.prot, val:protTarget, set:setProtTarget },
                  { label:'Glucides', unit:'g', color:MACRO_COLORS.carb, val:carbTarget, set:setCarbTarget },
                  { label:'Lipides', unit:'g', color:MACRO_COLORS.fat, val:fatTarget, set:setFatTarget },
                ].map(({ label, unit, color, val, set }) => (
                  <div key={label} style={{background:'#111827',border:'1px solid #374151',borderRadius:10,padding:'10px 12px',borderTop:`3px solid ${color}`}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.65rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',marginBottom:6}}>{label}</div>
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <input type="number" min={0} value={val} onChange={e=>set(parseInt(e.target.value)||0)} style={{...targetInput,color}} onFocus={e=>{e.target.style.borderColor=color}} onBlur={e=>{e.target.style.borderColor='#374151'}}/>
                      <span style={{fontSize:'0.75rem',color:'#6B7280',flexShrink:0}}>{unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Day tabs */}
              <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                {DAYS.map(day => {
                  const { kcal } = dayMacros(mealPlan[day])
                  const isActive = expandedMealDay === day
                  const hasFoods = mealPlan[day].meals.some(m => m.foods.length > 0)
                  return (
                    <button key={day} onClick={()=>setExpandedMealDay(isActive?null:day)} style={{
                      padding:'5px 12px',borderRadius:8,border:'none',cursor:'pointer',
                      fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.8rem',fontWeight:700,letterSpacing:'0.05em',
                      transition:'all 150ms ease',
                      background: isActive?'#22C55E':hasFoods?'rgba(34,197,94,.15)':'#2D3748',
                      color: isActive?'#fff':hasFoods?'#22C55E':'#9CA3AF',
                      boxShadow: isActive?'0 0 0 2px #22C55E':'none',
                    }}>
                      {DAY_LABELS[day]}
                      {hasFoods && !isActive && <span style={{marginLeft:5,background:'rgba(34,197,94,.2)',borderRadius:999,padding:'0 5px',fontSize:'0.68rem'}}>{kcal} kcal</span>}
                    </button>
                  )
                })}
              </div>

              {expandedMealDay && (() => {
                const dayData = mealPlan[expandedMealDay]
                const totals  = dayMacros(dayData)
                return (
                  <div style={{display:'flex',flexDirection:'column',gap:12,animation:'fadeIn 150ms ease'}}>

                    {/* Daily macro summary */}
                    <div style={{background:'#111827',border:'1px solid #374151',borderRadius:10,padding:'14px 16px'}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',marginBottom:12}}>Total du jour</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                        {[
                          { label:'Calories', val:totals.kcal, target:calorieTarget, unit:'kcal', color:MACRO_COLORS.kcal },
                          { label:'Protéines', val:totals.prot, target:protTarget,    unit:'g',    color:MACRO_COLORS.prot },
                          { label:'Glucides',  val:totals.carb, target:carbTarget,    unit:'g',    color:MACRO_COLORS.carb },
                          { label:'Lipides',   val:totals.fat,  target:fatTarget,     unit:'g',    color:MACRO_COLORS.fat  },
                        ].map(({ label, val, target, unit, color }) => (
                          <div key={label}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:4}}>
                              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</span>
                              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.9rem',fontWeight:700,color}}>
                                {val}<span style={{fontSize:'0.65rem',color:'#6B7280',marginLeft:2}}>{unit}</span>
                              </span>
                            </div>
                            <div style={{background:'#374151',borderRadius:999,height:5,overflow:'hidden'}}>
                              <div style={{height:'100%',borderRadius:999,background:color,width:`${pct(val,target)}%`,transition:'width 400ms ease'}}/>
                            </div>
                            <div style={{fontSize:'0.65rem',color:'#4B5563',marginTop:3,textAlign:'right'}}>{pct(val,target)}% / {target}{unit}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Meal cards */}
                    {dayData.meals.map((meal, mealIdx) => {
                      const mealTotals = meal.foods.reduce((acc,f)=>({kcal:acc.kcal+f.kcal,prot:acc.prot+f.prot,carb:acc.carb+f.carb,fat:acc.fat+f.fat}),{kcal:0,prot:0,carb:0,fat:0})
                      return (
                        <div key={mealIdx} className="card" style={{padding:0,overflow:'hidden'}}>
                          {/* Meal header */}
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:meal.foods.length>0?'1px solid #374151':'none',background:'rgba(255,255,255,.02)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <span style={{fontSize:'1rem'}}>{MEAL_ICONS[meal.type]}</span>
                              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:700,color:'#F8FAFC'}}>{meal.type}</span>
                              {meal.foods.length > 0 && (
                                <span style={{fontSize:'0.75rem',color:'#6B7280',fontFamily:'Barlow,sans-serif'}}>
                                  {mealTotals.kcal} kcal · {mealTotals.prot}g prot · {mealTotals.carb}g gluc · {mealTotals.fat}g lip
                                </span>
                              )}
                            </div>
                            <button onClick={()=>addFood(expandedMealDay, mealIdx)} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:7,border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:700,background:'rgba(34,197,94,.12)',color:'#22C55E',transition:'all 150ms ease'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(34,197,94,.25)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(34,197,94,.12)'}}>
                              <Plus size={11} strokeWidth={2.5}/>Ajouter
                            </button>
                          </div>

                          {/* Food items */}
                          {meal.foods.length > 0 && (
                            <div style={{padding:'0 16px'}}>
                              {/* Column headers */}
                              <div style={{display:'grid',gridTemplateColumns:'1fr 64px 72px 64px 64px 64px 28px',gap:5,padding:'8px 0 4px'}}>
                                {['Aliment','Qté','Kcal','Prot (g)','Gluc (g)','Lip (g)',''].map((h,i)=>(
                                  <div key={i} className="col-hdr">{h}</div>
                                ))}
                              </div>
                              {meal.foods.map((food, foodIdx) => (
                                <div key={foodIdx} className="food-row">
                                  <input placeholder="Ex: Riz cuit" value={food.name} onChange={e=>updateFood(expandedMealDay,mealIdx,foodIdx,'name',e.target.value)} style={smallInput} onFocus={e=>{e.target.style.borderColor='#22C55E'}} onBlur={e=>{e.target.style.borderColor='#2D3748'}}/>
                                  <input placeholder="100g" value={food.qty} onChange={e=>updateFood(expandedMealDay,mealIdx,foodIdx,'qty',e.target.value)} style={{...smallInput,textAlign:'center'}} onFocus={e=>{e.target.style.borderColor='#22C55E'}} onBlur={e=>{e.target.style.borderColor='#2D3748'}}/>
                                  <input type="number" min={0} value={food.kcal} onChange={e=>updateFood(expandedMealDay,mealIdx,foodIdx,'kcal',parseInt(e.target.value)||0)} style={{...numInput,color:MACRO_COLORS.kcal}} onFocus={e=>{e.target.style.borderColor=MACRO_COLORS.kcal}} onBlur={e=>{e.target.style.borderColor='#2D3748'}}/>
                                  <input type="number" min={0} value={food.prot} onChange={e=>updateFood(expandedMealDay,mealIdx,foodIdx,'prot',parseInt(e.target.value)||0)} style={{...numInput,color:MACRO_COLORS.prot}} onFocus={e=>{e.target.style.borderColor=MACRO_COLORS.prot}} onBlur={e=>{e.target.style.borderColor='#2D3748'}}/>
                                  <input type="number" min={0} value={food.carb} onChange={e=>updateFood(expandedMealDay,mealIdx,foodIdx,'carb',parseInt(e.target.value)||0)} style={{...numInput,color:MACRO_COLORS.carb}} onFocus={e=>{e.target.style.borderColor=MACRO_COLORS.carb}} onBlur={e=>{e.target.style.borderColor='#2D3748'}}/>
                                  <input type="number" min={0} value={food.fat} onChange={e=>updateFood(expandedMealDay,mealIdx,foodIdx,'fat',parseInt(e.target.value)||0)} style={{...numInput,color:MACRO_COLORS.fat}} onFocus={e=>{e.target.style.borderColor=MACRO_COLORS.fat}} onBlur={e=>{e.target.style.borderColor='#2D3748'}}/>
                                  <button onClick={()=>removeFood(expandedMealDay,mealIdx,foodIdx)} style={{background:'transparent',border:'none',cursor:'pointer',color:'#4B5563',padding:4,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}} onMouseEnter={e=>(e.currentTarget.style.color='#EF4444')} onMouseLeave={e=>(e.currentTarget.style.color='#4B5563')}>
                                    <Minus size={13} strokeWidth={2.5}/>
                                  </button>
                                </div>
                              ))}
                              <div style={{padding:'8px 0'}}/>
                            </div>
                          )}

                          {/* Empty state */}
                          {meal.foods.length === 0 && (
                            <div style={{textAlign:'center',padding:'16px',color:'#4B5563',fontSize:'0.8rem',fontStyle:'italic'}}>
                              Aucun aliment — cliquez sur Ajouter
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </section>
          </div>

          {/* ── RIGHT COL ─────────────────────────────────────────────── */}
          <div style={{display:'flex',flexDirection:'column',gap:24}}>

            {/* PROCHAIN RDV */}
            <section className="card">
              <p className="section-title">Prochain RDV</p>
              <div style={{display:'flex',alignItems:'center',gap:16,background:'#111827',borderRadius:10,padding:16,borderLeft:'3px solid #F97316'}}>
                <div style={{width:40,height:40,background:'rgba(249,115,22,.12)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <CalendarClock size={18} color="#F97316" strokeWidth={2}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.05rem',fontWeight:700,color:'#F8FAFC'}}>À planifier</div>
                  <div style={{fontSize:'0.82rem',color:'#9CA3AF',marginTop:2}}>Aucun RDV planifié</div>
                </div>
              </div>
              <button className="btn-primary" style={{width:'100%',justifyContent:'center',marginTop:16}} onClick={()=>showToast('Planification de RDV à venir')}>
                Planifier un RDV
              </button>
            </section>

            {/* NOTES COACH */}
            <section className="card">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <p className="section-title" style={{marginBottom:0}}>Notes coach</p>
                <div style={{fontSize:'0.75rem',color:'#22C55E',display:'flex',alignItems:'center',gap:4,opacity:notesSaved?1:0,transition:'opacity 300ms ease'}}>
                  <Check size={12} strokeWidth={2.5}/>Sauvegardé
                </div>
              </div>
              <textarea value={notes} onChange={e=>onNotesChange(e.target.value)} placeholder="Ajoutez vos observations, programmes, remarques…"
                style={{width:'100%',background:'#111827',border:'1px solid #374151',borderRadius:8,padding:'14px 16px',fontFamily:'Barlow,sans-serif',fontSize:'0.9rem',color:'#F8FAFC',resize:'vertical',minHeight:120,lineHeight:1.6,outline:'none',transition:'border-color 200ms ease'}}
                onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}}
                onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/>
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:10}}>
                <button className="btn-secondary" style={{padding:'8px 16px',fontSize:'0.85rem'}} onClick={saveNotes} disabled={notesSaving}>
                  <Save size={13} strokeWidth={2.5}/>{notesSaving?'Sauvegarde…':'Sauvegarder'}
                </button>
              </div>
            </section>

            {/* DANGER ZONE */}
            <section className="card" style={{border:'1px solid #374151'}}>
              <p className="section-title" style={{color:'#EF4444'}}>Zone avancée</p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <button className="btn-ghost" style={{justifyContent:'flex-start',color:'#9CA3AF'}} onClick={()=>showToast('Archivage à implémenter')}>
                  <Archive size={14} strokeWidth={2}/>Archiver le client
                </button>
                <button className="btn-ghost" style={{justifyContent:'flex-start',color:'#EF4444'}} onClick={()=>showToast('Suppression à implémenter')}>
                  <Trash2 size={14} strokeWidth={2}/>Supprimer le client
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

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
      {toast && (
        <div className="toast-el">
          <CheckCircle size={15} color="#22C55E" strokeWidth={2}/>
          <span>{toast}</span>
        </div>
      )}
    </>
  )
}
