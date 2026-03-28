'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getRole } from '../../lib/getRole'
import { toast } from 'sonner'
import { JS_DAYS_FR } from '../../lib/design-tokens'
import { cache } from '../../lib/cache'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export type Tab = 'home' | 'training' | 'nutrition' | 'progress' | 'profil' | 'messages'

export default function useClientDashboard() {
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
  const [userRole, setUserRole] = useState<string | null>(null)

  const [workoutSession, setWorkoutSession] = useState<{ name: string; exercises: any[] } | null>(null)
  const [modal, setModal] = useState<string | null>(null)

  // Food modal state
  const [foodSearch, setFoodSearch] = useState('')
  const [foodResults, setFoodResults] = useState<any[]>([])
  const [selectedFood, setSelectedFood] = useState<any>(null)
  const [foodQty, setFoodQty] = useState('100')
  const [mealType, setMealType] = useState('lunch')
  const [customFoodForm, setCustomFoodForm] = useState({ name: '', brand: '', calories_per_100g: '', proteins_per_100g: '', carbs_per_100g: '', fats_per_100g: '' })
  const [searchTab, setSearchTab] = useState<'fitness' | 'anses' | 'custom'>('fitness')

  // BMR form state
  const [bmrForm, setBmrForm] = useState({ weight: '', height: '', age: '', gender: 'male', activity: 'moderate', body_fat: '' })

  const [photoUploading, setPhotoUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<any>(null)

  // Messages
  const [coachId, setCoachId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const lastMsgTimestampRef = useRef<string | null>(null)
  const initialFetchDone = useRef(false)
  const fetchAllComplete = useRef(false)

  const mainRef = useRef<HTMLElement>(null)
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current

  /* ── Auth ── */
  useEffect(() => {
    setMounted(true)
    let alive = true
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      supabase.from('app_logs').insert({ level: 'info', message: 'CLIENT_DASH_SESSION', details: { hasSession: !!s, userId: s?.user?.id, url: typeof window !== 'undefined' ? window.location.href : '' }, page_url: '/' })
      if (alive) { setSession(s); setLoading(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      supabase.from('app_logs').insert({ level: 'info', message: 'CLIENT_DASH_AUTH_CHANGE', details: { event: _event, hasSession: !!s, userId: s?.user?.id }, page_url: '/' })
      if (!alive) return
      if (_event === 'SIGNED_OUT') { setSession(null); setLoading(false); return }
      if (s) { setSession(s); setLoading(false) }
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session) return
    getRole(session.user.id, session.access_token).then(role => {
      if (!role) { setRoleChecked(true); return }
      setUserRole(role)
      if (role === 'super_admin') { router.replace('/admin') }
      else { setRoleChecked(true) } // coach AND client both stay on page.tsx
    })
  }, [session])

  useEffect(() => {
    if (!session || initialFetchDone.current) return
    initialFetchDone.current = true
    fetchAll()
  }, [session])

  /* ── Food search debounce ── */
  useEffect(() => {
    clearTimeout(searchRef.current)
    if (foodSearch.length < 2) { setFoodResults([]); return }
    searchRef.current = setTimeout(async () => {
      if (searchTab === 'fitness') {
        const { data } = await supabase.from('food_items').select('*').eq('source', 'fitness').ilike('name', `%${foodSearch}%`).limit(50)
        setFoodResults(data || [])
      } else if (searchTab === 'anses') {
        const { data } = await supabase.from('food_items').select('*').eq('source', 'ANSES').ilike('name', `%${foodSearch}%`).limit(50)
        setFoodResults(data || [])
      } else {
        const { data } = await supabase.from('custom_foods').select('*').eq('user_id', session?.user?.id).ilike('name', `%${foodSearch}%`).limit(20)
        setFoodResults(data || [])
      }
    }, 300)
  }, [foodSearch, searchTab])

  /* ── Messages refs ── */
  useEffect(() => {
    const real = messages.filter(m => !String(m.id).startsWith('opt-'))
    if (real.length > 0) lastMsgTimestampRef.current = real[real.length - 1].created_at
  }, [messages])

  /* ── Messages: Realtime + polling ── */
  useEffect(() => {
    if (!session?.user?.id || !coachId) return
    const uid = session.user.id
    loadMessages(coachId)

    const channel = supabase
      .channel(`messages-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` }, (payload: any) => {
        setMessages(prev => [...prev.filter(m => !String(m.id).startsWith('opt-')), payload.new])
        if (activeTab !== 'messages') setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    const pollId = setInterval(async () => {
      const since = lastMsgTimestampRef.current
      if (!since) return
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${coachId}),and(sender_id.eq.${coachId},receiver_id.eq.${uid})`)
        .gt('created_at', since).order('created_at', { ascending: true })
      if (data?.length) setMessages(prev => [...prev.filter(m => !String(m.id).startsWith('opt-')), ...data])
    }, 30000)

    return () => { supabase.removeChannel(channel); clearInterval(pollId) }
  }, [session?.user?.id, coachId])

  useEffect(() => {
    if (activeTab === 'messages') setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages, activeTab])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'messages' && coachId) markMessagesRead()
  }, [activeTab, coachId])

  /* ── Data fetching (with cache) ── */
  async function fetchAll(forceRefresh = false) {
    const uid = session?.user?.id
    if (!uid) return
    const today = new Date().toISOString().split('T')[0]

    // Try cache first (only on initial load, not forced refreshes)
    if (!forceRefresh) {
      const cached = cache.get(`dashboard_${uid}`)
      if (cached) {
        applyFetchedData(cached.profileData, cached.weightsData, cached.sessData, cached.measureData, cached.photosData, cached.coachProgData, cached.coachMealData)
        // Still fetch coach link in background
        resolveCoachLink(uid)
        fetchAllComplete.current = true
        return
      }
    }

    const [profRes, weightsRes, , sessRes, measureRes, photosRes, , , coachProgRes, coachMealRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('weight_logs').select('date, poids').eq('user_id', uid).order('date', { ascending: true }).limit(30),
      supabase.from('meal_logs').select('*').eq('user_id', uid).eq('date', today),
      supabase.from('workout_sessions').select('*, workout_sets(*)').eq('user_id', uid).order('created_at', { ascending: false }).limit(90),
      supabase.from('body_measurements').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(10),
      supabase.from('progress_photos').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(20),
      supabase.from('training_programs').select('*').eq('is_template', true),
      supabase.from('user_programs').select('*, training_programs(*)').eq('user_id', uid).eq('active', true).maybeSingle(),
      supabase.from('client_programs').select('program').eq('client_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('client_meal_plans').select('plan').eq('client_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (!profRes.data) { router.replace('/onboarding'); return }
    const fn = profRes.data.full_name?.trim()
    if (!fn || fn === 'Athlete') { router.replace('/onboarding'); return }

    const profileData = profRes.data
    const weightsData = weightsRes.data || []
    const sessData = sessRes.data || []
    const measureData = measureRes.data || []
    const photosData = photosRes.data || []
    const coachProgData = coachProgRes.data?.program || null
    const coachMealData = coachMealRes.data?.plan || null

    // Cache the fetched data (5 min TTL)
    cache.set(`dashboard_${uid}`, { profileData, weightsData, sessData, measureData, photosData, coachProgData, coachMealData }, 5 * 60 * 1000)

    applyFetchedData(profileData, weightsData, sessData, measureData, photosData, coachProgData, coachMealData)
    await resolveCoachLink(uid)
    fetchAllComplete.current = true
  }

  function applyFetchedData(profileData: any, weightsData: any[], sessData: any[], measureData: any[], photosData: any[], coachProgData: any, coachMealData: any) {
    setProfile(profileData)
    const age = profileData.birth_date ? Math.floor((Date.now() - new Date(profileData.birth_date).getTime()) / 31557600000) : ''
    setBmrForm(p => ({
      ...p,
      weight: (weightsData[weightsData.length - 1]?.poids ?? profileData.current_weight)?.toString() || '',
      height: profileData.height?.toString() || '',
      age: age.toString(),
      gender: profileData.gender || 'male',
      activity: profileData.activity_level || 'moderate',
      body_fat: profileData.body_fat_pct?.toString() || '',
    }))
    setWSessions(sessData)
    setMeasurements(measureData)
    setProgressPhotos(photosData)
    setWeightHistory30(weightsData.map(w => ({ date: w.date, poids: w.poids })))
    if (coachProgData) setCoachProgram(coachProgData)
    if (coachMealData) setCoachMealPlan(coachMealData)
  }

  async function resolveCoachLink(uid: string) {
    const { data: coachLink } = await supabase.from('coach_clients').select('coach_id').eq('client_id', uid).maybeSingle()
    if (coachLink?.coach_id) {
      setCoachId(coachLink.coach_id)
    } else {
      const defaultEmail = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'
      const { data: defaultCoach } = await supabase.from('profiles').select('id').eq('email', defaultEmail).single()
      if (defaultCoach?.id) {
        await supabase.from('coach_clients').insert({ coach_id: defaultCoach.id, client_id: uid }).select().maybeSingle()
        setCoachId(defaultCoach.id)
      }
    }
  }

  /* ── Handlers ── */
  async function startProgramWorkout(day: any, exercises: any[]) {
    setWorkoutSession({ name: day.day_name, exercises })
  }

  async function onFinishWorkout(data: any) {
    const { data: sess } = await supabase.from('workout_sessions').insert({
      user_id: session.user.id, name: workoutSession?.name, completed: true,
      duration_minutes: Math.round(data.duration / 60000),
      notes: `${data.completedSets}/${data.totalSets} sets · ${Math.round(data.totalVolume)} kg volume`,
    }).select().single()
    if (sess) {
      const setsToInsert: any[] = []
      data.exercises.forEach((exo: any) => {
        exo.sets.forEach((s: any, i: number) => {
          setsToInsert.push({ session_id: sess.id, user_id: session.user.id, exercise_name: exo.name, set_number: i + 1, reps: s.reps || 0, weight: s.weight || 0, completed: true })
        })
      })
      if (setsToInsert.length > 0) await supabase.from('workout_sets').insert(setsToInsert)
    }
    toast.success('Séance terminée ! Bien joué 💪')
    fetchAll(true)
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
      calories: Math.round(cals * qty / 100), proteins: Math.round(prot * qty / 100 * 10) / 10,
      carbs: Math.round(carb * qty / 100 * 10) / 10, fats: Math.round(fat * qty / 100 * 10) / 10,
      quantity_g: qty, ...(isCustom ? { custom_food_id: selectedFood.id } : { food_id: selectedFood.id }),
    })
    setSelectedFood(null); setFoodSearch(''); setFoodResults([])
    toast.success('Aliment ajouté !'); setModal(null); fetchAll(true)
  }

  async function addCustomFood() {
    const f = customFoodForm
    if (!f.name || !f.calories_per_100g) return
    await supabase.from('custom_foods').insert({
      user_id: session.user.id, name: f.name, brand: f.brand,
      calories_per_100g: parseFloat(f.calories_per_100g), proteins_per_100g: parseFloat(f.proteins_per_100g) || 0,
      carbs_per_100g: parseFloat(f.carbs_per_100g) || 0, fats_per_100g: parseFloat(f.fats_per_100g) || 0,
    })
    setCustomFoodForm({ name: '', brand: '', calories_per_100g: '', proteins_per_100g: '', carbs_per_100g: '', fats_per_100g: '' })
    toast.success('Aliment créé !'); setModal(null); fetchAll(true)
  }

  async function saveWeight(value: number, date: string) {
    await supabase.from('weight_logs').upsert({ user_id: session.user.id, poids: value, date }, { onConflict: 'user_id,date' })
    await supabase.from('profiles').upsert({ id: session.user.id, current_weight: value })
    if (!profile?.start_weight) await supabase.from('profiles').update({ start_weight: value }).eq('id', session.user.id)
    toast.success('Poids enregistré !'); setModal(null); fetchAll(true)
  }

  async function saveMeasurements(data: Record<string, number>, date: string) {
    await supabase.from('body_measurements').insert({ user_id: session.user.id, date, ...data })
    toast.success('Mensurations enregistrées !'); setModal(null); fetchAll(true)
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const path = `${session.user.id}/avatar.${file.name.split('.').pop()}`
    await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').upsert({ id: session.user.id, avatar_url: publicUrl })
    fetchAll(true)
  }

  async function uploadProgressPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoUploading(true)
    const path = `${session.user.id}/${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('progress-photos').upload(path, file)
    if (uploadError) { toast.error("Erreur lors de l'upload"); setPhotoUploading(false); return }
    await supabase.from('progress_photos').insert({ user_id: session.user.id, photo_url: path, view_type: 'front' })
    toast.success('Photo ajoutée !'); setPhotoUploading(false); fetchAll(true)
  }

  async function deletePhoto(photo: any) {
    await supabase.storage.from('progress-photos').remove([photo.photo_url])
    await supabase.from('progress_photos').delete().eq('id', photo.id)
    setProgressPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  async function loadMessages(cId: string) {
    const uid = session?.user?.id
    if (!uid || !cId) return
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${cId}),and(sender_id.eq.${cId},receiver_id.eq.${uid})`)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setUnreadCount((data || []).filter((m: any) => m.sender_id === cId && !m.read).length)
  }

  async function sendMessage() {
    if (!msgInput.trim() || !coachId || !session) return
    const content = msgInput.trim(); setMsgInput('')
    const optimistic = { id: `opt-${Date.now()}`, sender_id: session.user.id, receiver_id: coachId, content, read: false, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    await supabase.from('messages').insert({ sender_id: session.user.id, receiver_id: coachId, content })
    fetch('/api/send-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: coachId, title: 'Nouveau message client', body: content.slice(0, 80), url: '/coach' }) }).catch(() => {})
    loadMessages(coachId)
  }

  async function markMessagesRead() {
    if (!session || !coachId) return
    await supabase.from('messages').update({ read: true }).eq('receiver_id', session.user.id).eq('sender_id', coachId).eq('read', false)
    setUnreadCount(0)
  }

  /* ── Computed ── */
  const calorieGoal = profile?.calorie_goal || 2500
  const goalWeight = profile?.target_weight ?? null
  const currentWeight = weightHistory30.length > 0 ? weightHistory30[weightHistory30.length - 1].poids : profile?.current_weight
  const completedSessions = wSessions.filter(s => s.completed).length
  const streak = (() => {
    const dates = new Set(wSessions.filter(s => s.completed).map(s => new Date(s.created_at).toDateString()))
    let count = 0; const d = new Date()
    while (dates.has(d.toDateString())) { count++; d.setDate(d.getDate() - 1) }
    return count
  })()
  const todayKey = JS_DAYS_FR[new Date().getDay()]
  const todayCoachDay = coachProgram ? (coachProgram[todayKey] ?? { repos: false, exercises: [] }) : null
  const todaySessionDone = wSessions.some(s => s.completed && new Date(s.created_at).toDateString() === new Date().toDateString())
  const chartMin = weightHistory30.length > 0 ? Math.min(...weightHistory30.map(p => p.poids)) - 1 : 0
  const chartMax = weightHistory30.length > 0 ? Math.max(...weightHistory30.map(p => p.poids)) + 1 : 1
  const displayAvatar = session ? (profile?.avatar_url || session.user.user_metadata?.avatar_url) : undefined
  const fullName = session ? (profile?.full_name || session.user.user_metadata?.full_name || 'Athlete') : 'Athlete'
  const firstName = fullName.split(' ')[0]

  // Subscription — active if: lifetime, invited, active with valid end date, or in trial
  const OWNER_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bobitosm@gmail.com'

  const hasPaidSub = (() => {
    if (!profile) return false
    const st = profile.subscription_status
    if (st === 'lifetime' || st === 'invited') return true
    if (st === 'active') {
      if (!profile.subscription_end_date) return true
      return new Date(profile.subscription_end_date) > new Date()
    }
    return false
  })()

  const isExempt = !!profile && (profile.email === OWNER_EMAIL || profile.email === ADMIN_EMAIL)
  const isInvited = profile?.subscription_type === 'invited'

  // Trial: 10 days from trial_ends_at
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const now = new Date()
  const isInTrial = !hasPaidSub && !isExempt && !!trialEndsAt && trialEndsAt > now
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const trialExpired = !hasPaidSub && !isExempt && !isInvited && !!trialEndsAt && trialEndsAt <= now

  // Access granted if: paid sub, exempt, invited, or in trial
  const isSubActive = hasPaidSub || isExempt || isInvited || isInTrial

  const handleSubscribe = async (planId?: string) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: session?.user?.id, planId: planId || 'client_monthly', coachId: coachId || 'platform' }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  return {
    // Auth / loading
    mounted, session, loading, roleChecked, userRole, router, supabase,
    // Profile / data
    profile, measurements, progressPhotos, wSessions,
    coachProgram, coachMealPlan, weightHistory30,
    // Tabs
    activeTab, setActiveTab,
    // Workout session
    workoutSession, setWorkoutSession,
    // Modals
    modal, setModal,
    // Food modal
    foodSearch, setFoodSearch, foodResults, selectedFood, setSelectedFood,
    foodQty, setFoodQty, mealType, setMealType,
    customFoodForm, setCustomFoodForm, searchTab, setSearchTab,
    addFoodToMeal, addCustomFood,
    // BMR
    bmrForm,
    // Photos
    photoUploading, photoRef, avatarRef,
    uploadAvatar, uploadProgressPhoto, deletePhoto,
    // Messages
    coachId, messages, msgInput, setMsgInput, unreadCount,
    msgEndRef, sendMessage,
    // Computed
    calorieGoal, goalWeight, currentWeight, completedSessions, streak,
    todayKey, todayCoachDay, todaySessionDone, chartMin, chartMax,
    displayAvatar, fullName, firstName,
    // Subscription & trial
    isSubActive, isInTrial, trialDaysLeft, trialExpired, handleSubscribe,
    // Handlers
    fetchAll, startProgramWorkout, onFinishWorkout, saveWeight, saveMeasurements,
    // Refs
    mainRef,
  }
}
