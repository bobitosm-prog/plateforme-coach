'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { getRole } from '../lib/getRole'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Flame, Zap,
  BarChart2, Dumbbell, UtensilsCrossed, TrendingUp,
  User, MessageCircle, Plus, ChevronRight, Search, X,
} from 'lucide-react'

import WorkoutSession from './components/WorkoutSession'
import WeightModal from './components/modals/WeightModal'
import MeasureModal from './components/modals/MeasureModal'
import BmrModal from './components/modals/BmrModal'
import HomeTab from './components/tabs/HomeTab'
import TrainingTab from './components/tabs/TrainingTab'
import NutritionTab from './components/tabs/NutritionTab'
import ProgressTab from './components/tabs/ProgressTab'
import ProfileTab from './components/tabs/ProfileTab'
import MessagesTab from './components/tabs/MessagesTab'

import {
  BG_BASE, BG_CARD, BORDER, ORANGE, GREEN, TEXT_PRIMARY, TEXT_MUTED,
  MEAL_TYPES, JS_DAYS_FR,
} from '../lib/design-tokens'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Tab = 'home' | 'training' | 'nutrition' | 'progress' | 'profil' | 'messages'

export default function CoachApp() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  const [progressPhotos, setProgressPhotos] = useState<any[]>([])
  const [wSessions, setWSessions] = useState<any[]>([])
  const [coachProgram, setCoachProgram] = useState<any>(null)
  const [coachMealPlan, setCoachMealPlan] = useState<any>(null)
  const [weightHistory30, setWeightHistory30] = useState<{ date: string; poids: number }[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [roleChecked, setRoleChecked] = useState(false)

  const [workoutSession, setWorkoutSession] = useState<{ name: string; exercises: any[] } | null>(null)

  const [modal, setModal] = useState<string | null>(null)

  // Food modal state (kept inline in page.tsx)
  const [foodSearch, setFoodSearch] = useState('')
  const [foodResults, setFoodResults] = useState<any[]>([])
  const [selectedFood, setSelectedFood] = useState<any>(null)
  const [foodQty, setFoodQty] = useState('100')
  const [mealType, setMealType] = useState('lunch')
  const [customFoodForm, setCustomFoodForm] = useState({ name: '', brand: '', calories_per_100g: '', proteins_per_100g: '', carbs_per_100g: '', fats_per_100g: '' })
  const [searchTab, setSearchTab] = useState<'anses' | 'custom'>('anses')

  // BMR form state (passed to BmrModal as initialValues)
  const [bmrForm, setBmrForm] = useState({ weight: '', height: '', age: '', gender: 'male', activity: 'moderate', body_fat: '' })

  const [photoUploading, setPhotoUploading] = useState(false)
const photoRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<any>(null)

  // Messages tab
  const [coachId, setCoachId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const lastMsgTimestampRef = useRef<string | null>(null)

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

  // Food search debounce (stays in page.tsx since food modal stays here)
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

  // Messages: keep timestamp ref pointing at latest real message
  useEffect(() => {
    const real = messages.filter(m => !String(m.id).startsWith('opt-'))
    if (real.length > 0) lastMsgTimestampRef.current = real[real.length - 1].created_at
  }, [messages])

  // Messages: poll every 3s for new messages
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

    const [profRes, weightsRes, , sessRes, measureRes, photosRes, , , coachProgRes, coachMealRes] = await Promise.all([
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

    if (profRes.data) {
      setProfile(profRes.data)
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
    setWSessions(sessRes.data || [])
    setMeasurements(measureRes.data || [])
    setProgressPhotos(photosRes.data || [])
    setWeightHistory30((weightsRes.data || []).map(w => ({ date: w.date, poids: w.poids })))
    if (coachProgRes.data?.program) setCoachProgram(coachProgRes.data.program)
    if (coachMealRes.data?.plan) setCoachMealPlan(coachMealRes.data.plan)

    // Find this client's coach
    const { data: coachLink } = await supabase
      .from('coach_clients')
      .select('coach_id')
      .eq('client_id', uid)
      .maybeSingle()
    if (coachLink?.coach_id) setCoachId(coachLink.coach_id)
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

  async function saveWeight(value: number) {
    await supabase.from('weight_logs').insert({ user_id: session.user.id, poids: value })
    await supabase.from('profiles').upsert({ id: session.user.id, current_weight: value })
    if (!profile?.start_weight) await supabase.from('profiles').update({ start_weight: value }).eq('id', session.user.id)
    toast.success('Poids enregistré !')
    setModal(null); fetchAll()
  }

  async function saveMeasurements(data: Record<string, number>) {
    await supabase.from('body_measurements').insert({ user_id: session.user.id, ...data })
    toast.success('Mensurations enregistrées !')
    setModal(null); fetchAll()
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const path = `${session.user.id}/avatar.${file.name.split('.').pop()}`
    await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').upsert({ id: session.user.id, avatar_url: publicUrl })
    fetchAll()
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

  // Computed values
const calorieGoal = profile?.calorie_goal || 2500
  const goalWeight = profile?.goal_weight || 75
  const currentWeight = profile?.current_weight
  const completedSessions = wSessions.filter(s => s.completed).length
  const streak = (() => {
    const dates = new Set(wSessions.filter(s => s.completed).map(s => new Date(s.created_at).toDateString()))
    let count = 0; const d = new Date()
    while (dates.has(d.toDateString())) { count++; d.setDate(d.getDate() - 1) }
    return count
  })()
  const todayKey = JS_DAYS_FR[new Date().getDay()]
  const todayCoachDay = coachProgram ? (coachProgram[todayKey] ?? { repos: false, exercises: [] }) : null
  const todaySessionDone = wSessions.some(s =>
    s.completed && new Date(s.created_at).toDateString() === new Date().toDateString()
  )
  const chartMin = weightHistory30.length > 0 ? Math.min(...weightHistory30.map(p => p.poids)) - 1 : 0
  const chartMax = weightHistory30.length > 0 ? Math.max(...weightHistory30.map(p => p.poids)) + 1 : 1

  const displayAvatar = session ? (profile?.avatar_url || session.user.user_metadata?.avatar_url) : undefined
  const fullName = session ? (profile?.full_name || session.user.user_metadata?.full_name || 'Athlete') : 'Athlete'
  const firstName = fullName.split(' ')[0]

  // Loading / auth screens
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

      {/* ── WEIGHT MODAL ── */}
      {modal === 'weight' && (
        <WeightModal
          currentWeight={currentWeight}
          onSave={saveWeight}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── MEASURE MODAL ── */}
      {modal === 'measure' && (
        <MeasureModal
          onSave={saveMeasurements}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── BMR MODAL ── */}
      {modal === 'bmr' && (
        <BmrModal
          supabase={supabase}
          session={session}
          initialValues={bmrForm}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── FOOD MODAL (kept inline) ── */}
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

      {/* ── CUSTOM FOOD MODAL (kept inline) ── */}
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

      {/* ── TAB CONTENT ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
        >
          {activeTab === 'home' && (
            <HomeTab
              supabase={supabase}
              session={session}
              profile={profile}
              displayAvatar={displayAvatar}
              firstName={firstName}
              avatarRef={avatarRef}
              photoRef={photoRef}
              uploadAvatar={uploadAvatar}
              uploadProgressPhoto={uploadProgressPhoto}
              currentWeight={currentWeight}
              goalWeight={goalWeight}
              calorieGoal={calorieGoal}
              completedSessions={completedSessions}
              streak={streak}
              coachProgram={coachProgram}
              coachMealPlan={coachMealPlan}
              todayKey={todayKey}
              todayCoachDay={todayCoachDay}
              todaySessionDone={todaySessionDone}
              setActiveTab={setActiveTab}
              setModal={setModal}
              startProgramWorkout={startProgramWorkout}
            />
          )}

          {activeTab === 'training' && (
            <TrainingTab
              supabase={supabase}
              session={session}
              coachProgram={coachProgram}
              todayKey={todayKey}
              todaySessionDone={todaySessionDone}
              startProgramWorkout={startProgramWorkout}
              fetchAll={fetchAll}
            />
          )}

          {activeTab === 'nutrition' && (
            <NutritionTab
              coachMealPlan={coachMealPlan}
              todayKey={todayKey}
              setModal={setModal}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressTab
              supabase={supabase}
              weightHistory30={weightHistory30}
              measurements={measurements}
              progressPhotos={progressPhotos}
              photoRef={photoRef}
              photoUploading={photoUploading}
              uploadProgressPhoto={uploadProgressPhoto}
              deletePhoto={deletePhoto}
              setModal={setModal}
              chartMin={chartMin}
              chartMax={chartMax}
            />
          )}

          {activeTab === 'profil' && (
            <ProfileTab
              supabase={supabase}
              session={session}
              profile={profile}
              displayAvatar={displayAvatar}
              fullName={fullName}
              firstName={firstName}
              avatarRef={avatarRef}
              uploadAvatar={uploadAvatar}
              currentWeight={currentWeight}
              goalWeight={goalWeight}
              calorieGoal={calorieGoal}
              coachProgram={coachProgram}
              setModal={setModal}
              fetchAll={fetchAll}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesTab
              session={session}
              coachId={coachId}
              messages={messages}
              msgInput={msgInput}
              setMsgInput={setMsgInput}
              sendMessage={sendMessage}
              msgEndRef={msgEndRef}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── BOTTOM NAV ── */}
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
